# Professional Prompt: Internal Messaging System for College Management System

Design and implement a **secure, professional, scalable, and real-time Internal Messaging System** for the existing **College Management System**.

Before implementation, carefully analyze and reuse the existing project architecture, authentication system, Role-Based Access Control (RBAC), dashboards, sidebar navigation, header notification bell, notification system, audit logs, departments, employee records, and other existing modules.

The Internal Messaging System must be designed specifically for the following system roles:

```text
SUPER_ADMIN
ADMIN
REGISTRAR
FINANCE_OFFICER
HR_OFFICER
DEPARTMENT_HEAD
INSTRUCTOR
STUDENT
```

## 1. Main Rule: Who Can Use Internal Messaging

The Internal Messaging System is an **employee/staff communication system**.

The following roles can access the system according to their permissions:

* `SUPER_ADMIN`
* `ADMIN`
* `REGISTRAR`
* `FINANCE_OFFICER`
* `HR_OFFICER`
* `DEPARTMENT_HEAD`
* `INSTRUCTOR`

The following role must **not have access** to the employee Internal Messaging System:

* `STUDENT`

Students must not:

* See the Internal Messages menu or sidebar item.
* Search or view employees through this messaging system.
* Send internal employee messages.
* Join employee group conversations.
* Access employee message APIs.
* Access employee message attachments.
* Receive employee internal message notifications.

Do not mix student communication with the employee Internal Messaging System. If student messaging is required in the future, it must be implemented as a separate communication module with its own permissions and rules.

---

# 2. Role-Based Communication Structure

Use the existing RBAC system and do not rely only on frontend restrictions.

Every messaging action must be authorized on the backend.

The system must determine:

* Who can send messages.
* Who can receive messages.
* Who can create groups.
* Who can manage group members.
* Who can send official messages.
* Who can send messages across departments.
* Who can access message management functions.

## SUPER_ADMIN

The `SUPER_ADMIN` has the highest-level system management authority.

Depending on institutional policy and permissions, the Super Admin can:

* Manage Internal Messaging configuration.
* Manage messaging permissions.
* Manage official system-wide communication.
* Create or manage institutional groups.
* Review messaging-related audit events.
* Configure retention and security policies.
* Manage messaging access for roles.

The `SUPER_ADMIN` must not automatically browse private employee message content unless the system's institutional policy explicitly permits exceptional access. Any privileged access must be strictly controlled and fully audited.

---

## ADMIN

The `ADMIN` supports institutional administration and system operations according to assigned permissions.

The Admin may:

* Communicate with authorized employees.
* Create authorized groups.
* Send official messages when permitted.
* Communicate across departments where authorized.
* Manage selected messaging operations.
* Access messaging-related administrative features based on permissions.

The Admin must not automatically receive unrestricted access to all private conversations.

---

## REGISTRAR

The `REGISTRAR` can communicate with authorized employees regarding academic and administrative processes.

Typical communication may involve:

* Student records.
* Admissions coordination.
* Course enrollment.
* Course catalog.
* Course offerings.
* Class timetable.
* Academic calendar.
* Graduation auditing.
* Transcript processing.
* Digital certificates.
* Department coordination.
* Finance clearance coordination.

The Registrar should be able to communicate with relevant authorized roles such as:

* `SUPER_ADMIN`
* `ADMIN`
* `FINANCE_OFFICER`
* `HR_OFFICER` when necessary
* `DEPARTMENT_HEAD`
* `INSTRUCTOR`

Communication access must still follow configurable permissions.

---

## FINANCE_OFFICER

The `FINANCE_OFFICER` can communicate with authorized employees regarding institutional financial processes.

Typical communication may involve:

* Registration clearance.
* Student financial status coordination.
* Payment verification.
* Fee-related administrative processes.
* Financial reporting coordination.
* Registrar coordination.

The Finance Officer should communicate only with employees authorized for the relevant workflow.

Possible authorized communication includes:

* `SUPER_ADMIN`
* `ADMIN`
* `REGISTRAR`
* `HR_OFFICER` where appropriate
* `DEPARTMENT_HEAD` where appropriate

Do not expose unnecessary financial or sensitive student information through message previews or notifications.

---

## HR_OFFICER

The `HR_OFFICER` can communicate with authorized employees regarding employee and institutional human resource processes.

Typical communication may involve:

