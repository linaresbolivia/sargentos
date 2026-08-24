import React, { useState, useEffect } from 'react';
import { api } from '@config/api';
import toast from 'react-hot-toast';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Check, 
  FileText, 
  DollarSign, 
  Layers,
  Sparkles,
  AlertCircle
} from 'lucide-react';

interface Court {
  id: string;
  name: string;
  sport: string;
}

interface Reservation {
  id: string;
  code?: string | null;
  courtId: string;
  court?: Court;
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
  paymentStatus?: string;
  paymentMethod?: string;
  title?: string | null;
  notes?: string | null;
  status: string;
}

interface AdminEditReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  courts: Court[];
  onSuccess: () => void;
}

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', 
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', 
  '18:00', '19:00', '20:00', '21:00', '22:00'
];

export const AdminEditReservationModal: React.FC<AdminEditReservationModalProps> = ({
  isOpen,
  onClose,
  reservation,
  courts,
  onSuccess,
}) => {
  const [courtId, setCourtId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [reservationType, setReservationType] = useState('MEMBER');
  const [playerNames, setPlayerNames] = useState('');
  const [status, setStatus] = useState('APPROVED');
  const [paymentStatus, setPaymentStatus] = useState('PENDING_PAYMENT');
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (reservation) {
      setCourtId(reservation.courtId || '');
      setDate(reservation.date || '');
      setStartTime(reservation.startTime || '08:00');
      setEndTime(reservation.endTime || '09:00');
      setTitle(reservation.title || reservation.memberName || '');
      setNotes(reservation.notes || '');
      setReservationType(reservation.reservationType || 'MEMBER');
      setPlayerNames(reservation.playerNames || '');
      setStatus(reservation.status || 'APPROVED');
      setPaymentStatus(reservation.paymentStatus || 'PENDING_PAYMENT');
      setTotalPrice(reservation.totalPrice || 0);
    }
  }, [reservation, isOpen]);

  if (!isOpen || !reservation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courtId || !date || !startTime || !endTime) {
      toast.error('Todos los campos de fecha, horario y cancha son obligatorios');
      return;
    }
    if (startTime >= endTime) {
      toast.error('La hora de inicio debe ser anterior a la hora de fin');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put(`/reservations/${reservation.id}`, {
        courtId,
        date,
        startTime,
        endTime,
        title: title.trim(),
        notes: notes.trim(),
        reservationType,
        playerNames: playerNames.trim(),
        totalPrice: Number(totalPrice),
        status,
        paymentStatus
      });

      toast.success('¡Turno / Reserva actualizado exitosamente!');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating reservation:', err);
      toast.error(err.response?.data?.error || 'Error al actualizar la reserva');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0b1812] border-2 border-brand-gold/50 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-brand-gold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold block">
                Edición de Registro
              </span>
              <h3 className="text-lg font-bold text-white">
                Editar Turno / Bloqueo
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-xl text-gray-400 hover:text-white hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Cancha */}
          <div>
            <label className="block text-[11px] font-bold text-brand-gold uppercase tracking-wider mb-1">
              Espacio / Cancha Asignada *
            </label>
            <select
              value={courtId}
              onChange={e => setCourtId(e.target.value)}
              className="w-full bg-black/60 border border-white/20 rounded-xl px-3.5 py-2.5 text-white text-xs font-semibold focus:outline-none focus:border-brand-gold"
            >
              {courts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.sport})
                </option>
              ))}
            </select>
          </div>

          {/* Fecha y Horarios */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 bg-black/40 rounded-2xl border border-white/10">
            <div>
              <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                Fecha *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-black/60 border border-white/20 rounded-xl px-2.5 py-2 text-white text-xs focus:outline-none focus:border-brand-gold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                Hora Inicio *
              </label>
              <select
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full bg-black/60 border border-white/20 rounded-xl px-2.5 py-2 text-white text-xs focus:outline-none focus:border-brand-gold"
              >
                {TIME_SLOTS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                Hora Fin *
              </label>
              <select
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full bg-black/60 border border-white/20 rounded-xl px-2.5 py-2 text-white text-xs focus:outline-none focus:border-brand-gold"
              >
                {TIME_SLOTS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Título / Motivo del Cierre o Socio */}
          <div>
            <label className="block text-[11px] font-bold text-brand-gold uppercase tracking-wider mb-1">
              Título / Motivo del Turno o Cierre *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej. Clases de Tenis - Academia / Cierre por Mantenimiento"
              className="w-full bg-black/60 border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold text-sm font-semibold"
            />
          </div>

          {/* Tipo de Reserva y Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                Tipo de Actividad
              </label>
              <select
                value={reservationType}
                onChange={e => setReservationType(e.target.value)}
                className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-brand-gold"
              >
                <option value="MEMBER">Reserva de Socio</option>
                <option value="CIERRE_CANCHA">Cierre de Canchas</option>
                <option value="CLASS">Clases Deportivas</option>
                <option value="MAINTENANCE">Mantenimiento</option>
                <option value="TOURNAMENT">Torneo Oficial</option>
                <option value="ESCUELA_DEPORTIVA">Escuela Deportiva</option>
                <option value="EVENTO_CLUB">Evento del Club</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                Estado de Reserva
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

          {/* Notas / Instructor */}
          <div>
            <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
              Observaciones / Profesor / Detalles
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej. Prof. Marcelo / Cancha asignada a torneo"
              className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold text-xs"
            />
          </div>

          {/* Acompañantes / Invitados */}
          <div>
            <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
              Acompañantes o Invitados Registrados
            </label>
            <input
              type="text"
              value={playerNames}
              onChange={e => setPlayerNames(e.target.value)}
              placeholder="Ej. Juan Pérez (CI: 4930219 LP), Carlos Gómez"
              className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold text-xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-3 border-t border-white/10">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-brand-gold via-yellow-500 to-brand-gold hover:from-yellow-400 hover:to-brand-gold text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Guardar Cambios del Turno</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs"
            >
              Cancelar
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
