import { prisma } from './prisma';

export const REAL_DEPARTMENTS = [
  { name: 'Photography & Videography', code: 'PHOTO', description: 'Photography, Videography & Visual Storytelling' },
  { name: 'Theatrical Art & Filmmaking', code: 'FILM', description: 'Theatre, Acting, Directing & Filmmaking' },
  { name: 'Music Instruments & Vocal', code: 'MUSIC', description: 'Instrumental Performance & Vocal Arts' },
  { name: 'Cubase Music Production', code: 'CUBASE', description: 'Digital Audio Workstation & Music Production' },
  { name: 'Graphic Design', code: 'DESIGN', description: 'Visual Identity, Typography & Digital Design' },
  { name: 'Digital Marketing', code: 'MKT', description: 'Social Media, Brand Strategy & Digital Marketing' },
  { name: 'Journalism', code: 'JOUR', description: 'News Reporting, Broadcast & Investigative Journalism' },
  { name: 'Information Technology (IT)', code: 'IT', description: 'IT, Networking, Software & Digital Systems' },
  { name: 'Languages', code: 'LANG', description: 'International Languages, Translation & Communication' },
  { name: 'Pharmacy', code: 'PHARM', description: 'Pharmaceutical Sciences, Drug Dispensing & Clinical Practice' },
];

const FAKE_DEPARTMENT_NAMES = [
  'Computer Science',
  'Mathematics',
  'Business Administration',
  'English Language',
  'Computer Science Test Dept',
  'Updated Dept D484',
  'Engineering',
  'Business',
  'Media, Communication & Languages',
  'Photography & Visual Media',
  'Music & Performing Arts',
  'Design & Digital Marketing',
  'Pharmacy & Health Sciences',
];

/**
 * Ensures the 10 real Harmony College departments exist in the DB,
 * deactivates legacy/fake departments, and synchronizes with HRDepartment.
 */
export async function ensureRealDepartments() {
  console.log('[ensureRealDepartments] Syncing official Harmony College departments...');

  // 1. Upsert the 10 real departments
  for (const dept of REAL_DEPARTMENTS) {
    const existing = await prisma.department.findFirst({
      where: {
        OR: [
          { name: { equals: dept.name, mode: 'insensitive' } },
          { code: dept.code },
        ],
      },
    });

    let currentDeptId = existing?.id;

    if (existing) {
      await prisma.department.update({
        where: { id: existing.id },
        data: {
          name: dept.name,
          code: dept.code,
          description: dept.description,
          isActive: true,
        },
      });
    } else {
      const created = await prisma.department.create({
        data: {
          name: dept.name,
          code: dept.code,
          description: dept.description,
          isActive: true,
        },
      });
      currentDeptId = created.id;
    }

    // Ensure corresponding HRDepartment exists
    if (currentDeptId) {
      await prisma.hRDepartment.upsert({
        where: { id: currentDeptId },
        update: { name: dept.name, isActive: true },
        create: { id: currentDeptId, name: dept.name, isActive: true },
      }).catch(async () => {
        await prisma.hRDepartment.upsert({
          where: { name: dept.name },
          update: { isActive: true },
          create: { name: dept.name, isActive: true },
        }).catch(() => {});
      });
    }
  }

  // 2. Deactivate fake departments so they never appear in UI or student selection
  await prisma.department.updateMany({
    where: {
      name: { in: FAKE_DEPARTMENT_NAMES },
    },
    data: {
      isActive: false,
    },
  });

  await prisma.hRDepartment.updateMany({
    where: {
      name: { in: FAKE_DEPARTMENT_NAMES },
    },
    data: {
      isActive: false,
    },
  });

  console.log('[ensureRealDepartments] Real departments synchronization complete.');
}
