const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const code = 'PQK8';
  const ticket = await prisma.pqrsTicket.findFirst({
    where: { trackingCode: code.toUpperCase() },
    include: { history: { orderBy: { createdAt: 'desc' } } }
  });
  console.log('Found ticket:', ticket ? ticket.code : 'null');
  if (ticket) {
    let botReply = `*Estado de tu PQRS (${ticket.code})*\n\n`;
    botReply += `*Área:* ${ticket.area || 'N/A'}\n`;
    botReply += `*Tipo:* ${ticket.type}\n`;
    botReply += `*Estado Actual:* ${ticket.status}\n\n`;
    if (ticket.resolution) {
      botReply += `*Resolución:* ${ticket.resolution}\n\n`;
    }
    botReply += `*Últimos movimientos:*\n`;
    const recentHistory = ticket.history.slice(0, 3);
    if (recentHistory.length === 0) {
      botReply += `- Caso creado y derivado exitosamente.\n`;
    } else {
      recentHistory.forEach((h) => {
        botReply += `- _${h.action}_: ${h.description}\n`;
      });
    }
    console.log(botReply);
  }
}

main().finally(() => prisma.$disconnect());
