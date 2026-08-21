import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { whatsappManager } from '../../whatsapp/infrastructure/whatsappService';

const prisma = new PrismaClient();

// Helper: Format Date to YYYY-MM-DD
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Parse YYYY-MM-DD to Date in local time
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export class ReservationsController {
  
  // 1. Obtener canchas activas
  async getCourts(req: Request, res: Response) {
    try {
      const { sport, activeOnly } = req.query;
      const where: any = {};
      
      if (activeOnly !== 'false') {
        where.isActive = true;
      }
      if (sport && typeof sport === 'string') {
        where.sport = sport;
      }

      const courts = await prisma.court.findMany({
        where,
        orderBy: [{ sport: 'asc' }, { name: 'asc' }],
      });
      return res.json(courts);
    } catch (error) {
      console.error('Error fetching courts:', error);
      return res.status(500).json({ error: 'Error al obtener canchas' });
    }
  }

  // 2. Obtener reservas con filtros
  async getReservations(req: Request, res: Response) {
    try {
      const { date, startDate, endDate, courtId, sport, status, memberCode, reservationType } = req.query;
      
      const where: any = {};
      if (date) {
        where.date = String(date);
      } else if (startDate && endDate) {
        where.date = {
          gte: String(startDate),
          lte: String(endDate),
        };
      }
      
      if (courtId) where.courtId = String(courtId);
      if (status && status !== 'ALL') where.status = String(status);
      if (memberCode) where.memberCode = String(memberCode);
      if (reservationType && reservationType !== 'ALL') where.reservationType = String(reservationType);

      if (sport) {
        where.court = { sport: String(sport) };
      }

      const reservations = await prisma.courtReservation.findMany({
        where,
        include: { court: true },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      });
      return res.json(reservations);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      return res.status(500).json({ error: 'Error al obtener reservas' });
    }
  }

  // 3. Obtener matriz de ocupación Timeline para una fecha
  async getTimeline(req: Request, res: Response) {
    try {
      const dateStr = (req.query.date as string) || formatDate(new Date());
      const sport = req.query.sport as string | undefined;

      const courtWhere: any = { isActive: true };
      if (sport && sport !== 'ALL') {
        courtWhere.sport = sport;
      }

      const courts = await prisma.court.findMany({
        where: courtWhere,
        orderBy: [{ sport: 'asc' }, { name: 'asc' }],
      });

      const courtIds = courts.map(c => c.id);

      const reservations = await prisma.courtReservation.findMany({
        where: {
          courtId: { in: courtIds },
          date: dateStr,
          status: { in: ['PENDING', 'APPROVED'] },
        },
        include: { court: true },
        orderBy: { startTime: 'asc' },
      });

      return res.json({
        date: dateStr,
        courts,
        reservations,
      });
    } catch (error) {
      console.error('Error fetching timeline:', error);
      return res.status(500).json({ error: 'Error al obtener cronograma' });
    }
  }

  // 4. Crear reserva de Socio (con Reglas Anti-Abuso & Fair Play y Cobro por QR)
  async createReservation(req: Request, res: Response) {
    try {
      const { 
        courtId, 
        date, 
        startTime, 
        endTime, 
        memberCode, 
        memberName, 
        memberPhone, 
        title, 
        notes,
        playerType = 'FAMILY',
        guestsCount = 0,
        playerNames,
        courtFee,
        guestFee,
        totalPrice
      } = req.body;

      if (!courtId || !date || !startTime || !endTime || !memberCode || !memberName || !memberPhone || !String(memberPhone).trim()) {
        return res.status(400).json({ error: 'El número de teléfono/WhatsApp de contacto es obligatorio para confirmar la reserva.' });
      }

      const cleanPhone = String(memberPhone).trim().replace(/[\s\-\(\)]/g, '');
      const boliviaPhoneRegex = /^(?:\+?591)?[67]\d{7}$/;
      if (!boliviaPhoneRegex.test(cleanPhone)) {
        return res.status(400).json({ 
          error: 'Número de celular inválido. Debe ser un celular válido de Bolivia (8 dígitos comenzando con 6 o 7, ej. 70123456 o +591 70123456).' 
        });
      }

      const todayStr = formatDate(new Date());
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 7);
      const maxDateStr = formatDate(maxDate);

      // Regla Anti-Abuso 1: Ventana de 7 días
      if (date < todayStr) {
        return res.status(400).json({ error: 'No es posible reservar en fechas pasadas.' });
      }
      if (date > maxDateStr) {
        return res.status(400).json({ 
          error: `Las reservas solo pueden realizarse con un máximo de 7 días de anticipación (hasta ${maxDateStr}).` 
        });
      }

      // Regla Anti-Abuso 2: Máximo 2 reservas activas futuras por socio en todo el club
      const activeMemberReservations = await prisma.courtReservation.count({
        where: {
          memberCode: String(memberCode),
          date: { gte: todayStr },
          status: { in: ['PENDING', 'APPROVED'] },
          reservationType: 'MEMBER'
        }
      });

      if (activeMemberReservations >= 2) {
        return res.status(400).json({
          error: 'Límite alcanzado: Tienes 2 reservas activas próximas. Para realizar una nueva, espera a que concluyan o cancela una previa.'
        });
      }

      // Obtener datos de la cancha para validar límite diario por deporte
      const court = await prisma.court.findUnique({
        where: { id: courtId }
      });

      if (!court) {
        return res.status(404).json({ error: 'La cancha seleccionada no existe o está inactiva.' });
      }

      // Regla Anti-Abuso 3: Máximo 1 reserva por socio por día en la misma disciplina/deporte
      const sameDaySportReservation = await prisma.courtReservation.findFirst({
        where: {
          memberCode: String(memberCode),
          date,
          status: { in: ['PENDING', 'APPROVED'] },
          reservationType: 'MEMBER',
          court: { sport: court.sport }
        },
        include: { court: true }
      });

      if (sameDaySportReservation) {
        return res.status(400).json({
          error: `Límite diario: Ya cuentas con una reserva de ${court.sport} para el día ${date} (${sameDaySportReservation.court.name} a las ${sameDaySportReservation.startTime}).`
        });
      }

      // Validación de Solapamiento / Conflicto de horario
      const conflicts = await prisma.courtReservation.findMany({
        where: {
          courtId,
          date,
          status: { in: ['PENDING', 'APPROVED'] },
          OR: [
            {
              startTime: { lt: endTime },
              endTime: { gt: startTime }
            }
          ]
        }
      });

      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        const reason = conflict.reservationType === 'CLASS' 
          ? `en Clases de ${court.sport} (${conflict.title || 'Academia'})`
          : conflict.reservationType === 'MAINTENANCE'
          ? 'en Mantenimiento'
          : 'ya reservado por otro socio';
        return res.status(409).json({ 
          error: `El horario de ${startTime} a ${endTime} no está disponible (${reason}).` 
        });
      }

      // Cálculo de tarifas y duración
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      const durationHours = Math.max(1, Math.round((endH * 60 + endM - (startH * 60 + startM)) / 60));

      const hourlyRate = (court as any).hourlyRate ?? 30.0;
      const guestRate = (court as any).guestRate ?? 25.0;

      const numGuests = playerType === 'GUESTS' ? Math.max(0, parseInt(String(guestsCount), 10) || 0) : 0;
      const computedCourtFee = courtFee !== undefined ? Number(courtFee) : durationHours * hourlyRate;
      const computedGuestFee = guestFee !== undefined ? Number(guestFee) : numGuests * guestRate;
      const computedTotalPrice = totalPrice !== undefined ? Number(totalPrice) : (computedCourtFee + computedGuestFee);

      // Generar Código Único de Reserva para Identificación de Pagos
      const sportPrefix = (court.sport || 'DEP').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const reservationCode = `RES-${sportPrefix}-${randomSuffix}`;

      const reservation = await prisma.courtReservation.create({
        data: {
          code: reservationCode,
          courtId,
          date,
          startTime,
          endTime,
          memberCode: String(memberCode),
          memberName: String(memberName),
          memberPhone: memberPhone ? String(memberPhone) : null,
          reservationType: 'MEMBER',
          playerType: String(playerType || 'FAMILY'),
          guestsCount: numGuests,
          playerNames: playerNames ? String(playerNames).trim() : null,
          courtFee: computedCourtFee,
          guestFee: computedGuestFee,
          totalPrice: computedTotalPrice,
          paymentStatus: 'PENDING_PAYMENT',
          title: title || 'Reserva de Socio',
          notes: notes || null,
          status: 'APPROVED' // Instant approval with fair play limits
        },
        include: { court: true }
      });

      // Si la reserva incluye invitados externos, persistir / actualizar en la tabla Guest
      if (playerType === 'GUESTS') {
        try {
          let hostPerson = await prisma.person.findFirst({
            where: {
              OR: [
                { alphaCode: String(memberCode) },
                { documentId: String(memberCode) },
                { titularMemberships: { some: { membershipNumber: String(memberCode) } } }
              ]
            }
          });

          // Si se enviaron objetos detallados de invitados en el body
          if (Array.isArray(req.body.guestsList) && req.body.guestsList.length > 0) {
            for (const g of req.body.guestsList) {
              const fullNameStr = (g.fullName || `${g.firstName || ''} ${g.lastName || ''}`).trim();
              const nameParts = fullNameStr.split(' ');
              const fName = g.firstName || nameParts[0] || 'Invitado';
              const lName = g.lastName || nameParts.slice(1).join(' ') || '-';
              const doc = g.documentId ? String(g.documentId).trim() : null;
              const ph = g.phone ? String(g.phone).trim() : null;

              if (doc) {
                const existing = await prisma.guest.findFirst({ where: { documentId: doc } });
                if (existing) {
                  await prisma.guest.update({
                    where: { id: existing.id },
                    data: {
                      firstName: fName,
                      lastName: lName,
                      phone: ph || existing.phone,
                      hostId: hostPerson?.id || existing.hostId
                    }
                  });
                  continue;
                }
              }

              const existingByName = await prisma.guest.findFirst({
                where: {
                  firstName: { equals: fName, mode: 'insensitive' },
                  lastName: { equals: lName, mode: 'insensitive' }
                }
              });

              if (existingByName) {
                await prisma.guest.update({
                  where: { id: existingByName.id },
                  data: {
                    documentId: doc || existingByName.documentId,
                    phone: ph || existingByName.phone,
                    hostId: hostPerson?.id || existingByName.hostId
                  }
                });
              } else {
                await prisma.guest.create({
                  data: {
                    firstName: fName,
                    lastName: lName,
                    documentId: doc,
                    phone: ph,
                    hostId: hostPerson?.id || null
                  }
                });
              }
            }
          } else if (playerNames) {
            // Separados por comas o 'y'
            const names = String(playerNames).split(/[,y]/i).map(n => n.trim()).filter(Boolean);
            for (const rawName of names) {
              const parts = rawName.split(' ');
              const fName = parts[0] || 'Invitado';
              const lName = parts.slice(1).join(' ') || '-';
              const existing = await prisma.guest.findFirst({
                where: {
                  firstName: { equals: fName, mode: 'insensitive' },
                  lastName: { equals: lName, mode: 'insensitive' }
                }
              });
              if (!existing) {
                await prisma.guest.create({
                  data: {
                    firstName: fName,
                    lastName: lName,
                    hostId: hostPerson?.id || null
                  }
                });
              }
            }
          }
        } catch (guestErr) {
          console.warn('Advertencia guardando invitados en BD:', guestErr);
        }
      }

      // Enviar WhatsApp automatizado con el bot oficial de Reservas Deportivas
      if (cleanPhone) {
        try {
          let whatsappService = whatsappManager.getInstance('chls-reservas');
          if (whatsappService.status !== 'CONNECTED') {
            whatsappService = whatsappManager.getInstance('chls-masivo');
          }

          const formattedPhone = cleanPhone.startsWith('591') ? cleanPhone : `591${cleanPhone}`;
          
          let modalityLabel = '👨‍👩‍👧‍👦 Familiar (Socio + Familiares)';
          if (playerType === 'GUESTS') {
            modalityLabel = `👥 Con Invitados Externos (${numGuests} invitado${numGuests !== 1 ? 's' : ''})`;
          } else if (playerType === 'MEMBERS') {
            modalityLabel = '🎾 Entre Socios del Club';
          }

          const companionsText = playerNames ? `\n📝 *Acompañantes:* ${playerNames}` : '';
          const guestsLine = computedGuestFee > 0 ? `• Arancel Invitados (${numGuests} pers.): Bs. ${computedGuestFee}\n` : '';

          const whatsappMessage = 
`🐴 *CLUB HÍPICO LOS SARGENTOS*
🎾 *Confirmación de Reserva de Cancha*

Estimado(a) *${memberName}*, tu solicitud de reserva ha sido registrada exitosamente:

🎫 *CÓDIGO DE RESERVA:* *#${reservationCode}*
🏟️ *Espacio / Cancha:* ${court.name} (${court.sport})
📅 *Fecha:* ${date}
⏰ *Horario:* ${startTime} a ${endTime} (${durationHours}h)
👥 *Modalidad:* ${modalityLabel}${companionsText}

💵 *Desglose de Pago:*
• Uso de Cancha (${durationHours}h): Bs. ${computedCourtFee}
${guestsLine}💰 *TOTAL A PAGAR:* *Bs. ${computedTotalPrice}*

📌 *INSTRUCCIONES DE PAGO:*
1. Realiza la transferencia escaneando el *QR Oficial de Pagos* del Club.
2. ⚠️ *Coloca en la glosa o motivo de tu transferencia tu código: #${reservationCode}*
3. *Adjunta tu comprobante de pago directamente desde el sistema* o envíalo a este número para la validación y consolidación de tu turno.

¡Te esperamos en el Club para disfrutar de tu deporte! 🏆✨`;

          await whatsappService.sendMessage(formattedPhone, whatsappMessage);
        } catch (wsErr) {
          console.warn('[WhatsApp Bot] No se pudo enviar notificación de reserva:', wsErr);
        }
      }

      return res.status(201).json({ 
        success: true, 
        message: 'Reserva confirmada con éxito. Por favor efectúa el pago por QR.',
        reservation 
      });
    } catch (error) {
      console.error('Error creating reservation:', error);
      return res.status(500).json({ error: 'Error al procesar la reserva' });
    }
  }


  // 5. Crear Ocupación Continua / Clases / Bloqueos Administrativos (Rango de Fechas y Horarios)
  async createContinuousBlock(req: Request, res: Response) {
    try {
      const {
        courtIds,       // Array de IDs de canchas
        startDate,      // YYYY-MM-DD
        endDate,        // YYYY-MM-DD
        startTime,      // HH:mm (ej. "08:00")
        endTime,        // HH:mm (ej. "11:00")
        daysOfWeek,     // Array de números [0, 1, 2, 3, 4, 5, 6] (0=Domingo, 1=Lunes, ...)
        reservationType,// 'CLASS' | 'MAINTENANCE' | 'TOURNAMENT' | 'ESCUELA_DEPORTIVA' | 'EVENTO_CLUB'
        title,          // ej. "Clases de Tenis - Academia Turno Mañana"
        notes,          // ej. "Prof. Marcelo - Grupo Juvenil"
        adminCreatedBy  // Nombre/email del admin
      } = req.body;

      if (!courtIds || !Array.isArray(courtIds) || courtIds.length === 0) {
        return res.status(400).json({ error: 'Debes seleccionar al menos una cancha.' });
      }
      if (!startDate || !endDate || !startTime || !endTime || !title) {
        return res.status(400).json({ error: 'Faltan campos obligatorios (fechas, horarios o título).' });
      }
      if (startDate > endDate) {
        return res.status(400).json({ error: 'La fecha de inicio no puede ser posterior a la fecha de fin.' });
      }
      if (startTime >= endTime) {
        return res.status(400).json({ error: 'La hora de inicio debe ser anterior a la hora de fin.' });
      }

      const recurringGroupId = randomUUID();
      const createdReservations: any[] = [];
      const conflictsEncountered: any[] = [];

      // Iterar sobre cada día en el rango de fechas
      const startD = parseLocalDate(startDate);
      const endD = parseLocalDate(endDate);
      const currentD = new Date(startD);

      const daysSet = Array.isArray(daysOfWeek) && daysOfWeek.length > 0 
        ? new Set(daysOfWeek.map(Number)) 
        : null;

      while (currentD <= endD) {
        const dayOfWeek = currentD.getDay(); // 0 = Domingo, 1 = Lunes, etc.
        const currentFormatted = formatDate(currentD);

        if (!daysSet || daysSet.has(dayOfWeek)) {
          for (const courtId of courtIds) {
            // Verificar si hay conflicto
            const existingConflict = await prisma.courtReservation.findFirst({
              where: {
                courtId,
                date: currentFormatted,
                status: { in: ['PENDING', 'APPROVED'] },
                OR: [
                  {
                    startTime: { lt: endTime },
                    endTime: { gt: startTime }
                  }
                ]
              },
              include: { court: true }
            });

            if (existingConflict) {
              conflictsEncountered.push({
                court: existingConflict.court.name,
                date: currentFormatted,
                time: `${existingConflict.startTime}-${existingConflict.endTime}`,
                conflictWith: existingConflict.title || existingConflict.memberName
              });
              // Continuar creando los no en conflicto o si es admin sobrescribir
            } else {
              const resv = await prisma.courtReservation.create({
                data: {
                  courtId,
                  date: currentFormatted,
                  startTime,
                  endTime,
                  memberName: title,
                  memberCode: 'ADMIN_BLOCK',
                  reservationType: reservationType || 'CLASS',
                  title,
                  notes: notes || null,
                  isRecurring: true,
                  recurringGroupId,
                  adminCreatedBy: adminCreatedBy || 'Administrador',
                  status: 'APPROVED'
                }
              });
              createdReservations.push(resv);
            }
          }
        }
        currentD.setDate(currentD.getDate() + 1);
      }

      return res.status(201).json({
        success: true,
        message: `Se programaron exitosamente ${createdReservations.length} bloques de ocupación.`,
        recurringGroupId,
        createdCount: createdReservations.length,
        conflictsEncountered
      });
    } catch (error) {
      console.error('Error creating continuous block:', error);
      return res.status(500).json({ error: 'Error al programar ocupación continua' });
    }
  }

  // 6. Eliminar grupo recurrente en lote (toda la serie de clases/bloqueos)
  async deleteRecurringGroup(req: Request, res: Response) {
    try {
      const { groupId } = req.params;

      if (!groupId) {
        return res.status(400).json({ error: 'Identificador de serie no proporcionado' });
      }

      const result = await prisma.courtReservation.deleteMany({
        where: { recurringGroupId: groupId }
      });

      return res.json({
        success: true,
        message: `Se eliminaron ${result.count} bloques de la serie.`,
        deletedCount: result.count
      });
    } catch (error) {
      console.error('Error deleting recurring group:', error);
      return res.status(500).json({ error: 'Error al eliminar la serie recurrente' });
    }
  }

  // 7. Obtener reservas del socio logueado
  async getMyReservations(req: Request, res: Response) {
    try {
      const { memberCode } = req.query;

      if (!memberCode) {
        return res.status(400).json({ error: 'Código de socio no proporcionado' });
      }

      const todayStr = formatDate(new Date());

      const reservations = await prisma.courtReservation.findMany({
        where: {
          memberCode: String(memberCode),
          reservationType: 'MEMBER'
        },
        include: { court: true },
        orderBy: [{ date: 'desc' }, { startTime: 'desc' }]
      });

      const upcoming = reservations.filter(r => r.date >= todayStr && r.status !== 'CANCELLED');
      const past = reservations.filter(r => r.date < todayStr || r.status === 'CANCELLED');

      return res.json({
        upcoming,
        past,
        activeCount: upcoming.length
      });
    } catch (error) {
      console.error('Error fetching member reservations:', error);
      return res.status(500).json({ error: 'Error al consultar reservas del socio' });
    }
  }

  // 8. Cancelar reserva por parte del socio (Regla de 2 horas previas)
  async cancelMyReservation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { memberCode } = req.body;

      const reservation = await prisma.courtReservation.findUnique({
        where: { id },
        include: { court: true }
      });

      if (!reservation) {
        return res.status(404).json({ error: 'Reserva no encontrada' });
      }

      if (memberCode && reservation.memberCode !== String(memberCode)) {
        return res.status(403).json({ error: 'No tienes autorización para cancelar esta reserva' });
      }

      if (reservation.status === 'CANCELLED') {
        return res.status(400).json({ error: 'La reserva ya se encuentra cancelada' });
      }

      // Validar regla de 2 horas previas
      const todayStr = formatDate(new Date());
      if (reservation.date === todayStr) {
        const now = new Date();
        const [resHour, resMin] = reservation.startTime.split(':').map(Number);
        const reservationTime = new Date();
        reservationTime.setHours(resHour, resMin, 0, 0);

        const diffMs = reservationTime.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours < 2) {
          return res.status(400).json({
            error: 'Las reservas solo pueden cancelarse con un mínimo de 2 horas de anticipación.'
          });
        }
      } else if (reservation.date < todayStr) {
        return res.status(400).json({ error: 'No se pueden cancelar reservas de fechas pasadas' });
      }

      const updated = await prisma.courtReservation.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });

      return res.json({
        success: true,
        message: 'Reserva cancelada correctamente. La cancha ha sido liberada.',
        reservation: updated
      });
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      return res.status(500).json({ error: 'Error al cancelar la reserva' });
    }
  }

  // 9. Actualizar estado (Admin - Aprobar/Rechazar/Cancelar)
  async updateReservationStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body; // PENDING, APPROVED, REJECTED, CANCELLED

      if (!['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }

      const reservation = await prisma.courtReservation.update({
        where: { id },
        data: { status },
        include: { court: true }
      });

      return res.json({ success: true, reservation });
    } catch (error) {
      console.error('Error updating reservation status:', error);
      return res.status(500).json({ error: 'Error al actualizar el estado de la reserva' });
    }
  }

  // 10. Eliminar reserva o bloqueo individual (Admin)
  async deleteReservation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.courtReservation.delete({
        where: { id }
      });
      return res.json({ success: true, message: 'Reserva eliminada con éxito' });
    } catch (error) {
      console.error('Error deleting reservation:', error);
      return res.status(500).json({ error: 'Error al eliminar la reserva' });
    }
  }

  // 11. Actualizar estado de pago (Admin / Caja) y Consolidar Reserva
  async updatePaymentStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { paymentStatus, notes } = req.body; // PENDING_PAYMENT, PAID, VERIFIED, EXEMPT

      if (!['PENDING_PAYMENT', 'PAID', 'VERIFIED', 'EXEMPT'].includes(paymentStatus)) {
        return res.status(400).json({ error: 'Estado de pago inválido' });
      }

      const updateData: any = { paymentStatus };
      if (paymentStatus === 'VERIFIED') {
        updateData.status = 'APPROVED';
      }
      if (notes) updateData.notes = notes;

      const reservation = await prisma.courtReservation.update({
        where: { id },
        data: updateData,
        include: { court: true }
      });

      // Si se verificó el pago, notificar al socio por WhatsApp que su reserva está CONSOLIDADA
      if (paymentStatus === 'VERIFIED' && reservation.memberPhone) {
        try {
          const cleanPhone = reservation.memberPhone.trim().replace(/[\s\-\(\)]/g, '');
          const formattedPhone = cleanPhone.startsWith('591') ? cleanPhone : `591${cleanPhone}`;
          
          let whatsappService = whatsappManager.getInstance('chls-reservas');
          if (whatsappService.status !== 'CONNECTED') {
            whatsappService = whatsappManager.getInstance('chls-masivo');
          }

          let modalityLabel = '👨‍👩‍👧‍👦 Familiar';
          if (reservation.playerType === 'GUESTS') {
            modalityLabel = `👥 Con Invitados Externos (${reservation.guestsCount || 1})`;
          } else if (reservation.playerType === 'MEMBERS') {
            modalityLabel = '🎾 Entre Socios del Club';
          }

          const companionsText = reservation.playerNames ? `\n📝 *Acompañantes:* ${reservation.playerNames}` : '';
          const guestNotice = reservation.playerType === 'GUESTS' ? '• Tus invitados externos deberán registrarse en portería presentando su documento de identidad.\n' : '';

          const verifyMessage = 
`🏆 *CLUB HÍPICO LOS SARGENTOS*
🎾 *¡PAGO VALIDADO & RESERVA CONSOLIDADA!*

Estimado(a) *${reservation.memberName}*, te informamos que tu pago por *Bs. ${reservation.totalPrice}* ha sido *VALIDADO Y APROBADO* exitosamente por el Área de Administración y Deportes.

✅ *ESTADO:* *RESERVA CONSOLIDADA Y CONFIRMADA*

🏟️ *Espacio / Cancha:* ${reservation.court.name} (${reservation.court.sport})
📅 *Fecha:* ${reservation.date}
⏰ *Horario:* ${reservation.startTime} a ${reservation.endTime}
👥 *Modalidad:* ${modalityLabel}${companionsText}
🎫 *Código de Reserva:* #${reservation.id.slice(0, 8).toUpperCase()}

📌 *Indicaciones de Ingreso:*
• Presentar tu carnet de socio o código en garita de control.
• El acceso a la cancha se habilita 10 minutos antes del inicio de tu turno.
${guestNotice}
¡Que tengas una excelente jornada deportiva en el Club! 🥇✨`;

          await whatsappService.sendMessage(formattedPhone, verifyMessage);
        } catch (e) {
          console.warn('[WhatsApp Bot] Error enviando mensaje de reserva consolidada:', e);
        }
      }

      return res.json({ 
        success: true, 
        message: paymentStatus === 'VERIFIED' ? 'Pago validado y reserva consolidada exitosamente' : 'Estado de pago actualizado', 
        reservation 
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      return res.status(500).json({ error: 'Error al actualizar el estado de pago' });
    }
  }

  // 12. Subir o adjuntar comprobante de pago con envío directo por WhatsApp desde el sistema
  async uploadPaymentReceipt(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { receiptUrl, receiptBase64 } = req.body;

      const receiptPath = receiptUrl || receiptBase64;
      if (!receiptPath) {
        return res.status(400).json({ error: 'Comprobante no proporcionado' });
      }

      const reservation = await prisma.courtReservation.update({
        where: { id },
        data: {
          paymentReceiptUrl: receiptPath,
          paymentStatus: 'PAID'
        },
        include: { court: true }
      });

      // Enviar el comprobante adjunto directamente por WhatsApp desde el sistema
      if (reservation.memberPhone) {
        try {
          const cleanPhone = reservation.memberPhone.trim().replace(/[\s\-\(\)]/g, '');
          const formattedPhone = cleanPhone.startsWith('591') ? cleanPhone : `591${cleanPhone}`;

          let whatsappService = whatsappManager.getInstance('chls-reservas');
          if (whatsappService.status !== 'CONNECTED') {
            whatsappService = whatsappManager.getInstance('chls-masivo');
          }

          const receiptMessage = 
`🐴 *CLUB HÍPICO LOS SARGENTOS*
🎾 *Comprobante de Pago Recibido*

Estimado(a) *${reservation.memberName}*, hemos recibido y adjuntado con éxito tu comprobante de pago desde el sistema:

🎫 *Código de Reserva:* *#${reservation.code || reservation.id.slice(0, 8).toUpperCase()}*
🏟️ *Espacio / Cancha:* ${reservation.court.name} (${reservation.court.sport})
📅 *Fecha:* ${reservation.date}
⏰ *Horario:* ${reservation.startTime} - ${reservation.endTime}
💰 *Monto Declarado:* Bs. ${reservation.totalPrice}

📋 *Estado:* 🟡 *Reserva en Proceso (Validando Pago)*. El comprobante fue remitido al Área de Control y Auditoría. Recibirás tu confirmación de consolidación en breve. ¡Gracias! 🏆✨`;

          // Envío con comprobante multimedia adjunto directamente
          await whatsappService.sendMessage(formattedPhone, receiptMessage, receiptPath);
        } catch (wsErr) {
          console.warn('[WhatsApp Bot] Error al despachar comprobante:', wsErr);
        }
      }

      return res.json({ 
        success: true, 
        message: 'Comprobante enviado exitosamente por WhatsApp y adjuntado a la reserva', 
        reservation 
      });
    } catch (error) {
      console.error('Error uploading payment receipt:', error);
      return res.status(500).json({ error: 'Error al registrar comprobante de pago' });
    }
  }

  // 13. Buscar o listar invitados registrados en la base de datos
  async searchGuests(req: Request, res: Response) {
    try {
      const query = (req.query.query as string || '').trim();
      const hostMemberCode = req.query.hostMemberCode as string | undefined;

      const where: any = {};
      if (query) {
        where.OR = [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { documentId: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
        ];
      }

      const guests = await prisma.guest.findMany({
        where,
        take: 20,
        orderBy: { updatedAt: 'desc' },
      });

      const formatted = guests.map(g => ({
        id: g.id,
        firstName: g.firstName,
        lastName: g.lastName,
        fullName: `${g.firstName} ${g.lastName}`.trim(),
        documentId: g.documentId || '',
        phone: g.phone || '',
        email: g.email || '',
        status: g.status,
      }));

      return res.json(formatted);
    } catch (error) {
      console.error('Error searching guests:', error);
      return res.status(500).json({ error: 'Error al buscar invitados' });
    }
  }

  // 14. Registrar o actualizar invitado individual en la base de datos
  async createOrUpdateGuest(req: Request, res: Response) {
    try {
      let { firstName, lastName, fullName, documentId, phone, email, hostMemberCode } = req.body;

      if (!fullName && (!firstName || !lastName)) {
        return res.status(400).json({ error: 'Nombre del invitado requerido' });
      }

      if (fullName && (!firstName || !lastName)) {
        const parts = String(fullName).trim().split(' ');
        firstName = parts[0] || 'Invitado';
        lastName = parts.slice(1).join(' ') || '-';
      }

      firstName = String(firstName || '').trim();
      lastName = String(lastName || '').trim();
      const cleanDoc = documentId ? String(documentId).trim() : null;
      const cleanPhone = phone ? String(phone).trim() : null;

      // Buscar si ya existe por documentId o por nombre
      let existing = null;
      if (cleanDoc) {
        existing = await prisma.guest.findFirst({
          where: { documentId: cleanDoc }
        });
      }
      if (!existing) {
        existing = await prisma.guest.findFirst({
          where: {
            firstName: { equals: firstName, mode: 'insensitive' },
            lastName: { equals: lastName, mode: 'insensitive' }
          }
        });
      }

      let hostPerson = null;
      if (hostMemberCode) {
        hostPerson = await prisma.person.findFirst({
          where: {
            OR: [
              { alphaCode: String(hostMemberCode) },
              { documentId: String(hostMemberCode) },
              { titularMemberships: { some: { membershipNumber: String(hostMemberCode) } } }
            ]
          }
        });
      }

      let guest;
      if (existing) {
        guest = await prisma.guest.update({
          where: { id: existing.id },
          data: {
            firstName,
            lastName,
            documentId: cleanDoc || existing.documentId,
            phone: cleanPhone || existing.phone,
            email: email ? String(email).trim() : existing.email,
            hostId: hostPerson ? hostPerson.id : existing.hostId,
          }
        });
      } else {
        guest = await prisma.guest.create({
          data: {
            firstName,
            lastName,
            documentId: cleanDoc,
            phone: cleanPhone,
            email: email ? String(email).trim() : null,
            hostId: hostPerson ? hostPerson.id : null,
          }
        });
      }

      return res.json({
        success: true,
        guest: {
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          fullName: `${guest.firstName} ${guest.lastName}`.trim(),
          documentId: guest.documentId || '',
          phone: guest.phone || '',
          email: guest.email || '',
        }
      });
    } catch (error) {
      console.error('Error creating guest:', error);
      return res.status(500).json({ error: 'Error al registrar invitado' });
    }
  }

  // 15. Buscar socios del club para modalidad "Entre Socios"
  async searchMembers(req: Request, res: Response) {
    try {
      const query = (req.query.query as string || '').trim();
      if (!query || query.length < 2) {
        return res.json([]);
      }

      const persons = await prisma.person.findMany({
        where: {
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { paternalSurname: { contains: query, mode: 'insensitive' } },
            { documentId: { contains: query, mode: 'insensitive' } },
            { alphaCode: { contains: query, mode: 'insensitive' } },
            { titularMemberships: { some: { membershipNumber: { contains: query, mode: 'insensitive' } } } }
          ]
        },
        include: {
          titularMemberships: {
            select: { membershipNumber: true }
          }
        },
        take: 10,
      });

      const results = persons.map(p => ({
        id: p.id,
        fullName: `${p.firstName} ${p.lastName || p.paternalSurname || ''}`.trim(),
        alphaCode: p.alphaCode || p.titularMemberships[0]?.membershipNumber || '',
        documentId: p.documentId,
        phone: p.phone || p.mobile || '',
      }));

      return res.json(results);
    } catch (error) {
      console.error('Error searching members:', error);
      return res.status(500).json({ error: 'Error al buscar socios' });
    }
  }
}



