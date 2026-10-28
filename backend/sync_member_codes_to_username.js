const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncUsernames() {
  console.log('=== SINCRONIZACIÓN DE CÓDIGOS DE SOCIO EN CAMPO USERNAME ===\n');

  // 1. Obtener todas las membresías con sus titulares y usuarios
  const memberships = await prisma.membership.findMany({
    include: {
      titular: {
        include: { user: true }
      }
    }
  });

  console.log(`Total de membresías a procesar: ${memberships.length}`);

  let updatedSociosCount = 0;
  let alreadySetCount = 0;
  const usedUsernames = new Set();

  // Paso 1: Asignar códigos de socio a los usuarios de los socios
  for (const m of memberships) {
    const rawCode = (m.membershipNumber || '').trim();
    if (!rawCode) continue;

    const user = m.titular?.user;
    if (!user) {
      console.warn(`Membresía ${m.membershipNumber} no tiene usuario asociado a su titular.`);
      continue;
    }

    usedUsernames.add(rawCode.toLowerCase());

    if (user.username !== rawCode) {
      await prisma.user.update({
        where: { id: user.id },
        data: { username: rawCode }
      });
      updatedSociosCount++;
    } else {
      alreadySetCount++;
    }
  }

  console.log(`Socios actualizados con su Código de Socio: ${updatedSociosCount}`);
  console.log(`Socios que ya tenían el código correcto: ${alreadySetCount}`);

  // Paso 2: Para usuarios institucionales / staff (sin membresía de socio)
  const staffUsers = await prisma.user.findMany({
    where: {
      OR: [
        { person: null },
        { person: { titularMemberships: { none: {} } } }
      ]
    }
  });

  console.log(`\nUsuarios staff/administrativos a procesar: ${staffUsers.length}`);
  let staffUpdated = 0;

  for (const u of staffUsers) {
    let baseUsername = (u.email || '').split('@')[0].trim().toLowerCase();
    let finalUsername = baseUsername;
    let counter = 1;

    // Evitar colisiones si ya está usado por un código de socio u otro usuario
    while (usedUsernames.has(finalUsername.toLowerCase())) {
      finalUsername = `${baseUsername}_${counter}`;
      counter++;
    }

    usedUsernames.add(finalUsername.toLowerCase());

    if (u.username !== finalUsername) {
      await prisma.user.update({
        where: { id: u.id },
        data: { username: finalUsername }
      });
      staffUpdated++;
    }
  }

  console.log(`Usuarios staff actualizados con su username institucional: ${staffUpdated}`);

  // Paso 3: Verificación final
  const totalUsers = await prisma.user.count();
  const usersWithUsername = await prisma.user.count({ where: { username: { not: null } } });
  const usersWithoutUsername = await prisma.user.count({ where: { username: null } });

  console.log('\n=== RESULTADO DE LA VERIFICACIÓN ===');
  console.log({
    totalUsers,
    usersWithUsername,
    usersWithoutUsername
  });

  // Muestra de socios con su nuevo username
  const sampleSocios = await prisma.user.findMany({
    take: 5,
    where: {
      person: { titularMemberships: { some: {} } }
    },
    include: {
      person: {
        include: { titularMemberships: true }
      }
    }
  });

  console.log('\nMuestra de Socios verificados:');
  sampleSocios.forEach(s => {
    console.log(`Socio: ${s.firstName} ${s.lastName} | Código Acción: ${s.person?.titularMemberships?.[0]?.membershipNumber} | Login Username: "${s.username}" | Email: ${s.email}`);
  });
}

syncUsernames()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
