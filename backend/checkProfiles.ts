import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const profiles = await prisma.studentProfile.findMany({
    select: {
      userId: true,
      program: true,
      programType: true,
      shortProgramDuration: true,
    },
    take: 10,
  });
  
  console.log(JSON.stringify(profiles, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
