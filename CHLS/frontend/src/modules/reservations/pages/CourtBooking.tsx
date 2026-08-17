import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@store/store';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '@store/authSlice';
import { api } from '@config/api';
import toast from 'react-hot-toast';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  MapPin, 
  ShieldCheck, 
  User, 
  Trash2, 
  AlertCircle, 
  Sparkles,
  Info,
  CalendarCheck,
  Dumbbell,
  Wrench,
  Trophy,
  ArrowRight,
  ArrowLeft,
  LogOut,
  Home
} from 'lucide-react';
import { format, addDays, startOfToday, parseISO, isSameDay, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
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
  court?: Court;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  reservationType: string;
  title?: string | null;
  notes?: string | null;
  memberCode?: string | null;
  memberName: string;
}

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', 
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', 
  '18:00', '19:00', '20:00', '21:00'
];

const SPORT_META: Record<string, { label: string; desc: string; unitSingular: string; unitPlural: string }> = {
  'Tenis': { label: 'Tenis', desc: '6 Canchas de Arcilla', unitSingular: 'cancha', unitPlural: 'canchas' },
  'Pádel': { label: 'Pádel', desc: '2 Canchas Panorámicas', unitSingular: 'cancha', unitPlural: 'canchas' },
  'Frontón': { label: 'Frontón', desc: '2 Espacios Oficiales', unitSingular: 'espacio', unitPlural: 'espacios' },
  'Polifuncional': { label: 'Polifuncional', desc: 'Volley / Básquet / Futsal', unitSingular: 'cancha', unitPlural: 'canchas' },
  'Raquet / Wally': { label: 'Raquet / Wally', desc: '2 Espacios de Madera', unitSingular: 'espacio', unitPlural: 'espacios' },
  'Ping Pong': { label: 'Ping Pong', desc: '2 Mesas de Tenis de Mesa', unitSingular: 'mesa', unitPlural: 'mesas' },
  'Fútbol': { label: 'Fútbol', desc: '1 Cancha Césped Natural', unitSingular: 'cancha', unitPlural: 'canchas' },
};

