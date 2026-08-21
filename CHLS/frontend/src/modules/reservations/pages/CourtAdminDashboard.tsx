import React, { useState, useEffect } from 'react';
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
  MessageSquare
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AdminReservationCalendar } from '../components/AdminReservationCalendar';
import { AdminTimelineView } from '../components/AdminTimelineView';
import { AdminCreateBlockModal } from '../components/AdminCreateBlockModal';
import WhatsAppConnectorModal from '@modules/pqrs/components/WhatsAppConnectorModal';
import CrestLogo from '@shared/components/CrestLogo';
import { 
  CreditCard, 
  Eye, 
  FileText, 
  Users, 
  DollarSign, 
  Check, 
  AlertTriangle,
  AlertCircle 
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
    ['CLASS', 'MAINTENANCE', 'TOURNAMENT', 'ESCUELA_DEPORTIVA', 'EVENTO_CLUB'].includes(r.reservationType) &&
    r.status === 'APPROVED'
  ).length;

  // Filtered for List View
  const filteredForList = reservations.filter(r => {
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
  });


  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 max-w-[1600px] mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-brand-green/30 via-brand-green/10 to-transparent p-6 rounded-3xl border border-brand-gold/20 shadow-xl">
        <div className="flex items-center gap-4">
          <CrestLogo size="md" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white serif-brand tracking-tight">
                Gestión de <span className="text-brand-gold">Canchas & Espacios Deportivos</span>
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Control en vivo, cronograma de clases de tenis, torneos, mantenimiento y reservas de socios.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowWhatsAppModal(true)}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              waReservasConnected
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:bg-emerald-500/25'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
            }`}
            title="Conectar o administrar la línea WhatsApp de Reservas Deportivas"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{waReservasConnected ? 'WhatsApp Conectado' : 'Conectar WhatsApp'}</span>
            <span className={`w-2 h-2 rounded-full ${waReservasConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' : 'bg-amber-400'}`} />
          </button>

          <button 
            onClick={() => handleOpenBlockModal()}
            className="glass-button-primary px-4 py-2.5 text-xs font-bold flex items-center gap-2 shadow-goldGlow"
          >
            <Sparkles className="w-4 h-4" />
            <span>+ Programar Clases / Ocupaciones</span>
          </button>
          
          <button 
            onClick={() => { fetchReservations(); fetchCourts(); checkWaStatus(); }}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-colors"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Total */}
        <div className="glass-panel p-4 border-l-4 border-brand-gold relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 text-brand-gold/15 dark:text-brand-gold/10">
            <CalendarDays size={70} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Total Reservas</p>
            <h3 className="text-2xl font-bold theme-text">{totalCount}</h3>
          </div>
        </div>
        
        {/* Aprobadas */}
        <div className="glass-panel p-4 border-l-4 border-emerald-500 relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 text-emerald-500/15 dark:text-emerald-500/10">
            <CheckCircle size={70} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold mb-1">Aprobadas</p>
            <h3 className="text-2xl font-bold theme-text">{approvedCount}</h3>
          </div>
        </div>

        {/* Pagos Verificados */}
        <div className="glass-panel p-4 border-l-4 border-teal-500 relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 text-teal-500/15 dark:text-teal-500/10">
            <Check size={70} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] text-teal-400 uppercase tracking-widest font-bold mb-1">Pagos Verificados</p>
            <h3 className="text-2xl font-bold text-teal-300">{verifiedPaymentsCount}</h3>
          </div>
        </div>

        {/* Pagos Pendientes */}
        <div className="glass-panel p-4 border-l-4 border-amber-500 relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 text-amber-500/15 dark:text-amber-500/10">
            <Clock size={70} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] text-amber-400 uppercase tracking-widest font-bold mb-1">Pendientes Pago</p>
            <h3 className="text-2xl font-bold text-amber-300">{pendingPaymentsCount}</h3>
          </div>
        </div>

        {/* Clases / Bloqueos */}
        <div className="glass-panel p-4 border-l-4 border-indigo-500 relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 text-indigo-500/15 dark:text-indigo-500/10">
            <Dumbbell size={70} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold mb-1">Clases & Bloqueos</p>
            <h3 className="text-2xl font-bold theme-text">{classesAndBlocksCount}</h3>
          </div>
        </div>

      </div>

      {/* Main Content Area */}
      <div className="glass-panel p-5 sm:p-6 space-y-6">
        
        {/* View Switcher Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-white/10 pb-4">
          
          <div>
            <h2 className="text-lg font-bold text-brand-gold uppercase tracking-wider serif-brand">
              {viewMode === 'TIMELINE' && 'Cronograma Deportivo en Vivo (Matriz Canchas × Horas)'}
              {viewMode === 'CALENDAR' && 'Calendario Mensual de Reservas'}
              {viewMode === 'LIST' && 'Registro General de Reservas y Pagos'}
            </h2>
            <p className="text-xs text-gray-400">
              {viewMode === 'TIMELINE' && 'Visualiza la disponibilidad, clases continuas y reservas turno a turno.'}
              {viewMode === 'CALENDAR' && 'Explora el volumen diario de actividad del club en cada fecha.'}
              {viewMode === 'LIST' && 'Filtra y verifica pagos QR, solicitudes de socios y bloques deportivos.'}
            </p>
          </div>

          {/* View Mode Buttons */}
          <div className="flex bg-gray-100 dark:bg-black/50 rounded-xl p-1 border border-gray-200 dark:border-white/10 self-stretch sm:self-auto">
            <button 
              onClick={() => setViewMode('TIMELINE')}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                viewMode === 'TIMELINE' ? 'bg-brand-gold text-black shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <LayoutGrid size={15} /> Cronograma en Vivo
            </button>
            <button 
              onClick={() => setViewMode('CALENDAR')}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                viewMode === 'CALENDAR' ? 'bg-brand-gold text-black shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid size={15} /> Calendario
            </button>
            <button 
              onClick={() => setViewMode('LIST')}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                viewMode === 'LIST' ? 'bg-brand-gold text-black shadow-md' : 'text-gray-400 hover:text-white'
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
            onDeleteReservation={handleDeleteReservation}
            onDeleteRecurringGroup={handleDeleteRecurringGroup}
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
            
            {/* Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-black/30 p-4 rounded-xl border border-white/5">
              
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input 
                  type="text"
                  placeholder="Buscar socio, invitado..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-brand-gold placeholder-gray-500"
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
                    <th className="py-3.5 px-4 font-bold">Fecha / Horario</th>
                    <th className="py-3.5 px-4 font-bold">Cancha / Deporte</th>
                    <th className="py-3.5 px-4 font-bold">Titular & Modalidad</th>
                    <th className="py-3.5 px-4 font-bold">Monto & Pago</th>
                    <th className="py-3.5 px-4 font-bold">Estado Reserva</th>
                    <th className="py-3.5 px-4 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {loading ? (
                    <tr><td colSpan={6} className="py-12 text-center text-gray-400">Cargando registros...</td></tr>
                  ) : filteredForList.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-gray-400">No se encontraron reservas con los filtros aplicados.</td></tr>
                  ) : (
                    filteredForList.map(res => {
                      const isVerified = res.paymentStatus === 'VERIFIED';
                      const isPaid = res.paymentStatus === 'PAID';
                      const isPending = !res.paymentStatus || res.paymentStatus === 'PENDING_PAYMENT';
                      const hasReceipt = !!res.paymentReceiptUrl;

                      return (
                        <tr key={res.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 mb-1">
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
                            </div>
                            <div className="text-[11px] text-brand-gold font-mono">{res.startTime} - {res.endTime}</div>
                          </td>
                          
                          <td className="py-3 px-4">
                            <div className="font-semibold text-gray-200">{res.court?.name}</div>
                            <div className="text-[10px] text-brand-gold-light">{res.court?.sport}</div>
                          </td>
                          
                          <td className="py-3 px-4">
                            <div className="font-bold text-white uppercase">{res.title || res.memberName}</div>
                            {res.memberCode && res.memberCode !== 'ADMIN_BLOCK' && (
                              <div className="text-[10px] text-gray-400">Socio: {res.memberCode} {res.memberPhone ? `• ${res.memberPhone}` : ''}</div>
                            )}
                            {/* Modalidad Badge */}
                            {res.reservationType === 'MEMBER' && (
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  res.playerType === 'GUESTS' 
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                                    : res.playerType === 'MEMBERS'
                                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}>
                                  {res.playerType === 'GUESTS' ? `👥 Con ${res.guestsCount || 1} Invitado(s)` : res.playerType === 'MEMBERS' ? '🎾 Socios' : '👨‍👩‍👧‍👦 Familia'}
                                </span>
                                {res.playerNames && (
                                  <span className="text-[10px] text-gray-400 italic truncate max-w-xs" title={res.playerNames}>
                                    ({res.playerNames})
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          
                          {/* Monto & Pago Column */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-white font-mono text-sm">
                              Bs. {res.totalPrice ?? (res.courtFee ?? (res.court?.hourlyRate ?? 30))}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              {isVerified ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-sm">
                                  <Check className="w-2.5 h-2.5 text-emerald-400" /> Pago Validado (Consolidada)
                                </span>
                              ) : isPaid ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5 text-amber-400" /> En Proceso (Validando)
                                </span>
                              ) : res.paymentStatus === 'EXEMPT' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-gray-500/20 text-gray-400">
                                  Exento
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 animate-pulse">
                                  <AlertCircle className="w-2.5 h-2.5 text-amber-400" /> En Proceso (Pendiente)
                                </span>
                              )}

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
                            {isVerified || res.status === 'APPROVED' ? (
                              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-bold">
                                {isVerified ? 'Reserva Consolidada' : 'Aprobada'}
                              </span>
                            ) : res.status === 'PENDING' ? (
                              <span className="px-2.5 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-[10px] font-bold">
                                Reserva en Proceso
                              </span>
                            ) : res.status === 'REJECTED' ? (
                              <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 rounded-full text-[10px] font-bold">
                                Rechazada
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-gray-500/20 text-gray-400 rounded-full text-[10px] font-bold">
                                Cancelada
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end items-center gap-1.5">
                              {/* Quick Verify Payment Button */}
                              {!isVerified && res.reservationType === 'MEMBER' && (
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

      {/* Create Continuous Block Modal */}
      <AdminCreateBlockModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        courts={courts}
        onSuccess={() => {
          fetchReservations();
          fetchCourts();
        }}
        initialDate={modalInitialDate}
        initialSport={modalInitialSport}
      />

      {/* WhatsApp Reservas Connector Modal */}
      {showWhatsAppModal && (
        <WhatsAppConnectorModal
          onClose={() => {
            setShowWhatsAppModal(false);
            checkWaStatus();
          }}
          clientId="chls-reservas"
          title="WhatsApp Reservas Deportivas"
          subtitle="Línea oficial exclusiva para confirmaciones, comprobantes de pago y auditoría de canchas."
        />
      )}

    </div>
  );
};

