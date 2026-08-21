import { PrismaClient } from '@prisma/client';

export class FinancialSettingsService {
  constructor(private prisma: PrismaClient) {}

  private defaultParameters = [
    { key: 'CUOTA_SOCIAL_PRESENTE', value: '880.00', num: 880, cat: 'TARIFAS', desc: 'Cuota social mensual para socio presente' },
    { key: 'CUOTA_SOCIAL_AUSENTE', value: '440.00', num: 440, cat: 'TARIFAS', desc: 'Cuota social reducida para socio con viaje/ausencia autorizada' },
    { key: 'PORC_DERECHO_INGRESO', value: '60', num: 60, cat: 'PORCENTAJES', desc: 'Porcentaje de adquisición destinado a Derecho de Ingreso (Facturado)' },
    { key: 'PORC_CDP', value: '40', num: 40, cat: 'PORCENTAJES', desc: 'Porcentaje de adquisición destinado a Cuota de Participación (Recibo)' },
    { key: 'BOX_HIPICO_MENSUAL', value: '195.00', num: 195, cat: 'TARIFAS', desc: 'Mantenimiento mensual por caballo / box hípico' },
    { key: 'ESCUELA_TENIS_BASICO', value: '160.00', num: 160, cat: 'TARIFAS', desc: 'Tarifa mensual escuela de tenis formativo/básico' },
    { key: 'ESCUELA_TENIS_AVANZADO', value: '230.00', num: 230, cat: 'TARIFAS', desc: 'Tarifa mensual escuela de tenis avanzado/competencia' },
    { key: 'EDAD_LIMITE_DEPENDIENTES', value: '25', num: 25, cat: 'REGLAS', desc: 'Edad máxima para ser dependiente de un título familiar' },
    { key: 'EDAD_HONORARIO', value: '60', num: 60, cat: 'REGLAS', desc: 'Edad mínima requerida para aspirar a Socio Honorario' },
    { key: 'ANTIGUEDAD_HONORARIO', value: '20', num: 20, cat: 'REGLAS', desc: 'Años mínimos de antigüedad continua como socio activo para Socio Honorario' },
    { key: 'TOLERANCIA_MORA_ACCESO_MESES', value: '2', num: 2, cat: 'MORA', desc: 'Meses de gracia permitidos antes del bloqueo en torniquetes (Rojo)' },
    { key: 'TOLERANCIA_MORA_ASAMBLEA_MESES', value: '1', num: 1, cat: 'MORA', desc: 'Tolerancia máxima de deuda para ser habilitado en asambleas' }
  ];

  /**
   * Get all Parameters, auto-seeding if empty
   */
  public async getParameters() {
    let params = await this.prisma.systemFinancialParameter.findMany({
      orderBy: [{ category: 'asc' }, { parameterKey: 'asc' }]
    });

    if (params.length === 0) {
      for (const p of this.defaultParameters) {
        await this.prisma.systemFinancialParameter.create({
          data: {
            parameterKey: p.key,
            parameterValue: p.value,
            numericValue: p.num,
            description: p.desc,
            category: p.cat
          }
        });
      }
      params = await this.prisma.systemFinancialParameter.findMany({
        orderBy: [{ category: 'asc' }, { parameterKey: 'asc' }]
      });
    }

    return params;
  }

  /**
   * Update Parameter
   */
  public async updateParameter(key: string, value: string, numericValue?: number, updatedBy?: string) {
    return this.prisma.systemFinancialParameter.upsert({
      where: { parameterKey: key },
      update: {
        parameterValue: value,
        numericValue: numericValue !== undefined ? numericValue : parseFloat(value) || null,
        updatedBy,
        updatedAt: new Date()
      },
      create: {
        parameterKey: key,
        parameterValue: value,
        numericValue: numericValue !== undefined ? numericValue : parseFloat(value) || null,
        description: key,
        category: 'PARAMETROS',
        updatedBy
      }
    });
  }
}
