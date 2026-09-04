You are a **senior full-stack/backend architect** with extensive experience building secure, scalable HR management systems.

I already have an **HR (Human Resources) frontend application**. The frontend is currently using **mock/static/demo data**.

Your task is to analyze the existing frontend and **build a complete production-ready backend that replaces all mock data with real persistent data**, while keeping the existing frontend UI/UX and functionality working.

Do NOT simply create a basic CRUD API. Think like a professional HR software engineer and implement proper architecture, validation, security, relationships, permissions, error handling, and data integrity.

---

## 1. FIRST: Analyze the Existing Frontend

Before writing backend code:

1. Inspect the entire frontend.
2. Identify:

   * All pages
   * Components
   * Forms
   * Tables
   * Dashboard statistics
   * Filters
   * Search functionality
   * Pagination
   * Sorting
   * Modals
   * CRUD operations
   * Mock data
   * Hardcoded values
   * Existing types/interfaces
   * Existing API/service functions
   * Authentication-related UI
   * User roles and permissions
3. Determine exactly what data the frontend expects.
4. Identify all entities and relationships.
5. Identify every place where mock data is currently being used.

Create a clear internal plan before implementation.

**Important:** Do not redesign the frontend unless absolutely necessary. The goal is to connect the existing frontend to a real backend.

---

# 2. Design the HR Database

Create a proper relational database schema based on the actual frontend requirements.

At minimum, consider entities such as:
* dashboard
* Employees
* leave management
* Onboarding
* Performance
* Documents
* Payroll
* Salary History
* Reports
* Notifications
* Audit Logs

Do NOT blindly create every entity above.

Only implement entities that are actually required by the existing application, but design the architecture so it can be extended later.

Define:

* Primary keys
* Foreign keys
* Unique constraints
* Required/optional fields
* Default values
* Enum values
* Indexes
* Relationships
* Created/updated timestamps
* Soft deletion where appropriate

Use proper normalization and avoid duplicated data.

---

# 3. Employee Data

Employee records should support realistic HR information such as:

* Employee ID
* First name
* Middle name
* Last name
* Email
* Phone
* Date of birth
* Gender
* Address
* Emergency contact
* Hire date
* Employment status
* Department
* Position
* Manager
* Employment type
* Salary information where appropriate
* Profile photo
* Documents
* Notes
* Created date
* Updated date

Do not store sensitive information unnecessarily.

Use appropriate database types and constraints.

Employee IDs must be unique.

Emails must be properly validated and unique where appropriate.

---

# 4. Authentication & Authorization

Implement real authentication.

Requirements:

* Secure login
* Password hashing using a strong password hashing algorithm such as Argon2 or bcrypt
* Secure session/token handling
* Logout
* Authentication middleware
* Protected API routes
* Role-based access control

Possible roles may include:

* Super Admin
* HR Admin
* HR Manager
* Manager
* Employee

Do not assume all users can access all HR data.

Implement authorization at the backend level, not only in the frontend.

For example:

* Employees should only access their own sensitive information.
* Managers should only access employees they are authorized to manage.
* HR users may manage employee records.
* Admins may manage system-level settings.

Never trust role information sent by the frontend.

---

# 5. Validation

Implement **server-side validation for every input**.

Do not rely on frontend validation.

Validate:

* Required fields
* Email format
* Phone format
* Dates
* Date ranges
* Numeric values
* Salary values
* IDs
* Enum values
* String lengths
* File types where applicable
* File sizes where applicable
* Duplicate records
* Relationships

Examples:

* Hire date cannot be invalid.
* Leave end date cannot be before leave start date.
* Salary cannot be negative.
* Email must have a valid format.
* Employee ID must be unique.
* Department must exist before assigning it to an employee.
* A deleted/nonexistent employee cannot receive attendance or leave records.

Return clear validation errors.

---

# 6. API Design

Create a clean RESTful API or follow the existing architecture if the frontend already expects another API style.

Use consistent endpoints such as:

GET    /api/employees
GET    /api/employees/:id
POST   /api/employees
PUT/PATCH /api/employees/:id
DELETE /api/employees/:id

Similarly create appropriate endpoints for:

* Departments
* Positions
* Users
* Attendance
* Leave
* Payroll
* Performance
* Documents
* Notifications
* Reports
* Dashboard statistics

Use appropriate HTTP status codes:

