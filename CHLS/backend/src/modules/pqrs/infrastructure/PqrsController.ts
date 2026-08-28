import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { whatsappManager } from '../../whatsapp/infrastructure/whatsappService';

const prisma = new PrismaClient();

export class PqrsController {
  
  // Public Endpoint: Crear un nuevo ticket PQRS
  async createTicket(req: Request, res: Response) {
    try {
      const {
        fullName,
        phone,
        email,
        memberCode,
        type,
        area,
        applicantCondition,
        description,
      } = req.body;

      if (applicantCondition?.toLowerCase().includes('socio') && !memberCode) {
        return res.status(400).json({ error: 'El código de socio es obligatorio cuando el solicitante es Socio.' });
      }

      if (description && description.length > 2000) {
        return res.status(400).json({ error: 'La descripción es demasiado larga. Por favor, resúmela en menos de 2000 caracteres.' });
      }

      // Validación Anti-Spam: Máximo 2 solicitudes en el último minuto (60 segundos)
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const orConditions = [];
      if (phone) orConditions.push({ phone });
      if (email) orConditions.push({ email });
      if (memberCode) orConditions.push({ memberCode });

      if (orConditions.length > 0) {
        const recentTickets = await prisma.pqrsTicket.count({
          where: {
            OR: orConditions,
            createdAt: { gte: oneMinuteAgo }
          }
        });

        if (recentTickets >= 2) {
          return res.status(429).json({ error: 'Has enviado demasiadas solicitudes en muy poco tiempo. Por favor, espera un momento antes de volver a intentarlo.' });
        }
      }

      const finalMemberCode = applicantCondition === 'ASOCIADO' || applicantCondition?.toLowerCase().includes('socio') 
        ? memberCode 
        : null;

      // Generar código único básico y código de seguimiento
      const count = await prisma.pqrsTicket.count();
      const code = `PQRS-${1000 + count + 1}`;
      const generateTrackingCode = () => {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        let code = '';
        for (let i = 0; i < 3; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
        code += numbers.charAt(Math.floor(Math.random() * numbers.length));
        return code;
      };
      const trackingCode = generateTrackingCode();

      const ticket = await prisma.pqrsTicket.create({
        data: {
          code,
          trackingCode,
          fullName,
          phone,
          email,
          memberCode: finalMemberCode,
          type,
          area,
          applicantCondition,
          description,
          status: 'ABIERTO',
        },
      });

      await prisma.pqrsHistory.create({
        data: {
          ticketId: ticket.id,
          action: 'CREADO',
          description: `Ticket PQRS creado vía formulario web. Área: ${area || 'N/A'}, Tipo: ${type}`,
          performedBy: fullName,
        }
      });

      // Enviar WhatsApp automático de confirmación si hay teléfono
      if (phone) {
        try {
          const whatsappService = whatsappManager.getInstance('chls-pqrs');
          const message = `Estimado socio 🙂, le escribimos del *Área de Atención al Socio* para confirmar que hemos recibido su ${type.toLowerCase()} en el "${code}".\n\nNuestro equipo ya se encuentra gestionando su solicitud con el área correspondiente para brindarle una respuesta a la brevedad posible, recuerde que con este codigo *${trackingCode}*, puede consultar el estado de su ${type.toLowerCase()} en este chat en cualquier momento, gracias a nuestro nuevo sistema *CLUB INTELIGENTE*.\n\nGracias por ayudarnos a mejorar y seguir construyendo juntos un mejor Club ✨`;
          const formattedPhone = phone.startsWith('591') ? phone : `591${phone}`;
          await whatsappService.sendMessage(formattedPhone, message);

          await prisma.pqrsHistory.create({
            data: {
              ticketId: ticket.id,
              action: 'WHATSAPP_ENVIADO',
              description: `Mensaje de WhatsApp automático enviado al ${phone}:\n"${message}"`,
              performedBy: 'Sistema Bot',
            }
          });
        } catch (wsError) {
          console.error('Error enviando WhatsApp automático de confirmación:', wsError);
        }
      }

      return res.status(201).json({ success: true, ticket });
    } catch (error) {
      console.error('Error creating PQRS ticket:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // Public Endpoint: Consultar seguimiento de ticket
  async trackTicket(req: Request, res: Response) {
    try {
      const { code } = req.params;
      const ticket = await prisma.pqrsTicket.findUnique({
        where: { trackingCode: code },
        include: {
          history: { orderBy: { createdAt: 'desc' } }
        }
      });
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket no encontrado' });
      }
      return res.json({ success: true, ticket });
    } catch (error) {
      console.error('Error tracking PQRS ticket:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // Admin Endpoint: Listar todos los tickets
  async getTickets(req: Request, res: Response) {
    try {
      const user = req.user;
      const isPqrsAdmin = user?.roles?.some((r: string) => ['SUPER_ADMIN', 'MODULO_PQRS', 'MODULO_USUARIO_PQRS'].includes(r));

      let dbUser = null;
      if (!isPqrsAdmin && user?.userId) {
        dbUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { firstName: true, lastName: true } });
      }

      const tickets = await prisma.pqrsTicket.findMany({
        where: isPqrsAdmin ? undefined : {
          assignedToId: user?.userId
        },
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          history: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      return res.status(200).json({ success: true, tickets });
    } catch (error) {
      console.error('Error fetching PQRS tickets:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // Admin Endpoint: Update ticket general info
  async updateTicket(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { fullName, condition, phone, email, type, area, description } = req.body;

      const ticket = await prisma.pqrsTicket.update({
        where: { id },
        data: {
          fullName,
          applicantCondition: condition,
          phone,
          email,
          type,
          area,
          description
        }
      });

      let performedBy = 'Administrador';
      if (req.user?.userId) {
        const u = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { firstName: true, lastName: true } });
        if (u) performedBy = `${u.firstName} ${u.lastName}`;
      }

      await prisma.pqrsHistory.create({
        data: {
          ticketId: id,
          action: 'INFO_ACTUALIZADA',
          description: `La información general del caso fue actualizada.`,
          performedBy,
        }
      });

      return res.status(200).json({ success: true, ticket });
    } catch (error) {
      console.error('Error updating PQRS ticket info:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // Admin Endpoint: Cambiar estado y resolución
  async updateTicketStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, resolution, mediaBase64 } = req.body;

      const currentTicket = await prisma.pqrsTicket.findUnique({ where: { id } });
      
      let updateData: any = { status, resolution };
      
      const isClosing = (status === 'CERRADO' || status === 'RESUELTO') && (currentTicket?.status !== 'CERRADO' && currentTicket?.status !== 'RESUELTO');
      
      if (isClosing) {
        updateData.isWaitingForRating = true;
      }

      // Siempre marcar como no leído para notificar a la otra parte (Admin o Usuario Asignado)
      updateData.isRead = false;

      const ticket = await prisma.pqrsTicket.update({
        where: { id },
        data: updateData,
      });

      let mediaUrl: string | null = null;
      if (mediaBase64) {
        try {
          const uploadsDir = path.join(process.cwd(), 'uploads', 'pqrs');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          const base64Data = mediaBase64.replace(/^data:image\/\w+;base64,/, '');
          const fileName = `res_${ticket.code}_${Date.now()}.jpg`;
          const filePath = path.join(uploadsDir, fileName);
          fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
          mediaUrl = `/uploads/pqrs/${fileName}`;
        } catch (err) {
          console.error('Error saving resolution image file:', err);
        }
      }

      if (isClosing && ticket.phone) {
        const whatsappService = whatsappManager.getInstance('chls-pqrs');
        let surveyMsg = `Estimado(a) socio(a), le informamos que su caso *${ticket.code}* ha sido atendido y resuelto.`;
        if (resolution && resolution.trim()) {
          surveyMsg += `\n\n📝 *Detalle de la resolución:*\n${resolution.trim()}`;
        }
        surveyMsg += `\n\nDel *1 al 5*, ¿qué tan satisfecho(a) se encuentra con la atención brindada en la resolución de su solicitud?\n_(Por favor responda únicamente con un número del 1 al 5)_\n\n*Atención al Socio - Club Hípico Los Sargentos*`;
        const formattedPhone = ticket.phone.startsWith('591') ? ticket.phone : `591${ticket.phone}`;
        await whatsappService.sendMessage(formattedPhone, surveyMsg, mediaBase64);
      }

      let desc = `El estado del ticket cambió a ${status}.`;
      if (resolution) desc += `\nNota de Resolución: ${resolution}`;
      if (mediaUrl) desc += `\n[IMAGEN_RESPALDO]:${mediaUrl}`;

      let performedBy = 'Administrador';
      if (req.user?.userId) {
        const u = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { firstName: true, lastName: true } });
        if (u) performedBy = `${u.firstName} ${u.lastName}`;
      }

      await prisma.pqrsHistory.create({
        data: {
          ticketId: id,
          action: 'ESTADO_ACTUALIZADO',
          description: desc,
          performedBy,
        }
      });

      return res.status(200).json({ success: true, ticket });
    } catch (error) {
      console.error('Error updating PQRS ticket status:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // Admin Endpoint: Asignar/Derivar ticket y establecer prioridad
  async assignTicket(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { assignedToId, priority, note } = req.body;

      const ticket = await prisma.pqrsTicket.update({
        where: { id },
        data: { 
          assignedToId: assignedToId || null, 
          priority,
          isRead: assignedToId ? false : undefined, // Reset isRead if assigned
        },
        include: {
          assignedTo: { select: { firstName: true, lastName: true } }
        }
      });

      let desc = `Prioridad actualizada a: ${priority}.`;
      if (ticket.assignedTo) {
        desc += `\nDerivado a: ${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`;
      } else if (assignedToId === null) {
        desc += `\nSe quitó la asignación.`;
      }

      if (note) {
        desc += `\nInstrucciones/Nota: ${note}`;
      }

      let performedBy = 'Administrador';
      if (req.user?.userId) {
        const u = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { firstName: true, lastName: true } });
        if (u) performedBy = `${u.firstName} ${u.lastName}`;
      }

      await prisma.pqrsHistory.create({
        data: {
          ticketId: id,
          action: 'DERIVACION',
          description: desc,
          performedBy,
        }
      });

      return res.status(200).json({ success: true, ticket });
    } catch (error) {
      console.error('Error assigning PQRS ticket:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async markAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const ticket = await prisma.pqrsTicket.update({
        where: { id },
        data: { isRead: true }
      });

      let performedBy = 'Sistema';
      if (req.user?.userId) {
        const u = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { firstName: true, lastName: true } });
        if (u) performedBy = `${u.firstName} ${u.lastName}`;
      }

      await prisma.pqrsHistory.create({
        data: {
          ticketId: id,
          action: 'RECIBIDO',
          description: 'Correspondencia recibida y aceptada por el usuario asignado.',
          performedBy,
        }
      });

      return res.status(200).json({ success: true, ticket });
    } catch (error) {
      console.error('Error marking PQRS ticket as read:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // Admin Endpoint: Responder vía WhatsApp
  async replyViaWhatsApp(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { message, mediaBase64 } = req.body;

      const ticket = await prisma.pqrsTicket.findUnique({
        where: { id },
      });

      if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
         return;
      }

      // Enviar el mensaje usando el WhatsApp Service exclusivo para PQRS
      const pqrsClient = whatsappManager.getInstance('chls-pqrs');
      const result = await pqrsClient.sendBulk([{ nombre: ticket.fullName, telefono: ticket.phone }], message || '', undefined, undefined, mediaBase64);
      
      let performedBy = 'Administrador';
      if (req.user?.userId) {
        const u = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { firstName: true, lastName: true } });
        if (u) performedBy = `${u.firstName} ${u.lastName}`;
      }

      await prisma.pqrsHistory.create({
        data: {
          ticketId: id,
          action: 'WHATSAPP_ENVIADO',
          description: `Mensaje de WhatsApp enviado al ${ticket.phone}:\n"${message}"${mediaBase64 ? ' (Imagen adjunta)' : ''}`,
          performedBy,
        }
      });

      // Optionally transition status to EN_PROGRESO if it was ABIERTO
      if (ticket.status === 'ABIERTO') {
        await prisma.pqrsTicket.update({
          where: { id },
          data: { status: 'EN_PROGRESO' }
        });
      }

      return res.status(200).json({ success: true, message: 'Reply sent successfully', result });
    } catch (error) {
      console.error('Error replying via WhatsApp:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // Admin Endpoint: Agregar comentario interno
  async addInternalNote(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { note } = req.body;

      const ticket = await prisma.pqrsTicket.findUnique({ where: { id } });
      if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
        return;
      }
      
      // Siempre marcar como no leído para alertar al receptor
      await prisma.pqrsTicket.update({
        where: { id },
        data: { isRead: false }
      });

      let performedBy = 'Sistema';
      if (req.user?.userId) {
        const u = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { firstName: true, lastName: true } });
        if (u) performedBy = `${u.firstName} ${u.lastName}`;
      }

      const historyRecord = await prisma.pqrsHistory.create({
        data: {
          ticketId: id,
          action: 'COMENTARIO_INTERNO',
          description: note,
          performedBy,
        }
      });

      return res.status(200).json({ success: true, historyRecord });
    } catch (error) {
      console.error('Error adding internal note:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
