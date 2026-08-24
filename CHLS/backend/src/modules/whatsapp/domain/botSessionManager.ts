import { prisma } from '@shared/infrastructure/prisma';
import { socketService } from '@config/socket';
import { findFaqAnswer, CHLS_KNOWLEDGE_BASE } from './faqKnowledge';

export type BotState =
  | 'MAIN_MENU'
  | 'SPORTS_MENU'
  | 'WET_AREA_MENU'
  | 'FINANCE_MENU'
  | 'FINANCE_WAITING_CI'
  | 'PQRS_MENU'
  | 'PQRS_CREATING_TYPE'
  | 'PQRS_CREATING_AREA'
  | 'PQRS_CREATING_DESC'
  | 'TRAFFIC_MENU'
  | 'PROCEDURES_MENU'
  | 'HUMAN_AGENT';

export interface UserSession {
  phone: string;
  contactName: string;
  state: BotState;
  data: Record<string, any>;
  lastActive: number;
  isHumanHandoff: boolean;
  handoffUntil?: number;
  member?: {
    id: string;
    fullName: string;
    documentId: string;
    membershipNumber?: string;
    personType: string;
  } | null;
}

export class BotSessionManager {
  private sessions: Map<string, UserSession> = new Map();
  private readonly SESSION_TIMEOUT_MS = 20 * 60 * 1000;
  private readonly HANDOFF_TIMEOUT_MS = 45 * 60 * 1000;

  public async getOrCreateSession(phone: string, contactName?: string): Promise<UserSession> {
    const cleanPhone = phone.replace(/@.*$/, '').replace(/[^0-9]/g, '');
    const now = Date.now();

    let session = this.sessions.get(cleanPhone);

    if (session) {
      if (session.isHumanHandoff && session.handoffUntil && now > session.handoffUntil) {
        session.isHumanHandoff = false;
        session.state = 'MAIN_MENU';
      } else if (!session.isHumanHandoff && (now - session.lastActive) > this.SESSION_TIMEOUT_MS) {
        session.state = 'MAIN_MENU';
        session.data = {};
      }
      session.lastActive = now;
      if (contactName && contactName !== session.contactName) {
        session.contactName = contactName;
      }
      return session;
    }

    let memberData: UserSession['member'] = null;
    try {
      const searchPhone = cleanPhone.replace(/^591/, '');
      const person = await prisma.person.findFirst({
        where: {
          OR: [
            { phone: { contains: searchPhone } },
            { mobile: { contains: searchPhone } }
          ]
        },
        include: {
          titularMemberships: true,
          beneficiaries: { include: { membership: true } }
        }
      });

      if (person) {
        const memNumber = person.titularMemberships[0]?.membershipNumber ||
          person.beneficiaries[0]?.membership?.membershipNumber || 'S/N';
        const fullName = `${person.firstName} ${person.paternalSurname || person.lastName || ''}`.trim();
        memberData = {
          id: person.id,
          fullName,
          documentId: person.documentId,
          membershipNumber: memNumber,
          personType: person.personType
        };
      }
    } catch (err) {
      console.warn('[BotSessionManager] Error buscando socio por teléfono:', err);
    }

    const resolvedName = memberData?.fullName || contactName || `Socio`;

    session = {
      phone: cleanPhone,
      contactName: resolvedName,
      state: 'MAIN_MENU',
      data: {},
      lastActive: now,
      isHumanHandoff: false,
      member: memberData
    };

    this.sessions.set(cleanPhone, session);
    return session;
  }

