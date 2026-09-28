const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const role = await prisma.role.upsert({
    where: { name: 'MODULO_WHATSAPP' },
    update: {},
    create: {
      name: 'MODULO_WHATSAPP',
      description: 'Acceso a envío masivo de WhatsApp',
      perms: ['module:whatsapp']
    }
  });

  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'whatsapp@chls.com' },
    update: {
      roles: { connect: [{ name: 'MODULO_WHATSAPP' }] }
    },
    create: {
      name: 'Envío Masivo',
      email: 'whatsapp@chls.com',
      password: hashedPassword,
      roles: { connect: [{ name: 'MODULO_WHATSAPP' }] }
    }
  });

  console.log('User whatsapp@chls.com created with password "password123" and role "MODULO_WHATSAPP"');
}

main().catch(console.error).finally(() => prisma.$disconnect());
