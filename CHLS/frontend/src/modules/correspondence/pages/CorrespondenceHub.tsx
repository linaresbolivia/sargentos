import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@store/store';
import {
  fetchRouteSheets,
  fetchCorrespondenceStats,
  fetchWorkflowSettings,
  updateWorkflowLocal,
  setActiveFilter,
  setActiveMailbox,
  setSelectedGestion,
  setSearchQuery,
  setSelectedItem,
  handleRealtimeCreated,
  handleRealtimeUpdated,
} from '@store/correspondenceSlice';
import { RouteSheetItem } from '../types/correspondence.types';
import { NewRouteSheetModal } from '../components/NewRouteSheetModal';
import { RouteSheetDetailModal } from '../components/RouteSheetDetailModal';
import { PrintableRouteSheet } from '../components/PrintableRouteSheet';
import { CorrespondenceConfigModal } from '../components/CorrespondenceConfigModal';
import { CorrespondenceInternalChatDrawer } from '../components/CorrespondenceInternalChatDrawer';
import { CorrespondenceReportExportModal } from '../components/CorrespondenceReportExportModal';
import { ChlsWorkflowCanvasModal } from '../components/ChlsWorkflowCanvasModal';
import { RouteSheetAttachmentsModal } from '../components/RouteSheetAttachmentsModal';
import { RouteSheetLocatorModal } from '../components/RouteSheetLocatorModal';
import { EcoMetricsNormativeModal, EcoMetricType } from '../components/EcoMetricsNormativeModal';
import toast from 'react-hot-toast';
import {
  Search,
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  User,
  Printer,
  Sparkles,
  Leaf,
  Filter,
  ArrowRight,
  TrendingUp,
  Droplet,
  Wind,
  Layers,
  ChevronRight,
  Settings,
  Receipt,
  MessageSquare,
  Inbox,
  Send as SendIcon,
  FolderArchive,
  Compass,
  MapPin,
  FileSpreadsheet,
  Calendar,
  Eye,
  EyeOff,
  CheckCheck,
  Mail,
  MailOpen,
  GitBranch,
  Table,
  LayoutGrid,
  ArrowUpDown,
  Hash,
  Paperclip,
  Info,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import CrestLogo from '@shared/components/CrestLogo';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import BackButton from '@shared/components/BackButton';
import { GatehouseInvoiceReceiptModal } from '../../gatehouse/components/GatehouseInvoiceReceiptModal';
import io from 'socket.io-client';

import { DEFAULT_ORGANIGRAM_NODES, isSameArea, getOrganigramNodeForUser } from '../utils/organigramWorkflowService';

// Generar lista de despachos oficiales a partir del Organigrama Institucional CHLS
const OFFICIAL_DEPARTMENTS = DEFAULT_ORGANIGRAM_NODES.map((node) => ({
  id: node.title,
  label: node.title,
  subtitle: node.manager || node.subtitle,
}));

export const CorrespondenceHub: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();
  const urlCode = searchParams.get('code');

  const { items, stats, isLoading, activeMailbox, searchQuery, selectedItem, selectedGestion, workflow } = useSelector(
    (state: RootState) => state.correspondence
  );
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Despachos oficiales sincronizados en tiempo real con el Organigrama & Workflow Canvas 360°
  const officialDepartments = useMemo(() => {
    const activeNodes = workflow?.nodes && workflow.nodes.length > 0 ? workflow.nodes : DEFAULT_ORGANIGRAM_NODES;
    return activeNodes.map((node) => ({
      id: node.title,
      label: node.title,
      subtitle: node.manager || node.subtitle,
    }));
  }, [workflow]);

  const defaultPerspective = useMemo(() => {
    const userNode = getOrganigramNodeForUser(currentUser, workflow);
    return userNode?.title || officialDepartments[0]?.id || 'GERENCIA GENERAL';
  }, [currentUser, workflow, officialDepartments]);

  const [currentPerspective, setCurrentPerspective] = useState<string>(() => defaultPerspective);

  useEffect(() => {
    if (defaultPerspective) {
      setCurrentPerspective(defaultPerspective);
    }
  }, [defaultPerspective]);

  const [slaFilter, setSlaFilter] = useState<'ALL' | 'OVERDUE' | 'WARNING' | 'ON_TIME'>('ALL');
  const [readFilter, setReadFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [channelUnreadCounts, setChannelUnreadCounts] = useState<Record<string, number>>({});
  const [printableItem, setPrintableItem] = useState<RouteSheetItem | null>(null);
  const [attachmentsModalItem, setAttachmentsModalItem] = useState<RouteSheetItem | null>(null);
  const [activeEcoMetric, setActiveEcoMetric] = useState<EcoMetricType | null>(null);
  const [isLocatorModalOpen, setIsLocatorModalOpen] = useState(false);
  const [locatorInitialArea, setLocatorInitialArea] = useState<string | undefined>(undefined);

  // Storage key for user-specific read/opened items
  const storageUserKey = currentUser?.id || (currentUser as any)?.username || 'user';
  const STORAGE_KEY_READ_ITEMS = `chls_corr_read_${storageUserKey}`;

  const [readItemsMap, setReadItemsMap] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`chls_corr_read_${storageUserKey}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const markItemAsRead = (item: RouteSheetItem) => {
    const nowIso = new Date().toISOString();
    setReadItemsMap((prev) => {
      const updated = { ...prev, [item.id]: nowIso, [item.hrCode]: nowIso };
      try {
        localStorage.setItem(STORAGE_KEY_READ_ITEMS, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const toggleItemReadStatus = (item: RouteSheetItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setReadItemsMap((prev) => {
      const isCurrentlyRead = !!(prev[item.id] || prev[item.hrCode]);
      const updated = { ...prev };
      if (isCurrentlyRead) {
        delete updated[item.id];
        delete updated[item.hrCode];
        toast('Marcado como no leído 📩', { icon: '✉️' });
      } else {
        const nowIso = new Date().toISOString();
        updated[item.id] = nowIso;
        updated[item.hrCode] = nowIso;
        toast.success('Marcado como visto / abierto 👁️');
      }
      try {
        localStorage.setItem(STORAGE_KEY_READ_ITEMS, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleOpenItemDetail = (item: RouteSheetItem) => {
    markItemAsRead(item);
    dispatch(setSelectedItem(item));
  };

  const handleSelectRouteSheetByCode = (hrCode: string) => {
    const clean = hrCode.trim().toLowerCase();
    const found = items.find(
      (i) => i.hrCode.toLowerCase() === clean || i.id.toLowerCase() === clean
    );
    if (found) {
      handleOpenItemDetail(found);
    }
  };

  // Auto-open route sheet when scanned via QR code link
  useEffect(() => {
    if (urlCode && items.length > 0) {
      const clean = urlCode.trim().toLowerCase();
      const found = items.find(
        (i) => i.hrCode.toLowerCase() === clean || i.id.toLowerCase() === clean
      );
      if (found) {
        handleOpenItemDetail(found);
      }
    }
  }, [urlCode, items, dispatch]);

  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    dispatch(fetchRouteSheets({ year: selectedGestion === 'ALL' ? undefined : selectedGestion }));
    dispatch(fetchCorrespondenceStats());
    dispatch(fetchWorkflowSettings());

    // Socket.io Realtime Listener
    const socketUrl = import.meta.env.VITE_WS_URL || `http://${window.location.hostname}:5000`;
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socket.on('correspondence:created', (data: RouteSheetItem) => {
      dispatch(handleRealtimeCreated(data));
      dispatch(fetchCorrespondenceStats());
    });

    socket.on('correspondence:updated', (data: any) => {
      dispatch(handleRealtimeUpdated(data));
      dispatch(fetchCorrespondenceStats());
    });

    // Realtime Organigram & Workflow Synchronization
    socket.on('correspondence:workflow:updated', (updatedWf: any) => {
      if (updatedWf && updatedWf.nodes) {
        dispatch(updateWorkflowLocal(updatedWf));
        toast.success('El Organigrama y reglas de derivación se han actualizado en tiempo real', {
          icon: '🧭',
          duration: 4000,
        });
      }
    });

    // Realtime Internal Chat Notification & WhatsApp Global Counter
    socket.on('correspondence:chat:message', (newMsg: any) => {
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

      // If the message was sent by the current user, NEVER show unread bubble or notification
      if (isMe) return;

      setUnreadChatCount((prev) => prev + 1);
      setChannelUnreadCounts((prev) => ({
        ...prev,
        [newMsg.channel || 'GENERAL']: (prev[newMsg.channel || 'GENERAL'] || 0) + 1,
      }));

      // WhatsApp style popup toast
      toast(
        (t) => (
          <div
            onClick={() => {
              setIsChatOpen(true);
              setUnreadChatCount(0);
              toast.dismiss(t.id);
            }}
            className="flex items-start gap-3 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#128C7E] to-[#25D366] text-slate-950 flex items-center justify-center font-black text-sm shrink-0 shadow-[0_0_15px_rgba(37,211,102,0.6)]">
              💬
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-xs text-emerald-400 truncate">
                  {newMsg.senderName} ({newMsg.senderArea})
                </span>
                <span className="text-[10px] text-gray-400 font-mono">Ahora</span>
              </div>
              <p className="text-xs text-white line-clamp-2 mt-0.5 font-medium">
                {newMsg.message || (newMsg.fileName ? `📎 Adjuntó: ${newMsg.fileName}` : 'Nuevo mensaje de coordinación')}
              </p>
              {newMsg.routeSheetCode && (
                <span className="inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                  Expediente: {newMsg.routeSheetCode}
                </span>
              )}
            </div>
          </div>
        ),
        {
          duration: 5000,
          position: 'top-right',
          style: {
            background: '#111b21',
            color: '#fff',
            border: '2px solid rgba(37,211,102,0.6)',
            borderRadius: '18px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          },
        }
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch, selectedGestion]);

  // Compute Mailbox Counts for Active Perspective
  // Compute Mailbox Counts for Active Perspective
  const inboxCount = items.filter(
    (i) => isSameArea(i.currentArea, currentPerspective) && i.status !== 'CONCLUIDO' && i.status !== 'ANULADO'
  ).length;

  const outboxCount = items.filter(
    (i) =>
      i.movements?.some((m) => isSameArea(m.sourceArea, currentPerspective)) &&
      !isSameArea(i.currentArea, currentPerspective) &&
      i.status !== 'CONCLUIDO'
  ).length;

  const copiesCount = items.filter(
    (i) =>
      i.movements?.some(
        (m) =>
          m.instruction?.includes('[C.C.') &&
          isSameArea(m.instruction, currentPerspective)
      )
  ).length;

  const archivedCount = items.filter(
    (i) => i.status === 'CONCLUIDO' || i.status === 'ANULADO' || isSameArea(i.currentArea, 'ARCHIVO_CENTRAL') || !!i.archiveLocation
  ).length;

  const allCount = items.length;

  const MAILBOX_TABS = [
    { id: 'INBOX', label: 'Bandeja de Entrada', icon: Inbox, count: inboxCount, desc: 'En mi despacho / Pendientes' },
    { id: 'OUTBOX', label: 'Bandeja de Salida', icon: SendIcon, count: outboxCount, desc: 'Derivados a otras áreas' },
    { id: 'COPIES', label: 'Copias C.C.', icon: FileText, count: copiesCount, desc: 'Conocimiento e informativas' },
    { id: 'ARCHIVED', label: 'Archivo Central', icon: FolderArchive, count: archivedCount, desc: 'Custodia definitiva' },
    { id: 'ALL', label: 'Vista Global 360°', icon: Compass, count: allCount, desc: 'Supervisión institucional' },
  ];

  // Client-side Filter by Active Mailbox
  const filteredItems = items.filter((item) => {
    // 1. Mailbox Filter
    if (activeMailbox === 'INBOX') {
      if (!isSameArea(item.currentArea, currentPerspective) || item.status === 'CONCLUIDO' || item.status === 'ANULADO') {
        return false;
      }
    } else if (activeMailbox === 'OUTBOX') {
      const hasSentFromMyArea = item.movements?.some((m) => isSameArea(m.sourceArea, currentPerspective));
      if (!hasSentFromMyArea || isSameArea(item.currentArea, currentPerspective) || item.status === 'CONCLUIDO') {
        return false;
      }
    } else if (activeMailbox === 'COPIES') {
      const hasCopy = item.movements?.some(
        (m) =>
          m.instruction?.includes('[C.C.') &&
          isSameArea(m.instruction, currentPerspective)
      );
      if (!hasCopy) return false;
    } else if (activeMailbox === 'ARCHIVED') {
      const isArchived = item.status === 'CONCLUIDO' || item.status === 'ANULADO' || isSameArea(item.currentArea, 'ARCHIVO_CENTRAL') || !!item.archiveLocation;
      if (!isArchived) return false;
    }

    // 2. SLA Filter
    if (slaFilter !== 'ALL') {
      if (slaFilter === 'OVERDUE' && item.slaStatus !== 'OVERDUE' && !item.isOverdue) return false;
      if (slaFilter === 'WARNING' && item.slaStatus !== 'WARNING') return false;
      if (slaFilter === 'ON_TIME' && item.slaStatus !== 'ON_TIME') return false;
    }

    // 3. Filter by Annual Management (Gestión)
    if (selectedGestion !== 'ALL') {
      if (item.year && Number(item.year) !== Number(selectedGestion)) {
        return false;
      }
    }

    // 4. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = item.hrCode.toLowerCase().includes(q);
      const matchRef = item.reference.toLowerCase().includes(q);
      const matchSender = item.senderName.toLowerCase().includes(q);
      const matchCite = item.cite?.toLowerCase().includes(q);
      const matchArea = item.senderArea?.toLowerCase().includes(q) || item.currentArea?.toLowerCase().includes(q);
      const matchArchive = item.archiveLocation?.toLowerCase().includes(q) || item.archiveBox?.toLowerCase().includes(q);
      if (!matchCode && !matchRef && !matchSender && !matchCite && !matchArea && !matchArchive) return false;
    }

    // 5. Read / Opened Status Filter
    if (readFilter !== 'ALL') {
      const isRead = !!(readItemsMap[item.id] || readItemsMap[item.hrCode]);
      if (readFilter === 'UNREAD' && isRead) return false;
      if (readFilter === 'READ' && !isRead) return false;
    }

    return true;
  });

  // Sort by Chronological Arrival Date / Time
  const sortedAndFilteredItems = useMemo(() => {
    const result = [...filteredItems];
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return sortOrder === 'NEWEST' ? dateB - dateA : dateA - dateB;
    });
    return result;
  }, [filteredItems, sortOrder]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECIBIDO':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/40';
      case 'DERIVADO':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40';
      case 'EN_PROCESO':
        return 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/40';
      case 'OBSERVADO':
        return 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/40 animate-pulse';
      case 'CONCLUIDO':
        return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border-emerald-500/40';
      default:
        return 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/40';
    }
  };

  const getSlaBadge = (item: RouteSheetItem) => {
    if (item.status === 'CONCLUIDO') {
      return (
        <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
          ✓ Concluido
        </span>
      );
    }
    if (item.slaStatus === 'OVERDUE' || item.isOverdue) {
      return (
        <span className="text-[10px] font-black text-red-800 dark:text-red-300 bg-red-500/20 px-2.5 py-0.5 rounded-lg border border-red-500/40 animate-pulse flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-red-500" />
          <span>{item.slaLabel || 'SLA Vencido'}</span>
        </span>
      );
    }
    if (item.slaStatus === 'WARNING') {
      return (
        <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-lg border border-amber-500/40 flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-500" />
          <span>{item.slaLabel || 'SLA Por Vencer'}</span>
        </span>
      );
    }
    return (
      <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-lg border border-emerald-500/40 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
        <span>{item.slaLabel || 'En Plazo SLA'}</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#040806] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300 relative overflow-x-hidden">
      
      {/* Background Decorative Auras */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-3.5 border-b border-slate-200/80 dark:border-emerald-500/30 backdrop-blur-md">
        
        {/* Fila Superior: Título Institucional a la izquierda | Usuario Logueado Sutil a la derecha */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 sm:gap-4">
            <BackButton />
            <CrestLogo size="md" className="w-11 h-11 shrink-0" />
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Correspondencia & Hojas de Ruta</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/30">
                  CHLS 360°
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Club Hípico Los Sargentos — Sistema Oficial de Custodia & Gestión Documental
              </p>
            </div>
          </div>

          {/* Sutil Indicador del Usuario Logueado (Zona marcada en cabecera) */}
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-white/70 dark:bg-black/40 border border-slate-200/90 dark:border-emerald-500/20 backdrop-blur-md shadow-xs transition-all hover:border-emerald-500/40 select-none">
            <div className="relative">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-xs uppercase">
                {currentUser?.firstName ? currentUser.firstName.replace(/\b(Ing\.|Lic\.|Dr\.|Dra\.|Arq\.|Abg\.)\s*/gi, '').charAt(0) : currentUser?.email ? currentUser.email.charAt(0) : 'U'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border-2 border-white dark:border-[#040806] animate-pulse" title="Usuario conectado" />
            </div>

            <div className="text-left leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-800 dark:text-gray-200 truncate max-w-[170px]">
                  {currentUser
                    ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`
                        .replace(/\b(Ing\.|Lic\.|Dr\.|Dra\.|Arq\.|Abg\.)\s*/gi, '')
                        .trim() || (currentUser as any).username || currentUser.email?.split('@')[0]
                    : 'Funcionario CHLS'}
                </span>
                <span className="text-[8.5px] font-black px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter">
                  En Línea
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-gray-400 font-medium truncate max-w-[190px] block">
                {(currentUser as any)?.area || (currentUser as any)?.department || (typeof (currentUser?.roles?.[0]) === 'object' ? (currentUser?.roles[0] as any)?.name : (currentUser?.roles?.[0] || currentUser?.email || 'Despacho Institucional'))}
              </span>
            </div>
          </div>
        </div>

        {/* Fila Inferior: Herramientas, Filtros de Despacho, Gestión y Acciones */}
        <div className="flex items-center justify-between gap-2 sm:gap-2.5 flex-wrap pt-0.5">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {/* Department / Perspective Switcher */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-black/50 border border-slate-300 dark:border-emerald-500/30 rounded-2xl px-3 py-1.5 shadow-xs">
              <Building2 className="w-4 h-4 text-brand-gold shrink-0" />
              <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400 hidden sm:inline">Despacho:</span>
              <select
                value={currentPerspective}
                onChange={(e) => setCurrentPerspective(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-900 dark:text-emerald-300 outline-none cursor-pointer"
              >
                {officialDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id} className="bg-slate-900 text-white">
                    {dept.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Annual Management (Gestión) Switcher */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-black/50 border border-slate-300 dark:border-emerald-500/30 rounded-2xl px-3 py-1.5 shadow-xs">
              <Calendar className="w-4 h-4 text-brand-gold shrink-0" />
              <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400 hidden sm:inline">Gestión:</span>
              <select
                value={selectedGestion}
                onChange={(e) => {
                  const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                  dispatch(setSelectedGestion(val));
                }}
                className="bg-transparent text-xs font-black text-slate-900 dark:text-brand-gold outline-none cursor-pointer font-mono"
              >
                <option value={2026} className="bg-slate-900 text-white">Gestión 2026</option>
                <option value={2027} className="bg-slate-900 text-white">Gestión 2027</option>
                <option value={2025} className="bg-slate-900 text-white">Gestión 2025</option>
                <option value={2024} className="bg-slate-900 text-white">Gestión 2024</option>
                <option value="ALL" className="bg-slate-900 text-white">Todas las Gestiones</option>
              </select>
            </div>

            <button
              onClick={() => setIsExportModalOpen(true)}
              title="Exportar Libro Oficial de Registro a Excel (.xlsx) o PDF (.pdf)"
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 text-xs font-black shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span className="hidden lg:inline">Libro de Registro</span>
            </button>

            <button
              onClick={() => setIsWorkflowModalOpen(true)}
              title="Diseñador Visual de Organigrama & Flujos de Derivación (Canvas 360°)"
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-800 dark:text-emerald-300 border-2 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.25)] text-xs font-black transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <GitBranch className="w-4 h-4 text-emerald-500 dark:text-emerald-400 animate-pulse" />
              <span className="hidden xl:inline">Organigrama & Flujos</span>
            </button>

            <button
              onClick={() => {
                setLocatorInitialArea(undefined);
                setIsLocatorModalOpen(true);
              }}
              title="Localizador y Radar de Hojas de Ruta en Tiempo Real (¿Dónde están los expedientes?)"
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-brand-gold/20 to-emerald-500/20 hover:from-emerald-500/30 hover:to-brand-gold/30 text-emerald-900 dark:text-brand-gold border-2 border-brand-gold/50 shadow-[0_0_15px_rgba(204,161,75,0.25)] text-xs font-black transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-brand-gold animate-spin-slow" />
              <span>Ubicar Hojas de Ruta</span>
            </button>

            <button
              onClick={() => setIsInvoiceModalOpen(true)}
              title="Recepción rápida de facturas (Luz, Agua, Gas, etc.)"
              className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold shadow-xs transition-all hover:scale-105 active:scale-95"
            >
              <Receipt className="w-4 h-4 text-emerald-500" />
              <span className="hidden md:inline">Recibir Factura (Caseta)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <ThemeToggle />

            <button
              onClick={() => setIsConfigModalOpen(true)}
              title="Parametrización & Matriz de Derivación"
              className="p-2.5 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white transition-all hover:scale-105 active:scale-95 shadow-sm cursor-pointer"
            >
              <Settings className="w-4 h-4 text-brand-gold" />
            </button>

            <button
              onClick={() => setIsNewModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-brand-gold to-yellow-600 hover:from-yellow-500 hover:to-yellow-600 text-black font-black px-4 sm:px-5 py-2.5 rounded-2xl shadow-lg shadow-brand-gold/25 transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-black" />
              <span>+ Nueva Hoja de Ruta</span>
            </button>

            {/* Chat Interno situado al extremo derecho con Globo Notificador */}
            <button
              onClick={() => {
                setIsChatOpen(true);
                setUnreadChatCount(0);
              }}
              title="Chat Interno & Coordinación entre Áreas CHLS (WhatsApp Style)"
              className="relative flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-900 dark:text-emerald-300 border-2 border-emerald-500/50 text-xs font-black shadow-md shadow-emerald-500/10 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-brand-gold" />
              <span>Chat Interno</span>
              {unreadChatCount > 0 ? (
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-red-600 border border-white text-white shadow-[0_0_12px_rgba(239,68,68,0.9)] animate-bounce">
                  {unreadChatCount}
                </span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 w-full max-w-[1720px] mx-auto p-4 sm:p-6 lg:p-8 space-y-7">
        
        {/* Eco-Metrics Header */}
        <div className="flex items-center gap-2 px-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-black tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
            INICIATIVA CERO PAPEL • CLUB INTELIGENTE
          </span>
          <span className="hidden md:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Certificación Metodológica EPN / ISO 14040
          </span>
        </div>

        {/* Eco-Metrics Bar (Iniciativa Cero Papel - Clic para ver cálculo específico) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          
          {/* 1. Hojas Ahorradas */}
          <div
            onClick={() => setActiveEcoMetric('sheets')}
            className="group relative bg-white/90 dark:bg-gradient-to-br dark:from-[#0d2a1c] dark:via-[#081c12] dark:to-[#030e08] border border-emerald-500/30 dark:border-emerald-500/40 hover:border-emerald-500 dark:hover:border-emerald-400 p-5 rounded-3xl backdrop-blur-xl shadow-[0_0_20px_rgba(16,185,129,0.12)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5),0_0_90px_rgba(16,185,129,0.25)] flex items-center gap-4 transition-all duration-300 hover:scale-[1.03] cursor-pointer"
            title="Haga clic para ver el cálculo y normativa de Hojas Ahorradas"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveEcoMetric('sheets');
              }}
              title="Ver detalle de cálculo y respaldo"
              className="absolute top-3.5 right-3.5 p-1 rounded-full text-slate-400 dark:text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
            >
              <Info className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]">
              <Leaf className="w-7 h-7 text-emerald-500" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">
                Hojas Ahorradas
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                {stats?.ecoMetrics?.totalSheetsSaved ?? 0} <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">hojas</span>
              </span>
            </div>
          </div>

          {/* 2. Árboles Protegidos */}
          <div
            onClick={() => setActiveEcoMetric('trees')}
            className="group relative bg-white/90 dark:bg-gradient-to-br dark:from-[#2a240d] dark:via-[#1c1808] dark:to-[#0e0c03] border border-brand-gold/30 dark:border-brand-gold/40 hover:border-brand-gold dark:hover:border-yellow-400 p-5 rounded-3xl backdrop-blur-xl shadow-[0_0_20px_rgba(234,179,8,0.12)] hover:shadow-[0_0_50px_rgba(234,179,8,0.5),0_0_90px_rgba(234,179,8,0.25)] flex items-center gap-4 transition-all duration-300 hover:scale-[1.03] cursor-pointer"
            title="Haga clic para ver el cálculo y normativa de Árboles Protegidos"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveEcoMetric('trees');
              }}
              title="Ver detalle de cálculo y respaldo"
              className="absolute top-3.5 right-3.5 p-1 rounded-full text-slate-400 dark:text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
            >
              <Info className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-brand-gold/15 text-brand-gold border border-brand-gold/30 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(234,179,8,0.5)]">
              <Sparkles className="w-7 h-7 text-brand-gold" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">
                Árboles Protegidos
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                {typeof stats?.ecoMetrics?.treesSaved === 'number' ? stats.ecoMetrics.treesSaved.toFixed(2) : '0.00'} <span className="text-xs font-bold text-brand-gold">árboles</span>
              </span>
            </div>
          </div>

          {/* 3. Agua Preservada */}
          <div
            onClick={() => setActiveEcoMetric('water')}
            className="group relative bg-white/90 dark:bg-gradient-to-br dark:from-[#0d222a] dark:via-[#08161c] dark:to-[#030a0e] border border-cyan-500/30 dark:border-cyan-500/40 hover:border-cyan-500 dark:hover:border-cyan-400 p-5 rounded-3xl backdrop-blur-xl shadow-[0_0_20px_rgba(6,182,212,0.12)] hover:shadow-[0_0_50px_rgba(6,182,212,0.5),0_0_90px_rgba(6,182,212,0.25)] flex items-center gap-4 transition-all duration-300 hover:scale-[1.03] cursor-pointer"
            title="Haga clic para ver el cálculo y normativa de Agua Preservada"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveEcoMetric('water');
              }}
              title="Ver detalle de cálculo y respaldo"
              className="absolute top-3.5 right-3.5 p-1 rounded-full text-slate-400 dark:text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer"
            >
              <Info className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <Droplet className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">
                Agua Preservada
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                {stats?.ecoMetrics?.waterSavedLiters ?? 0} <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">litros</span>
              </span>
            </div>
          </div>

          {/* 4. CO₂ Evitado */}
          <div
            onClick={() => setActiveEcoMetric('co2')}
            className="group relative bg-white/90 dark:bg-gradient-to-br dark:from-[#250d2a] dark:via-[#18081c] dark:to-[#0c030e] border border-purple-500/30 dark:border-purple-500/40 hover:border-purple-500 dark:hover:border-purple-400 p-5 rounded-3xl backdrop-blur-xl shadow-[0_0_20px_rgba(168,85,247,0.12)] hover:shadow-[0_0_50px_rgba(168,85,247,0.5),0_0_90px_rgba(168,85,247,0.25)] flex items-center gap-4 transition-all duration-300 hover:scale-[1.03] cursor-pointer"
            title="Haga clic para ver el cálculo y normativa de CO₂ Evitado"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveEcoMetric('co2');
              }}
              title="Ver detalle de cálculo y respaldo"
              className="absolute top-3.5 right-3.5 p-1 rounded-full text-slate-400 dark:text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer"
            >
              <Info className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]">
              <Wind className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">
                CO₂ Evitado
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                {typeof stats?.ecoMetrics?.co2SavedKg === 'number' ? stats.ecoMetrics.co2SavedKg.toFixed(2) : '0.00'} <span className="text-xs font-bold text-purple-600 dark:text-purple-400">kg CO₂</span>
              </span>
            </div>
          </div>

        </div>

        {/* Official 5 Mailbox Trays Navigation Bar */}
        <div className="bg-white/90 dark:bg-[#07110c]/90 border-2 border-emerald-500/40 p-4 sm:p-5 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.15)] backdrop-blur-md space-y-4">
          
          {/* Top Row: Search & Tray Summary */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            {/* Search Input & Radar Locator Button */}
            <div className="relative flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-brand-gold" />
                <input
                  type="text"
                  placeholder="Buscar por N° de Hoja de Ruta (ej. 08-193), remitente, CITE, asunto o ubicación de archivo..."
                  value={searchQuery}
                  onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                  spellCheck={true}
                  lang="es-BO"
                  autoCorrect="on"
                  autoCapitalize="sentences"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 dark:border-emerald-500/30 rounded-2xl text-xs sm:text-sm text-slate-950 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold shadow-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setLocatorInitialArea(undefined);
                  setIsLocatorModalOpen(true);
                }}
                title="Abrir Ubicador y Radar 360° para saber dónde están todas las hojas de ruta"
                className="flex items-center gap-1.5 px-4 py-3.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-brand-gold border border-emerald-500/40 text-xs font-black shadow-xs transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
              >
                <Compass className="w-4 h-4 text-brand-gold" />
                <span className="hidden sm:inline">Radar de Ubicación</span>
              </button>
            </div>

            <div className="text-right hidden md:block">
              <span className="text-xs font-bold text-slate-500 dark:text-gray-400 block">
                Mostrando <strong className="text-emerald-700 dark:text-brand-gold font-mono">{filteredItems.length}</strong> trámites en
              </span>
              <span className="text-xs font-black uppercase text-slate-900 dark:text-white">
                {MAILBOX_TABS.find((t) => t.id === activeMailbox)?.label}
              </span>
            </div>
          </div>

          {/* 5 Official Mailbox Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
            {MAILBOX_TABS.map((tab) => {
              const isActive = activeMailbox === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => dispatch(setActiveMailbox(tab.id as any))}
                  className={`p-3 sm:p-3.5 rounded-2xl flex flex-col justify-between text-left transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-gradient-to-br from-emerald-600 to-teal-800 text-white border-emerald-400 shadow-lg shadow-emerald-600/30 scale-[1.02]'
                      : 'bg-slate-100/90 dark:bg-white/5 text-slate-700 dark:text-gray-300 hover:border-emerald-500 border-slate-200 dark:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className={`p-2 rounded-xl ${isActive ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span
                      className={`font-mono text-xs font-black px-2.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white text-slate-950 shadow-xs'
                          : tab.count > 0
                          ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </div>

                  <div>
                    <span className="font-black text-xs sm:text-sm block truncate">
                      {tab.label}
                    </span>
                    <span className={`text-[10px] block truncate font-medium ${isActive ? 'text-emerald-100' : 'text-slate-500 dark:text-gray-400'}`}>
                      {tab.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* SLA Semaphor Quick Filter & View Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/10 flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 mr-2">
                <Clock className="w-4 h-4 text-brand-gold" />
                <span className="font-black text-slate-700 dark:text-gray-300 uppercase text-[11px] tracking-wider">
                  SLA:
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSlaFilter('ALL')}
                className={`px-3 py-1 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                  slaFilter === 'ALL'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 hover:text-slate-900'
                }`}
              >
                Todos ({items.length})
              </button>

              <button
                type="button"
                onClick={() => setSlaFilter('OVERDUE')}
                className={`px-3 py-1 rounded-xl font-black transition-all text-xs cursor-pointer flex items-center gap-1 ${
                  slaFilter === 'OVERDUE'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                    : 'bg-red-500/15 text-red-700 dark:text-red-400 hover:bg-red-500/25 border border-red-500/30'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>🔴 Vencidos ({items.filter((i) => i.slaStatus === 'OVERDUE' || i.isOverdue).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSlaFilter('WARNING')}
                className={`px-3 py-1 rounded-xl font-black transition-all text-xs cursor-pointer flex items-center gap-1 ${
                  slaFilter === 'WARNING'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 border border-amber-500/30'
                }`}
              >
                <span>🟡 Por Vencer ({items.filter((i) => i.slaStatus === 'WARNING').length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSlaFilter('ON_TIME')}
                className={`px-3 py-1 rounded-xl font-black transition-all text-xs cursor-pointer flex items-center gap-1 ${
                  slaFilter === 'ON_TIME'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'
                }`}
              >
                <span>🟢 En Plazo ({items.filter((i) => i.slaStatus === 'ON_TIME').length})</span>
              </button>

              <div className="h-4 w-px bg-slate-300 dark:bg-white/10 mx-1 hidden md:block" />

              {/* Read / Unread Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-black/50 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setReadFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    readFilter === 'ALL'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                      : 'text-slate-600 dark:text-gray-400 hover:text-slate-900'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setReadFilter('UNREAD')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                    readFilter === 'UNREAD'
                      ? 'bg-cyan-500 text-slate-950 shadow-xs font-black'
                      : 'text-cyan-700 dark:text-cyan-400 hover:bg-cyan-500/15'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                  <span>Sin Abrir ({items.filter((i) => !readItemsMap[i.id] && !readItemsMap[i.hrCode]).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReadFilter('READ')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                    readFilter === 'READ'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15'
                  }`}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Vistos ({items.filter((i) => !!(readItemsMap[i.id] || readItemsMap[i.hrCode])).length})</span>
                </button>
              </div>
            </div>

            {/* View Mode (Table / Grid) & Sort Order */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Chronological Arrival Sort Toggle */}
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
                title="Cambiar orden de llegada"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-emerald-500/15 text-slate-800 dark:text-emerald-300 border border-slate-200 dark:border-white/10 font-bold transition-all cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-brand-gold" />
                <span>
                  {sortOrder === 'NEWEST' ? 'Llegada: Más Recientes ↓' : 'Llegada: Más Antiguos ↑'}
                </span>
              </button>

              {/* View Toggle */}
              <div className="flex items-center bg-slate-100 dark:bg-black/60 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setViewMode('TABLE')}
                  title="Vista en Tabla Oficial"
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-black text-xs transition-all cursor-pointer ${
                    viewMode === 'TABLE'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tabla Oficial</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('GRID')}
                  title="Vista en Tarjetas"
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-black text-xs transition-all cursor-pointer ${
                    viewMode === 'GRID'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tarjetas</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Route Sheets Content (Table or Grid) */}
        {isLoading ? (
          <div className="text-center py-24 bg-white/40 dark:bg-black/20 rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
            <Clock className="w-12 h-12 text-brand-gold animate-spin mx-auto mb-3" />
            <p className="text-base font-bold text-slate-600 dark:text-gray-300">Cargando correspondencia oficial...</p>
          </div>
        ) : sortedAndFilteredItems.length === 0 ? (
          <div className="text-center py-24 bg-white/60 dark:bg-black/20 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 space-y-4">
            <FolderArchive className="w-14 h-14 text-slate-300 dark:text-slate-600 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                Bandeja vacía en {MAILBOX_TABS.find((t) => t.id === activeMailbox)?.label}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
                No hay trámites en custodia o registro que coincidan con los criterios actuales.
              </p>
            </div>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-black bg-brand-gold text-black px-6 py-3 rounded-2xl shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Radicar nueva Hoja de Ruta</span>
            </button>
          </div>
        ) : viewMode === 'TABLE' ? (
          /* TABLA OFICIAL EN FILAS Y COLUMNAS ORDENADA POR LLEGADA */
          <div className="bg-white/95 dark:bg-[#07110c]/95 border-2 border-emerald-500/40 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.15)] overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 dark:bg-[#0d2319] border-b-2 border-emerald-500/40 text-slate-700 dark:text-emerald-300 text-[11px] font-black uppercase tracking-wider select-none">
                    <th className="py-4 px-3 text-center w-16">
                      <div className="flex items-center justify-center gap-1">
                        <Hash className="w-3.5 h-3.5 text-brand-gold" />
                        <span>N°</span>
                      </div>
                    </th>
                    <th className="py-4 px-3 text-center w-28 whitespace-nowrap">
                      <span>Lectura</span>
                    </th>
                    <th className="py-4 px-4 w-36 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-brand-gold" />
                        <span>Llegada</span>
                      </div>
                    </th>
                    <th className="py-4 px-4 w-44 whitespace-nowrap">Hoja de Ruta</th>
                    <th className="py-4 px-5 min-w-[210px]">Remitente / Procedencia</th>
                    <th className="py-4 px-5 min-w-[300px]">Asunto & CITE Oficial</th>
                    <th className="py-4 px-4 min-w-[180px]">Custodia Actual</th>
                    <th className="py-4 px-4 w-36 text-center">Estado / SLA</th>
                    <th className="py-4 px-4 w-32 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10 text-xs">
                  {sortedAndFilteredItems.map((item, index) => {
                    const arrivalDate = item.createdAt ? new Date(item.createdAt) : null;
                    const dateStr = arrivalDate ? arrivalDate.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
                    const timeStr = arrivalDate ? arrivalDate.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : '';
                    
                    const arrivalOrderNumber = sortOrder === 'NEWEST' 
                      ? sortedAndFilteredItems.length - index 
                      : index + 1;

                    const isRead = !!(readItemsMap[item.id] || readItemsMap[item.hrCode]);
                    const readTimestamp = readItemsMap[item.id] || readItemsMap[item.hrCode];

                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleOpenItemDetail(item)}
                        className={`group transition-colors cursor-pointer ${
                          !isRead
                            ? 'bg-cyan-500/10 dark:bg-cyan-950/30 hover:bg-cyan-500/15 dark:hover:bg-cyan-950/50 border-l-4 border-l-cyan-500 dark:border-l-cyan-400'
                            : 'hover:bg-emerald-500/10 dark:hover:bg-emerald-950/40'
                        }`}
                      >
                        {/* 1. N° de Orden Correlativo de Llegada */}
                        <td className="py-4 px-3 text-center">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-mono font-black text-xs border shadow-xs ${
                            !isRead
                              ? 'bg-cyan-500/20 text-cyan-900 dark:text-cyan-300 border-cyan-500/40 font-black'
                              : 'bg-slate-200 dark:bg-black/60 text-slate-900 dark:text-brand-gold border-slate-300 dark:border-white/10'
                          }`}>
                            {arrivalOrderNumber}
                          </span>
                        </td>

                        {/* 2. Estado de Lectura / Visto */}
                        <td className="py-4 px-3 text-center whitespace-nowrap" onClick={(e) => toggleItemReadStatus(item, e)}>
                          {!isRead ? (
                            <span
                              title="Trámite nuevo sin abrir - Clic para marcar como visto"
                              className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-cyan-500 text-slate-950 shadow-sm animate-pulse cursor-pointer"
                            >
                              <Mail className="w-3 h-3 text-slate-950" />
                              <span>SIN ABRIR</span>
                            </span>
                          ) : (
                            <span
                              title={`Abierto/Visto: ${readTimestamp ? new Date(readTimestamp).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : 'Registrado'} - Clic para marcar como no leído`}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-gray-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 cursor-pointer"
                            >
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                              <span>VISTO</span>
                            </span>
                          )}
                        </td>

                        {/* 3. Fecha y Hora Exacta de Llegada */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className={`font-mono text-xs ${!isRead ? 'font-black text-slate-950 dark:text-cyan-200' : 'font-bold text-slate-900 dark:text-white'}`}>
                            {dateStr}
                          </div>
                          {timeStr && (
                            <div className="font-mono text-[10.5px] text-slate-500 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-brand-gold" />
                              <span>{timeStr}</span>
                            </div>
                          )}
                        </td>

                        {/* 4. Código Hoja de Ruta & Prioridad */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-xs text-emerald-950 dark:text-emerald-200 bg-emerald-500/25 dark:bg-emerald-950/90 px-3 py-1 rounded-xl border border-emerald-500/50 dark:border-emerald-400/80 shadow-[0_0_12px_rgba(16,185,129,0.25)] tracking-wider">
                              {item.hrCode}
                            </span>
                            {item.priority === 'URGENTE' && (
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" title="Prioridad Urgente" />
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 block mt-1">
                            {item.priority === 'URGENTE' ? '🔴 Urgente' : item.priority === 'ALTA' ? '🟡 Alta' : '🟢 Normal'}
                          </span>
                        </td>

                        {/* 5. Remitente / Procedencia */}
                        <td className="py-4 px-5">
                          <div className={`truncate max-w-[220px] ${!isRead ? 'font-black text-slate-950 dark:text-white' : 'font-bold text-slate-900 dark:text-gray-200'}`}>
                            {item.senderName}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-emerald-300 font-semibold mt-0.5 truncate max-w-[220px]">
                            <Building2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate">{item.senderArea || (item.senderType === 'SOCIO' ? 'Socio Titular' : 'Externo')}</span>
                          </div>
                        </td>

                        {/* 6. Asunto & CITE */}
                        <td className="py-4 px-5">
                          <div className="font-black text-slate-950 dark:text-gray-100 line-clamp-2 uppercase leading-snug group-hover:text-emerald-700 dark:group-hover:text-brand-gold transition-colors">
                            {item.reference}
                          </div>
                          <div className="flex items-center gap-2.5 text-[10.5px] text-emerald-800 dark:text-emerald-400 font-mono font-bold mt-1 flex-wrap">
                            {item.cite && <span className="bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">CITE: {item.cite}</span>}
                            <span>• {item.pageCount || 1} fojas</span>
                            {item.documents && item.documents.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAttachmentsModalItem(item);
                                }}
                                title="Haga clic para ver los documentos digitalizados"
                                className="inline-flex items-center gap-1 text-brand-gold font-bold hover:underline cursor-pointer bg-brand-gold/10 px-2 py-0.5 rounded-md border border-brand-gold/30"
                              >
                                <span>📎 {item.documents.length} adjunto(s)</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 7. Custodia Actual */}
                        <td className="py-4 px-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocatorInitialArea(item.currentArea);
                              setIsLocatorModalOpen(true);
                            }}
                            title={`Ubicar todas las hojas de ruta en ${item.currentArea}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-500/15 dark:bg-black/50 dark:hover:bg-emerald-500/20 border border-slate-200 hover:border-emerald-500 dark:border-emerald-500/30 dark:hover:border-emerald-400 text-xs font-black text-emerald-900 dark:text-brand-gold uppercase truncate max-w-[180px] shadow-2xs transition-all cursor-pointer group"
                          >
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="truncate">{item.currentArea}</span>
                          </button>
                          {item.archiveLocation && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block mt-1 truncate">
                              📁 {item.archiveLocation}
                            </span>
                          )}
                        </td>

                        {/* 8. Estado & Semáforo SLA */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <div className="space-y-1.5">
                            <span className={`inline-block text-[10.5px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow-2xs ${getStatusBadge(item.status)}`}>
                              {item.status}
                            </span>
                            <div>
                              {getSlaBadge(item)}
                            </div>
                          </div>
                        </td>

                        {/* 9. Acciones Rápidas */}
                        <td className="py-4 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenItemDetail(item)}
                              title="Ver Expediente y Trazabilidad 360°"
                              className="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer shadow-2xs hover:scale-105"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Botón Permanente de Archivos Adjuntos */}
                            {(() => {
                              const movDocs = (item.movements || []).flatMap((m) => m.documents || []);
                              const allDocs = [...(item.documents || []), ...movDocs];
                              const docCount = new Set(allDocs.map((d) => d.id || d.fileName)).size;
                              const hasDocs = docCount > 0;

                              return (
                                <button
                                  type="button"
                                  onClick={() => setAttachmentsModalItem(item)}
                                  title={
                                    hasDocs
                                      ? `Ver y descargar ${docCount} archivo(s) adjunto(s) del trámite`
                                      : 'Archivos Adjuntos (0) — Clic para ver o adjuntar'
                                  }
                                  className={`relative p-2 rounded-xl border transition-all cursor-pointer shadow-2xs hover:scale-105 ${
                                    hasDocs
                                      ? 'bg-amber-500/20 hover:bg-amber-500/35 text-amber-900 dark:text-brand-gold border-amber-500/50 ring-2 ring-brand-gold/20'
                                      : 'bg-slate-100 dark:bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 border-slate-200 dark:border-white/10'
                                  }`}
                                >
                                  <Paperclip className="w-4 h-4" />
                                  {hasDocs && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-brand-gold text-slate-950 font-black text-[9.5px] flex items-center justify-center shadow-md border border-slate-950/20">
                                      {docCount}
                                    </span>
                                  )}
                                </button>
                              );
                            })()}
                            <button
                              type="button"
                              onClick={(e) => toggleItemReadStatus(item, e)}
                              title={isRead ? "Marcar como Sin Abrir / No Leído" : "Marcar como Visto"}
                              className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-cyan-500/20 text-slate-600 hover:text-cyan-500 dark:text-gray-300 border border-slate-200 dark:border-white/10 transition-all cursor-pointer shadow-2xs hover:scale-105"
                            >
                              {isRead ? <Mail className="w-4 h-4" /> : <CheckCheck className="w-4 h-4 text-emerald-500" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPrintableItem(item)}
                              title="Imprimir Carátula Oficial"
                              className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-brand-gold/20 text-slate-600 hover:text-brand-gold dark:text-gray-300 border border-slate-200 dark:border-white/10 transition-all cursor-pointer shadow-2xs hover:scale-105"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer de la Tabla */}
            <div className="p-4 bg-slate-50 dark:bg-[#0a1811] border-t-2 border-slate-200 dark:border-emerald-500/30 flex items-center justify-between text-xs text-slate-600 dark:text-gray-400 flex-wrap gap-2">
              <span className="font-bold">
                Total trámites listados: <strong className="text-emerald-700 dark:text-brand-gold font-mono font-black">{sortedAndFilteredItems.length}</strong>
              </span>
              <span className="text-[11px] font-mono text-emerald-800 dark:text-emerald-400 font-black">
                Club Hípico Los Sargentos — Sistema Oficial de Custodia & Gestión Documental
              </span>
            </div>
          </div>
        ) : (
          /* VISTA ALTERNATIVA EN TARJETAS */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
            {sortedAndFilteredItems.map((item) => {
              const isRead = !!(readItemsMap[item.id] || readItemsMap[item.hrCode]);
              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenItemDetail(item)}
                  className={`group bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60 dark:bg-gradient-to-br dark:from-[#0d2a1c] dark:via-[#081c12] dark:to-[#030e08] border-2 ${
                    !isRead
                      ? 'border-cyan-400 dark:border-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.3)]'
                      : 'border-emerald-500/50 dark:border-emerald-400/60'
                  } hover:border-emerald-600 dark:hover:border-emerald-300 p-5 rounded-3xl shadow-[0_0_30px_rgba(16,185,129,0.2),0_10px_25px_rgba(0,0,0,0.3)] hover:shadow-[0_0_55px_rgba(16,185,129,0.5),0_0_90px_rgba(16,185,129,0.25)] transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden backdrop-blur-xl hover:scale-[1.02]`}
                >
                  {/* Priority Color Stripe */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      item.priority === 'URGENTE'
                        ? 'bg-gradient-to-r from-red-600 via-rose-500 to-red-600 shadow-[0_0_16px_rgba(239,68,68,0.8)]'
                        : item.priority === 'ALTA'
                        ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.8)]'
                        : 'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.9)]'
                    }`}
                  />

                  <div className="space-y-3.5 pt-1">
                    {/* Top Line: Code, Read Status & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-200 bg-emerald-500/25 dark:bg-emerald-950/90 px-3 py-1 rounded-xl border border-emerald-500/60 dark:border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.35)] tracking-wider">
                          {item.hrCode}
                        </span>
                        {!isRead && (
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" title="Sin Abrir" />
                        )}
                      </div>
                      <span className={`text-[11px] font-black uppercase px-3 py-0.5 rounded-full border shadow-sm ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </div>

                    {/* SLA Indicator */}
                    <div>
                      {getSlaBadge(item)}
                    </div>

                    {/* Reference / Asunto */}
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-slate-950 dark:text-gray-100 line-clamp-2 uppercase leading-snug group-hover:text-emerald-700 dark:group-hover:text-brand-gold transition-colors">
                        {item.reference}
                      </h4>
                      {item.cite && (
                        <span className="text-xs text-emerald-800 dark:text-emerald-300/90 font-mono font-bold block mt-1.5">
                          CITE: {item.cite} • {item.pageCount || 1} fojas
                        </span>
                      )}
                    </div>

                    {/* Sender & Area Info */}
                    <div className="space-y-2 pt-2.5 border-t border-emerald-500/25 dark:border-emerald-500/30 text-xs sm:text-sm">
                      <div className="flex items-center gap-2 text-slate-800 dark:text-gray-200">
                        <User className="w-4 h-4 text-brand-gold shrink-0" />
                        <span className="font-bold truncate">{item.senderName}</span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-600 dark:text-emerald-300/85">
                        <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-xs font-semibold truncate">
                          {item.senderArea || (item.senderType === 'SOCIO' ? 'Socio Titular' : 'Externo')}
                        </span>
                      </div>
                    </div>

                    {/* Archive Location Pill if Archived */}
                    {item.archiveLocation && (
                      <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-[11px] font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                        <FolderArchive className="w-3.5 h-3.5 text-brand-gold shrink-0" />
                        <span className="truncate">Archivo: <strong>{item.archiveLocation}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Bar: Custody Location, Read Status & Quick Print */}
                  <div className="mt-5 pt-3.5 border-t border-emerald-500/25 dark:border-emerald-500/30 flex items-center justify-between text-xs sm:text-sm">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocatorInitialArea(item.currentArea);
                        setIsLocatorModalOpen(true);
                      }}
                      title={`Ubicar hojas de ruta en ${item.currentArea}`}
                      className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-brand-gold cursor-pointer transition-colors group text-left"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="text-slate-500 dark:text-gray-400 font-normal">Custodia:</span>
                      <span className="text-emerald-800 dark:text-brand-gold uppercase truncate max-w-[130px] font-black underline decoration-dotted">
                        {item.currentArea}
                      </span>
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Botón de Adjuntos en Tarjeta */}
                      {(() => {
                        const movDocs = (item.movements || []).flatMap((m) => m.documents || []);
                        const allDocs = [...(item.documents || []), ...movDocs];
                        const docCount = new Set(allDocs.map((d) => d.id || d.fileName)).size;
                        const hasDocs = docCount > 0;

                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAttachmentsModalItem(item);
                            }}
                            title={hasDocs ? `Ver y descargar ${docCount} archivo(s) adjunto(s)` : 'Archivos Adjuntos (0)'}
                            className={`relative p-2 rounded-xl transition-all cursor-pointer ${
                              hasDocs
                                ? 'bg-amber-500/20 hover:bg-amber-500/35 text-amber-900 dark:text-brand-gold border border-amber-500/40'
                                : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-emerald-500'
                            }`}
                          >
                            <Paperclip className="w-4 h-4" />
                            {hasDocs && (
                              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-brand-gold text-slate-950 font-black text-[9px] flex items-center justify-center shadow-xs">
                                {docCount}
                              </span>
                            )}
                          </button>
                        );
                      })()}

                      <button
                        type="button"
                        onClick={(e) => toggleItemReadStatus(item, e)}
                        title={isRead ? "Marcar como Sin Abrir" : "Marcar como Visto"}
                        className="p-2 rounded-xl hover:bg-cyan-500/20 text-slate-500 hover:text-cyan-500 transition-colors cursor-pointer"
                      >
                        {isRead ? <Mail className="w-4 h-4" /> : <CheckCheck className="w-4 h-4 text-emerald-500" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrintableItem(item);
                        }}
                        title="Impresión rápida 1:1"
                        className="p-2 rounded-xl hover:bg-emerald-500/20 text-slate-500 hover:text-emerald-700 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-brand-gold" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Modal New Route Sheet */}
      {isNewModalOpen && (
        <NewRouteSheetModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          defaultOriginArea={currentPerspective}
        />
      )}

      {/* Modal Detail Expediente */}
      {selectedItem && (
        <RouteSheetDetailModal
          isOpen={Boolean(selectedItem)}
          item={selectedItem}
          onClose={() => dispatch(setSelectedItem(null))}
        />
      )}

      {/* Modal Printable Sheet */}
      {printableItem && (
        <PrintableRouteSheet
          item={printableItem}
          onClose={() => setPrintableItem(null)}
        />
      )}

      {/* Modal Archivos Adjuntos & Expediente Digital */}
      {attachmentsModalItem && (
        <RouteSheetAttachmentsModal
          isOpen={!!attachmentsModalItem}
          item={attachmentsModalItem}
          onClose={() => setAttachmentsModalItem(null)}
        />
      )}

      {/* Modal Parametrization & Configuration */}
      {isConfigModalOpen && (
        <CorrespondenceConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
        />
      )}

      {/* Modal Invoice Receipt for Gatehouse */}
      {isInvoiceModalOpen && (
        <GatehouseInvoiceReceiptModal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            dispatch(fetchRouteSheets());
            dispatch(fetchCorrespondenceStats());
          }}
        />
      )}

      {/* Modal Ubicador de Hojas de Ruta & Radar de Custodia 360° */}
      {isLocatorModalOpen && (
        <RouteSheetLocatorModal
          isOpen={isLocatorModalOpen}
          onClose={() => {
            setIsLocatorModalOpen(false);
            setLocatorInitialArea(undefined);
          }}
          items={items}
          workflow={workflow}
          initialArea={locatorInitialArea}
          onSelectItem={(item) => {
            setIsLocatorModalOpen(false);
            handleOpenItemDetail(item);
          }}
        />
      )}

      {/* Floating WhatsApp Style Chat Widget Button */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        <button
          onClick={() => {
            setIsChatOpen(true);
            setUnreadChatCount(0);
          }}
          title="Chat Interno & Coordinación de Despacho (WhatsApp Style)"
          className="relative group p-4 rounded-full bg-gradient-to-tr from-[#128C7E] via-[#25D366] to-emerald-400 hover:from-emerald-400 hover:to-[#25D366] text-slate-950 font-black shadow-[0_0_30px_rgba(37,211,102,0.6)] hover:shadow-[0_0_50px_rgba(37,211,102,0.9)] transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center border-2 border-white/40"
        >
          <MessageSquare className="w-6 h-6 text-slate-950 fill-current" />
          
          {/* Floating WhatsApp Notification Badge / Globe */}
          {unreadChatCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-6 h-6 px-1.5 rounded-full bg-red-600 border-2 border-white text-white font-black text-xs flex items-center justify-center shadow-lg animate-bounce">
              {unreadChatCount}
            </span>
          )}

          {/* Floating tooltip label */}
          <span className="absolute right-full mr-3 px-3 py-1.5 rounded-xl bg-slate-900/95 text-white text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-emerald-500/30">
            💬 Chat Interno de Coordinación
          </span>
        </button>
      </div>

      {/* Internal Chat Drawer / Intercom */}
      {isChatOpen && (
        <CorrespondenceInternalChatDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          onSelectRouteSheetByCode={handleSelectRouteSheetByCode}
          currentRouteSheet={selectedItem}
          channelUnreadCounts={channelUnreadCounts}
          onClearChannelUnread={(chId) => {
            setChannelUnreadCounts((prev) => ({
              ...prev,
              [chId]: 0,
            }));
          }}
        />
      )}

      {/* Export Report / Libro de Registro Modal */}
      {isExportModalOpen && (
        <CorrespondenceReportExportModal
          items={items}
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}

      {/* CHLS Organigram & Workflow Canvas Modal */}
      {isWorkflowModalOpen && (
        <ChlsWorkflowCanvasModal
          isOpen={isWorkflowModalOpen}
          onClose={() => setIsWorkflowModalOpen(false)}
        />
      )}

      {/* Eco Metrics Normative Methodology Modal */}
      {activeEcoMetric && (
        <EcoMetricsNormativeModal
          isOpen={Boolean(activeEcoMetric)}
          selectedMetric={activeEcoMetric}
          onClose={() => setActiveEcoMetric(null)}
          metrics={stats?.ecoMetrics}
        />
      )}
    </div>
  );
};
export default CorrespondenceHub;
