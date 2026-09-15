import { PrismaClient } from '@prisma/client';
import { socketService } from '@config/socket';
import { logger } from '@config/logger';

export interface OfficialAreaConfig {
  key: string;
  name: string;
  allowedTypes: string[];
  description?: string;
}

export const CHLS_OFFICIAL_AREAS: OfficialAreaConfig[] = [
  { key: 'GG', name: 'GERENCIA GENERAL', allowedTypes: ['INF', 'CI', 'INST', 'MEM', 'NE'] },
  { key: 'ARCH', name: 'ARCHIVO', allowedTypes: ['INF', 'CI'] },
  { key: 'ALM', name: 'ALMACÉN', allowedTypes: ['INF', 'CI'] },
  { key: 'HIP', name: 'ÁREA HÍPICA', allowedTypes: ['INF', 'CI'] },
  { key: 'AL', name: 'ASESORÍA LEGAL', allowedTypes: ['INF', 'CI'] },
  { key: 'ATS', name: 'ATENCIÓN AL SOCIO', allowedTypes: ['INF', 'CI'] },
  { key: 'COM', name: 'COMUNICACIÓN', allowedTypes: ['INF', 'CI'] },
  { key: 'DEP', name: 'DEPORTES', allowedTypes: ['INF', 'CI'] },
  { key: 'GDA', name: 'GESTIÓN DOCUMENTAL Y ARCHIVO', allowedTypes: ['INF', 'CI'] },
  { key: 'SIST', name: 'SISTEMAS', allowedTypes: ['INF', 'CI'] },
  { key: 'MANT', name: 'MANTENIMIENTO', allowedTypes: ['INF', 'CI'] },
  { key: 'JOFRH', name: 'JEFATURA DE OPERACIONES FINANCIERAS Y RECURSOS HUMANOS', allowedTypes: ['INF', 'CI', 'MEM', 'INST'] },
  { key: 'JOFRH-CONTA', name: 'CONTABILIDAD', allowedTypes: ['INF', 'CI'] },
  { key: 'JOFRH-REC-CC', name: 'CAJA CENTRAL', allowedTypes: ['INF', 'CI'] },
  { key: 'JOFRH-CON', name: 'CONTRATACIONES', allowedTypes: ['INF', 'CI'] },
  { key: 'JOFRH-REC', name: 'RECAUDACIONES', allowedTypes: ['INF', 'CI'] },
  { key: 'JOFRH-RRHH', name: 'RECURSOS HUMANOS', allowedTypes: ['INF', 'CI', 'MEM'] },
];

export const CHLS_OFFICIAL_DOC_TYPES = [
  { key: 'INF', name: 'INFORME', label: 'Informe Técnico / Pericial', sigla: 'INF' },
  { key: 'CI', name: 'COMUNICACIÓN INTERNA', label: 'Comunicación Interna - Nota', sigla: 'CI' },
  { key: 'INST', name: 'INSTRUCTIVO', label: 'Instructivo Institucional', sigla: 'INST' },
  { key: 'MEM', name: 'MEMORÁNDUM', label: 'Memorándum de Funciones', sigla: 'MEM' },
  { key: 'NE', name: 'CARTA EXTERNA', label: 'Nota / Carta Externa', sigla: 'NE' },
];

export interface CreateOfficialCiteDto {
  areaKey: string;
  docType: string;
  year?: number;
  recipient: string;
  recipientRole?: string;
  recipientEntity?: string;
  senderName: string;
  senderRole: string;
  initials?: string;
  subject: string;
  bodyText?: string;
  status?: 'RESERVADO' | 'EMITIDO' | 'RADICADO_HR';
  routeSheetId?: string;
  officialDate?: string | Date;
}

