const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.pqrsTicket.findMany({ include: { history: true, assignedTo: true } })
  .then(res => console.log('Found ' + res.length + ' tickets'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
