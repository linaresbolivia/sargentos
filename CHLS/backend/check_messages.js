const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const messages = await prisma.whatsAppMessage.findMany({
    orderBy: { timestamp: 'desc' },
    take: 5,
    include: { chat: true }
  });
  
  console.log(messages.map(m => ({
    body: m.content,
    time: m.timestamp,
    phone: m.chat.phone,
    fromMe: m.fromMe
  })));
}

main().finally(() => prisma.$disconnect());
