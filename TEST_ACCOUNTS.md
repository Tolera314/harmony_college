# Harmony College - Test Accounts

## Password (All Accounts)
```
Dev@HarmonyTest2025!
```

## Available Test Accounts (One Per Role)

| Role | Email | Full Name | Description |
|------|-------|-----------|-------------|
| **SUPER_ADMIN** | `superadmin@test.local` | System Administrator | Full system access |
| **ADMIN** | `admin@test.local` | Admin User | Administrative access |
| **REGISTRAR** | `registrar@test.local` | Robel Bekele | Student records, enrollment management |
| **FINANCE_OFFICER** | `finance@test.local` | Finance Officer | Financial transactions, payments |
| **HR_OFFICER** | `hr@test.local` | HR Officer | Human resources management |
| **DEPARTMENT_HEAD** | `departmenthead@test.local` | Department Head | Department management, leave approvals |
| **INSTRUCTOR** | `instructor@test.local` | Dr. Bekele Ayalew | Course instruction, grading |
| **STUDENT** | `student@test.local` | Alexander Sterling | Student portal access |

## How to Login

1. Navigate to: `http://localhost:3000/login`
2. Enter one of the emails above
3. Enter the password: `Dev@HarmonyTest2025!`
4. Click "Sign In"

## Seeding the Database

To reset and reseed the database with these accounts:

```bash
cd backend
npm run db:seed
```

## Notes

- These accounts are for **DEVELOPMENT/TESTING ONLY**
- Never use these credentials in production
- Each role has exactly one test account for easy testing
- All accounts are pre-verified and ready to use