* Employee administration.
* Staff records.
* Employment coordination.
* Department staffing coordination.
* Institutional notices.

Communication must respect confidentiality and role permissions.

Possible authorized communication includes:

* `SUPER_ADMIN`
* `ADMIN`
* `DEPARTMENT_HEAD`
* `INSTRUCTOR`
* Other authorized staff where appropriate

Sensitive HR information must receive additional protection.

---

## DEPARTMENT_HEAD

The `DEPARTMENT_HEAD` manages communication within and across the academic department according to permissions.

The Department Head should be able to communicate with:

* Instructors in their department.
* Registrar.
* Admin.
* Super Admin when necessary.
* Finance Officer when required for authorized workflows.
* HR Officer for authorized staff-related processes.
* Other Department Heads when permitted.

The Department Head should be able to create or manage official department groups if authorized.

Example:

**Computer Science Department Staff**

Members may include:

* Department Head
* Authorized Instructors belonging to the department

Department membership must be validated using the existing department and employee assignment data.

---

## INSTRUCTOR

The `INSTRUCTOR` can communicate with authorized employees for academic and institutional work.

Typical communication may involve:

* Department coordination.
* Course-related coordination.
* Class timetable issues.
* Attendance-related administrative communication.
* Course offering coordination.
* Registrar requests.
* Academic announcements to staff.

An Instructor should normally communicate with:

* Their `DEPARTMENT_HEAD`.
* Other authorized instructors.
* `REGISTRAR` when required.
* `ADMIN` or `SUPER_ADMIN` when authorized.
* Other roles only when permitted by the communication policy.

Instructors must not automatically gain access to confidential Finance or HR conversations.

---

# 3. Communication Policy

Do not hardcode a simplistic rule such as:

> Every employee can message every other employee without restriction.

Instead, create a flexible and configurable **communication authorization layer**.

The system should support:

```text
Role Permission
        +
Department Relationship
        +
Institutional Policy
        +
Conversation Membership
```

Before a message is sent, the system must verify:

1. The sender is authenticated.
2. The sender is an active employee.
3. The sender is not a `STUDENT`.
4. The recipient is an authorized active employee.
5. The sender has permission to contact the recipient.
6. The conversation exists and is valid.
7. The sender is a member of the conversation.

---

# 4. Messaging Types

Implement the following messaging types.

## A. Direct Messages

Allow authorized one-to-one communication between employees.

Features:

* Send messages.
* Receive messages in real time.
* Reply to messages.
* Read/unread status.
* Message timestamps.
* Message search.
* Attachment support when authorized.
* Archive and pin conversations.

Example:

```text
REGISTRAR ↔ DEPARTMENT_HEAD
DEPARTMENT_HEAD ↔ INSTRUCTOR
REGISTRAR ↔ FINANCE_OFFICER
HR_OFFICER ↔ ADMIN
```

All direct messaging relationships must pass authorization rules.

---

## B. Group Conversations

Allow authorized employees to create group conversations.

Examples:

### Registrar Office Coordination

```text
REGISTRAR
ADMIN
Authorized staff
```

### Department Staff Group

```text
DEPARTMENT_HEAD
INSTRUCTOR(s)
```

### Academic Coordination Group

```text
REGISTRAR
DEPARTMENT_HEAD(s)
Authorized ADMIN
```

Group features must include:

* Group name.
* Description.
* Creator.
* Participants.
* Group administrators.
* Add members.
* Remove members.
* Leave group where permitted.
* Group message history.
* Group unread count.
* Group notifications.

Only authorized users can manage group membership.

---

## C. Department Conversations

Support official department communication.

Department groups should use existing department information rather than manually duplicating department structures.

Example:

```text
Department
    │
    ├── DEPARTMENT_HEAD
    └── INSTRUCTOR(s)
```

When an instructor:

* Changes departments,
* Becomes inactive,
* Loses the instructor role,

their department messaging access must be updated correctly.

Do not automatically delete historical institutional communication.

---

## D. Official Internal Messages

Authorized roles should be able to send official internal messages to selected employees.

Depending on permissions, the audience may include:

* All employees except students.
* Specific roles.
* Specific departments.
* Selected employees.

Possible senders include authorized:

* `SUPER_ADMIN`
* `ADMIN`

Other roles may receive official broadcast permissions only when explicitly configured.

Official messages should support:

* Priority.
* Target audience.
* Required acknowledgment.
* Expiration date.
* Read tracking.

