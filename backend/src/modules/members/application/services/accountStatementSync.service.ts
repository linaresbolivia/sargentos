import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
// @ts-ignore
import { PDFParse } from 'pdf-parse';

export interface ParsedCarteraRecord {
  code: string;
  alphaCode: string;
  name: string;
  admissionDate?: string;
  mes01: number;
  mes02: number;
  mes03: number;
  mes04: number;
  mes05: number;
  mes06: number;
  mes07Mas6Meses: number;
  saldoTotal: number;
  estadoMoraOriginal: string;
  debtStatus: string;
  debtMonthsCount: number;
  accessCategory: 'GRANTED' | 'WARNING' | 'BLOCKED';
}

export interface CarteraSyncResult {
  success: boolean;
  totalParsed: number;
  totalUpdated: number;
  totalCarteraBs: number;
  sinDeudaCount: number;
  unMesCount: number;
  dosMasMesesCount: number;
  unmatchedCodes: string[];
  executionTimeMs: number;
  syncDate: Date;
}

export class AccountStatementSyncService {
  constructor(private prisma: PrismaClient) {}

  private parseAmount(val?: string): number {
    if (!val) return 0;
    const clean = val.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  private normalizeDebtStatus(estadoMora: string, saldoTotal: number): {
    debtStatus: string;
    debtMonthsCount: number;
    accessCategory: 'GRANTED' | 'WARNING' | 'BLOCKED';
  } {
    if (saldoTotal <= 0 || estadoMora.includes('SIN DEUDA')) {
      return {
        debtStatus: 'SIN_DEUDA',
        debtMonthsCount: 0,
        accessCategory: 'GRANTED'
      };
    }

    const em = estadoMora.toUpperCase();
    if (em.includes('1 MES')) {
      return {
        debtStatus: '1_MES',
        debtMonthsCount: 1,
        accessCategory: 'WARNING'
      };
    }
    if (em.includes('2 MESES')) {
      return {
        debtStatus: '2_MESES',
        debtMonthsCount: 2,
        accessCategory: 'BLOCKED'
      };
    }
    if (em.includes('3 MESES')) {
      return {
        debtStatus: '3_MESES',
        debtMonthsCount: 3,
        accessCategory: 'BLOCKED'
      };
    }
    if (em.includes('4 MESES')) {
      return {
        debtStatus: '4_MESES',
        debtMonthsCount: 4,
        accessCategory: 'BLOCKED'
      };
    }
    if (em.includes('5 MESES')) {
      return {
        debtStatus: '5_MESES',
        debtMonthsCount: 5,
        accessCategory: 'BLOCKED'
      };
    }
    if (em.includes('6 MESES')) {
      return {
        debtStatus: '6_MESES',
        debtMonthsCount: 6,
        accessCategory: 'BLOCKED'
      };
    }
    if (em.includes('MAS DE 6') || em.includes('MÁS DE 6')) {
      return {
        debtStatus: 'MAS_6_MESES',
        debtMonthsCount: 7,
        accessCategory: 'BLOCKED'
      };
    }

    // Fallback based on amount
    if (saldoTotal <= 880) {
      return {
        debtStatus: '1_MES',
        debtMonthsCount: 1,
        accessCategory: 'WARNING'
      };
    }

    const estimatedMonths = Math.min(Math.ceil(saldoTotal / 880), 7);
    return {
      debtStatus: estimatedMonths >= 7 ? 'MAS_6_MESES' : `${estimatedMonths}_MESES`,
      debtMonthsCount: estimatedMonths,
      accessCategory: 'BLOCKED'
    };
  }

  public async parseCarteraPdf(pdfBuffer: Buffer): Promise<ParsedCarteraRecord[]> {
    const parser = new PDFParse(new Uint8Array(pdfBuffer));
    const result = await parser.getText();

    const allLines: string[] = [];
    for (let i = 0; i < result.pages.length; i++) {
      const pageText = result.pages[i].text || '';
      const lines = pageText.split('\n').map((l: string) => l.trim()).filter(Boolean);
      allLines.push(...lines);
    }

    const records: ParsedCarteraRecord[] = [];

    // Main Regex:
    // Code (1 to 5 digits), AlphaCode, Name, optional date, 7 to 8 amounts, optional trailing status
    const standardRegex = /^(\d+)\s+([A-Za-z0-9ÑÁÉÍÓÚÜ\.\-]+)\s+(.+?)(?:\s+(\d{1,2}\/\d{1,2}\/\d{4}))?\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)(?:\s+([\d.,]+))?\s+([\d.,]+)(?:\s+(.+))?$/;

    for (const line of allLines) {
      // Must start with membership digits
      if (!/^\d{1,5}\s+[A-Za-z0-9Ñ]/.test(line)) {
        continue;
      }
      // Skip summary / header lines
      if (line.includes('strCodigo') || line.includes('ACUMULADO') || line.includes('SIN DEUDA 837')) {
        continue;
      }

      const match = line.match(standardRegex);
      if (match) {
        const code = match[1];
        const alphaCode = match[2];
        const name = match[3];
        const admissionDate = match[4];
        
        let mes01 = this.parseAmount(match[5]);
        let mes02 = this.parseAmount(match[6]);
        let mes03 = this.parseAmount(match[7]);
        let mes04 = this.parseAmount(match[8]);
        let mes05 = this.parseAmount(match[9]);
        let mes06 = this.parseAmount(match[10]);
        let mes07 = match[11] ? this.parseAmount(match[11]) : 0;
        let saldoTotal = this.parseAmount(match[12]);
        let estadoMoraOriginal = (match[13] || '').trim();

        // If only 7 amounts were matched, match[12] was actually mes07 and saldoTotal was in match[11] or vice-versa
        // Let's verify sum
        const sumMeses = mes01 + mes02 + mes03 + mes04 + mes05 + mes06 + mes07;
        if (saldoTotal === 0 && sumMeses > 0) {
          saldoTotal = sumMeses;
        }

        if (!estadoMoraOriginal) {
          estadoMoraOriginal = saldoTotal === 0 ? 'SIN DEUDA' : 'CON SALDO';
        }

        const { debtStatus, debtMonthsCount, accessCategory } = this.normalizeDebtStatus(estadoMoraOriginal, saldoTotal);

        records.push({
          code,
          alphaCode,
          name: name.replace(/SOCIO ACTIVO PRESENTE|HONORARIO|PASIVO|Activo/gi, '').trim(),
          admissionDate,
          mes01,
          mes02,
          mes03,
          mes04,
          mes05,
          mes06,
          mes07Mas6Meses: mes07,
          saldoTotal,
          estadoMoraOriginal,
          debtStatus,
          debtMonthsCount,
          accessCategory
        });
      }
    }

    return records;
  }

