const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.role.upsert({
    where: { name: 'MODULO_USUARIO_PQRS' },
    update: {},
    create: {
      name: 'MODULO_USUARIO_PQRS',
      description: 'Usuario PQRS'
    }
  });
  console.log('Role MODULO_USUARIO_PQRS created.');
}
main().finally(() => prisma.$disconnect());
