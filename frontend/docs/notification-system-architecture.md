# Harmony College — Institutional Notification System
## Architecture, Security, and Event Catalog

---

## 1. Overview

The notification system is a **real-time, role-scoped, security-hardened in-app messaging layer** that bridges every module in the college management system to the people who need to act on events.

It replaces scattered, uncoordinated `prisma.notification.create` calls with a **single unified service** that guarantees:
- Every notification is persisted to the DB (durable inbox)
- Every notification is pushed to the recipient's open browser tab instantly via Socket.IO
- Every read / mark-read operation is scoped to the authenticated user's own rows (IDOR-proof)
- No notification can be seen, marked read, or counted by a different user

---

## 2. Architecture Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Module Event Source                                                     │
│  (grade posted, admission approved, payment received, etc.)              │
└────────────────────┬────────────────────────────────────────────────────┘
                     │ calls
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  notificationService.ts   (single source of truth)                      │
│  ─────────────────────────────────────────────────                      │
│  createNotification(input)          → DB insert + socket push           │
│  broadcastNotification(input)       → bulk insert + per-user push       │
│  listNotifications(userId, params)  → paginated, userId-scoped          │
│  markRead(notifId, userId)          → compound WHERE {id, userId}       │
│  markAllRead(userId)                → updateMany WHERE {userId}         │
│  getUnreadCount(userId)             → COUNT WHERE {userId, isRead=F}    │
└────────────────────┬────────────────────────────────────────────────────┘
                     │
            ┌────────┴────────┐
            │                 │
            ▼                 ▼
   ┌──────────────┐   ┌──────────────────────┐
   │  PostgreSQL  │   │  Socket.IO           │
   │  Notification│   │  pushNotification()  │
   │  table       │   │  → user:${userId}    │
   └──────────────┘   │    room              │
                      │  event: notification │
                      │         :new         │
                      └──────────────────────┘
                               │
                               ▼
                    ┌─────────────────────────┐
                    │  Browser — SocketContext │
                    │  onNotification(cb)      │
                    │  → useNotifications hook │
                    │  → unreadCount badge     │
                    │  → prepend to inbox      │
                    └─────────────────────────┘
```

---

## 3. Database Schema

### `Notification` table (generic — all roles except HR)
```sql
id          UUID      PK
userId      TEXT      -- User.id (no FK — avoids cascade complications)
title       TEXT
message     TEXT
type        TEXT      -- INFO | SUCCESS | WARNING | ERROR | GRADE | SCHEDULE |
                      -- ENROLLMENT | ANNOUNCEMENT | LEAVE | PAYROLL |
                      -- FINANCE | ADMISSION | TRANSCRIPT | GRADUATION | CERTIFICATE
isRead      BOOLEAN   DEFAULT false
entityType  TEXT?     -- e.g. "Application", "CourseGrade", "Certificate"
entityId    TEXT?     -- the related row's UUID
actionTab   TEXT?     -- deep-link tab name for the recipient's dashboard
pushedAt    TIMESTAMP -- set when socket push was attempted (informational)
createdAt   TIMESTAMP DEFAULT now()

