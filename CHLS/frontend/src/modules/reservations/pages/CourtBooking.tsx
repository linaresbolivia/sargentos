import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@config/api';
import toast from 'react-hot-toast';
import { Calendar as CalendarIcon, Clock, CheckCircle2, ChevronRight, ChevronLeft, MapPin } from 'lucide-react';
import { format, addDays, startOfToday, parseISO, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ReservationCalendar } from '../components/ReservationCalendar';
import CrestLogo from '@shared/components/CrestLogo';

interface Court {
  id: string;
  name: string;
  sport: string;
}

interface Reservation {
  id: string;
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', 
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', 
  '18:00', '19:00', '20:00', '21:00'
];

export const CourtBooking: React.FC = () => {
  const [courts, setCourts] = useState<Court[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  
  const today = startOfToday();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [dates, setDates] = useState<Date[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ memberCode: '', memberName: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    fetchCourts();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchReservations();
    }
  }, [selectedDate]);

  const fetchCourts = async () => {
    try {
      const res = await api.get('/reservations/courts');
      setCourts(res.data);
    } catch (err) {
      toast.error('Error cargando canchas');
    }
  };

  const fetchReservations = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await api.get(`/reservations?date=${dateStr}`);
      setReservations(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const sports = useMemo(() => {
    const uniqueSports = Array.from(new Set(courts.map(c => c.sport)));
    return uniqueSports;
  }, [courts]);

  useEffect(() => {
    if (sports.length > 0 && !selectedSport) {
      setSelectedSport(sports[0]);
    }
  }, [sports]);

  const filteredCourts = courts.filter(c => c.sport === selectedSport);

  useEffect(() => {
    if (filteredCourts.length > 0 && (!selectedCourt || selectedCourt.sport !== selectedSport)) {
      setSelectedCourt(filteredCourts[0]);
    }
  }, [filteredCourts, selectedSport]);

  const handleSlotClick = (time: string) => {
    const isBooked = isSlotBooked(time);
    if (!isBooked) {
      setSelectedTime(time);
      setIsModalOpen(true);
    }
  };

  const isSlotBooked = (time: string) => {
    if (!selectedCourt) return false;
    return reservations.some(r => 
      r.courtId === selectedCourt.id && 
      r.startTime === time && 
      ['PENDING', 'APPROVED'].includes(r.status)
    );
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourt || !selectedTime) return;
    
    setIsSubmitting(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      // end time is 1 hour later
      const hour = parseInt(selectedTime.split(':')[0]);
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

      await api.post('/reservations', {
        courtId: selectedCourt.id,
        date: dateStr,
        startTime: selectedTime,
        endTime,
        ...formData
      });

      setBookingSuccess(true);
      fetchReservations(); // refresh
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al reservar la cancha');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (bookingSuccess) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
        <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-brand-green rounded-full flex items-center justify-center mb-6 shadow-glow">
          <CheckCircle2 size={48} className="text-white" />
        </div>
        <h2 className="text-3xl font-bold text-brand-gold mb-4 serif-brand">¡Reserva Solicitada!</h2>
        <p className="text-gray-400 mb-8 max-w-md">
          Tu reserva para <strong>{selectedCourt?.name}</strong> el <strong>{format(selectedDate, 'EEEE d de MMMM', { locale: es })}</strong> a las <strong>{selectedTime}</strong> ha sido registrada exitosamente. Un administrador la validará pronto.
        </p>
        <button 
          onClick={() => {
            setBookingSuccess(false);
            setIsModalOpen(false);
            setSelectedTime(null);
            setFormData({ memberCode: '', memberName: '' });
          }}
          className="glass-button-primary px-8 py-3 uppercase tracking-wider text-sm"
        >
          Hacer Otra Reserva
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <CrestLogo size="sm" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white serif-brand tracking-tight">Reserva de <span className="text-brand-gold">Canchas</span></h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Selecciona el deporte, la fecha y tu horario preferido.</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Sidebar Filters */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Sport Selection */}
          <div className="glass-panel p-6">
            <h3 className="text-xs font-bold text-brand-gold uppercase tracking-widest mb-4">Deporte</h3>
            <div className="space-y-2">
              {sports.map(sport => (
                <button
                  key={sport}
                  onClick={() => setSelectedSport(sport)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all ${selectedSport === sport ? 'bg-gradient-to-r from-emerald-500/20 to-brand-green/20 border border-brand-green/50 text-brand-gold' : 'hover:bg-white/5 border border-transparent text-gray-400'}`}
                >
                  <span className="font-semibold">{sport}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Court Selection */}
          <div className="glass-panel p-6">
            <h3 className="text-xs font-bold text-brand-gold uppercase tracking-widest mb-4">Cancha</h3>
            <div className="space-y-2">
              {filteredCourts.map(court => (
                <button
                  key={court.id}
                  onClick={() => setSelectedCourt(court)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between ${selectedCourt?.id === court.id ? 'bg-brand-gold/10 border border-brand-gold/30 text-brand-gold' : 'hover:bg-white/5 border border-transparent text-gray-400'}`}
                >
                  <span className="font-medium">{court.name}</span>
                  {selectedCourt?.id === court.id && <MapPin size={16} />}
                </button>
              ))}
              {filteredCourts.length === 0 && <p className="text-sm text-gray-500">No hay canchas disponibles para este deporte.</p>}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* Date Selector */}
          <div className="glass-panel p-6">
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon size={18} className="text-brand-gold" />
              <h3 className="text-sm font-bold text-white tracking-widest uppercase">Fecha de Reserva</h3>
            </div>
            
            <ReservationCalendar 
              selectedDate={selectedDate} 
              onSelectDate={setSelectedDate} 
              activeReservations={reservations} 
            />
          </div>

          {/* Time Slots Grids */}
          <div className="glass-panel p-6 min-h-[400px]">
             <div className="flex items-center gap-2 mb-6">
              <Clock size={18} className="text-brand-gold" />
              <h3 className="text-sm font-bold text-white tracking-widest uppercase">Horarios Disponibles - {selectedCourt?.name}</h3>
            </div>

            {selectedCourt ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {TIME_SLOTS.map(time => {
                  const isBooked = isSlotBooked(time);
                  return (
                    <button
                      key={time}
                      disabled={isBooked}
                      onClick={() => handleSlotClick(time)}
                      className={`relative p-4 rounded-xl border flex flex-col items-center justify-center transition-all ${isBooked ? 'bg-red-900/10 border-red-500/20 text-red-400/50 cursor-not-allowed' : 'bg-emerald-900/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-brand-gold hover:text-brand-gold hover:-translate-y-1 hover:shadow-glow'}`}
                    >
                      <span className="text-lg font-bold font-mono">{time}</span>
                      <span className="text-[10px] uppercase mt-1 tracking-widest">{isBooked ? 'Ocupado' : 'Disponible'}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-gray-500">
                Selecciona una cancha para ver los horarios.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="glass-panel w-full max-w-md p-8 relative overflow-hidden">
             {/* Decor */}
             <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-gold/10 rounded-full blur-[40px]"></div>

            <h3 className="text-2xl font-bold text-brand-gold mb-2 serif-brand">Confirmar Reserva</h3>
            <p className="text-gray-300 text-sm mb-6">
              Estás reservando <strong>{selectedCourt?.name}</strong> el {format(selectedDate, 'dd/MM/yyyy')} a las {selectedTime}.
            </p>

            <form onSubmit={handleBooking} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-brand-gold uppercase tracking-widest mb-2">Código de Socio *</label>
                <input
                  type="text"
                  required
                  value={formData.memberCode}
                  onChange={e => setFormData({...formData, memberCode: e.target.value.toUpperCase()})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 transition-all uppercase"
                  placeholder="EJ. S-1020"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-brand-gold uppercase tracking-widest mb-2">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.memberName}
                  onChange={e => setFormData({...formData, memberName: e.target.value.toUpperCase()})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 transition-all uppercase"
                  placeholder="TU NOMBRE"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm font-bold uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 glass-button-primary px-4 py-3 text-sm font-bold uppercase tracking-wider"
                >
                  {isSubmitting ? 'Procesando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
