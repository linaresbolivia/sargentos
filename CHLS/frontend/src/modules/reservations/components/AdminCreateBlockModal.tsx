import React, { useState, useMemo, useEffect } from 'react';
import { api } from '@config/api';
import toast from 'react-hot-toast';
import { 
  X, 
  Calendar, 
  Clock, 
  Layers, 
  CheckSquare, 
  Square, 
  Sparkles, 
  AlertCircle,
  Dumbbell,
  Wrench,
  Trophy,
  GraduationCap,
  Bookmark,
  CalendarX,
  User,
  Pencil,
  Check,
  CheckCircle2
} from 'lucide-react';
import { format, addDays, addMonths } from 'date-fns';

interface Court {
  id: string;
  name: string;
  sport: string;
}

interface AdminCreateBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  courts: Court[];
  onSuccess: () => void;
  initialDate?: string;
  initialSport?: string;
  editingReservation?: any | null;
}

const TIME_SLOTS_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', 
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', 
  '18:00', '19:00', '20:00', '21:00', '22:00'
];

const DAYS_OF_WEEK = [
  { label: 'Lun', value: 1, full: 'Lunes' },
  { label: 'Mar', value: 2, full: 'Martes' },
  { label: 'Mié', value: 3, full: 'Miércoles' },
  { label: 'Jue', value: 4, full: 'Jueves' },
  { label: 'Vie', value: 5, full: 'Viernes' },
  { label: 'Sáb', value: 6, full: 'Sábado' },
  { label: 'Dom', value: 0, full: 'Domingo' },
];

