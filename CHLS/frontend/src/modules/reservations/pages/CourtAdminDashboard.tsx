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
  Trophy
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AdminReservationCalendar } from '../components/AdminReservationCalendar';
import { AdminTimelineView } from '../components/AdminTimelineView';
import { AdminCreateBlockModal } from '../components/AdminCreateBlockModal';
import CrestLogo from '@shared/components/CrestLogo';

interface Court {
  id: string;
  name: string;
  sport: string;
  description?: string | null;
}

interface Reservation {
  id: string;
  courtId: string;
  court: Court;
  date: string;
  startTime: string;
  endTime: string;
  memberCode?: string | null;
  memberName: string;
  memberPhone?: string | null;
  reservationType: string;
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Create block modal state
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>();
  const [modalInitialSport, setModalInitialSport] = useState<string | undefined>();

  useEffect(() => {
    fetchCourts();
    fetchReservations();
  }, []);

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
  const classesAndBlocksCount = reservations.filter(r => 
    ['CLASS', 'MAINTENANCE', 'TOURNAMENT', 'ESCUELA_DEPORTIVA', 'EVENTO_CLUB'].includes(r.reservationType) &&
    r.status === 'APPROVED'
  ).length;

  // Filtered for List View
  const filteredForList = reservations.filter(r => {
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    if (filterType !== 'ALL' && r.reservationType !== filterType) return false;
    if (selectedSport !== 'ALL' && r.court?.sport !== selectedSport) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.memberName.toLowerCase().includes(q);
      const matchTitle = (r.title || '').toLowerCase().includes(q);
      const matchCourt = (r.court?.name || '').toLowerCase().includes(q);
      const matchCode = (r.memberCode || '').toLowerCase().includes(q);
      if (!matchName && !matchTitle && !matchCourt && !matchCode) return false;
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
            onClick={() => handleOpenBlockModal()}
            className="glass-button-primary px-4 py-2.5 text-xs font-bold flex items-center gap-2 shadow-goldGlow"
          >
            <Sparkles className="w-4 h-4" />
            <span>+ Programar Clases / Ocupaciones</span>
          </button>
          
          <button 
            onClick={() => { fetchReservations(); fetchCourts(); }}
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total */}
        <div className="glass-panel p-5 border-l-4 border-brand-gold relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 text-brand-gold/15 dark:text-brand-gold/10">
            <CalendarDays size={80} />
          </div>
          <div className="relative z-10">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Total Movimientos</p>
            <h3 className="text-3xl font-bold theme-text">{totalCount}</h3>
          </div>
        </div>
        
        {/* Aprobadas */}
        <div className="glass-panel p-5 border-l-4 border-emerald-500 relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 text-emerald-500/15 dark:text-emerald-500/10">
            <CheckCircle size={80} />
          </div>
          <div className="relative z-10">
            <p className="text-xs text-emerald-400 uppercase tracking-widest font-bold mb-1">Aprobadas / Activas</p>
            <h3 className="text-3xl font-bold theme-text">{approvedCount}</h3>
          </div>
        </div>

        {/* Pendientes */}
        <div className="glass-panel p-5 border-l-4 border-amber-500 relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 text-amber-500/15 dark:text-amber-500/10">
            <Clock size={80} />
          </div>
          <div className="relative z-10">
            <p className="text-xs text-amber-400 uppercase tracking-widest font-bold mb-1">Pendientes</p>
            <h3 className="text-3xl font-bold theme-text">{pendingCount}</h3>
          </div>
        </div>

        {/* Clases / Bloqueos */}
        <div className="glass-panel p-5 border-l-4 border-indigo-500 relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 text-indigo-500/15 dark:text-indigo-500/10">
            <Dumbbell size={80} />
          </div>
          <div className="relative z-10">
            <p className="text-xs text-indigo-400 uppercase tracking-widest font-bold mb-1">Clases & Bloqueos</p>
            <h3 className="text-3xl font-bold theme-text">{classesAndBlocksCount}</h3>
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
              {viewMode === 'LIST' && 'Registro General de Reservas y Ocupaciones'}
            </h2>
            <p className="text-xs text-gray-400">
              {viewMode === 'TIMELINE' && 'Visualiza la disponibilidad, clases continuas y reservas turno a turno.'}
              {viewMode === 'CALENDAR' && 'Explora el volumen diario de actividad del club en cada fecha.'}
              {viewMode === 'LIST' && 'Filtra y busca solicitudes de socios o bloques institucionales.'}
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
              <ListIcon size={15} /> Lista
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-black/30 p-4 rounded-xl border border-white/5">
              
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input 
                  type="text"
                  placeholder="Buscar socio, título o cancha..."
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
                  <option value="ALL">Todos los Estados</option>
                  <option value="PENDING">Pendientes</option>
                  <option value="APPROVED">Aprobadas</option>
                  <option value="REJECTED">Rechazadas</option>
                  <option value="CANCELLED">Canceladas</option>
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
                    <th className="py-3.5 px-4 font-bold">Titular / Actividad</th>
                    <th className="py-3.5 px-4 font-bold">Tipo</th>
                    <th className="py-3.5 px-4 font-bold">Estado</th>
                    <th className="py-3.5 px-4 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {loading ? (
                    <tr><td colSpan={6} className="py-12 text-center text-gray-400">Cargando registros...</td></tr>
                  ) : filteredForList.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-gray-400">No se encontraron reservas con los filtros aplicados.</td></tr>
                  ) : (
                    filteredForList.map(res => (
                      <tr key={res.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{format(parseISO(res.date), 'dd/MM/yyyy')}</div>
                          <div className="text-[11px] text-brand-gold font-mono">{res.startTime} - {res.endTime}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-200">{res.court?.name}</div>
                          <div className="text-[10px] text-brand-gold-light">{res.court?.sport}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white uppercase">{res.title || res.memberName}</div>
                          {res.memberCode && res.memberCode !== 'ADMIN_BLOCK' && (
                            <div className="text-[10px] text-gray-400">Socio: {res.memberCode}</div>
                          )}
                          {res.notes && (
                            <div className="text-[10px] text-gray-400 italic truncate max-w-xs">{res.notes}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {res.reservationType === 'CLASS' && <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">Clase</span>}
                          {res.reservationType === 'MAINTENANCE' && <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">Mantenimiento</span>}
                          {res.reservationType === 'TOURNAMENT' && <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[10px]">Torneo</span>}
                          {res.reservationType === 'MEMBER' && <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">Socio</span>}
                          {res.reservationType === 'ESCUELA_DEPORTIVA' && <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[10px]">Escuela</span>}
                        </td>
                        <td className="py-3 px-4">
                          {res.status === 'PENDING' && <span className="px-2.5 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-[10px] font-bold">Pendiente</span>}
                          {res.status === 'APPROVED' && <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-bold">Aprobada</span>}
                          {res.status === 'REJECTED' && <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 rounded-full text-[10px] font-bold">Rechazada</span>}
                          {res.status === 'CANCELLED' && <span className="px-2.5 py-1 bg-gray-500/20 text-gray-400 rounded-full text-[10px] font-bold">Cancelada</span>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            {res.status === 'PENDING' && (
                              <>
                                <button 
                                  onClick={() => handleUpdateStatus(res.id, 'APPROVED')} 
                                  className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg transition-colors" 
                                  title="Aprobar"
                                >
                                  <CheckCircle size={16} />
                                </button>
                                <button 
                                  onClick={() => handleUpdateStatus(res.id, 'REJECTED')} 
                                  className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg transition-colors" 
                                  title="Rechazar"
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
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>

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

    </div>
  );
};
