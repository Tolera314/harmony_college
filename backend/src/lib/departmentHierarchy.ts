import { prisma } from './prisma';

/**
 * Given a departmentId, resolve all related department IDs in the family hierarchy:
 * - If the department has a parent, returns [parentId, currentDeptId, ...siblingIds]
 * - If the department has children, returns [currentDeptId, ...childIds]
 * - Otherwise returns [currentDeptId]
 */
export async function resolveDepartmentFamilyIds(deptId: string): Promise<string[]> {
  if (!deptId) return [];

  const dept = await prisma.department.findUnique({
    where: { id: deptId },
    select: {
      id: true,
      parentId: true,
      children: { select: { id: true } },
    },
  });

  if (!dept) return [deptId];

  if (dept.parentId) {
    const parent = await prisma.department.findUnique({
      where: { id: dept.parentId },
      select: {
        id: true,
        children: { select: { id: true } },
      },
    });
    const siblingIds = parent?.children.map(c => c.id) ?? [];
    return Array.from(new Set([dept.parentId, deptId, ...siblingIds]));
  }

  const childIds = dept.children.map(c => c.id);
  return Array.from(new Set([deptId, ...childIds]));
}
