import { CorrespondenceWorkflow, WorkflowNode, WorkflowEdge } from '../types/correspondence.types';
export type { WorkflowNode, WorkflowEdge };

export const DEFAULT_ORGANIGRAM_NODES: WorkflowNode[] = [
  {
    id: 'node-gerencia-general',
    type: 'GERENCIA',
    title: 'GERENCIA GENERAL',
    subtitle: 'Máxima Autoridad Ejecutiva (1)',
    manager: 'Gerente General',
    areaKey: 'GERENCIA GENERAL',
    x: 1800,
    y: 40,
    slaHours: 48,
    canReceiveExternal: true,
    email: 'gerencia@chls.bo',
    phone: '70110001',
  },
  {
    id: 'node-secretaria',
    type: 'SECRETARIA',
    title: 'SECRETARÍA',
    subtitle: 'Secretaría de Despacho (1)',
    manager: 'Secretaria de Gerencia',
    areaKey: 'SECRETARÍA',
    x: 1380,
    y: 40,
    slaHours: 24,
    canReceiveExternal: true,
    email: 'secretaria@chls.bo',
    phone: '70110002',
  },
  {
    id: 'node-mensajero',
    type: 'OPERACIONES',
    title: 'MENSAJERO',
    subtitle: 'Mensajería y Despacho Externo (1)',
    manager: 'Mensajero Oficial',
    areaKey: 'MENSAJERO',
    x: 1380,
    y: 180,
    slaHours: 12,
    canReceiveExternal: false,
    email: 'mensajeria@chls.bo',
    phone: '70110003',
  },
  {
    id: 'node-asesoria-legal',
    type: 'LEGAL',
    title: 'ASESORÍA LEGAL',
    subtitle: 'Dictámenes, Contratos y Normativa (1)',
    manager: 'Asesor Legal Principal',
    areaKey: 'ASESORÍA LEGAL',
    x: 2220,
    y: 40,
    slaHours: 72,
    canReceiveExternal: false,
    email: 'legal@chls.bo',
    phone: '70110004',
  },
  {
    id: 'node-coordinador-comercial',
    type: 'COMPRAS',
    title: 'COORDINADOR COMERCIAL',
    subtitle: 'Convenios, Alianzas y Publicidad (1)',
    manager: 'Coordinador Comercial',
    areaKey: 'COORDINADOR COMERCIAL',
    x: 2220,
    y: 180,
    slaHours: 48,
    canReceiveExternal: true,
    email: 'comercial@chls.bo',
    phone: '70110005',
  },
  {
    id: 'node-subgerencia-financiera',
    type: 'FINANZAS',
    title: 'SUBGERENCIA DE OPERACIONES FINANCIERAS Y RECURSOS HUMANOS',
    subtitle: 'Finanzas, Contabilidad, Compras, Almacén y RRHH (1)',
    manager: 'Subgerente Financiero y RRHH',
    areaKey: 'SUBGERENCIA DE OPERACIONES FINANCIERAS Y RECURSOS HUMANOS',
    x: 580,
    y: 340,
    slaHours: 48,
    canReceiveExternal: true,
    email: 'finanzas@chls.bo',
    phone: '70110006',
  },
  {
    id: 'node-apoyo-jofrh',
    type: 'FINANZAS',
    title: 'APOYO J.O.F.R.H.',
    subtitle: 'Asistencia a Jefatura de Operaciones Financieras (1)',
    manager: 'Personal de Apoyo J.O.F.R.H.',
    areaKey: 'APOYO J.O.F.R.H.',
    x: 920,
    y: 340,
    slaHours: 24,
    canReceiveExternal: false,
    email: 'apoyo.finanzas@chls.bo',
    phone: '70110007',
  },
  {
    id: 'node-archivo',
    type: 'ARCHIVO',
    title: 'ARCHIVO',
    subtitle: 'Custodia y Archivo Central Institucional (1)',
    manager: 'Responsable de Archivo',
    areaKey: 'ARCHIVO',
    x: 50,
    y: 520,
    slaHours: 24,
    canReceiveExternal: false,
    email: 'archivo@chls.bo',
    phone: '70110008',
  },
  {
    id: 'node-almacen',
    type: 'OPERACIONES',
    title: 'ALMACÉN',
    subtitle: 'Inventarios, Ingresos y Salidas de Material (1)',
    manager: 'Encargado de Almacén',
    areaKey: 'ALMACÉN',
    x: 330,
    y: 520,
    slaHours: 24,
    canReceiveExternal: false,
    email: 'almacen@chls.bo',
    phone: '70110009',
  },
  {
    id: 'node-rrhh',
    type: 'OPERACIONES',
    title: 'RECURSOS HUMANOS',
    subtitle: 'Planillas, Personal y Contrataciones Internas (1)',
    manager: 'Encargado de RRHH',
    areaKey: 'RECURSOS HUMANOS',
    x: 610,
    y: 520,
    slaHours: 48,
    canReceiveExternal: false,
    email: 'rrhh@chls.bo',
    phone: '70110010',
  },
  {
    id: 'node-contrataciones',
    type: 'COMPRAS',
    title: 'RESPONSABLE DE CONTRATACIONES',
    subtitle: 'Licitaciones, Cotizaciones y Proveedores (1)',
    manager: 'Responsable de Contrataciones',
    areaKey: 'RESPONSABLE DE CONTRATACIONES',
    x: 890,
    y: 520,
    slaHours: 48,
    canReceiveExternal: false,
    email: 'contrataciones@chls.bo',
    phone: '70110011',
  },
  {
    id: 'node-asistente-contrataciones',
    type: 'COMPRAS',
    title: 'ASISTENTE ADMINISTRATIVO CONTRATACIONES',
    subtitle: 'Soporte Operativo a Compras (1)',
    manager: 'Asistente de Contrataciones',
    areaKey: 'ASISTENTE ADMINISTRATIVO CONTRATACIONES',
    x: 890,
    y: 680,
    slaHours: 24,
    canReceiveExternal: false,
    email: 'asistente.compras@chls.bo',
    phone: '70110012',
  },
  {
    id: 'node-contabilidad',
    type: 'FINANZAS',
    title: 'ENCARGADO DE CONTABILIDAD',
    subtitle: 'Estados Financieros, Balance e Impuestos (1)',
    manager: 'Encargado de Contabilidad',
    areaKey: 'ENCARGADO DE CONTABILIDAD',
    x: 1170,
    y: 520,
    slaHours: 48,
    canReceiveExternal: false,
    email: 'contabilidad@chls.bo',
    phone: '70110013',
  },
  {
    id: 'node-analista-contable',
    type: 'FINANZAS',
    title: 'ANALISTA CONTABLE',
    subtitle: 'Asientos, Conciliaciones y Libros (1)',
    manager: 'Analista Contable',
    areaKey: 'ANALISTA CONTABLE',
    x: 1170,
    y: 680,
    slaHours: 24,
    canReceiveExternal: false,
    email: 'analista.contable@chls.bo',
    phone: '70110014',
  },
  {
    id: 'node-recaudaciones',
    type: 'FINANZAS',
    title: 'ANALISTA CONTABLE - RECAUDACIONES',
    subtitle: 'Cobranza de Cuotas, Facturación y Caja (1)',
    manager: 'Analista de Recaudaciones',
    areaKey: 'ANALISTA CONTABLE - RECAUDACIONES',
    x: 1450,
    y: 520,
    slaHours: 48,
    canReceiveExternal: false,
    email: 'recaudaciones@chls.bo',
    phone: '70110015',
  },
  {
    id: 'node-cajero',
    type: 'FINANZAS',
    title: 'CAJERO',
    subtitle: 'Cobros en Ventanilla y Medios de Pago (1)',
    manager: 'Cajero Principal',
    areaKey: 'CAJERO',
    x: 1450,
    y: 680,
    slaHours: 12,
    canReceiveExternal: true,
    email: 'caja@chls.bo',
    phone: '70110016',
  },
  {
    id: 'node-apoyo-cobranzas',
    type: 'FINANZAS',
    title: 'APOYO COBRANZAS',
    subtitle: 'Gestión de Cartera Morosa y Notificaciones (1)',
    manager: 'Encargado de Cobranzas',
    areaKey: 'APOYO COBRANZAS',
    x: 1450,
    y: 840,
    slaHours: 24,
    canReceiveExternal: false,
    email: 'cobranzas@chls.bo',
    phone: '70110017',
  },
  {
    id: 'node-subgerencia-socio',
    type: 'RECEPCION',
    title: 'SUBGERENCIA DE ATENCIÓN AL SOCIO',
    subtitle: 'Experiencia del Socio, Reclamos y Solicitudes (1)',
    manager: 'Subgerente de Atención al Socio',
    areaKey: 'SUBGERENCIA DE ATENCIÓN AL SOCIO',
    x: 1780,
    y: 340,
    slaHours: 48,
    canReceiveExternal: true,
    email: 'atencionsocio@chls.bo',
    phone: '70110018',
  },
  {
    id: 'node-asistente-ats',
    type: 'RECEPCION',
    title: 'ASISTENTE A.T.S.',
    subtitle: 'Asistencia a Subgerencia de Atención al Socio (1)',
    manager: 'Asistente A.T.S.',
    areaKey: 'ASISTENTE A.T.S.',
    x: 2080,
    y: 340,
    slaHours: 24,
    canReceiveExternal: true,
    email: 'asistente.ats@chls.bo',
    phone: '70110019',
  },
  {
    id: 'node-tecnico-socio',
    type: 'RECEPCION',
    title: 'TÉCNICO ESPECIALISTA I',
    subtitle: 'Atención Técnica y Trámites Especiales (1)',
    manager: 'Técnico Especialista',
    areaKey: 'TÉCNICO ESPECIALISTA I',
    x: 1780,
    y: 520,
    slaHours: 24,
    canReceiveExternal: false,
    email: 'tecnico.socio@chls.bo',
    phone: '70110020',
  },
  {
    id: 'node-apoyo-ats',
    type: 'RECEPCION',
    title: 'APOYO A.T.S.',
    subtitle: 'Atención a Socios y Visitantes (2)',
    manager: 'Personal de Apoyo A.T.S.',
    areaKey: 'APOYO A.T.S.',
    x: 1780,
    y: 680,
    slaHours: 24,
    canReceiveExternal: true,
    email: 'apoyo.ats@chls.bo',
    phone: '70110021',
  },
  {
    id: 'node-recepcionistas',
    type: 'RECEPCION',
    title: 'RECEPCIONISTAS',
    subtitle: 'Recepción Central, Puntos de Control y Caseta (6)',
    manager: 'Equipo de Recepción',
    areaKey: 'RECEPCIONISTAS',
    x: 1780,
    y: 840,
    slaHours: 12,
    canReceiveExternal: true,
    email: 'recepcion@chls.bo',
    phone: '70110022',
  },
  {
    id: 'node-asistente-toallas',
    type: 'OPERACIONES',
    title: 'ASISTENTE DE TOALLAS',
    subtitle: 'Control y Entrega de Toallas a Socios (2)',
    manager: 'Asistente de Toallas',
    areaKey: 'ASISTENTE DE TOALLAS',
    x: 1780,
    y: 1000,
    slaHours: 12,
    canReceiveExternal: false,
    email: 'toallas@chls.bo',
    phone: '70110023',
  },
  {
    id: 'node-encargado-sistemas',
    type: 'OPERACIONES',
    title: 'ENCARGADO DE SISTEMAS',
    subtitle: 'Tecnología, Servidores, Redes y Plataformas (1)',
    manager: 'Encargado de Sistemas',
    areaKey: 'ENCARGADO DE SISTEMAS',
    x: 2360,
    y: 340,
    slaHours: 48,
    canReceiveExternal: true,
    email: 'sistemas@chls.bo',
    phone: '70110024',
  },
  {
    id: 'node-comunicacion',
    type: 'COMPRAS',
    title: 'COMUNICACIÓN',
    subtitle: 'Redes Sociales, Boletines y Comunicados (1)',
    manager: 'Encargado de Comunicación',
    areaKey: 'COMUNICACIÓN',
    x: 2360,
    y: 520,
    slaHours: 24,
    canReceiveExternal: true,
    email: 'comunicacion@chls.bo',
    phone: '70110025',
  },
  {
    id: 'node-jefe-mantenimiento',
    type: 'OPERACIONES',
    title: 'JEFE DE MANTENIMIENTO',
    subtitle: 'Infraestructura, Áreas Verdes, Pistas y Servicios (1)',
    manager: 'Jefe de Mantenimiento',
    areaKey: 'JEFE DE MANTENIMIENTO',
    x: 2680,
    y: 340,
    slaHours: 48,
    canReceiveExternal: true,
    email: 'mantenimiento@chls.bo',
    phone: '70110026',
  },
  {
    id: 'node-piscinero',
    type: 'OPERACIONES',
    title: 'ASISTENTE PISCINERO',
    subtitle: 'Tratamiento de Aguas y Calderas de Piscina (2)',
    manager: 'Asistente Piscinero',
    areaKey: 'ASISTENTE PISCINERO',
    x: 2680,
    y: 520,
    slaHours: 24,
    canReceiveExternal: false,
    email: 'piscinero@chls.bo',
    phone: '70110027',
  },
  {
    id: 'node-asistente-tenis',
    type: 'DEPORTES',
    title: 'ASISTENTE CANCHAS TENIS',
    subtitle: 'Riego, Mantenimiento de Arcilla y Canchas (2)',
    manager: 'Asistente de Canchas Tenis',
    areaKey: 'ASISTENTE CANCHAS TENIS',
    x: 2680,
    y: 680,
    slaHours: 24,
    canReceiveExternal: false,
    email: 'tenis@chls.bo',
    phone: '70110028',
  },
  {
    id: 'node-asistente-tiro',
    type: 'DEPORTES',
    title: 'ASISTENTE POLÍGONO DE TIRO',
    subtitle: 'Línea de Tiro, Blancos y Seguridad (2)',
    manager: 'Asistente Polígono',
    areaKey: 'ASISTENTE POLÍGONO DE TIRO',
    x: 2680,
    y: 840,
    slaHours: 24,
    canReceiveExternal: false,
    email: 'tiro@chls.bo',
    phone: '70110029',
  },
  {
    id: 'node-personal-mantenimiento',
    type: 'OPERACIONES',
    title: 'PERSONAL DE MANTENIMIENTO',
    subtitle: 'Cuadrilla General de Obras, Jardinería y Plomería (11)',
    manager: 'Equipo de Mantenimiento',
    areaKey: 'PERSONAL DE MANTENIMIENTO',
    x: 2680,
    y: 1000,
    slaHours: 24,
    canReceiveExternal: false,
    email: 'mantenimiento.operativo@chls.bo',
    phone: '70110030',
  },
  {
    id: 'node-encargado-hipica',
    type: 'DEPORTES',
    title: 'ENCARGADO ÁREA HÍPICA',
    subtitle: 'Caballerizas, Pistas de Salto, Picaderos y Equitación (1)',
    manager: 'Capitán / Encargado de Hípica',
    areaKey: 'ENCARGADO ÁREA HÍPICA',
    x: 3080,
    y: 340,
    slaHours: 48,
    canReceiveExternal: true,
    email: 'hipica@chls.bo',
    phone: '70110031',
  },
  {
    id: 'node-veterinario',
    type: 'DEPORTES',
    title: 'MÉDICO VETERINARIO',
    subtitle: 'Sanidad Animal, Control de Caballos y Vacunación (1)',
    manager: 'Médico Veterinario',
    areaKey: 'MÉDICO VETERINARIO',
    x: 3080,
    y: 520,
    slaHours: 24,
    canReceiveExternal: false,
    email: 'veterinaria@chls.bo',
    phone: '70110032',
  },
  {
    id: 'node-pistero',
    type: 'DEPORTES',
    title: 'PISTERO',
    subtitle: 'Armado de Pistas y Obstáculos de Salto (1)',
    manager: 'Pistero Principal',
    areaKey: 'PISTERO',
    x: 3080,
    y: 680,
    slaHours: 24,
    canReceiveExternal: false,
    email: 'pistero@chls.bo',
    phone: '70110033',
  },
  {
    id: 'node-ayudante-pistero',
    type: 'DEPORTES',
    title: 'AYUDANTE PISTERO',
    subtitle: 'Soporte de Pista y Salto (1)',
    manager: 'Ayudante Pistero',
    areaKey: 'AYUDANTE PISTERO',
    x: 3360,
    y: 680,
    slaHours: 24,
    canReceiveExternal: false,
    email: 'ayudante.pistero@chls.bo',
    phone: '70110034',
  },
  {
    id: 'node-herrero',
    type: 'DEPORTES',
    title: 'HERRERO',
    subtitle: 'Herrería y Cuidado de Cascos Equinos (1)',
    manager: 'Herrero Oficial',
    areaKey: 'HERRERO',
    x: 3080,
    y: 840,
    slaHours: 24,
    canReceiveExternal: false,
    email: 'herrero@chls.bo',
    phone: '70110035',
  },
  {
    id: 'node-ayudante-herrero',
    type: 'DEPORTES',
    title: 'AYUDANTE HERRERO',
    subtitle: 'Soporte de Herrería (1)',
    manager: 'Ayudante de Herrero',
    areaKey: 'AYUDANTE HERRERO',
    x: 3360,
    y: 840,
    slaHours: 24,
    canReceiveExternal: false,
    email: 'ayudante.herrero@chls.bo',
    phone: '70110036',
  },
  {
    id: 'node-sereno',
    type: 'OPERACIONES',
    title: 'SERENO',
    subtitle: 'Guardia Nocturna y Seguridad de Caballerizas (3)',
    manager: 'Personal de Seguridad / Serenos',
    areaKey: 'SERENO',
    x: 3080,
    y: 1000,
    slaHours: 12,
    canReceiveExternal: false,
    email: 'sereno@chls.bo',
    phone: '70110037',
  },
  {
    id: 'node-caballerizo',
    type: 'DEPORTES',
    title: 'CABALLERIZO',
    subtitle: 'Alimentación, Limpieza y Cuidado de Caballos (18)',
    manager: 'Equipo de Caballerizos',
    areaKey: 'CABALLERIZO',
    x: 3080,
    y: 1160,
    slaHours: 24,
    canReceiveExternal: false,
    email: 'caballerizos@chls.bo',
    phone: '70110038',
  },
  {
    id: 'node-supervisor-gimnasio',
    type: 'DEPORTES',
    title: 'SUPERVISOR GIMNASIO',
    subtitle: 'Acondicionamiento Físico, Máquinas y Entrenadores (1)',
    manager: 'Supervisor de Gimnasio',
    areaKey: 'SUPERVISOR GIMNASIO',
    x: 3660,
    y: 340,
    slaHours: 48,
    canReceiveExternal: true,
    email: 'gimnasio@chls.bo',
    phone: '70110039',
  },
  {
    id: 'node-supervisor-piscina',
    type: 'DEPORTES',
    title: 'SUPERVISOR PISCINA',
    subtitle: 'Piscina Techada, Cursos y Operación Acuática (1)',
    manager: 'Supervisor de Piscina',
    areaKey: 'SUPERVISOR PISCINA',
    x: 3960,
    y: 340,
    slaHours: 48,
    canReceiveExternal: true,
    email: 'piscina@chls.bo',
    phone: '70110040',
  },
  {
    id: 'node-guardavidas',
    type: 'DEPORTES',
    title: 'GUARDAVIDAS',
    subtitle: 'Seguridad Acuática y Rescate (2)',
    manager: 'Equipo de Guardavidas',
    areaKey: 'GUARDAVIDAS',
    x: 3960,
    y: 520,
    slaHours: 12,
    canReceiveExternal: false,
    email: 'guardavidas@chls.bo',
    phone: '70110041',
  },
];

