const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const role = await prisma.role.upsert({
    where: { name: 'MODULO_PQRS' },
    update: {},
    create: {
      name: 'MODULO_PQRS',
      description: 'Gestión de PQRS'
    }
  });
  
  await prisma.user.update({
    where: { email: 'adminpqrs@chls.com' },
    data: {
      roles: {
        connect: [{ name: 'MODULO_PQRS' }]
      }
    }
  });

  console.log('Role MODULO_PQRS created and assigned to adminpqrs@chls.com');
}
main().finally(() => prisma.$disconnect());