* 200 — successful request
* 201 — created
* 204 — successful deletion where appropriate
* 400 — bad request
* 401 — unauthenticated
* 403 — unauthorized
* 404 — not found
* 409 — conflict
* 422 — validation error
* 500 — server error

Use a consistent API response structure.

Example:

{
"success": true,
"data": {},
"message": "Employee created successfully"
}

For errors:

{
"success": false,
"message": "Validation failed",
"errors": {
"email": "Invalid email address"
}
}

---

# 7. Replace Mock Data

This is one of the most important requirements.

Find every mock-data source in the frontend.

Replace:

* Hardcoded employee arrays
* Fake dashboard statistics
* Fake attendance records
* Fake leave records
* Fake payroll data
* Fake department lists
* Fake notifications
* Fake performance records
* Fake charts

with real API/database queries.

The frontend should load data from the backend.

After implementation, there should be **no dependency on mock HR data for normal application functionality**.

Do not simply hide the mock data.

Actually remove the dependency.

---

# 8. Dashboard

Make dashboard statistics dynamic.

For example:

* Total employees
* Active employees
* Inactive employees
* Employees by department
* Employees by employment status
* Attendance statistics
* Leave statistics
* Pending leave requests
* Payroll statistics if applicable
* Recent employees
* Recent activities
* Upcoming birthdays
* Upcoming events

Every statistic should be calculated from real database data.

Do not hardcode dashboard numbers.

---

# 9. Search, Filtering, Sorting & Pagination

Implement backend support for:

* Search
* Filtering
* Sorting
* Pagination

For example:

GET /api/employees?page=1&limit=20&search=john&department=engineering&status=active

Do not retrieve thousands of records and filter everything in the frontend.

Perform filtering and pagination at the database/API level.

Return metadata such as:

{
"data": [],
"pagination": {
"page": 1,
"limit": 20,
"total": 150,
"totalPages": 8
}
}

---

# 10. Security

Treat this as a real HR application because HR systems contain sensitive employee information.

Implement:

* Password hashing
* Authentication
* Authorization
* Input validation
* SQL injection protection
* XSS protection where applicable
* CSRF protection where applicable
* Rate limiting
* Secure headers
* CORS configuration
* Secure cookies/tokens
* Environment variables for secrets
* No passwords/secrets in source code
* No sensitive information in logs
* Proper error handling without exposing internal database details

Never return passwords or password hashes to the frontend.

Never trust IDs, roles, permissions, or user information coming from the client.

---

# 11. Database Integrity

Ensure that invalid relationships cannot be created.

Examples:

An employee cannot belong to a department that does not exist.

A leave request cannot belong to a nonexistent employee.

Attendance cannot belong to a nonexistent employee.

Deleting related records should use appropriate behavior such as:

* Restrict
* Cascade
* Soft delete

depending on the entity and business requirements.

Avoid accidental data loss.

---

# 12. Audit Logging

Because this is an HR system, implement audit logging for important actions.

Track events such as:

* Employee created
* Employee updated
* Employee deleted
* Employee status changed
* Leave approved/rejected
* Salary changed
* User created
* Role changed
* Important documents uploaded/deleted

Audit logs should include information such as:

* Actor/user
* Action
* Entity
* Entity ID
* Timestamp
* Relevant metadata where appropriate

Do not log passwords, tokens, or sensitive secrets.

---

# 13. File Uploads

If the frontend supports employee profile pictures or documents:

Implement secure file uploads.

Validate:

* File extension
* MIME type
* File size
* Filename
* Storage location

Do not trust the filename or MIME type supplied by the client.

Use cloud/object storage if the existing architecture supports it.

Keep storage credentials in environment variables.

---

# 14. Transactions

Use database transactions for operations that modify multiple related records.

For example:

Creating an employee and associated records should not leave the database in a partially-created state if one operation fails.

Leave approval/rejection and other multi-step HR operations should maintain data consistency.

---

# 15. Error Handling

Create centralized error handling.

Do not expose errors such as:

* Database connection strings
* SQL queries
* Stack traces
* Internal filesystem paths
* Authentication secrets

Use useful messages for users while keeping detailed technical errors in server-side logs.

---

# 16. Environment Configuration

Use environment variables for:

* Database URL
* Authentication secrets
* JWT/session secrets
* Cloud storage credentials
* Email credentials
* API keys
* Application URL
* CORS configuration

Provide a `.env.example`.

Never commit real credentials.

---

# 17. Seed Data

Create a database seed script with realistic development data.

Include:

