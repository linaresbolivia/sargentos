import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@store/store';
import { api } from '@config/api';
import { io, Socket } from 'socket.io-client';
import EmojiPicker, { Theme, EmojiStyle, EmojiClickData } from 'emoji-picker-react';
import { CrestLogo } from '@shared/components/CrestLogo';
import { WhatsAppEmojiText } from '@shared/components/WhatsAppEmojiRenderer';
import { WhatsAppRichInput, WhatsAppRichInputHandle } from '@shared/components/WhatsAppRichInput';
import {
  X,
  Send,
  MessageSquare,
  Building2,
  User,
  Users,
  FileText,
  Check,
  CheckCheck,
  Sparkles,
  Paperclip,
  ChevronRight,
  Minimize2,
  Maximize2,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  FileArchive,
  UploadCloud,
  Search,
  Smile,
  ExternalLink,
  ChevronDown,
  Shield,
  Briefcase,
  Lock,
  Circle,
  Radio,
  Reply,
  Bell,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { RouteSheetItem } from '../types/correspondence.types';

export type UserPresenceStatus = 'ONLINE' | 'AWAY' | 'OFFLINE';

export interface UserPresenceInfo {
  userId: string;
  username: string;
  status: UserPresenceStatus;
  lastSeen: string;
}

export interface ChatContact {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  phone?: string | null;
  areaKey?: string;
  avatarColor?: string;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
}

interface ChatMessage {
  id: string;
  channel: string;
  senderUserId: string;
  senderName: string;
  senderArea: string;
  message: string;
  routeSheetCode?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  status?: 'SENT' | 'DELIVERED' | 'READ';
  readAt?: string | null;
  replyToId?: string | null;
  replyToSenderName?: string | null;
  replyToText?: string | null;
  createdAt: string;
}

interface CorrespondenceInternalChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRouteSheetByCode?: (hrCode: string) => void;
  currentRouteSheet?: RouteSheetItem | null;
  channelUnreadCounts?: Record<string, number>;
  onClearChannelUnread?: (channelId: string) => void;
}

// Estructura oficial del Organigrama CHLS agrupada por Ramas y Dependencias
export const ORGANIGRAM_CHAT_GROUPS = [
  {
    id: 'GRP_GLOBAL',
    category: 'Canal Institucional',
    icon: '🌐',
    channels: [
      {
        id: 'GENERAL',
        label: 'Coordinación General CHLS',
        icon: '🌐',
        manager: 'Todos los Departamentos',
        position: 'Comunicaciones y Anuncios Generales',
        desc: 'Intercomunicador general para todos los despachos y funcionarios',
      },
    ],
  },
  {
    id: 'GRP_MAE',
    category: 'Despacho Superior & Staff',
    icon: '🏛️',
    channels: [
      {
        id: 'GERENCIA_GENERAL',
        label: 'Gerencia General (MAE)',
        icon: '🏛️',
        manager: 'Ing. Gerente General',
        position: 'Máxima Autoridad Ejecutiva (1)',
        desc: 'Instrucciones ejecutivas, proveídos y resoluciones',
      },
      {
        id: 'SECRETARIA_GERENCIA',
        label: 'Secretaría de Despacho',
        icon: '📋',
        manager: 'Lic. Secretaria de Gerencia',
        position: 'Secretaría de Despacho (1)',
        desc: 'Filtro central de correspondencia y radicación',
      },
      {
        id: 'MENSAJERIA',
        label: 'Mensajería & Despacho Externo',
        icon: '🏃',
        manager: 'Mensajero Oficial',
        position: 'Mensajería y Notificaciones (1)',
        desc: 'Distribución física externa e interna de correspondencia',
      },
      {
        id: 'ASESORIA_LEGAL',
        label: 'Asesoría Legal',
        icon: '⚖️',
        manager: 'Dr. Asesor Legal Principal',
        position: 'Asesoría Legal (1)',
        desc: 'Dictámenes jurídicos, contratos y resoluciones',
      },
      {
        id: 'COORDINACION_COMERCIAL',
        label: 'Coordinación Comercial',
        icon: '🤝',
        manager: 'Lic. Coordinador Comercial',
        position: 'Coordinación Comercial (1)',
        desc: 'Convenios comerciales, publicidad y patrocinios',
      },
    ],
  },
  {
    id: 'GRP_FINANZAS',
    category: 'Subgerencia Financiera & RRHH',
    icon: '💰',
    channels: [
      {
        id: 'SUBGERENCIA_FINANCIERA',
        label: 'Subgerencia Financiera & RRHH',
        icon: '💼',
        manager: 'Lic. Subgerente Financiero',
        position: 'Subgerencia de Operaciones Financieras (1)',
        desc: 'Supervisión financiera, presupuestos y recursos humanos',
      },
      {
        id: 'CONTABILIDAD',
        label: 'Contabilidad & Balances',
        icon: '📊',
        manager: 'Lic. Encargado de Contabilidad',
        position: 'Encargado de Contabilidad / Analista (2)',
        desc: 'Estados financieros, conciliaciones y comprobantes contables',
      },
      {
        id: 'RECAUDACIONES_CAJA',
        label: 'Recaudaciones, Caja & Cobranzas',
        icon: '💳',
        manager: 'Lic. Analista de Recaudaciones',
        position: 'Recaudaciones / Cajero / Cobranzas (3)',
        desc: 'Cobro de cuotas de socios, pagos en caja y cartera morosa',
      },
      {
        id: 'CONTRATACIONES_COMPRAS',
        label: 'Contrataciones & Adquisiciones',
        icon: '📦',
        manager: 'Lic. Responsable de Contrataciones',
        position: 'Responsable de Contrataciones / Asistente (2)',
        desc: 'Licitaciones, cotizaciones, compras y relación con proveedores',
      },
      {
        id: 'RECURSOS_HUMANOS',
        label: 'Recursos Humanos',
        icon: '👥',
        manager: 'Encargado de RRHH',
        position: 'Recursos Humanos (1)',
        desc: 'Planillas, asistencias, memorándums y personal',
      },
      {
        id: 'ALMACEN_SUMINISTROS',
        label: 'Almacén Central',
        icon: '🏷️',
        manager: 'Encargado de Almacén',
        position: 'Almacén y Suministros (1)',
        desc: 'Entradas, salidas de materiales y stock de insumos',
      },
      {
        id: 'ARCHIVO_CENTRAL',
        label: 'Archivo Central Institucional',
        icon: '📁',
        manager: 'Responsable de Archivo Central',
        position: 'Archivo Central y Custodia Documental (1)',
        desc: 'Custodia histórica de expedientes y archivo pasivo',
      },
    ],
  },
  {
    id: 'GRP_ATS',
    category: 'Subgerencia de Atención al Socio',
    icon: '🌟',
    channels: [
      {
        id: 'SUBGERENCIA_SOCIO',
        label: 'Subgerencia Atención al Socio',
        icon: '🏅',
        manager: 'Lic. Subgerente de Atención al Socio',
        position: 'Subgerencia Atención al Socio (1)',
        desc: 'Relación con socios, membresías y eventos institucionales',
      },
      {
        id: 'ATENCION_SOCIO_ATS',
        label: 'Módulo de Atención al Socio (A.T.S.)',
        icon: '🛎️',
        manager: 'Técnico Especialista A.T.S.',
        position: 'Asistente & Técnicos de Atención (3)',
        desc: 'Plataforma presencial de trámites, carnets y solicitudes',
      },
      {
        id: 'RECEPCION_CASETA',
        label: 'Recepción Central & Caseta de Ingreso',
        icon: '🚪',
        manager: 'Recepcionista Central',
        position: 'Recepción (3) & Portería Principal (3)',
        desc: 'Control de accesos peatonales, visitas y registro de ingreso',
      },
      {
        id: 'SERVICIOS_TOALLAS',
        label: 'Servicios Generales & Toallas',
        icon: '🧺',
        manager: 'Asistente de Toallas',
        position: 'Personal de Toallas y Vestuarios (3)',
        desc: 'Entrega de toallas, control de lockers y vestidores',
      },
    ],
  },
  {
    id: 'GRP_SISTEMAS',
    category: 'Sistemas, TI & Comunicación',
    icon: '💻',
    channels: [
      {
        id: 'SISTEMAS_TI',
        label: 'Encargado de Sistemas & TI',
        icon: '🖥️',
        manager: 'Ing. Encargado de Sistemas',
        position: 'Encargado de Sistemas y Redes (1)',
        desc: 'Infraestructura de servidores, software CHLS 360 y seguridad',
      },
      {
        id: 'SOPORTE_TI',
        label: 'Soporte Técnico & Redes',
        icon: '⌨️',
        manager: 'Técnico de Soporte TI',
        position: 'Soporte Técnico y Mantenimiento de Equipos (1)',
        desc: 'Mantenimiento de computadoras, impresoras y red Wi-Fi',
      },
      {
        id: 'COMUNICACION_PRENSA',
        label: 'Comunicación, Prensa & RRPP',
        icon: '📢',
        manager: 'Lic. Encargado de Comunicación',
        position: 'Comunicación y Relaciones Públicas (1)',
        desc: 'Boletines oficiales, redes sociales y eventos del club',
      },
    ],
  },
  {
    id: 'GRP_MANTENIMIENTO',
    category: 'Mantenimiento & Infraestructura',
    icon: '🛠️',
    channels: [
      {
        id: 'MANTENIMIENTO_OBRAS',
        label: 'Jefatura de Mantenimiento & Obras',
        icon: '🔧',
        manager: 'Ing. Jefe de Mantenimiento',
        position: 'Jefe de Mantenimiento & Cuadrilla (12)',
        desc: 'Obras civiles, plomería, electricidad y áreas verdes',
      },
      {
        id: 'PISCINA_MANT',
        label: 'Tratamiento de Aguas & Piscinas',
        icon: '🧪',
        manager: 'Asistente Piscinero',
        position: 'Asistentes Piscineros (2)',
        desc: 'Calderas, recirculación y tratamiento químico de piscinas',
      },
      {
        id: 'TENIS_MANT',
        label: 'Canchas de Tenis & Arcilla',
        icon: '🎾',
        manager: 'Asistente Canchas Tenis',
        position: 'Asistentes de Tenis (2)',
        desc: 'Mantenimiento de arcilla, riego y canchas deportivas',
      },
      {
        id: 'POLIGONO_TIRO',
        label: 'Polígono de Tiro',
        icon: '🎯',
        manager: 'Asistente Polígono',
        position: 'Asistentes Polígono de Tiro (2)',
        desc: 'Línea de tiro, blancos y protocolos de seguridad',
      },
    ],
  },
  {
    id: 'GRP_HIPICA',
    category: 'Área Hípica & Caballerizas',
    icon: '🐎',
    channels: [
      {
        id: 'COMISION_HIPICA',
        label: 'Jefatura Área Hípica',
        icon: '🏇',
        manager: 'Capitán / Encargado de Hípica',
        position: 'Encargado Área Hípica (1)',
        desc: 'Organización ecuestre, picaderos y concursos de salto',
      },
      {
        id: 'VETERINARIA',
        label: 'Sanidad & Veterinaria Equina',
        icon: '🩺',
        manager: 'Dr. Médico Veterinario',
        position: 'Médico Veterinario (1)',
        desc: 'Control sanitario, pasaportes equinos y atención clínica',
      },
      {
        id: 'PISTAS_SALTO',
        label: 'Pistas de Salto & Picaderos',
        icon: '🚩',
        manager: 'Pistero Principal',
        position: 'Pistero & Ayudante (2)',
        desc: 'Armado de recorridos, obstáculos y pisos de arena',
      },
      {
        id: 'HERRERIA',
        label: 'Herrería Oficial',
        icon: '🔨',
        manager: 'Herrero Oficial',
        position: 'Herrero & Ayudante (2)',
        desc: 'Herraje de caballos, fragua y cuidado de cascos',
      },
      {
        id: 'CABALLERIZAS_SERENOS',
        label: 'Caballerizas & Serenos',
        icon: '🛖',
        manager: 'Equipo de Caballerizos y Serenos',
        position: 'Caballerizos (18) & Serenos (3)',
        desc: 'Alimentación, camas, aseo de boxes y vigilancia nocturna',
      },
    ],
  },
  {
    id: 'GRP_DEPORTES',
    category: 'Deportes & Actividades Acuáticas',
    icon: '🏋️',
    channels: [
      {
        id: 'GIMNASIO',
        label: 'Supervisor de Gimnasio',
        icon: '💪',
        manager: 'Supervisor Gimnasio',
        position: 'Supervisor Gimnasio (1)',
        desc: 'Equipamiento de máquinas, pesas y entrenadores',
      },
      {
        id: 'PISCINA_ACUATICA',
        label: 'Piscina Techada & Guardavidas',
        icon: '🏊',
        manager: 'Supervisor Piscina',
        position: 'Supervisor Piscina & Guardavidas (3)',
        desc: 'Horarios de natación libre, cursos y seguridad acuática',
      },
    ],
  },
];

