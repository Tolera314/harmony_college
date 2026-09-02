# Harmony College — Institutional Notification System
## Architecture, Security, and Event Catalog

---

## 1. Overview

The notification system is a **real-time, role-scoped, security-hardened in-app messaging layer** that bridges every module in the college management system to the people who need to act on events.

It uses a **single unified `Notification` table** for every role including HR. A `module` column namespaces rows by domain so each role's inbox is cleanly separated without a second table.

Every notification is:
- Persisted to the DB immediately (durable inbox — survives page reload)
- Pushed to the recipient's open browser tab in real time via Socket.IO (`notification:new` event)
- Strictly scoped to `userId` — a user can never read, count, or mark another user's notifications

---

## 2. Architecture Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Module Event Source                                                     │
│  (grade posted, admission approved, contract expiring, etc.)             │
└────────────────────┬────────────────────────────────────────────────────┘
                     │ calls
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  notificationService.ts   (single source of truth for ALL roles)        │
│  ─────────────────────────────────────────────────────────────────────  │
│  createNotification(input)          → DB insert + socket push           │
│  broadcastNotification(input)       → bulk insert + per-user push       │
│  listNotifications(userId, params)  → paginated, userId+module scoped   │
│  markRead(notifId, userId)          → compound WHERE {id, userId}       │
│  markAllRead(userId)                → updateMany WHERE {userId}         │
│  getUnreadCount(userId)             → COUNT WHERE {userId, isRead=F}    │
└──────────────┬──────────────────────────────────────────────────────────┘
               │
      ┌────────┴────────┐
      │                 │
      ▼                 ▼
┌──────────────┐   ┌──────────────────────┐
│  PostgreSQL  │   │  Socket.IO           │
│  Notification│   │  pushNotification()  │
│  table       │   │  event: notif:new    │
│  (one table) │   │  room: user:${id}    │
└──────────────┘   └──────────────────────┘
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

### Single `Notification` table — all roles, all modules

```sql
id          UUID       PK
userId      TEXT       -- User.id (recipient)
title       TEXT
message     TEXT
type        TEXT       -- INFO | SUCCESS | WARNING | ERROR |
                       -- GRADE | SCHEDULE | ENROLLMENT | ANNOUNCEMENT |
                       -- LEAVE | PAYROLL | CONTRACT | ONBOARDING |
                       -- PERFORMANCE | FINANCE | ADMISSION |
                       -- TRANSCRIPT | GRADUATION | CERTIFICATE | SYSTEM
module      TEXT       -- ACADEMIC | HR | FINANCE | ADMIN | SYSTEM
                       -- default: ACADEMIC
isRead      BOOLEAN    default false
entityType  TEXT?      -- e.g. "Application", "CourseGrade",
                       --      "HREmployee", "Certificate"
entityId    TEXT?      -- the related row's UUID
actionTab   TEXT?      -- deep-link tab name for the recipient's dashboard
pushedAt    TIMESTAMP? -- set when socket push was attempted
createdAt   TIMESTAMP  default now()

-- Indexes
userId_idx              (userId)
isRead_idx              (isRead)
createdAt_idx           (createdAt)
userId_isRead_idx       (userId, isRead)      ← unread badge count
userId_module_idx       (userId, module)      ← per-module inbox filter
```

### Why one table is the right design

Previously the system had two separate tables:

| Old design | New design |
|---|---|
| `Notification` for academic/admin roles | Single `Notification` table |
| `HRNotification` for HR officers only | `module = 'HR'` filter |
| Separate HR enum `HRNotifType` | `type` column (free text, extensible) |
| HR rows had no socket push | All rows get socket push via unified service |
| Admin `markRead` had no userId scope (IDOR) | All roles use compound `WHERE {id, userId}` |

A single table with a `module` column is the standard pattern in enterprise ERP systems (SAP, Oracle, Workday). It keeps queries simple, reuses all security logic, and makes adding new modules trivial.

---

## 4. HR Notification Field Mapping

When HR notifications are created, `HREmployee`-specific data is mapped into the unified columns:

| Old `HRNotification` field | New `Notification` column |
|---|---|
| `recipientUserId` | `userId` |
| `employeeId` | `entityId` |
| — | `entityType = 'HREmployee'` |
| `tab` | `actionTab` |
| `type` (LEAVE/CONTRACT/…) | `type` |
| — | `module = 'HR'` |

The HR API route (`GET /api/hr/notifications`) maps these back for the frontend:

```typescript
// Backend maps unified → HR frontend shape
{ entityId → employeeId, actionTab → tab, module → module }
```

---

## 5. Role × Notification Matrix

