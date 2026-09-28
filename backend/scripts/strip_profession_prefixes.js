const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Función para remover prefijos de profesiones abreviadas
function cleanPrefix(text) {
  if (!text) return text;
  return text
    .replace(/\b(Ing\.|Lic\.|Dr\.|Dra\.|Arq\.|Abg\.|Prof\.|Cnl\.|My\.|Cap\.)\s*/gi, '')
    .trim();
}

async function main() {
  console.log('=== Limpiando prefijos de profesiones en Usuarios y Configuración ===');

  // 1. Limpiar usuarios en base de datos
  const users = await prisma.user.findMany();
  let updatedUsersCount = 0;
  for (const u of users) {
    const newFirst = cleanPrefix(u.firstName);
    const newLast = cleanPrefix(u.lastName);
    if (newFirst !== u.firstName || newLast !== u.lastName) {
      await prisma.user.update({
        where: { id: u.id },
        data: { firstName: newFirst, lastName: newLast }
      });
      console.log(`Usuario actualizado: "${u.firstName} ${u.lastName}" -> "${newFirst} ${newLast}"`);
      updatedUsersCount++;
    }
  }
  console.log(`Total usuarios actualizados en DB: ${updatedUsersCount}`);

  // 2. Limpiar correspondence_settings.json
  const settingsPath = path.join(__dirname, '../data/correspondence_settings.json');
  if (fs.existsSync(settingsPath)) {
    const raw = fs.readFileSync(settingsPath, 'utf8');
    let settings = JSON.parse(raw);

    if (settings.areas) {
      settings.areas = settings.areas.map(a => ({
        ...a,
        manager: cleanPrefix(a.manager),
      }));
    }

    if (settings.workflow?.nodes) {
      settings.workflow.nodes = settings.workflow.nodes.map(n => ({
        ...n,
        manager: cleanPrefix(n.manager),
      }));
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    console.log('correspondence_settings.json actualizado con éxito.');
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
