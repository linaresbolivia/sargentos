import React, { useState, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  User, 
  Info,
  Dumbbell,
  Wrench,
  Trophy,
  Sparkles,
  Layers,
  Pencil,
  QrCode
} from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
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
  onEditReservation?: (reservation: Reservation) => void;
  onViewQrDetails?: (reservation: Reservation) => void;
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
  onEditReservation,
  onViewQrDetails,
  onOpenCreateBlock,
  selectedSport,
  onChangeSport,
  loading = false,
}) => {
  const [selectedSlotDetails, setSelectedSlotDetails] = useState<Reservation | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

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
          
          {/* Interactive Date Picker Container */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (dateInputRef.current?.showPicker) {
                  dateInputRef.current.showPicker();
                } else {
                  dateInputRef.current?.focus();
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-black/50 hover:bg-black/70 rounded-xl border border-brand-gold/30 hover:border-brand-gold text-left transition-all group shadow-sm cursor-pointer"
              title="Haz clic para abrir el selector de calendario"
            >
              <CalendarIcon className="w-4 h-4 text-brand-gold group-hover:scale-110 transition-transform" />
              <span className="font-bold text-sm text-white capitalize">
                {format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es })}
              </span>
              <span className="text-[10px] text-brand-gold/80 bg-brand-gold/10 px-1.5 py-0.5 rounded border border-brand-gold/20 font-mono">
                📅 Calendario
              </span>
            </button>
            <input
              ref={dateInputRef}
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                if (e.target.value) {
                  const [y, m, d] = e.target.value.split('-').map(Number);
                  onChangeDate(new Date(y, m - 1, d));
                }
              }}
              className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
              tabIndex={-1}
            />
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

      {/* Grid Timeline Header & Matrix Container */}
      <div className="overflow-x-auto border border-gray-200 dark:border-white/10 rounded-2xl bg-white/5 dark:bg-black/20">
        
        {/* Timeline Matrix */}
        <div className="min-w-[1000px]">
          
          {/* Header Row: Hours */}
          <div className="grid grid-cols-[180px_repeat(16,1fr)] border-b border-gray-200 dark:border-white/10 bg-black/40 text-xs font-bold text-gray-400 sticky top-0 z-10">
            <div className="p-3 border-r border-white/10 text-brand-gold flex items-center justify-between">
              <span>Cancha / Espacio</span>
              <Layers className="w-3.5 h-3.5" />
            </div>
            {HOURS.map(hour => (
              <div key={hour} className="p-3 text-center border-r border-white/5 font-mono text-[11px]">
                {hour}
              </div>
            ))}
          </div>

          {/* Body Rows: One per court */}
          {loading ? (
            <div className="py-16 text-center text-gray-400">
              <div className="inline-block w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin mb-2"></div>
              <p>Cargando cronograma en vivo...</p>
            </div>
          ) : filteredCourts.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No hay canchas configuradas para esta disciplina.
            </div>
          ) : (
            filteredCourts.map(court => (
              <div 
                key={court.id}
                className="grid grid-cols-[180px_repeat(16,1fr)] border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
              >
                {/* Court Name Column */}
                <div className="p-3 border-r border-white/10 bg-black/30 flex flex-col justify-center">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white group-hover:text-brand-gold transition-colors truncate" title={court.name}>
                      {court.name}
                    </span>
                    <button
                      onClick={() => onOpenCreateBlock(court.id, court.sport)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-brand-gold/20 text-brand-gold rounded transition-opacity"
                      title="Bloquear o programar clases en esta cancha"
                    >
                      <Sparkles className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-400">{court.sport}</span>
                </div>

                {/* Hour Slots Columns */}
                {HOURS.map(hour => {
                  const res = getSlotReservation(court.id, hour);
                  
                  if (!res) {
                    return (
                      <div
                        key={hour}
                        onClick={() => onOpenCreateBlock(court.id, court.sport)}
                        className="border-r border-white/5 p-1 min-h-[55px] cursor-pointer hover:bg-brand-gold/10 transition-colors flex items-center justify-center group/slot"
                        title={`Disponible: Clic para programar clase/bloqueo a las ${hour}`}
                      >
                        <span className="opacity-0 group-hover/slot:opacity-100 text-[10px] text-brand-gold font-bold">
                          +
                        </span>
                      </div>
                    );
                  }

                  const isClass = res.reservationType === 'CLASS' || res.reservationType === 'ESCUELA_DEPORTIVA';
                  const isMaintenance = res.reservationType === 'MAINTENANCE';
                  const isTournament = res.reservationType === 'TOURNAMENT';
                  const isClubEvent = res.reservationType === 'EVENTO_CLUB' || res.reservationType === 'CIERRE_CANCHA';

                  let badgeColor = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300';
                  let Icon = User;

                  if (isClass) {
                    badgeColor = 'bg-amber-500/20 border-amber-500/40 text-amber-300';
                    Icon = Dumbbell;
                  } else if (isMaintenance) {
                    badgeColor = 'bg-rose-500/20 border-rose-500/40 text-rose-300';
                    Icon = Wrench;
                  } else if (isTournament) {
                    badgeColor = 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300';
                    Icon = Trophy;
                  } else if (isClubEvent) {
                    badgeColor = 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300';
                    Icon = Sparkles;
                  }

                  return (
                    <div
                      key={hour}
                      onClick={() => setSelectedSlotDetails(res)}
                      className="border-r border-white/5 p-1 min-h-[55px] cursor-pointer"
                    >
                      <div className={`h-full w-full rounded-lg border p-1.5 flex flex-col justify-between transition-all hover:scale-105 shadow-sm ${badgeColor}`}>
                        <div className="flex items-center justify-between gap-1">
                          <Icon className="w-3 h-3 shrink-0" />
                          <span className="text-[9px] font-mono opacity-80">{res.startTime}</span>
                        </div>
                        <p className="text-[10px] font-bold truncate leading-tight mt-0.5">
                          {res.title || res.memberName}
                        </p>
                      </div>
                    </div>
                  );
                })}

              </div>
            ))
          )}

        </div>

      </div>

      {/* Selected Slot Details Popover Modal */}
      {selectedSlotDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b1610] border border-brand-gold/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-brand-gold" />
                Detalles del Turno
              </h3>
              <button 
                onClick={() => setSelectedSlotDetails(null)}
                className="p-1 rounded-xl text-gray-400 hover:text-white hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-gray-300">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Espacio / Cancha:</span>
                <strong className="text-white">{selectedSlotDetails.court?.name}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Fecha:</span>
                <span className="text-white font-mono">{selectedSlotDetails.date}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Horario:</span>
                <span className="text-brand-gold font-mono font-bold">{selectedSlotDetails.startTime} - {selectedSlotDetails.endTime}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-gray-400">Actividad / Socio:</span>
                <strong className="text-white">{selectedSlotDetails.title || selectedSlotDetails.memberName}</strong>
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
              {selectedSlotDetails.playerNames && (
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Acompañantes / Invitados:</span>
                  <span className="font-medium text-emerald-300">{selectedSlotDetails.playerNames}</span>
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
              {/* Ver QR y Mensaje Button */}
              {onViewQrDetails && (
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedSlotDetails;
                    setSelectedSlotDetails(null);
                    onViewQrDetails(target);
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  <span>Ver QR, Mensaje & Datos de Pre-Reserva</span>
                </button>
              )}

              {/* Edit Button */}
              {onEditReservation && (
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedSlotDetails;
                    setSelectedSlotDetails(null);
                    onEditReservation(target);
                  }}
                  className="w-full py-2 rounded-xl bg-brand-gold/15 hover:bg-brand-gold/25 border border-brand-gold/40 text-brand-gold font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Pencil className="w-4 h-4" />
                  <span>Editar Datos / Horario de este Turno</span>
                </button>
              )}

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
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar serie continua
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
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar este turno
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