| Role | Receives notifications about | Endpoint | Module filter | Real-time |
|---|---|---|---|---|
| **STUDENT** | Grades, admission, transcript, graduation, certificate, payments, announcements | `GET /api/student/dashboard/notifications` | ACADEMIC | ✅ |
| **INSTRUCTOR** | Assignment submissions, grade updates, schedule changes | `GET /api/instructor/notifications` | ACADEMIC | ✅ |
| **REGISTRAR** | Onboarding screenshots, system announcements | `GET /api/registrar/notifications` | ACADEMIC | ✅ |
| **DEPARTMENT_HEAD** | Offering approvals, leave outcomes, announcements | `GET /api/department-head/notifications` | ACADEMIC | ✅ |
| **FINANCE_OFFICER** | Registration fee payments, tuition payments, reminders | `GET /api/finance-officer/notifications` | FINANCE | ✅ |
| **ADMIN / SUPER_ADMIN** | System events, broadcast messages, security alerts | `GET /api/admin/notifications` | ADMIN | ✅ |
| **HR_OFFICER** | Contract expiry, offboarding, contract renewal | `GET /api/hr/notifications` | HR | ✅ |

---

## 6. Event Catalog

Every event below calls `createNotification()` which persists the row and socket-pushes instantly.

### Academic / Student events

| Event | Service / File | Recipient | Type | actionTab |
|---|---|---|---|---|
| Assignment graded | `instructorService.gradeAssignment()` | Student | `GRADE` | `grades` |
| Course grade submitted | `instructorService.submitGrade()` | Student | `INFO` | `grades` |
| Admission approved | `admissionService.approveApplication()` | Student | `SUCCESS` | `dashboard` |
| Admission rejected | `admissionService.rejectApplication()` | Student | `WARNING` | `dashboard` |
| Correction requested | `admissionService.requestCorrection()` | Student | `WARNING` | `dashboard` |
| Registration fee verified | `foPaymentService.verifyRegistrationPayment()` | Student | `SUCCESS` | `financials` |
| Payment received | `foPaymentService.recordStudentPayment()` | Student | `SUCCESS` | `financials` |
| Tuition reminder | `foNotificationService.sendPaymentReminder()` | Student | `WARNING` | `financials` |
| Graduation approved | `graduationService.reviewAudit()` | Student | `SUCCESS` | `degree_audit` |
| Certificate issued | `certificateService.issueCertificate()` | Student | `SUCCESS` | `degree_audit` |
| Assignment submitted | `assignmentService.submitAssignment()` | Instructor | `ANNOUNCEMENT` | `assignments` |
| Onboarding screenshot | `studentOnboarding` route | All Registrars | `INFO` | `admissions` |
| Course offering approved | `departmentHeadService.approveOffering()` | DH actor | `SUCCESS` | `approvals` |

### HR events (module = 'HR')

| Event | Service / File | Recipient | Type | actionTab |
|---|---|---|---|---|
| Contract expiring (60-day alert) | `hrContractExpiryJob` (daily cron) | All HR Officers | `CONTRACT` | `employees` |
| Offboarding initiated | `hrOffboardingService.initiateOffboarding()` | HR Officer | `SYSTEM` | `onboarding` |
| Contract renewed | `hrContractRenewalService.renewContract()` | HR Officer | `CONTRACT` | `employees` |

### Admin broadcast

| Event | Service / File | Recipient | Type |
|---|---|---|---|
| System-wide broadcast | `adminService.broadcastNotification()` | All active users (or role-filtered) | configurable |

---

## 7. Security Model

### IDOR Prevention
Every read and mutate operation uses a **compound WHERE clause** with both `id` AND `userId`:

```typescript
// Safe — silently returns 0 rows if userId doesn't match
await prisma.notification.updateMany({
  where: { id: notificationId, userId: requestingUserId },
  data:  { isRead: true },
});
// count === 0 → row not found OR belongs to another user
// Either way: 404 — no information leakage
```

Previously the admin `markNotificationRead(id)` had no userId scope. This is now fixed.

### Module Isolation
Each role's inbox endpoint adds `module` to the WHERE clause:

```typescript
// HR officers only see module='HR' rows
prisma.notification.findMany({ where: { userId, module: 'HR' } })
```

### Role-Based Route Protection
Every notification endpoint is protected by `authenticate` + `requireRole([...])`. The `userId` in all queries comes from `req.user!.userId` (JWT-derived, server-verified), never from request body or query params.

### Socket Room Isolation
Each authenticated socket joins `user:${userId}` on connect. `pushNotification()` targets only that room — cross-user leakage is structurally impossible.

---

## 8. Frontend Architecture

### `useNotifications` Hook (`frontend/src/hooks/useNotifications.ts`)