export const DEFAULT_ORGANIGRAM_EDGES: WorkflowEdge[] = [
  // Líneas directas desde GERENCIA GENERAL hacia sus jefaturas dependientes
  { id: 'e-ger-sec', source: 'node-gerencia-general', target: 'node-secretaria', label: 'Despacho & Asistencia', style: 'HIERARCHICAL' },
  { id: 'e-sec-men', source: 'node-secretaria', target: 'node-mensajero', label: 'Mensajería', style: 'OPERATIONAL' },
  { id: 'e-ger-leg', source: 'node-gerencia-general', target: 'node-asesoria-legal', label: 'Asesoría Legal', style: 'HIERARCHICAL' },
  { id: 'e-ger-com', source: 'node-gerencia-general', target: 'node-coordinador-comercial', label: 'Comercial & Convenios', style: 'HIERARCHICAL' },
  { id: 'e-ger-fin', source: 'node-gerencia-general', target: 'node-subgerencia-financiera', label: 'Línea Financiera & RRHH', style: 'HIERARCHICAL' },
  
  // Rama Subgerencia Financiera
  { id: 'e-fin-apo', source: 'node-subgerencia-financiera', target: 'node-apoyo-jofrh', label: 'Apoyo Jefatura', style: 'OPERATIONAL' },
  { id: 'e-fin-arc', source: 'node-subgerencia-financiera', target: 'node-archivo', label: 'Archivo Central', style: 'OPERATIONAL' },
  { id: 'e-fin-alm', source: 'node-subgerencia-financiera', target: 'node-almacen', label: 'Almacén', style: 'OPERATIONAL' },
  { id: 'e-fin-rrh', source: 'node-subgerencia-financiera', target: 'node-rrhh', label: 'RRHH', style: 'OPERATIONAL' },
  { id: 'e-fin-con', source: 'node-subgerencia-financiera', target: 'node-contrataciones', label: 'Contrataciones', style: 'OPERATIONAL' },
  { id: 'e-con-asi', source: 'node-contrataciones', target: 'node-asistente-contrataciones', label: 'Asistente', style: 'OPERATIONAL' },
  { id: 'e-fin-cnt', source: 'node-subgerencia-financiera', target: 'node-contabilidad', label: 'Contabilidad', style: 'OPERATIONAL' },
  { id: 'e-cnt-ana', source: 'node-contabilidad', target: 'node-analista-contable', label: 'Analista', style: 'OPERATIONAL' },
  { id: 'e-fin-rec', source: 'node-subgerencia-financiera', target: 'node-recaudaciones', label: 'Recaudaciones', style: 'OPERATIONAL' },
  { id: 'e-rec-caj', source: 'node-recaudaciones', target: 'node-cajero', label: 'Caja', style: 'OPERATIONAL' },
  { id: 'e-rec-cob', source: 'node-recaudaciones', target: 'node-apoyo-cobranzas', label: 'Cobranzas', style: 'OPERATIONAL' },

  // Rama Subgerencia Atención al Socio
  { id: 'e-ger-soc', source: 'node-gerencia-general', target: 'node-subgerencia-socio', label: 'Línea Atención al Socio', style: 'HIERARCHICAL' },
  { id: 'e-soc-asi', source: 'node-subgerencia-socio', target: 'node-asistente-ats', label: 'Asistente A.T.S.', style: 'OPERATIONAL' },
  { id: 'e-soc-tec', source: 'node-subgerencia-socio', target: 'node-tecnico-socio', label: 'Técnico I', style: 'OPERATIONAL' },
  { id: 'e-soc-apo', source: 'node-subgerencia-socio', target: 'node-apoyo-ats', label: 'Apoyo A.T.S.', style: 'OPERATIONAL' },
  { id: 'e-soc-rec', source: 'node-subgerencia-socio', target: 'node-recepcionistas', label: 'Recepción', style: 'OPERATIONAL' },
  { id: 'e-soc-toa', source: 'node-subgerencia-socio', target: 'node-asistente-toallas', label: 'Toallas', style: 'OPERATIONAL' },

  // Rama Sistemas y TI
  { id: 'e-ger-sis', source: 'node-gerencia-general', target: 'node-encargado-sistemas', label: 'Línea Sistemas & TI', style: 'HIERARCHICAL' },
  { id: 'e-sis-com', source: 'node-encargado-sistemas', target: 'node-comunicacion', label: 'Comunicación', style: 'OPERATIONAL' },

  // Rama Mantenimiento y Obras
  { id: 'e-ger-man', source: 'node-gerencia-general', target: 'node-jefe-mantenimiento', label: 'Línea Mantenimiento', style: 'HIERARCHICAL' },
  { id: 'e-man-pis', source: 'node-jefe-mantenimiento', target: 'node-piscinero', label: 'Piscinas', style: 'OPERATIONAL' },
  { id: 'e-man-ten', source: 'node-jefe-mantenimiento', target: 'node-asistente-tenis', label: 'Tenis', style: 'OPERATIONAL' },
  { id: 'e-man-tir', source: 'node-jefe-mantenimiento', target: 'node-asistente-tiro', label: 'Polígono de Tiro', style: 'OPERATIONAL' },
  { id: 'e-man-ope', source: 'node-jefe-mantenimiento', target: 'node-personal-mantenimiento', label: 'Cuadrilla Mantenimiento', style: 'OPERATIONAL' },

  // Rama Hípica
  { id: 'e-ger-hip', source: 'node-gerencia-general', target: 'node-encargado-hipica', label: 'Línea Hípica', style: 'HIERARCHICAL' },
  { id: 'e-hip-vet', source: 'node-encargado-hipica', target: 'node-veterinario', label: 'Veterinaria', style: 'OPERATIONAL' },
  { id: 'e-hip-pis', source: 'node-encargado-hipica', target: 'node-pistero', label: 'Pistas', style: 'OPERATIONAL' },
  { id: 'e-pis-ayu', source: 'node-pistero', target: 'node-ayudante-pistero', label: 'Ayudante', style: 'OPERATIONAL' },
  { id: 'e-hip-her', source: 'node-encargado-hipica', target: 'node-herrero', label: 'Herrería', style: 'OPERATIONAL' },
  { id: 'e-her-ayu', source: 'node-herrero', target: 'node-ayudante-herrero', label: 'Ayudante', style: 'OPERATIONAL' },
  { id: 'e-hip-ser', source: 'node-encargado-hipica', target: 'node-sereno', label: 'Serenos', style: 'OPERATIONAL' },
  { id: 'e-hip-cab', source: 'node-encargado-hipica', target: 'node-caballerizo', label: 'Caballerizos', style: 'OPERATIONAL' },

  // Rama Gimnasio y Piscina
  { id: 'e-ger-gim', source: 'node-gerencia-general', target: 'node-supervisor-gimnasio', label: 'Línea Gimnasio', style: 'HIERARCHICAL' },
  { id: 'e-ger-psc', source: 'node-gerencia-general', target: 'node-supervisor-piscina', label: 'Línea Piscina', style: 'HIERARCHICAL' },
  { id: 'e-psc-gua', source: 'node-supervisor-piscina', target: 'node-guardavidas', label: 'Guardavidas', style: 'OPERATIONAL' },
];

