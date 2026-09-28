import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const deletedMessages = await prisma.whatsAppMessage.deleteMany({
    where: {
      chat: {
        NOT: {
          phone: { contains: '60551507' }
        }
      }
    }
  });
  
  const deletedChats = await prisma.whatsAppChat.deleteMany({
    where: {
      NOT: {
        phone: { contains: '60551507' }
      }
    }
  });
  console.log('Deleted junk messages:', deletedMessages.count);
  console.log('Deleted junk chats:', deletedChats.count);
}

main().finally(() => prisma.$disconnect());