Priority levels:

```text
NORMAL
IMPORTANT
URGENT
```

Clearly distinguish official messages from ordinary conversations.

---

# 5. Sidebar and Header Integration

Integrate Internal Messaging into the existing dashboard structure.

For eligible employee roles, add:

```text
Internal Messages
```

to the appropriate sidebar.

Do not show this feature to:

```text
STUDENT
```

The sidebar item should display:

* Unread conversation count.
* Badge for new messages where appropriate.

Also integrate with the existing header notification bell.

When a new internal message arrives:

* Update the Internal Messages unread count.
* Create a notification when appropriate.
* Avoid duplicate or excessive notifications.
* Clicking the notification should open the relevant conversation.

The existing notification system and Internal Messaging System must work together rather than creating two disconnected notification mechanisms.

---

# 6. Internal Messaging User Interface

Design a professional interface suitable for a real-world college administration system.

## Left Conversation Panel

Include:

* New Message button.
* Search conversations.
* Conversation list.
* Direct message indicator.
* Group indicator.
* Official message indicator.
* Unread count.
* Latest message preview.
* Latest message time.
* Pinned conversations.
* Archived conversations.

## Main Message Panel

Include:

* Conversation title.
* Participant information.
* Message history.
* Date separators.
* Timestamps.
* Reply functionality.
* Message input.
* Send button.
* Attachment button when authorized.
* Loading states.
* Error states.

## Conversation Information Panel

Where appropriate, show:

* Participant name.
* Role.
* Department.
* Group members.
* Shared files.
* Conversation settings.

Do not expose unnecessary employee information.

---

# 7. Real-Time Messaging

Implement reliable real-time messaging.

Use an appropriate real-time architecture such as:

* WebSockets.
* Socket.IO.
* Another scalable real-time solution compatible with the existing system.

Support:

* Instant message delivery.
* Real-time conversation updates.
* Real-time unread count updates.
* New message notifications.
* Read synchronization.
* Multiple browser sessions.
* Reconnection after network interruption.

If a recipient is offline:

1. Store the message securely.
2. Preserve the correct message state.
3. Deliver the message when the user reconnects.
4. Update unread status correctly.

Messages must never disappear because of a temporary connection failure.

---

# 8. Message Status

Support reliable message states:

```text
SENT
DELIVERED
READ
FAILED
```

Expected flow:

```text
SENT
  ↓
DELIVERED
  ↓
READ
```

Do not falsely mark a message as delivered or read.

For group conversations, use a scalable design for read tracking.

Avoid excessive database writes for large groups.

---

# 9. Unread Message Management

Unread message management must be accurate.

Support:

* Unread count per conversation.
* Total unread Internal Messages count.
* Sidebar badge.
* Real-time updates.
* Mark as read.
* Mark as unread manually where supported.

A message should not automatically be marked as read simply because the application is open.

Unread status must remain accurate after:

* Page refresh.
* Logout and login.
* Network interruption.
* Multiple devices.
* Multiple browser tabs.

---

# 10. Employee Search and Recipient Selection

The New Message interface should allow authorized employees to search for recipients.

Search may include:

* Employee name.
* Employee ID where appropriate.
* Role.
* Department.

The search results must only display employees whom the current user is authorized to contact.

Never expose:

* Students.
* Inactive employees.
* Unauthorized employee records.

Display only necessary information:

* Name.
* Role.
* Department.
* Profile image if supported.

---

# 11. Attachments

Allow authorized employees to send internal work-related files.

Examples:

* PDF.
* DOCX.
* XLSX.
* Approved images.

Security requirements:

* Validate file type.
* Validate MIME type.
* Validate file size.
* Generate secure storage names.
* Reject executable and dangerous files.
* Apply malware scanning where infrastructure supports it.
* Store files securely.
* Require authorization before download.

Attachments must not be publicly accessible through predictable URLs.

Before downloading an attachment, verify:

1. The user is authenticated.
2. The user is authorized.
3. The user belongs to the relevant conversation.

---

# 12. Message Editing and Deletion

Support configurable message policies.

## Editing

Allow employees to edit their own messages within a configured time period.

Display:

```text
Edited
```

when applicable.

Maintain audit metadata such as:

* Original creation time.
* Last edit time.
* Editor ID.

## Delete for Self

Allow users to remove messages from their own view where supported.

## Administrative Deletion

