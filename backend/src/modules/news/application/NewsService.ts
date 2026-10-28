import { PrismaClient } from '@prisma/client';
import { logger } from '@config/logger';

export interface CreateDocumentDto {
  title: string;
  summary: string;
  content: string;
  category?: string;
  type?: string;
  coverImageUrl?: string;
  isPinned?: boolean;
  isPublished?: boolean;
  authorName?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: string;
  attachmentType?: string;
  attachments?: any;
}

export class NewsService {
  constructor(private prisma: PrismaClient) {}

  private generateSlug(title: string): string {
    const clean = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${clean}-${random}`;
  }

  public async getPosts(filters: {
    category?: string;
    type?: string;
    search?: string;
    isPublished?: boolean;
    onlyPinned?: boolean;
  }) {
    const where: any = {};

    if (filters.isPublished !== undefined) {
      where.isPublished = filters.isPublished;
    }

    if (filters.category && filters.category !== 'TODOS') {
      where.category = filters.category;
    }

    if (filters.type && filters.type !== 'TODOS') {
      where.type = filters.type;
    }

    if (filters.onlyPinned) {
      where.isPinned = true;
    }

    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
        { attachmentName: { contains: q, mode: 'insensitive' } },
        { authorName: { contains: q, mode: 'insensitive' } }
      ];
    }

    const posts = await this.prisma.clubPost.findMany({
      where,
      orderBy: [
        { isPinned: 'desc' },
        { publishedAt: 'desc' }
      ]
    });

    return posts;
  }

  public async getPostById(id: string) {
    const post = await this.prisma.clubPost.findUnique({
      where: { id }
    });

    if (!post) {
      return null;
    }

    try {
      await this.prisma.clubPost.update({
        where: { id },
        data: { viewCount: { increment: 1 } }
      });
    } catch (e) {
      // Non-critical
    }

    return post;
  }

  public async incrementDownload(id: string) {
    const post = await this.prisma.clubPost.update({
      where: { id },
      data: { downloadCount: { increment: 1 } }
    });
    return post;
  }

  public async createPost(dto: CreateDocumentDto) {
    const slug = this.generateSlug(dto.title);
    const post = await this.prisma.clubPost.create({
      data: {
        title: dto.title,
        slug,
        summary: dto.summary,
        content: dto.content,
        category: dto.category || 'ESTATUTOS',
        type: dto.type || 'DOCUMENTO_OFICIAL',
        coverImageUrl: dto.coverImageUrl || null,
        isPinned: Boolean(dto.isPinned),
        isPublished: dto.isPublished !== undefined ? Boolean(dto.isPublished) : true,
        authorName: dto.authorName || 'Secretaría General CHLS',
        attachmentUrl: dto.attachmentUrl || null,
        attachmentName: dto.attachmentName || null,
        attachmentSize: dto.attachmentSize || null,
        attachmentType: dto.attachmentType || null,
        attachments: dto.attachments || []
      }
    });

    logger.info(`Documento registrado en Biblioteca Digital: ${post.id} - ${post.title}`);
    return post;
  }

  public async updatePost(id: string, dto: Partial<CreateDocumentDto>) {
    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.summary !== undefined) data.summary = dto.summary;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.coverImageUrl !== undefined) data.coverImageUrl = dto.coverImageUrl;
    if (dto.isPinned !== undefined) data.isPinned = Boolean(dto.isPinned);
    if (dto.isPublished !== undefined) data.isPublished = Boolean(dto.isPublished);
    if (dto.authorName !== undefined) data.authorName = dto.authorName;
    if (dto.attachmentUrl !== undefined) data.attachmentUrl = dto.attachmentUrl;
    if (dto.attachmentName !== undefined) data.attachmentName = dto.attachmentName;
    if (dto.attachmentSize !== undefined) data.attachmentSize = dto.attachmentSize;
    if (dto.attachmentType !== undefined) data.attachmentType = dto.attachmentType;
    if (dto.attachments !== undefined) data.attachments = dto.attachments;

    const post = await this.prisma.clubPost.update({
      where: { id },
      data
    });

    return post;
  }

  public async deletePost(id: string) {
    return await this.prisma.clubPost.delete({
      where: { id }
    });
  }

  /**
   * Repositorio Exclusivo de Biblioteca Digital Oficial para los Socios del Club
   */
  public async seedDefaultPosts() {
    // Limpiamos publicaciones anteriores para garantizar una biblioteca digital pura
    await this.prisma.clubPost.deleteMany({});

    const officialDocuments = [
      {
        title: 'Estatuto Orgánico Oficial del Club Hípico Los Sargentos',
        summary: 'Texto consolidado y certificado de la norma suprema institucional que rige los derechos, deberes, gobierno y patrimonio del Club.',
        content: `El presente documento constituye el **Estatuto Orgánico Oficial del Club Hípico Los Sargentos**, aprobado y homologado en Asamblea General Extraordinaria de Asociados.\n\n### Capítulos Clave:\n- **Título I:** De la Naturaleza, Domicilio y Fines Institucionales.\n- **Título II:** De los Asociados: Propietarios, Traspasarios, Familiares y Honorarios.\n- **Título III:** De los Derechos y Obligaciones de los Señores Socios.\n- **Título IV:** De la Asamblea General y la Elección Democrática del Directorio.\n- **Título V:** Del Tribunal de Honor y el Régimen Disciplinario.\n\nSe recomienda a todos los señores asociados descargar y conservar este documento oficial para su debida consulta reglamentaria.`,
        category: 'ESTATUTOS',
        type: 'ESTATUTO',
        isPinned: true,
        isPublished: true,
        authorName: 'Secretaría General & Asesoría Legal',
        publishedAt: new Date(),
        coverImageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80',
        attachmentUrl: '/uploads/documents/ESTATUTO_ORGANICO_CHLS_OFICIAL.pdf',
        attachmentName: 'Estatuto_Organico_CHLS_Oficial.pdf',
        attachmentSize: '3.8 MB',
        attachmentType: 'PDF'
      },
      {
        title: 'Reglamento General Interno y Régimen de Convivencia Institucional',
        summary: 'Compendio de normas sobre uso de instalaciones, código de etiqueta, disciplina social y régimen sancionatorio de la institución.',
        content: `Normativa reglamentaria interna destinada a preservar la armonía, el decoro y el disfrute óptimo de las áreas sociales, deportivas y recreativas del Club.\n\n### Contenido Principal:\n1. Normas de ingreso, control biométrico y acreditación de invitados.\n2. Uso responsable de las áreas verdes, picaderos, complejos acuáticos y canchas.\n3. Procedimientos ante el Tribunal de Honor y faltas disciplinarias.\n4. Disposiciones de seguridad física y resguardo patrimonial.`,
        category: 'ESTATUTOS',
        type: 'REGLAMENTO',
        isPinned: true,
        isPublished: true,
        authorName: 'Directorio General CHLS',
        publishedAt: new Date(Date.now() - 86400000 * 2),
        coverImageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
        attachmentUrl: '/uploads/documents/REGLAMENTO_GENERAL_INTERNO_CHLS.pdf',
        attachmentName: 'Reglamento_General_Interno_CHLS.pdf',
        attachmentSize: '2.4 MB',
        attachmentType: 'PDF'
      },
      {
        title: 'Convocatoria Oficial: Asamblea General Extraordinaria de Asociados 2026',
        summary: 'Convocatoria formal y orden del día para la consideración de proyectos de inversión, mantenimiento tecnológico y modernización integral.',
        content: `Por disposición del Directorio General del Club Hípico Los Sargentos, se convoca formalmente a los señores socios con derecho estatutario a la **Asamblea General Extraordinaria**.\n\n### Orden del Día:\n1. Verificación del quórum legal.\n2. Consideración del informe de la Comisión Revisora.\n3. Aprobación del plan de modernización de infraestructura deportiva 2026.\n4. Resoluciones complementarias de Directorio.\n\nDescargue la convocatoria oficial firmada en el archivo adjunto.`,
        category: 'CONVOCATORIAS',
        type: 'CONVOCATORIA',
        isPinned: true,
        isPublished: true,
        authorName: 'Presidencia & Secretaría General',
        publishedAt: new Date(Date.now() - 86400000 * 3),
        coverImageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80',
        attachmentUrl: '/uploads/documents/CONVOCATORIA_ASAMBLEA_EXTRAORDINARIA_2026.pdf',
        attachmentName: 'Convocatoria_Asamblea_Extraordinaria_2026.pdf',
        attachmentSize: '1.2 MB',
        attachmentType: 'PDF'
      },
      {
        title: 'Formulario Oficial de Solicitud de Traspaso de Cuota Patrimonial',
        summary: 'Formulario y requisitos documentales indispensables para el trámite de cesión o transferencia de acciones patrimoniales entre asociados.',
        content: `Formulario oficial emitido por la Gerencia General para el inicio de trámites de traspaso de acción o cuota patrimonial.\n\n### Requisitos a adjuntar:\n- Fotocopia de Cédula de Identidad de ambas partes.\n- Certificado de Solvencia de aportes emitido por el Departamento de Cobranzas.\n- Dos cartas de presentación suscritas por socios propietarios en ejercicio.\n- Aprobación del Comité de Admisiones de Directorio.`,
        category: 'FORMULARIOS',
        type: 'FORMULARIO',
        isPinned: false,
        isPublished: true,
        authorName: 'Gerencia General & Admisiones',
        publishedAt: new Date(Date.now() - 86400000 * 7),
        coverImageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80',
        attachmentUrl: '/uploads/documents/FORMULARIO_SOLICITUD_TRASPASO_CHLS.pdf',
        attachmentName: 'Formulario_Solicitud_Traspaso_CHLS.pdf',
        attachmentSize: '450 KB',
        attachmentType: 'PDF'
      },
      {
        title: 'Formulario de Registro y Habilitación de Beneficiarios Familiares',
        summary: 'Documento oficial para la afiliación de cónyuge e hijos dependientes con derecho a credencial y uso de instalaciones.',
        content: `Planilla de declaración jurada familiar para la inclusión y actualización de beneficiarios directos.\n\n### Documentación Requerida:\n- Certificado de Matrimonio o Unión Libre (para cónyuge).\n- Certificado de Nacimiento y C.I. de los hijos.\n- Fotografía fondo blanco digital para carnetización.`,
        category: 'FORMULARIOS',
        type: 'FORMULARIO',
        isPinned: false,
        isPublished: true,
        authorName: 'Atención al Socio & Membresías',
        publishedAt: new Date(Date.now() - 86400000 * 10),
        coverImageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80',
        attachmentUrl: '/uploads/documents/FORMULARIO_AFILIACION_BENEFICIARIOS_CHLS.pdf',
        attachmentName: 'Formulario_Afiliacion_Beneficiarios_CHLS.pdf',
        attachmentSize: '520 KB',
        attachmentType: 'PDF'
      },
      {
        title: 'Reglamento de Seguridad y Normativa para Piscinas Climatizadas y Complejo Spa',
        summary: 'Normativa obligatoria de higiene, vestimenta acuática reglamentaria, uso de carriles deportivos y horarios del circuito termal.',
        content: `Manual normativo para el uso higiénico y seguro de las piscinas de 5 y 3 carriles, jacuzzi y saunas húmedo y seco.\n\n### Reglas Fundamentales:\n- Ducha previa obligatoria de 1 minuto.\n- Uso estricto de gorro de natación y traje reglamentario.\n- Circuito de saunas exclusivo para mayores de 14 años.\n- Prohibido el ingreso de alimentos o bebidas no autorizadas al área húmeda.`,
        category: 'MANUALES',
        type: 'REGLAMENTO',
        isPinned: false,
        isPublished: true,
        authorName: 'Gerencia de Operaciones',
        publishedAt: new Date(Date.now() - 86400000 * 14),
        coverImageUrl: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1200&q=80',
        attachmentUrl: '/uploads/documents/NORMATIVA_PISCINAS_Y_SAUNAS_CHLS.pdf',
        attachmentName: 'Normativa_Piscinas_y_Saunas_CHLS.pdf',
        attachmentSize: '890 KB',
        attachmentType: 'PDF'
      },
      {
        title: 'Memoria Anual de Gestión Institucional y Estados Contables Aprobados',
        summary: 'Documento oficial de rendición de cuentas, balance auditado y memoria descriptiva de obras y actividades ejecutadas.',
        content: `Memoria integral presentada y aprobada por la Asamblea Ordinaria de Asociados.\n\nContiene:\n- Informe de Presidencia y Directorio.\n- Dictamen de Auditoría Financiera Externa Independiente.\n- Balance General y Estado de Resultados.\n- Detalle de inversiones en mantenimiento y tecnología.`,
        category: 'MEMORIAS',
        type: 'DOCUMENTO_OFICIAL',
        isPinned: false,
        isPublished: true,
        authorName: 'Directorio General & Comisión Fiscalizadora',
        publishedAt: new Date(Date.now() - 86400000 * 20),
        coverImageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80',
        attachmentUrl: '/uploads/documents/MEMORIA_ANUAL_GESTION_CHLS.pdf',
        attachmentName: 'Memoria_Anual_Gestion_CHLS.pdf',
        attachmentSize: '5.2 MB',
        attachmentType: 'PDF'
      },
      {
        title: 'Manual de Uso de Caballerizas, Picaderos y Escuela de Equitación',
        summary: 'Normativa técnica y veterinaria para la tenencia de equinos, uso de pistas de salto, horarios de entrenamiento y personal de mozos.',
        content: `Normas técnicas para el cuidado y entrenamiento de caballos en el Club Hípico Los Sargentos.\n\n- Horarios de picadero cubierto y pistas exteriores.\n- Requisitos de sanidad animal, vacunas y control veterinario obligatorio.\n- Responsabilidades de jinetes, amazonas y cuidadores autorizados.`,
        category: 'MANUALES',
        type: 'REGLAMENTO',
        isPinned: false,
        isPublished: true,
        authorName: 'Comisión Hípica y Ecuestre',
        publishedAt: new Date(Date.now() - 86400000 * 25),
        coverImageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
        attachmentUrl: '/uploads/documents/MANUAL_CABALLERIZAS_Y_PICADEROS_CHLS.pdf',
        attachmentName: 'Manual_Caballerizas_y_Picaderos_CHLS.pdf',
        attachmentSize: '1.9 MB',
        attachmentType: 'PDF'
      }
    ];

    for (const doc of officialDocuments) {
      await this.createPost(doc);
    }

    return { message: 'Biblioteca digital oficial inicializada exitosamente', count: officialDocuments.length };
  }
}
