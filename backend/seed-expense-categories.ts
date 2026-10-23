/**
 * Seed Default Expense Categories
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  {
    name: 'Utilities',
    description: 'Electricity, water, internet, and telephone',
  },
  {
    name: 'Supplies',
    description: 'Office supplies, educational supplies, and consumables',
  },
  {
    name: 'Facilities',
    description: 'Rent, maintenance, and repairs',
  },
  {
    name: 'Transportation',
    description: 'Vehicle fuel, maintenance, and transport costs',
  },
  {
    name: 'Marketing',
    description: 'Advertising and promotional materials',
  },
  {
    name: 'Equipment',
    description: 'Purchase and maintenance of equipment',
  },
  {
    name: 'Professional Services',
    description: 'Legal, accounting, and consulting services',
  },
  {
    name: 'Other',
    description: 'Miscellaneous operational expenses',
  },
];

async function main() {
  console.log('Seeding expense categories...');

  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await prisma.expenseCategory.findFirst({
      where: { name: { equals: cat.name, mode: 'insensitive' } },
    });

    if (existing) {
      console.log(`✓ Category "${cat.name}" already exists`);
    } else {
      await prisma.expenseCategory.create({
        data: cat,
      });
      console.log(`✓ Created category "${cat.name}"`);
    }
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error('Error seeding categories:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