export const DEFAULT_OFFICIAL_WORKFLOW: CorrespondenceWorkflow = {
  nodes: DEFAULT_ORGANIGRAM_NODES,
  edges: DEFAULT_ORGANIGRAM_EDGES,
};

/**
 * Obtiene los destinos parametrizados en el organigrama para un área o usuario dado
 */
export function getOrganigramDestinations(
  sourceAreaName: string,
  workflow?: CorrespondenceWorkflow | null
) {
  const activeNodes = (workflow?.nodes && workflow.nodes.length > 0) ? workflow.nodes : DEFAULT_ORGANIGRAM_NODES;
  const activeEdges = (workflow && Array.isArray(workflow.edges)) ? workflow.edges : DEFAULT_ORGANIGRAM_EDGES;

  const raw = (sourceAreaName || '').toUpperCase().trim();

  // 1. Buscar nodo de origen con coincidencia exacta o equivalencia isSameArea
  let sourceNode = activeNodes.find((n) => {
    const title = (n.title || '').toUpperCase().trim();
    const areaKey = (n.areaKey || '').toUpperCase().trim();
    const id = n.id.toUpperCase().trim();
    return title === raw || areaKey === raw || id === raw;
  });

  if (!sourceNode) {
    sourceNode = activeNodes.find((n) => {
      return (
        isSameArea(n.title, raw) ||
        isSameArea(n.areaKey, raw) ||
        isSameArea(n.manager, raw) ||
        (n.title && n.title.includes(raw)) ||
        (raw && raw.includes(n.title))
      );
    });
  }

  if (!sourceNode) {
    sourceNode = activeNodes.find((n) => n.id === 'node-gerencia-general') || activeNodes[0];
  }

  // 2. Destinos salientes directos según conectores activos (hacia quién deriva: source -> target)
  const outgoingEdges = activeEdges.filter((e) => e.source === sourceNode?.id);
  const targetIds = outgoingEdges.map((e) => e.target);

  // 3. Destinos entrantes directos según conectores activos (hacia su jefatura superior: target -> source)
  const incomingEdges = activeEdges.filter((e) => e.target === sourceNode?.id);
  const sourceIds = incomingEdges.map((e) => e.source);

  // Combinar destinos parametrizados con su titular, cargo y etiqueta de flujo
  const recommendedTargetNodes = activeNodes
    .filter((n) => targetIds.includes(n.id))
    .map((node) => {
      const edge = outgoingEdges.find((e) => e.target === node.id);
      return {
        node,
        edgeLabel: edge?.label || 'Línea de Mando',
        edgeStyle: edge?.style || 'HIERARCHICAL',
        direction: 'DOWN' as const,
      };
    });

  const recommendedSourceNodes = activeNodes
    .filter((n) => sourceIds.includes(n.id) && !targetIds.includes(n.id))
    .map((node) => {
      const edge = incomingEdges.find((e) => e.source === node.id);
      return {
        node,
        edgeLabel: edge?.label ? `Informe a ${edge.label}` : 'Instancia Superior / Jefatura',
        edgeStyle: edge?.style || 'HIERARCHICAL',
        direction: 'UP' as const,
      };
    });

  const recommendedNodes = [...recommendedTargetNodes, ...recommendedSourceNodes];

  return {
    currentNode: sourceNode,
    sourceNode,
    recommendedNodes,
    allNodes: activeNodes,
  };
}

