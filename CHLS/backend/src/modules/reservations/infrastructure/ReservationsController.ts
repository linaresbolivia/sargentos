import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

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

  // 4. Crear reserva de Socio (con Reglas Anti-Abuso & Fair Play)
  async createReservation(req: Request, res: Response) {
    try {
      const { courtId, date, startTime, endTime, memberCode, memberName, memberPhone, title, notes } = req.body;

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

      const reservation = await prisma.courtReservation.create({
        data: {
          courtId,
          date,
          startTime,
          endTime,
          memberCode: String(memberCode),
          memberName: String(memberName),
          memberPhone: memberPhone ? String(memberPhone) : null,
          reservationType: 'MEMBER',
          title: title || 'Reserva de Socio',
          notes: notes || null,
          status: 'APPROVED' // Instant approval with fair play limits
        },
        include: { court: true }
      });

      return res.status(201).json({ 
        success: true, 
        message: 'Reserva confirmada con éxito.',
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
}

