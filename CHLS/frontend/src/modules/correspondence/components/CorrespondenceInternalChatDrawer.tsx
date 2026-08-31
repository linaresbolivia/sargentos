import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@store/store';
import { api } from '@config/api';
import { io, Socket } from 'socket.io-client';
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

const EMOJI_PICKER_QUICK = ['👍', '📑', '💰', '⚠️', '✅', '🚀', '⚖️', '🐴', '✍️', '👀', '📌', '🤝'];

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
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      const currentUName = (
        (user as any)?.username ||
        user?.email?.split('@')[0] ||
        ''
      ).toLowerCase();

      const isMe =
        (user?.id && user.id === newMsg.senderUserId) ||
        (currentUName && currentUName === newMsg.senderUserId?.toLowerCase()) ||
        (currentUName && currentUName === newMsg.senderName?.toLowerCase()) ||
        (user?.email && user.email.toLowerCase().startsWith(newMsg.senderUserId?.toLowerCase()));

      // Check if message belongs to current channel or DM
      if (newMsg.channel === activeChannel || activeChannel === 'ALL') {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
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
        setMessages((prev) =>
          prev.map((m) => {
            if (m.senderUserId !== data.readerUserId) {
              return { ...m, status: 'READ', readAt: data.readAt };
            }
            return m;
          })
        );
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

      // 2. Send message
      const effectiveArea =
        (currentUser as any)?.area ||
        (currentUser as any)?.department ||
        'CHLS';

      const response = await api.post('/correspondence/chat/messages', {
        channel: activeChannel,
        message: inputText.trim(),
        routeSheetCode: attachedHrCode.trim() || null,
        senderArea: effectiveArea,
        fileUrl,
        fileName,
        fileType,
        fileSize,
      });

      if (response.data.success) {
        setInputText('');
        setAttachedFile(null);
        setShowEmojis(false);
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

  // Calculate presence statistics across all contacts
  const presenceCounts = useMemo(() => {
    let online = 0;
    let away = 0;
    let offline = 0;

    contacts.forEach((c) => {
      const isMe = c.username.toLowerCase() === currentUsername;
      const p = presenceMap[c.username.toLowerCase()];
      const status: UserPresenceStatus = isMe ? 'ONLINE' : (p?.status || 'OFFLINE');

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
  }, [contacts, presenceMap, currentUsername]);

  // Filter and sort contacts by most recent message, search query AND selected presence status
  const filteredContacts = useMemo(() => {
    return contacts
      .filter((c) => {
        const isMe = c.username.toLowerCase() === currentUsername;
        const p = presenceMap[c.username.toLowerCase()];
        const status: UserPresenceStatus = isMe ? 'ONLINE' : (p?.status || 'OFFLINE');

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
  }, [contacts, presenceMap, currentUsername, presenceFilter, sidebarSearch]);

  // Target contact's real-time presence
  const targetPresence = selectedContact
    ? (selectedContact.username.toLowerCase() === currentUsername
        ? { status: 'ONLINE' as UserPresenceStatus, lastSeen: new Date().toISOString() }
        : (presenceMap[selectedContact.username.toLowerCase()] || { status: 'OFFLINE' as UserPresenceStatus, lastSeen: '' }))
    : null;

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
          
          {/* Sidebar Top Header */}
          <div className="p-3.5 border-b border-emerald-500/25 bg-[#202c33] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#128C7E] to-[#25D366] text-slate-950 flex items-center justify-center font-black text-base shadow-[0_0_15px_rgba(37,211,102,0.5)]">
                💬
              </div>
              <div>
                <h3 className="font-black text-white text-sm leading-tight flex items-center gap-1.5">
                  <span>Chat Interno CHLS</span>
                </h3>
                <span className="text-[10.5px] font-bold text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Conectado como @{currentUsername}</span>
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
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
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
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'bg-[#202c33] text-emerald-400 hover:bg-emerald-500/20'
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
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'bg-[#202c33] text-amber-400 hover:bg-amber-500/20'
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
                    ? 'bg-slate-500 text-white shadow-xs'
                    : 'bg-[#202c33] text-gray-400 hover:text-gray-200'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-gray-500" />
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

                const presence = presenceMap[contact.username.toLowerCase()];
                const status: UserPresenceStatus = isMe ? 'ONLINE' : (presence?.status || 'OFFLINE');

                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => handleSelectContact(contact)}
                    className={`w-full p-2.5 rounded-2xl flex items-center gap-3 text-left transition-all cursor-pointer select-none group relative ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-600/90 to-teal-700/90 text-white shadow-md shadow-emerald-500/20 border border-emerald-400'
                        : 'hover:bg-[#202c33] text-gray-300 border border-transparent'
                    }`}
                  >
                    {/* User Avatar with Initials & Dynamic Presence Status Dot */}
                    <div className="relative shrink-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-inner uppercase ${
                          isSelected
                            ? 'bg-black/30 text-emerald-300 border border-emerald-400/40'
                            : 'bg-gradient-to-br from-[#1b3829] to-[#0c1f15] text-emerald-400 border border-emerald-500/30 group-hover:border-emerald-400'
                        }`}
                      >
                        {contact.name.substring(0, 2)}
                      </div>

                      {/* Presence Status Dot */}
                      {status === 'ONLINE' ? (
                        <span
                          title="En línea (Activo)"
                          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#111b21] shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse"
                        />
                      ) : status === 'AWAY' ? (
                        <span
                          title="Ausente (Inactivo)"
                          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-[#111b21] shadow-[0_0_8px_rgba(245,158,11,0.9)]"
                        />
                      ) : (
                        <span
                          title="Desconectado"
                          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-gray-500 border-2 border-[#111b21] opacity-75"
                        />
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={`text-xs font-black truncate ${
                            isSelected ? 'text-white' : 'text-gray-100 group-hover:text-emerald-300'
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
                            className={`text-[11px] truncate font-medium max-w-[150px] ${
                              isSelected ? 'text-emerald-100' : 'text-gray-400 group-hover:text-gray-300'
                            }`}
                          >
                            <span className="text-emerald-400 font-mono text-[10px] mr-1">@{contact.username}:</span>
                            <span>{contact.lastMessage}</span>
                          </p>
                        ) : (
                          <span className={`text-[11px] font-mono truncate ${isSelected ? 'text-emerald-100' : 'text-emerald-400'}`}>
                            @{contact.username}
                          </span>
                        )}

                        {/* Status Label Pill */}
                        {status === 'ONLINE' ? (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase shrink-0">
                            En línea
                          </span>
                        ) : status === 'AWAY' ? (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase shrink-0">
                            Ausente
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-gray-400 uppercase truncate max-w-[80px] shrink-0">
                            {contact.role.replace('MODULO_', '')}
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
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white font-black flex items-center justify-center text-sm uppercase shadow-[0_0_15px_rgba(16,185,129,0.4)]">
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
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#202c33] shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse" />
                  ) : targetPresence.status === 'AWAY' ? (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-[#202c33] shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
                  ) : (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-gray-500 border-2 border-[#202c33] opacity-75" />
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
                  <span className="text-[9.5px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
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
                      <span className="text-gray-400 flex items-center gap-1 font-medium">
                        <span className="w-2 h-2 rounded-full bg-gray-500" />
                        <span>Desconectado</span>
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
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5"
            style={{
              backgroundImage: `
                radial-gradient(circle, rgba(16,185,129,0.06) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(11,20,26,0.98), rgba(11,20,26,0.98))
              `,
              backgroundSize: '20px 20px',
            }}
          >
            {isLoading ? (
              <div className="text-center py-12 text-slate-400 text-xs font-bold animate-pulse">
                Cargando mensajes de la conversación...
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-white">
                  {searchFilter
                    ? 'No se encontraron mensajes con ese criterio'
                    : selectedContact
                    ? `Inicia la conversación directa con ${selectedContact.name}`
                    : `No hay mensajes aún en #${activeChannelInfo.label}`}
                </h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  {selectedContact
                    ? `Escribe un mensaje o adjunta expedientes y archivos para coordinar directamente con @${selectedContact.username}.`
                    : 'Inicia la conversación entre departamentos, transfiere archivos o coordina el despacho de Hojas de Ruta.'}
                </p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isMe =
                  currentUser?.id === msg.senderUserId ||
                  currentUsername === msg.senderUserId?.toLowerCase() ||
                  currentUsername === msg.senderName?.toLowerCase() ||
                  (currentUser?.email && currentUser.email.toLowerCase().startsWith(msg.senderUserId?.toLowerCase()));
                const senderColor = getSenderColor(msg.senderName);

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    {/* WhatsApp-styled Message Bubble */}
                    <div
                      className={`max-w-[88%] sm:max-w-[75%] p-3.5 space-y-2 shadow-lg relative ${
                        isMe
                          ? 'bg-[#005c4b] text-[#e9edef] rounded-2xl rounded-tr-xs border border-emerald-500/30 shadow-[0_2px_8px_rgba(0,92,75,0.4)]'
                          : 'bg-[#202c33] text-[#e9edef] rounded-2xl rounded-tl-xs border border-slate-700/60 shadow-[0_2px_8px_rgba(32,44,51,0.4)]'
                      }`}
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

                      {/* Message text with links and emojis */}
                      {msg.message && (
                        <p className="text-xs sm:text-[13px] font-medium whitespace-pre-wrap leading-relaxed select-text">
                          {msg.message}
                        </p>
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
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Message Chips */}
          <div className="px-4 py-2 bg-[#111b21] border-t border-emerald-500/20 shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              <span className="text-[10px] font-black uppercase text-brand-gold shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-brand-gold" />
                <span>Rápidas:</span>
              </span>
              {PRESET_QUICK_MESSAGES.map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setInputText(quick)}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-[#202c33] border border-white/10 text-gray-300 hover:border-emerald-400 hover:text-white whitespace-nowrap transition-all shadow-xs cursor-pointer select-none"
                >
                  {quick}
                </button>
              ))}
            </div>
          </div>

          {/* Emojis Selector (Collapsible) */}
          {showEmojis && (
            <div className="px-5 py-2 bg-[#111b21] border-t border-emerald-500/20 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0 animate-fadeIn">
              {EMOJI_PICKER_QUICK.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setInputText((prev) => prev + emoji)}
                  className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Input Message, File Upload & Attached HR Footer */}
          <div className="p-3.5 bg-[#202c33] border-t border-emerald-500/30 space-y-2.5 shrink-0">
            
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
                onClick={() => setShowEmojis(!showEmojis)}
                title="Emojis rápidos"
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  showEmojis
                    ? 'bg-amber-400 text-slate-950 border-amber-500 scale-105'
                    : 'bg-[#111b21] border-white/10 text-gray-300 hover:border-emerald-500'
                }`}
              >
                <Smile className="w-5 h-5" />
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

              <input
                type="text"
                placeholder={
                  selectedContact
                    ? `Escribir mensaje privado para ${selectedContact.name}... (Enter para enviar)`
                    : `Mensaje para #${activeChannelInfo.label}... (Enter para enviar)`
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-[#111b21] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-medium outline-none focus:border-emerald-500 shadow-xs"
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
