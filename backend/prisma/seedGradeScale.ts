/**
 * Seeds the default grade scale (Ethiopian university 4.0 system).
 * Registrar can modify these via the admin interface.
 * Run: npx tsx prisma/seedGradeScale.ts
 */
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const DEFAULT_SCALE = [
  { letterGrade: 'A+', gradePoints: 4.00, description: 'Outstanding',       isPassing: true,  displayOrder: 1  },
  { letterGrade: 'A',  gradePoints: 4.00, description: 'Excellent',         isPassing: true,  displayOrder: 2  },
  { letterGrade: 'A-', gradePoints: 3.75, description: 'Very Good',         isPassing: true,  displayOrder: 3  },
  { letterGrade: 'B+', gradePoints: 3.50, description: 'Good Plus',         isPassing: true,  displayOrder: 4  },
  { letterGrade: 'B',  gradePoints: 3.00, description: 'Good',              isPassing: true,  displayOrder: 5  },
  { letterGrade: 'B-', gradePoints: 2.75, description: 'Good Minus',        isPassing: true,  displayOrder: 6  },
  { letterGrade: 'C+', gradePoints: 2.50, description: 'Satisfactory Plus', isPassing: true,  displayOrder: 7  },
  { letterGrade: 'C',  gradePoints: 2.00, description: 'Satisfactory',      isPassing: true,  displayOrder: 8  },
  { letterGrade: 'C-', gradePoints: 1.75, description: 'Satisfactory Minus',isPassing: true,  displayOrder: 9  },
  { letterGrade: 'D',  gradePoints: 1.00, description: 'Passing',           isPassing: true,  displayOrder: 10 },
  { letterGrade: 'F',  gradePoints: 0.00, description: 'Failing',           isPassing: false, displayOrder: 11 },
  { letterGrade: 'I',  gradePoints: 0.00, description: 'Incomplete',        isPassing: false, displayOrder: 12 },
  { letterGrade: 'W',  gradePoints: 0.00, description: 'Withdrawn',         isPassing: false, displayOrder: 13 },
  { letterGrade: 'NG', gradePoints: 0.00, description: 'No Grade',          isPassing: false, displayOrder: 14 },
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
