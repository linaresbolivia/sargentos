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
import GenerateCiteModal from '../components/GenerateCiteModal';
import OfficialCitesLedgerModal from '../components/OfficialCitesLedgerModal';
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
  BookOpen,
  FileSignature,
  MessageSquare,
  Inbox,
  Send as SendIcon,
  FolderArchive,
  FolderCheck,
  Landmark,
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
  Lock,
} from 'lucide-react';
import CrestLogo from '@shared/components/CrestLogo';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import BackButton from '@shared/components/BackButton';
import { GatehouseInvoiceReceiptModal } from '../../gatehouse/components/GatehouseInvoiceReceiptModal';
import io from 'socket.io-client';

import { DEFAULT_ORGANIGRAM_NODES, isSameArea, getOrganigramNodeForUser, canUserAccess360 } from '../utils/organigramWorkflowService';

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

  const userNode = useMemo(() => {
    return getOrganigramNodeForUser(currentUser, workflow);
  }, [currentUser, workflow]);

  // Regla CHLS: Solo Gerente General, Tecnología/Sistemas y Secretaría de Gerencia tienen acceso al 360°
  const canAccess360 = useMemo(() => {
    return canUserAccess360(currentUser, userNode);
  }, [currentUser, userNode]);

  const defaultPerspective = useMemo(() => {
    return userNode?.title || officialDepartments[0]?.id || 'GERENCIA GENERAL';
  }, [userNode, officialDepartments]);

  const [currentPerspective, setCurrentPerspective] = useState<string>(() => defaultPerspective);

  useEffect(() => {
    if (defaultPerspective) {
      setCurrentPerspective(defaultPerspective);
    }
  }, [defaultPerspective]);

  // Si el usuario no tiene permisos de 360 y la bandeja activa es ALL, revertir automáticamente a INBOX
  useEffect(() => {
    if (!canAccess360 && activeMailbox === 'ALL') {
      dispatch(setActiveMailbox('INBOX'));
    }
  }, [canAccess360, activeMailbox, dispatch]);

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
  const [isCitesLedgerOpen, setIsCitesLedgerOpen] = useState(false);
  const [isGenerateCiteOpen, setIsGenerateCiteOpen] = useState(false);

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

  // Helper para determinar si un expediente pertenece al Archivo del Cargo del usuario o despacho actual
  const isItemInPersonalArchive = (i: RouteSheetItem) => {
    const isPersonalArchived =
      (i.status === 'CONCLUIDO' || i.currentArea === 'ARCHIVO_PERSONAL' || !!i.archiveLocation) &&
      (i.currentArea === 'ARCHIVO_PERSONAL' || i.archiveLocation?.toUpperCase().includes('PERSONAL') || i.archiveLocation?.toUpperCase().includes('CARGO'));
    if (!isPersonalArchived) return false;

    const uId = currentUser?.id || (currentUser as any)?.userId;
    const matchesUser =
      (uId && (i.archivedById === uId || i.currentAssigneeId === uId)) ||
      i.movements?.some((m) => uId && m.sourceUserId === uId);

    const matchesPerspective =
      isSameArea(i.senderArea, currentPerspective) ||
      isSameArea(i.currentArea, currentPerspective) ||
      i.movements?.some(
        (m) =>
          isSameArea(m.sourceArea, currentPerspective) ||
          isSameArea(m.targetArea, currentPerspective) ||
          (m.targetPersonName && isSameArea(m.targetPersonName, currentPerspective)) ||
          (m.instruction && isSameArea(m.instruction, currentPerspective))
      );

    return matchesUser || matchesPerspective;
  };

  const isItemInCentralArchive = (i: RouteSheetItem) => {
    const isArchived =
      i.status === 'CONCLUIDO' || i.status === 'ANULADO' || isSameArea(i.currentArea, 'ARCHIVO_CENTRAL') || !!i.archiveLocation;
    const isPersonal = i.currentArea === 'ARCHIVO_PERSONAL' || i.archiveLocation?.toUpperCase().includes('PERSONAL') || i.archiveLocation?.toUpperCase().includes('CARGO');
    return isArchived && !isPersonal;
  };

  // 1. Counters for Official Mailbox Trays
  const inboxCount = items.filter(
    (i) =>
      isSameArea(i.currentArea, currentPerspective) &&
      i.status !== 'CONCLUIDO' &&
      i.status !== 'ANULADO'
  ).length;

  const outboxCount = items.filter((i) => {
    if (i.status === 'CONCLUIDO' || i.status === 'ANULADO') return false;
    return i.movements?.some(
      (m) =>
        isSameArea(m.sourceArea, currentPerspective) &&
        !isSameArea(m.targetArea, currentPerspective)
    );
  }).length;

  const copiesCount = items.filter((i) => {
    if (i.status === 'CONCLUIDO' || i.status === 'ANULADO') return false;
    return i.movements?.some((m) => {
      const isCopy = m.instruction?.includes('Copia:') || m.instruction?.includes('C.C.');
      return isCopy && isSameArea(m.targetArea, currentPerspective);
    });
  }).length;

  // Archivo del Cargo: Expedientes concluidos/resguardados bajo la custodia del cargo actual
  const personalArchiveCount = items.filter(isItemInPersonalArchive).length;

  // Archivo Central: Expedientes custodiados formalmente en el Archivo Central del Club
  const centralArchiveCount = items.filter(isItemInCentralArchive).length;

  const allCount = items.length;

  const allMailboxTabs = [
    { id: 'INBOX', label: 'Bandeja de Entrada', icon: Inbox, count: inboxCount, desc: 'En mi despacho / Pendientes' },
    { id: 'OUTBOX', label: 'Bandeja de Salida', icon: SendIcon, count: outboxCount, desc: 'Derivados a otras áreas' },
    { id: 'COPIES', label: 'Copias C.C.', icon: FileText, count: copiesCount, desc: 'Conocimiento e informativas' },
    { id: 'PERSONAL_ARCHIVE', label: 'Archivo del Cargo', icon: FolderCheck, count: personalArchiveCount, desc: 'En custodia del cargo' },
    { id: 'ARCHIVED', label: 'Archivo Central', icon: Landmark, count: centralArchiveCount, desc: 'Custodia institucional del Club' },
    { id: 'ALL', label: 'Vista Global 360°', icon: Compass, count: allCount, desc: 'Supervisión institucional' },
  ];

  // Regla CHLS: Solo Gerente General, Tecnología y Secretaría de Gerencia pueden visualizar la "Vista Global 360°"
  const MAILBOX_TABS = useMemo(() => {
    if (canAccess360) {
      return allMailboxTabs;
    }
    return allMailboxTabs.filter((tab) => tab.id !== 'ALL');
  }, [canAccess360, inboxCount, outboxCount, copiesCount, personalArchiveCount, centralArchiveCount, allCount]);

  // Client-side Filter by Active Mailbox
  const filteredItems = items.filter((item) => {
    // 1. Mailbox Filter (si no tiene acceso a 360 y activeMailbox es ALL, forzar comportamiento de INBOX)
    if (activeMailbox === 'INBOX' || (!canAccess360 && activeMailbox === 'ALL')) {
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
    } else if (activeMailbox === 'PERSONAL_ARCHIVE') {
      if (!isItemInPersonalArchive(item)) return false;
    } else if (activeMailbox === 'ARCHIVED') {
      if (!isItemInCentralArchive(item)) return false;
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
        return 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/25';
      case 'DERIVADO':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25';
      case 'EN_PROCESO':
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25';
      case 'OBSERVADO':
        return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30';
      case 'CONCLUIDO':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
  };

  const getSlaBadge = (item: RouteSheetItem) => {
    if (item.status === 'CONCLUIDO') {
      return (
        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/25 inline-flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span>Concluido</span>
        </span>
      );
    }
    if (item.slaStatus === 'OVERDUE' || item.isOverdue) {
      return (
        <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/25 inline-flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-rose-500" />
          <span>{item.slaLabel || 'SLA Vencido'}</span>
        </span>
      );
    }
    if (item.slaStatus === 'WARNING') {
      return (
        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/25 inline-flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-500" />
          <span>{item.slaLabel || 'SLA Por Vencer'}</span>
        </span>
      );
    }
    return (
      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/25 inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span>{item.slaLabel || 'En Plazo SLA'}</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07130E] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300 relative overflow-x-hidden">
      
      {/* Background Decorative Ambient Lighting - Rich Luxury Emerald & Warm Gold */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-[550px] h-[550px] bg-emerald-600/12 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-[#C5A059]/8 rounded-full blur-[100px]" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-3.5 border-b border-slate-200 dark:border-emerald-900/30 backdrop-blur-md bg-white/80 dark:bg-[#07130E]/85">
        
        {/* Fila Superior: Título Institucional a la izquierda | Usuario Logueado a la derecha */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 sm:gap-4">
            <BackButton />
            <CrestLogo size="md" className="w-11 h-11 shrink-0 filter drop-shadow-[0_0_12px_rgba(16,185,129,0.25)]" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Correspondencia & Hojas de Ruta</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs">
                  CHLS 360°
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-emerald-400/70">
                Club Hípico Los Sargentos — Sistema Oficial de Custodia & Gestión Documental
              </p>
            </div>
          </div>

          {/* Sutil Indicador del Usuario Logueado */}
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#091913] border border-slate-200 dark:border-emerald-800/40 shadow-xs transition-all hover:border-emerald-500/40 select-none">
            <div className="relative">
              <div className="w-7 h-7 rounded-lg bg-emerald-950 text-[#D4AF37] font-bold text-xs flex items-center justify-center border border-emerald-700/50 shadow-xs uppercase">
                {currentUser?.firstName ? currentUser.firstName.replace(/\b(Ing\.|Lic\.|Dr\.|Dra\.|Arq\.|Abg\.)\s*/gi, '').charAt(0) : currentUser?.email ? currentUser.email.charAt(0) : 'U'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-2 border-white dark:border-[#07130E]" title="Usuario conectado" />
            </div>

            <div className="text-left leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                  {currentUser
                    ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`
                        .replace(/\b(Ing\.|Lic\.|Dr\.|Dra\.|Arq\.|Abg\.)\s*/gi, '')
                        .trim() || (currentUser as any).username || currentUser.email?.split('@')[0]
                    : 'Funcionario CHLS'}
                </span>
                <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 uppercase tracking-tighter">
                  En Línea
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-emerald-300/60 font-medium truncate max-w-[190px] block">
                {(currentUser as any)?.area || (currentUser as any)?.department || (typeof (currentUser?.roles?.[0]) === 'object' ? (currentUser?.roles[0] as any)?.name : (currentUser?.roles?.[0] || currentUser?.email || 'Despacho Institucional'))}
              </span>
            </div>
          </div>
        </div>

        {/* Fila Inferior: Herramientas, Filtros de Despacho, Gestión y Acciones */}
        <div className="flex items-center justify-between gap-2 sm:gap-2.5 flex-wrap pt-0.5">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {/* Department / Perspective Switcher */}
            <div className="flex items-center gap-2 bg-white dark:bg-[#091913] border border-slate-200 dark:border-emerald-800/40 rounded-xl px-3 py-1.5 shadow-xs">
              <Building2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">Despacho:</span>
              {canAccess360 ? (
                <select
                  value={currentPerspective}
                  onChange={(e) => setCurrentPerspective(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-900 dark:text-slate-200 outline-none cursor-pointer"
                  title="Cambiar perspectiva de supervisión (Autorizado CHLS 360°)"
                >
                  {officialDepartments.map((dept) => (
                    <option key={dept.id} value={dept.id} className="bg-slate-900 text-white">
                      {dept.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate max-w-[200px]">
                    {currentPerspective}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-emerald-950/60 text-slate-500 dark:text-emerald-400/80 border border-slate-200 dark:border-emerald-800/40 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    Asignado
                  </span>
                </div>
              )}
            </div>

            {/* Annual Management (Gestión) Switcher */}
            <div className="flex items-center gap-2 bg-white dark:bg-[#091913] border border-slate-200 dark:border-emerald-800/40 rounded-xl px-3 py-1.5 shadow-xs">
              <Calendar className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">Gestión:</span>
              <select
                value={selectedGestion}
                onChange={(e) => {
                  const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                  dispatch(setSelectedGestion(val));
                }}
                className="bg-transparent text-xs font-semibold text-slate-900 dark:text-slate-200 outline-none cursor-pointer font-mono"
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
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#091913] hover:bg-emerald-500/10 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-emerald-800/40 hover:border-emerald-500/50 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden lg:inline">Libro de Registro</span>
            </button>

            {/* Libro Oficial de CITEs & Modelos Institucionales (Instructivo JOFHR 022-2026) */}
            <button
              onClick={() => setIsCitesLedgerOpen(true)}
              title="Libro Oficial de Control de CITEs y los 5 Modelos de Documentos Institucionales"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 hover:border-emerald-500 text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
              <span>Libro de CITEs & Modelos</span>
            </button>

            <button
              onClick={() => setIsWorkflowModalOpen(true)}
              title="Diseñador Visual de Organigrama & Flujos de Derivación (Canvas 360°)"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#091913] hover:bg-emerald-500/10 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-emerald-800/40 hover:border-emerald-500/50 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <GitBranch className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden xl:inline">Organigrama & Flujos</span>
            </button>

            <button
              onClick={() => {
                setLocatorInitialArea(undefined);
                setIsLocatorModalOpen(true);
              }}
              title="Localizador y Radar de Hojas de Ruta en Tiempo Real"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#091913] hover:bg-emerald-500/10 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-emerald-800/40 hover:border-emerald-500/50 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Ubicar Hojas de Ruta</span>
            </button>

            <button
              onClick={() => setIsInvoiceModalOpen(true)}
              title="Recepción rápida de facturas (Luz, Agua, Gas, etc.)"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#091913] hover:bg-emerald-500/10 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-emerald-800/40 hover:border-emerald-500/50 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden md:inline">Recibir Factura (Caseta)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <ThemeToggle />

            <button
              onClick={() => setIsConfigModalOpen(true)}
              title="Parametrización & Matriz de Derivación"
              className="p-2 rounded-xl bg-white dark:bg-[#091913] hover:bg-emerald-500/10 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-emerald-800/40 text-slate-700 dark:text-slate-300 transition-all shadow-xs cursor-pointer"
            >
              <Settings className="w-4 h-4 text-emerald-500" />
            </button>

            {/* Botón Generar CITE Oficial */}
            <button
              onClick={() => setIsGenerateCiteOpen(true)}
              title="Generar CITE y redactar nota según los 5 Modelos Oficiales (Instructivo JOFHR 022-2026)"
              className="flex items-center gap-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 hover:border-emerald-400 font-bold px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm shadow-xs transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <FileSignature className="w-4 h-4 text-emerald-400" />
              <span>Generar CITE</span>
            </button>

            {/* Botón Principal: Esmeralda Radiante Institucional */}
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-4 sm:px-5 py-2 rounded-xl shadow-lg shadow-emerald-950/40 border border-emerald-400/30 transition-all hover:scale-[1.02] active:scale-95 text-xs sm:text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white stroke-[2.5]" />
              <span>Nueva Hoja de Ruta</span>
            </button>

            {/* Chat Interno situado al extremo derecho */}
            <button
              onClick={() => {
                setIsChatOpen(true);
                setUnreadChatCount(0);
              }}
              title="Chat Interno & Coordinación entre Áreas CHLS"
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#091913] hover:bg-emerald-500/10 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-emerald-800/40 hover:border-emerald-500/50 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chat Interno</span>
              {unreadChatCount > 0 ? (
                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-600 text-white">
                  {unreadChatCount}
                </span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 w-full max-w-[1720px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Eco-Metrics Header */}
        <div className="flex items-center gap-2 px-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-700 dark:text-emerald-400">
            INICIATIVA CERO PAPEL • CLUB INTELIGENTE
          </span>
          <span className="hidden md:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
            Certificación Metodológica EPN / ISO 14040
          </span>
        </div>

        {/* Eco-Metrics Bar: 4 Tarjetas con Acento Esmeralda */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          
          {/* 1. Hojas Ahorradas */}
          <div
            onClick={() => setActiveEcoMetric('sheets')}
            className="group relative bg-white dark:bg-[#091A14]/90 border border-slate-200 dark:border-emerald-800/40 hover:border-emerald-500/60 p-4.5 rounded-2xl backdrop-blur-md shadow-xs hover:shadow-lg hover:shadow-emerald-950/20 flex items-center gap-3.5 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
            title="Haga clic para ver el cálculo y normativa de Hojas Ahorradas"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveEcoMetric('sheets');
              }}
              title="Ver detalle de cálculo y respaldo"
              className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Leaf className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-emerald-300/70 uppercase tracking-wider block">
                Hojas Ahorradas
              </span>
              <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono">
                {stats?.ecoMetrics?.totalSheetsSaved ?? 0} <span className="text-xs font-semibold text-emerald-500">hojas</span>
              </span>
            </div>
          </div>

          {/* 2. Árboles Protegidos */}
          <div
            onClick={() => setActiveEcoMetric('trees')}
            className="group relative bg-white dark:bg-[#091A14]/90 border border-slate-200 dark:border-emerald-800/40 hover:border-emerald-500/60 p-4.5 rounded-2xl backdrop-blur-md shadow-xs hover:shadow-lg hover:shadow-emerald-950/20 flex items-center gap-3.5 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
            title="Haga clic para ver el cálculo y normativa de Árboles Protegidos"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveEcoMetric('trees');
              }}
              title="Ver detalle de cálculo y respaldo"
              className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-emerald-300/70 uppercase tracking-wider block">
                Árboles Protegidos
              </span>
              <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono">
                {typeof stats?.ecoMetrics?.treesSaved === 'number' ? stats.ecoMetrics.treesSaved.toFixed(2) : '0.00'} <span className="text-xs font-semibold text-amber-500">árboles</span>
              </span>
            </div>
          </div>

          {/* 3. Agua Preservada */}
          <div
            onClick={() => setActiveEcoMetric('water')}
            className="group relative bg-white dark:bg-[#091A14]/90 border border-slate-200 dark:border-emerald-800/40 hover:border-emerald-500/60 p-4.5 rounded-2xl backdrop-blur-md shadow-xs hover:shadow-lg hover:shadow-emerald-950/20 flex items-center gap-3.5 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
            title="Haga clic para ver el cálculo y normativa de Agua Preservada"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveEcoMetric('water');
              }}
              title="Ver detalle de cálculo y respaldo"
              className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:text-sky-500 transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Droplet className="w-5 h-5 text-sky-500" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-emerald-300/70 uppercase tracking-wider block">
                Agua Preservada
              </span>
              <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono">
                {stats?.ecoMetrics?.waterSavedLiters ?? 0} <span className="text-xs font-semibold text-sky-500">litros</span>
              </span>
            </div>
          </div>

          {/* 4. CO₂ Evitado */}
          <div
            onClick={() => setActiveEcoMetric('co2')}
            className="group relative bg-white dark:bg-[#091A14]/90 border border-slate-200 dark:border-emerald-800/40 hover:border-emerald-500/60 p-4.5 rounded-2xl backdrop-blur-md shadow-xs hover:shadow-lg hover:shadow-emerald-950/20 flex items-center gap-3.5 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
            title="Haga clic para ver el cálculo y normativa de CO₂ Evitado"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveEcoMetric('co2');
              }}
              title="Ver detalle de cálculo y respaldo"
              className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Wind className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-emerald-300/70 uppercase tracking-wider block">
                CO₂ Evitado
              </span>
              <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono">
                {typeof stats?.ecoMetrics?.co2SavedKg === 'number' ? stats.ecoMetrics.co2SavedKg.toFixed(2) : '0.00'} <span className="text-xs font-semibold text-indigo-400">kg CO₂</span>
              </span>
            </div>
          </div>

        </div>

        {/* 5 Bandejas Oficiales y Barra de Búsqueda Ejecutiva */}
        <div className="bg-white dark:bg-[#091A14]/80 border border-slate-200 dark:border-emerald-800/40 p-4 sm:p-5 rounded-2xl shadow-xs backdrop-blur-md space-y-4">
          
          {/* Top Row: Search & Tray Summary */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input & Radar Locator Button */}
            <div className="relative flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-emerald-400/60" />
                <input
                  type="text"
                  placeholder="Buscar por N° de Hoja de Ruta, remitente, CITE, asunto o archivo..."
                  value={searchQuery}
                  onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                  spellCheck={true}
                  lang="es-BO"
                  autoCorrect="on"
                  autoCapitalize="sentences"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#06110D] border border-slate-200 dark:border-emerald-800/40 rounded-xl text-xs sm:text-sm text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-emerald-400/40 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all font-medium"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setLocatorInitialArea(undefined);
                  setIsLocatorModalOpen(true);
                }}
                title="Abrir Radar 360° de ubicación de expedientes"
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#071510] hover:bg-emerald-500/10 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-emerald-300 border border-slate-200 dark:border-emerald-800/40 text-xs font-semibold shadow-xs transition-all shrink-0 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden sm:inline">Radar de Ubicación</span>
              </button>
            </div>

            <div className="text-right hidden md:block">
              <span className="text-xs font-medium text-slate-500 dark:text-emerald-300/70 block">
                Mostrando <strong className="text-slate-900 dark:text-emerald-400 font-mono font-bold">{filteredItems.length}</strong> trámites en
              </span>
              <span className="text-xs font-bold uppercase text-slate-800 dark:text-slate-200">
                {MAILBOX_TABS.find((t) => t.id === activeMailbox)?.label || 'Bandeja de Entrada'}
              </span>
            </div>
          </div>

          {/* Official Mailbox Tabs - Luxury Emerald Active Style */}
          <div className={`grid grid-cols-2 sm:grid-cols-3 ${MAILBOX_TABS.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-2.5 pt-1`}>
            {MAILBOX_TABS.map((tab) => {
              const isActive = activeMailbox === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => dispatch(setActiveMailbox(tab.id as any))}
                  className={`p-3 rounded-xl flex flex-col justify-between text-left transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-gradient-to-br from-emerald-800 via-emerald-900 to-[#07130E] text-white border-emerald-500/60 shadow-md shadow-emerald-950/50 ring-1 ring-emerald-400/40'
                      : 'bg-slate-50/80 dark:bg-[#071510]/60 text-slate-600 dark:text-slate-400 hover:bg-emerald-500/10 dark:hover:bg-emerald-950/30 hover:text-slate-900 dark:hover:text-emerald-200 border-slate-200/80 dark:border-emerald-900/20'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-emerald-500/25 text-emerald-300' : 'bg-slate-200/60 dark:bg-[#0B1E17] text-slate-600 dark:text-emerald-400'}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span
                      className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-emerald-400 text-slate-950 shadow-xs'
                          : tab.count > 0
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-100 dark:bg-[#06110D] text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </div>

                  <div>
                    <span className="font-bold text-xs sm:text-sm block truncate">
                      {tab.label}
                    </span>
                    <span className={`text-[10px] block truncate font-medium ${isActive ? 'text-emerald-200' : 'text-slate-400 dark:text-slate-500'}`}>
                      {tab.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* SLA Semaphor Quick Filter & View Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800/80 flex-wrap gap-2.5 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 mr-1">
                <Clock className="w-3.5 h-3.5 text-[#C5A059]" />
                <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[10.5px] tracking-wider">
                  SLA:
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSlaFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all text-xs cursor-pointer ${
                  slaFilter === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-[#071510] text-slate-600 dark:text-emerald-400/80 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todos ({items.length})
              </button>

              <button
                type="button"
                onClick={() => setSlaFilter('OVERDUE')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all text-xs cursor-pointer flex items-center gap-1.5 ${
                  slaFilter === 'OVERDUE'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/25'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>Vencidos ({items.filter((i) => i.slaStatus === 'OVERDUE' || i.isOverdue).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSlaFilter('WARNING')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all text-xs cursor-pointer flex items-center gap-1.5 ${
                  slaFilter === 'WARNING'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/25'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Por Vencer ({items.filter((i) => i.slaStatus === 'WARNING').length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSlaFilter('ON_TIME')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all text-xs cursor-pointer flex items-center gap-1.5 ${
                  slaFilter === 'ON_TIME'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/25'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>En Plazo ({items.filter((i) => i.slaStatus === 'ON_TIME').length})</span>
              </button>

              <div className="h-4 w-px bg-slate-200 dark:border-emerald-800/40 mx-1 hidden md:block" />

              {/* Read / Unread Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#071510] p-0.5 rounded-lg border border-slate-200 dark:border-emerald-800/40">
                <button
                  type="button"
                  onClick={() => setReadFilter('ALL')}
                  className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    readFilter === 'ALL'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 dark:text-emerald-300/70 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setReadFilter('UNREAD')}
                  className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    readFilter === 'UNREAD'
                      ? 'bg-sky-600 text-white shadow-xs font-bold'
                      : 'text-sky-600 dark:text-sky-400 hover:bg-sky-500/10'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  <span>Sin Abrir ({items.filter((i) => !readItemsMap[i.id] && !readItemsMap[i.hrCode]).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReadFilter('READ')}
                  className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    readFilter === 'READ'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-500 dark:text-emerald-300/70 hover:text-white'
                  }`}
                >
                  <CheckCheck className="w-3 h-3 text-emerald-400" />
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
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-[#071510] hover:bg-slate-200 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-emerald-300 border border-slate-200 dark:border-emerald-800/40 font-semibold text-xs transition-all cursor-pointer"
              >
                <ArrowUpDown className="w-3 h-3 text-emerald-400" />
                <span>
                  {sortOrder === 'NEWEST' ? 'Más Recientes ↓' : 'Más Antiguos ↑'}
                </span>
              </button>

              {/* View Toggle */}
              <div className="flex items-center bg-slate-100 dark:bg-[#071510] p-0.5 rounded-lg border border-slate-200 dark:border-emerald-800/40">
                <button
                  type="button"
                  onClick={() => setViewMode('TABLE')}
                  title="Vista en Tabla Oficial"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold text-xs transition-all cursor-pointer ${
                    viewMode === 'TABLE'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 dark:text-emerald-300/70 hover:text-white'
                  }`}
                >
                  <Table className="w-3 h-3" />
                  <span className="hidden sm:inline">Tabla</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('GRID')}
                  title="Vista en Tarjetas"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold text-xs transition-all cursor-pointer ${
                    viewMode === 'GRID'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 dark:text-emerald-300/70 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-3 h-3" />
                  <span className="hidden sm:inline">Tarjetas</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Route Sheets Content (Table or Grid) */}
        {isLoading ? (
          <div className="text-center py-24 bg-white/40 dark:bg-[#091A14]/40 rounded-3xl border border-dashed border-slate-200 dark:border-emerald-800/30">
            <Clock className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-3" />
            <p className="text-base font-bold text-slate-600 dark:text-emerald-300">Cargando correspondencia oficial...</p>
          </div>
        ) : sortedAndFilteredItems.length === 0 ? (
          <div className="text-center py-24 bg-white/60 dark:bg-[#091A14]/40 rounded-3xl border border-dashed border-slate-200 dark:border-emerald-800/30 space-y-4">
            <FolderArchive className="w-14 h-14 text-slate-300 dark:text-emerald-600/40 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                Bandeja vacía en {MAILBOX_TABS.find((t) => t.id === activeMailbox)?.label}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-emerald-400/60 mt-1 max-w-md mx-auto">
                No hay trámites en custodia o registro que coincidan con los criterios actuales.
              </p>
            </div>
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-6 py-3 rounded-2xl shadow-lg shadow-emerald-950/40 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Radicar nueva Hoja de Ruta</span>
            </button>
          </div>
        ) : viewMode === 'TABLE' ? (
          /* TABLA OFICIAL EN FILAS Y COLUMNAS ORDENADA POR LLEGADA */
          <div className="bg-white dark:bg-[#091A14]/90 border border-slate-200 dark:border-emerald-800/40 rounded-2xl shadow-xs overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 dark:bg-[#06110D] border-b border-slate-200 dark:border-emerald-800/50 text-slate-700 dark:text-emerald-300/90 text-[11px] font-semibold uppercase tracking-wider select-none">
                    <th className="py-3 px-3 text-center w-14">
                      <div className="flex items-center justify-center gap-1">
                        <Hash className="w-3.5 h-3.5 text-emerald-500" />
                        <span>N°</span>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center w-24 whitespace-nowrap">
                      <span>Lectura</span>
                    </th>
                    <th className="py-3 px-4 w-32 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Llegada</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 w-40 whitespace-nowrap">Hoja de Ruta</th>
                    <th className="py-3 px-4 min-w-[200px]">Remitente / Procedencia</th>
                    <th className="py-3 px-4 min-w-[280px]">Asunto & CITE Oficial</th>
                    <th className="py-3 px-4 min-w-[170px]">Custodia Actual</th>
                    <th className="py-3 px-3 w-32 text-center">Estado / SLA</th>
                    <th className="py-3 px-3 w-28 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
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
                            ? 'bg-emerald-500/[0.03] dark:bg-emerald-950/20 hover:bg-emerald-500/[0.07] dark:hover:bg-emerald-950/40 border-l-2 border-l-emerald-500'
                            : 'hover:bg-emerald-500/[0.03] dark:hover:bg-emerald-950/25'
                        }`}
                      >
                        {/* 1. N° de Orden Correlativo de Llegada */}
                        <td className="py-3.5 px-3 text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-mono font-bold text-xs border ${
                            !isRead
                              ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-100 dark:bg-[#071812] text-slate-700 dark:text-emerald-400/80 border-slate-200 dark:border-emerald-800/40'
                          }`}>
                            {arrivalOrderNumber}
                          </span>
                        </td>

                        {/* 2. Estado de Lectura / Visto */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap" onClick={(e) => toggleItemReadStatus(item, e)}>
                          {!isRead ? (
                            <span
                              title="Trámite nuevo sin abrir - Clic para marcar como visto"
                              className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 cursor-pointer"
                            >
                              <Mail className="w-3 h-3 text-emerald-500" />
                              <span>SIN ABRIR</span>
                            </span>
                          ) : (
                            <span
                              title={`Abierto/Visto: ${readTimestamp ? new Date(readTimestamp).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : 'Registrado'} - Clic para marcar como no leído`}
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700/50 cursor-pointer"
                            >
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                              <span>VISTO</span>
                            </span>
                          )}
                        </td>

                        {/* 3. Fecha y Hora Exacta de Llegada */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className={`font-mono text-xs ${!isRead ? 'font-bold text-slate-950 dark:text-white' : 'font-semibold text-slate-800 dark:text-slate-200'}`}>
                            {dateStr}
                          </div>
                          {timeStr && (
                            <div className="font-mono text-[10.5px] text-slate-400 dark:text-emerald-400/60 font-medium flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-emerald-500" />
                              <span>{timeStr}</span>
                            </div>
                          )}
                        </td>

                        {/* 4. Código Hoja de Ruta & Prioridad */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-emerald-900 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-500/30 tracking-wider">
                              {item.hrCode}
                            </span>
                            {item.priority === 'URGENTE' && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Prioridad Urgente" />
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 block mt-1">
                            {item.priority === 'URGENTE' ? '🔴 Urgente' : item.priority === 'ALTA' ? '🟡 Alta' : '🟢 Normal'}
                          </span>
                        </td>

                        {/* 5. Remitente / Procedencia */}
                        <td className="py-3.5 px-4">
                          <div className={`truncate max-w-[210px] ${!isRead ? 'font-bold text-slate-950 dark:text-white' : 'font-semibold text-slate-800 dark:text-slate-200'}`}>
                            {item.senderName}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-emerald-400/60 font-medium mt-0.5 truncate max-w-[210px]">
                            <Building2 className="w-3 h-3 text-emerald-500/70 shrink-0" />
                            <span className="truncate">{item.senderArea || (item.senderType === 'SOCIO' ? 'Socio Titular' : 'Externo')}</span>
                          </div>
                        </td>

                        {/* 6. Asunto & CITE */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100 line-clamp-2 uppercase leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
                            {item.reference}
                          </div>
                          <div className="flex items-center gap-2 text-[10.5px] text-slate-500 dark:text-slate-400 font-mono font-medium mt-1 flex-wrap">
                            {item.cite && <span className="bg-slate-100 dark:bg-[#071812] px-1.5 py-0.2 rounded border border-slate-200 dark:border-emerald-800/40 text-slate-600 dark:text-emerald-300">CITE: {item.cite}</span>}
                            <span>• {item.pageCount || 1} fojas</span>
                            {item.documents && item.documents.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAttachmentsModalItem(item);
                                }}
                                title="Haga clic para ver los documentos digitalizados"
                                className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/25"
                              >
                                <span>📎 {item.documents.length} adjunto(s)</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 7. Custodia Actual */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocatorInitialArea(item.currentArea);
                              setIsLocatorModalOpen(true);
                            }}
                            title={`Ubicar todas las hojas de ruta en ${item.currentArea}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-500/10 dark:bg-[#071812] dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-emerald-800/40 text-xs font-semibold text-slate-800 dark:text-emerald-200 uppercase truncate max-w-[170px] transition-all cursor-pointer group"
                          >
                            <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="truncate">{item.currentArea}</span>
                          </button>
                          {item.archiveLocation && (
                            <span
                              className={`text-[10px] font-semibold block mt-1 truncate ${
                                item.currentArea === 'ARCHIVO_PERSONAL' || item.archiveLocation.toUpperCase().includes('PERSONAL')
                                  ? 'text-teal-600 dark:text-teal-400'
                                  : 'text-amber-600 dark:text-amber-400'
                              }`}
                              title={item.archiveLocation}
                            >
                              {item.currentArea === 'ARCHIVO_PERSONAL' || item.archiveLocation.toUpperCase().includes('PERSONAL')
                                ? '📁 Mi Archivo: '
                                : '🏛️ Archivo Central: '}
                              {item.archiveLocation}
                            </span>
                          )}
                        </td>

                        {/* 8. Estado & Semáforo SLA */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <div className="space-y-1">
                            <span className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border ${getStatusBadge(item.status)}`}>
                              {item.status}
                            </span>
                            <div>
                              {getSlaBadge(item)}
                            </div>
                          </div>
                        </td>

                        {/* 9. Acciones Rápidas */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenItemDetail(item)}
                              title="Ver Expediente y Trazabilidad 360°"
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-700/60 transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
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
                                  className={`relative p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    hasDocs
                                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                      : 'bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white border-slate-200/80 dark:border-slate-700/60'
                                  }`}
                                >
                                  <Paperclip className="w-3.5 h-3.5" />
                                  {hasDocs && (
                                    <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#C5A059] text-slate-950 font-bold text-[8.5px] flex items-center justify-center">
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
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-700/60 transition-all cursor-pointer"
                            >
                              {isRead ? <Mail className="w-3.5 h-3.5" /> : <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPrintableItem(item)}
                              title="Imprimir Carátula Oficial"
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-700/60 transition-all cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5 text-[#C5A059]" />
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
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 flex-wrap gap-2">
              <span className="font-medium">
                Total trámites listados: <strong className="text-slate-900 dark:text-[#D4AF37] font-mono font-bold">{sortedAndFilteredItems.length}</strong>
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Club Hípico Los Sargentos — Sistema Oficial de Custodia & Gestión Documental
              </span>
            </div>
          </div>
        ) : (
          /* VISTA ALTERNATIVA EN TARJETAS */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 sm:gap-5">
            {sortedAndFilteredItems.map((item) => {
              const isRead = !!(readItemsMap[item.id] || readItemsMap[item.hrCode]);
              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenItemDetail(item)}
                  className={`group bg-white dark:bg-slate-900/50 border ${
                    !isRead
                      ? 'border-sky-500/40 dark:border-sky-500/40 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  } p-4.5 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden backdrop-blur-md`}
                >
                  {/* Priority Color Stripe */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      item.priority === 'URGENTE'
                        ? 'bg-rose-500'
                        : item.priority === 'ALTA'
                        ? 'bg-amber-500'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  />

                  <div className="space-y-3 pt-1">
                    {/* Top Line: Code, Read Status & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 tracking-wider">
                          {item.hrCode}
                        </span>
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-sky-500" title="Sin Abrir" />
                        )}
                      </div>
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border ${getStatusBadge(item.status)}`}>
                        {item.status}
                      </span>
                    </div>

                    {/* SLA Indicator */}
                    <div>
                      {getSlaBadge(item)}
                    </div>

                    {/* Reference / Asunto */}
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2 uppercase leading-snug group-hover:text-[#C5A059] transition-colors">
                        {item.reference}
                      </h4>
                      {item.cite && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-medium block mt-1">
                          CITE: {item.cite} • {item.pageCount || 1} fojas
                        </span>
                      )}
                    </div>

                    {/* Sender & Area Info */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                        <User className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                        <span className="font-semibold truncate">{item.senderName}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-[11px] truncate">
                          {item.senderArea || (item.senderType === 'SOCIO' ? 'Socio Titular' : 'Externo')}
                        </span>
                      </div>
                    </div>

                    {/* Archive Location Pill if Archived */}
                    {item.archiveLocation && (
                      <div className={`p-2 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 ${
                        item.currentArea === 'ARCHIVO_PERSONAL' || item.archiveLocation.toUpperCase().includes('PERSONAL')
                          ? 'bg-teal-500/10 border-teal-500/25 text-teal-700 dark:text-teal-300'
                          : 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400'
                      }`}>
                        {item.currentArea === 'ARCHIVO_PERSONAL' || item.archiveLocation.toUpperCase().includes('PERSONAL') ? (
                          <FolderCheck className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                        ) : (
                          <FolderArchive className="w-3.5 h-3.5 text-[#C5A059] shrink-0" />
                        )}
                        <span className="truncate">
                          {item.currentArea === 'ARCHIVO_PERSONAL' || item.archiveLocation.toUpperCase().includes('PERSONAL') ? 'Mi Archivo: ' : 'Archivo Central: '}
                          <strong>{item.archiveLocation}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Bar: Custody Location, Read Status & Quick Print */}
                  <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocatorInitialArea(item.currentArea);
                        setIsLocatorModalOpen(true);
                      }}
                      title={`Ubicar hojas de ruta en ${item.currentArea}`}
                      className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors text-left"
                    >
                      <MapPin className="w-3 h-3 text-[#C5A059] shrink-0" />
                      <span className="text-slate-400">Custodia:</span>
                      <span className="text-slate-800 dark:text-slate-200 uppercase truncate max-w-[120px] font-semibold">
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
                            className={`relative p-1.5 rounded-lg transition-all cursor-pointer ${
                              hasDocs
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'
                            }`}
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            {hasDocs && (
                              <span className="absolute -top-1 -right-1 min-w-[13px] h-[13px] px-0.5 rounded-full bg-[#C5A059] text-slate-950 font-bold text-[8px] flex items-center justify-center">
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
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      >
                        {isRead ? <Mail className="w-3.5 h-3.5" /> : <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrintableItem(item);
                        }}
                        title="Impresión rápida"
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-[#C5A059] transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#C5A059]" />
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
          className="relative group p-3.5 rounded-full bg-[#128C7E] hover:bg-[#075E54] text-white shadow-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center border border-white/20"
        >
          <MessageSquare className="w-5 h-5 text-white" />
          
          {/* Floating WhatsApp Notification Badge */}
          {unreadChatCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-600 border border-white text-white font-bold text-[10px] flex items-center justify-center shadow-md">
              {unreadChatCount}
            </span>
          )}

          {/* Floating tooltip label */}
          <span className="absolute right-full mr-3 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg border border-slate-800">
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

      {/* Libro Oficial de Control de CITEs & Modelos Institucionales */}
      {isCitesLedgerOpen && (
        <OfficialCitesLedgerModal
          isOpen={isCitesLedgerOpen}
          currentPerspective={currentPerspective}
          canAccessAllAreas={canAccess360}
          onClose={() => setIsCitesLedgerOpen(false)}
          onOpenRouteSheet={(code) => {
            setIsCitesLedgerOpen(false);
            handleSelectRouteSheetByCode(code);
          }}
        />
      )}

      {/* Generador de CITE & Redactor de Notas Oficiales */}
      {isGenerateCiteOpen && (
        <GenerateCiteModal
          isOpen={isGenerateCiteOpen}
          currentPerspective={currentPerspective}
          canAccessAllAreas={canAccess360}
          onClose={() => setIsGenerateCiteOpen(false)}
          onCiteCreated={() => {
            dispatch(fetchRouteSheets({ year: selectedGestion === 'ALL' ? undefined : selectedGestion }));
          }}
        />
      )}
    </div>
  );
};
export default CorrespondenceHub;