* Admin account
* HR account
* Manager account
* Employee accounts
* Departments
* Positions
* Example attendance records
* Example leave requests
* Other required records

Clearly document the development login credentials.

Do not use weak/default credentials in production.

---

# 18. Database Migrations

Use proper migrations.

The database should be reproducible from a clean installation.

Provide:

* Initial migration
* Schema changes through migrations
* Seed script
* Database setup instructions

Do not manually modify production databases without migrations.

---

# 19. Frontend Integration

Connect the existing frontend to the backend.

Update:

* API service layer
* Types/interfaces
* Authentication handling
* Loading states
* Error states
* Empty states
* CRUD operations
* Forms
* Tables
* Dashboard
* Search
* Filters
* Pagination

Preserve the existing design.

Do not unnecessarily change the UI.

When API calls are loading, show the existing/loading UI appropriately.

When requests fail, display useful errors.

---

# 20. Type Safety

If the project uses TypeScript:

Maintain strong type safety between frontend and backend.

Avoid:

* `any`
* duplicated incompatible interfaces
* unsafe type casting
* unvalidated request bodies

Create shared or clearly synchronized types where appropriate.

---

# 21. Performance

Build the backend with scalability in mind.

Use:

* Database indexes
* Efficient queries
* Pagination
* Selective field retrieval
* Proper joins/relations
* Caching where genuinely useful
* Connection pooling where appropriate

Avoid N+1 queries.

Do not fetch unnecessary data.

---

# 22. Testing

Add backend tests for important functionality.

At minimum test:

* Authentication
* Authorization
* Employee creation
* Employee update
* Employee deletion
* Validation
* Duplicate employee/email handling
* Leave creation
* Leave approval/rejection
* Unauthorized access
* Invalid IDs
* Pagination
* Search/filtering

Also test important frontend-to-backend integration points.

---

# 23. Documentation

Create clear documentation explaining:

* Project architecture
* Database schema
* Environment variables
* Installation
* Database setup
* Migrations
* Seed process
* Running backend
* Running frontend
* API endpoints
* Authentication
* Roles/permissions
* Testing

Create or update:

`README.md`

and, if useful:

`API_DOCUMENTATION.md`

---

# 24. Important Implementation Rules

Follow these rules strictly:

1. **Do not destroy existing frontend functionality.**
2. **Do not redesign the frontend unnecessarily.**
3. **Do not use mock data as a substitute for backend functionality.**
4. **Do not hardcode database values that should be dynamic.**
5. **Do not trust frontend validation.**
6. **Do not trust frontend authorization.**
7. **Do not expose secrets.**
8. **Do not return passwords or password hashes.**
9. **Do not create unnecessary database entities.**
10. **Do not introduce unnecessary dependencies.**
11. **Follow the existing project's technology choices whenever possible.**
12. **Use production-quality code rather than a quick prototype.**

---

# 25. Implementation Process

Work in this order:

### Phase 1 — Analyze

Understand the existing frontend, mock data, entities, forms, pages, and workflows.

### Phase 2 — Architecture

Design the backend architecture and database schema.

### Phase 3 — Database

Implement schema, migrations, indexes, constraints, and seed data.

### Phase 4 — Authentication

Implement authentication, sessions/tokens, roles, and authorization.

### Phase 5 — API

Implement validated CRUD APIs and business logic.

### Phase 6 — Frontend Integration

Replace mock data with real API calls.

### Phase 7 — Security

Review authorization, validation, secrets, file uploads, rate limiting, and other security concerns.

### Phase 8 — Testing

Test the complete system and fix integration problems.

### Phase 9 — Documentation

Document setup, API, database, environment variables, and development workflow.

---

# Final Requirement

Before considering the task complete, verify the application as a real HR management system.

For every major frontend feature, ask:

> "Is this using real persistent database data, or is there still mock/hardcoded data?"

If it is mock data, replace it.

For every API endpoint, ask:

> "Can an unauthorized user manipulate this data?"

If yes, fix the authorization.

For every form, ask:

> "What happens if the user sends malicious, invalid, duplicate, missing, or unexpected data?"

If the backend cannot safely handle it, add validation and error handling.

For every database relationship, ask:

> "Can invalid or orphaned records be created?"

If yes, enforce the relationship at both application and database levels.

Do not stop after creating the backend.

**Run the complete application, connect frontend + backend + database, test the main workflows, identify errors, and fix them.**

The final result should be a **real, secure, validated, persistent HR management application**, not a frontend demo with an API attached to it.