const ALL_CHANNELS = ORGANIGRAM_CHAT_GROUPS.flatMap((g) => g.channels);

const PRESET_QUICK_MESSAGES = [
  'Hoja de Ruta radicada y enviada a su despacho 👍',
  'Favor remitir antecedentes o cotizaciones 📑',
  'Factura verificada para programación de pago 💰',
  'URGENTE: Requiere visto bueno de Gerencia ⚠️',
  'Trámite concluido y archivado correctamente ✅',
  'Revisar documentación digitalizada adjunta 📎',
];

// Colección completa de Emoticonos estilo WhatsApp Web organizados por categorías
export const WHATSAPP_EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Caritas y Emociones',
    icon: '😊',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
      '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
      '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
      '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁',
      '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
      '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👻',
      '👽', '🤖'
    ],
  },
  {
    id: 'gestures',
    name: 'Manos y Gestos',
    icon: '👍',
    emojis: [
      '👍', '👎', '👌', '🤌', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👋',
      '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫸', '🫷', '🫳', '🫴', '👏', '🙌', '👐', '🤲', '🤝', '🙏',
      '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🫀', '🫁', '🧠', '🫵', '👥',
      '👤', '🫂', '👨‍💻', '👩‍💻', '👨‍💼', '👩‍💼', '🕵️', '👮', '👷', '🧑‍🏫', '🧑‍⚕️', '🙋', '🙆', '🙅', '🤷'
    ],
  },
  {
    id: 'office',
    name: 'Oficina y Documentos',
    icon: '📑',
    emojis: [
      '✅', '✔️', '☑️', '❌', '❎', '⚠️', '🚨', '📌', '📍', '📎', '📁', '📂', '📄', '📃', '📑', '📊',
      '📈', '📉', '📋', '🗓️', '📅', '📇', '🗂️', '🗳️', '🗃️', '🗄️', '💼', '💰', '💵', '💳', '🧾', '⚖️',
      '🏛️', '🏢', '🏠', '🔑', '🔒', '🔓', '🔏', '🔐', '🔎', '🔍', '🖊️', '🖋️', '✒️', '📝', '✏️', '📦',
      '📬', '📨', '✉️', '📧', '📠', '💻', '🖥️', '🖨️', '📱', '☎️', '📞', '⏰', '⏱️', '⏳', '⌛', '🔔'
    ],
  },
  {
    id: 'hearts',
    name: 'Reacciones y Símbolos',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓',
      '💗', '💖', '💘', '💝', '💟', '✨', '⭐', '🌟', '💫', '💥', '🔥', '💯', '💢', '💬', '🗨️', '🗯️',
      '💭', '💤', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🎯', '🚀', '💡', '🔥', '🔮', '🎖️'
    ],
  },
  {
    id: 'club',
    name: 'Club y Deportes',
    icon: '🐴',
    emojis: [
      '🐴', '🏇', '🐎', '🦄', '🎾', '🏊', '🏊‍♂️', '🏋️', '🏋️‍♂️', '🏃', '🏃‍♂️', '⚽', '🏀', '🥇', '🏆', '🌿',
      '🌳', '☀️', '🌤️', '☕', '🍵', '🍽️', '🥪', '🍕', '🥗', '🍾', '🥂', '🍻', '🍹', '🚗', '🚙', '🚐'
    ],
  },
];

// Helper to play synthesized WhatsApp notification chime
const playMessageChime = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.08);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(1600, audioCtx.currentTime + 0.16);

    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc1.start();
    osc1.stop(audioCtx.currentTime + 0.08);
    osc2.start(audioCtx.currentTime + 0.08);
    osc2.stop(audioCtx.currentTime + 0.25);
  } catch {
    // Audio Context might be restricted before first interaction
  }
};

// Distinct sender colors like WhatsApp group chats
const SENDER_COLORS = [
  'text-emerald-400',
  'text-amber-400',
  'text-cyan-400',
  'text-pink-400',
  'text-purple-400',
  'text-teal-300',
  'text-yellow-400',
  'text-sky-300',
];

const getSenderColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SENDER_COLORS[Math.abs(hash) % SENDER_COLORS.length];
};

// Genera un ID de canal determinista y único para chat directo 1 a 1 entre dos usuarios
export const getDmChannelId = (usernameA: string, usernameB: string) => {
  const uA = (usernameA || '').toLowerCase().trim();
  const uB = (usernameB || '').toLowerCase().trim();
  return ['dm', ...[uA, uB].sort()].join('_');
};

