const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pqrsRole = await prisma.role.findUnique({ where: { name: 'MODULO_PQRS' } });
  const whatsappRole = await prisma.role.findUnique({ where: { name: 'MODULO_WHATSAPP' } });
  
  if (pqrsRole) {
    await prisma.user.update({
      where: { email: 'adminmasivo@chls.com' },
      data: {
        roles: {
          disconnect: [{ id: pqrsRole.id }],
          connect: whatsappRole ? [{ id: whatsappRole.id }] : []
        }
      }
    });
    console.log('Role MODULO_PQRS disconnected from adminmasivo@chls.com successfully.');
  }

  const updatedUser = await prisma.user.findUnique({
    where: { email: 'adminmasivo@chls.com' },
    include: { roles: true }
  });
  console.log('Updated user roles:', updatedUser.roles.map(r => r.name));
}

main().catch(console.error).finally(() => prisma.$disconnect());
