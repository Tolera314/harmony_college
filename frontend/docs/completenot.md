# Notification System — Complete Implementation Reference

---

## Database

### Schema changes (`backend/prisma/schema.prisma`)
Two columns added to the existing `Notification` model:

```
actionTab  String?    -- deep-link tab name (e.g. "grades", "financials")
pushedAt   DateTime?  -- timestamp when socket push was attempted
```

New composite index: `(userId, isRead)` — powers the unread badge count query efficiently.

**Migration:** `backend/prisma/migrations/20260901133905_notification_action_tab_pushed_at/migration.sql`

### Two separate notification tables (by design)

| Table | Used by | Created via |
|---|---|---|
| `Notification` | All roles except HR — students, instructors, registrar, DH, FO, admin | `notificationService.createNotification()` |
| `HRNotification` | HR officers only | `hrNotificationService.createNotification()` |

---

## Backend

### 1. Unified Notification Service
**File:** `backend/src/services/notificationService.ts` — new file

This is the single source of truth. Every notification in the system goes through here.

```
createNotification(input)
  → INSERT into Notification table
  → pushNotification() via Socket.IO to user:${userId} room
  → stamps pushedAt on success

broadcastNotification(input)
  → fetches all active users matching role filter
  → bulk INSERT (createMany)
  → pushes notification:new to each user's room individually

listNotifications({ userId, page, limit, unreadOnly })
  → SELECT WHERE userId = ? (strict scope)
  → returns { total, page, limit, totalPages, unreadCount, notifications }

markRead(notificationId, userId)
  → UPDATE WHERE { id, userId }  ← compound filter prevents IDOR
  → returns 404 if row not found OR belongs to another user

markAllRead(userId)
  → UPDATE WHERE { userId, isRead: false }

getUnreadCount(userId)
  → COUNT WHERE { userId, isRead: false }
```

---

### 2. Socket Push Helper
**File:** `backend/src/lib/socket.ts` — appended

```typescript
pushNotification(payload: NotificationPushPayload): void
```

- Emits event `notification:new` to room `user:${userId}`
- Every authenticated socket joins `user:${userId}` on connect
- Payload: `{ id, userId, title, message, type, actionTab, entityType, entityId, createdAt }`

---

### 3. API Endpoints — by role

#### Student
**File:** `backend/src/routes/studentDashboard.ts` — existing, unchanged

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/student/dashboard/notifications` | Last 30 notifications for the logged-in student |
| `PATCH` | `/api/student/dashboard/notifications/:id/read` | Mark one notification read |
| `POST` | `/api/student/dashboard/notifications/mark-all-read` | Mark all read |

Auth: `authenticate` + `requireRole([STUDENT])`
Scope: `WHERE userId = req.user.userId` (hard-coded in query)

---

#### Instructor
**File:** `backend/src/routes/instructor.ts` — **3 routes added** (previously missing — frontend called them, backend returned 404)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/instructor/notifications` | Paginated inbox (`?page&limit&unreadOnly`) |
| `PATCH` | `/api/instructor/notifications/:id/read` | Mark one read (IDOR-safe) |
| `POST` | `/api/instructor/notifications/read-all` | Mark all read |

Auth: `authenticate` + `requireRole([INSTRUCTOR, REGISTRAR, ADMIN, SUPER_ADMIN, DEPARTMENT_HEAD])`
Service: delegates to `instructorService.getNotifications / markNotificationRead / markAllNotificationsRead`

---

#### Registrar
**File:** `backend/src/routes/registrar.ts` — **3 routes added** (no notification route existed before)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/registrar/notifications` | Paginated inbox (`?page&limit&unreadOnly`) |
| `PATCH` | `/api/registrar/notifications/:id/read` | Mark one read |
| `POST` | `/api/registrar/notifications/read-all` | Mark all read |

Auth: `authenticate` + `requireRole([REGISTRAR, ADMIN, SUPER_ADMIN])`
Service: calls `notificationService` directly via dynamic import

---

#### Department Head
**File:** `backend/src/routes/departmentHead.ts` — existing, unchanged

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/department-head/notifications` | Paginated inbox |
| `PATCH` | `/api/department-head/notifications/:id/read` | Mark one read |
| `POST` | `/api/department-head/notifications/read-all` | Mark all read |

