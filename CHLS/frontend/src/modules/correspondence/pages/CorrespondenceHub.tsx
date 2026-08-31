import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@store/store';
import {
  fetchRouteSheets,
  fetchCorrespondenceStats,
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
  GitBranch,
} from 'lucide-react';
import CrestLogo from '@shared/components/CrestLogo';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import BackButton from '@shared/components/BackButton';
import { GatehouseInvoiceReceiptModal } from '../../gatehouse/components/GatehouseInvoiceReceiptModal';
import io from 'socket.io-client';

const DEPARTMENTS = [
  { id: 'SECRETARIA_GENERAL', label: 'Secretaría de Gerencia' },
  { id: 'GERENCIA_GENERAL', label: 'Gerencia General' },
  { id: 'TESORERÍA Y FINANZAS', label: 'Tesorería & Finanzas' },
  { id: 'CONTRATACIONES Y ADQUISICIONES', label: 'Compras & Contrataciones' },
  { id: 'COMISIÓN HÍPICA', label: 'Comisión Hípica' },
  { id: 'CAPITANÍA DEPORTES / TENIS', label: 'Capitanía de Deportes' },
  { id: 'ASESORÍA LEGAL', label: 'Asesoría Legal' },
  { id: 'MANTENIMIENTO Y OBRAS', label: 'Mantenimiento & Obras' },
  { id: 'CASETA_ENTRADA', label: 'Caseta de Ingreso' },
];

