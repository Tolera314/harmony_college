/**
 * Staff Role Synchronization Service
 * 
 * Provides bidirectional synchronization between:
 * - User.role (auth/permissions layer)
 * - HREmployee.systemRole (HR management layer)
 * - InstructorRecord/DepartmentHeadRecord (academic layer)
 * 
 * Single source of truth: User.role
 * All changes propagate from User.role to other tables
 */

import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

export interface SyncResult {
  success: boolean;
  userId: string;
  syncedTables: string[];
  errors?: string[];
}

/**
 * Map HREmployee systemRole to User Role enum
 */
function mapSystemRoleToUserRole(systemRole: string): Role {
  const roleMap: Record<string, Role> = {
    'INSTRUCTOR': 'INSTRUCTOR',
    'DEPARTMENT_HEAD': 'DEPARTMENT_HEAD',
    'REGISTRAR': 'REGISTRAR',
    'FINANCE_OFFICER': 'FINANCE_OFFICER',
    'HR_OFFICER': 'HR_OFFICER',
    'ADMIN': 'ADMIN',
    'SUPER_ADMIN': 'SUPER_ADMIN',
    'STUDENT': 'STUDENT',
  };
  
  return roleMap[systemRole] || 'INSTRUCTOR'; // Default to INSTRUCTOR for unknown roles
}

/**
 * Internal sync function that accepts transaction
 */
async function syncUserRoleToAllInternal(
  userId: string,
  newRole: Role,
  departmentId?: string,
  db?: any
): Promise<SyncResult> {
  const tx = db || prisma;
  const syncedTables: string[] = [];
  const errors: string[] = [];

  try {
    // 1. Update User.role
    await tx.user.update({
      where: { id: userId },
      data: { role: newRole },
    });
    syncedTables.push('User');

    // 2. Update HREmployee.systemRole if exists
    const hrEmployee = await tx.hREmployee.findFirst({
      where: { userId },
    });

    if (hrEmployee) {
      await tx.hREmployee.update({
        where: { id: hrEmployee.id },
        data: {
          systemRole: newRole,
          status: 'ACTIVE',
        },
      });
      syncedTables.push('HREmployee');
    }

    // 3. Handle academic records based on role
    if (newRole === 'INSTRUCTOR') {
      // Create or activate InstructorRecord
      const deptId = departmentId || hrEmployee?.departmentId;
      if (deptId) {
        const existingInstructor = await tx.instructorRecord.findFirst({
          where: { userId },
        });

        if (existingInstructor) {
          await tx.instructorRecord.update({
            where: { id: existingInstructor.id },
            data: {
              isActive: true,
              departmentId: deptId,
            },
          });
        } else {
          // Generate employeeId from HREmployee or create one
          const employeeId = hrEmployee?.employeeId || `EMP-${userId.substring(0, 8).toUpperCase()}`;
          
          await tx.instructorRecord.create({
            data: {
              userId,
              employeeId,
              departmentId: deptId,
              isActive: true,
            },
          });
        }
        syncedTables.push('InstructorRecord');
      } else {
        errors.push('Cannot create InstructorRecord without departmentId');
      }

      // Deactivate any DepartmentHeadRecord
      await tx.departmentHeadRecord.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });
    } else if (newRole === 'DEPARTMENT_HEAD') {
      // Create or activate DepartmentHeadRecord
      const deptId = departmentId || hrEmployee?.departmentId;
      if (deptId) {
        // Check if department already has active HOD
        const existingHOD = await tx.departmentHeadRecord.findFirst({
          where: {
            departmentId: deptId,
            isActive: true,
            userId: { not: userId },
          },
        });

        if (existingHOD) {
          errors.push(`Department already has active HOD (userId: ${existingHOD.userId})`);
        } else {
          // Deactivate old HOD records for this user
          await tx.departmentHeadRecord.updateMany({
            where: { userId },
            data: { isActive: false },
          });

          // Create or activate new HOD record
          const existingDeptHead = await tx.departmentHeadRecord.findFirst({
            where: { userId, departmentId: deptId },
          });

          if (existingDeptHead) {
            await tx.departmentHeadRecord.update({
              where: { id: existingDeptHead.id },
              data: { isActive: true },
            });
          } else {
            // Generate employeeId from HREmployee or create one
            const employeeId = hrEmployee?.employeeId || `EMP-${userId.substring(0, 8).toUpperCase()}`;
            
            await tx.departmentHeadRecord.create({
              data: {
                userId,
                employeeId,
                departmentId: deptId,
                isActive: true,
              },
            });
          }
          syncedTables.push('DepartmentHeadRecord');
        }

        // Also maintain InstructorRecord (HODs are instructors)
        const existingInstructor = await tx.instructorRecord.findFirst({
          where: { userId },
        });

        if (existingInstructor) {
          await tx.instructorRecord.update({
            where: { id: existingInstructor.id },
            data: {
              isActive: true,
              departmentId: deptId,
            },
          });
        } else {
          // Generate employeeId from HREmployee or create one
          const employeeId = hrEmployee?.employeeId || `EMP-${userId.substring(0, 8).toUpperCase()}`;
          
          await tx.instructorRecord.create({
            data: {
              userId,
              employeeId,
              departmentId: deptId,
              isActive: true,
            },
          });
        }
        syncedTables.push('InstructorRecord');
      } else {
        errors.push('Cannot create DepartmentHeadRecord without departmentId');
      }
    } else {
      // For non-academic roles, deactivate academic records
      await tx.instructorRecord.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });

      await tx.departmentHeadRecord.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      });
    }

    return {
      success: errors.length === 0,
      userId,
      syncedTables,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('[staffRoleSync] Error syncing user role:', error);
    throw error; // Re-throw to rollback transaction
  }
}