Auth: `authenticate` + `requireRole([DEPARTMENT_HEAD, ADMIN, SUPER_ADMIN])`
Service: `departmentHeadService.getNotifications / markNotificationRead / markAllNotificationsRead`

---

#### Finance Officer
**File:** `backend/src/routes/financeOfficer.ts` — existing, unchanged

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/finance-officer/notifications` | Last 50 notifications |
| `POST` | `/api/finance-officer/notifications/read` | Mark one read (body: `{ notificationId }`) |
| `POST` | `/api/finance-officer/notifications/read-all` | Mark all read |

Auth: `authenticate` + `requireRole([FINANCE_OFFICER, ADMIN, SUPER_ADMIN])`
Service: `foNotificationService.getNotifications / markAsRead / markAllAsRead`

---

#### Admin
**File:** `backend/src/routes/admin.ts` — existing + security fix

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/notifications` | Paginated inbox with filters (`?page&limit&userId&unreadOnly`) |
| `POST` | `/api/admin/notifications` | Create notification for a specific user |
| `POST` | `/api/admin/notifications/broadcast` | Broadcast to all active users (optional role filter) |
| `PATCH` | `/api/admin/notifications/:id/read` | Mark one read — **fixed: now scoped to req.user.userId** |

Auth: `authenticate` + `requireRole([ADMIN, SUPER_ADMIN])`
Service: `userManagementService.createNotification / broadcastNotification / markNotificationRead`

**Security fix:** `markNotificationRead(id)` previously had no userId scope — any admin could mark any user's notification. Fixed to `markNotificationRead(id, actorUserId)` using compound WHERE.

---

#### HR Officer
**File:** `backend/src/routes/hr.ts` — existing, unchanged

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/hr/notifications` | HR officer's notification inbox (HRNotification table) |
| `PATCH` | `/api/hr/notifications/:id/read` | Mark one read |
| `POST` | `/api/hr/notifications/read-all` | Mark all read |

Auth: `authenticate` + `requireRole([HR_OFFICER, ADMIN, SUPER_ADMIN])`
Note: HR uses a separate `HRNotification` table. Not routed through the unified service.

---

### 4. Event Triggers — where notifications are created

Every call below was previously `prisma.notification.create({...})` with no socket push. Each is now `createNotification({...})` which persists to DB and pushes to the recipient's browser instantly.

| File | Event | Recipient | Type | actionTab |
|---|---|---|---|---|
| `instructorService.ts` | Assignment graded | Student | `GRADE` | `grades` |
| `instructorService.ts` | Course grade submitted | Student | `INFO` | `grades` |
| `admissionService.ts` | Application approved | Student | `SUCCESS` | `dashboard` |
| `admissionService.ts` | Application rejected | Student | `WARNING` | `dashboard` |
| `admissionService.ts` | Correction requested | Student | `WARNING` | `dashboard` |
| `graduationService.ts` | Graduation approved | Student | `SUCCESS` | `degree_audit` |
| `certificateService.ts` | Certificate issued | Student | `SUCCESS` | `degree_audit` |
| `foPaymentService.ts` | Registration fee verified | Student | `SUCCESS` | `financials` |
| `foPaymentService.ts` | Payment recorded | Student | `SUCCESS` | `financials` |
| `foNotificationService.ts` | Tuition reminder sent | Student | `WARNING` | `financials` |
| `assignmentService.ts` | Assignment submitted | Instructor | `ANNOUNCEMENT` | `assignments` |
| `departmentHeadService.ts` | Course offering approved | DH actor | `SUCCESS` | `approvals` |
| `studentOnboarding.ts` | Registration screenshot uploaded | All Registrars (fan-out) | `INFO` | `admissions` |
| `userManagementService.ts` | Admin creates/broadcasts | Any user(s) | configurable | configurable |

---

## Frontend

### 1. SocketContext Extension
**File:** `frontend/src/context/SocketContext.tsx`

Added:
```typescript
// New type
export interface NotificationPushEvent {
  id: string; userId: string; title: string; message: string;
  type: string; actionTab: string | null;
  entityType: string | null; entityId: string | null; createdAt: string;
}

