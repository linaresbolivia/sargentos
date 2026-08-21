import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  CalendarX,
  Clock, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  User, 
  Info,
  Dumbbell,
  Wrench,
  Trophy,
  Sparkles,
  Layers
} from 'lucide-react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Court {
  id: string;
  name: string;
  sport: string;
  description?: string | null;
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
  totalPrice?: number;
  paymentStatus?: 'PENDING_PAYMENT' | 'PAID' | 'VERIFIED' | 'EXEMPT';
  paymentReceiptUrl?: string | null;
  title?: string | null;
  notes?: string | null;
  isRecurring?: boolean;
  recurringGroupId?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
}

interface AdminTimelineViewProps {
  courts: Court[];
  reservations: Reservation[];
  selectedDate: Date;
  onChangeDate: (date: Date) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onDeleteReservation: (id: string) => void;
  onDeleteRecurringGroup?: (groupId: string) => void;
  onOpenCreateBlock: (courtId?: string, sport?: string) => void;
  selectedSport: string;
  onChangeSport: (sport: string) => void;
  loading?: boolean;
}

const HOURS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', 
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', 
  '18:00', '19:00', '20:00', '21:00'
];

export const AdminTimelineView: React.FC<AdminTimelineViewProps> = ({
  courts,
  reservations,
  selectedDate,
  onChangeDate,
  onUpdateStatus,
  onDeleteReservation,
  onDeleteRecurringGroup,
  onOpenCreateBlock,
  selectedSport,
  onChangeSport,
  loading = false,
}) => {
  const [selectedSlotDetails, setSelectedSlotDetails] = useState<Reservation | null>(null);

  const sports = Array.from(new Set(courts.map(c => c.sport)));
  const filteredCourts = selectedSport === 'ALL' 
    ? courts 
    : courts.filter(c => c.sport === selectedSport);

  // Helper to find reservation for a court and hour slot
  const getSlotReservation = (courtId: string, hourStr: string) => {
    return reservations.find(r => {
      if (r.courtId !== courtId) return false;
      if (['REJECTED', 'CANCELLED'].includes(r.status)) return false;
      
      const [slotHour] = hourStr.split(':').map(Number);
      const [startHour] = r.startTime.split(':').map(Number);
      const [endHour] = r.endTime.split(':').map(Number);

      return slotHour >= startHour && slotHour < endHour;
    });
  };

  // KPI calculations for selected date
  const activeRes = reservations.filter(r => ['PENDING', 'APPROVED'].includes(r.status));
  const memberBookings = activeRes.filter(r => r.reservationType === 'MEMBER').length;
  const classesCount = activeRes.filter(r => r.reservationType === 'CLASS' || r.reservationType === 'ESCUELA_DEPORTIVA').length;
  const maintenanceCount = activeRes.filter(r => r.reservationType === 'MAINTENANCE').length;
  const pendingCount = activeRes.filter(r => r.status === 'PENDING').length;

  return (
    <div className="space-y-4 animate-fade-in">
      
      {/* Date & Sport Navigation Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white/5 dark:bg-black/30 p-4 rounded-2xl border border-gray-200 dark:border-white/10">
        
        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChangeDate(subDays(selectedDate, 1))}
            className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-brand-gold transition-colors"
            title="Día anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-xl border border-white/10">
            <CalendarIcon className="w-4 h-4 text-brand-gold" />
            <span className="font-bold text-sm text-white capitalize">
              {format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}
            </span>
          </div>

          <button
            onClick={() => onChangeDate(addDays(selectedDate, 1))}
            className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-brand-gold transition-colors"
            title="Día siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => onChangeDate(new Date())}
            className="px-3 py-1.5 rounded-xl bg-brand-gold/15 border border-brand-gold/30 text-brand-gold text-xs font-bold hover:bg-brand-gold/25 transition-colors ml-1"
          >
            Hoy
          </button>
        </div>

        {/* Sport Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => onChangeSport('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedSport === 'ALL'
                ? 'bg-brand-gold text-[#0a150e] shadow-[0_0_10px_rgba(204,161,75,0.4)]'
                : 'bg-black/30 text-gray-400 hover:text-white border border-white/5'
            }`}
          >
            Todos ({courts.length})
          </button>
          {sports.map(sport => {
            const count = courts.filter(c => c.sport === sport).length;
            const isSelected = selectedSport === sport;
            return (
              <button
                key={sport}
                onClick={() => onChangeSport(sport)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-brand-gold text-[#0a150e] shadow-[0_0_10px_rgba(204,161,75,0.4)]'
                    : 'bg-black/30 text-gray-400 hover:text-white border border-white/5'
                }`}
              >
                {sport} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Mini KPIs & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-gray-400 font-medium">Estado en vivo:</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Disponible
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-gold/15 text-brand-gold border border-brand-gold/30">
            <span className="w-2 h-2 rounded-full bg-brand-gold"></span>
            Reserva Socio ({memberBookings})
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Dumbbell className="w-3.5 h-3.5" />
            Clases ({classesCount})
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <Wrench className="w-3.5 h-3.5" />
            Mantenimiento ({maintenanceCount})
          </span>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 animate-pulse font-bold">
              {pendingCount} Pendientes de aprobación
            </span>
          )}
        </div>

        <button
          onClick={() => onOpenCreateBlock(undefined, selectedSport !== 'ALL' ? selectedSport : undefined)}
          className="glass-button-primary px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5"
        >
          <Sparkles className="w-4 h-4" />
          <span>+ Añadir Ocupación / Clases</span>
        </button>
      </div>

      {/* Timeline Grid Table */}
      <div className="bg-[#0a140f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse text-left min-w-[1200px]">
            {/* Header: Hours */}
            <thead>
              <tr className="bg-black/60 border-b border-white/10 text-xs font-bold text-gray-400">
                <th className="py-3.5 px-4 w-60 sticky left-0 z-20 bg-[#070e0a] border-r border-white/10 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center gap-2 text-brand-gold uppercase tracking-wider">
                    <Layers className="w-4 h-4" /> Canchas ({filteredCourts.length})
                  </div>
                </th>
                {HOURS.map(hour => (
                  <th key={hour} className="py-3 px-2 text-center border-r border-white/5 text-[11px] font-mono text-gray-300 min-w-[64px]">
                    {hour}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Rows: Courts */}
            <tbody className="divide-y divide-white/5 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={HOURS.length + 1} className="py-16 text-center text-gray-400">
                    <div className="inline-block w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p>Cargando cronograma en vivo...</p>
                  </td>
                </tr>
              ) : filteredCourts.length === 0 ? (
                <tr>
                  <td colSpan={HOURS.length + 1} className="py-12 text-center text-gray-400">
                    No hay canchas registradas para la categoría seleccionada.
                  </td>
                </tr>
              ) : (
                filteredCourts.map(court => (
                  <tr key={court.id} className="hover:bg-white/[0.02] transition-colors">
                    
                    {/* Court Info Sticky Column */}
                    <td className="py-3 px-4 sticky left-0 z-10 bg-[#09120c] border-r border-white/10 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">
                      <div className="font-bold text-white text-xs truncate" title={court.name}>
                        {court.name}
                      </div>
                      <div className="flex items-center justify-between gap-1 text-[10px] text-brand-gold-light mt-0.5">
                        <span className="font-medium">{court.sport}</span>
                        <button
                          onClick={() => onOpenCreateBlock(court.id, court.sport)}
                          className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-[10px] text-gray-400 hover:text-brand-gold underline"
                          title="Bloquear esta cancha"
                        >
                          + Ocupar
                        </button>
                      </div>
                    </td>

                    {/* Hourly Slots */}
                    {HOURS.map(hour => {
                      const res = getSlotReservation(court.id, hour);

                      if (!res) {
                        // Empty / Available Slot
                        return (
                          <td 
                            key={hour} 
                            onClick={() => onOpenCreateBlock(court.id, court.sport)}
                            className="p-1 border-r border-white/5 text-center cursor-pointer hover:bg-emerald-500/10 group transition-all"
                            title={`Disponible - Clic para programar ocupación en ${court.name} a las ${hour}`}
                          >
                            <div className="h-10 rounded-lg border border-dashed border-white/5 group-hover:border-emerald-500/40 flex items-center justify-center text-transparent group-hover:text-emerald-400 text-[10px] font-bold">
                              +
                            </div>
                          </td>
                        );
                      }

                      // Occupied Slot Styling
                      const isPending = res.status === 'PENDING';
                      const isClass = res.reservationType === 'CLASS' || res.reservationType === 'ESCUELA_DEPORTIVA';
                      const isMaintenance = res.reservationType === 'MAINTENANCE';
                      const isTournament = res.reservationType === 'TOURNAMENT';
                      const isCierre = res.reservationType === 'CIERRE_CANCHA' || res.reservationType === 'EVENTO_CLUB';

                      let badgeBg = 'bg-brand-gold/20 border-brand-gold/50 text-brand-gold';
                      let icon = <User className="w-3 h-3 shrink-0" />;

                      if (isCierre) {
                        badgeBg = 'bg-rose-500/25 border-rose-500/60 text-rose-200 shadow-[0_0_8px_rgba(244,63,94,0.25)]';
                        icon = <CalendarX className="w-3 h-3 shrink-0 text-rose-400" />;
                      } else if (isClass) {
                        badgeBg = 'bg-amber-500/20 border-amber-500/50 text-amber-300';
                        icon = <Dumbbell className="w-3 h-3 shrink-0" />;
                      } else if (isMaintenance) {
                        badgeBg = 'bg-orange-500/20 border-orange-500/50 text-orange-300';
                        icon = <Wrench className="w-3 h-3 shrink-0" />;
                      } else if (isTournament) {
                        badgeBg = 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300';
                        icon = <Trophy className="w-3 h-3 shrink-0" />;
                      } else if (isPending) {
                        badgeBg = 'bg-yellow-500/20 border-yellow-500/60 text-yellow-200 animate-pulse';
                      }

                      return (
                        <td key={hour} className="p-1 border-r border-white/5 text-center">
                          <div
                            onClick={() => setSelectedSlotDetails(res)}
                            className={`h-10 px-1.5 rounded-lg border flex flex-col justify-center items-start cursor-pointer hover:scale-[1.03] transition-all shadow-sm ${badgeBg}`}
                            title={`${res.title || res.memberName} (${res.startTime} - ${res.endTime}) - Clic para detalles`}
                          >
                            <div className="flex items-center gap-1 w-full truncate">
                              {icon}
                              <span className="text-[10px] font-bold truncate leading-none">
                                {res.title || res.memberName}
                              </span>
                            </div>
                            <span className="text-[9px] opacity-75 font-mono leading-none mt-1 truncate">
                              {res.startTime}-{res.endTime}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Slot Details & Quick Admin Actions */}
      {selectedSlotDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0d1813] border border-brand-gold/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-brand-gold">
                  Detalles de la Ocupación
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {selectedSlotDetails.title || selectedSlotDetails.memberName}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedSlotDetails(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Info Grid */}
            <div className="space-y-2.5 text-xs text-gray-300 bg-black/40 p-4 rounded-xl border border-white/5">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Cancha:</span>
                <span className="font-bold text-white">{selectedSlotDetails.court?.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Deporte:</span>
                <span className="font-bold text-brand-gold">{selectedSlotDetails.court?.sport}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Código de Reserva:</span>
                <span className="font-mono font-bold text-brand-gold bg-brand-gold/15 px-2 py-0.5 rounded border border-brand-gold/30">
                  #{selectedSlotDetails.code || selectedSlotDetails.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Fecha:</span>
                <span className="font-bold text-white">{selectedSlotDetails.date}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Horario:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {selectedSlotDetails.startTime} - {selectedSlotDetails.endTime}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Tipo de Reserva:</span>
                <span className="font-bold text-amber-400">{selectedSlotDetails.reservationType}</span>
              </div>
              {selectedSlotDetails.memberCode && selectedSlotDetails.memberCode !== 'ADMIN_BLOCK' && (
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Código de Socio:</span>
                  <span className="font-bold text-white">{selectedSlotDetails.memberCode}</span>
                </div>
              )}
              {selectedSlotDetails.notes && (
                <div className="py-1">
                  <span className="text-gray-400 block mb-0.5">Notas / Instructor:</span>
                  <span className="text-gray-200 italic">{selectedSlotDetails.notes}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Estado:</span>
                <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                  selectedSlotDetails.paymentStatus === 'VERIFIED' || selectedSlotDetails.status === 'APPROVED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : selectedSlotDetails.paymentStatus === 'PAID'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 animate-pulse'
                }`}>
                  {selectedSlotDetails.paymentStatus === 'VERIFIED' || selectedSlotDetails.status === 'APPROVED'
                    ? '🟢 Reserva Consolidada' 
                    : selectedSlotDetails.paymentStatus === 'PAID'
                    ? '🟡 En Proceso (Validando Pago)'
                    : '🟠 Reserva en Proceso'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              {selectedSlotDetails.status === 'PENDING' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      onUpdateStatus(selectedSlotDetails.id, 'APPROVED');
                      setSelectedSlotDetails(null);
                    }}
                    className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" /> Aprobar
                  </button>
                  <button
                    onClick={() => {
                      onUpdateStatus(selectedSlotDetails.id, 'REJECTED');
                      setSelectedSlotDetails(null);
                    }}
                    className="p-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-rose-500/40"
                  >
                    <XCircle className="w-4 h-4" /> Rechazar
                  </button>
                </div>
              )}

              <div className="flex justify-between items-center gap-2 pt-2 border-t border-white/10">
                {selectedSlotDetails.recurringGroupId && onDeleteRecurringGroup && (
                  <button
                    onClick={() => {
                      if (window.confirm('¿Deseas eliminar TODA la serie de clases/bloqueos programados con este grupo?')) {
                        onDeleteRecurringGroup(selectedSlotDetails.recurringGroupId!);
                        setSelectedSlotDetails(null);
                      }
                    }}
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar toda la serie continua
                  </button>
                )}

                <button
                  onClick={() => {
                    if (window.confirm('¿Eliminar esta reserva/bloqueo individual?')) {
                      onDeleteReservation(selectedSlotDetails.id);
                      setSelectedSlotDetails(null);
                    }
                  }}
                  className="text-[11px] text-rose-400 hover:underline flex items-center gap-1 ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar solo este turno
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
