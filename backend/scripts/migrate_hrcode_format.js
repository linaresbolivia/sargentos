const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  const items = await prisma.routeSheet.findMany({ orderBy: { createdAt: 'asc' } });
  console.log('Total items:', items.length);

  const monthCounters = {};
  for (const item of items) {
    const d = new Date(item.createdAt);
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    monthCounters[monthStr] = (monthCounters[monthStr] || 0) + 1;
    const newCode = `${monthStr}-${String(monthCounters[monthStr]).padStart(3, '0')}`;

    console.log(`Updating ${item.hrCode} -> ${newCode}`);
    await prisma.routeSheet.update({
      where: { id: item.id },
      data: { hrCode: newCode, correlativeNumber: monthCounters[monthStr] }
    });
  }
  console.log('Migration completed successfully!');
  await prisma.$disconnect();
}

migrate().catch(console.error);