  public async syncFromBuffer(pdfBuffer: Buffer, cutOffDate: string = '15/10/2026'): Promise<CarteraSyncResult> {
    const startTime = Date.now();
    const records = await this.parseCarteraPdf(pdfBuffer);

    let totalUpdated = 0;
    let totalCarteraBs = 0;
    let sinDeudaCount = 0;
    let unMesCount = 0;
    let dosMasMesesCount = 0;
    const unmatchedCodes: string[] = [];

    // Query existing memberships to map
    const codes = records.map(r => r.code);
    const existingMemberships = await this.prisma.membership.findMany({
      where: { membershipNumber: { in: codes } },
      select: { id: true, membershipNumber: true }
    });

    const membershipMap = new Map<string, string>();
    for (const m of existingMemberships) {
      membershipMap.set(m.membershipNumber, m.id);
    }

    // Execute bulk update in batches for high speed
    const batchSize = 100;
    const now = new Date();

    for (let i = 0; i < records.length; i += batchSize) {
      const chunk = records.slice(i, i + batchSize);
      
      await Promise.all(
        chunk.map(async (rec) => {
          const membershipId = membershipMap.get(rec.code);
          if (!membershipId) {
            unmatchedCodes.push(rec.code);
            return;
          }

          const breakdownJson = JSON.stringify({
            oct26: rec.mes01,
            sept26: rec.mes02,
            ago26: rec.mes03,
            jul26: rec.mes04,
            jun26: rec.mes05,
            may26: rec.mes06,
            mas6meses: rec.mes07Mas6Meses,
            originalMora: rec.estadoMoraOriginal,
            cutOffDate
          });

          // Use raw update to support added columns without requiring new Prisma generate DLL restart
          await this.prisma.$executeRawUnsafe(
            `UPDATE memberships 
             SET "totalDebt" = $1, 
                 "debtStatus" = $2, 
                 "debtMonthsCount" = $3, 
                 "debtBreakdown" = $4, 
                 "lastDebtSync" = $5,
                 "updatedAt" = $5
             WHERE id = $6`,
            rec.saldoTotal,
            rec.debtStatus,
            rec.debtMonthsCount,
            breakdownJson,
            now,
            membershipId
          );

          totalUpdated++;
          totalCarteraBs += rec.saldoTotal;
          if (rec.debtMonthsCount === 0) {
            sinDeudaCount++;
          } else if (rec.debtMonthsCount === 1) {
            unMesCount++;
          } else {
            dosMasMesesCount++;
          }
        })
      );
    }

    return {
      success: true,
      totalParsed: records.length,
      totalUpdated,
      totalCarteraBs: Math.round(totalCarteraBs * 100) / 100,
      sinDeudaCount,
      unMesCount,
      dosMasMesesCount,
      unmatchedCodes,
      executionTimeMs: Date.now() - startTime,
      syncDate: now
    };
  }

