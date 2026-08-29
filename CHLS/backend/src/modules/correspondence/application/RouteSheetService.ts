import { PrismaClient, RouteSheetPriority, RouteSheetSenderType, RouteSheetStatus } from '@prisma/client';
import { CreateRouteSheetInput, AddMovementInput, UpdateStatusInput, MergeRouteSheetsInput } from '../domain/correspondence.dto';
import { socketService } from '@config/socket';
import { logger } from '@config/logger';

export class RouteSheetService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Genera el siguiente código correlativo de Hoja de Ruta
   * Formato: HR-YYYY-00001 (con soporte de punto de corte inicial / gestión)
   */
  private async generateNextCode(year: number): Promise<{ hrCode: string; correlativeNumber: number }> {
    // 1. Obtener punto de corte inicial configurado para el año si existe
    let initialCutoff = 1;
    try {
      const setting = await this.prisma.corrSetting.findUnique({
        where: { key: 'GLOBAL_SETTINGS' },
      });
      if (setting && setting.value) {
        const val = setting.value as any;
        if (val.gestiones && val.gestiones[year] && val.gestiones[year].initialCorrelative) {
          initialCutoff = Number(val.gestiones[year].initialCorrelative) || 1;
        } else if (val.initialCorrelativeNumber) {
          initialCutoff = Number(val.initialCorrelativeNumber) || 1;
        }
      }
    } catch (err) {
      console.error('[RouteSheetService] Error al leer correlativo inicial:', err);
    }

    const lastRecord = await this.prisma.routeSheet.findFirst({
      where: { year },
      orderBy: { correlativeNumber: 'desc' },
      select: { correlativeNumber: true },
    });

    let nextNumber = initialCutoff;
    if (lastRecord && lastRecord.correlativeNumber) {
      nextNumber = Math.max(lastRecord.correlativeNumber + 1, initialCutoff);
    }

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
   * Listar Hojas de Ruta con filtros de bandejas (Inbox, Outbox, Copies, Archive, All) y paginación
   */
  public async list(params: {
    status?: string;
    priority?: string;
    area?: string;
    search?: string;
    senderType?: string;
    year?: number;
    mailbox?: 'INBOX' | 'OUTBOX' | 'COPIES' | 'ARCHIVED' | 'ALL' | string;
    userArea?: string;
    userId?: string;
    userName?: string;
    limit?: number;
    offset?: number;
  }) {
    const {
      status,
      priority,
      area,
      search,
      senderType,
      year,
      mailbox = 'ALL',
      userArea,
      userId,
      userName,
      limit = 50,
      offset = 0,
    } = params;

    const where: any = {};

    // Filtro por Gestión / Año
    if (year && Number(year) > 0) {
      where.year = Number(year);
    }

    // 1. Filtrado por Bandeja Oficial (Custodia y Flujo)
    if (mailbox === 'INBOX') {
      // Trámites actualmente en custodia del área del usuario (no concluidos/archivados)
      if (userArea && userArea !== 'ALL') {
        where.currentArea = userArea;
      }
      where.status = { notIn: ['CONCLUIDO', 'ANULADO'] };
    } else if (mailbox === 'OUTBOX') {
      // Trámites que este usuario o área derivó a otros y están en tránsito
      const outboxConditions: any[] = [];
      if (userId) {
        outboxConditions.push({ createdById: userId });
        outboxConditions.push({ movements: { some: { sourceUserId: userId } } });
      }
      if (userArea && userArea !== 'ALL') {
        outboxConditions.push({ movements: { some: { sourceArea: userArea } } });
      }
      if (outboxConditions.length > 0) {
        where.OR = outboxConditions;
      }
      if (userArea && userArea !== 'ALL') {
        where.currentArea = { not: userArea };
      }
      where.status = { notIn: ['CONCLUIDO', 'ANULADO'] };
    } else if (mailbox === 'COPIES') {
      // Trámites donde el área o funcionario fue incluido con Copia C.C.
      const searchTerms = [userArea, userName].filter(Boolean) as string[];
      if (searchTerms.length > 0) {
        where.movements = {
          some: {
            OR: searchTerms.map((term) => ({
              instruction: { contains: term, mode: 'insensitive' },
            })),
          },
        };
      }
    } else if (mailbox === 'ARCHIVED') {
      // Trámites en Archivo Central / Concluidos
      where.OR = [
        { status: 'CONCLUIDO' },
        { status: 'ANULADO' },
        { currentArea: 'ARCHIVO_CENTRAL' },
        { archiveLocation: { not: null } },
      ];
    }

    if (status && status !== 'ALL' && mailbox !== 'INBOX' && mailbox !== 'OUTBOX' && mailbox !== 'ARCHIVED') {
      where.status = status as RouteSheetStatus;
    }

    if (priority && priority !== 'ALL') {
      where.priority = priority as RouteSheetPriority;
    }

    if (area && area !== 'ALL' && mailbox !== 'INBOX') {
      where.currentArea = area;
    }

    if (senderType && senderType !== 'ALL') {
      where.senderType = senderType as RouteSheetSenderType;
    }

    if (search && search.trim()) {
      const q = search.trim();
      const searchConditions = [
        { hrCode: { contains: q, mode: 'insensitive' } },
        { reference: { contains: q, mode: 'insensitive' } },
        { senderName: { contains: q, mode: 'insensitive' } },
        { cite: { contains: q, mode: 'insensitive' } },
        { senderArea: { contains: q, mode: 'insensitive' } },
        { archiveLocation: { contains: q, mode: 'insensitive' } },
        { archiveBox: { contains: q, mode: 'insensitive' } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
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
   * Archivar Hoja de Ruta en Archivo Central
   */
  public async archive(id: string, data: { archiveLocation: string; archiveBox?: string; archiveNotes?: string; userId: string }) {
    const routeSheet = await this.prisma.routeSheet.findUnique({
      where: { id },
      include: { movements: true },
    });

    if (!routeSheet) throw new Error('Hoja de Ruta no encontrada');

    const nextSeq = routeSheet.movements.length + 1;

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Crear proveído de archivo
      await tx.hrMovement.create({
        data: {
          routeSheetId: id,
          sequenceNumber: nextSeq,
          sourceUserId: data.userId,
          sourceArea: routeSheet.currentArea,
          targetArea: 'ARCHIVO_CENTRAL',
          targetPersonName: 'Custodia & Archivo Central',
          instruction: `ARCHIVADO EN ARCHIVO CENTRAL.\nUbicación: ${data.archiveLocation.trim()}${data.archiveBox ? ` (Caja: ${data.archiveBox.trim()})` : ''}\nMotivo / Auto: ${data.archiveNotes ? data.archiveNotes.trim() : 'Trámite concluido y remitido a custodia definitiva.'}`,
          quickStamp: 'ARCHIVADO',
        },
      });

      // 2. Actualizar estado y ubicación de archivo
      return tx.routeSheet.update({
        where: { id },
        data: {
          status: 'CONCLUIDO',
          currentArea: 'ARCHIVO_CENTRAL',
          archiveLocation: data.archiveLocation.trim(),
          archiveBox: data.archiveBox?.trim() || null,
          archiveNotes: data.archiveNotes?.trim() || null,
          archivedAt: new Date(),
          archivedById: data.userId,
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
    });

    try {
      socketService.getIo()?.emit('correspondence:updated', updated);
    } catch (sockErr) {
      logger.warn('Socket broadcast error on archive', sockErr);
    }

    return updated;
  }

  /**
   * Desarchivar y reabrir Hoja de Ruta
   */
  public async unarchive(id: string, data: { unarchiveReason: string; targetArea: string; userId: string }) {
    const routeSheet = await this.prisma.routeSheet.findUnique({
      where: { id },
      include: { movements: true },
    });

    if (!routeSheet) throw new Error('Hoja de Ruta no encontrada');

    const nextSeq = routeSheet.movements.length + 1;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.hrMovement.create({
        data: {
          routeSheetId: id,
          sequenceNumber: nextSeq,
          sourceUserId: data.userId,
          sourceArea: 'ARCHIVO_CENTRAL',
          targetArea: data.targetArea,
          targetPersonName: 'Reapertura de Trámite',
          instruction: `DESARCHIVO Y REAPERTURA DE EXPEDIENTE: Se retira del Archivo Central y se reasigna a ${data.targetArea}.\nMotivo justificado: ${data.unarchiveReason.trim()}`,
          quickStamp: 'DESARCHIVADO',
        },
      });

      return tx.routeSheet.update({
        where: { id },
        data: {
          status: 'EN_PROCESO',
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
    });

    try {
      socketService.getIo()?.emit('correspondence:updated', updated);
    } catch (sockErr) {
      logger.warn('Socket broadcast error on unarchive', sockErr);
    }

    return updated;
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
   * Fusión / Acumulación de Hojas de Ruta
   */
  public async mergeRouteSheets(data: MergeRouteSheetsInput, userId: string) {
    const { targetRouteSheetId, sourceRouteSheetIds, reason } = data;

    const targetHr = await this.prisma.routeSheet.findUnique({
      where: { id: targetRouteSheetId },
      include: { movements: true },
    });

    if (!targetHr) {
      throw new Error('Hoja de Ruta Matriz no encontrada');
    }

    const sourceHrs = await this.prisma.routeSheet.findMany({
      where: { id: { in: sourceRouteSheetIds } },
      include: { movements: { include: { sourceUser: true } } },
    });

    if (sourceHrs.length === 0) {
      throw new Error('No se encontraron Hojas de Ruta secundarias para fusionar');
    }

    // Calcular suma de fojas y correlativos
    let additionalPages = 0;
    const sourceCodes: string[] = [];

    for (const src of sourceHrs) {
      additionalPages += src.pageCount || 1;
      sourceCodes.push(src.hrCode);
    }

    const newTotalPages = (targetHr.pageCount || 1) + additionalPages;
    let nextSeq = targetHr.movements.length + 1;

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Re-vincular / copiar proveídos de las secundarias a la Matriz con su etiqueta distintiva
      for (const src of sourceHrs) {
        for (const mov of src.movements) {
          await tx.hrMovement.create({
            data: {
              routeSheetId: targetRouteSheetId,
              sequenceNumber: nextSeq++,
              sourceUserId: mov.sourceUserId || userId,
              sourceArea: mov.sourceArea,
              targetArea: mov.targetArea,
              targetPersonName: mov.targetPersonName,
              instruction: `[EXPEDIENTE ACUMULADO DE HR: ${src.hrCode}]\n${mov.instruction}`,
              quickStamp: mov.quickStamp || 'EXPEDIENTE ACUMULADO',
            },
          });
        }

        // 2. Marcar la Hoja de Ruta secundaria como CONCLUIDO / FUSIONADO
        await tx.routeSheet.update({
          where: { id: src.id },
          data: {
            status: 'CONCLUIDO',
            currentArea: `FUSIONADO EN ${targetHr.hrCode}`,
            aiSummary: `FUSIONADO Y ACUMULADO A LA HOJA DE RUTA MATRIZ ${targetHr.hrCode}. Motivo: ${reason}`,
          },
        });
      }

      // 3. Crear el Proveído Formal Maestro de Acumulación en la Matriz
      await tx.hrMovement.create({
        data: {
          routeSheetId: targetRouteSheetId,
          sequenceNumber: nextSeq++,
          sourceUserId: userId,
          sourceArea: targetHr.currentArea,
          targetArea: targetHr.currentArea,
          targetPersonName: 'Secretaría de Gerencia General',
          instruction: `AUTO DE ACUMULACIÓN DE EXPEDIENTES: Se fusionan e incorporan formalmente los antecedentes de las Hojas de Ruta [${sourceCodes.join(', ')}] por conexidad de trámite.\nMotivo: ${reason.trim()}\nTotal fojas acumuladas en el expediente: ${newTotalPages} fojas.`,
          quickStamp: 'EXPEDIENTE FUSIONADO',
        },
      });

      // 4. Actualizar total de fojas y recargar Matriz consolidada
      const updatedTarget = await tx.routeSheet.update({
        where: { id: targetRouteSheetId },
        data: {
          pageCount: newTotalPages,
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

      return updatedTarget;
    });

    try {
      socketService.getIo()?.emit('correspondence:updated', {
        id: targetRouteSheetId,
        hrCode: targetHr.hrCode,
        status: result.status,
        currentArea: result.currentArea,
      });
      for (const src of sourceHrs) {
        socketService.getIo()?.emit('correspondence:updated', {
          id: src.id,
          hrCode: src.hrCode,
          status: 'CONCLUIDO',
          currentArea: `FUSIONADO EN ${targetHr.hrCode}`,
        });
      }
    } catch (err) {
      logger.warn('Socket emit error on correspondence:updated', err);
    }

    return result;
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
