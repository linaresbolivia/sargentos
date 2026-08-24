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

    this.client.on('ready', () => {
      console.log(`[${this.clientId}] WhatsApp Client is ready!`);
      this.clearWatchdog();
      this.status = 'CONNECTED';
      this.isInitializing = false;
      this.qrCodeUrl = null;
      this.isExplicitlyLoggedOut = false;
      this.emitStatusChange();
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
      // Ignorar estados, grupos, canales de noticias (newsletter), difusiones y temporales
      if (
        msg.isStatus || 
        msg.from.includes('@g.us') || 
        msg.from.includes('@newsletter') || 
        msg.from.includes('@broadcast') ||
        msg.from.includes('@temp')
      ) return;

      const contact = await msg.getContact();
      let rawFrom = msg.from;
      let phone = contact.number || '';
      if (!phone || phone.length > 13) {
        phone = rawFrom.replace(/@.*$/, '').split(':')[0].replace(/[^0-9]/g, '');
      }

      // Validar longitud de número telefónico real (7 a 13 dígitos). Descartar LIDs de 15 dígitos o hashes
      if (!phone || phone.length > 13 || phone.length < 7) {
        return;
      }

      let contactName = contact.name || contact.pushname;
      const searchPhone = phone.replace(/^591/, '');

      // 1. Buscar en la base de datos de socios
      try {
        const person = await prisma.person.findFirst({
          where: {
            OR: [
              { phone: { contains: searchPhone } },
              { mobile: { contains: searchPhone } }
            ]
          },
          include: {
            titularMemberships: true
          }
        });

        if (person) {
          const memNum = person.titularMemberships[0]?.membershipNumber;
          const memTag = memNum ? ` (Acción #${memNum})` : '';
          contactName = `${person.firstName} ${person.paternalSurname || person.lastName || ''}${memTag}`.trim();
        } else {
          // 2. Buscar en tickets PQRS
          const ticket = await prisma.pqrsTicket.findFirst({
            where: { phone: { contains: searchPhone } },
            orderBy: { createdAt: 'desc' }
          });
          if (ticket) {
            contactName = ticket.fullName;
          } else if (!contactName || contactName === phone || /^[0-9]+$/.test(contactName)) {
            contactName = phone.startsWith('591') 
              ? `+591 ${phone.substring(3, 7)} ${phone.substring(7)}` 
              : phone.length === 8 
                ? `+591 ${phone.substring(0, 4)} ${phone.substring(4)}`
                : `+${phone}`;
          }
        }
      } catch (lookupErr) {
        contactName = phone.startsWith('591') 
          ? `+591 ${phone.substring(3, 7)} ${phone.substring(7)}` 
          : phone.length === 8 
            ? `+591 ${phone.substring(0, 4)} ${phone.substring(4)}`
            : `+${phone}`;
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

      // --- BOT CALL CENTER 24/7 (PQRS Tracker, Encuestas & Menú Inteligente) ---
      // Si esta sesión es Reservas Web (chls-reservas) o Difusión Masiva (chls-masivo), NO ejecutar lógica de bot ni menús
      if (this.clientId === 'chls-reservas' || this.clientId === 'chls-masivo') {
        return;
      }

      // Anti-Ban 1: Simular lectura humana de mensaje (ticks azules) tras un retraso orgánico
      try {
        const chatObj = await msg.getChat();
        if (chatObj) {
          const readingDelay = 1200 + Math.min(msg.body.length * 15, 2000) + Math.random() * 800;
          await new Promise(resolve => setTimeout(resolve, readingDelay));
          await chatObj.sendSeen();
        }
      } catch (seenErr) { }

      const bodyStr = msg.body.trim();

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

        // Pausa previa a redactar respuesta de encuesta
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1200));
        await this.sendMessage(msg.from, '¡Gracias por ayudarnos a mejorar! Tu calificación ha sido registrada. 🌟\n\nEscribe *MENU* si deseas realizar otra consulta.');
        return;
      }

      // Anti-Ban 2: Pausa de reflexión humana antes de formular la respuesta (1 a 2.5 segundos)
      const thinkingDelay = 1000 + Math.random() * 1500;
      await new Promise(resolve => setTimeout(resolve, thinkingDelay));

      // Procesar a través de la máquina de estados y motor de conocimientos 24/7
      const botResult = await botSessionManager.processMessage(phone, bodyStr, contactName);
      if (botResult.shouldSend && botResult.response) {
        await this.sendMessage(msg.from, botResult.response);
      }
      // --- FIN BOT LOGIC ---

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
      let chat: any = null;
      try {
        chat = await this.client.getChatById(chatId);
        if (chat) {
          // Anti-Ban 3: Simular presencia de "Escribiendo..." proporcional al mensaje
          await chat.sendStateTyping();
        }
      } catch (typingError) { }

      // Tiempo de digitación humana realista (entre 2.5s y 7.0s con variación aleatoria)
      const typingTime = Math.min(
        Math.max(content.length * (25 + Math.random() * 12), 2500),
        7000
      );
      await new Promise(resolve => setTimeout(resolve, typingTime));

      // Limpiar estado de typing antes del envío
      if (chat) {
        try { await chat.clearState(); } catch (e) { }
      }

      // Anti-Ban 4: Carácter invisible único (Zero-Width) para que el hash SHA sea siempre diferente
      const invisibleZeroWidth = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
      const uniqueNoise = invisibleZeroWidth[Math.floor(Math.random() * invisibleZeroWidth.length)];
      const finalContent = content + uniqueNoise;

      let mediaToSend: MessageMedia | undefined;
      if (mediaBase64) {
        const match = mediaBase64.match(/^data:([a-zA-Z0-9-]+\/[a-zA-Z0-9-+.]+);base64,(.+)$/);
        if (match) {
          mediaToSend = new MessageMedia(match[1], match[2]);
        }
      }

      if (mediaToSend) {
        await this.client.sendMessage(chatId, mediaToSend, { caption: finalContent });
      } else {
        await this.client.sendMessage(chatId, finalContent);
      }
    } catch (e) {
      console.error(`[${this.clientId}] Error sending direct message`, e);
    }
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
      if (!phone || phone.length > 13 || phone.length < 7) return;

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
        } else {
          const ticket = await prisma.pqrsTicket.findFirst({
            where: { phone: { contains: searchPhone } },
            orderBy: { createdAt: 'desc' }
          });
          if (ticket) {
            contactName = ticket.fullName;
          } else if (!contactName || contactName === phone || /^[0-9]+$/.test(contactName)) {
            contactName = phone.startsWith('591') 
              ? `+591 ${phone.substring(3, 7)} ${phone.substring(7)}` 
              : phone.length === 8 
                ? `+591 ${phone.substring(0, 4)} ${phone.substring(4)}`
                : `+${phone}`;
          }
        }
      } catch (err) {
        contactName = phone.startsWith('591') 
          ? `+591 ${phone.substring(3, 7)} ${phone.substring(7)}` 
          : phone.length === 8 
            ? `+591 ${phone.substring(0, 4)} ${phone.substring(4)}`
            : `+${phone}`;
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
        messageText = messageText.replace(/{codigo}/g, contact.codigo || '');
        if (link) {
          messageText += `\n\n${link}`;
        }

        // Anti-Ban 3: Caracteres invisibles aleatorios (Zero-Width) para que cada hash SHA de mensaje sea único
        const invisibleChars = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
        const randomInvisible = invisibleChars[Math.floor(Math.random() * invisibleChars.length)].repeat(Math.floor(Math.random() * 3) + 1);
        messageText += randomInvisible;

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
    this.instances.set('chls-callcenter', new WhatsappClientInstance('chls-callcenter'));
    this.instances.set('chls-masivo', new WhatsappClientInstance('chls-masivo'));
    this.instances.set('chls-reservas', new WhatsappClientInstance('chls-reservas'));
    this.instances.set('chls-pqrs', new WhatsappClientInstance('chls-pqrs'));

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

