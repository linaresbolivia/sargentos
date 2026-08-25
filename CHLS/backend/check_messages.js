const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const messages = await prisma.whatsAppMessage.findMany({
    orderBy: { timestamp: 'desc' },
    take: 20,
    include: { chat: true }
  });
  
  console.log(JSON.stringify(messages, null, 2));
}

main().finally(() => prisma.$disconnect());