-- Indexes
userId_idx          (userId)
isRead_idx          (isRead)
createdAt_idx       (createdAt)
userId_isRead_idx   (userId, isRead)   ← composite for unread badge query
```

### `HRNotification` table (HR-specific — separate by design)
Used only by the HR module's internal workflows (leave approval, contract expiry, payroll).
Not touched by the unified notification service.

---

## 4. Role × Notification Matrix

| Role | Receives notifications about | API endpoint | Real-time push |
|---|---|---|---|
| **STUDENT** | Grades posted, admission approved/rejected, transcript issued, graduation approved, certificate issued, payment verified, tuition reminders, announcements | `GET /api/student/dashboard/notifications` | ✅ `notification:new` |
| **INSTRUCTOR** | Assignment submissions, course grade updates, announcements, schedule changes | `GET /api/instructor/notifications` | ✅ `notification:new` |
| **REGISTRAR** | New onboarding screenshots submitted, system announcements | `GET /api/registrar/notifications` | ✅ `notification:new` |
| **DEPARTMENT_HEAD** | Course offering approvals, leave request outcomes, system announcements | `GET /api/department-head/notifications` | ✅ `notification:new` |
| **FINANCE_OFFICER** | Registration fee payments, tuition payment updates, system alerts | `GET /api/finance-officer/notifications` | ✅ `notification:new` |
| **ADMIN / SUPER_ADMIN** | System events, broadcast messages, security alerts | `GET /api/admin/notifications` | ✅ `notification:new` |
| **HR_OFFICER** | Leave requests, contract expiry, payroll approval, onboarding/offboarding | `GET /api/hr/notifications` (HRNotification table) | ✅ (HR-specific flow) |

---

## 5. Event Catalog

Every event below creates a `Notification` row via `createNotification()` which immediately pushes to the recipient via Socket.IO.

| Event | Triggered by | Recipient | Type | actionTab |
|---|---|---|---|---|
| Grade posted (assignment) | `instructorService.gradeAssignment()` | Student | `GRADE` | `grades` |
| Grade posted (course) | `instructorService.submitGrade()` | Student | `INFO` | `grades` |
| Admission approved | `admissionService.approveApplication()` | Student | `SUCCESS` | `dashboard` |
| Admission rejected | `admissionService.rejectApplication()` | Student | `WARNING` | `dashboard` |
| Correction requested | `admissionService.requestCorrection()` | Student | `WARNING` | `dashboard` |
| Registration fee verified | `foPaymentService.verifyRegistrationPayment()` | Student | `SUCCESS` | `financials` |
| Payment received | `foPaymentService.recordStudentPayment()` | Student | `SUCCESS` | `financials` |
| Tuition reminder | `foNotificationService.sendPaymentReminder()` | Student | `WARNING` | `financials` |
| Graduation approved | `graduationService.reviewAudit()` | Student | `SUCCESS` | `degree_audit` |
| Certificate issued | `certificateService.issueCertificate()` | Student | `SUCCESS` | `degree_audit` |
| Assignment submitted | `assignmentService.submitAssignment()` | Instructor | `ANNOUNCEMENT` | `assignments` |
| Onboarding screenshot submitted | `studentOnboarding` route | All Registrars | `INFO` | `admissions` |
| Course offering approved | `departmentHeadService.approveOffering()` | DH actor | `SUCCESS` | `approvals` |
| Admin broadcast | `adminService.broadcastNotification()` | All / role-filtered | `INFO`+ | depends |
| Contract expiry (daily job) | `hrContractExpiryJob` | HR Officers | `CONTRACT` (HRNotification) | `employees` |

---

## 6. Security Model

### IDOR Prevention
Every read and mutate operation uses a **compound WHERE clause** with both `id` AND `userId`:

```typescript
// ✅ SAFE — cannot mark another user's notification
await prisma.notification.updateMany({
  where: { id: notificationId, userId: requestingUserId },
  data:  { isRead: true },
});
// If count === 0 → row doesn't exist OR doesn't belong to this user
// Either way: return 404 — no information leakage
```

The old admin `markNotificationRead(id)` — which had no userId scope — has been fixed to `markNotificationRead(id, actorUserId)`.

### Role Isolation
Each role's notifications endpoint is protected by `authenticate` + `requireRole([...])`. The `userId` used in all queries comes from `req.user!.userId` (JWT-derived, server-verified), never from request body or query params.

### Socket Room Isolation
Each authenticated socket automatically joins `user:${userId}` on connect. `pushNotification()` targets exactly that room — no cross-user leakage is possible.

### Broadcast Safety
`broadcastNotification()` fetches target user IDs from the DB (filtered by role + status=ACTIVE), inserts rows per user, then pushes to each user's individual room. A recipient never receives another recipient's data.

---

## 7. Frontend Architecture

### `useNotifications` Hook (`frontend/src/hooks/useNotifications.ts`)
Role-agnostic hook that accepts injectable API functions:
```typescript
const { items, unreadCount, loading, markRead, markAllRead, reload } =
  useNotifications({
    fetchFn:       () => instructorNotificationsApi.list({ limit: 50 }),
    markReadFn:    (id) => instructorNotificationsApi.markRead(id),
    markAllReadFn: () => instructorNotificationsApi.markAllRead(),
  });
