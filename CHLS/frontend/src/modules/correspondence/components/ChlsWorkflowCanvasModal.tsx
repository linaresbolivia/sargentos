import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@store/store';
import {
  fetchWorkflowSettings,
  saveWorkflowSettings,
  updateWorkflowLocal,
} from '@store/correspondenceSlice';
import {
  WorkflowNode,
  WorkflowEdge,
  CorrespondenceWorkflow,
} from '../types/correspondence.types';
import {
  X,
  Plus,
  Save,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2,
  Building2,
  Crown,
  FileText,
  Scale,
  DollarSign,
  ShoppingBag,
  Wrench,
  Award,
  Activity,
  Shield,
  FolderArchive,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Phone,
  Mail,
  User,
  Share2,
  Settings,
  Info,
  ChevronRight,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import CrestLogo from '@shared/components/CrestLogo';

interface ChlsWorkflowCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_TEMPLATES: Record<string, { label: string; desc: string; workflow: CorrespondenceWorkflow }> = {
  ORGANIGRAMA_OFICIAL: {
    label: 'Organigrama Jerárquico Oficial CHLS',
    desc: 'Estructura directiva, ejecutiva y operativa completa del Club',
    workflow: {
      nodes: [
        {
          id: 'node-gerencia-general',
          type: 'GERENCIA',
          title: 'GERENCIA GENERAL',
          subtitle: 'Máxima Autoridad Ejecutiva (1)',
          manager: 'Ing. Gerente General',
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
          manager: 'Lic. Secretaria de Gerencia',
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
          manager: 'Dr. Asesor Legal Principal',
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
          manager: 'Lic. Coordinador Comercial',
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
          manager: 'Lic. Subgerente Financiero y RRHH',
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
          manager: 'Lic. Responsable de Contrataciones',
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
          manager: 'Lic. Encargado de Contabilidad',
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
          manager: 'Lic. Analista Contable',
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
          manager: 'Lic. Analista de Recaudaciones',
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
          manager: 'Lic. Subgerente de Atención al Socio',
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
          manager: 'Ing. Encargado de Sistemas',
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
          manager: 'Lic. Encargado de Comunicación',
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
          manager: 'Ing. Jefe de Mantenimiento',
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
          manager: 'Dr. Médico Veterinario',
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
      ],
      edges: [
        { id: 'e-ger-sec', source: 'node-gerencia-general', target: 'node-secretaria', label: 'Despacho & Asistencia', style: 'HIERARCHICAL' },
        { id: 'e-sec-men', source: 'node-secretaria', target: 'node-mensajero', label: 'Mensajería', style: 'OPERATIONAL' },
        { id: 'e-ger-leg', source: 'node-gerencia-general', target: 'node-asesoria-legal', label: 'Asesoría Legal', style: 'HIERARCHICAL' },
        { id: 'e-ger-com', source: 'node-gerencia-general', target: 'node-coordinador-comercial', label: 'Comercial & Convenios', style: 'HIERARCHICAL' },
        { id: 'e-ger-fin', source: 'node-gerencia-general', target: 'node-subgerencia-financiera', label: 'Línea Financiera & RRHH', style: 'HIERARCHICAL' },
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
        { id: 'e-ger-soc', source: 'node-gerencia-general', target: 'node-subgerencia-socio', label: 'Línea Atención al Socio', style: 'HIERARCHICAL' },
        { id: 'e-soc-asi', source: 'node-subgerencia-socio', target: 'node-asistente-ats', label: 'Asistente A.T.S.', style: 'OPERATIONAL' },
        { id: 'e-soc-tec', source: 'node-subgerencia-socio', target: 'node-tecnico-socio', label: 'Técnico I', style: 'OPERATIONAL' },
        { id: 'e-soc-apo', source: 'node-subgerencia-socio', target: 'node-apoyo-ats', label: 'Apoyo A.T.S.', style: 'OPERATIONAL' },
        { id: 'e-soc-rec', source: 'node-subgerencia-socio', target: 'node-recepcionistas', label: 'Recepción', style: 'OPERATIONAL' },
        { id: 'e-soc-toa', source: 'node-subgerencia-socio', target: 'node-asistente-toallas', label: 'Toallas', style: 'OPERATIONAL' },
        { id: 'e-ger-sis', source: 'node-gerencia-general', target: 'node-encargado-sistemas', label: 'Línea Sistemas & TI', style: 'HIERARCHICAL' },
        { id: 'e-sis-com', source: 'node-encargado-sistemas', target: 'node-comunicacion', label: 'Comunicación', style: 'OPERATIONAL' },
        { id: 'e-ger-man', source: 'node-gerencia-general', target: 'node-jefe-mantenimiento', label: 'Línea Mantenimiento', style: 'HIERARCHICAL' },
        { id: 'e-man-pis', source: 'node-jefe-mantenimiento', target: 'node-piscinero', label: 'Piscinas', style: 'OPERATIONAL' },
        { id: 'e-man-ten', source: 'node-jefe-mantenimiento', target: 'node-asistente-tenis', label: 'Tenis', style: 'OPERATIONAL' },
        { id: 'e-man-tir', source: 'node-jefe-mantenimiento', target: 'node-asistente-tiro', label: 'Polígono de Tiro', style: 'OPERATIONAL' },
        { id: 'e-man-ope', source: 'node-jefe-mantenimiento', target: 'node-personal-mantenimiento', label: 'Cuadrilla Mantenimiento', style: 'OPERATIONAL' },
        { id: 'e-ger-hip', source: 'node-gerencia-general', target: 'node-encargado-hipica', label: 'Línea Hípica', style: 'HIERARCHICAL' },
        { id: 'e-hip-vet', source: 'node-encargado-hipica', target: 'node-veterinario', label: 'Veterinaria', style: 'OPERATIONAL' },
        { id: 'e-hip-pis', source: 'node-encargado-hipica', target: 'node-pistero', label: 'Pistas', style: 'OPERATIONAL' },
        { id: 'e-pis-ayu', source: 'node-pistero', target: 'node-ayudante-pistero', label: 'Ayudante', style: 'OPERATIONAL' },
        { id: 'e-hip-her', source: 'node-encargado-hipica', target: 'node-herrero', label: 'Herrería', style: 'OPERATIONAL' },
        { id: 'e-her-ayu', source: 'node-herrero', target: 'node-ayudante-herrero', label: 'Ayudante', style: 'OPERATIONAL' },
        { id: 'e-hip-ser', source: 'node-encargado-hipica', target: 'node-sereno', label: 'Serenos', style: 'OPERATIONAL' },
        { id: 'e-hip-cab', source: 'node-encargado-hipica', target: 'node-caballerizo', label: 'Caballerizos', style: 'OPERATIONAL' },
        { id: 'e-ger-gim', source: 'node-gerencia-general', target: 'node-supervisor-gimnasio', label: 'Línea Gimnasio', style: 'HIERARCHICAL' },
        { id: 'e-ger-psc', source: 'node-gerencia-general', target: 'node-supervisor-piscina', label: 'Línea Piscina', style: 'HIERARCHICAL' },
        { id: 'e-psc-gua', source: 'node-supervisor-piscina', target: 'node-guardavidas', label: 'Guardavidas', style: 'OPERATIONAL' },
      ],
    },
  },
};

export const ChlsWorkflowCanvasModal: React.FC<ChlsWorkflowCanvasModalProps> = ({
  isOpen,
  onClose,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { workflow, settings, isSaving } = useSelector((state: RootState) => state.correspondence);

  // Local canvas state
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Canvas Viewport Pan & Zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 30 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Node Dragging State with Movement Threshold
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [potentialDragNodeId, setPotentialDragNodeId] = useState<string | null>(null);
  const [dragStartMousePos, setDragStartMousePos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Edge Connection Drawing State
  const [connectingSourceNodeId, setConnectingSourceNodeId] = useState<string | null>(null);
  const [tempPointerPos, setTempPointerPos] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Initialize from backend settings or default template
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchWorkflowSettings());
    }
  }, [isOpen, dispatch]);

  useEffect(() => {
    if (workflow && workflow.nodes && workflow.nodes.length > 0) {
      setNodes(workflow.nodes);
      setEdges(workflow.edges || []);
      setHasUnsavedChanges(false);
    } else if (settings?.workflow?.nodes?.length > 0) {
      setNodes(settings.workflow.nodes);
      setEdges(settings.workflow.edges || []);
      setHasUnsavedChanges(false);
    } else {
      const defaultWf = DEFAULT_TEMPLATES.ORGANIGRAMA_OFICIAL.workflow;
      setNodes(defaultWf.nodes);
      setEdges(defaultWf.edges);
      setHasUnsavedChanges(false);
    }
  }, [workflow, settings]);

  if (!isOpen) return null;

  // Helpers for Node Icon and Themes
  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'DIRECTORIO':
        return <Crown className="w-5 h-5 text-amber-400 animate-pulse" />;
      case 'GERENCIA':
        return <Building2 className="w-5 h-5 text-emerald-400" />;
      case 'SECRETARIA':
        return <FileText className="w-5 h-5 text-teal-300" />;
      case 'LEGAL':
        return <Scale className="w-5 h-5 text-blue-400" />;
      case 'FINANZAS':
        return <DollarSign className="w-5 h-5 text-emerald-400" />;
      case 'COMPRAS':
        return <ShoppingBag className="w-5 h-5 text-yellow-400" />;
      case 'OPERACIONES':
        return <Wrench className="w-5 h-5 text-orange-400" />;
      case 'DEPORTES':
        return <Award className="w-5 h-5 text-purple-400" />;
      case 'RECEPCION':
        return <Shield className="w-5 h-5 text-teal-400" />;
      case 'ARCHIVO':
        return <FolderArchive className="w-5 h-5 text-brand-gold" />;
      case 'CONDICIONAL':
        return <GitBranch className="w-5 h-5 text-pink-400" />;
      default:
        return <Building2 className="w-5 h-5 text-emerald-400" />;
    }
  };

  const getNodeBorder = (node: WorkflowNode, isSelected: boolean) => {
    if (isSelected) {
      return 'border-2 border-emerald-400 ring-4 ring-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.7)] scale-[1.03]';
    }
    if (node.type === 'DIRECTORIO') {
      return 'border-2 border-brand-gold/80 shadow-[0_0_25px_rgba(245,158,11,0.35)] hover:shadow-[0_0_35px_rgba(245,158,11,0.6)]';
    }
    return 'border-2 border-emerald-500/40 hover:border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)]';
  };

  // Canvas Interactions: Pan & Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 0.08;
    const newZoom = e.deltaY < 0 ? Math.min(zoom + zoomFactor, 2.0) : Math.max(zoom - zoomFactor, 0.4);
    setZoom(Number(newZoom.toFixed(2)));
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (connectingSourceNodeId) {
      setConnectingSourceNodeId(null);
      setTempPointerPos(null);
      return;
    }
    if (e.target === canvasRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (potentialDragNodeId && !draggingNodeId) {
      // Threshold check: only start dragging if mouse moved more than 6 pixels
      const distance = Math.hypot(e.clientX - dragStartMousePos.x, e.clientY - dragStartMousePos.y);
      if (distance > 6) {
        setDraggingNodeId(potentialDragNodeId);
      }
    } else if (draggingNodeId) {
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id === draggingNodeId) {
            const rawX = (e.clientX - pan.x) / zoom - dragOffset.x;
            const rawY = (e.clientY - pan.y) / zoom - dragOffset.y;
            return {
              ...n,
              x: Math.round(rawX / 10) * 10,
              y: Math.round(rawY / 10) * 10,
            };
          }
          return n;
        })
      );
      setHasUnsavedChanges(true);
    } else if (connectingSourceNodeId) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setTempPointerPos({
          x: (e.clientX - rect.left - pan.x) / zoom,
          y: (e.clientY - rect.top - pan.y) / zoom,
        });
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
    setPotentialDragNodeId(null);
    setDraggingNodeId(null);
  };

  // Centralized Connect Nodes Function (Supports both Drag-and-Drop & Click-to-Connect)
  const handleConnectNodes = (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) {
      setConnectingSourceNodeId(null);
      setTempPointerPos(null);
      return;
    }

    // Check if edge already exists
    const exists = edges.some(
      (edge) => edge.source === sourceId && edge.target === targetId
    );
    if (exists) {
      toast.error('Este vínculo de derivación ya existe.');
      setConnectingSourceNodeId(null);
      setTempPointerPos(null);
      return;
    }

    const sourceNode = nodes.find((n) => n.id === sourceId);
    const targetNode = nodes.find((n) => n.id === targetId);
    const isHierarchical =
      sourceNode?.type === 'DIRECTORIO' ||
      sourceNode?.type === 'GERENCIA' ||
      targetNode?.type === 'DIRECTORIO' ||
      targetNode?.type === 'GERENCIA';

    const newEdge: WorkflowEdge = {
      id: `edge-${Date.now()}`,
      source: sourceId,
      target: targetId,
      label: `Derivación ${sourceNode?.title.split(' ')[0] || ''} ➔ ${targetNode?.title.split(' ')[0] || ''}`,
      style: isHierarchical ? 'HIERARCHICAL' : 'OPERATIONAL',
    };

    setEdges((prev) => [...prev, newEdge]);
    setConnectingSourceNodeId(null);
    setTempPointerPos(null);
    setHasUnsavedChanges(true);
    toast.success(`¡Conexión jerárquica creada: ${sourceNode?.title} ➔ ${targetNode?.title}!`);
  };

  // Node Drag & Click Handlers with Threshold
  const handleNodeMouseDown = (e: React.MouseEvent, node: WorkflowNode) => {
    e.stopPropagation();
    if (connectingSourceNodeId && connectingSourceNodeId !== node.id) {
      handleConnectNodes(connectingSourceNodeId, node.id);
      return;
    }
    // Select node immediately
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);

    // Prepare potential drag state (will only move if continuous drag > 6px)
    setPotentialDragNodeId(node.id);
    setDragStartMousePos({ x: e.clientX, y: e.clientY });
    setDragOffset({
      x: (e.clientX - pan.x) / zoom - node.x,
      y: (e.clientY - pan.y) / zoom - node.y,
    });
  };

  const handleNodeMouseUp = (e: React.MouseEvent, targetNodeId: string) => {
    e.stopPropagation();
    setPotentialDragNodeId(null);
    setDraggingNodeId(null);
    if (connectingSourceNodeId && connectingSourceNodeId !== targetNodeId) {
      handleConnectNodes(connectingSourceNodeId, targetNodeId);
    }
  };

  const handleNodeClick = (e: React.MouseEvent, clickedNodeId: string) => {
    e.stopPropagation();
    if (connectingSourceNodeId && connectingSourceNodeId !== clickedNodeId) {
      handleConnectNodes(connectingSourceNodeId, clickedNodeId);
    }
  };

  // Port Connector Handlers
  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setConnectingSourceNodeId(nodeId);
    setSelectedNodeId(nodeId);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setTempPointerPos({
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom,
      });
    }
    toast('⚡ Modo conexión: Haz clic en el cargo de destino o arrastra hacia él (ESC para cancelar)', {
      icon: '🔗',
      duration: 3500,
    });
  };

  const handlePortMouseUp = (e: React.MouseEvent, targetNodeId: string) => {
    e.stopPropagation();
    if (connectingSourceNodeId && connectingSourceNodeId !== targetNodeId) {
      handleConnectNodes(connectingSourceNodeId, targetNodeId);
    }
  };

  // Add New Node
  const handleAddNode = (type: WorkflowNode['type'] = 'OPERACIONES') => {
    const id = `node-${Date.now()}`;
    const newNode: WorkflowNode = {
      id,
      type,
      title: type === 'CONDICIONAL' ? 'Nueva Regla Condicional' : 'Nuevo Cargo / Dependencia',
      subtitle: 'Descripción de funciones y competencias',
      manager: 'Funcionario Responsable',
      areaKey: 'GERENCIA GENERAL',
      x: Math.round((200 - pan.x) / zoom),
      y: Math.round((200 - pan.y) / zoom),
      slaHours: 48,
      canReceiveExternal: false,
      email: '',
      phone: '',
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(id);
    setHasUnsavedChanges(true);
    toast.success('Nuevo nodo agregado al organigrama');
  };

  // Detach / Unhook Edge on Double Click
  const handleDetachEdge = (edgeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetEdge = edges.find((edge) => edge.id === edgeId);
    const src = nodes.find((n) => n.id === targetEdge?.source);
    const tgt = nodes.find((n) => n.id === targetEdge?.target);

    setEdges((prev) => prev.filter((edge) => edge.id !== edgeId));
    if (selectedEdgeId === edgeId) setSelectedEdgeId(null);
    setHasUnsavedChanges(true);
    toast.success(
      `Conector soltado: ${src?.title || 'Origen'} ➔ ${tgt?.title || 'Destino'}`
    );
  };

  // Delete Selected Node or Edge
  const handleDeleteSelected = () => {
    if (selectedNodeId) {
      setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
      setEdges((prev) => prev.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
      setSelectedNodeId(null);
      setHasUnsavedChanges(true);
      toast.success('Cargo eliminado del organigrama');
    } else if (selectedEdgeId) {
      handleDetachEdge(selectedEdgeId);
    }
  };

  // Keyboard shortcut listener for ESC (Cancel / Deselect) & Delete / Backspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement)?.blur();
        }
        return;
      }

      // ESC: Cancel Connection Drag / Magnet / Deselect
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        if (connectingSourceNodeId) {
          setConnectingSourceNodeId(null);
          setTempPointerPos(null);
          toast.success('Conexión cancelada (ESC)');
        } else if (selectedNodeId || selectedEdgeId) {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
          setDraggingNodeId(null);
          setIsPanning(false);
          toast('Selección cancelada', { icon: '✖️', duration: 1500 });
        }
        return;
      }

      // Delete / Backspace: Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId || selectedEdgeId) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, connectingSourceNodeId, selectedNodeId, selectedEdgeId, nodes, edges]);

  // Global window mouseup listener to guarantee drag release anywhere
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsPanning(false);
      setPotentialDragNodeId(null);
      setDraggingNodeId(null);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Save to Backend
  const handleSaveWorkflow = async () => {
    const updatedSettings = {
      ...settings,
      workflow: {
        nodes,
        edges,
      },
    };
    const toastId = toast.loading('Guardando estructura del organigrama y flujos...');
    try {
      await dispatch(saveWorkflowSettings(updatedSettings)).unwrap();
      dispatch(updateWorkflowLocal({ nodes, edges }));
      setHasUnsavedChanges(false);
      toast.success('¡Organigrama Institucional 360° guardado con éxito!', { id: toastId });
    } catch (err: any) {
      toast.error('Error al guardar organigrama: ' + err, { id: toastId });
    }
  };

  // Load Template
  const handleApplyTemplate = (templateKey: string) => {
    const tpl = DEFAULT_TEMPLATES[templateKey];
    if (tpl) {
      setNodes(tpl.workflow.nodes);
      setEdges(tpl.workflow.edges);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setHasUnsavedChanges(true);
      toast.success(`Plantilla "${tpl.label}" cargada en el lienzo`);
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Compute Bezier Curve for Edges
  const edgeCurves = useMemo(() => {
    return edges
      .map((edge) => {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);

        if (!source || !target) return null;

        const sourceWidth = source.type === 'CONDICIONAL' ? 220 : 250;
        const sourceHeight = source.type === 'CONDICIONAL' ? 104 : 116;
        const targetWidth = target.type === 'CONDICIONAL' ? 220 : 250;

        // Source anchor (bottom center port)
        const x1 = source.x + sourceWidth / 2;
        const y1 = source.y + sourceHeight;

        // Target anchor (top center port)
        const x2 = target.x + targetWidth / 2;
        const y2 = target.y;

        const dy = Math.max(Math.abs(y2 - y1) * 0.55, 45);
        const cx1 = x1;
        const cy1 = y1 + dy;
        const cx2 = x2;
        const cy2 = y2 - dy;

        const path = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        return {
          ...edge,
          path,
          midX,
          midY,
        };
      })
      .filter(Boolean);
  }, [nodes, edges]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/90 backdrop-blur-xl flex flex-col animate-fadeIn">
      {/* Top Header Bar */}
      <header className="h-16 px-6 bg-slate-900/90 dark:bg-[#030e08]/95 border-b-2 border-emerald-500/40 flex items-center justify-between z-30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
        <div className="flex items-center gap-3.5">
          <CrestLogo size="sm" className="w-10 h-10 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                <span>Organigrama & Workflow Canvas 360°</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  CHLS Directives Engine
                </span>
              </h2>
              {hasUnsavedChanges && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  ● Cambios sin guardar
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Parametrización visual de jerarquías de mando, dependencias y reglas de derivación oficial
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Add Department Button */}
          <button
            onClick={() => handleAddNode('OPERACIONES')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-xs font-black transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Agregar Cargo</span>
          </button>

          {/* Add Rule / Branch Button */}
          <button
            onClick={() => handleAddNode('CONDICIONAL')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 text-xs font-black transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
          >
            <GitBranch className="w-4 h-4" />
            <span>+ Regla Condicional</span>
          </button>

          {/* Template Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
            <Layers className="w-3.5 h-3.5 text-brand-gold" />
            <select
              onChange={(e) => handleApplyTemplate(e.target.value)}
              defaultValue="ORGANIGRAMA_OFICIAL"
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
            >
              <option value="ORGANIGRAMA_OFICIAL" className="bg-slate-900 text-white">
                Plantilla Oficial CHLS
              </option>
            </select>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveWorkflow}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Organigrama'}</span>
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Workspace: Canvas + Floating Tools + Inspector Drawer */}
      <div className="relative flex-1 overflow-hidden flex">
        
        {/* Infinite Grid Canvas */}
        <div
          ref={canvasRef}
          onWheel={handleWheel}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          className="relative flex-1 h-full select-none cursor-grab active:cursor-grabbing overflow-hidden bg-[#040a07]"
          style={{
            backgroundImage: `
              radial-gradient(circle, rgba(16,185,129,0.18) 1px, transparent 1px),
              linear-gradient(to right, rgba(16,185,129,0.04) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(16,185,129,0.04) 1px, transparent 1px)
            `,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px, ${120 * zoom}px ${120 * zoom}px, ${120 * zoom}px ${120 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          {/* Background Ambient Glows */}
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* SVG Connectors Layer */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            style={{ overflow: 'visible' }}
          >
            <defs>
              {/* Emerald Glow Filter */}
              <filter id="emerald-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feFlood floodColor="#10b981" floodOpacity="0.8" result="color" />
                <feComposite in2="blur" operator="in" result="shadow" />
                <feMerge>
                  <feMergeNode in="shadow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Gold Glow Filter */}
              <filter id="gold-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feFlood floodColor="#f59e0b" floodOpacity="0.8" result="color" />
                <feComposite in2="blur" operator="in" result="shadow" />
                <feMerge>
                  <feMergeNode in="shadow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Arrow Markers */}
              <marker
                id="arrow-emerald"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
              </marker>

              <marker
                id="arrow-gold"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
              </marker>
            </defs>

            {/* Scaled & Panned Group for all SVG connections matching world space coordinates */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Render Permanent Edges */}
              {edgeCurves.map((edge) => {
                if (!edge) return null;
                const isSelected = selectedEdgeId === edge.id;
                const isHierarchical = edge.style === 'HIERARCHICAL';

                return (
                  <g key={edge.id} className="pointer-events-auto cursor-pointer group">
                    {/* Broad transparent stroke for easy clicking & double-clicking */}
                    <path
                      d={edge.path}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="24"
                      onClick={() => {
                        setSelectedEdgeId(edge.id);
                        setSelectedNodeId(null);
                      }}
                      onDoubleClick={(e) => handleDetachEdge(edge.id, e)}
                    />

                    {/* Ambient Glow Background Line */}
                    <path
                      d={edge.path}
                      fill="none"
                      stroke={isHierarchical ? '#f59e0b' : '#10b981'}
                      strokeWidth={isSelected ? 6 : 3}
                      strokeOpacity={isSelected ? 0.9 : 0.4}
                      filter={isHierarchical ? 'url(#gold-glow)' : 'url(#emerald-glow)'}
                      onDoubleClick={(e) => handleDetachEdge(edge.id, e)}
                    />

                    {/* Animated Dashed Core Line */}
                    <path
                      d={edge.path}
                      fill="none"
                      stroke={isHierarchical ? '#fbbf24' : '#34d399'}
                      strokeWidth={isSelected ? 3.5 : 2.2}
                      strokeDasharray="8 6"
                      markerEnd={isHierarchical ? 'url(#arrow-gold)' : 'url(#arrow-emerald)'}
                      className="transition-all"
                      onDoubleClick={(e) => handleDetachEdge(edge.id, e)}
                    />

                    {/* Edge Label Pill */}
                    {edge.label && (
                      <foreignObject
                        x={edge.midX - 75}
                        y={edge.midY - 14}
                        width="150"
                        height="30"
                        className="overflow-visible"
                      >
                        <div
                          onClick={() => {
                            setSelectedEdgeId(edge.id);
                            setSelectedNodeId(null);
                          }}
                          onDoubleClick={(e) => handleDetachEdge(edge.id, e)}
                          title="1 clic: Seleccionar • Doble clic: Soltar / Desconectar"
                          className={`text-[9.5px] font-black uppercase text-center px-2.5 py-0.5 rounded-full border backdrop-blur-md transition-all shadow-md truncate cursor-pointer select-none ${
                            isSelected
                              ? 'bg-emerald-500 text-black border-white shadow-[0_0_15px_rgba(16,185,129,0.8)] scale-110'
                              : isHierarchical
                              ? 'bg-black/80 text-brand-gold border-brand-gold/40 hover:border-brand-gold hover:scale-105'
                              : 'bg-black/80 text-emerald-300 border-emerald-500/40 hover:border-emerald-400 hover:scale-105'
                          }`}
                        >
                          {edge.label}
                        </div>
                      </foreignObject>
                    )}

                    {/* Floating Quick Action Button on Selected Connector */}
                    {isSelected && (
                      <foreignObject
                        x={edge.midX - 55}
                        y={edge.midY - 44}
                        width="110"
                        height="30"
                        className="overflow-visible"
                      >
                        <button
                          type="button"
                          title="Doble clic en la línea o clic en este botón para soltar el conector"
                          onClick={(e) => handleDetachEdge(edge.id, e)}
                          className="w-full flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-[9px] uppercase tracking-wider shadow-[0_0_18px_rgba(239,68,68,0.9)] hover:scale-110 active:scale-95 transition-all border border-white cursor-pointer select-none animate-bounce"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>Soltar (2 Clics)</span>
                        </button>
                      </foreignObject>
                    )}
                  </g>
                );
              })}

              {/* Temporary Dragging Edge */}
              {connectingSourceNodeId && tempPointerPos && (
                <g>
                  {(() => {
                    const source = nodes.find((n) => n.id === connectingSourceNodeId);
                    if (!source) return null;
                    const sourceWidth = source.type === 'CONDICIONAL' ? 220 : 250;
                    const sourceHeight = source.type === 'CONDICIONAL' ? 104 : 116;
                    const x1 = source.x + sourceWidth / 2;
                    const y1 = source.y + sourceHeight;
                    const x2 = tempPointerPos.x;
                    const y2 = tempPointerPos.y;
                    const dy = Math.max(Math.abs(y2 - y1) * 0.55, 45);
                    const path = `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;

                    return (
                      <>
                        <path
                          d={path}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3.5"
                          strokeDasharray="6 4"
                          filter="url(#emerald-glow)"
                        />
                        <circle cx={x2} cy={y2} r="6" fill="#34d399" className="animate-ping" />
                      </>
                    );
                  })()}
                </g>
              )}
            </g>
          </svg>

          {/* Node Elements Layer */}
          <div
            className="absolute inset-0 pointer-events-none z-20"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isDirectorio = node.type === 'DIRECTORIO';
              const isCondicional = node.type === 'CONDICIONAL';
              const isConnectSource = connectingSourceNodeId === node.id;
              const isConnectTarget = Boolean(connectingSourceNodeId && connectingSourceNodeId !== node.id);

              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node)}
                  onMouseUp={(e) => handleNodeMouseUp(e, node.id)}
                  onClick={(e) => handleNodeClick(e, node.id)}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: isCondicional ? '220px' : '250px',
                    height: isCondicional ? '104px' : '116px',
                  }}
                  className={`absolute pointer-events-auto rounded-2xl bg-gradient-to-br from-[#0c2217]/95 via-[#07170f]/95 to-[#020a06]/95 backdrop-blur-xl transition-all select-none flex flex-col justify-between p-3.5 group ${
                    isConnectSource
                      ? 'ring-4 ring-amber-400 border-2 border-amber-300 shadow-[0_0_35px_rgba(245,158,11,0.9)] scale-105 z-30'
                      : isConnectTarget
                      ? 'ring-2 ring-emerald-400 border-2 border-dashed border-emerald-300 hover:border-emerald-200 hover:scale-105 hover:shadow-[0_0_35px_rgba(16,185,129,0.9)] cursor-pointer z-20 animate-pulse'
                      : isSelected
                      ? 'ring-4 ring-emerald-500/50 border-2 border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.7)] scale-[1.03] cursor-grab active:cursor-grabbing z-20'
                      : isDirectorio
                      ? 'border-2 border-brand-gold/80 shadow-[0_0_25px_rgba(245,158,11,0.35)] hover:shadow-[0_0_35px_rgba(245,158,11,0.6)] cursor-grab active:cursor-grabbing'
                      : 'border-2 border-emerald-500/40 hover:border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] cursor-grab active:cursor-grabbing'
                  }`}
                >
                  {/* Top Glowing Gradient Aura Stripe */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${
                      isDirectorio
                        ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]'
                        : isCondicional
                        ? 'bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.8)]'
                        : 'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]'
                    }`}
                  />

                  {/* Top Input Connection Port (Target) */}
                  <div
                    onMouseUp={(e) => handlePortMouseUp(e, node.id)}
                    title="Conectar hacia este nodo (Entrada)"
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-slate-900 border-2 flex items-center justify-center cursor-crosshair transition-transform shadow-[0_0_12px_rgba(16,185,129,0.8)] z-30 ${
                      isConnectTarget
                        ? 'border-emerald-300 scale-125 bg-emerald-950 animate-bounce'
                        : 'border-emerald-400 hover:scale-125'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>

                  {/* Connecting Mode Target Badge */}
                  {isConnectTarget && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-emerald-500 text-black font-black text-[8.5px] uppercase tracking-wider shadow-lg whitespace-nowrap animate-bounce pointer-events-none">
                      Clic para Conectar ➔
                    </div>
                  )}

                  {/* Connecting Mode Source Badge */}
                  {isConnectSource && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-400 text-black font-black text-[8.5px] uppercase tracking-wider shadow-lg whitespace-nowrap pointer-events-none">
                      ⚡ Origen del Vínculo
                    </div>
                  )}

                  {/* Floating Quick Action Toolbar on Selected Node */}
                  {isSelected && !connectingSourceNodeId && (
                    <div
                      className="absolute -top-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 bg-slate-950/95 border border-emerald-400 p-1 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.8)] backdrop-blur-md animate-fadeIn"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        title="Conectar este cargo con otro"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConnectingSourceNodeId(node.id);
                          toast('⚡ Haz clic en el cargo de destino para vincular (ESC para cancelar)', {
                            icon: '🔗',
                            duration: 3500,
                          });
                        }}
                        className="px-2.5 py-0.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[9px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow"
                      >
                        <GitBranch className="w-2.5 h-2.5" />
                        <span>Conectar</span>
                      </button>
                      <button
                        type="button"
                        title="Eliminar cargo del organigrama"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSelected();
                        }}
                        className="p-1 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-300 hover:text-white transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}

                  {/* Node Header: Icon + Title + Type Badge */}
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 shrink-0 shadow-inner">
                      {getNodeIcon(node.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400/90 truncate">
                          {node.type}
                        </span>
                        {node.slaHours && (
                          <span className="text-[9px] font-mono font-bold text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10 shrink-0">
                            ⏱️ {node.slaHours}h SLA
                          </span>
                        )}
                      </div>
                      <h3 className="text-xs sm:text-sm font-black text-white leading-tight truncate mt-0.5 group-hover:text-emerald-300 transition-colors">
                        {node.title}
                      </h3>
                    </div>
                  </div>

                  {/* Manager & Subtitle */}
                  <div className="mt-1 pt-1.5 border-t border-emerald-500/20 text-[11px] space-y-0.5">
                    {node.manager && (
                      <div className="flex items-center gap-1.5 text-slate-200 font-bold truncate">
                        <User className="w-3 h-3 text-brand-gold shrink-0" />
                        <span className="truncate text-[10.5px]">{node.manager}</span>
                      </div>
                    )}
                    <p className="text-[9.5px] text-slate-400 truncate italic">
                      {node.subtitle}
                    </p>
                  </div>

                  {/* Bottom Output Connection Port (Source) */}
                  <div
                    onMouseDown={(e) => handlePortMouseDown(e, node.id)}
                    title="Arrastrar o hacer clic para conectar derivación (Salida)"
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-slate-900 border-2 border-emerald-400 flex items-center justify-center cursor-crosshair hover:scale-125 transition-transform shadow-[0_0_12px_rgba(16,185,129,0.8)] z-30 group-hover:ring-4 group-hover:ring-emerald-500/40"
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating Canvas Navigation Tools (Zoom & Fit) */}
        <div className="absolute bottom-6 left-6 z-30 flex items-center gap-1.5 bg-slate-900/90 border border-emerald-500/30 p-1.5 rounded-2xl shadow-xl backdrop-blur-md">
          <button
            onClick={() => setZoom((z) => Math.min(Number((z + 0.1).toFixed(2)), 2.0))}
            title="Acercar (Zoom In)"
            className="p-2 rounded-xl hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs font-bold text-emerald-400 px-1 min-w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.max(Number((z - 0.1).toFixed(2)), 0.4))}
            title="Alejar (Zoom Out)"
            className="p-2 rounded-xl hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 40, y: 30 });
            }}
            title="Centrar vista (Fit View)"
            className="p-2 rounded-xl hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer border-l border-white/10 ml-0.5"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Quick Legend */}
        <div className="absolute top-6 left-6 z-30 bg-slate-900/85 border border-emerald-500/30 px-3 py-2 rounded-2xl shadow-xl backdrop-blur-md hidden md:flex items-center gap-4 text-[10.5px] font-bold text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            <span>Nivel Directivo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span>Gerencias & Jefaturas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            <span>Reglas Condicionales</span>
          </div>
        </div>

        {/* Floating Active Connection Banner */}
        {connectingSourceNodeId && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-slate-950/95 border-2 border-emerald-400 px-5 py-2 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.8)] backdrop-blur-xl flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">
              Modo Conexión: Haz clic en el cargo de destino para vincular
            </span>
            <button
              onClick={() => {
                setConnectingSourceNodeId(null);
                setTempPointerPos(null);
                toast('Conexión cancelada', { icon: '✖️' });
              }}
              className="ml-2 px-2.5 py-0.5 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-300 text-[10px] font-bold border border-red-500/40 cursor-pointer transition-colors"
            >
              Cancelar (ESC)
            </button>
          </div>
        )}

        {/* Node & Edge Inspector Drawer (Right Panel) */}
        {(selectedNode || selectedEdgeId) && (
          <aside className="w-80 sm:w-96 bg-slate-900/95 dark:bg-[#07170f]/98 border-l-2 border-emerald-500/40 p-5 z-40 overflow-y-auto flex flex-col justify-between shadow-2xl backdrop-blur-xl animate-fadeIn">
            {selectedNode ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-500/30">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {getNodeIcon(selectedNode.type)}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">Inspector de Cargo</h4>
                      <span className="text-[10px] font-mono text-emerald-400">{selectedNode.id}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedNodeId(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form fields */}
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase">
                      Nombre del Cargo / Dependencia
                    </label>
                    <input
                      type="text"
                      value={selectedNode.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNodes((prev) =>
                          prev.map((n) => (n.id === selectedNode.id ? { ...n, title: val } : n))
                        );
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-emerald-500/30 text-white font-bold outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase">
                      Titular / Funcionario Responsable
                    </label>
                    <input
                      type="text"
                      value={selectedNode.manager || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNodes((prev) =>
                          prev.map((n) => (n.id === selectedNode.id ? { ...n, manager: val } : n))
                        );
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-emerald-500/30 text-white font-bold outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase">
                      Función / Misión Institucional
                    </label>
                    <textarea
                      rows={2}
                      value={selectedNode.subtitle || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNodes((prev) =>
                          prev.map((n) => (n.id === selectedNode.id ? { ...n, subtitle: val } : n))
                        );
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-emerald-500/30 text-white text-xs outline-none focus:ring-1 focus:ring-emerald-400 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-400 mb-1 uppercase">
                        SLA por Defecto (Horas)
                      </label>
                      <input
                        type="number"
                        value={selectedNode.slaHours || 48}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setNodes((prev) =>
                            prev.map((n) => (n.id === selectedNode.id ? { ...n, slaHours: val } : n))
                          );
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-emerald-500/30 text-white font-mono font-bold outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-400 mb-1 uppercase">
                        Tipo de Nodo
                      </label>
                      <select
                        value={selectedNode.type}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setNodes((prev) =>
                            prev.map((n) => (n.id === selectedNode.id ? { ...n, type: val } : n))
                          );
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-emerald-500/30 text-white font-bold outline-none focus:ring-1 focus:ring-emerald-400"
                      >
                        <option value="DIRECTORIO">DIRECTORIO</option>
                        <option value="GERENCIA">GERENCIA</option>
                        <option value="SECRETARIA">SECRETARIA</option>
                        <option value="LEGAL">LEGAL</option>
                        <option value="FINANZAS">FINANZAS</option>
                        <option value="COMPRAS">COMPRAS</option>
                        <option value="OPERACIONES">OPERACIONES</option>
                        <option value="DEPORTES">DEPORTES</option>
                        <option value="RECEPCION">RECEPCIÓN</option>
                        <option value="ARCHIVO">ARCHIVO</option>
                        <option value="CONDICIONAL">CONDICIONAL</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase">
                      Teléfono WhatsApp para Alertas SLA
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                      <input
                        type="text"
                        placeholder="Ej. 70110003"
                        value={selectedNode.phone || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNodes((prev) =>
                            prev.map((n) => (n.id === selectedNode.id ? { ...n, phone: val } : n))
                          );
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/50 border border-emerald-500/30 text-white font-mono font-bold outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase">
                      Correo Institucional
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                      <input
                        type="email"
                        placeholder="usuario@chls.bo"
                        value={selectedNode.email || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNodes((prev) =>
                            prev.map((n) => (n.id === selectedNode.id ? { ...n, email: val } : n))
                          );
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/50 border border-emerald-500/30 text-white font-mono outline-none focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedNode.canReceiveExternal || false}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setNodes((prev) =>
                            prev.map((n) => (n.id === selectedNode.id ? { ...n, canReceiveExternal: val } : n))
                          );
                          setHasUnsavedChanges(true);
                        }}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-700 bg-slate-900"
                      />
                      <span className="text-[11px] font-bold text-slate-200">
                        Puede recibir correspondencia externa directa
                      </span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-emerald-500/20 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setConnectingSourceNodeId(selectedNode.id);
                      toast('⚡ Modo conexión: Haz clic en el cargo de destino para vincular (ESC para cancelar)', {
                        icon: '🔗',
                        duration: 4000,
                      });
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(16,185,129,0.6)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                  >
                    <GitBranch className="w-4 h-4" />
                    <span>⚡ Conectar con otro Cargo</span>
                  </button>

                  <button
                    onClick={handleDeleteSelected}
                    className="w-full py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Cargo del Organigrama</span>
                  </button>
                </div>
              </div>
            ) : selectedEdgeId ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-500/30">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-black text-white">Inspector de Conexión</h4>
                  </div>
                  <button
                    onClick={() => setSelectedEdgeId(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {(() => {
                  const edge = edges.find((e) => e.id === selectedEdgeId);
                  if (!edge) return null;
                  const srcNode = nodes.find((n) => n.id === edge.source);
                  const tgtNode = nodes.find((n) => n.id === edge.target);

                  return (
                    <div className="space-y-3 text-xs">
                      <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/20 space-y-1">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Origen:</div>
                        <div className="text-xs font-black text-emerald-300">{srcNode?.title}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase pt-1">Destino:</div>
                        <div className="text-xs font-black text-teal-300">{tgtNode?.title}</div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase">
                          Etiqueta del Proveído / Derivación
                        </label>
                        <input
                          type="text"
                          value={edge.label || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEdges((prev) =>
                              prev.map((item) => (item.id === edge.id ? { ...item, label: val } : item))
                            );
                            setHasUnsavedChanges(true);
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-emerald-500/30 text-white font-bold outline-none focus:ring-1 focus:ring-emerald-400"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase">
                          Tipo de Vínculo
                        </label>
                        <select
                          value={edge.style || 'OPERATIONAL'}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setEdges((prev) =>
                              prev.map((item) => (item.id === edge.id ? { ...item, style: val } : item))
                            );
                            setHasUnsavedChanges(true);
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-emerald-500/30 text-white font-bold outline-none focus:ring-1 focus:ring-emerald-400"
                        >
                          <option value="HIERARCHICAL">JERÁRQUICO (Directorio / Gerencia)</option>
                          <option value="OPERATIONAL">OPERATIVO (Derivación de Trabajo)</option>
                          <option value="CONCLUSION">CONCLUSIÓN (Archivo Definitivo)</option>
                        </select>
                      </div>

                      <div className="pt-4 border-t border-emerald-500/20">
                        <button
                          onClick={handleDeleteSelected}
                          className="w-full py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Eliminar Conexión</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : null}

            {/* Footer Tip */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2 text-[10.5px] text-emerald-300/80 mt-4">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>
                Arrastra desde el punto inferior de cualquier nodo hacia el punto superior de otro para crear un nuevo enlace jerárquico.
              </span>
            </div>
          </aside>
        )}

      </div>
    </div>
  );
};

export default ChlsWorkflowCanvasModal;
