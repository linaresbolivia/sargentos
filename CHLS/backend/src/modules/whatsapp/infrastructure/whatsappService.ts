import { Client, LocalAuth, MessageMedia, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { prisma } from '@shared/infrastructure/prisma';
import { socketService } from '@config/socket';
import { botSessionManager } from '../domain/botSessionManager';

export class WhatsappClientInstance {
  private client!: Client;
  public qrCodeUrl: string | null = null;
  public status: 'DISCONNECTED' | 'QR_READY' | 'CONNECTED' | 'INITIALIZING' = 'DISCONNECTED';
  private clientId: string;
  public isBotActive: boolean = true;
  private lastQueryTimestamps: Map<string, number> = new Map();
  private isExplicitlyLoggedOut: boolean = false;
  private isInitializing: boolean = false;
  private initWatchdogTimer: NodeJS.Timeout | null = null;

  // --- MOTOR HUMANO & ANTI-BAN CALL CENTER ---
  private incomingDebounceMap: Map<string, { timer: NodeJS.Timeout; messages: string[]; contactName: string; rawFrom: string }> = new Map();
  private userMessageFrequency: Map<string, { count: number; firstTimestamp: number; isThrottled: boolean }> = new Map();
  private outboundQueue: Array<{ to: string; content: string; mediaBase64?: string; resolve: () => void; reject: (err: any) => void }> = [];
  private isProcessingOutboundQueue: boolean = false;
  private presenceHeartbeatTimer: NodeJS.Timeout | null = null;

  constructor(clientId: string) {
    this.clientId = clientId;
    this.initClient();
  }

  private initClient() {
    this.client = new Client({
      authStrategy: new LocalAuth({ clientId: this.clientId }),
      puppeteer: {
        headless: true,
        defaultViewport: {
          width: 1280,
          height: 800,
          deviceScaleFactor: 1,
          isMobile: false,
          hasTouch: false,
          isLandscape: true
        },
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled',
          '--disable-extensions',
          '--disable-infobars',
          '--window-position=0,0',
          '--ignore-certificate-errors',
          '--ignore-certificate-errors-spki-list',
          '--lang=es-BO,es;q=0.9,en-US;q=0.8,en;q=0.7'
        ],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        bypassCSP: true,
      },
      webVersionCache: {
        type: 'none',
      }
    });
    this.initializeEvents();
  }

  private emitStatusChange() {
    try {
      socketService.getIo()?.emit('whatsapp:status_change', {
        clientId: this.clientId,
        status: this.status,
        qr: this.qrCodeUrl,
        isBotActive: this.isBotActive
      });
    } catch (e) { }
  }

  private startPresenceHeartbeat() {
    if (this.presenceHeartbeatTimer) {
      clearInterval(this.presenceHeartbeatTimer);
    }
    // Heartbeat cada 4 a 5 minutos para simular sesión activa de escritorio
    this.presenceHeartbeatTimer = setInterval(async () => {
      if (this.status === 'CONNECTED' && this.client) {
        try {
          await this.client.sendPresenceAvailable();
        } catch (e) { }
      }
    }, 240000 + Math.random() * 60000);
  }

  private stopPresenceHeartbeat() {
    if (this.presenceHeartbeatTimer) {
      clearInterval(this.presenceHeartbeatTimer);
      this.presenceHeartbeatTimer = null;
    }
  }

  private initializeEvents() {
    this.client.on('qr', async (qr) => {
      console.log(`[${this.clientId}] QR Code received, scan it!`);
      this.clearWatchdog();
      this.status = 'QR_READY';
      this.isInitializing = false;
      try {
        this.qrCodeUrl = await qrcode.toDataURL(qr);
      } catch (err) {
        console.error(`[${this.clientId}] Failed to generate QR data url`, err);
      }
      this.emitStatusChange();
    });

    this.client.on('ready', async () => {
      console.log(`[${this.clientId}] WhatsApp Client is ready!`);
      this.clearWatchdog();
      this.status = 'CONNECTED';
      this.isInitializing = false;
      this.qrCodeUrl = null;
      this.isExplicitlyLoggedOut = false;
      this.emitStatusChange();

      // Stealth In-Browser: eliminar huellas de Puppeteer y webdriver
      try {
        const page = (this.client as any)?.pupPage;
        if (page) {
          await page.evaluate(`(() => {
            try {
              Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
              window.chrome = { runtime: {}, app: { isInstalled: false } };
              Object.defineProperty(navigator, 'languages', { get: () => ['es-BO', 'es', 'en-US', 'en'] });
              Object.defineProperty(navigator, 'plugins', {
                get: () => [
                  { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                  { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' }
                ]
              });
            } catch (e) { }
          })()`);
        }
      } catch (stealthErr) { }

      this.startPresenceHeartbeat();
    });

    this.client.on('authenticated', () => {
      console.log(`[${this.clientId}] WhatsApp Client Authenticated`);
      this.clearWatchdog();
      this.isInitializing = false;
      this.emitStatusChange();
    });

    this.client.on('auth_failure', async msg => {
      console.error(`[${this.clientId}] WhatsApp Authentication failure:`, msg);
      this.clearWatchdog();
      this.stopPresenceHeartbeat();
      this.status = 'DISCONNECTED';
      this.isInitializing = false;
      this.isExplicitlyLoggedOut = true;
      this.emitStatusChange();
      await this.safeDestroyClient();
      await this.purgeSessionDir();
      this.initClient();
    });

    this.client.on('disconnected', async (reason) => {
      console.log(`[${this.clientId}] WhatsApp Client was disconnected:`, reason);
      this.clearWatchdog();
      this.stopPresenceHeartbeat();
      this.status = 'DISCONNECTED';
      this.isInitializing = false;
      this.qrCodeUrl = null;
      this.emitStatusChange();

      const isManualLogout = String(reason).toUpperCase().includes('LOGOUT') ||
        String(reason).toUpperCase().includes('NAVIGATION') ||
        this.isExplicitlyLoggedOut;

      if (isManualLogout) {
        console.log(`[${this.clientId}] Cierre de sesión definitivo. Purgando credenciales locales...`);
        this.isExplicitlyLoggedOut = true;
        await this.safeDestroyClient();
        await this.purgeSessionDir();
        setTimeout(() => {
          this.initClient();
        }, 1000);
      } else {
        console.log(`[${this.clientId}] Desconexión detectada. Preparando cliente para reconexión...`);
        await this.safeDestroyClient();
        this.cleanStaleLocks();
        this.initClient();
      }
    });

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
    if (!this.isBotActive) return;

    try {
      // Ignorar estados, grupos, canales de noticias (newsletter), difusiones y temporales
      if (
        msg.isStatus || 
        msg.from.includes('@g.us') || 
        msg.from.includes('@newsletter') || 
        msg.from.includes('@broadcast') ||
        msg.from.includes('@temp')
      ) return;

      let phone = '';
      let rawFrom = msg.from;
      let contactName = '';

      // 1. Obtener datos del contacto oficial
      try {
        const contact = await msg.getContact();
        if (contact) {
          contactName = contact.name || contact.pushname || '';
          if (contact.number && /^[0-9]{7,13}$/.test(contact.number)) {
            phone = contact.number;
          }
        }
      } catch (e) { }

      // 2. Si no se obtuvo de contact.number y viene de @c.us
      if (!phone && rawFrom.endsWith('@c.us')) {
        const userPart = rawFrom.split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
        if (userPart.length >= 7 && userPart.length <= 13) {
          phone = userPart;
        }
      }

      // 3. Si viene de un @lid, resolver con el chat
      if (!phone) {
        try {
          const chatObj = await msg.getChat();
          if (chatObj?.id?._serialized?.endsWith('@c.us')) {
            phone = chatObj.id.user.replace(/[^0-9]/g, '');
          }
        } catch (e) { }
      }

      // 4. Fallback: extraer dígitos de rawFrom
      if (!phone) {
        const digits = rawFrom.replace(/@.*$/, '').split(':')[0].replace(/[^0-9]/g, '');
        if (digits.length >= 7 && digits.length <= 13) {
          phone = digits;
        }
      }

      // Normalizar número boliviano de 8 dígitos a formato internacional 591XXXXXXXX
      if (phone.length === 8) {
        phone = `591${phone}`;
      }

      // Descartar identificadores que no sean números de teléfono válidos (7 a 12 dígitos)
      if (!phone || phone.length < 7 || phone.length > 12) {
        return;
      }

      const searchPhone = phone.replace(/^591/, '');

      try {
        const person = await prisma.person.findFirst({
          where: { OR: [{ phone: { contains: searchPhone } }, { mobile: { contains: searchPhone } }] },
          include: { titularMemberships: true }
        });
        if (person) {
          const memNum = person.titularMemberships[0]?.membershipNumber;
          const memTag = memNum ? ` (Acción #${memNum})` : '';
          contactName = `${person.firstName} ${person.paternalSurname || person.lastName || ''}${memTag}`.trim();
        } else if (!contactName || /^[0-9]+$/.test(contactName)) {
          contactName = phone.startsWith('591') 
            ? `+591 ${phone.substring(3, 7)} ${phone.substring(7)}` 
            : `+${phone}`;
        }
      } catch (lookupErr) {}

      const chat = await prisma.whatsAppChat.upsert({
        where: { phone },
        update: { contactName: contactName || phone, lastMessage: msg.body, lastMessageAt: new Date(), unreadCount: { increment: 1 } },
        create: { phone, contactName: contactName || phone, lastMessage: msg.body, lastMessageAt: new Date(), unreadCount: 1 }
      });

      const newMessage = await prisma.whatsAppMessage.create({
        data: { chatId: chat.id, content: msg.body, fromMe: false, hasMedia: msg.hasMedia, status: 'DELIVERED', timestamp: new Date() }
      });

      socketService.getIo()?.emit('whatsapp:new_message', { chat, message: newMessage, clientId: this.clientId });

      // --- LOGICA DE BOT (Exclusiva para chls-callcenter y chls-pqrs) ---
      if (this.clientId === 'chls-reservas' || this.clientId === 'chls-masivo') {
        return;
      }

      // Control Anti-Flood / Anti-Loop por usuario (máximo 8 mensajes en 30s)
      const now = Date.now();
      const userFreq = this.userMessageFrequency.get(phone) || { count: 0, firstTimestamp: now, isThrottled: false };
      if (now - userFreq.firstTimestamp > 30000) {
        userFreq.count = 1;
        userFreq.firstTimestamp = now;
        userFreq.isThrottled = false;
      } else {
        userFreq.count++;
      }
      this.userMessageFrequency.set(phone, userFreq);

      if (userFreq.count > 8) {
        if (!userFreq.isThrottled) {
          userFreq.isThrottled = true;
          await this.sendMessage(msg.from, 'Estimado(a) socio(a), estamos procesando sus solicitudes. Por favor aguarde unos instantes para evitar saturación del canal.');
        }
        return;
      }

      // Anti-Ban Debounce Buffer: Agrupar mensajes en 2.2-2.8s
      const existingDebounce = this.incomingDebounceMap.get(phone);
      if (existingDebounce) {
        clearTimeout(existingDebounce.timer);
        existingDebounce.messages.push(msg.body);
        existingDebounce.timer = setTimeout(async () => {
          await this.processDebouncedIncoming(phone);
        }, 2200 + Math.random() * 600);
      } else {
        const timer = setTimeout(async () => {
          await this.processDebouncedIncoming(phone);
        }, 2200 + Math.random() * 600);
        this.incomingDebounceMap.set(phone, { timer, messages: [msg.body], contactName, rawFrom: msg.from });
      }
    } catch (e) {
      console.error(`[${this.clientId}] Error handling incoming message`, e);
    }
  }

  private async processDebouncedIncoming(phone: string) {
    const entry = this.incomingDebounceMap.get(phone);
    if (!entry) return;
    this.incomingDebounceMap.delete(phone);

    try {
      const combinedBody = entry.messages.join(' ').trim();
      const contactName = entry.contactName;
      const rawFrom = entry.rawFrom;

      try {
        const chatObj = await this.client.getChatById(rawFrom.includes('@') ? rawFrom : `${rawFrom}@c.us`);
        if (chatObj) {
          const readingDelay = 1000 + Math.min(combinedBody.length * 12, 1800) + Math.random() * 600;
          await new Promise(resolve => setTimeout(resolve, readingDelay));
          await chatObj.sendSeen();
        }
      } catch (seenErr) { }

      const cleanPhone = phone.replace(/^591/, '');
      const potentialRating = parseInt(combinedBody, 10);
      const isPossibleRating = !isNaN(potentialRating) && potentialRating >= 1 && potentialRating <= 5 && combinedBody.length === 1;

      const ticketWaitingForRating = await prisma.pqrsTicket.findFirst({
        where: { phone: { contains: cleanPhone }, isWaitingForRating: true },
        orderBy: { updatedAt: 'desc' }
      });

      if (ticketWaitingForRating) {
        const finalRating = isPossibleRating ? potentialRating : 5;
        const extraNote = !isPossibleRating ? ` (Asignado automáticamente tras responder: "${combinedBody.substring(0, 30)}")` : '';
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
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
        await this.sendMessage(rawFrom, '¡Muchas gracias por ayudarnos a mejorar! Su calificación ha sido registrada con éxito. 🌟\n\nEscriba *MENU* si desea realizar otra consulta.');
        return;
      }

      // Consulta directa de Hoja de Ruta / Correspondencia (ej. "HR-2026-00001" o "08-193")
      const upperBody = combinedBody.trim().toUpperCase();
      if (upperBody.startsWith('HR-') || (upperBody.startsWith('08-') && upperBody.length >= 5)) {
        const foundHr = await prisma.routeSheet.findFirst({
          where: {
            OR: [
              { hrCode: { equals: upperBody, mode: 'insensitive' } },
              { hrCode: { contains: upperBody, mode: 'insensitive' } },
            ],
          },
          include: {
            movements: {
              orderBy: { sequenceNumber: 'desc' },
              take: 1,
            },
          },
        });

        if (foundHr) {
          const lastMov = foundHr.movements[0];
          const lastInstruction = lastMov ? `\n📝 *Última Instrucción:* ${lastMov.instruction}` : '';
          const responseText = `🐎 *CLUB HÍPICO LOS SARGENTOS*\n*Seguimiento de Correspondencia & Hoja de Ruta*\n\n` +
            `📄 *Código:* ${foundHr.hrCode}\n` +
            `👤 *Remitente:* ${foundHr.senderName}\n` +
            `🏢 *Área Actual:* ${foundHr.currentArea}\n` +
            `📊 *Estado:* ${foundHr.status}\n` +
            `📌 *Asunto:* ${foundHr.reference}` +
            `${lastInstruction}\n\n` +
            `_Para realizar otra consulta, escriba *MENU*._`;

          await this.sendMessage(rawFrom, responseText);
          return;
        } else {
          await this.sendMessage(rawFrom, `⚠️ No se encontró ninguna Hoja de Ruta con el código *${upperBody}* en el sistema de correspondencia del Club Hípico Los Sargentos.\n\nVerifique el número o escriba *MENU*.`);
          return;
        }
      }

      const thinkingDelay = 1000 + Math.random() * 1200;
      await new Promise(resolve => setTimeout(resolve, thinkingDelay));
      const botResult = await botSessionManager.processMessage(phone, combinedBody, contactName);
      if (botResult.shouldSend && botResult.response) {
        await this.sendMessage(rawFrom, botResult.response);
      }
    } catch (err) {
      console.error(`[${this.clientId}] Error en processDebouncedIncoming:`, err);
    }
  }

  public async sendMessage(to: string, content: string, mediaBase64?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.outboundQueue.push({ to, content, mediaBase64, resolve, reject });
      this.processOutboundQueue();
    });
  }

  private async processOutboundQueue() {
    if (this.isProcessingOutboundQueue) return;
    this.isProcessingOutboundQueue = true;
    while (this.outboundQueue.length > 0) {
      const item = this.outboundQueue.shift();
      if (!item) break;
      try {
        if (this.status !== 'CONNECTED' || !this.client) {
          console.warn(`[${this.clientId}] WhatsApp client no está conectado. Omitiendo mensaje a ${item.to}`);
          item.resolve();
          continue;
        }
        const chatId = item.to.includes('@') ? item.to : `${item.to}@c.us`;
        let chat: any = null;
        try {
          chat = await this.client.getChatById(chatId);
          if (chat) await chat.sendStateTyping();
        } catch (typingError) { }
        const typingTime = Math.min(Math.max(item.content.length * (20 + Math.random() * 15), 2200), 6000);
        await new Promise(resolve => setTimeout(resolve, typingTime));
        if (chat) try { await chat.clearState(); } catch (e) { }
        const invisibleZeroWidth = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
        const uniqueNoise = invisibleZeroWidth[Math.floor(Math.random() * invisibleZeroWidth.length)];
        const finalContent = item.content + uniqueNoise;
        let mediaToSend: MessageMedia | undefined;
        if (item.mediaBase64) {
          const match = item.mediaBase64.match(/^data:([a-zA-Z0-9-]+\/[a-zA-Z0-9-+.]+);base64,(.+)$/);
          if (match) mediaToSend = new MessageMedia(match[1], match[2]);
        }
        if (mediaToSend) await this.client.sendMessage(chatId, mediaToSend, { caption: finalContent });
        else await this.client.sendMessage(chatId, finalContent);

        let cleanPhone = chatId.replace(/@.*$/, '').replace(/[^0-9]/g, '');
        if (cleanPhone.length === 8) cleanPhone = `591${cleanPhone}`;

        let contactName = cleanPhone;
        const searchPhone = cleanPhone.replace(/^591/, '');
        try {
          const person = await prisma.person.findFirst({
            where: { OR: [{ phone: { contains: searchPhone } }, { mobile: { contains: searchPhone } }] },
            include: { titularMemberships: true }
          });
          if (person) {
            const memNum = person.titularMemberships[0]?.membershipNumber;
            const memTag = memNum ? ` (Acción #${memNum})` : '';
            contactName = `${person.firstName} ${person.paternalSurname || person.lastName || ''}${memTag}`.trim();
          } else {
            contactName = cleanPhone.startsWith('591') 
              ? `+591 ${cleanPhone.substring(3, 7)} ${cleanPhone.substring(7)}` 
              : `+${cleanPhone}`;
          }
        } catch (e) { }

        const dbChat = await prisma.whatsAppChat.upsert({
          where: { phone: cleanPhone },
          update: {
            lastMessage: item.content,
            lastMessageAt: new Date()
          },
          create: {
            phone: cleanPhone,
            contactName,
            lastMessage: item.content,
            lastMessageAt: new Date(),
            unreadCount: 0
          }
        });

        const createdMsg = await prisma.whatsAppMessage.create({
          data: {
            chatId: dbChat.id,
            content: item.content,
            fromMe: true,
            hasMedia: !!item.mediaBase64,
            status: 'SENT',
            timestamp: new Date()
          }
        });

        socketService.getIo()?.emit('whatsapp:new_message', {
          chat: dbChat,
          message: createdMsg,
          clientId: this.clientId
        });

        item.resolve();
        if (this.outboundQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 1300));
        }
      } catch (err) {
        console.error(`[${this.clientId}] Error despachando mensaje de cola:`, err);
        item.resolve();
      }
    }
    this.isProcessingOutboundQueue = false;
  }

  private async handleOutgoingMessage(msg: Message) {
    try {
      if (
        msg.isStatus || 
        msg.to.includes('@g.us') || 
        msg.to.includes('@newsletter') || 
        msg.to.includes('@broadcast') ||
        msg.to.includes('@temp')
      ) return;

      let phone = msg.to.replace(/@.*$/, '').split(':')[0].replace(/[^0-9]/g, '');
      if (phone.length === 8) phone = `591${phone}`;
      if (!phone || phone.length > 12 || phone.length < 7) return;

      let contactName = phone;
      try {
        const chat = await msg.getChat();
        contactName = chat.name || phone;
      } catch (e) { }

      const searchPhone = phone.replace(/^591/, '');
      try {
        const person = await prisma.person.findFirst({
          where: {
            OR: [
              { phone: { contains: searchPhone } },
              { mobile: { contains: searchPhone } }
            ]
          },
          include: { titularMemberships: true }
        });

        if (person) {
          const memNum = person.titularMemberships[0]?.membershipNumber;
          const memTag = memNum ? ` (Acción #${memNum})` : '';
          contactName = `${person.firstName} ${person.paternalSurname || person.lastName || ''}${memTag}`.trim();
        }
      } catch (err) { }

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

      // Evitar duplicar si el mensaje fue enviado por el bot/cola hace menos de 8 segundos
      const existing = await prisma.whatsAppMessage.findFirst({
        where: {
          chatId: chat.id,
          content: msg.body,
          fromMe: true,
          timestamp: { gte: new Date(Date.now() - 8000) }
        }
      });
      if (existing) return;

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

      socketService.getIo()?.emit('whatsapp:new_message', { chat, message: newMessage, clientId: this.clientId });
    } catch (e) {
      console.error(`[${this.clientId}] Error handling outgoing message`, e);
    }
  }

  private async handleMessageAck(msg: Message, ack: number) {
    try {
      if (msg.isStatus || msg.to.includes('@g.us')) return;
      let phone = '';
      try {
        const contact = await msg.getContact();
        phone = contact.number || msg.to.replace(/@.*$/, '');
      } catch {
        phone = msg.to.replace(/@.*$/, '');
      }
      if (phone.includes(':')) phone = phone.split(':')[0];

      let status = 'SENT';
      if (ack === 2) status = 'DELIVERED';
      if (ack >= 3) status = 'READ';

      // Persistir el cambio de estado en la base de datos
      try {
        const chat = await prisma.whatsAppChat.findUnique({ where: { phone } });
        if (chat) {
          await prisma.whatsAppMessage.updateMany({
            where: {
              chatId: chat.id,
              fromMe: true,
              ...(status === 'DELIVERED' ? { status: 'SENT' } : { status: { not: 'READ' } })
            },
            data: { status }
          });
        }
      } catch (dbErr) { }

      socketService.getIo()?.emit('whatsapp:message_ack', { phone, status, ack, clientId: this.clientId });
    } catch (e) { }
  }

  private clearWatchdog() {
    if (this.initWatchdogTimer) {
      clearTimeout(this.initWatchdogTimer);
      this.initWatchdogTimer = null;
    }
  }

  private async safeDestroyClient() {
    this.clearWatchdog();
    this.stopPresenceHeartbeat();
    for (const debounce of this.incomingDebounceMap.values()) {
      clearTimeout(debounce.timer);
    }
    this.incomingDebounceMap.clear();
    this.outboundQueue = [];
    this.isProcessingOutboundQueue = false;

    try {
      if (this.client) {
        const browser = (this.client as any)?.pupBrowser;
        if (browser) {
          try {
            const proc = typeof browser.process === 'function' ? browser.process() : null;
            if (proc && !proc.killed) {
              proc.kill('SIGKILL');
            }
          } catch (e) { }
          await browser.close().catch(() => { });
        }
        await this.client.destroy().catch(() => { });
      }
    } catch (e) { }
  }

  private cleanStaleLocks() {
    try {
      const sessionDir = path.join(process.cwd(), '.wwebjs_auth', `session-${this.clientId}`);
      if (fs.existsSync(sessionDir)) {
        const lockFiles = [
          'SingletonLock',
          'SingletonCookie',
          'SingletonSocket',
          'DevToolsActivePort',
          'lockfile'
        ];
        for (const file of lockFiles) {
          const filePath = path.join(sessionDir, file);
          if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (e) { }
          }
        }
      }
    } catch (e) { }
  }

  private async purgeSessionDir() {
    try {
      const sessionDir = path.join(process.cwd(), '.wwebjs_auth', `session-${this.clientId}`);
      if (fs.existsSync(sessionDir)) {
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 400 });
          console.log(`[${this.clientId}] Carpeta de sesión eliminada correctamente: ${sessionDir}`);
        } catch (rmErr: any) {
          console.warn(`[${this.clientId}] Aviso al limpiar carpeta de sesión (no fatal):`, rmErr?.message || rmErr);
        }
      }
    } catch (e: any) {
      console.warn(`[${this.clientId}] Aviso al limpiar carpeta de sesión:`, e?.message || e);
    }
  }

  public async start(retryCount = 0) {
    if (this.status === 'CONNECTED' || this.status === 'QR_READY') {
      return;
    }
    if (this.isInitializing) {
      console.log(`[${this.clientId}] start() ya se encuentra en progreso. Ignorando llamada concurrente.`);
      return;
    }

    this.isInitializing = true;
    this.isExplicitlyLoggedOut = false;
    this.status = 'INITIALIZING';
    this.emitStatusChange();
    this.cleanStaleLocks();
    this.clearWatchdog();

    // Watchdog de 60 segundos: si queda colgado en INITIALIZING sin responder, reiniciar limpiamente
    this.initWatchdogTimer = setTimeout(async () => {
      if (this.status === 'INITIALIZING') {
        console.warn(`[${this.clientId}] Watchdog: Inicialización colgada tras 60s. Forzando reset...`);
        this.status = 'DISCONNECTED';
        this.isInitializing = false;
        this.emitStatusChange();
        await this.safeDestroyClient();
        this.cleanStaleLocks();
        this.initClient();
      }
    }, 60000);

    try {
      console.log(`[${this.clientId}] Inicializando cliente WhatsApp (Intento ${retryCount + 1})...`);
      await this.client.initialize();
    } catch (error: any) {
      this.clearWatchdog();
      console.error(`[${this.clientId}] Error initializing WhatsApp client (Intento ${retryCount + 1}):`, error?.message || error);
      this.status = 'DISCONNECTED';
      this.emitStatusChange();
      await this.safeDestroyClient();
      this.cleanStaleLocks();
      this.initClient();

      if (retryCount < 2 && !this.isExplicitlyLoggedOut) {
        console.log(`[${this.clientId}] Auto-recuperación: Reintentando conexión en 4 segundos...`);
        setTimeout(() => {
          if (!this.isExplicitlyLoggedOut && this.status === 'DISCONNECTED') {
            this.start(retryCount + 1);
          }
        }, 4000);
      }
    } finally {
      this.isInitializing = false;
    }
  }

  public async logout() {
    this.isExplicitlyLoggedOut = true;
    this.clearWatchdog();
    this.isInitializing = false;
    console.log(`[${this.clientId}] Iniciando proceso de desconexión y logout forzoso...`);

    try {
      if (this.status === 'CONNECTED' && this.client) {
        // Límite de 3 segundos para logout de WhatsApp Web antes de forzar el cierre
        await Promise.race([
          this.client.logout().catch(() => { }),
          new Promise(resolve => setTimeout(resolve, 3000))
        ]);
      }
    } catch (error) {
      console.warn(`[${this.clientId}] Aviso durante client.logout():`, error);
    } finally {
      await this.safeDestroyClient();
      this.cleanStaleLocks();
      await this.purgeSessionDir();
      this.status = 'DISCONNECTED';
      this.qrCodeUrl = null;
      this.emitStatusChange();
      setTimeout(() => this.initClient(), 1000);
      console.log(`[${this.clientId}] Sesión cerrada y reseteada completamente.`);
    }
  }

  public async destroy() {
    this.clearWatchdog();
    this.isInitializing = false;
    await this.safeDestroyClient();
  }

  public getStatus() {
    const moduleMap: Record<string, { moduleName: string; channelBadge: string; description: string }> = {
      'chls-reservas': {
        moduleName: 'Módulo de Reservas Deportivas',
        channelBadge: 'Canal 1 • Reservas Web',
        description: 'Confirmación automática de turnos, pases de acceso y QR de pago de canchas.'
      },
      'chls-callcenter': {
        moduleName: 'Módulo Call Center & Chatbot 24/7',
        channelBadge: 'Canal 2 • Bot 24/7 & Call Center',
        description: 'Asistente virtual interactivo 24/7, encuestas y atención en vivo.'
      },
      'chls-masivo': {
        moduleName: 'Módulo Difusión Masiva & Comunicados',
        channelBadge: 'Canal 3 • Difusión & Cobranzas',
        description: 'Difusión masiva de avisos, estados de cuenta y cobranzas.'
      },
      'chls-pqrs': {
        moduleName: 'Módulo PQRS & Atención al Socio',
        channelBadge: 'Canal 4 • PQRS',
        description: 'Seguimiento y notificación de tickets de reclamos y sugerencias.'
      },
      'chls-comercial': {
        moduleName: 'Módulo Comercial & Admisión VIP',
        channelBadge: 'Canal 5 • Admisiones & Pases VIP',
        description: 'Envío automático de pases VIP e información a postulantes a nuevos socios.'
      }
    };

    const info = moduleMap[this.clientId] || {
      moduleName: `Módulo (${this.clientId})`,
      channelBadge: this.clientId,
      description: 'Línea de WhatsApp del sistema.'
    };

    return {
      status: this.status,
      qr: this.qrCodeUrl,
      clientId: this.clientId,
      moduleName: info.moduleName,
      channelBadge: info.channelBadge,
      description: info.description,
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

        // Anti-Ban 1: Validar si el número realmente tiene cuenta de WhatsApp activa antes de enviar
        try {
          const isRegistered = await this.client.isRegisteredUser(formattedPhone);
          if (!isRegistered) {
            console.warn(`[Anti-Ban][${this.clientId}] El número ${contact.telefono} NO está registrado en WhatsApp. Omitiendo para proteger la cuenta.`);
            failCount++;
            continue;
          }
        } catch (regErr) {
          // Si falla la verificación por red, continuar con precaución
        }

        // Anti-Ban 2: Soporte de Spintax dinámico {Hola|Estimado|Saludos} para variar estructuras
        let messageText = text.replace(/\{([^{}]+)\}/g, (match, choices) => {
          if (match === '{nombre}' || match === '{codigo}') return match;
          const options = choices.split('|');
          return options[Math.floor(Math.random() * options.length)];
        });

        // Reemplazo de variables del socio
        messageText = messageText.replace(/{nombre}/g, contact.nombre);
        const codigoClean = contact.codigo && String(contact.codigo).trim() !== '' ? String(contact.codigo).trim() : '';
        messageText = messageText.replace(/{codigo}/g, codigoClean);

        // Anti-Ban 3: Caracteres invisibles aleatorios (Zero-Width) en el texto (NUNCA al final del enlace para no corromper la URL)
        const invisibleChars = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
        const randomInvisible = invisibleChars[Math.floor(Math.random() * invisibleChars.length)];
        messageText = `${randomInvisible}${messageText}`;

        if (link && link.trim()) {
          messageText += `\n\n${link.trim()}`;
        }

        // Anti-Ban 4: Simulación de presencia y tiempo de digitación humana
        let chat: any = null;
        try {
          chat = await this.client.getChatById(formattedPhone);
          await chat.sendStateTyping();
          const typingTime = Math.min(Math.max(messageText.length * 30, 2000), 5000);
          await new Promise(resolve => setTimeout(resolve, typingTime));
        } catch (e) { }

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

        // Limpiar estado de typing tras enviar
        if (chat) {
          try { await chat.clearState(); } catch (e) { }
        }

        successCount++;
        messagesSentInCurrentBatch++;

        // Anti-Ban 5: Intervalo dinámico aleatorio entre mensajes (4 a 9 segundos)
        const delayBetweenMessages = 4000 + Math.random() * 5000;
        await new Promise(resolve => setTimeout(resolve, delayBetweenMessages));

        // Anti-Ban 6: Pausa larga humana (30 a 60 segundos) cada lote de 15 a 20 mensajes
        if (messagesSentInCurrentBatch >= (15 + Math.floor(Math.random() * 5))) {
          const longPause = 30000 + Math.random() * 30000;
          console.log(`[Anti-Ban][${this.clientId}] Descanso humano preventivo: ${Math.round(longPause / 1000)}s.`);
          await new Promise(resolve => setTimeout(resolve, longPause));
          messagesSentInCurrentBatch = 0;
        }
      } catch (err) {
        console.error(`[${this.clientId}] Failed to send message to ${contact.telefono}`, err);
        failCount++;
      }
    }

    if (imagePath && fs.existsSync(imagePath) && imagePath.includes('tmp')) {
      try {
        fs.unlinkSync(imagePath);
      } catch (e) {}
    }

    return { successCount, failCount };
  }
}

class WhatsappManager {
  private instances: Map<string, WhatsappClientInstance> = new Map();

  constructor() {
    // Initialize default instances
    this.instances.set('chls-callcenter', new WhatsappClientInstance('chls-callcenter'));
    this.instances.set('chls-masivo', new WhatsappClientInstance('chls-masivo'));
    this.instances.set('chls-reservas', new WhatsappClientInstance('chls-reservas'));
    this.instances.set('chls-pqrs', new WhatsappClientInstance('chls-pqrs'));
    this.instances.set('chls-comercial', new WhatsappClientInstance('chls-comercial'));

    // Auto-connect existing saved sessions in .wwebjs_auth
    setTimeout(() => {
      this.autoStartExistingSessions();
    }, 1500);
  }

  private autoStartExistingSessions() {
    for (const [clientId, instance] of this.instances.entries()) {
      const sessionDir = path.join(process.cwd(), '.wwebjs_auth', `session-${clientId}`);
      if (fs.existsSync(sessionDir)) {
        console.log(`[${clientId}] Sesión guardada en disco detectada. Auto-iniciando WhatsApp...`);
        instance.start().catch(err => console.error(`[${clientId}] Error en auto-inicio:`, err));
      }
    }
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