Administrative message removal must be:

* Permission controlled.
* Rare and justified.
* Fully audited.

Do not silently erase institutional records without considering retention policy.

---

# 13. Conversation Management

Employees should be able to:

* Pin conversations.
* Archive conversations.
* Mute conversations.
* Search conversations.
* Search messages.
* Mark conversations as unread.
* Leave authorized groups.

Archiving must not permanently delete conversation data.

Muted conversations should suppress unnecessary alerts according to user preferences.

---

# 14. Security and Access Control

Security must be enforced on the backend.

## Authentication

Every user must be authenticated.

## Role Validation

Verify the user's current role from the server-side data.

Do not trust role information sent by the frontend.

## Student Protection

Before every Internal Messaging action, verify that the user is not:

```text
STUDENT
```

Students must receive an authorization error if they attempt to access the system through direct URLs or API manipulation.

## Conversation Membership

Before allowing a user to:

* View messages.
* Send a message.
* Edit a message.
* Delete a message.
* Download an attachment.

verify that the user is an authorized participant.

## Additional Security

Implement:

* HTTPS/TLS.
* Input validation.
* Output escaping.
* XSS protection.
* CSRF protection where applicable.
* Rate limiting.
* Secure database queries.
* Secure file access.
* Proper session or token validation.

Do not expose confidential message content in:

* URLs.
* Error messages.
* Application logs.
* Analytics.
* Unnecessary notification previews.

---

# 15. Sensitive Information Handling

Because different roles handle sensitive information, the system must provide additional protection.

## Finance

Messages may involve sensitive financial coordination.

Do not expose detailed financial information in public areas or unnecessary notifications.

## HR

HR communication may involve confidential employee information.

Restrict access strictly.

## Registrar

Registrar communication may involve sensitive academic and student-related administrative processes.

Use secure references to authorized system records where possible instead of copying excessive sensitive information into messages.

---

# 16. Integration With Existing College Modules

The Internal Messaging System should integrate with existing modules already discussed in the College Management System.

These include:

* Dashboard
* Student Records
* Admission
* Course Enrollments
* Course Catalog
* Course Offerings
* Audit Logs
* Announcements
* Academic Calendar
* Interactive Reports
* Digital Certificate
* Graduation Auditing
* Transcript
* Class Timetable
* Attendance
* Notification System

## Important Integration Principle

Internal Messaging should not duplicate these modules.

Instead, where appropriate, messages may reference authorized records.

For example:

```text
Class Timetable Updated
→ Open Timetable
```

or:

```text
Enrollment Requires Review
→ Open Course Enrollment
```

Before opening a linked record, the system must independently verify that the recipient has permission to access that module and record.

A message link must never bypass RBAC.

---

# 17. Notification Integration

Integrate with the existing internal Notification System.

Message events may generate notifications such as:

```text
New message from Registrar
```

or:

```text
New message in Computer Science Department Staff Group
```

However, avoid notification spam.

Do not create unnecessary notifications when:

* The user is actively viewing the conversation.
* Multiple messages arrive rapidly and can be grouped.
* The conversation is muted.

Support notification preferences where appropriate.

---

# 18. Audit Logs

Integrate important actions with the existing Audit Logs module.

Audit events may include:

* Conversation created.
* Group created.
* Group updated.
* Participant added.
* Participant removed.
* Official message sent.
* Messaging permission changed.
* Attachment uploaded.
* Attachment access denied.
* Administrative message action.
* Suspicious unauthorized access attempt.

Do not unnecessarily store the complete private message content inside audit logs.

Audit records should capture:

* Who performed the action.
* What action occurred.
* When it occurred.
* Relevant resource.
* Result of the action.

Audit Log access must itself be permission controlled.

---

# 19. Database Design

Use a scalable database structure.

Suggested entities include:

## Conversation

```text
id
type
name
description
created_by
created_at
updated_at
last_message_at
status
```

Conversation types may include:

```text
DIRECT
GROUP
DEPARTMENT
OFFICIAL
```

## Conversation Participant

```text
id
conversation_id
user_id
participant_role
joined_at
left_at
last_read_message_id
is_muted
is_archived
```

## Message

```text
id
conversation_id
sender_id
content
message_type
reply_to_message_id
created_at
edited_at
deleted_at
```

## Message Attachment

```text
id
message_id
original_file_name
stored_file_name
mime_type
file_size
storage_path
uploaded_at
```

