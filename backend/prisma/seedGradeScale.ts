/**
 * Seeds the default grade scale (Ethiopian university 4.0 system).
 * Registrar can modify these via the admin interface.
 * Run: npx tsx prisma/seedGradeScale.ts
 */
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const DEFAULT_SCALE = [
  { letterGrade: 'A+', gradePoints: 4.0, description: 'Outstanding',      isPassing: true,  displayOrder: 1  },
  { letterGrade: 'A',  gradePoints: 4.0, description: 'Excellent',         isPassing: true,  displayOrder: 2  },
  { letterGrade: 'A-', gradePoints: 3.7, description: 'Very Good',         isPassing: true,  displayOrder: 3  },
  { letterGrade: 'B+', gradePoints: 3.5, description: 'Good Plus',         isPassing: true,  displayOrder: 4  },
  { letterGrade: 'B',  gradePoints: 3.0, description: 'Good',              isPassing: true,  displayOrder: 5  },
  { letterGrade: 'B-', gradePoints: 2.7, description: 'Good Minus',        isPassing: true,  displayOrder: 6  },
  { letterGrade: 'C+', gradePoints: 2.5, description: 'Satisfactory Plus', isPassing: true,  displayOrder: 7  },
  { letterGrade: 'C',  gradePoints: 2.0, description: 'Satisfactory',      isPassing: true,  displayOrder: 8  },
  { letterGrade: 'C-', gradePoints: 1.7, description: 'Satisfactory Minus',isPassing: true,  displayOrder: 9  },
  { letterGrade: 'D+', gradePoints: 1.5, description: 'Passing Plus',      isPassing: true,  displayOrder: 10 },
  { letterGrade: 'D',  gradePoints: 1.0, description: 'Passing',           isPassing: true,  displayOrder: 11 },
  { letterGrade: 'F',  gradePoints: 0.0, description: 'Failing',           isPassing: false, displayOrder: 12 },
  { letterGrade: 'I',  gradePoints: 0.0, description: 'Incomplete',        isPassing: false, displayOrder: 13 },
  { letterGrade: 'W',  gradePoints: 0.0, description: 'Withdrawn',         isPassing: false, displayOrder: 14 },
  { letterGrade: 'NG', gradePoints: 0.0, description: 'No Grade',          isPassing: false, displayOrder: 15 },
];

async function main() {
  for (const row of DEFAULT_SCALE) {
    await p.gradeScale.upsert({
      where:  { letterGrade: row.letterGrade },
      update: { gradePoints: row.gradePoints, description: row.description, isPassing: row.isPassing, displayOrder: row.displayOrder },
      create: row,
    });
  }
  console.log(`✅ Seeded ${DEFAULT_SCALE.length} grade scale entries`);
}

main().catch(console.error).finally(() => p.$disconnect());