/**
 * Normaliza y compara dos nombres de área institucional para verificar si corresponden al mismo despacho
 */
export function isSameArea(areaA?: string | null, areaB?: string | null): boolean {
  if (!areaA || !areaB) return false;
  const normalize = (s: string) =>
    s
      .toUpperCase()
      .replace(/[_\-\s]+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const a = normalize(areaA);
  const b = normalize(areaB);

  if (a === b) return true;

  // Equivalencias institucionales CHLS
  if ((a.includes('SECRETAR') || a === 'SECRETARIA GENERAL') && (b.includes('SECRETAR') || b === 'SECRETARIA GENERAL')) return true;
  if ((a.includes('GERENCIA GENERAL') || a === 'GERENCIA') && (b.includes('GERENCIA GENERAL') || b === 'GERENCIA')) return true;
  if ((a.includes('TESORERIA') || a.includes('FINANZAS')) && (b.includes('TESORERIA') || b.includes('FINANZAS'))) return true;
  if ((a.includes('CONTRATACION') || a.includes('COMPRAS')) && (b.includes('CONTRATACION') || b.includes('COMPRAS'))) return true;
  if (a.includes('HIPIC') && b.includes('HIPIC')) return true;
  if (a.includes('DEPORTE') && b.includes('DEPORTE')) return true;
  if (a.includes('LEGAL') && b.includes('LEGAL')) return true;
  if (a.includes('MANTENIMIENTO') && b.includes('MANTENIMIENTO')) return true;
  if (a.includes('ALMACEN') && b.includes('ALMACEN')) return true;
  if (a.includes('CONTABILIDAD') && b.includes('CONTABILIDAD')) return true;
  if (a.includes('RECEPCION') && b.includes('RECEPCION')) return true;
  if (a.includes('SISTEMAS') && b.includes('SISTEMAS')) return true;

  return a.includes(b) || b.includes(a);
}

/**
 * Construye la URL completa accesible para un documento adjunto
 */
export function getDocumentFullUrl(fileUrl?: string | null): string {
  if (!fileUrl) return '#';
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('blob:') || fileUrl.startsWith('data:')) {
    return fileUrl;
  }
  const baseUrl = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
    : `http://${window.location.hostname}:5000`;
  const cleanPath = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
  return `${baseUrl}${cleanPath}`;
}/**
 * Detecta automáticamente el nodo del organigrama que corresponde al usuario autenticado (currentUser).
 * Realiza coincidencia por email, coincidencia por nombre de titular (manager) o por cargo/rol (title).
 */