export class OfficialCiteService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * Genera el código normativo de CITE según el Instructivo JOFHR 022-2026:
   * - Regla general: CHLS-[ÁREA]-[TIPO]-N° [000]/[AÑO]
   * - Regla GG Carta Externa: CHLS-GG-N° [000]/[AÑO]
   */
  public static formatCiteCode(areaKey: string, docType: string, correlative: number, year: number): string {
    const padded = String(correlative).padStart(3, '0');
    const cleanArea = areaKey.trim().toUpperCase();
    const cleanType = docType.trim().toUpperCase();

    // Caso especial normativo: Carta Externa de Gerencia General (Pág. 8 del instructivo)
    if (cleanArea === 'GG' && cleanType === 'NE') {
      return `CHLS-GG-N° ${padded}/${year}`;
    }

    // Para cualquier otra carta externa de otra unidad autorizada
    if (cleanType === 'NE') {
      return `CHLS-${cleanArea}-NE-N° ${padded}/${year}`;
    }

    return `CHLS-${cleanArea}-${cleanType}-N° ${padded}/${year}`;
  }

  /**
   * Resuelve cualquier identificador, departamento o título de área al código normativo oficial (key)
   */
  public static resolveAreaKey(identifier: string): string {
    if (!identifier) return 'GG';
    const norm = identifier.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // 1. Coincidencia exacta con una clave
    const exact = CHLS_OFFICIAL_AREAS.find((a) => a.key === norm);
    if (exact) return exact.key;

    // 2. Reglas normativas de asignación por área
    if (norm.includes('CONTA') || norm.includes('CONTABILIDAD')) return 'JOFRH-CONTA';
    if (norm.includes('MANT') || norm.includes('PISCINA') || norm.includes('TENIS') || norm.includes('POLIGONO') || norm.includes('TIRO')) return 'MANT';
    if (norm.includes('ALMACEN') || norm.includes('SUMINISTROS')) return 'ALM';
    if (norm.includes('ARCHIVO')) return 'ARCH';
    if (norm.includes('SISTEMA') || norm.includes('TECNOLOG') || norm.includes('TI')) return 'SIST';
    if (norm.includes('LEGAL') || norm.includes('ASESOR')) return 'AL';
    if (norm.includes('RRHH') || norm.includes('RECURSOS HUMANOS') || norm.includes('PLANILLA')) return 'JOFRH-RRHH';
    if (norm.includes('COMPRA') || norm.includes('CONTRATA')) return 'JOFRH-CON';
    if (norm.includes('CAJA') || norm.includes('CAJERO')) return 'JOFRH-REC-CC';
    if (norm.includes('RECAUDA') || norm.includes('COBRAN')) return 'JOFRH-REC';
    if (norm.includes('FINANZA') || norm.includes('SUBGERENCIA FIN') || norm.includes('JOFRH') || norm.includes('JOFHR') || norm.includes('OPERACIONES FINANCIERAS')) return 'JOFRH';
    if (norm.includes('HIPIC') || norm.includes('CABALLERIZA') || norm.includes('PISTA') || norm.includes('VETERINAR') || norm.includes('HERRER')) return 'HIP';
    if (norm.includes('SOCIO') || norm.includes('ATS') || norm.includes('RECEPCION') || norm.includes('CASETA') || norm.includes('PORTERIA') || norm.includes('TOALLA')) return 'ATS';
    if (norm.includes('COMUNICACION') || norm.includes('PRENSA') || norm.includes('COMERCIAL')) return 'COM';
    if (norm.includes('DEPORTE') || norm.includes('GIMNASIO')) return 'DEP';
    if (norm.includes('DOCUMENTAL') || norm.includes('GDA')) return 'GDA';
    if (norm.includes('GERENCIA') || norm.includes('DIRECTORIO') || norm.includes('SECRETARIA')) return 'GG';

    // 3. Coincidencia por nombre de área oficial
    const byName = CHLS_OFFICIAL_AREAS.find((a) => {
      const aNorm = a.name.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      return norm.includes(aNorm) || aNorm.includes(norm);
    });
    if (byName) return byName.key;

    return 'GG';
  }

  /**
   * Obtiene la configuración y permisos de un área específica
   */
  public static getAreaConfig(areaKey: string): OfficialAreaConfig | undefined {
    const cleanKey = (areaKey || '').toUpperCase().trim();
    return CHLS_OFFICIAL_AREAS.find((a) => a.key === cleanKey);
  }

  /**
   * Obtiene el catálogo oficial de áreas y tipos normativos
   */
  public getMetadata() {
    return {
      areas: CHLS_OFFICIAL_AREAS,
      docTypes: CHLS_OFFICIAL_DOC_TYPES,
      defaultYear: new Date().getFullYear(),
    };
  }

  /**
   * Vista previa del siguiente correlativo disponible (sin consumirlo)
   */
  public async getNextCitePreview(areaKey: string, docType: string, year: number = new Date().getFullYear()) {
    const cleanArea = areaKey.trim().toUpperCase();
    const cleanType = docType.trim().toUpperCase();

    const lastCite = await this.prisma.officialCite.findFirst({
      where: {
        areaKey: cleanArea,
        docType: cleanType,
        year,
      },
      orderBy: { correlative: 'desc' },
      select: { correlative: true },
    });

    const nextCorrelative = (lastCite?.correlative || 0) + 1;
    const citeCode = OfficialCiteService.formatCiteCode(cleanArea, cleanType, nextCorrelative, year);

    const areaObj = CHLS_OFFICIAL_AREAS.find((a) => a.key === cleanArea);
    const typeObj = CHLS_OFFICIAL_DOC_TYPES.find((t) => t.key === cleanType);

    return {
      areaKey: cleanArea,
      areaName: areaObj?.name || cleanArea,
      docType: cleanType,
      docTypeName: typeObj?.name || cleanType,
      year,
      nextCorrelative,
      formattedCode: citeCode,
    };
  }

  /**
   * Crea y emite de forma atómica un CITE garantizando unicidad y secuencia correlativa
   */
  public async createOfficialCite(dto: CreateOfficialCiteDto, userId?: string) {
    const year = dto.year ? Number(dto.year) : new Date().getFullYear();
    const cleanArea = dto.areaKey.trim().toUpperCase();
    const cleanType = dto.docType.trim().toUpperCase();

    const areaObj = CHLS_OFFICIAL_AREAS.find((a) => a.key === cleanArea);
    const areaName = areaObj?.name || cleanArea;

    return await this.prisma.$transaction(async (tx) => {
      // Buscar el correlativo más alto actual de manera segura dentro de la transacción
      const highest = await tx.officialCite.findFirst({
        where: {
          areaKey: cleanArea,
          docType: cleanType,
          year,
        },
        orderBy: { correlative: 'desc' },
        select: { correlative: true },
      });

      const nextCorrelative = (highest?.correlative || 0) + 1;
      const citeCode = OfficialCiteService.formatCiteCode(cleanArea, cleanType, nextCorrelative, year);

      let officialDate = new Date();
      if (dto.officialDate) {
        const parsed = new Date(dto.officialDate);
        if (!isNaN(parsed.getTime())) {
          officialDate = parsed;
        }
      }

      const created = await tx.officialCite.create({
        data: {
          citeCode,
          year,
          areaKey: cleanArea,
          areaName,
          docType: cleanType,
          correlative: nextCorrelative,
          recipient: dto.recipient.trim(),
          recipientRole: dto.recipientRole?.trim() || null,
          recipientEntity: dto.recipientEntity?.trim() || null,
          senderName: dto.senderName.trim(),
          senderRole: dto.senderRole.trim(),
          initials: dto.initials?.trim() || null,
          subject: dto.subject.trim(),
          bodyText: dto.bodyText?.trim() || null,
          status: dto.status || (dto.routeSheetId ? 'RADICADO_HR' : 'EMITIDO'),
          routeSheetId: dto.routeSheetId || null,
          createdById: userId || null,
          officialDate,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          routeSheet: {
            select: {
              id: true,
              hrCode: true,
              reference: true,
              status: true,
            },
          },
        },
      });

      // Si se vinculó a una Hoja de Ruta, actualizar también el campo `cite` en `RouteSheet` si estaba vacío
      if (dto.routeSheetId) {
        await tx.routeSheet.update({
          where: { id: dto.routeSheetId },
          data: { cite: citeCode },
        });
      }

      logger.info(`[OfficialCiteService] CITE emitido con éxito: ${citeCode} para ${cleanArea}`);

      // Notificación Socket en tiempo real a todos los despachos
      try {
        socketService.getIo()?.emit('correspondence:cite:created', created);
      } catch (err) {
        logger.warn('[OfficialCiteService] Error emitiendo socket de CITE', err);
      }

      return created;
    });
  }

  /**
   * Listado del Libro de Control de CITEs con filtros avanzados para auditoría
   */
  public async listOfficialCites(filters: {
    year?: number;
    areaKey?: string;
    docType?: string;
    status?: string;
    search?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.year) {
      where.year = Number(filters.year);
    }

    if (filters.areaKey && filters.areaKey !== 'ALL') {
      where.areaKey = filters.areaKey.trim().toUpperCase();
    }

    if (filters.docType && filters.docType !== 'ALL') {
      where.docType = filters.docType.trim().toUpperCase();
    }

    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status.trim().toUpperCase();
    }

    if (filters.userId) {
      where.createdById = filters.userId;
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { citeCode: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { recipient: { contains: q, mode: 'insensitive' } },
        { senderName: { contains: q, mode: 'insensitive' } },
        { recipientEntity: { contains: q, mode: 'insensitive' } },
        { areaName: { contains: q, mode: 'insensitive' } },
        { routeSheet: { hrCode: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.officialCite.count({ where }),
      this.prisma.officialCite.findMany({
        where,
        orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
        take: filters.limit || 100,
        skip: filters.offset || 0,
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          routeSheet: {
            select: {
              id: true,
              hrCode: true,
              reference: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return { total, items };
  }

  /**
   * Resumen estadístico del Libro de CITEs institucional (opcionalmente filtrado por área)
   */
  public async getCiteStats(year: number = new Date().getFullYear(), areaKey?: string) {
    const cleanArea = areaKey && areaKey !== 'ALL' ? areaKey.trim().toUpperCase() : undefined;
    const cites = await this.prisma.officialCite.findMany({
      where: {
        year,
        ...(cleanArea ? { areaKey: cleanArea } : {}),
      },
      select: {
        id: true,
        docType: true,
        areaKey: true,
        status: true,
        routeSheetId: true,
      },
    });

    const total = cites.length;
    const byDocType: Record<string, number> = {
      INF: 0,
      CI: 0,
      INST: 0,
      MEM: 0,
      NE: 0,
    };

    const byStatus: Record<string, number> = {
      RESERVADO: 0,
      EMITIDO: 0,
      RADICADO_HR: 0,
      ANULADO: 0,
    };

    const byArea: Record<string, number> = {};

    for (const c of cites) {
      if (byDocType[c.docType] !== undefined) {
        byDocType[c.docType]++;
      }
      if (byStatus[c.status] !== undefined) {
        byStatus[c.status]++;
      }
      byArea[c.areaKey] = (byArea[c.areaKey] || 0) + 1;
    }

    return {
      year,
      total,
      byDocType,
      byStatus,
      byArea,
      radicadosCount: cites.filter((c) => !!c.routeSheetId).length,
    };
  }

  /**
   * Obtener un CITE por ID o Código
   */
  public async getCiteById(idOrCode: string) {
    return await this.prisma.officialCite.findFirst({
      where: {
        OR: [{ id: idOrCode }, { citeCode: idOrCode }],
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        routeSheet: {
          select: {
            id: true,
            hrCode: true,
            reference: true,
            status: true,
            currentArea: true,
          },
        },
      },
    });
  }

  /**
   * Actualizar estado o anular CITE con justificación de auditoría
   */
  public async updateCiteStatus(id: string, status: string, cancellationReason?: string) {
    const updated = await this.prisma.officialCite.update({
      where: { id },
      data: {
        status: status.trim().toUpperCase(),
        cancellationReason: cancellationReason?.trim() || null,
      },
      include: {
        createdBy: true,
        routeSheet: true,
      },
    });

    try {
      socketService.getIo()?.emit('correspondence:cite:updated', updated);
    } catch (err) {
      logger.warn('[OfficialCiteService] Error emitiendo socket de actualización', err);
    }

    return updated;
  }

  /**
   * Vincular CITE a una Hoja de Ruta
   */
  public async linkToRouteSheet(citeId: string, routeSheetId: string) {
    const updated = await this.prisma.officialCite.update({
      where: { id: citeId },
      data: {
        routeSheetId,
        status: 'RADICADO_HR',
      },
      include: {
        routeSheet: true,
      },
    });

    // Actualizar también la Hoja de Ruta si no tenía CITE
    await this.prisma.routeSheet.update({
      where: { id: routeSheetId },
      data: { cite: updated.citeCode },
    });

    return updated;
  }
}