export const AdminCreateBlockModal: React.FC<AdminCreateBlockModalProps> = ({
  isOpen,
  onClose,
  courts,
  onSuccess,
  initialDate,
  initialSport,
  editingReservation
}) => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isEditing = !!editingReservation;
  
  const [reservationType, setReservationType] = useState<string>('CIERRE_CANCHA');
  const [title, setTitle] = useState('Cierre de Canchas - Mantenimiento y Adecuación');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState(initialDate || todayStr);
  const [endDate, setEndDate] = useState(initialDate || format(addDays(new Date(), 2), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('22:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>([]);
  const [selectedSportFilter, setSelectedSportFilter] = useState<string>(initialSport || 'ALL');
  const [playerNames, setPlayerNames] = useState('');
  const [status, setStatus] = useState('APPROVED');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar datos cuando se abre el modal (creación o edición)
  useEffect(() => {
    if (isOpen) {
      if (editingReservation) {
        setReservationType(editingReservation.reservationType || 'CIERRE_CANCHA');
        setTitle(editingReservation.title || editingReservation.memberName || '');
        setNotes(editingReservation.notes || '');
        setStartDate(editingReservation.date || todayStr);
        setEndDate(editingReservation.date || todayStr);
        setStartTime(editingReservation.startTime || '08:00');
        setEndTime(editingReservation.endTime || '09:00');
        setSelectedCourtIds(editingReservation.courtId ? [editingReservation.courtId] : []);
        setSelectedSportFilter(editingReservation.court?.sport || 'ALL');
        setPlayerNames(editingReservation.playerNames || '');
        setStatus(editingReservation.status || 'APPROVED');
        if (editingReservation.date) {
          const [y, m, d] = editingReservation.date.split('-').map(Number);
          const dt = new Date(y, m - 1, d);
          setSelectedDays([dt.getDay()]);
        }
      } else {
        setReservationType('CIERRE_CANCHA');
        setTitle('Cierre de Canchas - Mantenimiento y Adecuación');
        setNotes('');
        const start = initialDate || todayStr;
        setStartDate(start);
        setEndDate(initialDate || format(addDays(new Date(), 2), 'yyyy-MM-dd'));
        setStartTime('06:00');
        setEndTime('22:00');
        setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
        setSelectedCourtIds([]);
        setSelectedSportFilter(initialSport || 'ALL');
        setPlayerNames('');
        setStatus('APPROVED');
      }
    }
  }, [isOpen, editingReservation, initialDate, initialSport, todayStr]);

  // Helper para calcular días de la semana en el rango seleccionado
  const computeDaysInRange = (startStr: string, endStr: string): number[] => {
    try {
      const [sY, sM, sD] = startStr.split('-').map(Number);
      const [eY, eM, eD] = endStr.split('-').map(Number);
      const s = new Date(sY, sM - 1, sD);
      const e = new Date(eY, eM - 1, eD);
      if (s > e) return [0, 1, 2, 3, 4, 5, 6];
      const days = new Set<number>();
      let cur = new Date(s);
      let count = 0;
      while (cur <= e && count < 365) {
        days.add(cur.getDay());
        cur.setDate(cur.getDate() + 1);
        count++;
      }
      return Array.from(days);
    } catch {
      return [0, 1, 2, 3, 4, 5, 6];
    }
  };

  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    if (isEditing) {
      setEndDate(newStart);
      const [y, m, d] = newStart.split('-').map(Number);
      setSelectedDays([new Date(y, m - 1, d).getDay()]);
    } else {
      if (newStart > endDate) {
        setEndDate(newStart);
        setSelectedDays(computeDaysInRange(newStart, newStart));
      } else {
        setSelectedDays(computeDaysInRange(newStart, endDate));
      }
    }
  };

  const handleEndDateChange = (newEnd: string) => {
    setEndDate(newEnd);
    if (startDate > newEnd) {
      setStartDate(newEnd);
      setSelectedDays(computeDaysInRange(newEnd, newEnd));
    } else {
      setSelectedDays(computeDaysInRange(startDate, newEnd));
    }
  };

  // Set default title depending on activity type
  const handleTypeChange = (type: string) => {
    setReservationType(type);
    if (!isEditing) {
      if (type === 'CIERRE_CANCHA') {
        setTitle('Cierre de Canchas - Mantenimiento y Adecuación');
        setStartTime('06:00');
        setEndTime('22:00');
      }
      else if (type === 'CLASS') setTitle('Clases de Tenis / Pádel - Academia');
      else if (type === 'MAINTENANCE') setTitle('Mantenimiento Técnico y Limpieza');
      else if (type === 'TOURNAMENT') setTitle('Torneo Oficial CHLS');
      else if (type === 'ESCUELA_DEPORTIVA') setTitle('Escuela Deportiva de Menores');
      else if (type === 'EVENTO_CLUB') setTitle('Evento Institucional del Club');
      else if (type === 'MEMBER') setTitle('Reserva de Socio');
    }
  };

  const sports = useMemo(() => {
    return Array.from(new Set(courts.map(c => c.sport)));
  }, [courts]);

  const filteredCourts = useMemo(() => {
    if (selectedSportFilter === 'ALL') return courts;
    return courts.filter(c => c.sport === selectedSportFilter);
  }, [courts, selectedSportFilter]);

  const toggleCourt = (id: string) => {
    if (isEditing) {
      // En modo edición de un turno, seleccionar la cancha única
      setSelectedCourtIds([id]);
    } else {
      setSelectedCourtIds(prev => 
        prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
      );
    }
  };

  const selectAllFilteredCourts = () => {
    if (isEditing) return;
    const filteredIds = filteredCourts.map(c => c.id);
    const allSelected = filteredIds.every(id => selectedCourtIds.includes(id));
    if (allSelected) {
      setSelectedCourtIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedCourtIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleDay = (dayVal: number) => {
    setSelectedDays(prev => 
      prev.includes(dayVal) ? prev.filter(d => d !== dayVal) : [...prev, dayVal]
    );
  };

  const setDaysPreset = (preset: 'ALL' | 'RANGE' | 'MWF' | 'TT' | 'WEEKDAYS' | 'WEEKENDS') => {
    if (preset === 'ALL') setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    else if (preset === 'RANGE') setSelectedDays(computeDaysInRange(startDate, endDate));
    else if (preset === 'MWF') setSelectedDays([1, 3, 5]);
    else if (preset === 'TT') setSelectedDays([2, 4]);
    else if (preset === 'WEEKDAYS') setSelectedDays([1, 2, 3, 4, 5]);
    else if (preset === 'WEEKENDS') setSelectedDays([6, 0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCourtIds.length === 0) {
      toast.error('Debes seleccionar al menos una cancha');
      return;
    }
    if (!title.trim()) {
      toast.error('Ingresa un título o concepto para la ocupación / turno');
      return;
    }
    if (startTime >= endTime) {
      toast.error('La hora de inicio debe ser anterior a la hora de fin');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && editingReservation) {
        // MODO EDICIÓN: Actualizar el turno existente
        const targetCourtId = selectedCourtIds[0] || editingReservation.courtId;
        const res = await api.put(`/reservations/${editingReservation.id}`, {
          courtId: targetCourtId,
          date: startDate,
          startTime,
          endTime,
          title: title.trim(),
          notes: notes.trim() || undefined,
          reservationType,
          playerNames: playerNames.trim() || undefined,
          status
        });

        toast.success(res.data.message || 'Turno / Horario actualizado exitosamente ✅');
        onSuccess();
        onClose();
      } else {
        // MODO CREACIÓN: Programar bloques en lote
        if (startDate > endDate) {
          toast.error('La fecha de inicio no puede ser posterior a la fecha de fin');
          setIsSubmitting(false);
          return;
        }

        const finalDays = selectedDays.length > 0 ? selectedDays : computeDaysInRange(startDate, endDate);

        const res = await api.post('/reservations/block', {
          courtIds: selectedCourtIds,
          startDate,
          endDate,
          startTime,
          endTime,
          daysOfWeek: finalDays,
          reservationType,
          title: title.trim(),
          notes: notes.trim() || undefined,
          adminCreatedBy: 'Administración CHLS'
        });

        toast.success(res.data.message || 'Cierre / Ocupación programado exitosamente');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error('Error in AdminCreateBlockModal:', err);
      toast.error(err.response?.data?.error || 'Error al guardar los datos');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const ACTIVITY_OPTIONS = [
    { id: 'CIERRE_CANCHA', label: 'Cierre de Canchas', icon: CalendarX, color: 'text-rose-400 border-rose-500/50 bg-rose-500/15' },
    { id: 'CLASS', label: 'Clase Deportiva', icon: Dumbbell, color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
    { id: 'MAINTENANCE', label: 'Mantenimiento', icon: Wrench, color: 'text-orange-400 border-orange-500/40 bg-orange-500/10' },
    { id: 'TOURNAMENT', label: 'Torneo', icon: Trophy, color: 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10' },
    { id: 'ESCUELA_DEPORTIVA', label: 'Escuela / Menores', icon: GraduationCap, color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
    { id: 'EVENTO_CLUB', label: 'Evento Club', icon: Bookmark, color: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10' },
    { id: 'MEMBER', label: 'Reserva Socio', icon: User, color: 'text-teal-400 border-teal-500/40 bg-teal-500/10' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#0c1611] border-2 border-brand-gold/40 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden my-auto">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-brand-gold/20 flex justify-between items-center bg-gradient-to-r from-brand-green/40 via-brand-green/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-sm">
              {isEditing ? <Pencil className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white serif-brand tracking-tight">
                  {isEditing ? (
                    <>Editar <span className="text-brand-gold">Turno / Horario / Ocupación</span></>
                  ) : (
                    <>Programar <span className="text-brand-gold">Cierre de Canchas / Clases / Bloqueo</span></>
                  )}
                </h2>
                {isEditing && editingReservation && (
                  <span className="font-mono text-xs font-bold text-brand-gold bg-brand-gold/15 px-2.5 py-0.5 rounded-full border border-brand-gold/30">
                    #{editingReservation.code || editingReservation.id?.slice(0, 8).toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {isEditing 
                  ? 'Modifica los datos, horario, espacio asignado o motivo de este turno en el mismo entorno.'
                  : 'El concepto y título se registrarán automáticamente en el cronograma y en las vistas de socios.'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6 text-sm text-gray-200">
          
          {/* Si es reserva de socio, mostrar banner informativo */}
          {isEditing && editingReservation && editingReservation.memberCode && editingReservation.memberCode !== 'ADMIN_BLOCK' && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-gray-300">
                  Socio Titular: <strong className="text-white">{editingReservation.memberName}</strong> (Código: <span className="font-mono text-emerald-300 font-bold">{editingReservation.memberCode}</span>)
                </span>
              </div>
              {editingReservation.memberPhone && (
                <span className="text-emerald-400 font-mono text-[11px]">📱 {editingReservation.memberPhone}</span>
              )}
            </div>
          )}

          {/* Tipo de Actividad */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-gold mb-2">
              Tipo de Actividad / Cierre
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {ACTIVITY_OPTIONS.map(item => {
                const Icon = item.icon;
                const isSelected = reservationType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTypeChange(item.id)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                      isSelected 
                        ? `${item.color} shadow-[0_0_15px_rgba(204,161,75,0.25)] font-bold scale-[1.02]` 
                        : 'border-white/10 bg-black/30 hover:border-white/20 text-gray-400'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span className="text-[10px] leading-tight font-bold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título / Concepto y Notas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-black/40 border border-brand-gold/25">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-gold mb-1 flex items-center justify-between">
                <span>Título / Concepto del Turno *</span>
                <span className="text-[10px] text-emerald-400 font-normal">Visible en horarios</span>
              </label>
              <input 
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ej. Cierre de Canchas / Clases de Tenis / Torneo CHLS"
                className="w-full bg-black/60 border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold text-sm font-semibold"
                required
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Este concepto se mostrará exactamente a los socios en la grilla y cronograma.
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                Detalles / Observaciones / Profesor
              </label>
              <input 
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ej. Trabajos de pintura y luminarias / Prof. Marcelo"
                className="w-full bg-black/60 border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold text-sm"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Información interna adicional sobre la actividad o motivo del turno.
              </p>
            </div>
          </div>

          {/* Acompañantes y Estado (Visible en Modo Edición) */}
          {isEditing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-black/30 border border-white/10">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                  Acompañantes / Invitados Registrados
                </label>
                <input 
                  type="text"
                  value={playerNames}
                  onChange={e => setPlayerNames(e.target.value)}
                  placeholder="Ej. Juan Pérez, Carlos Gómez"
                  className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                  Estado del Turno
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-brand-gold"
                >
                  <option value="APPROVED">🟢 Aprobada / Activa</option>
                  <option value="PENDING">🟡 Pendiente de Aprobación</option>
                  <option value="REJECTED">🔴 Rechazada</option>
                  <option value="CANCELLED">⚪ Cancelada / Liberada</option>
                </select>
              </div>
            </div>
          )}

          {/* Fechas */}
          <div className="bg-black/30 p-4 rounded-xl border border-white/10 space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-brand-gold flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> {isEditing ? 'Fecha del Turno' : 'Rango de Fechas para el Cierre / Ocupación'}
              </label>
              {!isEditing && (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      handleStartDateChange(todayStr);
                      handleEndDateChange(todayStr);
                    }}
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 transition-colors"
                  >
                    Solo Hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleStartDateChange(todayStr);
                      handleEndDateChange(format(addDays(new Date(), 2), 'yyyy-MM-dd'));
                    }}
                    className="px-2 py-1 rounded bg-brand-gold/15 text-brand-gold text-[10px] font-bold transition-colors"
                  >
                    3 Días (Hoy + 2)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleStartDateChange(todayStr);
                      handleEndDateChange(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
                    }}
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 transition-colors"
                  >
                    7 Días
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleStartDateChange(todayStr);
                      handleEndDateChange(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
                    }}
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 transition-colors"
                  >
                    1 Mes
                  </button>
                </div>
              )}
            </div>

            <div className={`grid ${isEditing ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
              <div>
                <span className="text-[11px] text-gray-400 block mb-1">
                  {isEditing ? 'Fecha Asignada:' : 'Fecha de Inicio:'}
                </span>
                <div className="relative flex items-center">
                  <input 
                    id="startDateInput"
                    type="date"
                    value={startDate}
                    onChange={e => handleStartDateChange(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-gold text-sm cursor-pointer pr-9 font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('startDateInput') as any;
                      if (el?.showPicker) el.showPicker();
                      else el?.focus();
                    }}
                    className="absolute right-2.5 text-brand-gold hover:text-yellow-400 p-1 transition-transform hover:scale-110"
                    title="Abrir selector de fecha"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {!isEditing && (
                <div>
                  <span className="text-[11px] text-gray-400 block mb-1">Fecha de Fin:</span>
                  <div className="relative flex items-center">
                    <input 
                      id="endDateInput"
                      type="date"
                      value={endDate}
                      onChange={e => handleEndDateChange(e.target.value)}
                      className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-gold text-sm cursor-pointer pr-9 font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('endDateInput') as any;
                        if (el?.showPicker) el.showPicker();
                        else el?.focus();
                      }}
                      className="absolute right-2.5 text-brand-gold hover:text-yellow-400 p-1 transition-transform hover:scale-110"
                      title="Abrir selector de fecha"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rango de Horarios */}
          <div className="bg-black/30 p-4 rounded-xl border border-white/10 space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-brand-gold flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Horario del Turno / Bloqueo
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => { setStartTime('06:00'); setEndTime('22:00'); }}
                  className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold transition-colors"
                >
                  Todo el Día (06-22)
                </button>
                <button
                  type="button"
                  onClick={() => { setStartTime('07:00'); setEndTime('09:00'); }}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 transition-colors"
                >
                  07-09
                </button>
                <button
                  type="button"
                  onClick={() => { setStartTime('08:00'); setEndTime('10:00'); }}
                  className="px-2 py-1 rounded bg-brand-gold/15 text-brand-gold text-[10px] font-bold transition-colors"
                >
                  08-10
                </button>
                <button
                  type="button"
                  onClick={() => { setStartTime('16:00'); setEndTime('18:00'); }}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 transition-colors"
                >
                  16-18
                </button>
                <button
                  type="button"
                  onClick={() => { setStartTime('18:00'); setEndTime('20:00'); }}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 transition-colors"
                >
                  18-20
                </button>
                <button
                  type="button"
                  onClick={() => { setStartTime('20:00'); setEndTime('22:00'); }}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 transition-colors"
                >
                  20-22
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-gray-400 block mb-1">Hora Inicio:</span>
                <select
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-gold text-sm font-mono"
                >
                  {TIME_SLOTS_OPTIONS.slice(0, -1).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 block mb-1">Hora Fin:</span>
                <select
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-brand-gold text-sm font-mono"
                >
                  {TIME_SLOTS_OPTIONS.slice(1).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Días de la Semana (solo en modo creación) */}
          {!isEditing && (
            <div className="bg-black/30 p-4 rounded-xl border border-white/10 space-y-3">
              <div className="flex justify-between items-center flex-wrap gap-2 mb-1">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-brand-gold block">
                    Días de Repetición en el Rango
                  </label>
                  <span className="text-[10px] text-emerald-400">
                    * Se programará y cerrará automáticamente en los días marcados
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDaysPreset('RANGE')}
                    className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold hover:bg-emerald-500/30 transition-colors"
                  >
                    ✓ Días del Rango
                  </button>
                  <button
                    type="button"
                    onClick={() => setDaysPreset('ALL')}
                    className="px-2 py-0.5 rounded bg-white/10 text-white text-[10px] font-bold hover:bg-white/20 transition-colors"
                  >
                    Todos (7 días)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDaysPreset('WEEKDAYS')}
                    className="px-2 py-0.5 rounded bg-white/5 text-gray-300 hover:bg-white/10 text-[10px] transition-colors"
                  >
                    Lun a Vie
                  </button>
                  <button
                    type="button"
                    onClick={() => setDaysPreset('WEEKENDS')}
                    className="px-2 py-0.5 rounded bg-white/5 text-gray-300 hover:bg-white/10 text-[10px] transition-colors"
                  >
                    Sáb y Dom
                  </button>
                  <button
                    type="button"
                    onClick={() => setDaysPreset('MWF')}
                    className="px-2 py-0.5 rounded bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20 text-[10px] transition-colors"
                  >
                    L-M-V
                  </button>
                  <button
                    type="button"
                    onClick={() => setDaysPreset('TT')}
                    className="px-2 py-0.5 rounded bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20 text-[10px] transition-colors"
                  >
                    M-J
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map(d => {
                  const isSelected = selectedDays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={`py-2.5 rounded-xl border text-center font-bold text-xs transition-all flex flex-col items-center justify-center gap-0.5 ${
                        isSelected
                          ? 'bg-brand-gold text-[#0a150e] border-brand-gold shadow-[0_0_12px_rgba(204,161,75,0.3)] scale-[1.02]'
                          : 'border-white/10 bg-black/40 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      <span>{d.label}</span>
                      <span className="text-[8px] font-normal opacity-80">{d.full.slice(0, 3)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selección de Canchas */}
          <div>
            <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-brand-gold flex items-center gap-1.5">
                <Layers className="w-4 h-4" /> {isEditing ? 'Espacio / Cancha Asignada' : `Seleccionar Canchas (${selectedCourtIds.length} seleccionadas)`}
              </label>
              
              <div className="flex items-center gap-2">
                <select
                  value={selectedSportFilter}
                  onChange={e => setSelectedSportFilter(e.target.value)}
                  className="bg-black/50 border border-white/15 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-brand-gold"
                >
                  <option value="ALL">Todos los Deportes</option>
                  {sports.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                {!isEditing && (
                  <button
                    type="button"
                    onClick={selectAllFilteredCourts}
                    className="px-2.5 py-1 rounded bg-brand-green-light/30 border border-brand-green-light text-[11px] text-emerald-300 hover:bg-brand-green-light/50 transition-colors"
                  >
                    {filteredCourts.every(c => selectedCourtIds.includes(c.id)) ? 'Deseleccionar' : 'Seleccionar Visibles'}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-2 bg-black/40 rounded-xl border border-white/10">
              {filteredCourts.map(c => {
                const isSelected = selectedCourtIds.includes(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleCourt(c.id)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-brand-gold/15 border-brand-gold text-white font-semibold shadow-[0_0_10px_rgba(204,161,75,0.2)]'
                        : 'bg-black/20 border-white/5 text-gray-400 hover:border-white/15 hover:text-gray-200'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold truncate">{c.name}</p>
                      <p className="text-[10px] text-gray-400">{c.sport}</p>
                    </div>
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-brand-gold shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-600 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resumen */}
          <div className="p-3.5 rounded-xl bg-brand-gold/10 border border-brand-gold/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
            <div className="text-xs text-gray-300">
              {isEditing ? (
                <>
                  <span className="font-bold text-brand-gold">Resumen de Actualización:</span> Se guardarán los cambios para el turno <strong>#{editingReservation?.code || editingReservation?.id?.slice(0, 8).toUpperCase()}</strong> en <strong>{courts.find(c => selectedCourtIds.includes(c.id))?.name || 'la cancha seleccionada'}</strong> el día <strong>{startDate}</strong> de <strong>{startTime} a {endTime}</strong> ({title}).
                </>
              ) : (
                <>
                  <span className="font-bold text-brand-gold">Resumen de Programación:</span> Se crearán bloques continuos para <strong>{selectedCourtIds.length} cancha(s)</strong> de <strong>{startTime} a {endTime}</strong> los días seleccionados entre el <strong>{startDate}</strong> y el <strong>{endDate}</strong>. Estos horarios quedarán reservados como <em>{title}</em> y no podrán ser reservados por socios.
                </>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="glass-button-primary px-6 py-2.5 text-xs font-bold flex items-center gap-2 shadow-goldGlow"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  <span>Guardando...</span>
                </>
              ) : isEditing ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Guardar Cambios del Turno</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Programar Ocupaciones</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