export const CorrespondenceInternalChatDrawer: React.FC<CorrespondenceInternalChatDrawerProps> = ({
  isOpen,
  onClose,
  onSelectRouteSheetByCode,
  currentRouteSheet,
  channelUnreadCounts = {},
  onClearChannelUnread,
}) => {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const currentUsername = useMemo(() => {
    return (
      (currentUser as any)?.username ||
      currentUser?.email?.split('@')[0] ||
      'usuario'
    ).toLowerCase();
  }, [currentUser]);

  // Sidebar Tabs: 'USERS' (Direct 1-on-1 Messages) or 'ORGANIGRAM' (Channels by Department)
  const [sidebarTab, setSidebarTab] = useState<'USERS' | 'ORGANIGRAM'>('USERS');
  
  // Presence Filter: 'ALL' | 'ONLINE' | 'AWAY' | 'OFFLINE'
  const [presenceFilter, setPresenceFilter] = useState<'ALL' | 'ONLINE' | 'AWAY' | 'OFFLINE'>('ALL');
  const [presenceMap, setPresenceMap] = useState<Record<string, UserPresenceInfo>>({});

  // Selected Contact (for 1-on-1 Direct Message) or null (for General / Group Channels)
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [activeChannel, setActiveChannel] = useState('GENERAL');
  const [contacts, setContacts] = useState<ChatContact[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachedHrCode, setAttachedHrCode] = useState<string>(currentRouteSheet?.hrCode || '');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [showSearch, setShowSearch] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showQuickMessages, setShowQuickMessages] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState('smileys');
  const [emojiSearchFilter, setEmojiSearchFilter] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const richInputRef = useRef<WhatsAppRichInputHandle>(null);
  const socketRef = useRef<Socket | null>(null);

  // Sync attached HR code if currentRouteSheet changes
  useEffect(() => {
    if (currentRouteSheet?.hrCode) {
      setAttachedHrCode(currentRouteSheet.hrCode);
    }
  }, [currentRouteSheet]);

  // Fetch all active system users / contacts & initial presence state
  const fetchContactsAndPresence = async () => {
    try {
      const [contactsRes, presenceRes] = await Promise.all([
        api.get('/correspondence/chat/contacts'),
        api.get('/correspondence/chat/presence'),
      ]);
      if (contactsRes.data.success) {
        setContacts(contactsRes.data.data);
      }
      if (presenceRes.data.success) {
        setPresenceMap(presenceRes.data.data || {});
      }
    } catch (err) {
      console.error('Error fetching chat contacts/presence', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchContactsAndPresence();
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, [isOpen]);

  // Fetch messages when active channel changes or modal opens
  const fetchMessages = async (channel: string, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await api.get(`/correspondence/chat/messages?channel=${channel}`);
      if (response.data.success) {
        setMessages(response.data.data);
      }
    } catch {
      if (!silent) setMessages([]);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages(activeChannel);
      if (onClearChannelUnread) {
        onClearChannelUnread(activeChannel);
      }
    }
  }, [isOpen, activeChannel]);

  // Auto-mark active DM channel messages as read when drawer is open
  useEffect(() => {
    if (isOpen && activeChannel.startsWith('dm_')) {
      api.put('/correspondence/chat/read', { channel: activeChannel }).catch(() => {});
    }
  }, [isOpen, activeChannel, messages.length]);

  // Periodic background refresh when chat is open
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      fetchMessages(activeChannel, true);
    }, 3000);
    return () => clearInterval(timer);
  }, [isOpen, activeChannel]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Helper robusto para determinar si un mensaje fue enviado por el usuario actual
  const isMessageFromMe = useCallback(
    (msg: ChatMessage) => {
      if (!msg) return false;
      const uId = currentUser?.id?.toLowerCase();
      const uEmail = currentUser?.email?.toLowerCase();
      const uName = currentUsername?.toLowerCase();
      const sUserId = msg.senderUserId?.toLowerCase() || '';
      const sName = msg.senderName?.toLowerCase() || '';
      const fullName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim().toLowerCase();

      if (uId && sUserId === uId) return true;
      if (uEmail && (sUserId === uEmail || sName === uEmail)) return true;
      if (uName && (sUserId === uName || sName === uName)) return true;
      if (fullName && sName === fullName) return true;
      if (uName && (sUserId.includes(uName) || sName.includes(uName))) return true;
      if (uEmail && (sUserId.includes(uEmail.split('@')[0]) || sName.includes(uEmail.split('@')[0]))) return true;
      return false;
    },
    [currentUser, currentUsername]
  );

  // Realtime Socket listener & Presence Heartbeat
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_WS_URL || `http://${window.location.hostname}:5000`;
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    // Join presence room
    socket.emit('user:presence:join', {
      userId: currentUser?.id,
      username: currentUsername,
    });

    // Receive initial presence state of all users
    socket.on('user:presence:all', (data: Record<string, UserPresenceInfo>) => {
      setPresenceMap(data || {});
    });

    // Receive individual presence update
    socket.on('user:presence:update', (data: UserPresenceInfo) => {
      if (!data || !data.username) return;
      setPresenceMap((prev) => ({
        ...prev,
        [data.username.toLowerCase()]: data,
      }));
    });

    const handleIncomingMessage = (newMsg: ChatMessage) => {
      const user = currentUserRef.current;
      const uId = user?.id?.toLowerCase();
      const uEmail = user?.email?.toLowerCase();
      const currentUName = (
        (user as any)?.username ||
        user?.email?.split('@')[0] ||
        ''
      ).toLowerCase();
      const sUserId = newMsg.senderUserId?.toLowerCase() || '';
      const sName = newMsg.senderName?.toLowerCase() || '';
      const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim().toLowerCase();

      const isMe =
        (uId && sUserId === uId) ||
        (uEmail && (sUserId === uEmail || sName === uEmail)) ||
        (currentUName && (sUserId === currentUName || sName === currentUName)) ||
        (fullName && sName === fullName) ||
        (currentUName && (sUserId.includes(currentUName) || sName.includes(currentUName))) ||
        (uEmail && (sUserId.includes(uEmail.split('@')[0]) || sName.includes(uEmail.split('@')[0])));

      // Check if message belongs to current channel or DM
      if (newMsg.channel === activeChannel || activeChannel === 'ALL') {
        setMessages((prev) => {
          let updated = prev;
          // Si el otro usuario me mandó un mensaje en este chat directo, mis mensajes previos ya fueron leídos por él
          if (!isMe && activeChannel.startsWith('dm_')) {
            updated = updated.map((m) => {
              const isMyMsg = isMessageFromMe(m);
              if (isMyMsg && m.status !== 'READ') {
                return { ...m, status: 'READ', readAt: newMsg.createdAt };
              }
              return m;
            });
          }

          if (updated.some((m) => m.id === newMsg.id)) return updated;
          return [...updated, newMsg];
        });

        // Confirmar lectura al servidor si tengo el chat abierto
        if (!isMe && isOpen && activeChannel.startsWith('dm_')) {
          api.put('/correspondence/chat/read', { channel: activeChannel }).catch(() => {});
        }
      }

      // Update contact's last message and timestamp in state to float to top of list
      if (newMsg.channel?.startsWith('dm_')) {
        const parts = newMsg.channel.split('_').slice(1);
        const otherUsername = parts.find((p) => p.toLowerCase() !== currentUName) || parts[0];
        if (otherUsername) {
          setContacts((prev) =>
            prev.map((c) => {
              if (c.username.toLowerCase() === otherUsername.toLowerCase()) {
                return {
                  ...c,
                  lastMessage: newMsg.message || (newMsg.fileName ? `📎 ${newMsg.fileName}` : 'Archivo adjunto'),
                  lastMessageAt: newMsg.createdAt,
                };
              }
              return c;
            })
          );
        }
      }

      // ONLY play sound or trigger notifications if message was sent by someone ELSE
      if (!isMe) {
        playMessageChime();

        // Native Desktop Web Notification (cuando está minimizado o en segundo plano)
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          if (document.hidden || newMsg.channel !== activeChannel) {
            try {
              const bodyText = newMsg.message
                ? newMsg.message.substring(0, 90)
                : newMsg.fileName
                ? `📎 ${newMsg.fileName}`
                : 'Nuevo mensaje en correspondencia';

              const notif = new Notification(`💬 ${newMsg.senderName} (${newMsg.senderArea})`, {
                body: bodyText,
                icon: '/src/assets/logo.png',
                tag: newMsg.id,
              });

              notif.onclick = () => {
                window.focus();
                if (newMsg.channel.startsWith('dm_')) {
                  const parts = newMsg.channel.split('_').slice(1);
                  const other = parts.find((p) => p.toLowerCase() !== currentUName) || parts[0];
                  const match = contacts.find((c) => c.username.toLowerCase() === other.toLowerCase());
                  if (match) setSelectedContact(match);
                } else {
                  setSelectedContact(null);
                  setActiveChannel(newMsg.channel);
                }
              };
            } catch (notifErr) {
              console.warn('Error launching browser notification', notifErr);
            }
          }
        }

        if (newMsg.channel !== activeChannel) {
          toast(
            `💬 ${newMsg.senderName} (${newMsg.senderArea}): ${newMsg.message.substring(0, 45)}...`,
            {
              icon: '📩',
              duration: 4500,
              style: {
                background: '#111b21',
                color: '#fff',
                border: '1px solid rgba(16,185,129,0.5)',
              },
            }
          );
        }
      }
    };

    const handleReadReceipt = (data: { channel: string; readerUserId: string; readAt: string }) => {
      if (data.channel === activeChannel) {
        const reader = (data.readerUserId || '').toLowerCase();
        const myUName = currentUsername.toLowerCase();

        // Solo actualizar a READ si el lector fue el destinatario (alguien distinto al usuario actual)
        if (reader && reader !== myUName && !myUName.includes(reader) && !reader.includes(myUName)) {
          setMessages((prev) =>
            prev.map((m) => {
              const isMyMsg = isMessageFromMe(m);
              if (isMyMsg && m.status !== 'READ') {
                return { ...m, status: 'READ', readAt: data.readAt };
              }
              return m;
            })
          );
        }
      }
    };

    socket.on('correspondence:chat:message', handleIncomingMessage);
    socket.on('correspondence:chat:read', handleReadReceipt);

    // Tab visibility & user idle detector for ONLINE vs AWAY status
    const handleVisibilityChange = () => {
      if (document.hidden) {
        socket.emit('user:presence:heartbeat', {
          userId: currentUser?.id,
          username: currentUsername,
          status: 'AWAY',
        });
      } else {
        socket.emit('user:presence:heartbeat', {
          userId: currentUser?.id,
          username: currentUsername,
          status: 'ONLINE',
        });
      }
    };

    let idleTimer: NodeJS.Timeout;
    const resetIdleTimer = () => {
      socket.emit('user:presence:heartbeat', {
        userId: currentUser?.id,
        username: currentUsername,
        status: 'ONLINE',
      });
      clearTimeout(idleTimer);
      // Mark away after 4 minutes of total inactivity
      idleTimer = setTimeout(() => {
        socket.emit('user:presence:heartbeat', {
          userId: currentUser?.id,
          username: currentUsername,
          status: 'AWAY',
        });
      }, 4 * 60 * 1000);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    window.addEventListener('click', resetIdleTimer);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('click', resetIdleTimer);
      clearTimeout(idleTimer);
      socket.disconnect();
    };
  }, [activeChannel, currentUsername, currentUser?.id]);

  if (!isOpen) return null;

  // Handlers for switching conversations
  const handleSelectContact = (contact: ChatContact) => {
    setSelectedContact(contact);
    const dmChannel = getDmChannelId(currentUsername, contact.username);
    setActiveChannel(dmChannel);
    if (onClearChannelUnread) {
      onClearChannelUnread(dmChannel);
      onClearChannelUnread(contact.username);
    }
  };

  const handleSelectGeneralOrChannel = (channelId: string) => {
    setSelectedContact(null);
    setActiveChannel(channelId);
    if (onClearChannelUnread) {
      onClearChannelUnread(channelId);
    }
  };

  const toggleGroup = (grpId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [grpId]: !prev[grpId],
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        toast.error('El archivo no puede exceder 25 MB');
        return;
      }
      setAttachedFile(file);
      toast.success(`Archivo adjunto: ${file.name}`);
    }
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.size > 25 * 1024 * 1024) {
        toast.error('El archivo no puede exceder 25 MB');
        return;
      }
      setAttachedFile(file);
      toast.success(`Archivo adjunto: ${file.name}`);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;

    setIsSending(true);
    try {
      let fileUrl = null;
      let fileName = null;
      let fileType = null;
      let fileSize = null;

      // 1. If file attached, upload first
      if (attachedFile) {
        const formData = new FormData();
        formData.append('file', attachedFile);

        const uploadRes = await api.post('/correspondence/chat/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (uploadRes.data.success) {
          fileUrl = uploadRes.data.data.fileUrl;
          fileName = uploadRes.data.data.fileName;
          fileType = uploadRes.data.data.mimeType;
          fileSize = uploadRes.data.data.fileSize;
        }
      }

      // 2. Send message with optional Reply payload
      const effectiveArea =
        (currentUser as any)?.area ||
        (currentUser as any)?.department ||
        'CHLS';

      const replyPayload = replyingTo
        ? {
            replyToId: replyingTo.id,
            replyToSenderName: replyingTo.senderName,
            replyToText: replyingTo.message
              ? replyingTo.message.substring(0, 140)
              : replyingTo.fileName
              ? `📎 ${replyingTo.fileName}`
              : 'Mensaje citado',
          }
        : {};

      const response = await api.post('/correspondence/chat/messages', {
        channel: activeChannel,
        message: inputText.trim(),
        routeSheetCode: attachedHrCode.trim() || null,
        senderArea: effectiveArea,
        fileUrl,
        fileName,
        fileType,
        fileSize,
        ...replyPayload,
      });

      if (response.data.success) {
        if (richInputRef.current) {
          richInputRef.current.clear();
        }
        setInputText('');
        setAttachedFile(null);
        setReplyingTo(null);
        setShowEmojis(false);
        setShowQuickMessages(false);
        if (fileInputRef.current) fileInputRef.current.value = '';

        const createdMsg = response.data.data;
        setMessages((prev) => {
          if (prev.some((m) => m.id === createdMsg.id)) return prev;
          return [...prev, createdMsg];
        });

        // Update contacts sorting with the newly sent message so it floats to top
        if (selectedContact) {
          setContacts((prev) =>
            prev.map((c) => {
              if (c.id === selectedContact.id) {
                return {
                  ...c,
                  lastMessage: createdMsg.message || (createdMsg.fileName ? `📎 ${createdMsg.fileName}` : 'Archivo adjunto'),
                  lastMessageAt: createdMsg.createdAt || new Date().toISOString(),
                };
              }
              return c;
            })
          );
        }
      }
    } catch {
      toast.error('Error al enviar mensaje o transferir archivo');
    } finally {
      setIsSending(false);
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImageFile = (mime?: string | null, name?: string | null) => {
    return !!(mime?.includes('image') || name?.match(/\.(jpg|jpeg|png|webp|gif)$/i));
  };

  const getFileIcon = (mime?: string | null, name?: string | null) => {
    if (isImageFile(mime, name)) {
      return <ImageIcon className="w-4 h-4 text-cyan-400" />;
    }
    if (mime?.includes('sheet') || mime?.includes('excel') || name?.match(/\.(xls|xlsx|csv)$/i)) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    }
    if (name?.match(/\.(zip|rar|7z)$/i)) {
      return <FileArchive className="w-4 h-4 text-amber-400" />;
    }
    return <FileText className="w-4 h-4 text-brand-gold" />;
  };

  const activeChannelInfo = ALL_CHANNELS.find((c) => c.id === activeChannel) || ALL_CHANNELS[0];

  // Messages Filter (Local Search inside active conversation)
  const filteredMessages = messages.filter((m) => {
    if (!searchFilter.trim()) return true;
    const query = searchFilter.toLowerCase();
    return (
      m.message?.toLowerCase().includes(query) ||
      m.senderName?.toLowerCase().includes(query) ||
      m.senderArea?.toLowerCase().includes(query) ||
      m.fileName?.toLowerCase().includes(query) ||
      m.routeSheetCode?.toLowerCase().includes(query)
    );
  });

  // Helper robusto para obtener el estado de presencia de un contacto
  const getContactPresence = useCallback(
    (c: ChatContact | null): UserPresenceStatus => {
      if (!c) return 'OFFLINE';
      const isMe =
        c.username.toLowerCase() === currentUsername ||
        (currentUser?.email && c.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser?.id && c.id === currentUser.id);

      if (isMe) return 'ONLINE';

      const uName = c.username?.toLowerCase() || '';
      const email = c.email?.toLowerCase() || '';
      const prefix = email ? email.split('@')[0] : uName;
      const id = c.id?.toLowerCase() || '';

      const p =
        presenceMap[uName] ||
        presenceMap[prefix] ||
        (email && presenceMap[email]) ||
        (id && presenceMap[id]) ||
        Object.values(presenceMap).find(
          (item) =>
            item.username?.toLowerCase() === uName ||
            item.username?.toLowerCase() === prefix ||
            item.userId?.toLowerCase() === id ||
            (email && item.username?.toLowerCase() === email)
        );

      return p?.status || 'OFFLINE';
    },
    [currentUsername, currentUser, presenceMap]
  );

  // Calculate presence statistics across all contacts
  const presenceCounts = useMemo(() => {
    let online = 0;
    let away = 0;
    let offline = 0;

    contacts.forEach((c) => {
      const status = getContactPresence(c);
      if (status === 'ONLINE') online++;
      else if (status === 'AWAY') away++;
      else offline++;
    });

    return {
      all: contacts.length,
      online,
      away,
      offline,
    };
  }, [contacts, getContactPresence]);

  // Filter and sort contacts by most recent message, search query AND selected presence status
  const filteredContacts = useMemo(() => {
    return contacts
      .filter((c) => {
        const status = getContactPresence(c);

        if (presenceFilter !== 'ALL' && status !== presenceFilter) {
          return false;
        }

        if (!sidebarSearch.trim()) return true;
        const q = sidebarSearch.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.username.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.role.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.lastMessageAt && b.lastMessageAt) {
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        }
        if (a.lastMessageAt) return -1;
        if (b.lastMessageAt) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [contacts, getContactPresence, presenceFilter, sidebarSearch]);

  // Target contact's real-time presence
  const targetPresence = useMemo(() => {
    if (!selectedContact) return null;
    const status = getContactPresence(selectedContact);
    return {
      status,
      lastSeen: status === 'ONLINE' ? new Date().toISOString() : '',
    };
  }, [selectedContact, getContactPresence]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setIsDraggingOver(false);
      }}
      onDrop={handleDropFile}
      className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-md flex justify-end animate-fadeIn"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-emerald-950/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-8 border-4 border-dashed border-emerald-400 animate-pulse">
          <UploadCloud className="w-20 h-20 text-emerald-400 mb-4" />
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">
            Suelta el archivo para transferirlo a {selectedContact ? selectedContact.name : `#${activeChannelInfo.label}`}
          </h2>
          <p className="text-sm text-emerald-200 mt-2 font-medium">
            Soporta PDFs, Excel, Word, Imágenes o Comprobantes (hasta 25 MB)
          </p>
        </div>
      )}

      {/* Click outside backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Main Container: Dual-Pane WhatsApp Web Style Structure */}
      <div
        className={`bg-[#0b141a] border-l-2 border-emerald-500/40 h-full shadow-[0_0_80px_rgba(16,185,129,0.3)] flex transition-all duration-300 ${
          isExpanded ? 'w-full max-w-6xl' : 'w-full max-w-4xl sm:max-w-5xl'
        }`}
      >
        
        {/* ========================================================================= */}
        {/* LEFT PANEL: CONTACTS & ORGANIGRAM SIDEBAR (Estilo WhatsApp Web)           */}
        {/* ========================================================================= */}
        <div className="w-80 sm:w-92 border-r border-emerald-500/25 bg-[#111b21] flex flex-col shrink-0">
          
          {/* Sidebar Top Header with Official Club Crest */}
          <div className="p-3 border-b border-emerald-500/25 bg-[#202c33] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-black/40 border border-brand-gold/40 p-1 flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)] shrink-0">
                <CrestLogo size="sm" className="w-full h-full" />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-white text-sm leading-tight flex items-center gap-1.5 truncate">
                  <span className="text-brand-gold font-serif">CHLS</span>
                  <span className="text-gray-200">Chat Interno</span>
                </h3>
                <span className="text-[10.5px] font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="truncate">Conectado como @{currentUsername}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Segmented Tab Switcher: [ 👤 Contactos (Directo) ] | [ 🏛️ Organigrama ] */}
          <div className="p-2 bg-[#111b21] border-b border-emerald-500/20 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setSidebarTab('USERS')}
              className={`py-1.5 px-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${
                sidebarTab === 'USERS'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-[#202c33] text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Contactos ({contacts.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSidebarTab('ORGANIGRAM')}
              className={`py-1.5 px-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${
                sidebarTab === 'ORGANIGRAM'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-[#202c33] text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Organigrama</span>
            </button>
          </div>

          {/* If in USERS Tab: Presence Status Filter Chips */}
          {sidebarTab === 'USERS' && (
            <div className="px-2.5 py-2 bg-[#111b21] border-b border-emerald-500/20 flex items-center gap-1 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setPresenceFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black tracking-wide transition-all cursor-pointer select-none whitespace-nowrap ${
                  presenceFilter === 'ALL'
                    ? 'bg-gradient-to-r from-brand-gold to-yellow-400 text-slate-950 shadow-xs font-black'
                    : 'bg-[#202c33] text-gray-400 hover:text-white'
                }`}
              >
                Todos ({presenceCounts.all})
              </button>

              <button
                type="button"
                onClick={() => setPresenceFilter('ONLINE')}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black tracking-wide flex items-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap ${
                  presenceFilter === 'ONLINE'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'bg-[#202c33] text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>En línea ({presenceCounts.online})</span>
              </button>

              <button
                type="button"
                onClick={() => setPresenceFilter('AWAY')}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black tracking-wide flex items-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap ${
                  presenceFilter === 'AWAY'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                    : 'bg-[#202c33] text-amber-400 hover:bg-amber-500/20 border border-amber-500/30'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Ausente ({presenceCounts.away})</span>
              </button>

              <button
                type="button"
                onClick={() => setPresenceFilter('OFFLINE')}
                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black tracking-wide flex items-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap ${
                  presenceFilter === 'OFFLINE'
                    ? 'bg-purple-500 text-white shadow-md font-black'
                    : 'bg-[#202c33] text-purple-300 hover:bg-purple-500/20 border border-purple-500/30'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span>Desconectados ({presenceCounts.offline})</span>
              </button>
            </div>
          )}

          {/* Search within Contacts or Channels */}
          <div className="p-3 bg-[#111b21] border-b border-emerald-500/20">
            <div className="flex items-center gap-2 bg-[#202c33] px-3 py-2 rounded-xl border border-white/10 focus-within:border-emerald-500">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder={sidebarTab === 'USERS' ? 'Buscar contacto, cargo o área...' : 'Buscar departamento o área...'}
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                className="bg-transparent text-xs text-white outline-none w-full placeholder-gray-500 font-medium"
              />
              {sidebarSearch && (
                <button
                  type="button"
                  onClick={() => setSidebarSearch('')}
                  className="text-gray-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* SIDEBAR CONTENT: USERS DIRECT MESSAGES LIST */}
          {sidebarTab === 'USERS' ? (
            <div className="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-emerald-500/40 p-2 space-y-1">
              
              {/* TOP PINNED: SALA GENERAL CHLS */}
              {presenceFilter === 'ALL' && (
                <button
                  type="button"
                  onClick={() => handleSelectGeneralOrChannel('GENERAL')}
                  className={`w-full p-2.5 rounded-2xl flex items-center gap-3 text-left transition-all cursor-pointer select-none group relative mb-2 ${
                    !selectedContact && activeChannel === 'GENERAL'
                      ? 'bg-gradient-to-r from-emerald-600/90 to-teal-700/90 text-white shadow-md shadow-emerald-500/20 border border-emerald-400'
                      : 'bg-[#202c33]/80 hover:bg-[#202c33] text-gray-200 border border-emerald-500/30'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center text-lg shrink-0 shadow-inner">
                    🌐
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-black truncate text-white">
                        Sala General CHLS
                      </h4>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                        Público
                      </span>
                    </div>
                    <p className="text-[11px] truncate text-emerald-200/80 mt-0.5 font-medium">
                      Anuncios y coordinación general
                    </p>
                  </div>
                </button>
              )}

              <div className="px-2 py-1 text-[10px] font-black uppercase text-brand-gold tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-brand-gold" />
                  <span>Contactos por Cargo ({filteredContacts.length})</span>
                </div>
              </div>

              {filteredContacts.map((contact) => {
                const isMe = contact.username.toLowerCase() === currentUsername;
                const isSelected = selectedContact?.id === contact.id;
                const dmChannel = getDmChannelId(currentUsername, contact.username);
                const unread = channelUnreadCounts[dmChannel] || channelUnreadCounts[contact.username] || 0;

                const status = getContactPresence(contact);

                // Paleta de 3 colores según estado: Verde (ONLINE), Amarillo (AWAY), Lila (OFFLINE)
                const isOnline = status === 'ONLINE';
                const isAway = status === 'AWAY';
                const isOffline = status === 'OFFLINE';

                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => handleSelectContact(contact)}
                    className={`w-full p-2.5 rounded-2xl flex items-center gap-3 text-left transition-all cursor-pointer select-none group relative border ${
                      isSelected
                        ? isOnline
                          ? 'bg-gradient-to-r from-emerald-600/90 to-teal-700/90 text-white shadow-md shadow-emerald-500/20 border-emerald-400'
                          : isAway
                          ? 'bg-gradient-to-r from-amber-600/90 to-yellow-700/90 text-white shadow-md shadow-amber-500/20 border-amber-400'
                          : 'bg-gradient-to-r from-purple-700/90 to-indigo-800/90 text-white shadow-md shadow-purple-500/20 border-purple-400'
                        : isOnline
                        ? 'bg-[#122319]/60 hover:bg-[#152e20] text-gray-200 border-emerald-500/30'
                        : isAway
                        ? 'bg-[#242013]/60 hover:bg-[#332b17] text-gray-200 border-amber-500/30'
                        : 'bg-[#1b1526]/60 hover:bg-[#251d36] text-gray-200 border-purple-500/30'
                    }`}
                  >
                    {/* User Avatar with Initials & Dynamic Presence Color: Verde, Amarillo, Lila */}
                    <div className="relative shrink-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-inner uppercase border ${
                          isSelected
                            ? 'bg-black/30 text-white border-white/40'
                            : isOnline
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.25)] group-hover:border-emerald-400'
                            : isAway
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.25)] group-hover:border-amber-400'
                            : 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)] group-hover:border-purple-400'
                        }`}
                      >
                        {contact.name.substring(0, 2)}
                      </div>

                      {/* Presence Status Dot */}
                      {isOnline ? (
                        <span
                          title="En línea (Activo)"
                          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#111b21] shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse"
                        />
                      ) : isAway ? (
                        <span
                          title="Ausente (Inactivo)"
                          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-[#111b21] shadow-[0_0_8px_rgba(245,158,11,0.9)]"
                        />
                      ) : (
                        <span
                          title="Desconectado"
                          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-purple-400 border-2 border-[#111b21] shadow-[0_0_8px_rgba(168,85,247,0.7)]"
                        />
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={`text-xs font-black truncate ${
                            isSelected
                              ? 'text-white'
                              : isOnline
                              ? 'text-emerald-100 group-hover:text-emerald-300'
                              : isAway
                              ? 'text-amber-100 group-hover:text-amber-300'
                              : 'text-purple-100 group-hover:text-purple-300'
                          }`}
                        >
                          {contact.name} {isMe && <span className="text-[10px] text-brand-gold font-normal">(Tú)</span>}
                        </h4>
                        
                        {/* Time & Unread Badge */}
                        <div className="flex items-center gap-1 shrink-0">
                          {contact.lastMessageAt && (
                            <span className="text-[10px] text-gray-400 font-mono">
                              {new Date(contact.lastMessageAt).toLocaleTimeString('es-BO', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                          {unread > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        {contact.lastMessage ? (
                          <p
                            className={`text-[11px] truncate font-medium max-w-[145px] ${
                              isSelected
                                ? 'text-white/90'
                                : isOnline
                                ? 'text-emerald-200/70 group-hover:text-emerald-100'
                                : isAway
                                ? 'text-amber-200/70 group-hover:text-amber-100'
                                : 'text-purple-200/70 group-hover:text-purple-100'
                            }`}
                          >
                            <span
                              className={`font-mono text-[10px] mr-1 ${
                                isOnline ? 'text-emerald-400' : isAway ? 'text-amber-400' : 'text-purple-400'
                              }`}
                            >
                              @{contact.username}:
                            </span>
                            <span>{contact.lastMessage}</span>
                          </p>
                        ) : (
                          <span
                            className={`text-[11px] font-mono truncate ${
                              isSelected
                                ? 'text-white/90'
                                : isOnline
                                ? 'text-emerald-400'
                                : isAway
                                ? 'text-amber-400'
                                : 'text-purple-300/80'
                            }`}
                          >
                            @{contact.username}
                          </span>
                        )}

                        {/* Status Label Pill con Lila, Verde y Amarillo */}
                        {isOnline ? (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 uppercase shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.25)]">
                            En línea
                          </span>
                        ) : isAway ? (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 uppercase shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.25)]">
                            Ausente
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase truncate max-w-[95px] shrink-0 shadow-[0_0_8px_rgba(168,85,247,0.15)]">
                            {contact.role.replace('MODULO_', '') || 'Offline'}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

            </div>
          ) : (
            /* SIDEBAR CONTENT: ORGANIGRAM CATEGORIES TREE */
            <div className="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-emerald-500/40">
              {ORGANIGRAM_CHAT_GROUPS.map((group) => {
                const matchesSearch = group.channels.some(
                  (c) =>
                    !sidebarSearch.trim() ||
                    c.label.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
                    c.manager.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
                    c.position.toLowerCase().includes(sidebarSearch.toLowerCase())
                );

                if (!matchesSearch) return null;

                const isCollapsed = !!collapsedGroups[group.id];
                const groupUnreadTotal = group.channels.reduce(
                  (sum, c) => sum + (channelUnreadCounts[c.id] || 0),
                  0
                );

                return (
                  <div key={group.id} className="py-1">
                    
                    {/* Category Header Accordion */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className="w-full px-3.5 py-2 flex items-center justify-between text-left hover:bg-white/5 transition-colors cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2 text-xs font-black text-brand-gold uppercase tracking-wider">
                        <span>{group.icon}</span>
                        <span>{group.category}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {groupUnreadTotal > 0 && (
                          <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-red-600 text-white shadow-md animate-bounce">
                            {groupUnreadTotal}
                          </span>
                        )}
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                            isCollapsed ? '-rotate-90' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {/* Channel Items in this Group */}
                    {!isCollapsed && (
                      <div className="space-y-0.5 px-2">
                        {group.channels.map((ch) => {
                          const isMatch =
                            !sidebarSearch.trim() ||
                            ch.label.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
                            ch.manager.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
                            ch.position.toLowerCase().includes(sidebarSearch.toLowerCase());

                          if (!isMatch) return null;

                          const isSelected = !selectedContact && activeChannel === ch.id;
                          const unread = channelUnreadCounts[ch.id] || 0;

                          return (
                            <button
                              key={ch.id}
                              type="button"
                              onClick={() => handleSelectGeneralOrChannel(ch.id)}
                              className={`w-full p-2.5 rounded-2xl flex items-center gap-3 text-left transition-all cursor-pointer select-none group relative ${
                                isSelected
                                  ? 'bg-gradient-to-r from-emerald-600/90 to-teal-700/90 text-white shadow-md shadow-emerald-500/20 border border-emerald-400'
                                  : 'hover:bg-[#202c33] text-gray-300 border border-transparent'
                              }`}
                            >
                              {/* Department Avatar */}
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-inner ${
                                  isSelected
                                    ? 'bg-black/30 text-emerald-300 border border-emerald-400/40'
                                    : 'bg-[#202c33] text-emerald-400 border border-white/10 group-hover:border-emerald-500/40'
                                }`}
                              >
                                <span>{ch.icon}</span>
                              </div>

                              {/* Info */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <h4
                                    className={`text-xs font-black truncate ${
                                      isSelected ? 'text-white' : 'text-gray-100 group-hover:text-emerald-300'
                                    }`}
                                  >
                                    {ch.label}
                                  </h4>
                                  
                                  {/* Unread Badge */}
                                  {unread > 0 && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse shrink-0">
                                      {unread}
                                    </span>
                                  )}
                                </div>

                                <p
                                  className={`text-[11px] truncate mt-0.5 font-medium ${
                                    isSelected ? 'text-emerald-100' : 'text-gray-400'
                                  }`}
                                >
                                  {ch.manager}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: CHAT CONVERSATION VIEW (Estilo WhatsApp Web)                 */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#0b141a]">
          
          {/* Active Chat Top Header */}
          <div className="px-6 py-3 border-b border-emerald-500/30 flex justify-between items-center bg-[#202c33] shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                {selectedContact ? (
                  <div
                    className={`w-10 h-10 rounded-2xl text-white font-black flex items-center justify-center text-sm uppercase shadow-lg border ${
                      targetPresence?.status === 'ONLINE'
                        ? 'bg-gradient-to-tr from-emerald-600 to-teal-700 border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                        : targetPresence?.status === 'AWAY'
                        ? 'bg-gradient-to-tr from-amber-600 to-yellow-700 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                        : 'bg-gradient-to-tr from-purple-700 to-indigo-800 border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                    }`}
                  >
                    {selectedContact.name.substring(0, 2)}
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                    <span>{activeChannelInfo.icon}</span>
                  </div>
                )}
                
                {/* Header Presence Dot */}
                {selectedContact && targetPresence ? (
                  targetPresence.status === 'ONLINE' ? (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#202c33] shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse" />
                  ) : targetPresence.status === 'AWAY' ? (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-[#202c33] shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
                  ) : (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-purple-400 border-2 border-[#202c33] shadow-[0_0_8px_rgba(168,85,247,0.7)]" />
                  )
                ) : (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#202c33] animate-pulse" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-white leading-tight truncate">
                    {selectedContact ? selectedContact.name : activeChannelInfo.label}
                  </h2>
                  <span
                    className={`text-[9.5px] font-mono font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                      !selectedContact
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : targetPresence?.status === 'ONLINE'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                        : targetPresence?.status === 'AWAY'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                        : 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_8px_rgba(168,85,247,0.15)]'
                    }`}
                  >
                    {selectedContact ? `@${selectedContact.username}` : activeChannelInfo.position}
                  </span>
                </div>
                <div className="text-xs font-medium truncate mt-0.5 flex items-center gap-2">
                  {selectedContact && targetPresence ? (
                    targetPresence.status === 'ONLINE' ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>En línea • Activo en el sistema</span>
                      </span>
                    ) : targetPresence.status === 'AWAY' ? (
                      <span className="text-amber-400 flex items-center gap-1 font-bold">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span>Ausente • Sin actividad reciente</span>
                      </span>
                    ) : (
                      <span className="text-purple-300 flex items-center gap-1 font-medium">
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                        <span>Desconectado • Fuera de línea</span>
                      </span>
                    )
                  ) : (
                    <span className="text-gray-300">
                      Titular: <strong className="text-brand-gold">{activeChannelInfo.manager}</strong> • {activeChannelInfo.desc}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSearch(!showSearch)}
                title="Buscar en mensajes"
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  showSearch
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'text-slate-400 hover:text-white hover:bg-white/10 border-transparent'
                }`}
              >
                <Search className="w-4.5 h-4.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Contraer' : 'Expandir'}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors hidden sm:inline-flex cursor-pointer"
              >
                {isExpanded ? <Minimize2 className="w-4.5 h-4.5" /> : <Maximize2 className="w-4.5 h-4.5" />}
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Bar (Collapsible) */}
          {showSearch && (
            <div className="p-3 bg-[#111b21] border-b border-emerald-500/30 flex items-center gap-2 animate-fadeIn shrink-0">
              <Search className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
              <input
                type="text"
                placeholder={`Buscar en la conversación (texto, remitente o Hoja de Ruta)...`}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="flex-1 bg-transparent text-xs text-white outline-none font-medium placeholder-gray-500"
                autoFocus
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="text-xs font-bold text-slate-400 hover:text-red-400 mr-2 cursor-pointer"
                >
                  Limpiar
                </button>
              )}
            </div>
          )}

          {/* Messages Body with WhatsApp Wallpaper & Bubble Aesthetic */}
          <div
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 relative"
            style={{
              backgroundImage: `
                radial-gradient(circle, rgba(16,185,129,0.06) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(11,20,26,0.98), rgba(11,20,26,0.98))
              `,
              backgroundSize: '20px 20px',
            }}
          >
            {/* Elegant Background Club Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] overflow-hidden select-none">
              <CrestLogo size="xl" className="w-80 h-96 scale-125 grayscale" />
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-slate-400 text-xs font-bold animate-pulse relative z-10">
                Cargando mensajes de la conversación...
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-16 space-y-4 relative z-10 animate-fadeIn">
                <div className="w-20 h-24 p-2 rounded-2xl bg-black/40 border border-brand-gold/40 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(212,175,55,0.3)] animate-pulse">
                  <CrestLogo size="md" className="w-full h-full" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    {searchFilter
                      ? 'No se encontraron mensajes con ese criterio'
                      : selectedContact
                      ? `Chat Directo con ${selectedContact.name}`
                      : `Canal Institucional #${activeChannelInfo.label}`}
                  </h3>
                  <p className="text-xs text-brand-gold font-bold">Club Hípico Los Sargentos</p>
                </div>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  {selectedContact
                    ? `Escribe un mensaje o adjunta expedientes y archivos para coordinar directamente con @${selectedContact.username}.`
                    : 'Inicia la conversación entre departamentos, transfiere archivos o coordina el despacho de Hojas de Ruta.'}
                </p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isMe = isMessageFromMe(msg);
                const senderColor = getSenderColor(msg.senderName);

                return (
                  <div
                    key={msg.id}
                    id={`chat-msg-${msg.id}`}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 group relative`}
                  >
                    <div className="flex items-center gap-1.5 max-w-full">
                      {/* Left Reply Action Button (for my own messages) */}
                      {isMe && (
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingTo(msg);
                            richInputRef.current?.focus();
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-black/50 hover:bg-emerald-600 text-gray-300 hover:text-white transition-all shadow-md cursor-pointer text-xs shrink-0"
                          title="Citar / Responder a este mensaje"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* WhatsApp-styled Message Bubble */}
                      <div
                        className={`p-3.5 space-y-2 shadow-lg relative ${
                          isMe
                            ? 'bg-[#005c4b] text-[#e9edef] rounded-2xl rounded-tr-xs border border-emerald-500/30 shadow-[0_2px_8px_rgba(0,92,75,0.4)]'
                            : 'bg-[#202c33] text-[#e9edef] rounded-2xl rounded-tl-xs border border-slate-700/60 shadow-[0_2px_8px_rgba(32,44,51,0.4)]'
                        }`}
                        style={{ maxWidth: '85vw', width: 'fit-content' }}
                      >
                        {/* Incoming Sender Name Header (WhatsApp Group Style) */}
                        {!isMe && (
                          <div className="flex items-center justify-between gap-2 pb-1 border-b border-white/10 text-[11px]">
                            <span className={`font-black tracking-wide ${senderColor}`}>
                              {msg.senderName}
                            </span>
                            <span className="text-[9.5px] font-bold text-brand-gold uppercase bg-black/30 px-1.5 py-0.5 rounded border border-white/5">
                              {msg.senderArea}
                            </span>
                          </div>
                        )}

                        {/* Quoted Message Header (WhatsApp Reply Block) */}
                        {msg.replyToText && (
                          <div
                            onClick={() => {
                              if (msg.replyToId) {
                                const targetEl = document.getElementById(`chat-msg-${msg.replyToId}`);
                                if (targetEl) {
                                  targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  targetEl.classList.add('animate-pulse');
                                  setTimeout(() => targetEl.classList.remove('animate-pulse'), 1500);
                                }
                              }
                            }}
                            className="p-2 rounded-xl bg-black/30 border-l-4 border-emerald-400 text-left mb-1.5 space-y-0.5 cursor-pointer hover:bg-black/40 transition-colors select-none"
                          >
                            <span className="text-[10.5px] font-black text-emerald-300 flex items-center gap-1 leading-tight">
                              <Reply className="w-3 h-3 text-emerald-400" />
                              <span>{msg.replyToSenderName || 'Mensaje citado'}</span>
                            </span>
                            <span className="text-[11px] text-gray-300 line-clamp-2 leading-tight block">
                              <WhatsAppEmojiText text={msg.replyToText} size="sm" />
                            </span>
                          </div>
                        )}

                        {/* Message text with links and WhatsApp graphical emojis */}
                        {msg.message && (
                          <div className="text-xs sm:text-[13px] font-medium leading-relaxed select-text">
                            <WhatsAppEmojiText text={msg.message} size="md" />
                          </div>
                        )}

                      {/* Attached Image Preview */}
                      {msg.fileUrl && isImageFile(msg.fileType, msg.fileName) && (
                        <div className="rounded-xl overflow-hidden border border-black/20 shadow-sm max-w-sm mt-1">
                          <a
                            href={msg.fileUrl.startsWith('http') ? msg.fileUrl : `http://localhost:5000${msg.fileUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block relative group"
                          >
                            <img
                              src={msg.fileUrl.startsWith('http') ? msg.fileUrl : `http://localhost:5000${msg.fileUrl}`}
                              alt={msg.fileName || 'Imagen adjunta'}
                              className="w-full max-h-60 object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-black gap-1.5">
                              <ExternalLink className="w-4 h-4" />
                              <span>Ver Imagen Completa</span>
                            </div>
                          </a>
                        </div>
                      )}

                      {/* Attached Document File Card (PDF, Excel, etc.) */}
                      {msg.fileUrl && !isImageFile(msg.fileType, msg.fileName) && (
                        <a
                          href={msg.fileUrl.startsWith('http') ? msg.fileUrl : `http://localhost:5000${msg.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all hover:scale-[1.02] ${
                            isMe
                              ? 'bg-black/20 border-white/10 text-white hover:bg-black/30'
                              : 'bg-black/30 border-emerald-500/30 text-white hover:border-emerald-400'
                          }`}
                        >
                          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
                            {getFileIcon(msg.fileType, msg.fileName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block truncate font-bold text-xs">
                              {msg.fileName || 'Archivo adjunto'}
                            </span>
                            {msg.fileSize && (
                              <span className="text-[10px] opacity-80 font-mono block">
                                {formatFileSize(msg.fileSize)}
                              </span>
                            )}
                          </div>
                          <Download className="w-4 h-4 text-brand-gold shrink-0" />
                        </a>
                      )}

                      {/* Attached Route Sheet Badge (Clickable with Expediente View) */}
                      {msg.routeSheetCode && (
                        <button
                          type="button"
                          onClick={() => onSelectRouteSheetByCode && onSelectRouteSheetByCode(msg.routeSheetCode!)}
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl border text-xs font-black transition-all shadow-xs cursor-pointer ${
                            isMe
                              ? 'bg-black/30 border-emerald-400/40 text-emerald-200 hover:bg-black/50'
                              : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/30'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5 text-brand-gold" />
                          <span>Expediente: <strong>{msg.routeSheetCode}</strong></span>
                          <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                      )}

                      {/* WhatsApp Timestamp & Delivery / Read Confirmation Ticks */}
                      <div className="flex justify-end items-center gap-1 text-[10px] text-gray-400 font-mono pt-0.5 select-none">
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          msg.status === 'READ' ? (
                            <span title={`Leído: ${msg.readAt ? new Date(msg.readAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : 'Visto por el destinatario'}`}>
                              <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] ml-0.5 transition-colors duration-300 animate-fadeIn" />
                            </span>
                          ) : msg.status === 'DELIVERED' ? (
                            <span title="Entregado al destinatario (2 palomitas grises)">
                              <CheckCheck className="w-3.5 h-3.5 text-gray-400 ml-0.5" />
                            </span>
                          ) : (
                            <span title="Enviado al servidor (1 palomita gris)">
                              <Check className="w-3.5 h-3.5 text-gray-400 ml-0.5" />
                            </span>
                          )
                        )}
                      </div>
                    </div>

                    {/* Right Reply Action Button (for incoming messages) */}
                    {!isMe && (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(msg);
                          richInputRef.current?.focus();
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-black/50 hover:bg-emerald-600 text-gray-300 hover:text-white transition-all shadow-md cursor-pointer text-xs shrink-0"
                        title="Citar / Responder a este mensaje"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Message Chips - Collapsible Centered 2-Row Responsive Layout */}
          {showQuickMessages && (
            <div className="px-3 py-2.5 bg-[#111b21] border-t border-emerald-500/30 shrink-0 flex flex-col items-center justify-center w-full animate-fadeIn shadow-2xl">
              <div className="w-full flex items-center justify-between pb-1.5 border-b border-white/10 mb-2">
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-brand-gold tracking-wider select-none">
                  <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
                  <span>Respuestas Rápidas Institucionales</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickMessages(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 text-xs transition-colors cursor-pointer"
                  title="Cerrar respuestas rápidas"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 w-full max-w-4xl mx-auto justify-center">
                {PRESET_QUICK_MESSAGES.map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => {
                      if (richInputRef.current) {
                        richInputRef.current.setText(quick);
                      } else {
                        setInputText(quick);
                      }
                      setShowQuickMessages(false);
                    }}
                    className="w-full text-[11px] font-bold py-2 px-2.5 rounded-xl bg-[#202c33] border border-white/10 text-gray-300 hover:border-emerald-400 hover:text-white hover:bg-[#2a3942] text-center flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer select-none"
                    title={quick}
                  >
                    <span className="truncate">
                      <WhatsAppEmojiText text={quick} size="sm" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* WhatsApp Web Official Full Emoji Picker */}
          {showEmojis && (
            <div className="bg-[#111b21] border-t border-emerald-500/30 p-2 shrink-0 animate-fadeIn relative shadow-2xl flex flex-col items-center">
              <div className="w-full flex justify-between items-center px-3 py-1 border-b border-white/10 mb-1.5">
                <span className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                  <Smile className="w-4 h-4 text-brand-gold" />
                  <span>Emoticonos WhatsApp Web</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowEmojis(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 text-xs transition-colors cursor-pointer"
                  title="Cerrar emoticonos"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="w-full flex justify-center">
                <EmojiPicker
                  theme={Theme.DARK}
                  emojiStyle={EmojiStyle.APPLE}
                  onEmojiClick={(emojiData: EmojiClickData) => {
                    if (richInputRef.current) {
                      richInputRef.current.insertEmoji(emojiData.emoji);
                    } else {
                      setInputText((prev) => prev + emojiData.emoji);
                    }
                  }}
                  searchPlaceHolder="Buscar emoji..."
                  skinTonesDisabled={false}
                  searchDisabled={false}
                  width="100%"
                  height={350}
                  previewConfig={{
                    showPreview: true,
                    defaultEmoji: '1f44d',
                    defaultCaption: 'WhatsApp Web CHLS',
                  }}
                  lazyLoadEmojis={true}
                />
              </div>
            </div>
          )}

          {/* Input Message, File Upload & Attached HR Footer */}
          <div className="p-3.5 bg-[#202c33] border-t border-emerald-500/30 space-y-2.5 shrink-0">
            
            {/* Replying To Quote Banner (WhatsApp Style) */}
            {replyingTo && (
              <div className="flex items-center justify-between p-2.5 bg-[#111b21] border-l-4 border-emerald-400 rounded-xl border border-white/10 shadow-md animate-fadeIn">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Reply className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-black text-emerald-400 block truncate">
                      Respondiendo a {replyingTo.senderName}
                    </span>
                    <span className="text-[11px] text-gray-300 truncate block font-medium">
                      {replyingTo.message ? (
                        <WhatsAppEmojiText text={replyingTo.message} size="sm" />
                      ) : replyingTo.fileName ? (
                        `📎 ${replyingTo.fileName}`
                      ) : (
                        'Archivo adjunto'
                      )}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors ml-2 cursor-pointer shrink-0"
                  title="Cancelar respuesta"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {/* Top Pill Controls: Attached HR & Attached File */}
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              {/* Reference HR input pill */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-400 text-[11px] flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-brand-gold" />
                  <span>Hoja de Ruta (Opcional):</span>
                </span>
                <input
                  type="text"
                  placeholder="Ej. HR-2026-00001"
                  value={attachedHrCode}
                  onChange={(e) => setAttachedHrCode(e.target.value)}
                  className="px-2.5 py-1 bg-black/40 border border-emerald-500/30 rounded-xl text-xs font-mono font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500 w-36 shadow-xs"
                />
                {attachedHrCode && (
                  <button
                    type="button"
                    onClick={() => setAttachedHrCode('')}
                    className="text-slate-400 hover:text-red-500 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Attached File Pill */}
              {attachedFile && (
                <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 px-3 py-1 rounded-xl text-xs font-bold shadow-xs animate-fadeIn">
                  {getFileIcon(attachedFile.type, attachedFile.name)}
                  <span className="truncate max-w-[160px]">{attachedFile.name}</span>
                  <span className="text-[10.5px] text-gray-400 font-mono">({formatFileSize(attachedFile.size)})</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-slate-400 hover:text-red-400 cursor-pointer ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.zip"
            />

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              {/* Emoji Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  setShowEmojis(!showEmojis);
                  if (!showEmojis) setShowQuickMessages(false);
                }}
                title="Emoticonos WhatsApp Web"
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  showEmojis
                    ? 'bg-amber-400 text-slate-950 border-amber-500 scale-105'
                    : 'bg-[#111b21] border-white/10 text-gray-300 hover:border-emerald-500'
                }`}
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Quick Responses Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  setShowQuickMessages(!showQuickMessages);
                  if (!showQuickMessages) setShowEmojis(false);
                }}
                title="Respuestas Rápidas Institucionales"
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                  showQuickMessages
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/25 scale-105 font-bold'
                    : 'bg-[#111b21] border-white/10 text-brand-gold hover:border-brand-gold hover:text-white'
                }`}
              >
                <Sparkles className="w-5 h-5" />
              </button>

              {/* File Attachment Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Adjuntar Archivo / Documento (PDF, Imagen, Excel, etc.)"
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  attachedFile
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/25 scale-105'
                    : 'bg-[#111b21] border-white/10 text-gray-300 hover:border-emerald-500 hover:text-white'
                }`}
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <WhatsAppRichInput
                ref={richInputRef}
                value={inputText}
                onChange={(val) => setInputText(val)}
                onEnterPress={() => handleSendMessage()}
                placeholder={
                  selectedContact
                    ? `Escribir a @${selectedContact.username}... (Enter para enviar)`
                    : `Mensaje para #${activeChannelInfo.label}... (Enter para enviar)`
                }
                disabled={isSending}
              />

              <button
                type="submit"
                disabled={isSending || (!inputText.trim() && !attachedFile)}
                className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-700 hover:from-emerald-400 hover:to-teal-600 text-slate-950 font-black shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Send className="w-5 h-5 text-slate-950" />
              </button>
            </form>

          </div>

        </div>

      </div>
    </div>
  );
};

export default CorrespondenceInternalChatDrawer;
