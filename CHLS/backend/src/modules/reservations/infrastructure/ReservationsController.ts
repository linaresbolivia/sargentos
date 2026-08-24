import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
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
        orderBy: [{ createdAt: 'desc' }, { date: 'desc' }, { startTime: 'desc' }],
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
        totalPrice,
        paymentMethod = 'QR',
        paymentReceiptUrl
      } = req.body;

      if (!courtId || !date || !startTime || !endTime || !memberCode || !memberName || !memberPhone || !String(memberPhone).trim()) {
        const errorMsg = 'El número de teléfono/WhatsApp de contacto es obligatorio para confirmar la reserva.';
        return res.status(400).json({ error: errorMsg, message: errorMsg });
      }

      const rawPhone = String(memberPhone).trim();
      const cleanPhone = rawPhone.replace(/[\s\-\(\)\+]/g, '');
      const boliviaPhoneRegex = /^(?:591)?[67]\d{7}$/;
      if (!boliviaPhoneRegex.test(cleanPhone)) {
        const errorMsg = 'Número de celular inválido. Debe ser un celular válido de Bolivia (8 dígitos comenzando con 6 o 7, ej. 70123456 o +591 70123456).';
        return res.status(400).json({ error: errorMsg, message: errorMsg });
      }

      const todayStr = formatDate(new Date());
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 7);
      const maxDateStr = formatDate(maxDate);

      // Regla Anti-Abuso 1: Ventana de 7 días
      if (date < todayStr) {
        const errorMsg = 'No es posible reservar en fechas pasadas.';
        return res.status(400).json({ error: errorMsg, message: errorMsg });
      }
      if (date > maxDateStr) {
        const errorMsg = `Las reservas solo pueden realizarse con un máximo de 7 días de anticipación (hasta ${maxDateStr}).`;
        return res.status(400).json({ error: errorMsg, message: errorMsg });
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
        const errorMsg = 'Límite alcanzado: Tienes 2 reservas activas próximas. Para realizar una nueva, espera a que concluyan o cancela una previa.';
        return res.status(400).json({ error: errorMsg, message: errorMsg });
      }

      // Obtener datos de la cancha para validar límite diario por deporte
      const court = await prisma.court.findUnique({
        where: { id: courtId }
      });

      if (!court) {
        const errorMsg = 'La cancha seleccionada no existe o está inactiva.';
        return res.status(404).json({ error: errorMsg, message: errorMsg });
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
        const errorMsg = `Límite diario: Ya cuentas con una reserva de ${court.sport} para el día ${date} (${sameDaySportReservation.court.name} a las ${sameDaySportReservation.startTime}).`;
        return res.status(400).json({ error: errorMsg, message: errorMsg });
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
        const errorMsg = `El horario de ${startTime} a ${endTime} no está disponible (${reason}).`;
        return res.status(409).json({ error: errorMsg, message: errorMsg });
      }

      // Cálculo de tarifas y duración
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      const durationHours = Math.max(1, Math.round((endH * 60 + endM - (startH * 60 + startM)) / 60));

      if (durationHours > 2) {
        return res.status(400).json({ error: 'La duración máxima permitida para reservas deportivas es de 2 horas continuas.' });
      }

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

      const isExempt = computedTotalPrice <= 0;
      const reservationStatus = isExempt ? 'APPROVED' : (paymentReceiptUrl ? 'APPROVED' : 'PENDING');
      const reservationPaymentStatus = isExempt ? 'EXEMPT' : (paymentReceiptUrl ? 'PAID' : 'PENDING_PAYMENT');

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
          paymentStatus: reservationPaymentStatus,
          paymentMethod: String(paymentMethod || 'QR'),
          paymentReceiptUrl: paymentReceiptUrl ? String(paymentReceiptUrl) : null,
          title: title || 'Reserva de Socio',
          notes: notes || null,
          status: reservationStatus
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
          
          let modalityLabel = 'Familiar';
          if (playerType === 'GUESTS') {
            modalityLabel = `Invitados (${numGuests})`;
          } else if (playerType === 'MEMBERS') {
            modalityLabel = 'Entre Socios';
          }

          const companionsText = playerNames ? `\n📝 *Acompañantes:* ${playerNames}` : '';

          let whatsappMessage = '';
          let qrBase64: string | undefined = undefined;

          if (isExempt) {
            // Confirmación directa sin QR ni solicitud de comprobante para Familia / Entre Socios
            whatsappMessage = 
`🐴 *CLUB HÍPICO LOS SARGENTOS*
✅ *Turno Confirmado*

Hola *${memberName}*, tu reserva ha sido confirmada:

📌 *Cancha:* ${court.name} (${court.sport})
📅 *Fecha:* ${date}
⏰ *Horario:* ${startTime} a ${endTime}
👥 *Modalidad:* ${modalityLabel}${companionsText}
🎫 *Código:* *#${reservationCode}*

Presenta tu carnet o código al ingresar. ¡Que disfrutes tu juego! 🥇✨`;
          } else {
            // Pre-reserva con aranceles / invitados: requiere pago por QR y comprobante
            whatsappMessage = 
`🐴 *CLUB HÍPICO LOS SARGENTOS*
🟡 *Pre-Reserva Registrada*

Hola *${memberName}*, registramos tu pre-reserva:

📌 *Cancha:* ${court.name} (${court.sport})
📅 *Fecha:* ${date}
⏰ *Horario:* ${startTime} a ${endTime}
👥 *Modalidad:* ${modalityLabel}${companionsText}
💰 *Total a Pagar:* *Bs. ${computedTotalPrice}*
🎫 *Código / Glosa:* *#${reservationCode}*

*Instrucciones de Pago:*
1. Escanea el QR adjunto y realiza la transferencia.
2. ⚠️ Coloca en la glosa: *#${reservationCode}*
3. Adjunta tu comprobante en el sistema para consolidar tu turno.`;

            // Cargar imagen QR oficial en base64 solo para turnos que requieren pago
            try {
              const possiblePaths = [
                path.resolve(process.cwd(), '../frontend/src/assets/qr-pagos.jpg'),
                path.resolve(process.cwd(), 'src/assets/qr-pagos.jpg'),
                path.resolve(process.cwd(), 'frontend/src/assets/qr-pagos.jpg'),
                'C:\\Users\\HP\\Documents\\CHLS\\frontend\\src\\assets\\qr-pagos.jpg'
              ];
              for (const p of possiblePaths) {
                if (fs.existsSync(p)) {
                  const buffer = fs.readFileSync(p);
                  qrBase64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
                  break;
                }
              }
            } catch (qrErr) {
              console.warn('[WhatsApp Bot] Error leyendo imagen QR:', qrErr);
            }
          }

          if (qrBase64) {
            await whatsappService.sendMessage(formattedPhone, whatsappMessage, qrBase64);
          } else {
            await whatsappService.sendMessage(formattedPhone, whatsappMessage);
          }
        } catch (wsErr) {
          console.warn('[WhatsApp Bot] No se pudo enviar notificación de reserva:', wsErr);
        }
      }

      return res.status(201).json({ 
        success: true, 
        message: isExempt 
          ? '¡Reserva confirmada con éxito! Como socio del Club, el uso de cancha no tiene costo.' 
          : 'Pre-reserva registrada con éxito. Se envió el código y QR de pago a tu WhatsApp.',
        reservation 
      });
    } catch (error) {
      console.error('Error creating reservation:', error);
      return res.status(500).json({ error: 'Error al procesar la reserva', message: 'Error al procesar la reserva' });
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
              const randCode = `BLK-${Math.floor(1000 + Math.random() * 9000)}`;
              const resv = await prisma.courtReservation.create({
                data: {
                  code: randCode,
                  courtId,
                  date: currentFormatted,
                  startTime,
                  endTime,
                  memberName: title.trim(),
                  memberCode: 'ADMIN_BLOCK',
                  reservationType: reservationType || 'CIERRE_CANCHA',
                  title: title.trim(),
                  notes: notes ? notes.trim() : null,
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

  // 7. Obtener reservas del socio logueado (Búsqueda inteligente por código, CI, carnet o teléfono)
  async getMyReservations(req: Request, res: Response) {
    try {
      const { memberCode, phone, search } = req.query;

      const queryTerm = (search || memberCode || phone || '').toString().trim();
      if (!queryTerm) {
        return res.status(400).json({ error: 'Identificador de socio no proporcionado' });
      }

      const todayStr = formatDate(new Date());

      // Condiciones de búsqueda amplia
      const orFilters: any[] = [
        { memberCode: queryTerm },
        { memberPhone: queryTerm },
        { memberPhone: { contains: queryTerm.replace(/[\s\-\(\)\+]/g, '').slice(-8) } },
        { memberName: { contains: queryTerm, mode: 'insensitive' } },
        { code: queryTerm }
      ];

      // Si queryTerm es numérico o alfanumérico, buscar en el padrón de socios para resolver todos sus identificadores
      try {
        const memberProfile = await prisma.member.findFirst({
          where: {
            OR: [
              { membershipNumber: queryTerm },
              { documentId: queryTerm },
              { phone: { contains: queryTerm.replace(/[\s\-\(\)\+]/g, '').slice(-8) } }
            ]
          }
        });

        if (memberProfile) {
          if (memberProfile.membershipNumber) orFilters.push({ memberCode: memberProfile.membershipNumber });
          if (memberProfile.documentId) orFilters.push({ memberCode: memberProfile.documentId });
          if (memberProfile.phone) orFilters.push({ memberPhone: memberProfile.phone });
        }
      } catch (err) {
        // Ignorar si la tabla member no coincide
      }

      const reservations = await prisma.courtReservation.findMany({
        where: {
          OR: orFilters,
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

  // 16. Crear nueva Cancha o Espacio Deportivo
  async createCourt(req: Request, res: Response) {
    try {
      const { name, sport, description, hourlyRate, guestRate, isActive, openingTime, closingTime } = req.body;
      if (!name || !sport) {
        return res.status(400).json({ error: 'Nombre y disciplina requeridos' });
      }

      const court = await prisma.court.create({
        data: {
          name: String(name).trim(),
          sport: String(sport).trim(),
          description: description ? String(description).trim() : null,
          hourlyRate: hourlyRate !== undefined ? Number(hourlyRate) : 0,
          guestRate: guestRate !== undefined ? Number(guestRate) : 50,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
          openingTime: openingTime || '06:00',
          closingTime: closingTime || '22:00',
        }
      });

      return res.status(201).json({ success: true, message: 'Cancha creada exitosamente', court });
    } catch (error) {
      console.error('Error creating court:', error);
      return res.status(500).json({ error: 'Error al crear la cancha' });
    }
  }

  // 17. Editar Cancha o Espacio Deportivo existente
  async updateCourt(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, sport, description, hourlyRate, guestRate, isActive, openingTime, closingTime } = req.body;

      const existing = await prisma.court.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'Cancha no encontrada' });
      }

      const updated = await prisma.court.update({
        where: { id },
        data: {
          name: name !== undefined ? String(name).trim() : existing.name,
          sport: sport !== undefined ? String(sport).trim() : existing.sport,
          description: description !== undefined ? (description ? String(description).trim() : null) : existing.description,
          hourlyRate: hourlyRate !== undefined ? Number(hourlyRate) : existing.hourlyRate,
          guestRate: guestRate !== undefined ? Number(guestRate) : existing.guestRate,
          isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
          openingTime: openingTime !== undefined ? String(openingTime) : existing.openingTime,
          closingTime: closingTime !== undefined ? String(closingTime) : existing.closingTime,
        }
      });

      return res.json({ success: true, message: 'Cancha actualizada correctamente', court: updated });
    } catch (error) {
      console.error('Error updating court:', error);
      return res.status(500).json({ error: 'Error al actualizar la cancha' });
    }
  }

  // 18. Editar Reserva o Bloqueo existente (Admin / Socio)
  async updateReservation(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { 
        courtId, 
        date, 
        startTime, 
        endTime, 
        title, 
        notes, 
        reservationType, 
        playerType, 
        guestsCount, 
        playerNames, 
        totalPrice, 
        status, 
        paymentStatus,
        paymentMethod,
        memberPhone
      } = req.body;

      const existing = await prisma.courtReservation.findUnique({
        where: { id },
        include: { court: true }
      });

      if (!existing) {
        return res.status(404).json({ error: 'Reserva no encontrada' });
      }

      // Si cambiaron de cancha, fecha u horario, verificar solapamientos
      const targetCourtId = courtId || existing.courtId;
      const targetDate = date || existing.date;
      const targetStart = startTime || existing.startTime;
      const targetEnd = endTime || existing.endTime;

      if (targetCourtId !== existing.courtId || targetDate !== existing.date || targetStart !== existing.startTime || targetEnd !== existing.endTime) {
        const conflict = await prisma.courtReservation.findFirst({
          where: {
            id: { not: id },
            courtId: targetCourtId,
            date: targetDate,
            status: { in: ['PENDING', 'APPROVED'] },
            OR: [
              {
                startTime: { lt: targetEnd },
                endTime: { gt: targetStart }
              }
            ]
          },
          include: { court: true }
        });

        if (conflict) {
          return res.status(409).json({ 
            error: `Conflicto de horario: El espacio ya está ocupado de ${conflict.startTime} a ${conflict.endTime} (${conflict.title || conflict.memberName}).` 
          });
        }
      }

      const updateData: any = {};
      if (courtId !== undefined) updateData.courtId = courtId;
      if (date !== undefined) updateData.date = date;
      if (startTime !== undefined) updateData.startTime = startTime;
      if (endTime !== undefined) updateData.endTime = endTime;
      if (title !== undefined) updateData.title = title ? String(title).trim() : null;
      if (notes !== undefined) updateData.notes = notes ? String(notes).trim() : null;
      if (reservationType !== undefined) updateData.reservationType = reservationType;
      if (playerType !== undefined) updateData.playerType = playerType;
      if (guestsCount !== undefined) updateData.guestsCount = Number(guestsCount);
      if (playerNames !== undefined) updateData.playerNames = playerNames ? String(playerNames).trim() : null;
      if (totalPrice !== undefined) updateData.totalPrice = Number(totalPrice);
      if (status !== undefined) updateData.status = status;
      if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
      if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
      if (memberPhone !== undefined) updateData.memberPhone = memberPhone ? String(memberPhone).trim() : null;

      const updated = await prisma.courtReservation.update({
        where: { id },
        data: updateData,
        include: { court: true }
      });

      return res.json({ success: true, message: 'Reserva actualizada exitosamente', reservation: updated });
    } catch (error) {
      console.error('Error updating reservation:', error);
      return res.status(500).json({ error: 'Error al actualizar la reserva' });
    }
  }
}



