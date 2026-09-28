const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'shuanca@chls.com' },
    include: { roles: true }
  });
  console.log('User roles:', user.roles.map(r => r.name));
  console.log('User ID:', user.id);
  const tickets = await prisma.pqrsTicket.findMany({ select: { code: true, assignedToId: true } });
  console.log('Tickets:', tickets);
}
main().finally(() => prisma.$disconnect());
