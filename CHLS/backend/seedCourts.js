const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Renaming old court names to spaces/tables where applicable...');

  // 1. Rename old Frontón courts to Espacios
  await prisma.court.updateMany({
    where: { name: 'Cancha Frontón 1' },
    data: { name: 'Espacio Frontón 1', description: 'Espacio reglamentario oficial de frontón con iluminación' }
  });
  await prisma.court.updateMany({
    where: { name: 'Cancha Frontón 2' },
    data: { name: 'Espacio Frontón 2', description: 'Espacio reglamentario oficial de frontón con iluminación' }
  });

  // 2. Rename old Raquet / Wally courts to Espacios
  await prisma.court.updateMany({
    where: { name: 'Cancha Raquet / Wally 1' },
    data: { name: 'Espacio Raquet / Wally 1', description: 'Espacio cerrado con piso de madera amortiguada y vidrios templados' }
  });
  await prisma.court.updateMany({
    where: { name: 'Cancha Raquet / Wally 2' },
    data: { name: 'Espacio Raquet / Wally 2', description: 'Espacio cerrado con piso de madera amortiguada y vidrios templados' }
  });

  // 3. Rename old Pádel 1 (Panorámica) to Cancha Pádel 1
  await prisma.court.updateMany({
    where: { name: 'Cancha Pádel 1 (Panorámica)' },
    data: { name: 'Cancha Pádel 1' }
  });

  // 4. Rename old Mesa Ping Pong 1 y 2
  const oldPingPong = await prisma.court.findFirst({ where: { name: 'Mesa Ping Pong 1 y 2' } });
  if (oldPingPong) {
    await prisma.court.update({
      where: { id: oldPingPong.id },
      data: { name: 'Mesa Ping Pong 1', description: 'Mesa reglamentaria 1 de tenis de mesa' }
    });
  }

  const validCourts = [
    // 1. Frontón (2 espacios)
    { name: 'Espacio Frontón 1', sport: 'Frontón', description: 'Espacio reglamentario oficial de frontón con iluminación' },
    { name: 'Espacio Frontón 2', sport: 'Frontón', description: 'Espacio reglamentario oficial de frontón con iluminación' },

    // 2. Tenis (6 canchas)
    { name: 'Cancha Tenis 1', sport: 'Tenis', description: 'Tierra batida / Arcilla con iluminación LED para juego nocturno' },
    { name: 'Cancha Tenis 2', sport: 'Tenis', description: 'Tierra batida / Arcilla con iluminación LED' },
    { name: 'Cancha Tenis 3', sport: 'Tenis', description: 'Tierra batida / Arcilla (Habilitada para Clases y Entrenamientos)' },
    { name: 'Cancha Tenis 4', sport: 'Tenis', description: 'Tierra batida / Arcilla (Habilitada para Clases y Entrenamientos)' },
    { name: 'Cancha Tenis 5', sport: 'Tenis', description: 'Tierra batida / Arcilla oficial de torneos' },
    { name: 'Cancha Tenis 6', sport: 'Tenis', description: 'Tierra batida / Arcilla oficial de torneos' },

    // 3. Pádel (2 canchas)
    { name: 'Cancha Pádel 1', sport: 'Pádel', description: 'Cancha de cristal panorámica y césped sintético pro' },
    { name: 'Cancha Pádel 2', sport: 'Pádel', description: 'Cancha de cristal templado y césped sintético' },

    // 4. Polifuncional (1 cancha)
    { name: 'Cancha Polifuncional', sport: 'Polifuncional', description: 'Piso de parquet multi-disciplinario para Volley, Básquet y Futsal' },

    // 5. Raquet / Wally (2 espacios)
    { name: 'Espacio Raquet / Wally 1', sport: 'Raquet / Wally', description: 'Espacio cerrado con piso de madera amortiguada y vidrios templados' },
    { name: 'Espacio Raquet / Wally 2', sport: 'Raquet / Wally', description: 'Espacio cerrado con piso de madera amortiguada y vidrios templados' },

    // 6. Ping Pong (2 mesas)
    { name: 'Mesa Ping Pong 1', sport: 'Ping Pong', description: 'Mesa reglamentaria 1 de tenis de mesa' },
    { name: 'Mesa Ping Pong 2', sport: 'Ping Pong', description: 'Mesa reglamentaria 2 de tenis de mesa' },

    // 7. Fútbol (1 cancha)
    { name: 'Cancha de Fútbol', sport: 'Fútbol', description: 'Campo reglamentario de césped natural con graderías e iluminación' },
  ];

  const validNames = validCourts.map(c => c.name);

  // Deactivate any court not in valid list
  await prisma.court.updateMany({
    where: { name: { notIn: validNames } },
    data: { isActive: false }
  });

  for (const c of validCourts) {
    const existing = await prisma.court.findFirst({
      where: { name: c.name }
    });

    if (existing) {
      await prisma.court.update({
        where: { id: existing.id },
        data: {
          sport: c.sport,
          description: c.description,
          isActive: true
        }
      });
    } else {
      await prisma.court.create({
        data: {
          name: c.name,
          sport: c.sport,
          description: c.description,
          isActive: true
        }
      });
    }
  }

  const activeCourts = await prisma.court.findMany({ where: { isActive: true } });
  console.log(`Active sports courts count: ${activeCourts.length}`);
  activeCourts.forEach(c => console.log(` - ${c.name} (${c.sport})`));
}

main()
  .catch(e => {
    console.error('Error seeding courts:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
