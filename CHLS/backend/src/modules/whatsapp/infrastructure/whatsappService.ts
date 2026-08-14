import { Client, LocalAuth, MessageMedia, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import fs from 'fs';
import { prisma } from '@shared/infrastructure/prisma';
import { socketService } from '@config/socket';

export class WhatsappClientInstance {
  private client!: Client;
  public qrCodeUrl: string | null = null;
  public status: 'DISCONNECTED' | 'QR_READY' | 'CONNECTED' | 'INITIALIZING' = 'DISCONNECTED';
  private clientId: string;
  public isBotActive: boolean = true;
  private lastQueryTimestamps: Map<string, number> = new Map();

  constructor(clientId: string) {
    this.clientId = clientId;
    this.initClient();
  }

  private initClient() {
    this.client = new Client({
      authStrategy: new LocalAuth({ clientId: this.clientId }),
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--disable-gpu'],
      }
    });
    this.initializeEvents();
  }

  private initializeEvents() {
    this.client.on('qr', async (qr) => {
      console.log(`[${this.clientId}] QR Code received, scan it!`);
      this.status = 'QR_READY';
      try {
        this.qrCodeUrl = await qrcode.toDataURL(qr);
      } catch (err) {
        console.error(`[${this.clientId}] Failed to generate QR data url`, err);
      }
    });

    this.client.on('ready', () => {
      console.log(`[${this.clientId}] WhatsApp Client is ready!`);
      this.status = 'CONNECTED';
      this.qrCodeUrl = null;
    });

    this.client.on('authenticated', () => {
      console.log(`[${this.clientId}] WhatsApp Client Authenticated`);
    });

    this.client.on('auth_failure', msg => {
      console.error(`[${this.clientId}] WhatsApp Authentication failure`, msg);
      this.status = 'DISCONNECTED';
    });

    this.client.on('disconnected', (reason) => {
      console.log(`[${this.clientId}] WhatsApp Client was disconnected`, reason);
      this.status = 'DISCONNECTED';
      this.qrCodeUrl = null;
    });

    // Only process Chat/Inbox events for the "masivo" client for now, or distinguish them if needed.
    // For simplicity, we'll run it for both but store under same DB tables (could be mixed, but fine for now).
    this.client.on('message', async (msg: Message) => {
      await this.handleIncomingMessage(msg);
    });

    this.client.on('message_create', async (msg: Message) => {
      if (msg.fromMe) {
        await this.handleOutgoingMessage(msg);
      }
    });

    this.client.on('message_ack', async (msg: Message, ack: number) => {
      await this.handleMessageAck(msg, ack);
    });
  }

  private async handleIncomingMessage(msg: Message) {
    if (!this.isBotActive) return; // Si el bot está apagado, no procesa respuestas automáticas

    try {
      if (msg.isStatus || msg.from.includes('@g.us')) return;
      const contact = await msg.getContact();
      let phone = contact.number || msg.from.replace(/@.*$/, '');
      if (phone.includes(':')) phone = phone.split(':')[0];

      let contactName = contact.name || contact.pushname || phone;

      // Try to resolve name from PQRS tickets if it's just the phone
      if (contactName === phone) {
        const cleanPhone = phone.replace(/^591/, '');
        const ticket = await prisma.pqrsTicket.findFirst({
          where: { phone: { contains: cleanPhone } },
          orderBy: { createdAt: 'desc' }
        });
        if (ticket) {
          contactName = ticket.fullName;
        }
      }

      const chat = await prisma.whatsAppChat.upsert({
        where: { phone },
        update: {
          contactName,
          lastMessage: msg.body,
          lastMessageAt: new Date(),
          unreadCount: { increment: 1 }
        },
        create: {
          phone,
          contactName,
          lastMessage: msg.body,
          lastMessageAt: new Date(),
          unreadCount: 1
        }
      });

      const newMessage = await prisma.whatsAppMessage.create({
        data: {
          chatId: chat.id,
          content: msg.body,
          fromMe: false,
          hasMedia: msg.hasMedia,
          status: 'DELIVERED',
          timestamp: new Date()
        }
      });

      socketService.getIo().emit('whatsapp:new_message', { chat, message: newMessage, clientId: this.clientId });

      // --- BOT LOGIC (PQRS Tracker & Satisfaction Survey) ---
      const bodyStr = msg.body.trim();
      const codeMatch = bodyStr.match(/[A-Za-z]{3}[0-9]/);
      
      const cleanPhone = phone.replace(/^591/, '');
      const potentialRating = parseInt(bodyStr, 10);
      const isPossibleRating = !isNaN(potentialRating) && potentialRating >= 1 && potentialRating <= 5 && bodyStr.length === 1;

      const ticketWaitingForRating = await prisma.pqrsTicket.findFirst({
        where: { phone: { contains: cleanPhone }, isWaitingForRating: true },
        orderBy: { updatedAt: 'desc' }
      });

      if (ticketWaitingForRating) {
        const finalRating = isPossibleRating ? potentialRating : 5;
        const extraNote = !isPossibleRating ? ` (Asignado automáticamente tras responder: "${bodyStr.substring(0, 30)}")` : '';

        await prisma.pqrsTicket.update({
          where: { id: ticketWaitingForRating.id },
          data: { rating: finalRating, isWaitingForRating: false }
        });
        
        await prisma.pqrsHistory.create({
          data: {
            ticketId: ticketWaitingForRating.id,
            action: 'ENCUESTA_SATISFACCION',
            description: `El socio calificó la atención con un ${finalRating}/5.${extraNote}`,
            performedBy: `${ticketWaitingForRating.fullName || 'Socio'} (WhatsApp)`,
          }
        });
        
        await this.sendMessage(msg.from, '¡Gracias por ayudarnos a mejorar! Tu calificación ha sido registrada.');
        return; // Detener flujo para no activar otras respuestas del bot
      }

      if (bodyStr.toLowerCase() === 'hola' || bodyStr.toLowerCase() === 'estado') {
        const botReply = 'Hola, soy Horse 🐴, el asistente virtual del Club Hípico Los Sargentos. Si deseas saber el estado de tu PQRS, por favor escribe tu código de seguimiento (Ej: MLG1). De lo contrario, continúa con la conversación y en breve te atenderá un asistente humano.';
        await this.sendMessage(msg.from, botReply);
      } else if (codeMatch) {
        // Rate limiting: 5 minutes per user
        const now = Date.now();
        const lastQuery = this.lastQueryTimestamps.get(msg.from) || 0;
        if (now - lastQuery < 5 * 60 * 1000) {
          return; // Detener flujo para no responder repetidamente
        }
        
        // Search for ticket
        const trackingCode = codeMatch[0].toUpperCase();
        const ticket = await prisma.pqrsTicket.findFirst({
          where: { trackingCode },
          include: { history: { orderBy: { createdAt: 'desc' } } }
        });

        if (!ticket) {
          const noTicketMsg = `Lo siento, no encontré un caso activo con el código *${trackingCode}*.\n\nPor favor, verifica que el código sea correcto.`;
          await this.sendMessage(msg.from, noTicketMsg);
          // Rate limit only applies to valid tracking code queries to prevent spamming
          this.lastQueryTimestamps.set(msg.from, now);
          return;
        }

        // Apply rate limiting for valid queries
        this.lastQueryTimestamps.set(msg.from, now);
        // Filtrar acciones internas o del sistema que no aportan valor al cliente
        const relevantHistory = ticket.history.filter((h: any) => 
          !['RECIBIDO', 'WHATSAPP_ENVIADO', 'INFO_ACTUALIZADA', 'CREADO'].includes(h.action)
        );
          
        const recentHistory = relevantHistory.length > 0 ? relevantHistory[0].description : 'En proceso de revisión.';
        let cleanHistory = recentHistory;

        if (cleanHistory.includes('Instrucciones/Nota:')) {
          cleanHistory = cleanHistory.split('Instrucciones/Nota:')[1].trim();
        } else if (cleanHistory.includes('Nota de Resolución:')) {
          cleanHistory = cleanHistory.split('Nota de Resolución:')[1].trim();
        } else {
          cleanHistory = cleanHistory
            .replace(/\n?Prioridad actualizada a:.*?(\n|$)/g, '\n')
            .replace(/\n?Derivado a:.*?(\n|$)/g, '\n')
            .replace(/\n?El estado del ticket cambió a.*?(\n|$)/g, '\n')
            .trim();
        }
        if (!cleanHistory) cleanHistory = 'En proceso de revisión.';
        
        const formatText = (text: string | null | undefined) => {
          if (!text) return '';
          const lower = text.replace(/_/g, ' ').toLowerCase();
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        };

        let botReply = `Estimado socio, le informamos el estado de su: *${ticket.code}*\n`;
        botReply += `🔸 *Asunto:* ${formatText(ticket.type)}\n`;
        botReply += `🔸 *Área:* ${formatText(ticket.area) || 'Sin asignar'}\n`;
        botReply += `🔸 *Descripción:* ${ticket.description}\n`;
        botReply += `🔸 *Estado:* ${formatText(ticket.status)}\n`;
        botReply += `🔸 *Última acción:* ${cleanHistory}\n`;
        botReply += `Gracias por comunicarse con el *Área de Atención al Socio*.\n*Club Hípico Los Sargentos*.\n\n_(Podrá volver a consultar el estado de su caso en 5 minutos)_`;
        
        await this.sendMessage(msg.from, botReply);
      }
      // --- END BOT LOGIC ---

    } catch (e) {
      console.error(`[${this.clientId}] Error handling incoming message`, e);
    }
  }

  public async sendMessage(to: string, content: string, mediaBase64?: string) {
    if (this.status !== 'CONNECTED' || !this.client) {
      console.error('WhatsApp client is not connected');
      return;
    }
    const chatId = to.includes('@') ? to : `${to}@c.us`;
    try {
      // Medida anti-ban: Simular que se está escribiendo "escribiendo..."
      try {
        const chat = await this.client.getChatById(chatId);
        await chat.sendStateTyping();
        
        // Añadir un retraso humano aleatorio (entre 1.5 y 3 segundos)
        const typingDelay = 1500 + Math.random() * 1500;
        await new Promise(resolve => setTimeout(resolve, typingDelay));
        
        await chat.clearState();
      } catch (typingError) {
        console.warn(`[${this.clientId}] No se pudo simular escritura para ${chatId}`);
      }
      
      let mediaToSend: MessageMedia | undefined;
      if (mediaBase64) {
        const match = mediaBase64.match(/^data:([a-zA-Z0-9-]+\/[a-zA-Z0-9-+.]+);base64,(.+)$/);
        if (match) {
          const extension = match[1].split('/')[1] || 'jpg';
          mediaToSend = new MessageMedia(match[1], match[2], `respaldo.${extension}`);
        }
      }
      
      if (mediaToSend) {
        await this.client.sendMessage(chatId, mediaToSend, { 
          caption: content,
          sendMediaAsDocument: false
        });
      } else {
        await this.client.sendMessage(chatId, content);
      }
    } catch (e) {
      console.error(`[${this.clientId}] Error sending direct message`, e);
    }
  }

  private async handleOutgoingMessage(msg: Message) {
    try {
      if (msg.isStatus || msg.to.includes('@g.us')) return;
      
      let phone = msg.to.replace(/@.*$/, '');
      if (phone.includes(':')) phone = phone.split(':')[0];

      let contactName = phone;
      try {
        const chat = await msg.getChat();
        contactName = chat.name || phone;
      } catch (e) {}

      // Try to resolve name from PQRS tickets if it's just the phone
      if (contactName === phone) {
        const cleanPhone = phone.replace(/^591/, '');
        const ticket = await prisma.pqrsTicket.findFirst({
          where: { phone: { contains: cleanPhone } },
          orderBy: { createdAt: 'desc' }
        });
        if (ticket) {
          contactName = ticket.fullName;
        }
      }
      
      const chat = await prisma.whatsAppChat.upsert({
        where: { phone },
        update: {
          contactName,
          lastMessage: msg.body,
          lastMessageAt: new Date()
        },
        create: {
          phone,
          contactName,
          lastMessage: msg.body,
          lastMessageAt: new Date()
        }
      });

      const newMessage = await prisma.whatsAppMessage.create({
        data: {
          chatId: chat.id,
          content: msg.body,
          fromMe: true,
          hasMedia: msg.hasMedia,
          status: 'SENT',
          timestamp: new Date()
        }
      });

      socketService.getIo().emit('whatsapp:new_message', { chat, message: newMessage, clientId: this.clientId });
    } catch (e) {
      console.error(`[${this.clientId}] Error handling outgoing message`, e);
    }
  }

  private async handleMessageAck(msg: Message, ack: number) {
    try {
      if (msg.isStatus || msg.to.includes('@g.us')) return;
      const contact = await msg.getContact();
      let phone = contact.number || msg.to.replace(/@.*$/, '');
      if (phone.includes(':')) phone = phone.split(':')[0];

      let status = 'SENT';
      if (ack === 2) status = 'DELIVERED';
      if (ack === 3) status = 'READ';

      socketService.getIo().emit('whatsapp:message_ack', { phone, status, ack, clientId: this.clientId });
    } catch (e) {}
  }

  public async start() {
    if (this.status !== 'DISCONNECTED' && this.status !== 'INITIALIZING') {
      return;
    }
    this.status = 'INITIALIZING';
    try {
      await this.client.initialize();
    } catch (error) {
      console.error(`[${this.clientId}] Error initializing WhatsApp client:`, error);
      this.status = 'DISCONNECTED';
      try { await this.client.destroy(); } catch(e) {}
      this.initClient(); // Recrear la instancia limpia para el siguiente intento
    }
  }

  public async logout() {
    try {
      if (this.status === 'CONNECTED') {
        await this.client.logout();
      } else {
        await this.client.destroy();
      }
    } catch (error) {
      console.error(`[${this.clientId}] Error during logout/destroy:`, error);
      try { await this.client.destroy(); } catch (e) {}
    }
    this.status = 'DISCONNECTED';
    this.qrCodeUrl = null;
    setTimeout(() => this.initClient(), 1500); // Dar tiempo a que Puppeteer libere los archivos
  }

  public async destroy() {
    try {
      if (this.client) {
        await this.client.destroy();
      }
    } catch (e) {
      console.error(`[${this.clientId}] Error during destroy:`, e);
    }
  }

  public getStatus() {
    return {
      status: this.status,
      qr: this.qrCodeUrl,
      clientId: this.clientId,
      isBotActive: this.isBotActive
    };
  }

  public async sendBulk(
    contacts: { nombre: string; telefono: string; codigo?: string }[],
    text: string,
    imagePath?: string,
    link?: string,
    mediaBase64?: string
  ) {
    if (this.status !== 'CONNECTED') {
      throw new Error(`WhatsApp client [${this.clientId}] is not connected`);
    }

    let media: MessageMedia | undefined;
    if (imagePath && fs.existsSync(imagePath)) {
      media = MessageMedia.fromFilePath(imagePath);
    } else if (mediaBase64) {
      const match = mediaBase64.match(/^data:([a-zA-Z0-9-]+\/[a-zA-Z0-9-+.]+);base64,(.+)$/);
      if (match) {
        media = new MessageMedia(match[1], match[2]);
      }
    }

    let successCount = 0;
    let failCount = 0;
    let messagesSentInCurrentBatch = 0;

    for (const contact of contacts) {
      try {
        let formattedPhone = String(contact.telefono).trim();
        if (!formattedPhone.includes('@')) {
          formattedPhone = formattedPhone.replace(/\D/g, '');
          if (formattedPhone.length === 8) {
            formattedPhone = `591${formattedPhone}`;
          }
          formattedPhone = `${formattedPhone}@c.us`;
        }

        let messageText = text.replace(/{nombre}/g, contact.nombre);
        messageText = messageText.replace(/{codigo}/g, contact.codigo || '');
        if (link) {
          messageText += `\n\n${link}`;
        }

        const invisibleChars = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
        const randomInvisible = invisibleChars[Math.floor(Math.random() * invisibleChars.length)].repeat(Math.floor(Math.random() * 3) + 1);
        messageText += randomInvisible;

        try {
          const chat = await this.client.getChatById(formattedPhone);
          await chat.sendStateTyping();
          const typingTime = Math.min(messageText.length * 50, 4000);
          await new Promise(resolve => setTimeout(resolve, typingTime));
        } catch (e) {}

        if (media) {
          try {
            const freshMedia = imagePath ? MessageMedia.fromFilePath(imagePath) : media;
            if (freshMedia) {
               await this.client.sendMessage(formattedPhone, freshMedia, { caption: messageText });
            } else {
               await this.client.sendMessage(formattedPhone, messageText);
            }
          } catch (mediaError) {
            console.error(`[${this.clientId}] Failed to send media`, mediaError);
            await this.client.sendMessage(formattedPhone, messageText);
          }
        } else {
          await this.client.sendMessage(formattedPhone, messageText);
        }

        successCount++;
        messagesSentInCurrentBatch++;

        const delayBetweenMessages = 4000 + Math.random() * 6000;
        await new Promise(resolve => setTimeout(resolve, delayBetweenMessages));

        if (messagesSentInCurrentBatch >= (15 + Math.floor(Math.random() * 5))) {
           const longPause = 30000 + Math.random() * 30000;
           console.log(`[Anti-Ban][${this.clientId}] Descanso humano: ${Math.round(longPause/1000)}s.`);
           await new Promise(resolve => setTimeout(resolve, longPause));
           messagesSentInCurrentBatch = 0;
        }
      } catch (err) {
        console.error(`[${this.clientId}] Failed to send message to ${contact.telefono}`, err);
        failCount++;
      }
    }

    if (imagePath && fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    return { successCount, failCount };
  }
}

class WhatsappManager {
  private instances: Map<string, WhatsappClientInstance> = new Map();

  constructor() {
    // Initialize default instances
    this.instances.set('chls-masivo', new WhatsappClientInstance('chls-masivo'));
    this.instances.set('chls-pqrs', new WhatsappClientInstance('chls-pqrs'));
  }

  public getInstance(clientId: string = 'chls-masivo'): WhatsappClientInstance {
    let instance = this.instances.get(clientId);
    if (!instance) {
      // Lazy load dynamically if needed
      instance = new WhatsappClientInstance(clientId);
      this.instances.set(clientId, instance);
    }
    return instance;
  }

  public async destroyAll() {
    for (const [clientId, instance] of this.instances.entries()) {
      await instance.destroy();
    }
  }
}

export const whatsappManager = new WhatsappManager();
export const whatsappService = whatsappManager.getInstance('chls-masivo'); // For backwards compatibility