Reuse the existing User, Employee, Role, Department, Notification, and Audit Log structures where possible.

Do not duplicate user or role data unnecessarily.

---

# 20. Employee Status Changes

The messaging system must correctly handle users who become:

* Inactive.
* Suspended.
* Terminated.
* Removed from a role.
* Transferred to another department.

Recommended behavior:

* Prevent inactive employees from sending new messages.
* Prevent new messages from being sent to users who are no longer eligible, according to institutional policy.
* Update department group membership where appropriate.
* Preserve historical conversations according to retention rules.
* Do not destroy institutional records unnecessarily.

---

# 21. Error Handling and Reliability

The system must handle:

* Network interruption.
* Duplicate submissions.
* Double clicking the Send button.
* Real-time connection failure.
* Server errors.
* Unauthorized access.
* Attachment upload failure.
* Deleted or inactive users.
* Changed conversation membership.

Use idempotency or client-generated temporary message identifiers where appropriate to prevent duplicate messages.

Provide clear errors such as:

```text
Message could not be sent. Please try again.
```

Do not expose technical server information to end users.

---

# 22. Performance and Scalability

The system must be efficient for real-world college usage.

Implement:

* Message pagination.
* Cursor-based pagination where appropriate.
* Efficient unread count queries.
* Database indexes.
* Efficient latest-message retrieval.
* Background jobs for expensive tasks.
* Queues for notifications and file processing where appropriate.
* Scalable real-time connections.

Avoid:

* Loading all messages at once.
* Excessive polling.
* N+1 database queries.
* Excessive read-receipt database writes.
* Recalculating all unread messages unnecessarily.

---

# 23. Required API Security

Design secure APIs such as:

```text
GET    /internal-messages/conversations
POST   /internal-messages/conversations

GET    /internal-messages/conversations/{id}
GET    /internal-messages/conversations/{id}/messages
POST   /internal-messages/conversations/{id}/messages

PATCH  /internal-messages/messages/{id}
DELETE /internal-messages/messages/{id}

POST   /internal-messages/conversations/{id}/participants
DELETE /internal-messages/conversations/{id}/participants/{userId}
```

Every endpoint must verify:

1. Authentication.
2. User role.
3. User is not `STUDENT`.
4. Messaging permission.
5. Conversation membership.
6. Resource ownership where applicable.
7. Input validation.

Never trust the frontend to enforce access restrictions.

---

# 24. Administrator Configuration

Authorized `SUPER_ADMIN` and permitted `ADMIN` users should be able to manage messaging configuration according to RBAC.

Configuration may include:

* Role-to-role communication permissions.
* Department communication policies.
* Group creation permissions.
* Official broadcast permissions.
* Attachment file limits.
* Allowed file types.
* Message retention policies.
* Notification behavior.

Do not hardcode institutional communication rules that may change.

---

# 25. Final Implementation Requirements

Build the Internal Messaging System as a **professional, secure, role-aware, real-time communication module** specifically for this College Management System.

The final implementation must:

### Eligible Roles

Allow access only to authorized:

```text
SUPER_ADMIN
ADMIN
REGISTRAR
FINANCE_OFFICER
HR_OFFICER
DEPARTMENT_HEAD
INSTRUCTOR
```

### Restricted Role

Completely exclude:

```text
STUDENT
```

from the employee Internal Messaging System.

### Core Features

The system must provide:

* Direct employee messaging.
* Authorized group messaging.
* Department communication.
* Official internal messages.
* Real-time communication.
* Accurate unread counts.
* Read and delivery states.
* Secure attachments.
* Conversation search.
* Message search.
* Archive and pin functionality.
* Role-based recipient selection.
* Notification integration.
* Audit log integration.
* Strong backend authorization.
* Scalable performance.
* Reliable error handling.
* Responsive and professional UI.

Most importantly, **reuse the existing College Management System architecture and modules**.

Do not create duplicate authentication, role, notification, department, employee, or audit systems.

The Internal Messaging System must work naturally across the existing dashboards and workflows while respecting the exact roles:

```text
SUPER_ADMIN
ADMIN
REGISTRAR
FINANCE_OFFICER
HR_OFFICER
DEPARTMENT_HEAD
INSTRUCTOR
STUDENT
```

The final result should behave like a **real-world professional internal communication system for college employees**, while keeping students completely separated from confidential employee communication.