/**
 * Sync User.role to all related tables (HREmployee, InstructorRecord, DepartmentHeadRecord)
 * This is the PRIMARY sync direction - User.role is source of truth
 */
export async function syncUserRoleToAll(
  userId: string,
  newRole: Role,
  departmentId?: string
): Promise<SyncResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      return await syncUserRoleToAllInternal(userId, newRole, departmentId, tx);
    });
  } catch (error) {
    console.error('[staffRoleSync] Error in transaction:', error);
    return {
      success: false,
      userId,
      syncedTables: [],
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Sync from HREmployee.systemRole to User.role and academic records
 * Used when HR changes an employee's role
 */
export async function syncHRRoleToUser(
  hrEmployeeId: string,
  newSystemRole: string,
  departmentId?: string,
  transaction?: any
): Promise<SyncResult> {
  const db = transaction || prisma;
  try {
    const hrEmployee = await db.hREmployee.findUnique({
      where: { id: hrEmployeeId },
      include: { user: true },
    });

    if (!hrEmployee) {
      return {
        success: false,
        userId: '',
        syncedTables: [],
        errors: ['HREmployee not found'],
      };
    }

    if (!hrEmployee.userId) {
      return {
        success: false,
        userId: '',
        syncedTables: [],
        errors: ['HREmployee not linked to User account'],
      };
    }

    const newRole = mapSystemRoleToUserRole(newSystemRole);
    const deptId = departmentId || hrEmployee.departmentId || undefined;

    return await syncUserRoleToAllInternal(hrEmployee.userId, newRole, deptId, db);
  } catch (error) {
    console.error('[staffRoleSync] Error syncing HR role to user:', error);
    return {
      success: false,
      userId: '',
      syncedTables: [],
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Sync department across all staff records
 */
export async function syncDepartment(
  userId: string,
  departmentId: string,
  transaction?: any
): Promise<SyncResult> {
  const db = transaction || prisma;
  const syncedTables: string[] = [];

  try {
    // Validate department exists
    const department = await db.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      throw new Error('Department not found');
    }

    // Update HREmployee
    const hrEmployee = await db.hREmployee.findFirst({
      where: { userId },
    });

    if (hrEmployee) {
      await db.hREmployee.update({
        where: { id: hrEmployee.id },
        data: { departmentId },
      });
      syncedTables.push('HREmployee');
    }

    // Update InstructorRecord
    await db.instructorRecord.updateMany({
      where: { userId, isActive: true },
      data: { departmentId },
    });
    syncedTables.push('InstructorRecord');

    // Update DepartmentHeadRecord
    await db.departmentHeadRecord.updateMany({
      where: { userId, isActive: true },
      data: { departmentId },
    });
    syncedTables.push('DepartmentHeadRecord');

    return {
      success: true,
      userId,
      syncedTables,
    };
  } catch (error) {
    console.error('[staffRoleSync] Error syncing department:', error);
    return {
      success: false,
      userId,
      syncedTables,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Force resync a staff member's role from User.role to all other tables
 * Used for emergency repairs of inconsistent data
 */
export async function forceResyncStaff(userId: string): Promise<SyncResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        hrEmployee: true,
      },
    });

    if (!user) {
      return {
        success: false,
        userId,
        syncedTables: [],
        errors: ['User not found'],
      };
    }

    const departmentId = user.hrEmployee?.departmentId || undefined;
    return await syncUserRoleToAll(userId, user.role, departmentId);
  } catch (error) {
    console.error('[staffRoleSync] Error force resyncing staff:', error);
    return {
      success: false,
      userId,
      syncedTables: [],
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Convenience function for syncing from User role (used by Registrar)
 * Syncs User.role to HREmployee.systemRole and creates/updates academic records
 */
export async function syncUserRoleToHR(
  userId: string,
  newRole: Role,
  transaction?: any,
  departmentId?: string
): Promise<SyncResult> {
  const db = transaction || prisma;
  
  try {
    return await syncUserRoleToAllInternal(userId, newRole, departmentId, db);
  } catch (error) {
    console.error('[staffRoleSync] Error syncing user role to HR:', error);
    return {
      success: false,
      userId,
      syncedTables: [],
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
