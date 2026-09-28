import { PrismaClient } from '@prisma/client';

export interface RegisterAccessLogDTO {
  personId: string;
  gate: string;
  method: string;
  status: 'GRANTED' | 'DENIED';
  actionType: 'ENTRY' | 'EXIT';
  reason?: string;
  observation?: string;
  vehiclePlate?: string;
  personType?: string;
  itemsReceivedAtGatehouse?: boolean;
}

export class RegisterAccessLogUseCase {
  constructor(private prisma: PrismaClient) {}

  async execute(data: RegisterAccessLogDTO) {
    let targetPersonId: string | null = data.personId;
    let isVipPass = false;
    let vipPassId: string | null = null;

    let vipCode: string | null = null;
    let vipMaxUses: number | null = null;

    if (data.personId && data.personId.startsWith('vip_')) {
      isVipPass = true;
      vipPassId = data.personId.replace('vip_', '');
      targetPersonId = null;

      try {
        const vp = await this.prisma.vipPass.findUnique({
          where: { id: vipPassId }
        });
        if (vp) {
          vipCode = vp.code;
          vipMaxUses = vp.maxUses;
        }
      } catch (err) {
        console.error('Error fetching VipPass in RegisterAccessLogUseCase:', err);
      }
    }

    let person = null;
    if (targetPersonId) {
      person = await this.prisma.person.findUnique({
        where: { id: targetPersonId },
        select: { personType: true }
      });
    }

    let finalObservation = data.observation;
    if (isVipPass) {
      const vipTag = vipCode ? `[${vipCode}]` : (data.personId ? `[${data.personId}]` : '[VIP]');
      const acompTag = vipMaxUses ? `[${vipMaxUses} acompañantes]` : '';
      if (!finalObservation?.includes(vipTag)) {
        finalObservation = finalObservation ? `${finalObservation} ${vipTag} ${acompTag}` : `${vipTag} ${acompTag}`;
      }
    }

    const log = await this.prisma.accessLog.create({
      data: {
        personId: targetPersonId,
        gate: data.gate,
        method: data.method,
        actionType: data.actionType,
        status: data.status,
        reason: data.reason,
        observation: finalObservation,
        vehiclePlate: data.vehiclePlate,
        personType: data.personType || (isVipPass ? 'INVITADO_VIP' : person?.personType || 'SOCIO'),
      },
      include: {
        person: {
          select: {
            firstName: true,
            lastName: true,
            documentId: true,
          }
        }
      }
    });

    // If VIP Pass entry was GRANTED, increment the VIP Pass usage counter in DB
    if (isVipPass && vipPassId && data.status === 'GRANTED' && data.actionType === 'ENTRY') {
      try {
        await this.prisma.vipPass.update({
          where: { id: vipPassId },
          data: { usageCount: { increment: 1 } }
        });
      } catch (err) {
        console.error('Error incrementing VIP pass usage count:', err);
      }
    }

    // If person (Socio, Guest, or INVITADO VIP) is exiting the entire club, update any open AreaAccessLog sessions (Piscina / Gimnasio)
    if (data.actionType === 'EXIT') {
      try {
        const obsNote = data.itemsReceivedAtGatehouse
          ? 'Insumos (Llave/Toalla) entregados y recibidos en Caseta Principal'
          : 'Salida del Club registrada en Caseta Principal';

        if (targetPersonId) {
          await this.prisma.areaAccessLog.updateMany({
            where: {
              personId: targetPersonId,
              status: 'DENTRO'
            },
            data: {
              status: 'SALIO',
              exitTime: new Date(),
              observations: obsNote
            }
          });
        }

        // Also match INVITADO VIP or standalone guests by name in observation/reason
        const rawNote = `${data.observation || ''} ${data.reason || ''}`.trim();
        if (rawNote) {
          const cleanName = rawNote.replace(/^(PASE VIP|INVITADO VIP|Pase VIP):\s*/i, '').trim();
          if (cleanName && cleanName.length > 2) {
            await this.prisma.areaAccessLog.updateMany({
              where: {
                personName: { contains: cleanName, mode: 'insensitive' },
                status: 'DENTRO'
              },
              data: {
                status: 'SALIO',
                exitTime: new Date(),
                observations: obsNote
              }
            });
          }
        }
      } catch (err) {
        console.error('Error auto-closing area logs upon gatehouse exit:', err);
      }
    }

    return log;
  }
}