```

- **Initial fetch** on mount via `fetchFn`
- **Real-time bump**: subscribes to `notification:new` socket event, prepends new item without re-fetch
- **Optimistic updates**: `markRead` / `markAllRead` update local state immediately, rollback on API failure
- **Field normalisation**: accepts both `isRead` (most roles) and `read` (FO legacy API)

### `SocketContext` Extension
Added `NotificationPushEvent` type and `onNotification` subscription factory. Event name: `notification:new`. Every role dashboard that calls `useNotifications` automatically inherits real-time push.

---

## 8. Files Changed

### Backend
| File | Change |
|---|---|
| `prisma/schema.prisma` | Added `actionTab`, `pushedAt` to `Notification` model + composite index |
| `prisma/migrations/20260901133905_*/migration.sql` | ALTER TABLE migration |
| `src/lib/socket.ts` | Added `pushNotification()` + `NotificationPushPayload` type |
| `src/services/notificationService.ts` | **New** — unified service (create, broadcast, list, markRead, markAllRead, getUnreadCount) |
| `src/routes/instructor.ts` | Added 3 missing notification routes (GET/PATCH/POST) |
| `src/routes/admin.ts` | Fixed `markNotificationRead` — now passes `req.user!.userId` |
| `src/routes/registrar.ts` | Added 3 new notification routes |
| `src/services/admin/userManagementService.ts` | `createNotification` + `broadcastNotification` now delegate to unified service; `markNotificationRead` scoped to userId |
| `src/services/finance/foNotificationService.ts` | Imports + uses `createNotification`; full rewrite |
| `src/services/finance/foPaymentService.ts` | 2 raw creates → `createNotification` |
| `src/services/instructor/instructorService.ts` | 2 raw creates → `createNotification` |
| `src/services/registrar/admissionService.ts` | 3 raw creates → `createNotification` |
| `src/services/registrar/graduationService.ts` | 1 raw create → `createNotification` |
| `src/services/registrar/certificateService.ts` | 1 raw create → `createNotification` |
| `src/services/student/assignmentService.ts` | 1 raw create → `createNotification` |
| `src/services/departmentHead/departmentHeadService.ts` | 1 raw create → `createNotification` |
| `src/routes/studentOnboarding.ts` | `createMany` fan-out → `Promise.all(createNotification)` for per-user push |

### Frontend
| File | Change |
|---|---|
| `src/context/SocketContext.tsx` | Added `NotificationPushEvent` type + `onNotification` subscription |
| `src/hooks/useNotifications.ts` | **New** — universal notification hook |
| `src/lib/registrarApi.ts` | Added `registrarNotifApi` |
| `app/dashboard/instructor/page.tsx` | Replaced manual state with `useNotifications` |
| `app/dashboard/student/page.tsx` | Added `useNotifications` for unread badge |
| `app/dashboard/admin/page.tsx` | Added `useNotifications` replacing hardcoded `unreadCount = 0` |
| `app/dashboard/department-head/page.tsx` | Added `useNotifications` replacing manual `useState` |
| `app/dashboard/finance-officer/page.tsx` | Added `useNotifications` replacing derived filter |
| `app/dashboard/registrar/page.tsx` | Added `useNotifications` replacing audit-log count |

---

## 9. Build Status
- Backend `tsc --noEmit`: **0 new errors** (2 pre-existing `cloudinary.ts` errors unrelated to this work)
- Frontend `tsc --noEmit`: **0 errors**
