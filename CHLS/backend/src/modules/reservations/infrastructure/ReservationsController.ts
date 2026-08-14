import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ReservationsController {
  
  // Obtener canchas activas
  async getCourts(req: Request, res: Response) {
    try {
      const courts = await prisma.court.findMany({
        where: { isActive: true },
        orderBy: [{ sport: 'asc' }, { name: 'asc' }],
      });
      return res.json(courts);
    } catch (error) {
      console.error('Error fetching courts:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // Obtener reservas
  async getReservations(req: Request, res: Response) {
    try {
      const { date, courtId, status } = req.query;
      
      const where: any = {};
      if (date) where.date = String(date);
      if (courtId) where.courtId = String(courtId);
      if (status) where.status = String(status);

      const reservations = await prisma.courtReservation.findMany({
        where,
        include: { court: true },
        orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
      });
      return res.json(reservations);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // Crear reserva
  async createReservation(req: Request, res: Response) {
    try {
      const { courtId, date, startTime, endTime, memberCode, memberName } = req.body;

      if (!courtId || !date || !startTime || !endTime || !memberCode) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }

      // Validar si existe conflicto de horario
      // Para simplificar, buscamos si existe una reserva aprobada o pendiente en la misma cancha, fecha y que se solape
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
        return res.status(409).json({ error: 'El horario seleccionado ya está ocupado' });
      }

      const reservation = await prisma.courtReservation.create({
        data: {
          courtId,
          date,
          startTime,
          endTime,
          memberCode,
          memberName,
          status: 'PENDING'
        }
      });

      return res.status(201).json({ success: true, reservation });
    } catch (error) {
      console.error('Error creating reservation:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // Actualizar estado (Admin)
  async updateReservationStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body; // PENDING, APPROVED, REJECTED, CANCELLED

      if (!['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }

      const reservation = await prisma.courtReservation.update({
        where: { id },
        data: { status }
      });

      return res.json({ success: true, reservation });
    } catch (error) {
      console.error('Error updating reservation status:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