  public async processMessage(
    rawPhone: string,
    messageText: string,
    contactName?: string
  ): Promise<{ response: string | null; shouldSend: boolean; isHandoff: boolean }> {
    const session = await this.getOrCreateSession(rawPhone, contactName);
    const bodyStr = (messageText || '').trim();
    const cleanLower = bodyStr.toLowerCase();

    // 1. Modo Atención Humana
    if (session.isHumanHandoff) {
      if (cleanLower === 'bot' || cleanLower === 'menu' || cleanLower === 'salir' || cleanLower === 'volver') {
        session.isHumanHandoff = false;
        session.state = 'MAIN_MENU';
        session.data = {};
        const welcome = this.buildMainMenu(session);
        return {
          response: `🤖 *Atención automática reactivada.*\n\n${welcome}`,
          shouldSend: true,
          isHandoff: false
        };
      }
      return { response: null, shouldSend: false, isHandoff: true };
    }

    // 2. Comandos Globales
    if (cleanLower === 'menu' || cleanLower === 'inicio' || cleanLower === 'hola' || cleanLower === 'buenas' || cleanLower === 'ayuda') {
      session.state = 'MAIN_MENU';
      session.data = {};
      return { response: this.buildMainMenu(session), shouldSend: true, isHandoff: false };
    }

    if (cleanLower === 'humano' || cleanLower === 'asesor' || cleanLower === 'operador' || cleanLower === 'agente') {
      return this.enableHumanHandoff(session);
    }

    if (cleanLower === 'volver' || cleanLower === 'atras' || cleanLower === 'cancelar' || cleanLower === '0') {
      session.state = 'MAIN_MENU';
      session.data = {};
      return {
        response: `↩️ *Menú Principal:*\n\n` + this.buildMainMenu(session),
        shouldSend: true,
        isHandoff: false
      };
    }

    // 3. Códigos Directos (Reserva o Ticket PQRS)
    const resCodeMatch = bodyStr.match(/RES-[A-Z0-9\-]+/i) || bodyStr.match(/\bRES\d+\b/i);
    if (resCodeMatch) {
      const resReply = await this.queryReservation(resCodeMatch[0].toUpperCase());
      return { response: resReply, shouldSend: true, isHandoff: false };
    }

    const pqrsCodeMatch = bodyStr.match(/^[A-Za-z]{3}[0-9]$/);
    if (pqrsCodeMatch) {
      const pqrsReply = await this.queryPqrsTicket(pqrsCodeMatch[0].toUpperCase());
      return { response: pqrsReply, shouldSend: true, isHandoff: false };
    }

    // 4. Procesar según Estado Actual
    switch (session.state) {
      case 'MAIN_MENU':
        return await this.handleMainMenuInput(session, bodyStr);

      case 'SPORTS_MENU':
        return await this.handleSportsMenuInput(session, bodyStr);

      case 'WET_AREA_MENU':
        return await this.handleWetAreaMenuInput(session, bodyStr);

      case 'FINANCE_MENU':
        return await this.handleFinanceMenuInput(session, bodyStr);

      case 'FINANCE_WAITING_CI':
        return await this.handleFinanceWaitingCi(session, bodyStr);

      case 'PQRS_MENU':
        return await this.handlePqrsMenuInput(session, bodyStr);

      case 'PQRS_CREATING_TYPE':
      case 'PQRS_CREATING_AREA':
      case 'PQRS_CREATING_DESC':
        return await this.handlePqrsCreationFlow(session, bodyStr);

      case 'TRAFFIC_MENU':
        return await this.handleTrafficMenuInput(session, bodyStr);

      case 'PROCEDURES_MENU':
        return await this.handleProceduresMenuInput(session, bodyStr);

      default:
        session.state = 'MAIN_MENU';
        return { response: this.buildMainMenu(session), shouldSend: true, isHandoff: false };
    }
  }

  // =========================================================================
  // MENÚ PRINCIPAL (MINIMALISTA Y VISUAL)
  // =========================================================================

