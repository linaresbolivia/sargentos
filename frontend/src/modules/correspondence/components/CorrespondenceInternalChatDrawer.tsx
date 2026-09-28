import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@store/store';
import { api } from '@config/api';
import { io, Socket } from 'socket.io-client';
import EmojiPicker, { Theme, EmojiStyle, EmojiClickData } from 'emoji-picker-react';
import { CrestLogo } from '@shared/components/CrestLogo';
import { WhatsAppEmojiText } from '@shared/components/WhatsAppEmojiRenderer';
import { WhatsAppRichInput, WhatsAppRichInputHandle } from '@shared/components/WhatsAppRichInput';
import { useTheme } from '@shared/context/ThemeContext';
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
        manager: 'Gerente General',
        position: 'Máxima Autoridad Ejecutiva (1)',
        desc: 'Instrucciones ejecutivas, proveídos y resoluciones',
      },
      {
        id: 'SECRETARIA_GERENCIA',
        label: 'Secretaría de Despacho',
        icon: '📋',
        manager: 'Secretaria de Gerencia',
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
        manager: 'Asesor Legal Principal',
        position: 'Asesoría Legal (1)',
        desc: 'Dictámenes jurídicos, contratos y resoluciones',
      },
      {
        id: 'COORDINACION_COMERCIAL',
        label: 'Coordinación Comercial',
        icon: '🤝',
        manager: 'Coordinador Comercial',
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
        manager: 'Subgerente Financiero',
        position: 'Subgerencia de Operaciones Financieras (1)',
        desc: 'Supervisión financiera, presupuestos y recursos humanos',
      },
      {
        id: 'CONTABILIDAD',
        label: 'Contabilidad & Balances',
        icon: '📊',
        manager: 'Encargado de Contabilidad',
        position: 'Encargado de Contabilidad / Analista (2)',
        desc: 'Estados financieros, conciliaciones y comprobantes contables',
      },
      {
        id: 'RECAUDACIONES_CAJA',
        label: 'Recaudaciones, Caja & Cobranzas',
        icon: '💳',
        manager: 'Analista de Recaudaciones',
        position: 'Recaudaciones / Cajero / Cobranzas (3)',
        desc: 'Cobro de cuotas de socios, pagos en caja y cartera morosa',
      },
      {
        id: 'CONTRATACIONES_COMPRAS',
        label: 'Contrataciones & Adquisiciones',
        icon: '📦',
        manager: 'Responsable de Contrataciones',
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
        manager: 'Subgerente de Atención al Socio',
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
        manager: 'Encargado de Sistemas',
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
        manager: 'Encargado de Comunicación',
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
        manager: 'Jefe de Mantenimiento',
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
        manager: 'Médico Veterinario',
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
  let isLight = false;
  try {
    const themeCtx = useTheme();
    isLight = themeCtx.theme === 'light';
  } catch {
    isLight = typeof document !== 'undefined' && !document.documentElement.classList.contains('dark');
  }

  const currentUsername = useMemo(() => {
    return (
      (currentUser as any)?.username ||
      currentUser?.email?.split('@')[0] ||
      'usuario'
    ).toLowerCase();
  }, [currentUser]);

  // Presence Filter: All contacts displayed by default (tabs removed for clarity)
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

  // Close chat on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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

      if (response.data && response.data.success) {
        if (richInputRef.current) {
          try {
            richInputRef.current.clear();
          } catch {
            // ignore
          }
        }
        setInputText('');
        setAttachedFile(null);
        setReplyingTo(null);
        setShowEmojis(false);
        setShowQuickMessages(false);
        if (fileInputRef.current) fileInputRef.current.value = '';

        const createdMsg = response.data.data;
        if (createdMsg) {
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
      } else {
        toast.error(response.data?.message || 'Error al enviar el mensaje');
      }
    } catch (err: any) {
      console.error('Error enviando mensaje de chat:', err);
      toast.error(err.response?.data?.message || 'Error al enviar mensaje o transferir archivo');
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
      className="fixed inset-0 z-50 overflow-hidden bg-[#0b141a] flex flex-col animate-fadeIn"
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

      {/* Main Container: Dual-Pane Layout */}
      <div className={`w-full h-full flex overflow-hidden ${isLight ? 'bg-[#F0F2F5]' : 'bg-[#0b141a]'}`}>
        
        {/* ========================================================================= */}
        {/* LEFT PANEL: MENU ESTILO CORRESPONDENCIA (PLOMO PETRÓLEO + CABECERA VERDE)  */}
        {/* ========================================================================= */}
        <div className="w-80 sm:w-88 lg:w-96 border-r border-slate-700/60 bg-[#151E28] flex flex-col shrink-0 text-slate-100 shadow-xl">
          
          {/* Cabecera Estilo Menú con Color Institucional (#008744) */}
          <div className="bg-[#008744] text-white px-4 py-3.5 flex items-center justify-between shadow-md border-b border-emerald-700/40 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <MessageSquare className="w-5 h-5 text-white shrink-0" />
              <span className="text-base font-bold tracking-wide truncate">Chat Interno</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-black/25 text-emerald-200 font-bold border border-white/20 tracking-wider">
                CHLS
              </span>
              {/* Botón rápido de cierre en móviles */}
              <button
                type="button"
                onClick={onClose}
                title="Cerrar Chat"
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 md:hidden cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Barra de Búsqueda Rápida */}
          <div className="p-3 bg-[#151E28] border-b border-white/[0.06]">
            <div className="flex items-center gap-2 bg-[#1E293B] px-3 py-2 rounded-xl border border-slate-700/60 focus-within:border-emerald-500">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar contacto, cargo o área..."
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                className="bg-transparent text-xs text-white outline-none w-full placeholder-slate-400 font-medium"
              />
              {sidebarSearch && (
                <button
                  type="button"
                  onClick={() => setSidebarSearch('')}
                  className="text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Lista con Formato del Menú de Correspondencia */}
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col justify-between">
            <div>
              {/* Sección: Canales */}
              <div>
                <div className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400/80">
                  Canales
                </div>

                {/* Sala General CHLS */}
                <button
                  type="button"
                  onClick={() => handleSelectGeneralOrChannel('GENERAL')}
                  className={`w-full flex items-center justify-between px-4 py-3 text-[13px] sm:text-sm transition-all cursor-pointer group border-b border-white/[0.04] ${
                    !selectedContact && activeChannel === 'GENERAL'
                      ? 'bg-[#1E293B] text-white font-bold border-l-4 border-[#00A652] shadow-xs'
                      : 'text-slate-200 hover:text-white hover:bg-white/[0.05] font-medium border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 truncate">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-sm shrink-0">
                      🌐
                    </div>
                    <div className="text-left truncate min-w-0">
                      <div className="truncate font-semibold text-white">Sala General CHLS</div>
                      <div className="text-[11px] text-slate-400 truncate">Anuncios y coordinación</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="font-mono text-[9.5px] px-1.5 py-0.5 rounded font-bold bg-white/10 text-emerald-300 border border-emerald-500/30">
                      PÚBLICO
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </div>
                </button>
              </div>

              {/* Sección: Contactos Oficiales */}
              <div>
                <div className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400/80 flex items-center justify-between">
                  <span>Contactos ({filteredContacts.length})</span>
                  <span className="text-[9.5px] text-emerald-400 font-mono font-normal">
                    {presenceCounts.online} en línea
                  </span>
                </div>

                {filteredContacts.map((contact) => {
                  const isMe = contact.username.toLowerCase() === currentUsername;
                  const isSelected = selectedContact?.id === contact.id;
                  const dmChannel = getDmChannelId(currentUsername, contact.username);
                  const unread = channelUnreadCounts[dmChannel] || channelUnreadCounts[contact.username] || 0;
                  const status = getContactPresence(contact);
                  const isOnline = status === 'ONLINE';
                  const isAway = status === 'AWAY';

                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => handleSelectContact(contact)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-[13px] sm:text-sm transition-all cursor-pointer group border-b border-white/[0.04] ${
                        isSelected
                          ? 'bg-[#1E293B] text-white font-bold border-l-4 border-[#00A652] shadow-xs'
                          : 'text-slate-200 hover:text-white hover:bg-white/[0.05] font-medium border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 truncate">
                        {/* Avatar con Punto de Presencia */}
                        <div className="relative shrink-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase ${
                              isSelected
                                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                                : isOnline
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : isAway
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800 text-slate-300 border border-slate-700/60'
                            }`}
                          >
                            {contact.name.substring(0, 2)}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#151E28] ${
                              isOnline
                                ? 'bg-emerald-400 animate-pulse'
                                : isAway
                                ? 'bg-amber-400'
                                : 'bg-slate-500'
                            }`}
                          />
                        </div>

                        {/* Información de Contacto */}
                        <div className="text-left truncate min-w-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="truncate font-semibold text-white">
                              {contact.name}
                            </span>
                            {isMe && <span className="text-[10px] text-brand-gold font-normal shrink-0">(Tú)</span>}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {contact.role?.replace('MODULO_', '') || `@${contact.username}`}
                          </div>
                        </div>
                      </div>

                      {/* Lado Derecho: Contador y Flecha */}
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {unread > 0 ? (
                          <span className="min-w-[19px] h-[19px] px-1.5 rounded-full bg-rose-600 text-white font-mono font-black text-[10px] flex items-center justify-center shadow-xs ring-2 ring-rose-600/30 animate-pulse">
                            {unread}
                          </span>
                        ) : null}
                        <ChevronRight
                          className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
                            isSelected ? 'text-white' : 'text-slate-400 group-hover:text-white'
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: CHAT CONVERSATION VIEW                                       */}
        {/* ========================================================================= */}
        <div className={`flex-1 flex flex-col justify-between overflow-hidden ${isLight ? 'bg-[#F0F2F5]' : 'bg-[#0b141a]'}`}>
          
          {/* Active Chat Top Header */}
          <div className={`px-6 py-3 border-b flex justify-between items-center shrink-0 transition-colors ${
            isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-[#202c33] border-emerald-500/30'
          }`}>
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
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse ${isLight ? 'border-white' : 'border-[#202c33]'}`} />
                  ) : targetPresence.status === 'AWAY' ? (
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 shadow-[0_0_8px_rgba(245,158,11,0.9)] ${isLight ? 'border-white' : 'border-[#202c33]'}`} />
                  ) : (
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-purple-400 border-2 shadow-[0_0_8px_rgba(168,85,247,0.7)] ${isLight ? 'border-white' : 'border-[#202c33]'}`} />
                  )
                ) : (
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 animate-pulse ${isLight ? 'border-white' : 'border-[#202c33]'}`} />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className={`text-base font-black leading-tight truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {selectedContact ? selectedContact.name : activeChannelInfo.label}
                  </h2>
                  <span
                    className={`text-[9.5px] font-mono font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                      isLight
                        ? 'bg-slate-100 text-slate-700 border-slate-300'
                        : !selectedContact
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
                      <span className="text-emerald-600 flex items-center gap-1 font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>En línea • Activo en el sistema</span>
                      </span>
                    ) : targetPresence.status === 'AWAY' ? (
                      <span className="text-amber-600 flex items-center gap-1 font-bold">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>Ausente • Sin actividad reciente</span>
                      </span>
                    ) : (
                      <span className={`flex items-center gap-1 font-medium ${isLight ? 'text-slate-500' : 'text-purple-300'}`}>
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                        <span>Desconectado • Fuera de línea</span>
                      </span>
                    )
                  ) : (
                    <span className={isLight ? 'text-slate-600' : 'text-gray-300'}>
                      Titular: <strong className={isLight ? 'text-emerald-800 font-bold' : 'text-brand-gold'}>{activeChannelInfo.manager}</strong> • {activeChannelInfo.desc}
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
                    ? isLight ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-transparent' : 'text-slate-400 hover:text-white hover:bg-white/10 border-transparent'
                }`}
              >
                <Search className="w-4.5 h-4.5" />
              </button>

              <button
                type="button"
                onClick={onClose}
                title="Cerrar chat y volver (Esc)"
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all font-bold text-xs shadow-xs cursor-pointer group ml-1 ${
                  isLight
                    ? 'bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 hover:border-red-600'
                    : 'bg-red-600/20 hover:bg-red-600 text-red-200 hover:text-white border border-red-500/40 hover:border-red-600'
                }`}
              >
                <X className="w-4.5 h-4.5 group-hover:rotate-90 transition-transform" />
                <span>Cerrar Chat</span>
              </button>
            </div>
          </div>

          {/* Search Bar (Collapsible) */}
          {showSearch && (
            <div className={`p-3 border-b flex items-center gap-2 animate-fadeIn shrink-0 ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#111b21] border-emerald-500/30'
            }`}>
              <Search className={`w-4 h-4 shrink-0 ml-2 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
              <input
                type="text"
                placeholder={`Buscar en la conversación (texto, remitente o Hoja de Ruta)...`}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className={`flex-1 bg-transparent text-xs outline-none font-medium ${
                  isLight ? 'text-slate-900 placeholder-slate-400' : 'text-white placeholder-gray-500'
                }`}
                autoFocus
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className={`text-xs font-bold mr-2 cursor-pointer ${
                    isLight ? 'text-slate-500 hover:text-red-600' : 'text-slate-400 hover:text-red-400'
                  }`}
                >
                  Limpiar
                </button>
              )}
            </div>
          )}

          {/* Messages Body - Fondo Liso */}
          <div
            className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 relative ${
              isLight ? 'bg-[#F0F2F5]' : 'bg-[#0b141a]'
            }`}
          >

            {isLoading ? (
              <div className="text-center py-12 text-slate-400 text-xs font-bold animate-pulse relative z-10">
                Cargando mensajes de la conversación...
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-16 space-y-4 relative z-10 animate-fadeIn">
                <div className={`w-20 h-24 p-2 rounded-2xl flex items-center justify-center mx-auto shadow-md animate-pulse ${
                  isLight ? 'bg-white border border-emerald-600/30' : 'bg-black/40 border border-brand-gold/40 shadow-[0_0_25px_rgba(212,175,55,0.3)]'
                }`}>
                  <CrestLogo size="md" className="w-full h-full" />
                </div>
                <div className="space-y-1">
                  <h3 className={`text-sm font-black uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {searchFilter
                      ? 'No se encontraron mensajes con ese criterio'
                      : selectedContact
                      ? `Chat Directo con ${selectedContact.name}`
                      : `Canal Institucional #${activeChannelInfo.label}`}
                  </h3>
                  <p className="text-xs text-brand-gold font-bold">Club Hípico Los Sargentos</p>
                </div>
                <p className={`text-xs max-w-sm mx-auto ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>
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
                          className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all shadow-md cursor-pointer text-xs shrink-0 ${
                            isLight
                              ? 'bg-white hover:bg-emerald-600 text-slate-600 hover:text-white border border-slate-200'
                              : 'bg-black/50 hover:bg-emerald-600 text-gray-300 hover:text-white'
                          }`}
                          title="Citar / Responder a este mensaje"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* WhatsApp-styled Message Bubble */}
                      <div
                        className={`p-3.5 space-y-2 relative shadow-xs ${
                          isMe
                            ? isLight
                              ? 'bg-[#d9fdd3] text-[#111b21] rounded-2xl rounded-tr-xs border border-[#b2ecc0] shadow-xs'
                              : 'bg-[#005c4b] text-[#e9edef] rounded-2xl rounded-tr-xs border border-emerald-500/30 shadow-[0_2px_8px_rgba(0,92,75,0.4)]'
                            : isLight
                            ? 'bg-white text-[#111b21] rounded-2xl rounded-tl-xs border border-slate-200/90 shadow-xs'
                            : 'bg-[#202c33] text-[#e9edef] rounded-2xl rounded-tl-xs border border-slate-700/60 shadow-[0_2px_8px_rgba(32,44,51,0.4)]'
                        }`}
                        style={{ maxWidth: '85vw', width: 'fit-content' }}
                      >
                        {/* Incoming Sender Name Header (WhatsApp Group Style) */}
                        {!isMe && (
                          <div className={`flex items-center justify-between gap-2 pb-1 border-b text-[11px] ${
                            isLight ? 'border-slate-100' : 'border-white/10'
                          }`}>
                            <span className={`font-black tracking-wide ${isLight ? 'text-emerald-800' : senderColor}`}>
                              {msg.senderName}
                            </span>
                            <span className={`text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                              isLight
                                ? 'bg-slate-100 text-emerald-800 border-slate-200'
                                : 'bg-black/30 text-brand-gold border-white/5'
                            }`}>
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
                            className={`p-2 rounded-xl border-l-4 text-left mb-1.5 space-y-0.5 cursor-pointer transition-colors select-none ${
                              isLight
                                ? 'bg-black/[0.04] border-emerald-600 text-slate-800 hover:bg-black/[0.07]'
                                : 'bg-black/30 border-emerald-400 text-gray-300 hover:bg-black/40'
                            }`}
                          >
                            <span className={`text-[10.5px] font-black flex items-center gap-1 leading-tight ${
                              isLight ? 'text-emerald-700' : 'text-emerald-300'
                            }`}>
                              <Reply className="w-3 h-3 text-emerald-500" />
                              <span>{msg.replyToSenderName || 'Mensaje citado'}</span>
                            </span>
                            <span className={`text-[11px] line-clamp-2 leading-tight block ${
                              isLight ? 'text-slate-700' : 'text-gray-300'
                            }`}>
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
                            isLight
                              ? 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100 hover:border-emerald-500'
                              : isMe
                              ? 'bg-black/20 border-white/10 text-white hover:bg-black/30'
                              : 'bg-black/30 border-emerald-500/30 text-white hover:border-emerald-400'
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-300'}`}>
                            {getFileIcon(msg.fileType, msg.fileName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block truncate font-bold text-xs">
                              {msg.fileName || 'Archivo adjunto'}
                            </span>
                            {msg.fileSize && (
                              <span className={`text-[10px] font-mono block ${isLight ? 'text-slate-500' : 'opacity-80'}`}>
                                {formatFileSize(msg.fileSize)}
                              </span>
                            )}
                          </div>
                          <Download className={`w-4 h-4 shrink-0 ${isLight ? 'text-emerald-700' : 'text-brand-gold'}`} />
                        </a>
                      )}

                      {/* Attached Route Sheet Badge (Clickable with Expediente View) */}
                      {msg.routeSheetCode && (
                        <button
                          type="button"
                          onClick={() => onSelectRouteSheetByCode && onSelectRouteSheetByCode(msg.routeSheetCode!)}
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl border text-xs font-black transition-all shadow-xs cursor-pointer ${
                            isLight
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                              : isMe
                              ? 'bg-black/30 border-emerald-400/40 text-emerald-200 hover:bg-black/50'
                              : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/30'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Expediente: <strong>{msg.routeSheetCode}</strong></span>
                          <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                      )}

                      {/* WhatsApp Timestamp & Delivery / Read Confirmation Ticks */}
                      <div className={`flex justify-end items-center gap-1 text-[10px] font-mono pt-0.5 select-none ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>
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
                              <CheckCheck className={`w-3.5 h-3.5 ml-0.5 ${isLight ? 'text-slate-400' : 'text-gray-400'}`} />
                            </span>
                          ) : (
                            <span title="Enviado al servidor (1 palomita gris)">
                              <Check className={`w-3.5 h-3.5 ml-0.5 ${isLight ? 'text-slate-400' : 'text-gray-400'}`} />
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
                        className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all shadow-md cursor-pointer text-xs shrink-0 ${
                          isLight
                            ? 'bg-white hover:bg-emerald-600 text-slate-600 hover:text-white border border-slate-200'
                            : 'bg-black/50 hover:bg-emerald-600 text-gray-300 hover:text-white'
                        }`}
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
            <div className={`px-3 py-2.5 border-t shrink-0 flex flex-col items-center justify-center w-full animate-fadeIn shadow-xl ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#111b21] border-emerald-500/30 shadow-2xl'
            }`}>
              <div className={`w-full flex items-center justify-between pb-1.5 border-b mb-2 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-brand-gold tracking-wider select-none">
                  <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
                  <span>Respuestas Rápidas Institucionales</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickMessages(false)}
                  className={`p-1 rounded-lg text-xs transition-colors cursor-pointer ${
                    isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
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
                    className={`w-full text-[11px] font-bold py-2 px-2.5 rounded-xl border text-center flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer select-none ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-800 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                        : 'bg-[#202c33] border-white/10 text-gray-300 hover:border-emerald-400 hover:text-white hover:bg-[#2a3942]'
                    }`}
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
            <div className={`border-t p-2 shrink-0 animate-fadeIn relative shadow-xl flex flex-col items-center ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#111b21] border-emerald-500/30 shadow-2xl'
            }`}>
              <div className={`w-full flex justify-between items-center px-3 py-1 border-b mb-1.5 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                  <Smile className="w-4 h-4 text-brand-gold" />
                  <span>Emoticonos WhatsApp Web</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowEmojis(false)}
                  className={`p-1 rounded-lg text-xs transition-colors cursor-pointer ${
                    isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                  title="Cerrar emoticonos"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="w-full flex justify-center">
                <EmojiPicker
                  theme={isLight ? Theme.LIGHT : Theme.DARK}
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
          <div className={`p-3.5 border-t space-y-2.5 shrink-0 ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#202c33] border-emerald-500/30'
          }`}>
            
            {/* Replying To Quote Banner (WhatsApp Style) */}
            {replyingTo && (
              <div className={`flex items-center justify-between p-2.5 border-l-4 border-emerald-500 rounded-xl border shadow-sm animate-fadeIn ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#111b21] border-white/10'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Reply className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <span className={`text-xs font-black block truncate ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                      Respondiendo a {replyingTo.senderName}
                    </span>
                    <span className={`text-[11px] truncate block font-medium ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>
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
                  className={`p-1 rounded-lg transition-colors ml-2 cursor-pointer shrink-0 ${
                    isLight ? 'text-slate-500 hover:text-red-600 hover:bg-slate-200' : 'text-gray-400 hover:text-red-400 hover:bg-white/10'
                  }`}
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
                <span className={`font-bold text-[11px] flex items-center gap-1 ${isLight ? 'text-slate-700' : 'text-gray-400'}`}>
                  <FileText className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-700' : 'text-brand-gold'}`} />
                  <span>Hoja de Ruta (Opcional):</span>
                </span>
                <input
                  type="text"
                  placeholder="Ej. 09-001"
                  value={attachedHrCode}
                  onChange={(e) => setAttachedHrCode(e.target.value)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-emerald-500 w-32 shadow-xs border ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-black/40 border-emerald-500/30 text-white'
                  }`}
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
                <div className={`flex items-center gap-2 border px-3 py-1 rounded-xl text-xs font-bold shadow-xs animate-fadeIn ${
                  isLight ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                }`}>
                  {getFileIcon(attachedFile.type, attachedFile.name)}
                  <span className="truncate max-w-[160px]">{attachedFile.name}</span>
                  <span className={`text-[10.5px] font-mono ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>({formatFileSize(attachedFile.size)})</span>
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
                    : isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
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
                    ? 'bg-amber-400 text-slate-950 border-amber-500 font-bold scale-105'
                    : isLight
                    ? 'bg-slate-100 border-slate-200 text-amber-600 hover:bg-slate-200'
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
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md scale-105'
                    : isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
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
                className={isLight ? '!bg-slate-50 !border-slate-300 !text-slate-900 !placeholder-slate-400 focus:!ring-emerald-500 focus:!border-emerald-500' : ''}
              />

              <button
                type="submit"
                disabled={isSending || (!inputText.trim() && !attachedFile)}
                className={`p-2.5 rounded-xl font-black transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shrink-0 ${
                  isLight
                    ? 'bg-[#008744] hover:bg-emerald-600 text-white shadow-md'
                    : 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-700 hover:from-emerald-400 hover:to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/25'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>

          </div>

        </div>

      </div>
    </div>
  );
};

export default CorrespondenceInternalChatDrawer;
