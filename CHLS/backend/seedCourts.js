const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const defaultCourts = [
    { name: 'Cancha Tenis 1', sport: 'Tenis' },
    { name: 'Cancha Tenis 2', sport: 'Tenis' },
    { name: 'Cancha Raqueta 1', sport: 'Raqueta' },
    { name: 'Cancha Raqueta 2', sport: 'Raqueta' },
    { name: 'Cancha Pádel 1', sport: 'Pádel' },
    { name: 'Cancha Wally 1', sport: 'Wally' },
  ];

  for (const court of defaultCourts) {
    await prisma.court.create({ data: court });
    console.log(`Created: ${court.name}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
