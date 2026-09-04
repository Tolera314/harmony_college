# Implementation Plan: Complete `functionactor.md` Role Architecture & Modules

This plan implements 100% of the functionality and role boundaries defined in [`functionactor.md`](file:///d:/Users/backup/Pharmacy/requirement/functionactor.md).

## Architectural Hierarchy

```text
Platform Level
└── ADMIN (Platform Administrator)

Pharmacy Level
└── OWNER (Pharmacy Owner)
    ├── MANAGER (Operations Manager)
    ├── PHARMACIST (Medicine Professional)
    ├── CASHIER (Sales Operator)
    ├── STOCK_CLERK (Inventory Operator)
    └── ACCOUNTANT (Financial Controller)
```

## User Review Required

> [!IMPORTANT]
> The platform strictly separates **Platform Administration** (`ADMIN`) from **Pharmacy Business Operations** (`OWNER`, `MANAGER`, `PHARMACIST`, `CASHIER`, `STOCK_CLERK`, `ACCOUNTANT`).
> - Platform Admins cannot alter pharmacy sales, inventory, or finances without initiating an **Audited Support Session**.
> - Cashiers land directly on `/pos` with streamlined point-of-sale workflows.
> - Each role receives an exact, tailored sidebar and permission gate matching `functionactor.md`.

---

## Proposed Changes

### 1. Database Schema & Prisma Migrations (`backend/prisma/schema.prisma`)
- Add models for Platform Management:
  - `SubscriptionPlan`: Plans, pricing (monthly/yearly in ETB), branch/user limits, features.
  - `PharmacySubscription`: Active subscription per pharmacy, renewal, expiration.
  - `SupportTicket` & `SupportTicketMessage`: Multi-role support tickets with attachments and severity.
  - `FeatureFlag`: System-wide and pharmacy-specific feature gating.
  - `Announcement`: Global & role-targeted platform broadcasts.
  - `PlatformSetting`: Dynamic configuration (maintenance mode, platform defaults).
  - `SupportSession`: Logged, time-bound, audited platform admin impersonation sessions.
- Run `npx prisma db push` to synchronize Neon PostgreSQL database.

---

### 2. Backend Routes & Access Control Enforcement (`backend/src/routes/`)

#### [MODIFY] [`admin.ts`](file:///d:/Users/backup/Pharmacy/backend/src/routes/admin.ts)
- Comprehensive Platform Administrator APIs:
  - Organizations CRUD (list, create, view, suspend, restore, metrics).
  - Platform users management (list, activate, suspend, role assignment).
  - Subscriptions & Plans (manage pricing, assign plans, status overrides).
  - Platform billing analytics & revenue reports.
  - Support ticket resolution & messaging.
  - Leads & demo requests pipeline.
  - System health, API monitoring, sync monitoring, background maintenance jobs.
  - Backups (instant JSON snapshot & restore validation).
  - Feature Flags management (global & per-pharmacy override).
  - Platform Announcements.
  - Platform Settings (general, maintenance mode).
  - Audited Support Mode (issue restricted support token, create audit logs).

#### [MODIFY] [`sales.ts`](file:///d:/Users/backup/Pharmacy/backend/src/routes/sales.ts)
- Grant `PHARMACIST` and `CASHIER` access to sales & authorized returns.
- Disallow `ADMIN` from direct sales creation.

#### [MODIFY] [`inventory.ts`](file:///d:/Users/backup/Pharmacy/backend/src/routes/inventory.ts) & [`batches.ts`](file:///d:/Users/backup/Pharmacy/backend/src/routes/batches.ts)
- Disallow `ADMIN` and `ACCOUNTANT` from direct physical inventory modification.
- Permit `STOCK_CLERK` and `MANAGER` for stock operations, quarantine, and damage logging.
- Permit `PHARMACIST` for medicine lookup, batch inspection, and availability queries.

#### [MODIFY] [`payments.ts`](file:///d:/Users/backup/Pharmacy/backend/src/routes/payments.ts)
- Allow `ACCOUNTANT`, `OWNER`, and `MANAGER` to record supplier payments, reconcile payments, and log disputes.
- Allow `CASHIER` to record customer repayments.

#### [NEW] [`tickets.ts`](file:///d:/Users/backup/Pharmacy/backend/src/routes/tickets.ts) & [`announcements.ts`](file:///d:/Users/backup/Pharmacy/backend/src/routes/announcements.ts)
- User endpoints for creating support tickets, replying, and fetching active platform announcements.

---

### 3. Frontend Role-Specific Sidebars & Navigation (`frontend/src/components/`)

#### [MODIFY] [`Sidebar.tsx`](file:///d:/Users/backup/Pharmacy/frontend/src/components/Sidebar.tsx)
- Implement dynamic sidebars strictly matching `functionactor.md` for all 7 roles:
  1. **ADMIN**: Dashboard, Organizations, Platform Users, Subscriptions, Billing, Leads, Support Tickets, System Health, API Monitoring, Background Jobs, Synchronization Monitoring, Backups, Audit Logs, Feature Flags, Announcements, Platform Settings.
  2. **OWNER**: Dashboard, Point of Sale, Products, Inventory, Stock Counts, Stock Transfers, Expiry Control, Reorder Suggestions, Purchases, Purchase Orders, Suppliers, Customers, Payments, Reports, Branches, Staff & Roles, Notifications, Audit Logs, Integrations, Subscription & Billing, Settings, Help & Support.
  3. **MANAGER**: Dashboard, Point of Sale, Products, Inventory, Stock Counts, Stock Transfers, Expiry Control, Reorder Suggestions, Purchases, Purchase Orders, Suppliers, Customers, Payments, Operational Reports, Notifications, Audit Logs, Help & Support.
  4. **PHARMACIST**: Dashboard, Point of Sale, Medicine Search, Products, Inventory Availability, Batches & Expiry, Customers, Sales History, Returns, Notifications, Help & Support.
  5. **CASHIER**: Point of Sale, Held Sales, Sales History, Returns, Customers, Customer Credit, Cashier Shift, My Sales Report, Notifications, Help & Support.
  6. **STOCK_CLERK**: Dashboard, Products, Inventory, Receive Stock, Stock Counts, Stock Transfers, Batches & Expiry, Damaged Stock, Quarantined Stock, Supplier Returns, Stock Activity, Inventory Reports, Notifications, Help & Support.
  7. **ACCOUNTANT**: Dashboard, Sales, Purchases, Payments, Supplier Balances, Customer Credit, Cashier Shifts, Gross Profit, Financial Reports, Tax Reports, Stock Valuation, Payment Reconciliation, Data Export, Notifications, Help & Support.

---

### 4. Frontend Dedicated Views & Modules (`frontend/src/app/`)

#### [NEW] [`admin/page.tsx`](file:///d:/Users/backup/Pharmacy/frontend/src/app/admin/page.tsx)
- Comprehensive Platform Admin Console:
  - Organizations Management (active, suspended, branch counts, license verification).
  - Platform Users & Staff Directory across tenants.
  - Subscription Plans & Billing Tier management.
  - Inbound Leads & Demo Inquiries.
  - Support Tickets Desk with priority filters and instant response editor.
  - System Health & Real-Time Node.js/Neon metrics.
  - API Monitoring & Error Logs.
  - Background Jobs execution console.
  - Synchronization Monitoring.
  - Zero-dependency Backup Generator & Download.
  - Feature Flags Toggle Station.
  - Platform Announcements Creator.
  - Platform Settings & Maintenance Mode switch.
  - Audited Support Session launcher (Impersonation).

#### [NEW] [`payments/page.tsx`](file:///d:/Users/backup/Pharmacy/frontend/src/app/payments/page.tsx)
- Full Financial & Payments Workbench for Accountants and Owners:
  - Payment Method Breakdown (Cash, Telebirr, CBE Birr, M-Pesa, Bank, Card, Credit).
  - Supplier Payments Recording & Balance Settlement.
  - Customer Credit Repayments.
  - Daily Financial Reconciliation engine with Net Cash Flow computation.
  - Dispute Resolution logging.
  - Data Export to CSV/JSON.

#### [NEW] [`support/page.tsx`](file:///d:/Users/backup/Pharmacy/frontend/src/app/support/page.tsx)
- Help & Support Portal:
  - Submit Support Ticket (category, severity, screenshots/description).
  - My Tickets Tracker with conversation replies.
  - Pharmacy Help Knowledge Base & FAQs.
  - Direct 24/7 Hotline & Emergency technical contact info.

#### [NEW] [`notifications/page.tsx`](file:///d:/Users/backup/Pharmacy/frontend/src/app/notifications/page.tsx)
- Notification Center: Expiry alerts, low-stock warnings, system notices, and broadcast announcements.

#### [NEW] [`reorder/page.tsx`](file:///d:/Users/backup/Pharmacy/frontend/src/app/reorder/page.tsx)
- Reorder Engine workspace for Owners & Managers with reorder suggestions, lead times, safety stocks, and one-click Purchase Order generation.

#### [NEW] [`medicine-search/page.tsx`](file:///d:/Users/backup/Pharmacy/frontend/src/app/medicine-search/page.tsx)
- Dedicated Pharmacist Medicine Search & Formulary Catalog:
  - Search by Brand Name, Generic Name, Barcode, or Amharic Name.
  - Shows Strength, Dosage Form, Pack Size, FEFO Batch status, Expiry, Prescription-Required indicator, Notes, and Available Stock.

---

## Verification Plan

### Automated Tests & Checks
1. Prisma Schema validation & DB push:
   `npx prisma db push`
2. Backend TypeScript compilation & API health verification:
   `npm run build` in `backend`
3. Frontend TypeScript & Next.js build verification:
   `npm run build` in `frontend`

### Role Boundary & Workflow Verifications
1. **Admin Platform Verification**:
   - Access `/admin`, test organization suspension/restoration, view system metrics, run maintenance job, view audit logs, trigger backup.
2. **Owner & Manager Verification**:
   - Verify complete sidebar items, branch switcher, stock transfer, purchase approval, reorder engine.
3. **Pharmacist Verification**:
   - Verify `/medicine-search`, Amharic lookup, prescription flags, FEFO batch selection in POS, return processing.
4. **Cashier Verification**:
   - Verify auto-redirect to `/pos`, shift opening/closing with discrepancy calculation, held sales, credit sales.
5. **Stock Clerk Verification**:
   - Verify Receive Stock, Stock Counts discrepancy recording, Damaged and Quarantined stock controls.
6. **Accountant Verification**:
   - Verify Payments module, supplier payables, customer credit repayments, gross profit analytics, reconciliation disputes.