  private buildMainMenu(session: UserSession): string {
    const greetingName = session.member?.fullName || session.contactName;
    const isMember = !!session.member;
    const memberTag = isMember 
      ? `🎖️ *Socio Acción #${session.member?.membershipNumber}*` 
      : `👋 *Atención al Socio / Visitantes*`;

    return `🏆 *CLUB HÍPICO LOS SARGENTOS*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `¡Hola *${greetingName}*!\n${memberTag}\n\n` +
      `Elige una opción:\n\n` +
      `1️⃣ 💳 *Consultar mi Deuda y Saldo Actual*\n` +
      `2️⃣ 🎾 *Canchas y Deportes*\n` +
      `3️⃣ 🏊‍♂️ *Piscina y Saunas*\n` +
      `4️⃣ 📋 *Reclamos y Sugerencias (PQRS)*\n` +
      `5️⃣ 🚗 *Parqueos y Tránsito*\n` +
      `6️⃣ 👨‍👩‍👧 *Trámites y Dependientes*\n` +
      `7️⃣ ℹ️ *Información y Contactos*\n` +
      `8️⃣ 👤 *Hablar con un Asesor*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💡 _O escribe directamente tu consulta._`;
  }

  private async handleMainMenuInput(
    session: UserSession,
    input: string
  ): Promise<{ response: string; shouldSend: boolean; isHandoff: boolean }> {
    const cleanInput = input.trim();
    const choice = cleanInput.replace(/[\[\]]/g, '').trim();

    if (choice === '1' || cleanInput.toLowerCase().includes('deuda') || cleanInput.toLowerCase().includes('saldo')) {
      if (session.data?.authVerified && session.member) {
        const debtReport = await this.getMemberDebtReport(session.member.id);
        return { response: `${debtReport}\n\n0️⃣ ↩️ Volver | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
      }
      session.state = 'FINANCE_WAITING_CI';
      return {
        response: `🔒 *VERIFICACIÓN DE SEGURIDAD*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `Por favor, escribe tu número de *Carnet de Identidad (CI)* o N° de Acción para consultar tu estado de cuenta:\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `0️⃣ ↩️ Cancelar`,
        shouldSend: true,
        isHandoff: false
      };
    }

    if (choice === '2') {
      session.state = 'SPORTS_MENU';
      return { response: this.buildSportsMenu(), shouldSend: true, isHandoff: false };
    }

    if (choice === '3') {
      session.state = 'WET_AREA_MENU';
      return { response: this.buildWetAreaMenu(), shouldSend: true, isHandoff: false };
    }

    if (choice === '4') {
      session.state = 'PQRS_MENU';
      return { response: this.buildPqrsMenu(), shouldSend: true, isHandoff: false };
    }

    if (choice === '5') {
      session.state = 'TRAFFIC_MENU';
      return { response: this.buildTrafficMenu(), shouldSend: true, isHandoff: false };
    }

    if (choice === '6') {
      session.state = 'PROCEDURES_MENU';
      return { response: this.buildProceduresMenu(), shouldSend: true, isHandoff: false };
    }

    if (choice === '7') {
      const topic = CHLS_KNOWLEDGE_BASE.find(t => t.id === 'informacion-institucional');
      return {
        response: `${topic?.response || ''}\n\n0️⃣ ↩️ *Menú Principal*`,
        shouldSend: true,
        isHandoff: false
      };
    }

    if (choice === '8') {
      return this.enableHumanHandoff(session);
    }

    // NLP Matching
    const match = findFaqAnswer(input);
    if (match) {
      return {
        response: `${match.topic.response}\n\n━━━━━━━━━━━━━━━\n0️⃣ ↩️ *Menú Principal*`,
        shouldSend: true,
        isHandoff: false
      };
    }

    return {
      response: `🤔 Opción no reconocida. Elige del *1 al 8*:\n\n` + this.buildMainMenu(session),
      shouldSend: true,
      isHandoff: false
    };
  }

  // =========================================================================
  // SUBMENÚ DEPORTES (1 PANTALLA Y 1 DISCIPLINA A LA VEZ)
  // =========================================================================

  private buildSportsMenu(): string {
    return `🎾 *DEPORTES Y CANCHAS* 🏆\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Selecciona la disciplina deportiva:\n\n` +
      `1️⃣ 🎾 *Tenis*\n` +
      `2️⃣ 🎾 *Pádel*\n` +
      `3️⃣ 🏓 *Racquetball*\n` +
      `4️⃣ 🧱 *Frontón*\n` +
      `5️⃣ ⚽ *Polifuncional (Futsal/Vóley/Básquet)*\n` +
      `6️⃣ 🏋️ *Entrenadores Externos (Gimnasio)*\n` +
      `7️⃣ 🔍 *Consultar Código de Reserva (RES-...)*\n` +
      `0️⃣ ↩️ *Menú Principal*\n` +
      `━━━━━━━━━━━━━━━━━━━━`;
  }

  private async handleSportsMenuInput(session: UserSession, input: string) {
    const choice = input.trim();

    if (choice === '1') {
      const topic = CHLS_KNOWLEDGE_BASE.find(t => t.id === 'deporte-tenis');
      return { response: `${topic?.response}\n\n0️⃣ ↩️ Volver a Deportes | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
    }
    if (choice === '2') {
      const topic = CHLS_KNOWLEDGE_BASE.find(t => t.id === 'deporte-padel');
      return { response: `${topic?.response}\n\n0️⃣ ↩️ Volver a Deportes | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
    }
    if (choice === '3') {
      const topic = CHLS_KNOWLEDGE_BASE.find(t => t.id === 'deporte-racquet');
      return { response: `${topic?.response}\n\n0️⃣ ↩️ Volver a Deportes | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
    }
    if (choice === '4') {
      const topic = CHLS_KNOWLEDGE_BASE.find(t => t.id === 'deporte-fronton');
      return { response: `${topic?.response}\n\n0️⃣ ↩️ Volver a Deportes | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
    }
    if (choice === '5') {
      const topic = CHLS_KNOWLEDGE_BASE.find(t => t.id === 'deporte-polifuncional');
      return { response: `${topic?.response}\n\n0️⃣ ↩️ Volver a Deportes | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
    }
    if (choice === '6') {
      const topic = CHLS_KNOWLEDGE_BASE.find(t => t.id === 'entrenadores-personales-externos');
      return { response: `${topic?.response}\n\n0️⃣ ↩️ Volver a Deportes | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
    }
    if (choice === '7') {
      return {
        response: `🔍 *CONSULTA DE RESERVA DE CANCHA*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `Escribe tu código de reserva:\n` +
          `👉 Ejemplo: *RES-TEN-1042* o *RES-84920*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `0️⃣ ↩️ Volver a Deportes`,
        shouldSend: true,
        isHandoff: false
      };
    }
    if (choice === '0') {
      session.state = 'MAIN_MENU';
      return { response: this.buildMainMenu(session), shouldSend: true, isHandoff: false };
    }

    const match = findFaqAnswer(input);
    if (match) {
      return { response: `${match.topic.response}\n\n0️⃣ ↩️ Volver a Deportes | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
    }

    return { response: `Opción no válida.\n\n` + this.buildSportsMenu(), shouldSend: true, isHandoff: false };
  }

  // =========================================================================
  // SUBMENÚ ÁREA HÚMEDA
  // =========================================================================

  private buildWetAreaMenu(): string {
    return `🏊‍♂️ *ÁREA HÚMEDA (PISCINA Y SAUNAS)* ♨️\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `Selecciona una opción:\n\n` +
      `1️⃣ ⏰ *Horarios de Atención*\n` +
      `2️⃣ 💵 *Tarifas de Invitados*\n` +
      `3️⃣ 🩱 *Indumentaria y Normas de Higiene*\n` +
      `0️⃣ ↩️ *Menú Principal*\n` +
      `━━━━━━━━━━━━━━━━━━━━`;
  }

  private async handleWetAreaMenuInput(session: UserSession, input: string) {
    const choice = input.trim();
    if (choice === '1') {
      const topic = CHLS_KNOWLEDGE_BASE.find(t => t.id === 'horarios-area-humeda');
      return { response: `${topic?.response}\n\n0️⃣ ↩️ Volver | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
    }
    if (choice === '2') {
      const topic = CHLS_KNOWLEDGE_BASE.find(t => t.id === 'tarifas-invitados-area-humeda');
      return { response: `${topic?.response}\n\n0️⃣ ↩️ Volver | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
    }
    if (choice === '3') {
      const topic = CHLS_KNOWLEDGE_BASE.find(t => t.id === 'normas-indumentaria-piscina');
      return { response: `${topic?.response}\n\n0️⃣ ↩️ Volver | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
    }
    if (choice === '0') {
      session.state = 'MAIN_MENU';
      return { response: this.buildMainMenu(session), shouldSend: true, isHandoff: false };
    }

    const match = findFaqAnswer(input);
    if (match) {
      return { response: `${match.topic.response}\n\n0️⃣ ↩️ Volver | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
    }

    return { response: `Opción no válida.\n\n` + this.buildWetAreaMenu(), shouldSend: true, isHandoff: false };
  }

  // =========================================================================
  // SUBMENÚ FINANZAS / CUOTAS
  // =========================================================================

  private async buildFinanceMenu(session: UserSession): Promise<string> {
    const memLabel = session.member ? `(Acción #${session.member.membershipNumber})` : '';

    return `💳 *CUOTAS Y ESTADO DE CUENTA* 🏛️\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `1️⃣ 📊 *Consultar mi Deuda y Saldo Actual* ${memLabel}\n` +
      `2️⃣ 🗓️ *Vencimientos, Mora y Reversión (Estatuto)*\n` +
      `3️⃣ ✈️ *Socio Ausente (50% Cuota Social)*\n` +
      `4️⃣ 🌟 *Beneficios para Hijos de Socios*\n` +
      `0️⃣ ↩️ *Menú Principal*\n` +
      `━━━━━━━━━━━━━━━━━━━━`;
  }

  private async handleFinanceMenuInput(session: UserSession, input: string) {
    const choice = input.trim();

    if (choice === '1') {
      if (session.data?.authVerified && session.member) {
        const debtReport = await this.getMemberDebtReport(session.member.id);
        return { response: `${debtReport}\n\n0️⃣ ↩️ Volver | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
      }
      session.state = 'FINANCE_WAITING_CI';
      return {
        response: `🔒 *VERIFICACIÓN DE SEGURIDAD*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `Por favor, escribe tu número de *Carnet de Identidad (CI)* o N° de Acción:\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `0️⃣ ↩️ Cancelar`,
        shouldSend: true,
        isHandoff: false
      };
    }

    if (choice === '2') {
      const topic = CHLS_KNOWLEDGE_BASE.find(t => t.id === 'cuotas-mora-reversion');
      return { response: `${topic?.response}\n\n0️⃣ ↩️ Volver | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
    }

    if (choice === '3') {
      const topic = CHLS_KNOWLEDGE_BASE.find(t => t.id === 'socio-ausente-requisitos');
      return { response: `${topic?.response}\n\n0️⃣ ↩️ Volver | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
    }

    if (choice === '4') {
      const topic = CHLS_KNOWLEDGE_BASE.find(t => t.id === 'beneficio-hijos-socios');
      return { response: `${topic?.response}\n\n0️⃣ ↩️ Volver | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
    }

    if (choice === '0') {
      session.state = 'MAIN_MENU';
      return { response: this.buildMainMenu(session), shouldSend: true, isHandoff: false };
    }

    const match = findFaqAnswer(input);
    if (match) {
      return { response: `${match.topic.response}\n\n0️⃣ ↩️ Volver | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
    }

    return { response: `Opción no válida.\n\n` + (await this.buildFinanceMenu(session)), shouldSend: true, isHandoff: false };
  }

  private async handleFinanceWaitingCi(session: UserSession, input: string) {
    const rawCi = input.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    try {
      const person = await prisma.person.findFirst({
        where: {
          OR: [
            { documentId: { contains: rawCi } },
            { titularMemberships: { some: { membershipNumber: { contains: rawCi } } } }
          ]
        },
        include: {
          titularMemberships: true
        }
      });

      if (!person) {
        return {
          response: `❌ No se encontró socio con documento *"${input.trim()}"*.\n\nIntenta de nuevo o escribe *0* para volver.`,
          shouldSend: true,
          isHandoff: false
        };
      }

      session.member = {
        id: person.id,
        fullName: `${person.firstName} ${person.paternalSurname || person.lastName || ''}`.trim(),
        documentId: person.documentId,
        membershipNumber: person.titularMemberships[0]?.membershipNumber || 'S/N',
        personType: person.personType
      };
      session.data.authVerified = true;
      session.state = 'FINANCE_MENU';

      const debtReport = await this.getMemberDebtReport(person.id);
      return {
        response: `✅ *IDENTIDAD VERIFICADA*\n\n${debtReport}\n\n0️⃣ ↩️ Volver | 🏠 *MENU*`,
        shouldSend: true,
        isHandoff: false
      };
    } catch (err) {
      return {
        response: `Error consultando datos. Escribe *'HUMANO'* para hablar con Caja.`,
        shouldSend: true,
        isHandoff: false
      };
    }
  }

  private async getMemberDebtReport(personId: string): Promise<string> {
    try {
      const person = await prisma.person.findUnique({
        where: { id: personId },
        include: {
          titularMemberships: { include: { type: true } },
          socialFeeAccruals: {
            where: { status: { in: ['PENDIENTE', 'PARCIAL'] } },
            orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }]
          }
        }
      });

      if (!person) return 'No se encontró la ficha del socio.';

      const membership = person.titularMemberships?.[0];
      const unpaidFees = person.socialFeeAccruals || [];
      const totalUnpaid = unpaidFees.reduce((acc: number, f: any) => acc + Number(f.residualBalance || f.baseAmount || 0), 0);

      let msg = `👤 *Socio:* ${person.firstName} ${person.paternalSurname || person.lastName || ''}\n`;
      msg += `🎖️ *Acción:* #${membership?.membershipNumber || 'S/N'}\n`;
      msg += `📊 *Estado:* ${membership?.status || 'ACTIVA'}\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━\n`;

      if (unpaidFees.length === 0 && totalUnpaid === 0) {
        msg += `🟢 *¡Estás al día en tus cuotas sociales!*\nMuchas gracias por tu puntualidad. ✨\n`;
      } else {
        msg += `⚠️ *Cuotas Pendientes:*\n`;
        for (const fee of unpaidFees.slice(0, 4)) {
          msg += `• *${fee.periodLabel || `Mes ${fee.periodMonth}/${fee.periodYear}`}:* Bs. ${Number(fee.residualBalance || fee.baseAmount).toFixed(2)}\n`;
        }
        if (unpaidFees.length > 4) {
          msg += `• _... y ${unpaidFees.length - 4} cuotas más._\n`;
        }
        msg += `\n💰 *Total Adeudado:* *Bs. ${totalUnpaid.toFixed(2)}*\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `📌 *Pago QR/Transferencia:* Coloca en la glosa tu N° de Acción *${membership?.membershipNumber || ''}* y envía tu comprobante aquí.`;
      }

      return msg;
    } catch (e) {
      return 'No se pudo calcular la deuda en este momento.';
    }
  }

  // =========================================================================
  // SUBMENÚ PQRS
  // =========================================================================

  private buildPqrsMenu(): string {
    return `📋 *SISTEMA DE ATENCIÓN Y RECLAMOS (PQRS)* ✍️\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `1️⃣ 📝 *Registrar Nuevo Caso* (Reclamo, Consulta, Sugerencia)\n` +
      `2️⃣ 🔍 *Consultar Estado de mi Caso* (Código ej: MLG1)\n` +
      `0️⃣ ↩️ *Menú Principal*\n` +
      `━━━━━━━━━━━━━━━━━━━━`;
  }

  private async handlePqrsMenuInput(session: UserSession, input: string) {
    const choice = input.trim();

    if (choice === '1') {
      session.state = 'PQRS_CREATING_TYPE';
      session.data.newPqrs = {
        fullName: session.member?.fullName || session.contactName,
        phone: session.phone,
        memberCode: session.member?.membershipNumber || null,
        applicantCondition: session.member ? 'ASOCIADO' : 'PARTICIPANTE_NO_ASOCIADO'
      };
      return {
        response: `📝 *NUEVO CASO PQRS (Paso 1 de 3)*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `Selecciona el tipo de requerimiento:\n\n` +
          `1️⃣ ⚠️ *Reclamo*\n` +
          `2️⃣ ❓ *Consulta*\n` +
          `3️⃣ 💡 *Sugerencia*\n` +
          `4️⃣ 🌟 *Felicitación*\n` +
          `0️⃣ ↩️ *Cancelar*`,
        shouldSend: true,
        isHandoff: false
      };
    }

    if (choice === '2') {
      return {
        response: `🔍 *CONSULTAR ESTADO PQRS*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `Escribe tu código de seguimiento:\n` +
          `👉 Ejemplo: *MLG1* o *PQR-1002*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `0️⃣ ↩️ Cancelar`,
        shouldSend: true,
        isHandoff: false
      };
    }

    if (choice === '0') {
      session.state = 'MAIN_MENU';
      return { response: this.buildMainMenu(session), shouldSend: true, isHandoff: false };
    }

    const match = findFaqAnswer(input);
    if (match) {
      return { response: `${match.topic.response}\n\n0️⃣ ↩️ Volver | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
    }

    return { response: `Opción no válida.\n\n` + this.buildPqrsMenu(), shouldSend: true, isHandoff: false };
  }

  private async handlePqrsCreationFlow(session: UserSession, input: string) {
    const text = input.trim();

    if (text === '0' || text.toLowerCase() === 'cancelar') {
      session.state = 'PQRS_MENU';
      session.data.newPqrs = null;
      return { response: `❌ Registro cancelado.\n\n` + this.buildPqrsMenu(), shouldSend: true, isHandoff: false };
    }

    if (session.state === 'PQRS_CREATING_TYPE') {
      const typeMap: Record<string, string> = {
        '1': 'RECLAMO',
        '2': 'CONSULTA',
        '3': 'SUGERENCIA',
        '4': 'FELICITACION'
      };
      const selectedType = typeMap[text];
      if (!selectedType) {
        return { response: `Elige del *1 al 4* (o *0* para cancelar).`, shouldSend: true, isHandoff: false };
      }

      session.data.newPqrs.type = selectedType;
      session.state = 'PQRS_CREATING_AREA';

      return {
        response: `🏢 *SELECCIÓN DE ÁREA (Paso 2 de 3)*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `1️⃣ 🏊‍♂️ *Área Húmeda y Piscina*\n` +
          `2️⃣ 🎾 *Tenis y Deportes*\n` +
          `3️⃣ 🏋️ *Gimnasio*\n` +
          `4️⃣ 🍽️ *Restaurante / Concesionarios*\n` +
          `5️⃣ 🚗 *Portería y Parqueos*\n` +
          `6️⃣ 💳 *Caja y Administración*\n` +
          `7️⃣ 🧱 *Mantenimiento*\n` +
          `8️⃣ 🌐 *Atención General*\n` +
          `0️⃣ ↩️ *Cancelar*`,
        shouldSend: true,
        isHandoff: false
      };
    }

    if (session.state === 'PQRS_CREATING_AREA') {
      const areaMap: Record<string, string> = {
        '1': 'AREA_HUMEDA',
        '2': 'DEPORTES_TENIS',
        '3': 'GIMNASIO',
        '4': 'RESTAURANTE',
        '5': 'SEGURIDAD_PORTERIA',
        '6': 'ADMINISTRACION_CAJA',
        '7': 'MANTENIMIENTO',
        '8': 'GENERAL'
      };
      const selectedArea = areaMap[text];
      if (!selectedArea) {
        return { response: `Elige del *1 al 8* (o *0* para cancelar).`, shouldSend: true, isHandoff: false };
      }

      session.data.newPqrs.area = selectedArea;
      session.state = 'PQRS_CREATING_DESC';

      return {
        response: `✍️ *DETALLE DE TU SOLICITUD (Paso 3 de 3)*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `Por favor escribe en un solo mensaje la descripción de tu ${session.data.newPqrs.type.toLowerCase()}:`,
        shouldSend: true,
        isHandoff: false
      };
    }

    if (session.state === 'PQRS_CREATING_DESC') {
      if (text.length < 5) {
        return { response: `Por favor escribe una descripción un poco más detallada.`, shouldSend: true, isHandoff: false };
      }

      session.data.newPqrs.description = text;

      try {
        const count = await prisma.pqrsTicket.count();
        const code = `PQRS-${1000 + count + 1}`;

        const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const numbers = '23456789';
        let trackingCode = '';
        for (let i = 0; i < 3; i++) trackingCode += letters.charAt(Math.floor(Math.random() * letters.length));
        trackingCode += numbers.charAt(Math.floor(Math.random() * numbers.length));

        const ticket = await prisma.pqrsTicket.create({
          data: {
            code,
            trackingCode,
            fullName: session.data.newPqrs.fullName,
            phone: session.data.newPqrs.phone,
            email: session.data.newPqrs.email || null,
            memberCode: session.data.newPqrs.memberCode,
            type: session.data.newPqrs.type,
            area: session.data.newPqrs.area,
            applicantCondition: session.data.newPqrs.applicantCondition,
            description: session.data.newPqrs.description,
            status: 'ABIERTO',
            priority: 'MEDIA'
          }
        });

        await prisma.pqrsHistory.create({
          data: {
            ticketId: ticket.id,
            action: 'CREADO',
            description: `Ticket vía WhatsApp Bot 24/7. Área: ${ticket.area}, Tipo: ${ticket.type}`,
            performedBy: `${ticket.fullName} (WhatsApp)`
          }
        });

        try {
          socketService.getIo()?.emit('pqrs:ticket_created', ticket);
        } catch (sockErr) { }

        session.state = 'MAIN_MENU';
        session.data.newPqrs = null;

        return {
          response: `🎉 *¡CASO REGISTRADO!* 📨\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `🔖 *N° Ticket:* ${ticket.code}\n` +
            `🔑 *Seguimiento:* *${ticket.trackingCode}*\n` +
            `📂 *Tipo:* ${ticket.type}\n` +
            `🏢 *Área:* ${ticket.area}\n` +
            `📊 *Estado:* ABIERTO\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📌 _Escribe tu código *${ticket.trackingCode}* en cualquier momento para ver avances._\n\n` +
            `0️⃣ ↩️ *Menú Principal*`,
          shouldSend: true,
          isHandoff: false
        };
      } catch (err) {
        session.state = 'MAIN_MENU';
        return {
          response: `❌ Error al guardar. Escribe *'HUMANO'* para hablar con un asesor.`,
          shouldSend: true,
          isHandoff: false
        };
      }
    }

    return { response: this.buildPqrsMenu(), shouldSend: true, isHandoff: false };
  }

  // =========================================================================
  // SUBMENÚ TRÁNSITO
  // =========================================================================

  private buildTrafficMenu(): string {
    return `🚗 *PARQUEOS Y CIRCULACIÓN CHLS* 🅿️\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `1️⃣ 🛑 *Velocidad (15 km/h) y Prohibición de Mascotas*\n` +
      `2️⃣ ⚠️ *Catálogo de Multas e Infracciones*\n` +
      `3️⃣ ⚖️ *Impugnación de Boleta (Recurso 48h)*\n` +
      `0️⃣ ↩️ *Menú Principal*\n` +
      `━━━━━━━━━━━━━━━━━━━━`;
  }

  private async handleTrafficMenuInput(session: UserSession, input: string) {
    const choice = input.trim();
    if (choice === '1' || choice === '2') {
      const topic = CHLS_KNOWLEDGE_BASE.find(t => t.id === 'normas-circulacion-parqueos');
      return { response: `${topic?.response}\n\n0️⃣ ↩️ Volver | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
    }
    if (choice === '3') {
      return {
        response: `⚖️ *RECURSO DE REVISIÓN (Art. 15)*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `• *Plazo:* *48 horas* desde la emisión de la boleta.\n` +
          `• *Instancia:* Ante *Gerencia General*.\n` +
          `• *Requisito:* Prueba material (videos/grabaciones).\n` +
          `• *Fallo:* Resolución en 48 horas.\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `0️⃣ ↩️ Volver | 🏠 *MENU*`,
        shouldSend: true,
        isHandoff: false
      };
    }
    if (choice === '0') {
      session.state = 'MAIN_MENU';
      return { response: this.buildMainMenu(session), shouldSend: true, isHandoff: false };
    }

    const match = findFaqAnswer(input);
    if (match) {
      return { response: `${match.topic.response}\n\n0️⃣ ↩️ Volver | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
    }

    return { response: `Opción no válida.\n\n` + this.buildTrafficMenu(), shouldSend: true, isHandoff: false };
  }

  // =========================================================================
  // SUBMENÚ TRÁMITES
  // =========================================================================

  private buildProceduresMenu(): string {
    return `👨‍👩‍👧 *TRÁMITES Y AFILIACIONES CHLS* 📜\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `1️⃣ 👰 *Afiliación Cónyuge e Hijos (<25 años)*\n` +
      `2️⃣ 🧓 *Invitados Sin Cargo Padres/Suegros (65+ años)*\n` +
      `3️⃣ 🌟 *Beneficios para Hijos de Socios (Art. 18)*\n` +
      `4️⃣ ⚖️ *Recurso de Reconsideración (10 días)*\n` +
      `0️⃣ ↩️ *Menú Principal*\n` +
      `━━━━━━━━━━━━━━━━━━━━`;
  }

  private async handleProceduresMenuInput(session: UserSession, input: string) {
    const choice = input.trim();
    if (choice === '1') {
      const topic = CHLS_KNOWLEDGE_BASE.find(t => t.id === 'afiliacion-dependientes');
      return { response: `${topic?.response}\n\n0️⃣ ↩️ Volver | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
    }
    if (choice === '2') {
      const topic = CHLS_KNOWLEDGE_BASE.find(t => t.id === 'invitados-sin-cargo-padres');
      return { response: `${topic?.response}\n\n0️⃣ ↩️ Volver | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
    }
    if (choice === '3') {
      const topic = CHLS_KNOWLEDGE_BASE.find(t => t.id === 'beneficio-hijos-socios');
      return { response: `${topic?.response}\n\n0️⃣ ↩️ Volver | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
    }
    if (choice === '4') {
      return {
        response: `⚖️ *RECONSIDERACIÓN DISCIPLINARIA (Art. 105)*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `• *Plazo:* *10 días calendario* desde notificación.\n` +
          `• *Instancia:* Ante Directorio / *Tribunal de Honor*.\n` +
          `• *Efecto:* Suspende la sanción hasta fallo final.\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `0️⃣ ↩️ Volver | 🏠 *MENU*`,
        shouldSend: true,
        isHandoff: false
      };
    }
    if (choice === '0') {
      session.state = 'MAIN_MENU';
      return { response: this.buildMainMenu(session), shouldSend: true, isHandoff: false };
    }

    const match = findFaqAnswer(input);
    if (match) {
      return { response: `${match.topic.response}\n\n0️⃣ ↩️ Volver | 🏠 *MENU*`, shouldSend: true, isHandoff: false };
    }

    return { response: `Opción no válida.\n\n` + this.buildProceduresMenu(), shouldSend: true, isHandoff: false };
  }

  // =========================================================================
  // HANDOFF HUMANO
  // =========================================================================

  private enableHumanHandoff(session: UserSession): { response: string; shouldSend: boolean; isHandoff: boolean } {
    session.isHumanHandoff = true;
    session.handoffUntil = Date.now() + this.HANDOFF_TIMEOUT_MS;
    session.state = 'HUMAN_AGENT';

    return {
      response: `👤 *TRANSFERENCIA A ATENCIÓN HUMANA* 🎧\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `Te estamos comunicando con un operador de Atención al Socio del Club.\n\n` +
        `⏰ *Horario:* Lun a Sáb de 08:00 a 18:00.\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📌 _El bot se mantendrá pausado. Escribe *'BOT'* o *'MENU'* para reactivarlo._`,
      shouldSend: true,
      isHandoff: true
    };
  }

  // =========================================================================
  // CONSULTAS DIRECTAS
  // =========================================================================

  public async queryReservation(code: string): Promise<string> {
    try {
      const reservation = await prisma.courtReservation.findFirst({
        where: {
          OR: [
            { code: code },
            { code: { contains: code } },
            { id: { startsWith: code.replace('RES-', '').toLowerCase() } }
          ]
        },
        include: { court: true }
      });

      if (!reservation) {
        return `❌ No encontramos una reserva activa con el código *${code}*.\n\nVerifica el código o consulta en caseta deportiva.`;
      }

      const isVerified = reservation.paymentStatus === 'VERIFIED';
      const isPaid = reservation.paymentStatus === 'PAID';

      const statusBadge = isVerified
        ? '🟢 CONSOLIDADA (Pago Verificado)'
        : isPaid
        ? '🟡 EN REVISIÓN (Comprobante Recibido)'
        : '🟠 PENDIENTE DE PAGO';

      let reply = `🏆 *CLUB HÍPICO LOS SARGENTOS*\n` +
        `🎾 *RESERVA: ${reservation.code || code}*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 *Socio:* ${reservation.memberName}\n` +
        `🏟️ *Cancha:* ${reservation.court.name} (${reservation.court.sport})\n` +
        `📅 *Fecha:* ${reservation.date}\n` +
        `⏰ *Horario:* ${reservation.startTime} a ${reservation.endTime}\n` +
        `💰 *Monto:* Bs. ${reservation.totalPrice}\n` +
        `📊 *Estado:* ${statusBadge}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n`;

      if (isVerified) {
        reply += `✅ *¡Turno 100% confirmado!* Que disfrutes tu partido. 🥇✨`;
      } else if (isPaid) {
        reply += `⏳ *Comprobante en validación por Administración.*`;
      } else {
        reply += `📌 *Para confirmar:* Paga por QR/Transferencia con glosa *${reservation.code || code}* y adjunta tu comprobante aquí.`;
      }

      return reply;
    } catch (e) {
      return `Error al consultar la reserva. Intenta más tarde.`;
    }
  }

  public async queryPqrsTicket(trackingCode: string): Promise<string> {
    try {
      const ticket = await prisma.pqrsTicket.findFirst({
        where: { trackingCode },
        include: { history: { orderBy: { createdAt: 'desc' } } }
      });

      if (!ticket) {
        return `❌ No encontramos un caso con código *${trackingCode}*.`;
      }

      const relevantHistory = ticket.history.filter((h: any) =>
        !['RECIBIDO', 'WHATSAPP_ENVIADO', 'INFO_ACTUALIZADA', 'CREADO'].includes(h.action)
      );

      const recentHistory = relevantHistory.length > 0 ? relevantHistory[0].description : 'En revisión por el área correspondiente.';
      let cleanHistory = recentHistory
        .replace(/Instrucciones\/Nota:/g, '')
        .replace(/Nota de Resolución:/g, '')
        .replace(/\n?Prioridad actualizada a:.*?(\n|$)/g, '\n')
        .replace(/\n?Derivado a:.*?(\n|$)/g, '\n')
        .replace(/\n?El estado del ticket cambió a.*?(\n|$)/g, '\n')
        .trim();

      if (!cleanHistory) cleanHistory = 'En proceso de revisión.';

      const formatText = (t?: string | null) => {
        if (!t) return '';
        return t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
      };

      let reply = `📋 *CASO PQRS: ${ticket.code}*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🔑 *Seguimiento:* *${ticket.trackingCode}*\n` +
        `📂 *Tipo:* ${formatText(ticket.type)}\n` +
        `🏢 *Área:* ${formatText(ticket.area) || 'General'}\n` +
        `📊 *Estado:* *${formatText(ticket.status)}*\n` +
        `📝 *Detalle:* ${ticket.description}\n` +
        `🔄 *Último Avance:* ${cleanHistory}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n`;

      if (ticket.status === 'RESUELTO' || ticket.status === 'CERRADO') {
        reply += `✅ *Caso Resuelto.*`;
      } else {
        reply += `⏳ _En gestión por nuestro equipo._`;
      }

      return reply;
    } catch (e) {
      return `Error al consultar el ticket.`;
    }
  }

  public getSessionInfo(phone: string): { isHumanHandoff: boolean; state: BotState; member: any } | null {
    const cleanPhone = phone.replace(/@.*$/, '').replace(/[^0-9]/g, '');
    const session = this.sessions.get(cleanPhone);
    if (!session) return null;
    return {
      isHumanHandoff: session.isHumanHandoff,
      state: session.state,
      member: session.member
    };
  }

  public setHandoff(phone: string, active: boolean) {
    const cleanPhone = phone.replace(/@.*$/, '').replace(/[^0-9]/g, '');
    let session = this.sessions.get(cleanPhone);
    if (!session) {
      session = {
        phone: cleanPhone,
        contactName: cleanPhone,
        state: active ? 'HUMAN_AGENT' : 'MAIN_MENU',
        data: {},
        lastActive: Date.now(),
        isHumanHandoff: active,
        member: null
      };
      this.sessions.set(cleanPhone, session);
    } else {
      session.isHumanHandoff = active;
      session.state = active ? 'HUMAN_AGENT' : 'MAIN_MENU';
      if (active) {
        session.handoffUntil = Date.now() + this.HANDOFF_TIMEOUT_MS;
      }
    }
  }
}

export const botSessionManager = new BotSessionManager();
