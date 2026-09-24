import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@config/api';
import toast from 'react-hot-toast';
import { 
  CalendarDays, 
  CheckCircle, 
  XCircle, 
  Clock, 
  List as ListIcon, 
  Grid, 
  LayoutGrid, 
  Sparkles, 
  Trash2, 
  Search, 
  Filter, 
  RefreshCw,
  Dumbbell,
  Wrench,
  Trophy,
  MessageSquare,
  Ban
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { AdminReservationCalendar } from '../components/AdminReservationCalendar';
import { AdminTimelineView } from '../components/AdminTimelineView';
import { AdminCreateBlockModal } from '../components/AdminCreateBlockModal';
import { AdminEditCourtModal } from '../components/AdminEditCourtModal';
import { ReservationQrDetailsModal } from '../components/ReservationQrDetailsModal';
import { compressImage } from '@shared/utils/imageCompressor';
import WhatsAppConnectorModal from '@modules/pqrs/components/WhatsAppConnectorModal';
import CrestLogo from '@shared/components/CrestLogo';
import { BackButton } from '@shared/components/BackButton';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import { 
  CreditCard, 
  Eye, 
  FileText, 
  Users, 
  DollarSign, 
  Check, 
  AlertTriangle,
  AlertCircle,
  Pencil,
  MapPin,
  QrCode
} from 'lucide-react';

interface Court {
  id: string;
  name: string;
  sport: string;
  description?: string | null;
  hourlyRate?: number;
  guestRate?: number;
}

interface Reservation {
  id: string;
  code?: string | null;
  courtId: string;
  court: Court;
  date: string;
  startTime: string;
  endTime: string;
  memberCode?: string | null;
  memberName: string;
  memberPhone?: string | null;
  reservationType: string;
  playerType?: string;
  guestsCount?: number;
  playerNames?: string | null;
  courtFee?: number;
  guestFee?: number;
  totalPrice?: number;
  paymentStatus?: 'PENDING_PAYMENT' | 'PAID' | 'VERIFIED' | 'EXEMPT';
  paymentReceiptUrl?: string | null;
  title?: string | null;
  notes?: string | null;
  isRecurring?: boolean;
  recurringGroupId?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
}

export const CourtAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [courts, setCourts] = useState<Court[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Views: TIMELINE (default), CALENDAR, LIST
  const [viewMode, setViewMode] = useState<'TIMELINE' | 'CALENDAR' | 'LIST'>('TIMELINE');
  const [selectedTimelineDate, setSelectedTimelineDate] = useState<Date>(new Date());
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  
  // List filters
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Create block modal state
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>();
  const [modalInitialSport, setModalInitialSport] = useState<string | undefined>();
  
  // Court edit modal state
  const [isCourtEditModalOpen, setIsCourtEditModalOpen] = useState(false);
  const [selectedCourtForEdit, setSelectedCourtForEdit] = useState<Court | null>(null);

  // Reservation edit modal state
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

  // QR / Pre-reserva details modal state
  const [selectedForQrModal, setSelectedForQrModal] = useState<Reservation | null>(null);

  // Receipt modal viewer state
  const [viewingReceiptReservation, setViewingReceiptReservation] = useState<Reservation | null>(null);

  // WhatsApp connection state
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [waReservasConnected, setWaReservasConnected] = useState(false);

  useEffect(() => {
    fetchCourts();
    fetchReservations();
    checkWaStatus();
  }, []);

  const checkWaStatus = async () => {
    try {
      const res = await api.get('/whatsapp/chls-reservas/status');
      if (res.data?.data?.status === 'CONNECTED') {
        setWaReservasConnected(true);
      } else {
        setWaReservasConnected(false);
      }
    } catch {
      setWaReservasConnected(false);
    }
  };

  const fetchCourts = async () => {
    try {
      const res = await api.get('/reservations/courts');
      setCourts(res.data);
    } catch (err) {
      console.error('Error fetching courts:', err);
    }
  };

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reservations');
      setReservations(res.data);
    } catch (err) {
      toast.error('Error al cargar reservas');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/reservations/${id}/status`, { status });
      toast.success(`Reserva ${status === 'APPROVED' ? 'Aprobada' : status === 'REJECTED' ? 'Rechazada' : 'Actualizada'}`);
      fetchReservations();
    } catch (err) {
      toast.error('Error al actualizar la reserva');
    }
  };

  const handleUpdatePaymentStatus = async (id: string, paymentStatus: string) => {
    try {
      await api.put(`/reservations/${id}/payment-status`, { paymentStatus });
      toast.success(`Pago marcado como ${paymentStatus === 'VERIFIED' ? 'Verificado ✅' : paymentStatus === 'PAID' ? 'Comprobante Registrado' : 'Actualizado'}`);
      fetchReservations();
      if (viewingReceiptReservation && viewingReceiptReservation.id === id) {
        setViewingReceiptReservation({ ...viewingReceiptReservation, paymentStatus: paymentStatus as any });
      }
    } catch (err) {
      toast.error('Error al actualizar el estado de pago');
    }
  };

  const handleReleaseReservation = async (id: string) => {
    if (!window.confirm('¿Deseas liberar este turno? La cancha quedará disponible de inmediato para otros socios en el cronograma.')) return;
    try {
      const res = await api.post(`/reservations/${id}/cancel`, { isAdmin: true, reason: 'Liberada por Administración' });
      toast.success(res.data?.message || 'Cancha liberada exitosamente. Turno disponible.');
      fetchReservations();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al liberar la cancha');
    }
  };

  const handleDeleteReservation = async (id: string) => {
    try {
      await api.delete(`/reservations/${id}`);
      toast.success('Reserva / Bloqueo eliminado');
      fetchReservations();
    } catch (err) {
      toast.error('Error al eliminar la reserva');
    }
  };

  const handleDeleteRecurringGroup = async (groupId: string) => {
    try {
      const res = await api.delete(`/reservations/recurring/${groupId}`);
      toast.success(res.data.message || 'Serie continua eliminada exitosamente');
      fetchReservations();
    } catch (err) {
      toast.error('Error al eliminar la serie');
    }
  };

  const handleOpenBlockModal = (courtId?: string, sport?: string) => {
    setModalInitialDate(format(selectedTimelineDate, 'yyyy-MM-dd'));
    setModalInitialSport(sport || (selectedSport !== 'ALL' ? selectedSport : undefined));
    setIsBlockModalOpen(true);
  };

  // KPIs
  const totalCount = reservations.length;
  const approvedCount = reservations.filter(r => r.status === 'APPROVED').length;
  const pendingCount = reservations.filter(r => r.status === 'PENDING').length;
  const verifiedPaymentsCount = reservations.filter(r => r.paymentStatus === 'VERIFIED').length;
  const pendingPaymentsCount = reservations.filter(r => (!r.paymentStatus || r.paymentStatus === 'PENDING_PAYMENT') && r.reservationType === 'MEMBER').length;
  const classesAndBlocksCount = reservations.filter(r => 
    ['CIERRE_CANCHA', 'CLASS', 'MAINTENANCE', 'TOURNAMENT', 'ESCUELA_DEPORTIVA', 'EVENTO_CLUB'].includes(r.reservationType) &&
    r.status === 'APPROVED'
  ).length;

  // Filtered and Sorted for List View:
  // 1. Prioridad: Reservas pendientes de confirmación / validación de pago (las más nuevas arriba de todo)
  // 2. Luego: El resto de reservas ordenadas por orden de llegada (createdAt DESC)
  const filteredForList = useMemo(() => {
    return reservations
      .filter(r => {
        if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
        if (filterType !== 'ALL' && r.reservationType !== filterType) return false;
        if (filterPaymentStatus !== 'ALL' && (r.paymentStatus || 'PENDING_PAYMENT') !== filterPaymentStatus) return false;
        if (selectedSport !== 'ALL' && r.court?.sport !== selectedSport) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = r.memberName.toLowerCase().includes(q);
          const matchTitle = (r.title || '').toLowerCase().includes(q);
          const matchCourt = (r.court?.name || '').toLowerCase().includes(q);
          const matchCode = (r.memberCode || '').toLowerCase().includes(q);
          const matchReservationCode = (r.code || '').toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
          const matchCompanions = (r.playerNames || '').toLowerCase().includes(q);
          if (!matchName && !matchTitle && !matchCourt && !matchCode && !matchCompanions && !matchReservationCode) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // ¿Requiere acción o confirmación de pago/turno?
        const isPendingA = a.status === 'PENDING' || a.paymentStatus === 'PAID' || (a.reservationType === 'MEMBER' && a.paymentStatus !== 'VERIFIED');
        const isPendingB = b.status === 'PENDING' || b.paymentStatus === 'PAID' || (b.reservationType === 'MEMBER' && b.paymentStatus !== 'VERIFIED');

        if (isPendingA && !isPendingB) return -1;
        if (!isPendingA && isPendingB) return 1;

        // Orden de llegada: la más nueva primero (createdAt DESC o fecha/hora DESC)
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : new Date(`${a.date}T${a.startTime || '00:00'}`).getTime();
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : new Date(`${b.date}T${b.startTime || '00:00'}`).getTime();
        return timeB - timeA;
      });
  }, [reservations, filterStatus, filterType, filterPaymentStatus, selectedSport, searchQuery]);


  return (
    <div className="space-y-7 animate-fade-in p-4 sm:p-6 lg:p-8 max-w-[1720px] mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 bg-white/90 dark:bg-gradient-to-r dark:from-[#082015] dark:via-[#04140d] dark:to-[#020b07] p-6 sm:p-7 rounded-3xl border border-emerald-500/40 shadow-[0_0_35px_rgba(16,185,129,0.15)] backdrop-blur-xl transition-all">
        <div className="flex items-center gap-4">
          <BackButton to="/" title="Volver al Menú Principal" />
          <CrestLogo size="sm" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white serif-brand tracking-tight">
                Gestión de <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-brand-gold to-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">Canchas & Espacios Deportivos</span>
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-emerald-300/80 font-medium mt-1">
              Control en vivo, cronograma de clases continuas, torneos, mantenimiento y reservas de socios.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowWhatsAppModal(true)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 border-2 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${
              waReservasConnected
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-900 dark:text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-500/30'
                : 'bg-amber-500/20 border-amber-500/40 text-amber-900 dark:text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:bg-amber-500/30'
            }`}
            title="Canal 1: Vincular WhatsApp exclusivo para confirmaciones y QR de Reservas Web"
          >
            <MessageSquare className="w-4 h-4 text-brand-gold" />
            <span>{waReservasConnected ? 'Canal 1 Reservas: Conectado' : 'Canal 1: Conectar WhatsApp Reservas'}</span>
            <span className={`w-2.5 h-2.5 rounded-full ${waReservasConnected ? 'bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse' : 'bg-amber-400 animate-ping'}`} />
          </button>

          <button 
            onClick={() => {
              setSelectedCourtForEdit(null);
              setIsCourtEditModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-white/10 dark:bg-brand-gold/15 hover:bg-brand-gold/25 border-2 border-brand-gold/40 hover:border-brand-gold text-slate-800 dark:text-brand-gold text-xs font-black flex items-center gap-2 transition-all duration-300 shadow-[0_0_15px_rgba(234,179,8,0.15)] hover:shadow-[0_0_25px_rgba(234,179,8,0.3)] hover:scale-105 active:scale-95 cursor-pointer"
            title="Editar canchas, aranceles y estado de espacios deportivos"
          >
            <MapPin className="w-4 h-4 text-brand-gold" />
            <span>⚙️ Canchas & Tarifas</span>
          </button>

          <button 
            onClick={() => handleOpenBlockModal()}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-brand-gold to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-[0_0_25px_rgba(234,179,8,0.4)] hover:shadow-[0_0_35px_rgba(234,179,8,0.6)] border border-yellow-200/50 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer uppercase tracking-wider"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>+ Programar Clases / Ocupaciones</span>
          </button>
          
          <button 
            onClick={() => { fetchReservations(); fetchCourts(); checkWaStatus(); }}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-white/15 text-slate-700 dark:text-gray-300 text-xs font-bold border border-slate-200 dark:border-white/10 flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brand-gold' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* KPI Cards con Resplandor según Color Institucional */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
        
        {/* 1. Total Reservas (Sky Blue Aura) */}
        <div className="group bg-white/90 dark:bg-gradient-to-br dark:from-[#091e36] dark:via-[#051324] dark:to-[#020a14] border border-sky-500/30 dark:border-sky-500/40 hover:border-sky-400 p-5 rounded-3xl backdrop-blur-xl shadow-[0_0_20px_rgba(14,165,233,0.15)] hover:shadow-[0_0_50px_rgba(14,165,233,0.5),0_0_80px_rgba(14,165,233,0.2)] flex items-center gap-4 transition-all duration-300 hover:scale-[1.03] cursor-pointer relative overflow-hidden">
          <div className="w-13 h-13 rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(14,165,233,0.5)]">
            <CalendarDays className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <span className="text-[10px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest block">
              Total Reservas
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono drop-shadow-[0_0_10px_rgba(14,165,233,0.3)]">
              {totalCount}
            </span>
          </div>
        </div>
        
        {/* 2. Aprobadas (Emerald Green Aura) */}
        <div className="group bg-white/90 dark:bg-gradient-to-br dark:from-[#0a3120] dark:via-[#051e13] dark:to-[#020f09] border border-emerald-500/30 dark:border-emerald-500/40 hover:border-emerald-400 p-5 rounded-3xl backdrop-blur-xl shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5),0_0_80px_rgba(16,185,129,0.2)] flex items-center gap-4 transition-all duration-300 hover:scale-[1.03] cursor-pointer relative overflow-hidden">
          <div className="w-13 h-13 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
              Aprobadas
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              {approvedCount}
            </span>
          </div>
        </div>

        {/* 3. Pagos Verificados (Teal Aura) */}
        <div className="group bg-white/90 dark:bg-gradient-to-br dark:from-[#06312f] dark:via-[#041f1e] dark:to-[#02100f] border border-teal-500/30 dark:border-teal-500/40 hover:border-teal-400 p-5 rounded-3xl backdrop-blur-xl shadow-[0_0_20px_rgba(20,184,166,0.15)] hover:shadow-[0_0_50px_rgba(20,184,166,0.5),0_0_80px_rgba(20,184,166,0.2)] flex items-center gap-4 transition-all duration-300 hover:scale-[1.03] cursor-pointer relative overflow-hidden">
          <div className="w-13 h-13 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(20,184,166,0.5)]">
            <Check className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <span className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest block">
              Pagos Verificados
            </span>
            <span className="text-2xl sm:text-3xl font-black text-teal-700 dark:text-teal-300 font-mono drop-shadow-[0_0_10px_rgba(20,184,166,0.3)]">
              {verifiedPaymentsCount}
            </span>
          </div>
        </div>

        {/* 4. Pendientes Pago (Oro 24K / Amber Aura) */}
        <div className="group bg-white/90 dark:bg-gradient-to-br dark:from-[#362a08] dark:via-[#211a04] dark:to-[#120e02] border border-amber-500/30 dark:border-amber-500/40 hover:border-amber-400 p-5 rounded-3xl backdrop-blur-xl shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:shadow-[0_0_50px_rgba(245,158,11,0.5),0_0_80px_rgba(245,158,11,0.2)] flex items-center gap-4 transition-all duration-300 hover:scale-[1.03] cursor-pointer relative overflow-hidden">
          <div className="w-13 h-13 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.5)]">
            <Clock className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest block">
              Pendientes Pago
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-300 font-mono drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">
              {pendingPaymentsCount}
            </span>
          </div>
        </div>

        {/* 5. Clases & Bloqueos (Royal Purple Aura) */}
        <div className="group bg-white/90 dark:bg-gradient-to-br dark:from-[#2a0e3d] dark:via-[#190726] dark:to-[#0c0314] border border-purple-500/30 dark:border-purple-500/40 hover:border-purple-400 p-5 rounded-3xl backdrop-blur-xl shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:shadow-[0_0_50px_rgba(168,85,247,0.5),0_0_80px_rgba(168,85,247,0.2)] flex items-center gap-4 transition-all duration-300 hover:scale-[1.03] cursor-pointer relative overflow-hidden">
          <div className="w-13 h-13 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.5)]">
            <Dumbbell className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest block">
              Clases & Bloqueos
            </span>
            <span className="text-2xl sm:text-3xl font-black text-purple-700 dark:text-purple-300 font-mono drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">
              {classesAndBlocksCount}
            </span>
          </div>
        </div>

      </div>

      {/* Main Content Area */}
      <div className="bg-white/90 dark:bg-[#07130c]/90 border border-emerald-500/30 dark:border-emerald-500/40 p-5 sm:p-7 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.12)] backdrop-blur-xl space-y-6">
        
        {/* View Switcher Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
          
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-brand-gold uppercase tracking-wider serif-brand">
              {viewMode === 'TIMELINE' && 'Cronograma Deportivo en Vivo (Matriz Canchas × Horas)'}
              {viewMode === 'CALENDAR' && 'Calendario Mensual de Reservas'}
              {viewMode === 'LIST' && 'Registro General de Reservas y Pagos'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-emerald-300/70 font-medium">
              {viewMode === 'TIMELINE' && 'Visualiza la disponibilidad, clases continuas y reservas turno a turno.'}
              {viewMode === 'CALENDAR' && 'Explora el volumen diario de actividad del club en cada fecha.'}
              {viewMode === 'LIST' && 'Filtra y verifica pagos QR, solicitudes de socios y bloques deportivos.'}
            </p>
          </div>

          {/* View Mode Buttons */}
          <div className="flex bg-slate-100 dark:bg-black/60 rounded-2xl p-1.5 border border-slate-200 dark:border-white/10 self-stretch sm:self-auto shadow-inner">
            <button 
              onClick={() => setViewMode('TIMELINE')}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-black transition-all duration-300 cursor-pointer ${
                viewMode === 'TIMELINE' 
                  ? 'bg-gradient-to-r from-amber-400 via-brand-gold to-yellow-500 text-slate-950 shadow-[0_0_15px_rgba(234,179,8,0.4)] scale-[1.02]' 
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid size={15} /> Cronograma en Vivo
            </button>
            <button 
              onClick={() => setViewMode('CALENDAR')}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-black transition-all duration-300 cursor-pointer ${
                viewMode === 'CALENDAR' 
                  ? 'bg-gradient-to-r from-amber-400 via-brand-gold to-yellow-500 text-slate-950 shadow-[0_0_15px_rgba(234,179,8,0.4)] scale-[1.02]' 
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Grid size={15} /> Calendario
            </button>
            <button 
              onClick={() => setViewMode('LIST')}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-black transition-all duration-300 cursor-pointer ${
                viewMode === 'LIST' 
                  ? 'bg-gradient-to-r from-amber-400 via-brand-gold to-yellow-500 text-slate-950 shadow-[0_0_15px_rgba(234,179,8,0.4)] scale-[1.02]' 
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ListIcon size={15} /> Lista & Pagos
            </button>
          </div>

        </div>

        {/* 1. View: TIMELINE */}
        {viewMode === 'TIMELINE' && (
          <AdminTimelineView
            courts={courts}
            reservations={reservations.filter(r => r.date === format(selectedTimelineDate, 'yyyy-MM-dd'))}
            selectedDate={selectedTimelineDate}
            onChangeDate={setSelectedTimelineDate}
            onUpdateStatus={handleUpdateStatus}
            onReleaseReservation={handleReleaseReservation}
            onDeleteReservation={handleDeleteReservation}
            onDeleteRecurringGroup={handleDeleteRecurringGroup}
            onEditReservation={(res: any) => setEditingReservation(res)}
            onViewQrDetails={(res: any) => setSelectedForQrModal(res)}
            onOpenCreateBlock={handleOpenBlockModal}
            selectedSport={selectedSport}
            onChangeSport={setSelectedSport}
            loading={loading}
          />
        )}

        {/* 2. View: CALENDAR */}
        {viewMode === 'CALENDAR' && (
          <div>
            <AdminReservationCalendar 
              reservations={reservations} 
              selectedDate={selectedTimelineDate}
              onSelectDate={(date) => {
                if (date) {
                  setSelectedTimelineDate(date);
                  setViewMode('TIMELINE'); // switch to timeline to see details of clicked date
                }
              }}
            />
          </div>
        )}

        {/* 3. View: LIST */}
        {viewMode === 'LIST' && (
          <div className="space-y-4">
          <div className="bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 p-5 space-y-4">
            
            {/* Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              
              {/* Search */}
              <div className="md:col-span-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar socio, código..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand-gold"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-brand-gold"
                >
                  <option value="ALL">Estados de Turno</option>
                  <option value="PENDING">Pendientes</option>
                  <option value="APPROVED">Aprobadas</option>
                  <option value="REJECTED">Rechazadas</option>
                  <option value="CANCELLED">Canceladas</option>
                </select>
              </div>

              {/* Payment Filter */}
              <div>
                <select
                  value={filterPaymentStatus}
                  onChange={e => setFilterPaymentStatus(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-brand-gold"
                >
                  <option value="ALL">Estados de Pago</option>
                  <option value="PENDING_PAYMENT">🟡 Pendiente de Pago</option>
                  <option value="PAID">🔵 Comprobante Enviado</option>
                  <option value="VERIFIED">🟢 Pago Verificado</option>
                  <option value="EXEMPT">⚪ Exento</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-brand-gold"
                >
                  <option value="ALL">Todos los Tipos</option>
                  <option value="CIERRE_CANCHA">🚫 Cierre de Canchas</option>
                  <option value="MEMBER">Reserva de Socio</option>
                  <option value="CLASS">Clases Deportivas</option>
                  <option value="MAINTENANCE">Mantenimiento</option>
                  <option value="TOURNAMENT">Torneo</option>
                  <option value="ESCUELA_DEPORTIVA">Escuela Deportiva</option>
                </select>
              </div>

              {/* Sport Filter */}
              <div>
                <select
                  value={selectedSport}
                  onChange={e => setSelectedSport(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-brand-gold"
                >
                  <option value="ALL">Todos los Deportes</option>
                  {Array.from(new Set(courts.map(c => c.sport))).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-black/60 border-b border-white/10 uppercase tracking-wider text-gray-400">
                    <th className="py-3.5 px-4 font-bold">Fecha / Hora Solicitud (Llegada)</th>
                    <th className="py-3.5 px-4 font-bold">Turno Deportivo</th>
                    <th className="py-3.5 px-4 font-bold">Cancha / Deporte</th>
                    <th className="py-3.5 px-4 font-bold">Titular & Modalidad</th>
                    <th className="py-3.5 px-4 font-bold">Monto & Pago</th>
                    <th className="py-3.5 px-4 font-bold">Estado Reserva</th>
                    <th className="py-3.5 px-4 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {loading ? (
                    <tr><td colSpan={7} className="py-12 text-center text-gray-400">Cargando registros...</td></tr>
                  ) : filteredForList.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-gray-400">No se encontraron reservas con los filtros aplicados.</td></tr>
                  ) : (
                    filteredForList.map((res: Reservation) => {
                      const totalAmount = res.totalPrice ?? (res.courtFee ?? 0) + (res.guestFee ?? 0);
                      const isExempt = res.paymentStatus === 'EXEMPT' || totalAmount === 0;
                      const isVerified = res.paymentStatus === 'VERIFIED' || (isExempt && res.status === 'APPROVED');
                      const isPaid = res.paymentStatus === 'PAID';
                      const isActionRequired = res.reservationType === 'MEMBER' && !isExempt && !isVerified && res.status !== 'REJECTED' && res.status !== 'CANCELLED';
                      const hasReceipt = !!res.paymentReceiptUrl;

                      return (
                        <tr 
                          key={res.id} 
                          className={`transition-colors ${
                            isActionRequired 
                              ? 'bg-amber-500/[0.06] hover:bg-amber-500/[0.1] border-l-4 border-amber-400' 
                              : isExempt 
                              ? 'bg-emerald-500/[0.02] hover:bg-emerald-500/[0.05]'
                              : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          {/* Columna 1: Fecha y Hora de Llegada / Solicitud */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`w-2 h-2 rounded-full ${isExempt ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-brand-gold shadow-[0_0_6px_#cca14b]'}`}></span>
                              <span className="font-bold text-white font-mono text-xs">
                                {res.createdAt ? format(parseISO(res.createdAt), 'dd/MM/yyyy HH:mm:ss') : 'Fecha no reg.'}
                              </span>
                            </div>
                            <div className="text-[10px] text-emerald-400 font-medium">
                              {res.createdAt ? formatDistanceToNow(parseISO(res.createdAt), { addSuffix: true, locale: es }) : ''}
                            </div>
                          </td>

                          {/* Columna 2: Turno Deportivo */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className="font-bold text-white">{format(parseISO(res.date), 'dd/MM/yyyy')}</span>
                              <span 
                                onClick={() => {
                                  const c = res.code || res.id.slice(0, 8).toUpperCase();
                                  navigator.clipboard.writeText(c);
                                  toast.success(`Código #${c} copiado`);
                                }}
                                className="cursor-pointer px-1.5 py-0.5 rounded bg-brand-gold/15 hover:bg-brand-gold/25 border border-brand-gold/30 text-brand-gold font-mono text-[10px] font-bold transition-colors"
                                title="Clic para copiar código de reserva"
                              >
                                #{res.code || res.id.slice(0, 8).toUpperCase()}
                              </span>
                              {isActionRequired && (
                                <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-[9px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
                                  🔔 Por Confirmar
                                </span>
                              )}
                              {isExempt && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                  ✓ Habilitado
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-brand-gold font-mono">{res.startTime} - {res.endTime}</div>
                          </td>
                          
                          <td className="py-3 px-4">
                            <div className="font-semibold text-gray-200">{res.court?.name}</div>
                            <div className="text-[10px] text-brand-gold-light">{res.court?.sport}</div>
                          </td>
                          
                          <td className="py-3 px-4">
                            <div className="font-bold text-white uppercase">
                              {res.reservationType === 'MEMBER' ? res.memberName : (res.title || 'Bloqueo Administrativo')}
                            </div>
                            {res.memberCode && res.memberCode !== 'ADMIN_BLOCK' && (
                              <div className="text-[10px] text-gray-400">Socio: #{res.memberCode} {res.memberPhone ? `• ${res.memberPhone}` : ''}</div>
                            )}
                            {/* Modalidad Badge para Socios */}
                            {res.reservationType === 'MEMBER' && (
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  res.playerType === 'GUESTS' 
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                                    : res.playerType === 'MEMBERS'
                                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}>
                                  {res.playerType === 'GUESTS' ? `👥 Con ${res.guestsCount || 1} Invitado(s)` : res.playerType === 'MEMBERS' ? '🎾 Entre Socios' : '👨‍👩‍👧‍👦 Familiar'}
                                </span>
                                {res.playerNames && (
                                  <span className="text-[10px] text-gray-400 italic truncate max-w-xs" title={res.playerNames}>
                                    ({res.playerNames})
                                  </span>
                                )}
                              </div>
                            )}
                            {/* Badge para Bloqueos y Cierres Administrativos */}
                            {res.reservationType !== 'MEMBER' && (
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                  res.reservationType === 'CIERRE_CANCHA'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : res.reservationType === 'MAINTENANCE'
                                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                                    : res.reservationType === 'CLASS' || res.reservationType === 'ESCUELA_DEPORTIVA'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                                }`}>
                                  {res.reservationType === 'CIERRE_CANCHA' ? '🚫 Cierre de Canchas' : res.reservationType === 'MAINTENANCE' ? '🛠️ Mantenimiento' : res.reservationType === 'CLASS' ? '🎾 Clases Deportivas' : res.reservationType === 'ESCUELA_DEPORTIVA' ? '🎓 Escuela Deportiva' : '🏆 Torneo'}
                                </span>
                                {res.notes && (
                                  <span className="text-[10px] text-gray-300 italic truncate max-w-xs" title={res.notes}>
                                    • {res.notes}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          
                          {/* Monto & Pago Column */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-white font-mono text-sm">
                              {isExempt ? 'Bs. 0' : `Bs. ${totalAmount}`}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              {isExempt ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5 text-emerald-400" /> Cortesía de Socio
                                </span>
                              ) : isVerified ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-sm">
                                  <Check className="w-2.5 h-2.5 text-emerald-400" /> Pago Validado
                                </span>
                              ) : isPaid ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5 text-amber-400" /> Comprobante Recibido
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 animate-pulse">
                                  <AlertCircle className="w-2.5 h-2.5 text-amber-400" /> Pendiente de Pago
                                </span>
                              )}

                              <button
                                onClick={() => setSelectedForQrModal(res)}
                                className="px-2 py-0.5 rounded bg-brand-gold/15 hover:bg-brand-gold/25 border border-brand-gold/30 text-brand-gold text-[10px] font-bold flex items-center gap-1 transition-colors"
                                title="Ver QR de Pago, Mensaje y Datos de Reserva"
                              >
                                <QrCode className="w-3 h-3" /> Ver QR / Detalle
                              </button>

                              {hasReceipt && (
                                <button
                                  onClick={() => setViewingReceiptReservation(res)}
                                  className="p-1 rounded bg-white/10 hover:bg-white/20 text-brand-gold text-[10px] font-bold flex items-center gap-0.5"
                                  title="Ver Comprobante Adjunto"
                                >
                                  <Eye className="w-3 h-3" /> Ver Comprobante
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {isExempt || isVerified || res.status === 'APPROVED' ? (
                              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit">
                                <Check className="w-3 h-3 text-emerald-400" /> Aprobada
                              </span>
                            ) : res.status === 'PENDING' ? (
                              <span className="px-2.5 py-1 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit">
                                <Clock className="w-3 h-3 text-yellow-400" /> En Proceso
                              </span>
                            ) : res.status === 'REJECTED' ? (
                              <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full text-[10px] font-bold w-fit">
                                Rechazada
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-full text-[10px] font-bold w-fit">
                                Cancelada
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end items-center gap-1.5">
                              {/* Quick View QR Modal Button */}
                              <button
                                onClick={() => setSelectedForQrModal(res)}
                                className="p-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors border border-emerald-500/30"
                                title="Ver Detalle y Pase"
                              >
                                <QrCode size={16} />
                              </button>

                              {/* Quick Verify Payment Button: SOLO cuando NO es exento y falta verificar */}
                              {!isVerified && !isExempt && res.reservationType === 'MEMBER' && (
                                <button
                                  onClick={() => handleUpdatePaymentStatus(res.id, 'VERIFIED')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 transition-colors shadow-sm"
                                  title="Validar Pago y Consolidar Reserva"
                                >
                                  <Check className="w-3 h-3" /> Validar Pago & Consolidar
                                </button>
                              )}

                              {res.status === 'PENDING' && (
                                <>
                                  <button 
                                    onClick={() => handleUpdateStatus(res.id, 'APPROVED')} 
                                    className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg transition-colors" 
                                    title="Aprobar Turno"
                                  >
                                    <CheckCircle size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateStatus(res.id, 'REJECTED')} 
                                    className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg transition-colors" 
                                    title="Rechazar Turno"
                                  >
                                    <XCircle size={16} />
                                  </button>
                                </>
                              )}

                              {/* Edit Reservation Button */}
                              <button
                                onClick={() => setEditingReservation(res)}
                                className="p-1.5 hover:bg-brand-gold/20 text-gray-400 hover:text-brand-gold rounded-lg transition-colors"
                                title="Editar Turno / Horario"
                              >
                                <Pencil size={16} />
                              </button>

                              {/* Liberar Cancha Button */}
                              {res.status !== 'CANCELLED' && (
                                <button
                                  onClick={() => handleReleaseReservation(res.id)}
                                  className="p-1.5 hover:bg-amber-500/20 text-gray-400 hover:text-amber-400 rounded-lg transition-colors"
                                  title="Liberar Cancha / Cancelar Turno"
                                >
                                  <Ban size={16} />
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  if (window.confirm('¿Eliminar este registro?')) {
                                    handleDeleteReservation(res.id);
                                  }
                                }}
                                className="p-1.5 hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Modal Visor de Comprobante de Pago */}
      {viewingReceiptReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0c1712] border border-brand-gold/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 relative">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-gold">
                  Auditoría de Pagos
                </span>
                <h3 className="text-lg font-bold text-white serif-brand">
                  Comprobante de Reserva
                </h3>
              </div>
              <button 
                onClick={() => setViewingReceiptReservation(null)}
                className="p-1 rounded-xl text-gray-400 hover:text-white hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="bg-black/50 p-3 rounded-xl border border-white/10 text-xs space-y-1.5 text-gray-300">
              <div className="flex justify-between items-center pb-1 border-b border-white/5">
                <span className="text-gray-400">Código de Reserva:</span>
                <span className="font-mono font-bold text-brand-gold bg-brand-gold/15 px-2 py-0.5 rounded border border-brand-gold/30">
                  #{viewingReceiptReservation.code || viewingReceiptReservation.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Socio:</span>
                <strong className="text-white">{viewingReceiptReservation.memberName} ({viewingReceiptReservation.memberCode})</strong>
              </div>
              <div className="flex justify-between">
                <span>Cancha:</span>
                <span className="text-white">{viewingReceiptReservation.court?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Fecha & Horario:</span>
                <span className="text-emerald-400 font-mono">{viewingReceiptReservation.date} • {viewingReceiptReservation.startTime} - {viewingReceiptReservation.endTime}</span>
              </div>
              <div className="flex justify-between">
                <span>Monto a Cobrar:</span>
                <strong className="text-brand-gold font-mono text-sm">Bs. {viewingReceiptReservation.totalPrice ?? 30}</strong>
              </div>
            </div>

            {/* Receipt Image Display */}
            {viewingReceiptReservation.paymentReceiptUrl ? (
              <div className="max-h-[350px] overflow-auto rounded-xl border border-white/10 bg-black/60 p-2 flex items-center justify-center">
                <img 
                  src={viewingReceiptReservation.paymentReceiptUrl} 
                  alt="Comprobante de Pago" 
                  className="max-h-[320px] max-w-full rounded-lg object-contain"
                />
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-6 text-center">
                No se adjuntó comprobante en la plataforma. Verifique el comprobante enviado al WhatsApp del club.
              </p>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleUpdatePaymentStatus(viewingReceiptReservation.id, 'VERIFIED');
                  setViewingReceiptReservation(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Validar Pago & Consolidar Reserva</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingReceiptReservation(null)}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Continuous Block & Edit Turn Modal (Unified Environment) */}
      <AdminCreateBlockModal
        isOpen={isBlockModalOpen || !!editingReservation}
        onClose={() => {
          setIsBlockModalOpen(false);
          setEditingReservation(null);
        }}
        courts={courts}
        onSuccess={() => {
          fetchReservations();
          fetchCourts();
        }}
        initialDate={modalInitialDate}
        initialSport={modalInitialSport}
        editingReservation={editingReservation}
      />

      {/* Edit Court / Rates Modal */}
      <AdminEditCourtModal
        isOpen={isCourtEditModalOpen}
        onClose={() => {
          setIsCourtEditModalOpen(false);
          setSelectedCourtForEdit(null);
        }}
        courts={courts}
        selectedCourtForEdit={selectedCourtForEdit}
        onSuccess={() => {
          fetchCourts();
          fetchReservations();
        }}
      />

      {/* Modal Visor de QR, Mensaje Oficial y Datos de Pre-Reserva */}
      <ReservationQrDetailsModal
        isOpen={!!selectedForQrModal}
        onClose={() => setSelectedForQrModal(null)}
        reservation={selectedForQrModal}
        isStaffView={true}
        onEdit={(res) => {
          setSelectedForQrModal(null);
          setEditingReservation(res as any);
        }}
        onUploadReceipt={async (id, fileOrBase64) => {
          let base64String: string;
          if (typeof fileOrBase64 === 'string') {
            base64String = fileOrBase64;
          } else {
            const compressed = await compressImage(fileOrBase64);
            base64String = compressed.dataUrl;
          }
          await api.post(`/reservations/${id}/receipt`, { receiptBase64: base64String });
          toast.success('Comprobante adjuntado y remitido');
          fetchReservations();
        }}
        onVerifyPayment={async (id) => {
          await handleUpdatePaymentStatus(id, 'VERIFIED');
          setSelectedForQrModal(null);
        }}
      />

      {/* WhatsApp Reservas Connector Modal */}
      {showWhatsAppModal && (
        <WhatsAppConnectorModal
          onClose={() => {
            setShowWhatsAppModal(false);
            checkWaStatus();
          }}
          clientId="chls-reservas"
          moduleName="Módulo de Reservas Deportivas"
          channelBadge="Canal 1 • Reservas Web"
          title="WhatsApp Reservas Deportivas (Notificaciones Web)"
          subtitle="Línea oficial asignada exclusivamente a confirmaciones de turnos, envío de pases deportivos y comprobantes QR de pago."
          purposeDescription="Despachar automáticamente pases de ingreso con código QR de acceso a canchas (Tenis, Pádel) y comprobantes de reservas confirmadas."
          successMessage="La línea de WhatsApp de Reservas Deportivas está conectada y lista para despachar pases y notificaciones de turnos a los socios."
        />
      )}

    </div>
  );
};

