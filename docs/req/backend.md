```text
Act as a senior full-stack software architect, enterprise UI/UX engineer, backend engineer, PostgreSQL database architect, Prisma expert, security engineer, and performance engineer.

You are working on an existing College Management System with a Registrar Officer Dashboard.

Your task is to take the EXISTING Registrar Dashboard frontend and implement the Registrar modules end-to-end using the existing project architecture.

IMPORTANT:
Do not redesign the existing interface unnecessarily.
Do not replace working components with completely new implementations unless necessary.
First inspect the existing codebase, folder structure, routes, components, API architecture, authentication, authorization, Prisma schema, database configuration, and existing patterns.

The goal is to convert frontend-only/mock functionality into REAL, production-quality functionality connected to PostgreSQL through the backend and Prisma.

==================================================
REGISTRAR SIDEBAR MODULES
==================================================

The following modules must be fully implemented:

1. Dashboard
2. Student Records
3. Admissions
4. Course Enrollments
5. Course Catalog
6. Course Offerings
7. Class Timetable
8. Transcripts
9. Graduation Auditing
10. Digital Certificates
11. Interactive Reports
12. Academic Calendar
13. Announcements
14. Audit Logs

Also implement:

15. Settings
     . Personal Profile
     . Appearance and theme
     . Password
     . Active Session Management
     . security
     . Registration engine

16. Secure Logout

Every module must use real backend APIs and real PostgreSQL data.

==================================================
CRITICAL REQUIREMENT — NO MOCK DATA
==================================================

Do NOT use mock data for these modules.

Remove existing mock/static data where these modules are being implemented.

The architecture must be:

Frontend
↓
API
↓
Controller/Route
↓
Validation
↓
Service / Business Logic
↓
Prisma
↓
PostgreSQL

When a registrar creates, edits, approves, rejects, enrolls, schedules, generates, publishes, or deletes something, it must actually affect the database.

When the page reloads, the information must come from PostgreSQL.

If the database is empty, create a Prisma development seed script instead of putting fake data inside React components.

==================================================
1. REGISTRAR DASHBOARD
==================================================

Connect dashboard statistics to real database data.

Display:

- Pending Admissions
- Active Students
- Active Programs
- Active Courses
- Active Course Offerings
- Current Enrollments
- Schedule Conflicts
- Pending Transcript Requests
- Graduation Audit Requests
- Certificates Issued
- Upcoming Registration Deadlines
- Recent Registrar Activity

Use optimized database aggregation queries.

Do not retrieve thousands of records just to calculate dashboard numbers.

Add:

- Recent activity
- Upcoming deadlines
- Alerts
- Registration status
- Enrollment statistics

==================================================
2. STUDENT RECORDS
==================================================

Implement real student record management.

Features:

- Student list
- Search
- Pagination
- Sorting
- Filtering
- Student profile
- Student ID
- Personal information
- Program
- Department
- Academic status
- Admission information
- Current enrollments
- Enrollment history
- Academic history
- GPA
- Credits

Use server-side search, filtering, sorting, and pagination.

Do not fetch the entire student database to the browser.

==================================================
3. ADMISSIONS
==================================================

Implement the complete admission workflow.

Features:

- Application list
- Search
- Filtering
- Pagination
- View application
- Applicant information
- Academic documents
- Transcript documents
- Identity documents
- Application status
- Review comments
- Approve
- Reject
- Request correction

Approval:

Application
↓
Validate
↓
Approve
↓
Create/update student record
↓
Create audit log
↓
Create notification
↓
Update application status

Rejection:

Application
↓
Reject
↓
Store reason
↓
Create audit log
↓
Create notification

Use transactions where multiple database operations must succeed together.

==================================================
4. COURSE CATALOG
==================================================

Manage:

Departments

Programs

Courses

Prerequisites

Course fields:

- Course Code
- Course Name
- Description
- Credit Hours
- Department
- Program
- Prerequisites
- Status

Features:

- Create
- Edit
- View
- Activate
- Deactivate
- Search
- Filter
- Pagination

Course codes must be unique.

Prefer deactivation/archiving instead of deleting academic records referenced by enrollments or historical records.

==================================================
5. COURSE OFFERINGS
==================================================

Implement real course offerings.

Fields:

- Course
- Instructor
- Academic Year
- Semester
- Room
- Building
- Capacity
- Schedule
- Status

Features:

- Create
- Edit
- View
- Assign Instructor
- Assign Room
- Set Capacity
- View Enrolled Students

Validate:

- Room conflicts
- Instructor conflicts
- Duplicate offering
- Capacity
- Academic term
- Schedule conflicts

All important validation must happen on the backend.

==================================================
6. COURSE ENROLLMENTS
==================================================

Implement real enrollment management.

Features:

- Student enrollments
- Search
- Filter
- Pagination
- Enrollment details
- Add enrollment
- Drop enrollment
- Force-add
- Force-drop
- Enrollment status
- Enrollment history

Force-add and force-drop require a reason.

Validate:

- Duplicate enrollment
- Course capacity
- Registration period
- Prerequisites
- Student eligibility
- Schedule conflicts

Every manual override must create an audit log.

==================================================
7. CLASS TIMETABLE
==================================================

Build a real timetable management system.

Views:

- Day
- Week
- Month

Features:

- Create class schedule
- Edit schedule
- Delete/cancel schedule
- Assign room
- Assign instructor
- Assign course offering
- Set start time
- Set end time
- Set day
- View room availability

Automatic backend conflict detection:

Room conflict

Instructor conflict

Student schedule conflict

Room capacity exceeded

Course offering conflict

When a conflict occurs, return a structured conflict response.

Example:

"Room B204 is already occupied from 10:00–12:00."

Provide alternative available rooms/times where possible.

Use database transactions when creating/updating schedules.

==================================================
8. TRANSCRIPTS
==================================================

Implement real transcript management.

Registrar can:

- Search student
- View academic history
- Generate transcript
- Preview transcript
- Download PDF
- Print
- Verify transcript
- Process transcript requests
- Approve request
- Reject request
- Mark as issued

Transcript should contain:

- College information
- Student information
- Student ID
- Program
- Department
- Academic terms
- Courses
- Credit hours
- Grades
- GPA
- Cumulative GPA
- Academic status
- Graduation status

Generate official PDF documents from real database data.

Do not hardcode transcript information.

Transcript issuance must be recorded in the audit log.

==================================================
9. GRADUATION AUDITING
==================================================

Implement a real degree audit system.

For each student calculate:

- Required credits
- Completed credits
- Remaining credits
- Required courses
- Completed required courses
- Missing courses
- GPA requirement
- Current GPA
- Academic standing
- Graduation eligibility

Flow:

Student
↓
Select Program
↓
Load Program Requirements
↓
Load Academic History
↓
Compare Requirements
↓
Calculate Eligibility
↓
Eligible / Not Eligible

Display:

Eligible

or

Requirements Remaining

Registrar can:

- Review audit
- Approve graduation
- Deny graduation
- Add reason
- View audit history

Graduation approval must create an audit record.

==================================================
10. DIGITAL CERTIFICATES
==================================================

Implement certificate management using real graduation records.

Flow:

Graduation Approved

↓

Generate Certificate

↓

Create Unique Certificate ID

↓

Generate QR Code / Verification Code

↓

Generate Certificate

↓

Issue to Student

↓

Verification Available

Features:

- Certificate preview
- Generate certificate
- Issue certificate
- Download PDF
- Verify certificate
- Revoke certificate
- View certificate history

Each certificate must have a unique verification identifier.

Certificate verification should retrieve real database information.

If revoked:

Status = Revoked

Store:

- Revoked By
- Revoked Date
- Reason

==================================================
11. INTERACTIVE REPORTS
==================================================

Build real reports using database queries.

Reports:

Enrollment

Admissions

Students

Programs

Departments

Course Capacity

Course Utilization

Graduation

Transcripts

Registration

Academic Performance

Examples:

- Students by program
- Students by department
- Enrollment by semester
- Course capacity utilization
- Admission status
- Graduation statistics
- Program headcount
- Course enrollment trends

Filters:

- Academic Year
- Semester
- Department
- Program
- Course
- Date Range

Charts should use real backend data.

Do not calculate large reports in the browser.

Provide:

- Export CSV
- Export Excel
- Export PDF

==================================================
12. ACADEMIC CALENDAR
==================================================

Implement a real academic calendar.

Manage:

- Academic years
- Semesters
- Registration periods
- Add/drop deadlines
- Examination periods
- Holidays
- Graduation dates
- Admission deadlines
- Important academic events

Features:

- Create event
- Edit event
- Delete/cancel event
- Set event type
- Set start date
- Set end date
- Set description
- Publish event

Views:

- Month
- Week
- List

Important calendar events should be visible on relevant dashboards.

==================================================
13. ANNOUNCEMENTS
==================================================

Implement real announcements.

Registrar can:

- Create announcement
- Edit announcement
- Save draft
- Publish
- Schedule publication
- Archive
- Delete where appropriate

Target audience:

- All Students
- Specific Department
- Specific Program
- Specific Semester
- Specific Student Group

Fields:

- Title
- Content
- Priority
- Target Audience
- Publish Date
- Expiration Date
- Attachments
- Status

Published announcements must be stored in PostgreSQL.

Create notifications for targeted users where appropriate.

==================================================
14. AUDIT LOGS
==================================================

Implement a real registrar audit system.

Record important actions:

- Admission approved
- Admission rejected
- Student record changed
- Course created
- Course updated
- Course offering created
- Enrollment added
- Force enrollment
- Enrollment dropped
- Timetable changed
- Transcript generated
- Graduation approved
- Certificate issued
- Certificate revoked
- Announcement published
- Calendar changed

Each audit entry should contain:

- User
- Role
- Action
- Entity
- Entity ID
- Description
- Timestamp
- Metadata

Features:

- Search
- Filter
- Date range
- User filter
- Action filter
- Entity filter
- Pagination

Audit logs should not be casually editable or deletable by normal registrar users.

==================================================
15. SEARCH AND FILTERING
==================================================

Implement global and module-specific search.

Search across:

- Students
- Admissions
- Courses
- Programs
- Enrollments
- Course offerings
- Certificates
- Transcripts

Use backend/database search.

Implement:

- Pagination
- Sorting
- Filtering
- Debounced search
- URL query parameters where appropriate

==================================================
16. SECURITY AND AUTHORIZATION
==================================================

This is a privileged registrar system.

Implement:

- Authentication
- Registrar authorization
- RBAC
- Server-side permission checks
- Secure sessions
- Secure logout
- Automatic session expiration
- Input validation
- Secure file access
- Audit logging

Never rely on frontend route protection alone.

A user must not gain access simply by manually entering a protected URL.

==================================================
17. PASSWORD AND SESSION MANAGEMENT
==================================================

Implement:

- Change password
- Forgot password
- Email reset link
- Password validation
- Secure password hashing
- Session management
- Active sessions
- Logout
- Automatic logout after inactivity

Never store plain-text passwords.

==================================================
18. PRISMA DATABASE
==================================================

Inspect the existing Prisma schema before creating models.

Reuse existing models where appropriate.

Extend the schema for missing entities such as:

- Student
- AdmissionApplication
- Department
- Program
- Course
- CoursePrerequisite
- AcademicYear
- Semester
- CourseOffering
- Instructor
- Room
- Schedule
- Enrollment
- Transcript
- TranscriptRequest
- GraduationAudit
- ProgramRequirement
- Certificate
- AcademicCalendarEvent
- Announcement
- Notification
- AuditLog

Do not create duplicate models if equivalent models already exist.

Use:

- Foreign keys
- Unique constraints
- Composite constraints
- Proper relations
- Indexes
- Appropriate enums

Use Prisma migrations.

==================================================
19. PERFORMANCE
==================================================

Design for thousands or hundreds of thousands of academic records.

Use:

- Server-side pagination
- Database filtering
- Proper indexes
- Selective Prisma select/include
- Efficient aggregation
- Avoid N+1 queries
- Transactions
- Query optimization
- Lazy loading
- Caching where appropriate

Do not load unnecessary relational data.

==================================================
20. CODE QUALITY
==================================================

Write code that is:

- Reusable
- Maintainable
- Type-safe
- Modular
- Testable
- Secure
- Optimized

Create reusable:

- Tables
- Forms
- Filters
- Modals
- Drawers
- Pagination
- Validation schemas
- API clients
- Services
- Error handlers

Avoid duplicated logic.

Do not create massive components containing everything.

==================================================
21. FRONTEND STATES
==================================================

Every page must properly handle:

Loading

Empty

Error

Success

Unauthorized

Forbidden

Not Found

Validation Error

Conflict

Use skeleton loading instead of blank screens.

==================================================
22. IMPORTANT IMPLEMENTATION RULE
==================================================

Do not stop at frontend implementation.

The following must work end-to-end:

Frontend

↓

Backend API

↓

Business Logic

↓

Prisma

↓

PostgreSQL

For example:

Approve Admission

must actually update PostgreSQL.

Create Course

must actually create a database record.

Enroll Student

must actually create an enrollment.

Create Timetable

must actually save the schedule.

Generate Transcript

must use real academic records.

Approve Graduation

must update the graduation record.

Issue Certificate

must create a real certificate record.

Publish Announcement

must create a real announcement.

Every dashboard statistic must come from real database data.

==================================================
23. DEVELOPMENT DATA
==================================================

Do not use frontend mock data.

If development data is needed, create:

prisma/seed.ts

Seed realistic relational data for:

- Students
- Programs
- Departments
- Courses
- Instructors
- Course offerings
- Enrollments
- Admissions
- Academic terms
- Calendar events
- Announcements

The frontend must retrieve seeded data through the real backend.

==================================================
24. REFACTOR EXISTING CODE
==================================================

Before writing code:

Inspect the existing implementation.

Identify:

- Existing components
- Existing API utilities
- Existing authentication
- Existing Prisma models
- Existing services
- Existing validation
- Existing database relationships
- Existing mock data

Reuse what is already correct.

Refactor only when necessary.

Do not rewrite the entire project unnecessarily.

==================================================
25. FINAL VERIFICATION
==================================================

After implementation:

Run TypeScript checks.

Run Prisma validation.

Run Prisma migrations.

Run database seed.

Run backend.

Run frontend.

Test all API endpoints.

Test authorization.

Test database operations.

Test forms.

Test search.

Test pagination.

Test filtering.

Test conflict detection.

Test PDF generation.

Test reports.

Test notifications.

Test audit logs.

Fix all TypeScript, Prisma, API, database, and frontend errors.

Do not consider the task complete while functionality is still powered by mock data.

FINAL PRIORITIES:

1. Correctness
2. Data integrity
3. Security
4. Performance
5. Maintainability
6. Reusability
7. Clean architecture
8. Excellent user experience

The final Registrar Dashboard must function as a real enterprise college administration system, not a frontend prototype.
```