  public async syncFromDefaultDesktopFile(): Promise<CarteraSyncResult> {
    const defaultPaths = [
      'C:\\Users\\HP\\Desktop\\sorCarteraEspecialAL 15-10-26 SISTEMAS (1).pdf',
      'C:\\Users\\HP\\Downloads\\sorCarteraEspecialAL 15-10-26 SISTEMAS.pdf'
    ];

    let foundPath: string | null = null;
    for (const p of defaultPaths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (!foundPath) {
      throw new Error('No se encontró el archivo de Cartera Especial en el Escritorio ni en Descargas.');
    }

    const buf = fs.readFileSync(foundPath);
    return this.syncFromBuffer(buf, '15/10/2026');
  }

  public async getSummaryMetrics() {
    const rawCounts: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(*)::int as "totalMemberships",
        COALESCE(SUM("totalDebt"), 0)::float as "totalCarteraBs",
        COUNT(CASE WHEN "totalDebt" = 0 OR "debtStatus" = 'SIN_DEUDA' THEN 1 END)::int as "sinDeudaCount",
        COUNT(CASE WHEN "debtStatus" = '1_MES' OR ("debtMonthsCount" = 1 AND "totalDebt" > 0) THEN 1 END)::int as "unMesCount",
        COUNT(CASE WHEN "debtStatus" NOT IN ('SIN_DEUDA', '1_MES') AND "totalDebt" > 880 THEN 1 END)::int as "dosMasMesesCount",
        MAX("lastDebtSync") as "lastSyncDate"
      FROM memberships
    `);

    const stats = rawCounts[0] || {
      totalMemberships: 0,
      totalCarteraBs: 0,
      sinDeudaCount: 0,
      unMesCount: 0,
      dosMasMesesCount: 0,
      lastSyncDate: null
    };

    return {
      ...stats,
      toleranceRule: 'OPCION_2_MARGEN_1_MES',
      ruleDescription: '1 mes de mora: Acceso permitido con advertencia amarilla. 2 o más meses: Acceso bloqueado en garita.'
    };
  }

  public async listAccountStatements(params: {
    search?: string;
    statusFilter?: string; // ALL, SIN_DEUDA, 1_MES, BLOQUEADOS
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(Number(params.page) || 1, 1);
    const limit = Math.min(Math.max(Number(params.limit) || 20, 5), 100);
    const offset = (page - 1) * limit;

    let whereClause = `WHERE 1=1`;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (params.search && params.search.trim().length > 0) {
      const s = `%${params.search.trim()}%`;
      whereClause += ` AND (
        m."membershipNumber" ILIKE $${paramIndex} OR
        p."firstName" ILIKE $${paramIndex} OR
        p."lastName" ILIKE $${paramIndex} OR
        p."documentId" ILIKE $${paramIndex} OR
        p."alphaCode" ILIKE $${paramIndex}
      )`;
      queryParams.push(s);
      paramIndex++;
    }

    if (params.statusFilter === 'SIN_DEUDA') {
      whereClause += ` AND (m."totalDebt" = 0 OR m."debtStatus" = 'SIN_DEUDA')`;
    } else if (params.statusFilter === '1_MES') {
      whereClause += ` AND (m."debtStatus" = '1_MES' OR (m."debtMonthsCount" = 1 AND m."totalDebt" > 0))`;
    } else if (params.statusFilter === 'BLOQUEADOS') {
      whereClause += ` AND (m."debtStatus" NOT IN ('SIN_DEUDA', '1_MES') AND m."totalDebt" > 880)`;
    }

    const countQuery = `
      SELECT COUNT(*)::int as total
      FROM memberships m
      JOIN persons p ON m."titularId" = p.id
      ${whereClause}
    `;
    const countResult: any[] = await this.prisma.$queryRawUnsafe(countQuery, ...queryParams);
    const total = countResult[0]?.total || 0;

    const dataQuery = `
      SELECT 
        m.id,
        m."membershipNumber",
        m."status" as "membershipStatus",
        m."totalDebt"::float as "totalDebt",
        m."debtStatus",
        m."debtMonthsCount",
        m."debtBreakdown",
        m."lastDebtSync",
        p.id as "personId",
        p."firstName",
        p."lastName",
        p."documentId",
        p."alphaCode",
        p.email,
        p.mobile,
        p."photoUrl",
        mt.name as "typeName"
      FROM memberships m
      JOIN persons p ON m."titularId" = p.id
      LEFT JOIN membership_types mt ON m."typeId" = mt.id
      ${whereClause}
      ORDER BY m."totalDebt" DESC, m."membershipNumber" ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const rows: any[] = await this.prisma.$queryRawUnsafe(dataQuery, ...queryParams);

    const data = rows.map(r => {
      let breakdown = null;
      try {
        if (r.debtBreakdown) breakdown = JSON.parse(r.debtBreakdown);
      } catch (e) {}

      let accessRuleResult: 'GRANTED' | 'WARNING' | 'DENIED' = 'GRANTED';
      let accessReason = 'Al Día';

      if (r.totalDebt > 0) {
        if (r.debtStatus === '1_MES' || r.debtMonthsCount === 1 || r.totalDebt <= 880) {
          accessRuleResult = 'WARNING';
          accessReason = `Advertencia: 1 mes de mora pendiente (Bs. ${r.totalDebt.toFixed(2)})`;
        } else {
          accessRuleResult = 'DENIED';
          accessReason = `Acceso Denegado por Mora (${r.debtMonthsCount || 2}+ meses - Bs. ${r.totalDebt.toFixed(2)})`;
        }
      }

      return {
        id: r.id,
        membershipNumber: r.membershipNumber,
        membershipStatus: r.membershipStatus,
        totalDebt: r.totalDebt,
        debtStatus: r.debtStatus || 'SIN_DEUDA',
        debtMonthsCount: r.debtMonthsCount || 0,
        debtBreakdown: breakdown,
        lastDebtSync: r.lastDebtSync,
        accessRuleResult,
        accessReason,
        titular: {
          id: r.personId,
          fullName: `${r.firstName || ''} ${r.lastName || ''}`.trim(),
          documentId: r.documentId,
          alphaCode: r.alphaCode,
          email: r.email,
          mobile: r.mobile,
          photoUrl: r.photoUrl,
          typeName: r.typeName
        }
      };
    });

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data
    };
  }
}