// Modern Monochrome Laser-Etched Backlit Sport Icon Component
const SportIcon: React.FC<{ sport: string; isSelected?: boolean }> = ({ sport, isSelected }) => {
  const getPath = () => {
    switch (sport) {
      case 'Tenis':
        return (
          <>
            <ellipse cx="9" cy="9" rx="6" ry="6" />
            <line x1="9" y1="3" x2="9" y2="15" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
            <line x1="3" y1="9" x2="15" y2="9" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
            <line x1="13.5" y1="13.5" x2="20.5" y2="20.5" strokeWidth="2.2" />
            <circle cx="18" cy="6" r="2.8" />
            <path d="M16 4.8c1 1 1 1.6 0 2.4" strokeWidth="0.8" />
          </>
        );

      case 'Pádel':
        return (
          <>
            <path d="M14.5 3.5C11.5 2 7.5 3 5.5 5.5C3.5 8 3.5 12 5.5 14.5C7.5 17 11.5 17.5 14 15.5L19.5 21L21 19.5L15.5 14C17 11.5 17 7 14.5 3.5Z" />
            <circle cx="8" cy="8" r="0.7" fill="currentColor" />
            <circle cx="11" cy="8" r="0.7" fill="currentColor" />
            <circle cx="8" cy="11" r="0.7" fill="currentColor" />
            <circle cx="11" cy="11" r="0.7" fill="currentColor" />
            <circle cx="9.5" cy="9.5" r="0.7" fill="currentColor" />
            <circle cx="18.5" cy="5.5" r="2.4" />
          </>
        );

      case 'Frontón':
        return (
          <>
            {/* Muro / Frontis técnico con textura de bloques y pelota */}
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.8" />
            <line x1="3" y1="9" x2="21" y2="9" strokeWidth="1.2" />
            <line x1="3" y1="15" x2="21" y2="15" strokeWidth="1.2" />
            <line x1="9" y1="3" x2="9" y2="9" strokeWidth="1.2" />
            <line x1="15" y1="3" x2="15" y2="9" strokeWidth="1.2" />
            <line x1="6" y1="9" x2="6" y2="15" strokeWidth="1.2" />
            <line x1="12" y1="9" x2="12" y2="15" strokeWidth="1.2" />
            <line x1="18" y1="9" x2="18" y2="15" strokeWidth="1.2" />
            <line x1="9" y1="15" x2="9" y2="21" strokeWidth="1.2" />
            <line x1="15" y1="15" x2="15" y2="21" strokeWidth="1.2" />
            <circle cx="15.5" cy="6" r="1.8" fill="currentColor" />
          </>
        );

      case 'Polifuncional':
        return (
          <>
            <circle cx="9.5" cy="14" r="5" />
            <line x1="9.5" y1="9" x2="9.5" y2="19" strokeWidth="0.9" />
            <line x1="4.5" y1="14" x2="14.5" y2="14" strokeWidth="0.9" />
            <circle cx="15.5" cy="8.5" r="4.5" />
            <path d="M12.5 5.5C14.5 7.5 16.5 9.5 18.5 11.5" strokeWidth="0.9" />
          </>
        );

      case 'Raquet / Wally':
        return (
          <>
            <path d="M9 3C5.5 3 3.5 6 4 9.5C4.5 13 8 15 11.5 14.5L18 21L20.5 18.5L14 12C14.5 8.5 12.5 5 9 3Z" />
            <line x1="6" y1="7" x2="11" y2="12" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
            <line x1="8" y1="5" x2="13" y2="10" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
            <circle cx="17.5" cy="6.5" r="2.8" />
          </>
        );

      case 'Ping Pong':
        return (
          <>
            <ellipse cx="10" cy="9" rx="6" ry="6" />
            <line x1="14" y1="13.5" x2="19.5" y2="19" strokeWidth="2.2" />
            <line x1="18" y1="17.5" x2="20" y2="19.5" strokeWidth="3" />
            <circle cx="18" cy="6.5" r="2.5" />
          </>
        );

      case 'Fútbol':
        return (
          <>
            <circle cx="12" cy="12" r="9" />
            <polygon points="12,8 15,10 14,14 10,14 9,10" fill="currentColor" fillOpacity="0.2" />
            <line x1="12" y1="3" x2="12" y2="8" />
            <line x1="15" y1="10" x2="20" y2="8" />
            <line x1="14" y1="14" x2="17" y2="19" />
            <line x1="10" y1="14" x2="7" y2="19" />
            <line x1="9" y1="10" x2="4" y2="8" />
          </>
        );

      default:
        return <circle cx="12" cy="12" r="9" />;
    }
  };

  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
      isSelected
        ? 'bg-emerald-500/20 text-[#00ff87] drop-shadow-[0_0_10px_rgba(0,255,135,0.85)]'
        : 'bg-black/40 text-emerald-500/40 group-hover:text-emerald-400 group-hover:drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]'
    }`}>
      <svg 
        className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.8" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        {getPath()}
      </svg>
    </div>
  );
};

export const CourtBooking: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Sesión cerrada correctamente');
    navigate('/login');
  };

  const [courts, setCourts] = useState<Court[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSport, setSelectedSport] = useState<string>('Tenis');
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);

  const today = startOfToday();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  
  // Generate 7-day quick date picker items
  const next7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(today, i));
  }, []);

  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  const currentMemberCode = user?.documentId || user?.email?.split('@')[0]?.toUpperCase() || 'SOCIO-CHLS';
  const currentMemberName = `${user?.firstName || 'Socio'} ${user?.lastName || 'CHLS'}`.trim();

  const [formData, setFormData] = useState({
    memberCode: currentMemberCode,
    memberName: currentMemberName,
    memberPhone: user?.phone || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [durationHours, setDurationHours] = useState<number>(1);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);
  const [showMyReservationsSheet, setShowMyReservationsSheet] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        memberCode: user.documentId || user.email?.split('@')[0]?.toUpperCase() || 'SOCIO-CHLS',
        memberName: `${user.firstName || 'Socio'} ${user.lastName || 'CHLS'}`.trim(),
        memberPhone: user.phone || '',
      });
    }
  }, [user]);

  useEffect(() => {
    fetchCourts();
    fetchMyReservations();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchReservations();
    }
  }, [selectedDate]);

  const fetchCourts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reservations/courts');
      setCourts(res.data);
    } catch (err) {
      toast.error('Error al cargar canchas disponibles');
    } finally {
      setLoading(false);
    }
  };

  const fetchReservations = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await api.get(`/reservations?date=${dateStr}`);
      setReservations(res.data);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    }
  };

  const fetchMyReservations = async () => {
    if (!currentMemberCode) return;
    try {
      const res = await api.get(`/reservations/my-reservations?memberCode=${encodeURIComponent(currentMemberCode)}`);
      setMyReservations(res.data.upcoming || []);
    } catch (err) {
      console.error('Error fetching my reservations:', err);
    }
  };

  const sports = useMemo(() => {
    const availableSports = Array.from(new Set(courts.map(c => c.sport)));
    return availableSports;
  }, [courts]);

  useEffect(() => {
    if (sports.length > 0 && !sports.includes(selectedSport)) {
      setSelectedSport(sports[0]);
    }
  }, [sports, selectedSport]);

  const filteredCourts = courts.filter(c => c.sport === selectedSport);

  useEffect(() => {
    if (filteredCourts.length > 0 && (!selectedCourt || selectedCourt.sport !== selectedSport)) {
      setSelectedCourt(filteredCourts[0]);
    }
  }, [filteredCourts, selectedSport]);

  // Find slot reservation
  const getSlotInfo = (time: string) => {
    if (!selectedCourt) return null;
    const [hour] = time.split(':').map(Number);

    return reservations.find(r => {
      if (r.courtId !== selectedCourt.id) return false;
      if (['REJECTED', 'CANCELLED'].includes(r.status)) return false;

      const [startH] = r.startTime.split(':').map(Number);
      const [endH] = r.endTime.split(':').map(Number);

      return hour >= startH && hour < endH;
    });
  };

  const handleSlotClick = (time: string) => {
    const res = getSlotInfo(time);
    if (!res) {
      // Check active limit
      if (myReservations.length >= 2) {
        toast.error('Has alcanzado el límite de 2 reservas activas. Espera a que concluyan o cancela una previa.');
        return;
      }
      setSelectedTime(time);
      setDurationHours(1);
      setIsModalOpen(true);
    } else if (res.memberCode === currentMemberCode) {
      toast('Esta es tu reserva confirmada.', { icon: '👑' });
    } else if (res.reservationType === 'CLASS') {
      toast.error(`Horario reservado para Clases Deportivas (${res.title || 'Academia'}).`);
    } else if (res.reservationType === 'MAINTENANCE') {
      toast.error('Cancha en mantenimiento técnico en este horario.');
    } else {
      toast.error('Este horario ya se encuentra ocupado por otro socio.');
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourt || !selectedTime) return;

    if (!formData.memberPhone || !formData.memberPhone.trim()) {
      toast.error('El número de celular o WhatsApp de contacto es obligatorio.');
      return;
    }

    const cleanPhone = formData.memberPhone.trim().replace(/[\s\-\(\)]/g, '');
    const boliviaPhoneRegex = /^(?:\+?591)?[67]\d{7}$/;
    if (!boliviaPhoneRegex.test(cleanPhone)) {
      toast.error('Número de celular inválido. Debe ingresar un celular válido de Bolivia (8 dígitos comenzando con 6 o 7, ej. 70123456).');
      return;
    }

    setIsSubmitting(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const hour = parseInt(selectedTime.split(':')[0]);
      const endTime = `${(hour + durationHours).toString().padStart(2, '0')}:00`;

      const res = await api.post('/reservations', {
        courtId: selectedCourt.id,
        date: dateStr,
        startTime: selectedTime,
        endTime,
        memberCode: formData.memberCode,
        memberName: formData.memberName,
        memberPhone: formData.memberPhone.trim(),
      });

      setBookingSuccess({
        courtName: selectedCourt.name,
        sport: selectedCourt.sport,
        date: format(selectedDate, "EEEE d 'de' MMMM", { locale: es }),
        time: `${selectedTime} - ${endTime}`
      });

      toast.success('¡Reserva confirmada con éxito!');
      fetchReservations();
      fetchMyReservations();
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al procesar la reserva');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelMyReservation = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas cancelar esta reserva y liberar la cancha?')) return;
    try {
      const res = await api.post(`/reservations/cancel/${id}`, {
        memberCode: currentMemberCode
      });
      toast.success(res.data.message || 'Reserva cancelada');
      fetchMyReservations();
      fetchReservations();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al cancelar la reserva');
    }
  };

  const currentSportMeta = selectedSport ? SPORT_META[selectedSport] : null;
  const unitSingularUpper = currentSportMeta?.unitSingular ? currentSportMeta.unitSingular.toUpperCase() : 'CANCHA';
  const unitSingularCap = currentSportMeta?.unitSingular ? (currentSportMeta.unitSingular.charAt(0).toUpperCase() + currentSportMeta.unitSingular.slice(1)) : 'Cancha';

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-16 px-3 sm:px-6">
      
      {/* Header Banner Mobile First */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c2016] via-[#08150f] to-[#040a07] border border-brand-gold/30 p-5 sm:p-7 shadow-2xl">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <CrestLogo size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white serif-brand tracking-tight">
                  Reserva de <span className="text-brand-gold">Canchas</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                  EN VIVO
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Disponibilidad en tiempo real para socios del Club Los Sargentos.
              </p>
            </div>
          </div>

          {/* Top Actions: Menu, My Bookings & Logout */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap sm:flex-nowrap">
            <Link
              to="/"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-gray-300 hover:text-white transition-all text-xs"
              title="Volver al Menú Principal"
            >
              <Home className="w-3.5 h-3.5 text-gray-400" />
              <span>Menú</span>
            </Link>

            <button
              onClick={() => setShowMyReservationsSheet(!showMyReservationsSheet)}
              className="flex-1 sm:flex-initial flex items-center justify-between sm:justify-start gap-2 px-3.5 py-2 rounded-2xl bg-black/40 border border-brand-gold/40 hover:border-brand-gold transition-all text-xs text-white"
            >
              <div className="flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4 text-brand-gold" />
                <span className="font-bold">Mis Reservas</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-brand-gold text-[#0a150e] font-black text-[11px]">
                {myReservations.length} / 2
              </span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 transition-all text-xs"
              title="Cerrar Sesión para usar otro usuario"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* Fair play banner */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-300">
          <div className="flex items-center gap-1.5 text-brand-gold">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Sistema Fair Play: Máximo 2 reservas activas y hasta 7 días de anticipación.</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <span>Socio: <strong className="text-white">{currentMemberName}</strong> ({currentMemberCode})</span>
            <button
              onClick={handleLogout}
              className="text-rose-400 hover:text-rose-300 underline font-semibold flex items-center gap-1 ml-1"
              title="Cerrar sesión"
            >
              <LogOut className="w-3 h-3" />
              <span>(Cambiar usuario)</span>
            </button>
          </div>
        </div>
      </div>

      {/* "Mis Reservas Activas" Accordion / Panel */}
      {showMyReservationsSheet && (
        <div className="bg-[#0b1610] border border-brand-gold/30 rounded-2xl p-5 space-y-3 shadow-xl animate-fade-in">
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <h3 className="text-sm font-bold text-brand-gold uppercase tracking-wider flex items-center gap-2">
              <CalendarCheck className="w-4 h-4" /> Tus Reservas Programadas ({myReservations.length})
            </h3>
            <button 
              onClick={() => setShowMyReservationsSheet(false)}
              className="text-xs text-gray-400 hover:text-white underline"
            >
              Cerrar
            </button>
          </div>

          {myReservations.length === 0 ? (
            <p className="text-xs text-gray-400 py-3 text-center">
              No tienes reservas activas pendientes en este momento. ¡Selecciona una cancha abajo para jugar!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {myReservations.map(res => (
                <div 
                  key={res.id}
                  className="p-3.5 rounded-xl bg-black/40 border border-brand-gold/20 flex justify-between items-center gap-3"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-xs">{res.court?.name}</span>
                      <span className="text-[10px] text-brand-gold bg-brand-gold/10 px-1.5 py-0.5 rounded">
                        {res.court?.sport}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-300 mt-1 flex items-center gap-2 font-mono">
                      <span>{format(parseISO(res.date), 'dd/MM/yyyy')}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold">{res.startTime} - {res.endTime}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCancelMyReservation(res.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-bold flex items-center gap-1 transition-colors"
                    title="Cancelar reserva"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Liberar</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 1. Selector de Deportes (Tarjetas Táctiles) */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-brand-gold block">
          1. Selecciona el Deporte / Disciplina
        </label>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {sports.map(sport => {
            const meta = SPORT_META[sport] || { icon: '🏅', label: sport, desc: 'Canchas del Club' };
            const isSelected = selectedSport === sport;
            const courtsInSport = courts.filter(c => c.sport === sport);

            return (
              <button
                key={sport}
                onClick={() => setSelectedSport(sport)}
                className={`p-3 sm:p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 relative overflow-hidden group ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#0f2d1c] via-[#091b11] to-[#040c07] border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.35),inset_0_0_15px_rgba(0,255,135,0.15)] scale-[1.03]'
                    : 'bg-[#07110a] border-emerald-500/15 hover:border-emerald-500/40 hover:bg-[#0b1a10] hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] text-gray-400'
                }`}
              >
                {/* Ambient Backlight Reflection */}
                {isSelected && (
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent pointer-events-none" />
                )}

                <div className="flex justify-between items-start w-full mb-2.5">
                  <SportIcon sport={sport} isSelected={isSelected} />
                  {/* Micro Backlit Diode / Indicator */}
                  <span className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    isSelected 
                      ? 'bg-[#00ff87] shadow-[0_0_8px_#00ff87] animate-pulse' 
                      : 'bg-emerald-950 border border-emerald-500/20 group-hover:bg-emerald-500/40'
                  }`} />
                </div>

                <div className="relative z-10">
                  <h3 className={`font-bold text-xs sm:text-sm leading-tight transition-colors ${
                    isSelected 
                      ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' 
                      : 'text-gray-300 group-hover:text-white'
                  }`}>
                    {meta.label}
                  </h3>
                  <p className={`text-[10px] mt-0.5 truncate transition-colors ${
                    isSelected ? 'text-emerald-400 font-semibold' : 'text-gray-500 group-hover:text-emerald-500/70'
                  }`}>
                    {courtsInSport.length} {courtsInSport.length === 1 ? (meta.unitSingular || 'espacio') : (meta.unitPlural || 'canchas')}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Selector de Fecha (Carrusel de 7 Días Rápidos) */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold uppercase tracking-wider text-brand-gold block">
            2. Selecciona la Fecha (Próximos 7 días)
          </label>
          <span className="text-[11px] text-gray-400 capitalize">
            {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {next7Days.map((d, index) => {
            const isSelected = isSameDay(d, selectedDate);
            const isTodayDay = isSameDay(d, today);
            
            return (
              <button
                key={d.toISOString()}
                onClick={() => setSelectedDate(d)}
                className={`flex-1 min-w-[80px] sm:min-w-[95px] p-2.5 sm:p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-brand-gold text-[#0a150e] border-brand-gold shadow-[0_0_15px_rgba(204,161,75,0.35)] font-bold scale-[1.03]'
                    : 'bg-[#09120c] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                <span className={`text-[10px] uppercase tracking-wider ${isSelected ? 'text-black/80 font-black' : isTodayDay ? 'text-brand-gold' : 'text-gray-400'}`}>
                  {isTodayDay ? 'Hoy' : format(d, 'EEE', { locale: es })}
                </span>
                <span className={`text-base sm:text-lg font-bold font-mono my-0.5 ${isSelected ? 'text-black' : 'text-white'}`}>
                  {format(d, 'd')}
                </span>
                <span className={`text-[9px] uppercase ${isSelected ? 'text-black/70' : 'text-gray-500'}`}>
                  {format(d, 'MMM', { locale: es })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Selector de Cancha / Espacio / Mesa Específica */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-brand-gold flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-400" />
            3. SELECCIONA {unitSingularUpper === 'MESA' ? 'LA MESA' : unitSingularUpper === 'ESPACIO' ? 'EL ESPACIO' : 'LA CANCHA'} <span className="text-emerald-400 text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40">({filteredCourts.length} {filteredCourts.length === 1 ? 'disponible' : 'disponibles'})</span>
          </label>
          <span className="text-[11px] text-gray-400">
            {unitSingularCap} actual: <strong className="text-emerald-400 font-bold">{selectedCourt?.name || 'Ninguno'}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredCourts.map(court => {
            const isSelected = selectedCourt?.id === court.id;
            return (
              <button
                key={court.id}
                type="button"
                onClick={() => setSelectedCourt(court)}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-500/25 via-brand-gold/20 to-emerald-500/10 border-2 border-emerald-400 text-white shadow-[0_0_25px_rgba(16,185,129,0.35)] font-bold scale-[1.02]'
                    : 'bg-[#0b1a12] border border-emerald-500/30 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/15 hover:text-white shadow-md'
                }`}
              >
                <div className="flex items-center justify-between gap-2 w-full mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-emerald-400 text-black' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span className={`font-bold text-sm leading-tight ${isSelected ? 'text-white' : 'text-emerald-200'}`}>
                      {court.name}
                    </span>
                  </div>
                  {isSelected ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-400 text-[#07120b] shadow-[0_0_8px_#34d399]">
                      SELECCIONADA
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-500/80 font-bold group-hover:text-emerald-300">
                      Ver horarios
                    </span>
                  )}
                </div>

                {court.description && (
                  <p className={`text-[11px] leading-tight line-clamp-1 mt-1 ${isSelected ? 'text-gray-200' : 'text-gray-400'}`}>
                    {court.description}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Grilla de Horarios en Vivo */}
      <div className="bg-[#09120c] border border-brand-gold/20 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-gold" />
              <h2 className="text-base sm:text-lg font-bold text-white serif-brand">
                Horarios Disponibles — <span className="text-brand-gold">{selectedCourt?.name}</span>
              </h2>
            </div>
            {selectedCourt?.description && (
              <p className="text-xs text-gray-400 mt-0.5">{selectedCourt.description}</p>
            )}
          </div>

          {/* Quick Legend */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Disponible
            </span>
            <span className="flex items-center gap-1 text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span> En Clase / Bloqueo
            </span>
            <span className="flex items-center gap-1 text-gray-400">
              <span className="w-2 h-2 rounded-full bg-gray-500"></span> Ocupado
            </span>
          </div>
        </div>

        {/* Grid Slots */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {TIME_SLOTS.map(time => {
            const res = getSlotInfo(time);
            const isMine = res && res.memberCode === currentMemberCode;
            const isClass = res && (res.reservationType === 'CLASS' || res.reservationType === 'ESCUELA_DEPORTIVA');
            const isMaintenance = res && res.reservationType === 'MAINTENANCE';
            const isOccupied = !!res && !isMine && !isClass && !isMaintenance;

            if (isMine) {
              return (
                <div
                  key={time}
                  className="p-3.5 rounded-2xl border border-brand-gold bg-brand-gold/15 text-white flex flex-col justify-between shadow-[0_0_15px_rgba(204,161,75,0.2)]"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-base text-brand-gold">{time}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-gold text-black font-black">TUYA</span>
                  </div>
                  <span className="text-[10px] text-gray-300 mt-2 truncate">Reserva Confirmada</span>
                </div>
              );
            }

            if (isClass) {
              return (
                <div
                  key={time}
                  className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300 flex flex-col justify-between opacity-85 cursor-not-allowed"
                  title={res.title || 'Clase Deportiva'}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-base text-amber-200">{time}</span>
                    <Dumbbell className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="mt-2">
                    <span className="text-[10px] font-bold block truncate">{res.title || 'Clases de Tenis'}</span>
                    <span className="text-[9px] text-amber-400/75 block">No disponible</span>
                  </div>
                </div>
              );
            }

            if (isMaintenance) {
              return (
                <div
                  key={time}
                  className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-300 flex flex-col justify-between opacity-85 cursor-not-allowed"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-base text-rose-200">{time}</span>
                    <Wrench className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <span className="text-[10px] text-rose-300 mt-2 truncate">Mantenimiento</span>
                </div>
              );
            }

            if (isOccupied) {
              return (
                <div
                  key={time}
                  className="p-3.5 rounded-2xl border border-white/5 bg-black/40 text-gray-500 flex flex-col justify-between cursor-not-allowed"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-base text-gray-400">{time}</span>
                    <span className="w-2 h-2 rounded-full bg-gray-600"></span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-2">Reservado</span>
                </div>
              );
            }

            // Available Slot
            return (
              <button
                key={time}
                onClick={() => handleSlotClick(time)}
                className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-500/20 hover:border-brand-gold text-white flex flex-col justify-between group transition-all hover:scale-[1.03] hover:shadow-goldGlow text-left"
              >
                <div className="flex justify-between items-center w-full">
                  <span className="font-mono font-bold text-base text-emerald-400 group-hover:text-brand-gold transition-colors">
                    {time}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover:bg-brand-gold transition-colors shadow-[0_0_8px_#10b981]"></span>
                </div>
                <div className="mt-2 flex items-center justify-between w-full">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-300/80 font-bold group-hover:text-white">
                    Disponible
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:text-brand-gold group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100" />
                </div>
              </button>
            );
          })}
        </div>

      </div>

      {/* Modal de Confirmación Rápida con 1 o 2 Horas */}
      {isModalOpen && selectedCourt && selectedTime && (() => {
        const startH = parseInt(selectedTime.split(':')[0]);
        const nextHourStr = `${(startH + 1).toString().padStart(2, '0')}:00`;
        const nextSlotOccupied = getSlotInfo(nextHourStr);
        const canBook2Hours = !nextSlotOccupied && startH < 21;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-[#0c1712] border border-brand-gold/40 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden space-y-5">
              
              <div className="flex justify-between items-start border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-gold">
                    Club Los Sargentos
                  </span>
                  <h3 className="text-xl font-bold text-white serif-brand mt-0.5">
                    Confirmar Tu Reserva
                  </h3>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-xl text-gray-400 hover:text-white hover:bg-white/10"
                >
                  ✕
                </button>
              </div>

              {/* Selector de Duración (1 o 2 Horas) */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Selecciona la Duración</span>
                  <span className="text-brand-gold text-[10px] font-bold">(Máximo 2 horas)</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDurationHours(1)}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                      durationHours === 1
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] font-black scale-[1.02]'
                        : 'bg-black/50 border-white/15 text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>1 Hora</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {selectedTime} - {`${(startH + 1).toString().padStart(2, '0')}:00`}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={!canBook2Hours}
                    onClick={() => canBook2Hours && setDurationHours(2)}
                    className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                      !canBook2Hours
                        ? 'bg-black/20 border-white/5 text-gray-600 cursor-not-allowed opacity-50'
                        : durationHours === 2
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] font-black scale-[1.02]'
                        : 'bg-black/50 border-white/15 text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>2 Horas</span>
                    </div>
                    <span className="text-[10px] font-mono">
                      {canBook2Hours ? (
                        <span className="text-gray-400">{selectedTime} - {`${(startH + 2).toString().padStart(2, '0')}:00`}</span>
                      ) : (
                        <span className="text-rose-400/90 font-sans text-[9px]">Siguiente hora ocupada</span>
                      )}
                    </span>
                  </button>
                </div>
              </div>

              {/* Reservation Summary Box */}
              <div className="bg-black/50 p-4 rounded-2xl border border-brand-gold/20 space-y-2 text-xs text-gray-300">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Disciplina:</span>
                  <span className="font-bold text-brand-gold">{selectedCourt.sport}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Espacio / Cancha:</span>
                  <span className="font-bold text-white">{selectedCourt.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Fecha:</span>
                  <span className="font-bold text-white capitalize">
                    {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Horario Reservado:</span>
                  <span className="font-bold text-emerald-400 font-mono text-sm">
                    {selectedTime} - {`${(startH + durationHours).toString().padStart(2, '0')}:00`} ({durationHours} {durationHours === 1 ? 'hora' : 'horas'})
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">Titular de Reserva:</span>
                  <span className="font-bold text-white">{formData.memberName}</span>
                </div>
              </div>

              {/* Quick Auto-filled Form */}
              <form onSubmit={handleBooking} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Teléfono / WhatsApp de Contacto</span>
                    <span className="text-rose-400 font-black text-[10px] uppercase bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/40">* Obligatorio</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.memberPhone}
                    onChange={e => setFormData({ ...formData, memberPhone: e.target.value })}
                    placeholder="Ej. 70123456 o +591 70123456"
                    className="w-full bg-black/60 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder:text-gray-600"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Número de celular de 8 dígitos de Bolivia (comenzando con 6 o 7, ej. 70123456).
                  </p>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 glass-button-primary py-3 text-xs font-bold flex items-center justify-center gap-2 shadow-goldGlow"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Confirmar Reserva</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          </div>
        );
      })()}

      {/* Success Modal Screen */}
      {bookingSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b1812] border border-brand-gold/40 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-brand-green rounded-full flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(16,185,129,0.5)]">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>

            <h3 className="text-2xl font-bold text-brand-gold serif-brand">
              ¡Reserva Confirmada!
            </h3>
            
            <p className="text-xs text-gray-300 max-w-xs mx-auto leading-relaxed">
              Tu turno en <strong className="text-white">{bookingSuccess.courtName}</strong> ha sido reservado para el <strong className="text-white">{bookingSuccess.date}</strong> de <strong className="text-emerald-400 font-mono">{bookingSuccess.time}</strong>.
            </p>

            <button
              onClick={() => {
                setBookingSuccess(null);
                setIsModalOpen(false);
              }}
              className="glass-button-primary px-8 py-3 text-xs font-bold uppercase tracking-wider w-full shadow-goldGlow mt-4"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
