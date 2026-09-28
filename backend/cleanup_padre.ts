import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Find chats where the contactName is 'Padre' or it only contains messages sent by us?
  // Let's just find the chat that has the name 'Padre' and delete it.
  const badChats = await prisma.whatsAppChat.findMany({
    where: {
      contactName: 'Padre'
    }
  });

  console.log('Bad chats found:', badChats);

  for (const chat of badChats) {
    await prisma.whatsAppMessage.deleteMany({
      where: { chatId: chat.id }
    });
    await prisma.whatsAppChat.delete({
      where: { id: chat.id }
    });
    console.log(`Deleted chat: ${chat.phone}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
