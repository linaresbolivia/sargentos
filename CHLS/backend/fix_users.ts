import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const staffRole = await prisma.role.findUnique({ where: { name: 'STAFF' } });
  if (staffRole) {
    await prisma.user.update({
      where: { email: 'adminmasivo@chls.com' },
      data: { roles: { connect: { id: staffRole.id } } }
    });
    await prisma.user.update({
      where: { email: 'whatsapp@chls.com' },
      data: { roles: { connect: { id: staffRole.id } } }
    });
    console.log('Users updated successfully.');
  }
}
main().finally(() => prisma.$disconnect());
