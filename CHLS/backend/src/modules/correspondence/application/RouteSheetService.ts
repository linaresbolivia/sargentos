import { PrismaClient, RouteSheetPriority, RouteSheetSenderType, RouteSheetStatus } from '@prisma/client';
import { CreateRouteSheetInput, AddMovementInput, UpdateStatusInput } from '../domain/correspondence.dto';
import { socketService } from '@config/socket';
import { logger } from '@config/logger';

export class RouteSheetService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Genera el siguiente código correlativo de Hoja de Ruta
   * Formato: HR-YYYY-00001 (con alias de visualización tipo 08-193)
   */
  private async generateNextCode(year: number): Promise<{ hrCode: string; correlativeNumber: number }> {
    const lastRecord = await this.prisma.routeSheet.findFirst({
      where: { year },
      orderBy: { correlativeNumber: 'desc' },
      select: { correlativeNumber: true },
    });

    const nextNumber = (lastRecord?.correlativeNumber || 0) + 1;
    // Formato principal: HR-2026-00001 (o 08-193 si correlativo simple)
    const hrCode = `HR-${year}-${String(nextNumber).padStart(5, '0')}`;
    return { hrCode, correlativeNumber: nextNumber };
  }

  /**
   * Crear nueva Hoja de Ruta
   */
  public async create(data: CreateRouteSheetInput, createdById: string) {
    const currentYear = new Date().getFullYear();
    const { hrCode, correlativeNumber } = await this.generateNextCode(currentYear);

    const initialStatus: RouteSheetStatus = data.initialInstruction ? 'DERIVADO' : 'RECIBIDO';
    const targetArea = data.suggestedArea || data.initialArea || 'SECRETARIA_GENERAL';

    const routeSheet = await this.prisma.$transaction(async (tx) => {
      const created = await tx.routeSheet.create({
        data: {
          hrCode,
          year: currentYear,
          correlativeNumber,
          senderType: data.senderType as RouteSheetSenderType,
          personId: data.personId || null,
          senderName: data.senderName.trim(),
          senderArea: data.senderArea?.trim() || null,
          senderPhone: data.senderPhone?.trim() || null,
          senderEmail: data.senderEmail?.trim() || null,
          senderDoc: data.senderDoc?.trim() || null,
          cite: data.cite?.trim() || null,
          pageCount: data.pageCount || 1,
          reference: data.reference.trim(),
          attachmentDescription: data.attachmentDescription?.trim() || null,
          priority: (data.priority as RouteSheetPriority) || 'NORMAL',
          status: initialStatus,
          currentArea: targetArea,
          aiSummary: data.aiSummary || null,
          suggestedArea: data.suggestedArea || null,
          createdById,
        },
        include: {
          person: true,
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      // Si se especificó una instrucción inicial (primer proveído de Gerencia/Secretaría)
      if (data.initialInstruction) {
        const ccParts: string[] = [];
        if (data.initialCcAreas && data.initialCcAreas.length > 0) {
          ccParts.push(data.initialCcAreas.join(', '));
        }
        if (data.initialCcPersons?.trim()) {
          ccParts.push(data.initialCcPersons.trim());
        }
        const ccSuffix = ccParts.length > 0 ? `\n[C.C.: ${ccParts.join(' | ')}]` : '';
        const fullInstruction = `${data.initialInstruction.trim()}${ccSuffix}`;

        await tx.hrMovement.create({
          data: {
            routeSheetId: created.id,
            sequenceNumber: 1,
            sourceUserId: createdById,
            sourceArea: 'SECRETARIA_GENERAL',
            targetArea: targetArea,
            targetPersonName: data.initialTargetPerson?.trim() || null,
            instruction: fullInstruction,
            quickStamp: data.initialQuickStamp || 'FAVOR SU ATENCIÓN',
          },
        });
      }

      return created;
    });

    // Notificar en tiempo real
    try {
      socketService.getIo()?.emit('correspondence:created', {
        id: routeSheet.id,
        hrCode: routeSheet.hrCode,
        reference: routeSheet.reference,
        status: routeSheet.status,
        senderName: routeSheet.senderName,
      });
    } catch (err) {
      logger.warn('Socket emission failed for correspondence:created', err);
    }

    return routeSheet;
  }

  /**
   * Listar Hojas de Ruta con filtros de búsqueda y paginación
   */
  public async list(params: {
    status?: string;
    priority?: string;
    area?: string;
    search?: string;
    senderType?: string;
    limit?: number;
    offset?: number;
  }) {
    const { status, priority, area, search, senderType, limit = 50, offset = 0 } = params;
    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status as RouteSheetStatus;
    }

    if (priority && priority !== 'ALL') {
      where.priority = priority as RouteSheetPriority;
    }

    if (area && area !== 'ALL') {
      where.currentArea = area;
    }

    if (senderType && senderType !== 'ALL') {
      where.senderType = senderType as RouteSheetSenderType;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { hrCode: { contains: q, mode: 'insensitive' } },
        { reference: { contains: q, mode: 'insensitive' } },
        { senderName: { contains: q, mode: 'insensitive' } },
        { cite: { contains: q, mode: 'insensitive' } },
        { senderArea: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.routeSheet.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          person: {
            select: { id: true, firstName: true, lastName: true, documentId: true, alphaCode: true },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          movements: {
            orderBy: { sequenceNumber: 'asc' },
            include: {
              sourceUser: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
          documents: true,
        },
      }),
      this.prisma.routeSheet.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Obtener detalle completo de Hoja de Ruta por ID o Código
   */
  public async getByIdOrCode(idOrCode: string) {
    const routeSheet = await this.prisma.routeSheet.findFirst({
      where: {
        OR: [{ id: idOrCode }, { hrCode: idOrCode }],
      },
      include: {
        person: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        currentAssignee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        movements: {
          orderBy: { sequenceNumber: 'asc' },
          include: {
            sourceUser: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        documents: true,
      },
    });

    return routeSheet;
  }

  /**
   * Agregar un Proveído / Movimiento de Derivación a la Hoja de Ruta
   */
  public async addMovement(routeSheetId: string, data: AddMovementInput, sourceUserId: string) {
    const routeSheet = await this.prisma.routeSheet.findUnique({
      where: { id: routeSheetId },
      include: { movements: true },
    });

    if (!routeSheet) {
      throw new Error('Hoja de Ruta no encontrada');
    }

    const nextSeq = routeSheet.movements.length + 1;
    const updatedStatus = data.newStatus || 'DERIVADO';

    const ccParts: string[] = [];
    if (data.ccAreas && data.ccAreas.length > 0) {
      ccParts.push(data.ccAreas.join(', '));
    }
    if (data.ccPersons?.trim()) {
      ccParts.push(data.ccPersons.trim());
    }
    const ccSuffix = ccParts.length > 0 ? `\n[C.C.: ${ccParts.join(' | ')}]` : '';
    const fullInstruction = `${data.instruction.trim()}${ccSuffix}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const movement = await tx.hrMovement.create({
        data: {
          routeSheetId,
          sequenceNumber: nextSeq,
          sourceUserId,
          sourceArea: routeSheet.currentArea,
          targetArea: data.targetArea,
          targetPersonName: data.targetPersonName?.trim() || null,
          instruction: fullInstruction,
          quickStamp: data.quickStamp || null,
          signatureUrl: data.signatureUrl || null,
        },
        include: {
          sourceUser: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      const updatedHr = await tx.routeSheet.update({
        where: { id: routeSheetId },
        data: {
          status: updatedStatus,
          currentArea: data.targetArea,
        },
        include: {
          person: true,
          createdBy: true,
          movements: {
            orderBy: { sequenceNumber: 'asc' },
            include: { sourceUser: true },
          },
          documents: true,
        },
      });

      return { movement, routeSheet: updatedHr };
    });

    try {
      socketService.getIo()?.emit('correspondence:updated', {
        id: routeSheetId,
        hrCode: routeSheet.hrCode,
        status: updatedStatus,
        currentArea: data.targetArea,
      });
    } catch (err) {
      logger.warn('Socket emit error on correspondence:updated', err);
    }

    return result;
  }

  /**
   * Cambiar Estado Directo (ej. Observado, Subsanado, Concluido)
   */
  public async updateStatus(routeSheetId: string, data: UpdateStatusInput, userId: string) {
    const updated = await this.prisma.routeSheet.update({
      where: { id: routeSheetId },
      data: {
        status: data.status,
        ...(data.currentArea ? { currentArea: data.currentArea } : {}),
      },
      include: {
        person: true,
        createdBy: true,
        movements: {
          orderBy: { sequenceNumber: 'asc' },
          include: { sourceUser: true },
        },
        documents: true,
      },
    });

    try {
      socketService.getIo()?.emit('correspondence:updated', {
        id: routeSheetId,
        hrCode: updated.hrCode,
        status: updated.status,
      });
    } catch (err) {
      logger.warn('Socket emit error on correspondence:updated', err);
    }

    return updated;
  }

  /**
   * Estadísticas Generales y Métricas Ecológicas (Iniciativa Cero Papel)
   */
  public async getStats() {
    const [total, recibidos, derivados, enProceso, observados, concluidos, allSheets] = await Promise.all([
      this.prisma.routeSheet.count(),
      this.prisma.routeSheet.count({ where: { status: 'RECIBIDO' } }),
      this.prisma.routeSheet.count({ where: { status: 'DERIVADO' } }),
      this.prisma.routeSheet.count({ where: { status: 'EN_PROCESO' } }),
      this.prisma.routeSheet.count({ where: { status: 'OBSERVADO' } }),
      this.prisma.routeSheet.count({ where: { status: 'CONCLUIDO' } }),
      this.prisma.routeSheet.findMany({
        select: {
          currentArea: true,
          pageCount: true,
          movements: { select: { id: true } },
        },
      }),
    ]);

    // Carga por Área
    const areaCounts: Record<string, number> = {};
    let totalEstimatedPages = 0;

    for (const sheet of allSheets) {
      const area = sheet.currentArea || 'GENERAL';
      areaCounts[area] = (areaCounts[area] || 0) + 1;
      // Cada trámite digital ahorra: carátula + hojas adjuntas + hojas de proveídos sucesivos
      const savedPages = 1 + (sheet.pageCount || 1) + Math.max(1, sheet.movements.length);
      totalEstimatedPages += savedPages;
    }

    // Métricas ecológicas estándar:
    // 1 árbol ≈ 8,333 hojas A4
    // 1 hoja ≈ 10 litros de agua
    // 1 hoja ≈ 5g de CO2
    const treesSaved = Number((totalEstimatedPages / 8333).toFixed(2));
    const waterSavedLiters = totalEstimatedPages * 10;
    const co2SavedKg = Number(((totalEstimatedPages * 5) / 1000).toFixed(2));

    return {
      total,
      recibidos,
      derivados,
      enProceso,
      observados,
      concluidos,
      areaDistribution: Object.entries(areaCounts).map(([name, total]) => ({ name, total })),
      ecoMetrics: {
        totalSheetsSaved: totalEstimatedPages,
        treesSaved,
        waterSavedLiters,
        co2SavedKg,
      },
    };
  }
}
