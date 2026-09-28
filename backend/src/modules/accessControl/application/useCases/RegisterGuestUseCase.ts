import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class RegisterGuestUseCase {
  async execute(data: {
    hostId: string;
    firstName: string;
    lastName: string;
    documentId?: string;
    vehiclePlate?: string;
    gate?: string;
  }) {
    // 1. Verify host exists
    const host = await prisma.person.findUnique({
      where: { id: data.hostId }
    });

    if (!host) {
      throw new Error('Socio anfitrión no encontrado');
    }

    // 2. See if the guest already exists for this host (by documentId, if provided)
    let guest;
    if (data.documentId && data.documentId.trim() !== '') {
      guest = await prisma.guest.findFirst({
        where: { hostId: data.hostId, documentId: data.documentId }
      });
    }

    // 3. Create guest if not found
    if (!guest) {
      guest = await prisma.guest.create({
        data: {
          hostId: data.hostId,
          firstName: data.firstName,
          lastName: data.lastName,
          documentId: data.documentId || null,
        }
      });
    } else {
      // Update name just in case
      guest = await prisma.guest.update({
        where: { id: guest.id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
        }
      });
    }

    // 4. Create AccessLog for this guest
    const accessLog = await prisma.accessLog.create({
      data: {
        guestId: guest.id,
        actionType: 'ENTRY',
        status: 'GRANTED',
        method: 'Manual (Invitado Ocasional)',
        gate: data.gate || 'Puerta Principal',
        vehiclePlate: data.vehiclePlate || null,
        observation: `Invitado de ${host.firstName} ${host.lastName}`
      }
    });

    return {
      guest,
      accessLog
    };
  }
}