Universal hook used by every dashboard. Accepts injectable API functions — no role-specific logic inside the hook.

```typescript
const { items, unreadCount, loading, markRead, markAllRead, reload } =
  useNotifications({
    fetchFn:       () => instructorNotificationsApi.list({ limit: 50 }),
    markReadFn:    (id) => instructorNotificationsApi.markRead(id),
    markAllReadFn: () => instructorNotificationsApi.markAllRead(),
  });
```

- Fetches inbox on mount
- Subscribes to `notification:new` socket event → prepends new item, increments badge without re-fetch
- Optimistic `markRead` / `markAllRead` with rollback on failure
- Normalises both `isRead` and `read` field names across role APIs

### `SocketContext` Extension
Added `NotificationPushEvent` type and `onNotification` subscription. Event name: `notification:new`. Room: `user:${userId}`.

---

## 9. Files Changed

### Backend

| File | Change |
|---|---|
| `prisma/schema.prisma` | Added `module` column + `(userId,module)` index to `Notification`. Removed `HRNotification` model, `HRNotifType` enum, `HREmployee.notifications` relation |
| `prisma/migrations/20260902114934_unify_hr_notification/migration.sql` | ADD COLUMN module; migrate HRNotification→Notification; DROP TABLE HRNotification; DROP TYPE HRNotifType |
| `prisma/migrations/20260901133905_notification_action_tab_pushed_at/migration.sql` | ADD COLUMN actionTab, pushedAt; composite index userId+isRead |
| `src/services/notificationService.ts` | Unified service — `CreateNotificationInput` and `BroadcastInput` now include `module?` field; DB writes pass `module ?? 'ACADEMIC'` |
| `src/services/hr/hrNotificationService.ts` | Full rewrite — all 4 functions use `prisma.notification WHERE module='HR'`; `createNotification` keeps backward-compatible signature |
| `src/services/hr/hrContractExpiryJob.ts` | Replaced `prisma.hRNotification.create` with `createNotification` from hrNotificationService |
| `src/services/hr/hrOffboardingService.ts` | Already imported from hrNotificationService — auto-routes to unified table (no code change) |
| `src/services/hr/hrContractRenewalService.ts` | Same — no code change |
| `src/routes/hr.ts` | `GET /notifications` maps unified row shape to HR frontend shape (entityId→employeeId, actionTab→tab) |
| `src/routes/instructor.ts` | Added 3 missing notification routes (GET/PATCH/POST) |
| `src/routes/registrar.ts` | Added 3 new notification routes |
| `src/routes/admin.ts` | Fixed `markNotificationRead` — now passes `req.user!.userId` (IDOR fix) |
| `src/lib/socket.ts` | Added `pushNotification()` + `NotificationPushPayload` type |

### Frontend

| File | Change |
|---|---|
| `src/context/SocketContext.tsx` | Added `NotificationPushEvent` type + `onNotification` subscription |
| `src/hooks/useNotifications.ts` | New universal hook — fetch, real-time push, optimistic mark-read |
| `src/lib/hrApi.ts` | `HRNotificationApi` updated (removed `employee` sub-object, added `module` field); `HRNotifType` kept as uppercase union |
| `src/components/hr/HRHeader.tsx` | Uses `HRNotificationApi` (not old `HRNotification`); `n.read`→`n.isRead`; `n.timestamp`→formatted `n.createdAt`; `n.tab` cast to `HRNavTab` |
| `src/components/hr/views/HRNotificationsView.tsx` | Removed `notif.employee` avatar block (relation removed from response) |
| `app/dashboard/hr/page.tsx` | Added `headerNotifs` state; `handleMarkRead`; passes real notifications to `HRHeader` instead of `[]` |
| `app/dashboard/instructor/page.tsx` | Uses `useNotifications` hook |
| `app/dashboard/student/page.tsx` | Uses `useNotifications` for real unread badge |
| `app/dashboard/admin/page.tsx` | Uses `useNotifications` replacing hardcoded `unreadCount = 0` |
| `app/dashboard/department-head/page.tsx` | Uses `useNotifications` replacing manual state |
| `app/dashboard/finance-officer/page.tsx` | Uses `useNotifications` replacing derived filter |
| `app/dashboard/registrar/page.tsx` | Uses `useNotifications` with new `registrarNotifApi` |
| `src/lib/registrarApi.ts` | Added `registrarNotifApi` (list, markRead, markAllRead) |

---

## 10. Build Status

- **Backend** `tsc --noEmit`: 0 new errors (2 pre-existing `cloudinary.ts` errors unrelated to this work)
- **Frontend** `tsc --noEmit`: 0 errors