export const CorrespondenceHub: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();
  const urlCode = searchParams.get('code');

  const { items, stats, isLoading, activeMailbox, searchQuery, selectedItem, selectedGestion } = useSelector(
    (state: RootState) => state.correspondence
  );
  const currentUser = useSelector((state: RootState) => state.auth.user);

  const [currentPerspective, setCurrentPerspective] = useState('SECRETARIA_GENERAL');
  const [slaFilter, setSlaFilter] = useState<'ALL' | 'OVERDUE' | 'WARNING' | 'ON_TIME'>('ALL');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [channelUnreadCounts, setChannelUnreadCounts] = useState<Record<string, number>>({});
  const [printableItem, setPrintableItem] = useState<RouteSheetItem | null>(null);

  const handleSelectRouteSheetByCode = (hrCode: string) => {
    const clean = hrCode.trim().toLowerCase();
    const found = items.find(
      (i) => i.hrCode.toLowerCase() === clean || i.id.toLowerCase() === clean
    );
    if (found) {
      dispatch(setSelectedItem(found));
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
        dispatch(setSelectedItem(found));
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
  const inboxCount = items.filter(
    (i) => i.currentArea === currentPerspective && i.status !== 'CONCLUIDO' && i.status !== 'ANULADO'
  ).length;

  const outboxCount = items.filter(
    (i) =>
      i.movements?.some((m) => m.sourceArea === currentPerspective) &&
      i.currentArea !== currentPerspective &&
      i.status !== 'CONCLUIDO'
  ).length;

  const copiesCount = items.filter(
    (i) =>
      i.movements?.some(
        (m) =>
          m.instruction?.toUpperCase().includes(currentPerspective.toUpperCase()) &&
          m.instruction?.includes('[C.C.')
      )
  ).length;

  const archivedCount = items.filter(
    (i) => i.status === 'CONCLUIDO' || i.status === 'ANULADO' || i.currentArea === 'ARCHIVO_CENTRAL' || !!i.archiveLocation
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
      if (item.currentArea !== currentPerspective || item.status === 'CONCLUIDO' || item.status === 'ANULADO') {
        return false;
      }
    } else if (activeMailbox === 'OUTBOX') {
      const hasSentFromMyArea = item.movements?.some((m) => m.sourceArea === currentPerspective);
      if (!hasSentFromMyArea || item.currentArea === currentPerspective || item.status === 'CONCLUIDO') {
        return false;
      }
    } else if (activeMailbox === 'COPIES') {
      const hasCopy = item.movements?.some(
        (m) =>
          m.instruction?.toUpperCase().includes(currentPerspective.toUpperCase()) &&
          m.instruction?.includes('[C.C.')
      );
      if (!hasCopy) return false;
    } else if (activeMailbox === 'ARCHIVED') {
      const isArchived = item.status === 'CONCLUIDO' || item.status === 'ANULADO' || item.currentArea === 'ARCHIVO_CENTRAL' || !!item.archiveLocation;
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

    return true;
  });

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
      <header className="relative z-10 w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between border-b border-slate-200/80 dark:border-emerald-500/30 backdrop-blur-md flex-wrap gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <BackButton />
          <CrestLogo size="md" className="w-12 h-12 shrink-0" />
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
              {DEPARTMENTS.map((dept) => (
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
            onClick={() => setIsInvoiceModalOpen(true)}
            title="Recepción rápida de facturas (Luz, Agua, Gas, etc.)"
            className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold shadow-xs transition-all hover:scale-105 active:scale-95"
          >
            <Receipt className="w-4 h-4 text-emerald-500" />
            <span className="hidden md:inline">Recibir Factura (Caseta)</span>
          </button>
          
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
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 w-full max-w-[1720px] mx-auto p-4 sm:p-6 lg:p-8 space-y-7">
        
        {/* Eco-Metrics Bar (Iniciativa Cero Papel) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          
          {/* 1. Hojas Ahorradas */}
          <div className="group bg-white/90 dark:bg-gradient-to-br dark:from-[#0d2a1c] dark:via-[#081c12] dark:to-[#030e08] border border-emerald-500/30 dark:border-emerald-500/40 hover:border-emerald-500 dark:hover:border-emerald-400 p-5 rounded-3xl backdrop-blur-xl shadow-[0_0_20px_rgba(16,185,129,0.12)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5),0_0_90px_rgba(16,185,129,0.25)] flex items-center gap-4 transition-all duration-300 hover:scale-[1.03] cursor-pointer">
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
          <div className="group bg-white/90 dark:bg-gradient-to-br dark:from-[#2a240d] dark:via-[#1c1808] dark:to-[#0e0c03] border border-brand-gold/30 dark:border-brand-gold/40 hover:border-brand-gold dark:hover:border-yellow-400 p-5 rounded-3xl backdrop-blur-xl shadow-[0_0_20px_rgba(234,179,8,0.12)] hover:shadow-[0_0_50px_rgba(234,179,8,0.5),0_0_90px_rgba(234,179,8,0.25)] flex items-center gap-4 transition-all duration-300 hover:scale-[1.03] cursor-pointer">
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
          <div className="group bg-white/90 dark:bg-gradient-to-br dark:from-[#0d222a] dark:via-[#08161c] dark:to-[#030a0e] border border-cyan-500/30 dark:border-cyan-500/40 hover:border-cyan-500 dark:hover:border-cyan-400 p-5 rounded-3xl backdrop-blur-xl shadow-[0_0_20px_rgba(6,182,212,0.12)] hover:shadow-[0_0_50px_rgba(6,182,212,0.5),0_0_90px_rgba(6,182,212,0.25)] flex items-center gap-4 transition-all duration-300 hover:scale-[1.03] cursor-pointer">
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
          <div className="group bg-white/90 dark:bg-gradient-to-br dark:from-[#250d2a] dark:via-[#18081c] dark:to-[#0c030e] border border-purple-500/30 dark:border-purple-500/40 hover:border-purple-500 dark:hover:border-purple-400 p-5 rounded-3xl backdrop-blur-xl shadow-[0_0_20px_rgba(168,85,247,0.12)] hover:shadow-[0_0_50px_rgba(168,85,247,0.5),0_0_90px_rgba(168,85,247,0.25)] flex items-center gap-4 transition-all duration-300 hover:scale-[1.03] cursor-pointer">
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
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-brand-gold" />
              <input
                type="text"
                placeholder="Buscar por N° de Hoja de Ruta (ej. 08-193), remitente, CITE, asunto o ubicación de archivo..."
                value={searchQuery}
                onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-black/50 border-2 border-slate-200 dark:border-emerald-500/30 rounded-2xl text-xs sm:text-sm text-slate-950 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold shadow-xs"
              />
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

          {/* SLA Semaphor Quick Filter */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/10 flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-gold" />
              <span className="font-black text-slate-700 dark:text-gray-300 uppercase text-[11px] tracking-wider">
                Semáforo SLA de Cumplimiento:
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
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
            </div>
          </div>

        </div>

        {/* Route Sheets Grid */}
        {isLoading ? (
          <div className="text-center py-24 bg-white/40 dark:bg-black/20 rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
            <Clock className="w-12 h-12 text-brand-gold animate-spin mx-auto mb-3" />
            <p className="text-base font-bold text-slate-600 dark:text-gray-300">Cargando correspondencia oficial...</p>
          </div>
        ) : filteredItems.length === 0 ? (
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => dispatch(setSelectedItem(item))}
                className="group bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60 dark:bg-gradient-to-br dark:from-[#0d2a1c] dark:via-[#081c12] dark:to-[#030e08] border-2 border-emerald-500/50 dark:border-emerald-400/60 hover:border-emerald-600 dark:hover:border-emerald-300 p-5 rounded-3xl shadow-[0_0_30px_rgba(16,185,129,0.2),0_10px_25px_rgba(0,0,0,0.3)] hover:shadow-[0_0_55px_rgba(16,185,129,0.5),0_0_90px_rgba(16,185,129,0.25)] transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden backdrop-blur-xl hover:scale-[1.02]"
              >
                {/* Priority Color Stripe with high intensity glow */}
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
                  {/* Top Line: Code & Status */}
                  <div className="flex items-center justify-between gap-2.5">
                    <span className="font-mono text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-200 bg-emerald-500/25 dark:bg-emerald-950/90 px-3.5 py-1 rounded-xl border border-emerald-500/60 dark:border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.35)] tracking-wider">
                      {item.hrCode}
                    </span>
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

                {/* Bottom Bar: Custody Location & Quick Print */}
                <div className="mt-5 pt-3.5 border-t border-emerald-500/25 dark:border-emerald-500/30 flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-gray-300">
                    <span className="text-slate-500 dark:text-gray-400 font-normal">Custodia:</span>
                    <span className="text-emerald-800 dark:text-brand-gold uppercase truncate max-w-[140px] font-black">
                      {item.currentArea}
                    </span>
                  </div>

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
            ))}
          </div>
        )}

      </main>

      {/* Modal New Route Sheet */}
      {isNewModalOpen && (
        <NewRouteSheetModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
        />
      )}

      {/* Modal Detail Expediente */}
      {selectedItem && (
        <RouteSheetDetailModal
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
    </div>
  );
};
export default CorrespondenceHub;