// New subscription in context interface + provider
onNotification: (cb: (e: NotificationPushEvent) => void) => () => void;
```

Listens on socket event `notification:new`. Used by the `useNotifications` hook automatically — no dashboard page needs to wire this manually.

---

### 2. `useNotifications` Hook
**File:** `frontend/src/hooks/useNotifications.ts` — new file

Universal hook used by every role dashboard. Accepts injectable API functions so it works for any role without duplication.

```typescript
const { items, unreadCount, loading, markRead, markAllRead, reload } =
  useNotifications({
    fetchFn:       () => instructorNotificationsApi.list({ limit: 50 }),
    markReadFn:    (id) => instructorNotificationsApi.markRead(id),
    markAllReadFn: () => instructorNotificationsApi.markAllRead(),
  });
```

What it does:
- Fetches inbox on mount via `fetchFn`
- Subscribes to `notification:new` socket → prepends new item without re-fetch → badge increments live
- `unreadCount` is derived from `items` (single source of truth, no separate state)
- `markRead` and `markAllRead` are optimistic — UI updates instantly, rolls back on API failure
- Normalises both `isRead` and `read` field names (FO API uses `read`, others use `isRead`)

---

### 3. Role API Clients

| File | Addition |
|---|---|
| `frontend/src/lib/registrarApi.ts` | Added `registrarNotifApi` (list, markRead, markAllRead) pointing to new `/api/registrar/notifications` routes |
| `frontend/src/lib/instructorApi.ts` | `instructorNotificationsApi` — existed already, now has working backend |
| `frontend/src/lib/adminApi.ts` | `adminNotificationsApi` — existed already |
| `frontend/src/lib/hodApi.ts` | `hodNotificationsApi` — existed already |
| `frontend/src/lib/foApi.ts` | `getNotifications / markNotificationRead / markAllNotificationsRead` — existed already |
| `frontend/src/lib/studentApi.ts` | `studentDashApi.getNotifications / markNotifRead / markAllRead` — existed already |

---

### 4. Dashboard Pages — `useNotifications` wired

| Page | File | Before | After |
|---|---|---|---|
| **Instructor** | `app/dashboard/instructor/page.tsx` | Manual `useState` + two `useEffect` fetches + manual `handleMarkRead` | `useNotifications` hook — all state removed |
| **Student** | `app/dashboard/student/page.tsx` | No notification fetch, `unreadCount` missing | `useNotifications` → real `unreadCount` passed to Header bell |
| **Admin** | `app/dashboard/admin/page.tsx` | `const unreadCount = 0` (hardcoded) | `useNotifications` → live count |
| **Department Head** | `app/dashboard/department-head/page.tsx` | Manual `useState(0)` + `setUnreadCount` in fetch callbacks | `useNotifications` → live count |
| **Finance Officer** | `app/dashboard/finance-officer/page.tsx` | `notifications.filter(n => !n.read).length` | `useNotifications` → live count |
| **Registrar** | `app/dashboard/registrar/page.tsx` | Audit-log count (approximation) | `useNotifications` → real Notification table count |
| **HR** | `app/dashboard/hr/page.tsx` | `hrNotificationsApi.list()` count — unchanged | No change — HR uses separate `HRNotification` table intentionally |

---

### 5. Instructor Notifications View
**File:** `frontend/src/components/instructor/views/InNotificationsView.tsx` — already existed

Full notification list view with pagination, filters, mark-read per item, mark-all-read button. Uses `instructorNotificationsApi` directly. Mounted on the `notifications` tab of the instructor dashboard.

---

## How the full flow works end-to-end

```
1. Event happens (e.g. registrar approves a student's admission)

2. admissionService.approveApplication() calls:
   createNotification({
     userId:    student.userId,
     title:     'Admission Approved',
     message:   '...',
     type:      'SUCCESS',
     actionTab: 'dashboard',
   })

3. notificationService.createNotification():
   a. INSERT row into Notification table
   b. pushNotification({ id, userId, title, ... })
      → socket.io emits 'notification:new' to room 'user:${student.userId}'

4. Student's browser (if open):
   SocketContext.onNotification fires
   → useNotifications hook receives the event
   → prepends item to items[] without any HTTP fetch
   → unreadCount increments by 1
   → Header bell badge shows new count instantly

5. Student clicks the bell:
   → dropdown shows the new notification at top
   → clicking it navigates to actionTab ('dashboard')
   → markRead() called → optimistic isRead=true → PATCH sent to backend

6. Student closes browser and comes back later:
   → useNotifications calls fetchFn on mount
   → GET /api/student/dashboard/notifications
   → returns all persisted notifications including unread ones
   → badge count restored from DB
```