export function getOrganigramNodeForUser(
  user?: any,
  workflow?: CorrespondenceWorkflow | null
): WorkflowNode | undefined {
  if (!user) return undefined;
  const activeNodes = (workflow?.nodes && workflow.nodes.length > 0) ? workflow.nodes : DEFAULT_ORGANIGRAM_NODES;

  const email = (user.email || '').toLowerCase().trim();
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  const normalize = (str: string) =>
    (str || '')
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\b(ING\.|LIC\.|DR\.|DRA\.|ARQ\.|ABG\.)\s*/gi, '')
      .trim();

  const uName = normalize(fullName);
  const uDept = normalize(user.area || user.department || '');

  // 1. Coincidencia por correo electrónico oficial
  if (email) {
    const byEmail = activeNodes.find((n) => (n.email || '').toLowerCase().trim() === email);
    if (byEmail) return byEmail;
  }

  // 2. Coincidencia exacta o por inclusión con el Titular / Manager del nodo
  if (uName) {
    const byManager = activeNodes.find((n) => {
      const m = normalize(n.manager || '');
      return m && (m === uName || m.includes(uName) || uName.includes(m));
    });
    if (byManager) return byManager;
  }

  // 3. Coincidencia por Área o Departamento del usuario
  if (uDept) {
    const byDept = activeNodes.find((n) => {
      const t = normalize(n.title);
      const k = normalize(n.areaKey || '');
      return t === uDept || k === uDept || isSameArea(t, uDept);
    });
    if (byDept) return byDept;
  }

  // 4. Coincidencia por roles del usuario
  if (Array.isArray(user.roles)) {
    for (const r of user.roles) {
      const roleName = normalize(typeof r === 'string' ? r : r.name || '');
      const byRole = activeNodes.find((n) => isSameArea(n.title, roleName));
      if (byRole) return byRole;
    }
  }

  // Si es SUPER_ADMIN o ADMIN general, por defecto es Gerencia General
  return activeNodes.find((n) => n.id === 'node-gerencia-general') || activeNodes[0];
}
