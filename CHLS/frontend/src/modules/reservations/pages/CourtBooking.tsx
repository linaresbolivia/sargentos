import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@store/store';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '@store/authSlice';
import { api } from '@config/api';
import toast from 'react-hot-toast';
import qrPagosUrl from '../../../assets/qr-pagos.jpg';
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
  Home,
  Users,
  UserPlus,
  QrCode,
  MessageSquare,
  Send,
  Download,
  Copy,
  Check,
  UploadCloud,
  CreditCard,
  FileCheck,
  ExternalLink,
  Search,
  X,
  Plus,
  BadgeCheck
} from 'lucide-react';
import { format, addDays, startOfToday, parseISO, isSameDay, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import CrestLogo from '@shared/components/CrestLogo';

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
  court?: Court;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  reservationType: string;
  playerType?: string;
  guestsCount?: number;
  playerNames?: string | null;
  courtFee?: number;
  guestFee?: number;
  totalPrice?: number;
  paymentStatus?: string;
  paymentReceiptUrl?: string | null;
  title?: string | null;
  notes?: string | null;
  memberCode?: string | null;
  memberName: string;
  memberPhone?: string | null;
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

interface GuestItem {
  id?: string;
  fullName: string;
  documentId?: string;
  phone?: string;
  email?: string;
}

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
  
  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Auto-filled Socio Details
  const currentMemberCode = user?.documentId || user?.email?.split('@')[0]?.toUpperCase() || 'SOCIO-CHLS';
  const currentMemberName = `${user?.firstName || 'Socio'} ${user?.lastName || 'CHLS'}`.trim();

  const [formData, setFormData] = useState({
    memberCode: currentMemberCode,
    memberName: currentMemberName,
    memberPhone: user?.phone || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [durationHours, setDurationHours] = useState<number>(1);
  const [playerType, setPlayerType] = useState<'FAMILY' | 'GUESTS' | 'MEMBERS'>('FAMILY');
  const [guestsCount, setGuestsCount] = useState<number>(1);
  const [playerNames, setPlayerNames] = useState<string>('');
  
  // Guest registry in database states
  const [selectedGuests, setSelectedGuests] = useState<GuestItem[]>([]);
  const [guestSearchQuery, setGuestSearchQuery] = useState('');
  const [dbGuests, setDbGuests] = useState<GuestItem[]>([]);
  const [isSearchingGuests, setIsSearchingGuests] = useState(false);
  const [showNewGuestForm, setShowNewGuestForm] = useState(false);
  const [newGuestData, setNewGuestData] = useState({ fullName: '', documentId: '', phone: '' });
  const [isSavingGuest, setIsSavingGuest] = useState(false);

  // Partner members state (Entre Socios)
  const [selectedPartnerMembers, setSelectedPartnerMembers] = useState<{ id: string; fullName: string; alphaCode: string }[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [dbMembers, setDbMembers] = useState<any[]>([]);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);

  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);
  const [selectedForQrModal, setSelectedForQrModal] = useState<Reservation | null>(null);
  const [showMyReservationsSheet, setShowMyReservationsSheet] = useState(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate 7-day quick date picker items
  const next7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(today, i));
  }, [today]);

  useEffect(() => {
    fetchCourts();
    fetchMyReservations();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchReservations();
    }
  }, [selectedDate]);

  // Synchronize playerNames and guest count
  useEffect(() => {
    if (playerType === 'GUESTS') {
      const namesStr = selectedGuests.map(g => `${g.fullName}${g.documentId ? ` (CI: ${g.documentId})` : ''}`).join(', ');
      setPlayerNames(namesStr);
    } else if (playerType === 'MEMBERS') {
      const membersStr = selectedPartnerMembers.map(m => `${m.fullName} [${m.alphaCode}]`).join(', ');
      setPlayerNames(membersStr);
    }
  }, [selectedGuests, selectedPartnerMembers, playerType]);

  // Fetch initial database guests when modal opens or query changes
  useEffect(() => {
    if (isModalOpen && playerType === 'GUESTS') {
      fetchDbGuests(guestSearchQuery);
    }
  }, [isModalOpen, guestSearchQuery, playerType]);

  const fetchDbGuests = async (query = '') => {
    setIsSearchingGuests(true);
    try {
      const res = await api.get(`/reservations/guests/search?query=${encodeURIComponent(query)}&hostMemberCode=${encodeURIComponent(currentMemberCode || '')}`);
      setDbGuests(res.data || []);
    } catch (err) {
      console.error('Error buscando invitados en BD:', err);
    } finally {
      setIsSearchingGuests(false);
    }
  };

  const handleSaveAndAddGuest = async () => {
    if (!newGuestData.fullName.trim()) {
      toast.error('Por favor ingresa el nombre completo del invitado');
      return;
    }
    setIsSavingGuest(true);
    try {
      const res = await api.post('/reservations/guests', {
        fullName: newGuestData.fullName.trim(),
        documentId: newGuestData.documentId.trim() || undefined,
        phone: newGuestData.phone.trim() || undefined,
        hostMemberCode: currentMemberCode,
      });

      const savedGuest: GuestItem = res.data.guest;
      toast.success(`Invitado "${savedGuest.fullName}" guardado en la base de datos ✅`);
      
      const updated = [...selectedGuests.filter(g => g.fullName.toLowerCase() !== savedGuest.fullName.toLowerCase()), savedGuest];
      setSelectedGuests(updated);
      if (updated.length > guestsCount) {
        setGuestsCount(updated.length);
      }

      setNewGuestData({ fullName: '', documentId: '', phone: '' });
      setShowNewGuestForm(false);
      fetchDbGuests('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al registrar invitado en la base de datos');
    } finally {
      setIsSavingGuest(false);
    }
  };

  const handleSelectDbGuest = (guest: GuestItem) => {
    if (selectedGuests.some(g => (g.documentId && g.documentId === guest.documentId) || g.fullName.toLowerCase() === guest.fullName.toLowerCase())) {
      toast.error('Este invitado ya se encuentra seleccionado.');
      return;
    }
    const updated = [...selectedGuests, guest];
    setSelectedGuests(updated);
    if (updated.length > guestsCount) {
      setGuestsCount(updated.length);
    }
    setGuestSearchQuery('');
  };

  const handleRemoveGuest = (index: number) => {
    const updated = selectedGuests.filter((_, i) => i !== index);
    setSelectedGuests(updated);
  };

  const fetchDbMembers = async (query = '') => {
    if (!query || query.length < 2) {
      setDbMembers([]);
      return;
    }
    setIsSearchingMembers(true);
    try {
      const res = await api.get(`/reservations/members/search?query=${encodeURIComponent(query)}`);
      setDbMembers(res.data || []);
    } catch (err) {
      console.error('Error buscando socios:', err);
    } finally {
      setIsSearchingMembers(false);
    }
  };

  const handleSelectPartnerMember = (member: { id: string; fullName: string; alphaCode: string }) => {
    if (selectedPartnerMembers.some(m => m.id === member.id)) {
      toast.error('Este socio ya está agregado.');
      return;
    }
    const updated = [...selectedPartnerMembers, member];
    setSelectedPartnerMembers(updated);
    setMemberSearchQuery('');
    setDbMembers([]);
  };

  const handleRemovePartnerMember = (id: string) => {
    setSelectedPartnerMembers(selectedPartnerMembers.filter(m => m.id !== id));
  };

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

  // Dynamic fee calculations
  const hourlyRate = selectedCourt?.hourlyRate ?? 30;
  const guestRate = selectedCourt?.guestRate ?? 25;
  const currentCourtFee = hourlyRate * durationHours;
  const currentGuestFee = playerType === 'GUESTS' ? guestsCount * guestRate : 0;
  const currentTotalPrice = currentCourtFee + currentGuestFee;

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
      setPlayerType('FAMILY');
      setGuestsCount(1);
      setPlayerNames('');
      setIsModalOpen(true);
    } else if (res.memberCode === currentMemberCode) {
      setSelectedForQrModal(res);
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
        playerType,
        guestsCount: playerType === 'GUESTS' ? guestsCount : 0,
        playerNames: playerNames.trim() || undefined,
        courtFee: currentCourtFee,
        guestFee: currentGuestFee,
        totalPrice: currentTotalPrice,
      });

      const newReservation = res.data.reservation;

      setBookingSuccess({
        id: newReservation?.id || 'res-' + Date.now(),
        code: newReservation?.code,
        courtName: selectedCourt.name,
        sport: selectedCourt.sport,
        date: format(selectedDate, "EEEE d 'de' MMMM", { locale: es }),
        dateRaw: dateStr,
        time: `${selectedTime} - ${endTime}`,
        startTime: selectedTime,
        endTime,
        memberName: formData.memberName,
        memberPhone: formData.memberPhone.trim(),
        playerType,
        guestsCount: playerType === 'GUESTS' ? guestsCount : 0,
        playerNames: playerNames.trim(),
        courtFee: currentCourtFee,
        guestFee: currentGuestFee,
        totalPrice: currentTotalPrice,
        paymentStatus: 'PENDING_PAYMENT'
      });

      toast.success('¡Reserva registrada con éxito!');
      fetchReservations();
      fetchMyReservations();
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al procesar la reserva');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (reservationId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingReceipt(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        await api.post(`/reservations/${reservationId}/receipt`, { receiptBase64: base64 });
        toast.success('Comprobante adjuntado con éxito. En revisión por administración.');
        fetchMyReservations();
        if (bookingSuccess && bookingSuccess.id === reservationId) {
          setBookingSuccess({ ...bookingSuccess, paymentStatus: 'PAID' });
        }
        if (selectedForQrModal && selectedForQrModal.id === reservationId) {
          setSelectedForQrModal({ ...selectedForQrModal, paymentStatus: 'PAID' });
        }
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Error al subir comprobante');
      } finally {
        setIsUploadingReceipt(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenWhatsAppProof = (r: {
    courtName?: string;
    date: string;
    time: string;
    totalPrice?: number;
    memberName: string;
  }) => {
    const text = `Hola Club Hípico Los Sargentos 🐴, adjunto comprobante de pago de mi reserva de cancha:%0A%0A` +
      `🏟️ *Cancha:* ${r.courtName || 'Cancha del Club'}%0A` +
      `📅 *Fecha:* ${r.date}%0A` +
      `⏰ *Horario:* ${r.time}%0A` +
      `👤 *Socio:* ${r.memberName}%0A` +
      `💰 *Monto:* Bs. ${r.totalPrice || 30}%0A%0A` +
      `Agradezco la verificación de mi turno. ¡Muchas gracias!`;
    
    window.open(`https://wa.me/59170123456?text=${text}`, '_blank');
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
              {myReservations.map(res => {
                const isPaid = res.paymentStatus === 'VERIFIED' || res.paymentStatus === 'PAID';
                const isVerified = res.paymentStatus === 'VERIFIED';
                const isPending = !res.paymentStatus || res.paymentStatus === 'PENDING_PAYMENT';

                return (
                  <div 
                    key={res.id}
                    className="p-3.5 rounded-xl bg-black/40 border border-brand-gold/20 flex flex-col justify-between gap-2.5"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-white text-xs">{res.court?.name}</span>
                          <span className="text-[10px] text-brand-gold bg-brand-gold/10 px-1.5 py-0.5 rounded">
                            {res.court?.sport}
                          </span>
                          <span className="text-[10px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                            #{res.code || res.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-300 mt-1 flex items-center gap-2 font-mono">
                          <span>{format(parseISO(res.date), 'dd/MM/yyyy')}</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-bold">{res.startTime} - {res.endTime}</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {isVerified ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                            <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" /> Reserva Consolidada
                          </span>
                        ) : res.paymentStatus === 'PAID' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" /> Reserva en Proceso (Validando Pago)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 animate-pulse">
                            <AlertCircle className="w-3 h-3 text-amber-400" /> Reserva en Proceso (Pendiente Pago)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Player Info & Price Bar */}
                    <div className="bg-[#051009] p-2 rounded-lg border border-white/5 flex items-center justify-between text-[11px] text-gray-300">
                      <div className="flex items-center gap-1.5 truncate">
                        <Users className="w-3.5 h-3.5 text-brand-gold shrink-0" />
                        <span className="truncate">
                          {res.playerType === 'GUESTS' 
                            ? `Con Invitados (${res.guestsCount || 1})` 
                            : res.playerType === 'MEMBERS' 
                            ? 'Entre Socios' 
                            : 'Familia (Socio + Fam.)'}
                        </span>
                      </div>
                      <div className="font-bold text-white font-mono shrink-0 ml-2">
                        Bs. {res.totalPrice ?? (res.court?.hourlyRate ?? 30)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                      <button
                        onClick={() => setSelectedForQrModal(res)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-brand-gold/15 hover:bg-brand-gold/25 border border-brand-gold/30 text-brand-gold hover:text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>{isPaid ? 'Ver Detalle / QR' : 'Pagar con QR / Comprobante'}</span>
                      </button>

                      <button
                        onClick={() => handleCancelMyReservation(res.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-bold flex items-center gap-1 transition-colors"
                        title="Cancelar reserva"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Liberar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
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

      {/* 2. Selector de Cancha / Espacio / Mesa Específica */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-brand-gold flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-400" />
            2. SELECCIONA {unitSingularUpper === 'MESA' ? 'LA MESA' : unitSingularUpper === 'ESPACIO' ? 'EL ESPACIO' : 'LA CANCHA'} <span className="text-emerald-400 text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40">({filteredCourts.length} {filteredCourts.length === 1 ? 'disponible' : 'disponibles'})</span>
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

      {/* 3. Selector de Fecha (Carrusel de 7 Días Rápidos) */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold uppercase tracking-wider text-brand-gold block">
            3. Selecciona la Fecha (Próximos 7 días)
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

      {/* Modal de Reserva con Selección de Modalidad (Familia / Invitados / Socios) & Precios */}
      {isModalOpen && selectedCourt && selectedTime && (() => {
        const startH = parseInt(selectedTime.split(':')[0]);
        const nextHourStr = `${(startH + 1).toString().padStart(2, '0')}:00`;
        const nextSlotOccupied = getSlotInfo(nextHourStr);
        const canBook2Hours = !nextSlotOccupied && startH < 21;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
            <div className="bg-[#0c1712] border border-brand-gold/40 rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden space-y-4 my-6">
              
              <div className="flex justify-between items-start border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <CrestLogo size="sm" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-gold">
                      Club Hípico Los Sargentos
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-white serif-brand">
                      Reservar Cancha Deportiva
                    </h3>
                  </div>
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
                  <span>1. Duración del Turno</span>
                  <span className="text-brand-gold text-[10px] font-bold">(Máx. 2 horas)</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDurationHours(1)}
                    className={`py-2 px-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
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
                    className={`py-2 px-3 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
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

              {/* Selector de Modalidad de Juego: Familia / Invitados / Socios */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                  <span>2. ¿Con quiénes jugarás?</span>
                  <span className="text-emerald-400 text-[10px] font-bold">* Registro Requerido</span>
                </label>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPlayerType('FAMILY')}
                    className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      playerType === 'FAMILY'
                        ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] font-bold scale-[1.02]'
                        : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    <span className="text-lg">👨‍👩‍👧‍👦</span>
                    <div className="mt-1">
                      <span className="text-xs font-bold block text-white">Familia</span>
                      <span className="text-[9px] text-gray-400 block">Socio + Fam.</span>
                    </div>
                    <span className="text-[9px] text-emerald-400 mt-1 font-mono">Uso Cancha</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlayerType('GUESTS')}
                    className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      playerType === 'GUESTS'
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)] font-bold scale-[1.02]'
                        : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    <span className="text-lg">👥</span>
                    <div className="mt-1">
                      <span className="text-xs font-bold block text-white">Invitados</span>
                      <span className="text-[9px] text-gray-400 block">No socios</span>
                    </div>
                    <span className="text-[9px] text-amber-400 mt-1 font-mono">+Bs. {guestRate}/inv.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlayerType('MEMBERS')}
                    className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      playerType === 'MEMBERS'
                        ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] font-bold scale-[1.02]'
                        : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    <span className="text-lg">🎾</span>
                    <div className="mt-1">
                      <span className="text-xs font-bold block text-white">Entre Socios</span>
                      <span className="text-[9px] text-gray-400 block">Del Club</span>
                    </div>
                    <span className="text-[9px] text-emerald-400 mt-1 font-mono">Uso Cancha</span>
                  </button>
                </div>

                {/* Sub-opciones si es con Invitados */}
                {playerType === 'GUESTS' && (
                  <div className="p-3.5 bg-gradient-to-b from-amber-500/15 to-amber-950/20 border border-amber-500/30 rounded-2xl space-y-3 animate-fade-in">
                    
                    {/* Selector de Cantidad de Invitados */}
                    <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
                      <div>
                        <label className="text-[11px] font-bold text-amber-300 block">
                          Cantidad de Invitados Externos:
                        </label>
                        <span className="text-[10px] text-gray-400">
                          Arancel: Bs. {guestRate}/invitado ({guestsCount} × Bs. {guestRate} = Bs. {guestsCount * guestRate})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4].map(num => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => {
                              setGuestsCount(num);
                              if (selectedGuests.length > num) {
                                setSelectedGuests(selectedGuests.slice(0, num));
                              }
                            }}
                            className={`w-7 h-7 rounded-lg text-xs font-bold font-mono transition-all ${
                              guestsCount === num
                                ? 'bg-amber-400 text-black font-black shadow-[0_0_8px_#f59e0b]'
                                : 'bg-black/50 text-gray-300 border border-white/10 hover:text-white'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Lista de Invitados Seleccionados */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-gray-300">
                          Invitados Registrados ({selectedGuests.length} de {guestsCount}):
                        </span>
                        {selectedGuests.length < guestsCount && (
                          <span className="text-amber-400 font-bold text-[10px]">
                            * Faltan {guestsCount - selectedGuests.length} por registrar
                          </span>
                        )}
                      </div>

                      {selectedGuests.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedGuests.map((guest, idx) => (
                            <div 
                              key={guest.id || idx}
                              className="p-2 bg-black/60 border border-amber-500/30 rounded-xl flex items-center justify-between gap-2 shadow-sm animate-fade-in"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs">👤</span>
                                  <strong className="text-xs text-white truncate block">{guest.fullName}</strong>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[9px] text-gray-400">
                                  {guest.documentId && (
                                    <span className="bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-mono">
                                      CI: {guest.documentId}
                                    </span>
                                  )}
                                  {guest.phone && <span>📱 {guest.phone}</span>}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveGuest(idx)}
                                className="p-1 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                title="Quitar invitado"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-gray-400 italic bg-black/30 p-2 rounded-xl border border-white/5 text-center">
                          Aún no has seleccionado invitados. Búscalos abajo en la base de datos o crea uno nuevo.
                        </div>
                      )}
                    </div>

                    {/* Buscador de Invitados en la Base de Datos o Formulario de Registro */}
                    {selectedGuests.length < guestsCount && (
                      <div className="space-y-2 pt-1">
                        {!showNewGuestForm ? (
                          <div className="space-y-2">
                            {/* Input Buscador */}
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 text-amber-400/70 absolute left-3 top-2.5" />
                              <input
                                type="text"
                                value={guestSearchQuery}
                                onChange={e => setGuestSearchQuery(e.target.value)}
                                placeholder="🔍 Buscar invitado en base de datos por Nombre o CI..."
                                className="w-full bg-black/70 border border-white/20 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-400"
                              />
                            </div>

                            {/* Resultados de Búsqueda o Invitados Frecuentes */}
                            {dbGuests.length > 0 ? (
                              <div className="space-y-1">
                                <span className="text-[10px] text-amber-300/80 font-bold block">
                                  {guestSearchQuery ? 'Resultados encontrados en Base de Datos:' : 'Invitados Frecuentes / Registrados:'}
                                </span>
                                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                                  {dbGuests.map(g => {
                                    const isAlreadyAdded = selectedGuests.some(sel => sel.fullName.toLowerCase() === g.fullName.toLowerCase());
                                    return (
                                      <div
                                        key={g.id}
                                        className="p-1.5 bg-black/50 hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/30 rounded-xl flex items-center justify-between gap-2 text-xs transition-colors"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <span className="font-bold text-gray-200 block truncate">{g.fullName}</span>
                                          <div className="flex items-center gap-2 text-[9px] text-gray-400">
                                            {g.documentId && <span className="font-mono text-amber-400/90">CI: {g.documentId}</span>}
                                            {g.phone && <span>Tel: {g.phone}</span>}
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          disabled={isAlreadyAdded}
                                          onClick={() => handleSelectDbGuest(g)}
                                          className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                                            isAlreadyAdded
                                              ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                                              : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                                          }`}
                                        >
                                          {isAlreadyAdded ? 'Agregado' : '+ Seleccionar'}
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="text-[10px] text-gray-400 text-center py-1">
                                {guestSearchQuery ? 'No se encontraron coincidencias en la base de datos.' : 'No hay invitados previos registrados.'}
                              </div>
                            )}

                            {/* Botón para abrir el formulario de nuevo invitado */}
                            <button
                              type="button"
                              onClick={() => setShowNewGuestForm(true)}
                              className="w-full py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-dashed border-amber-500/50 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Registrar Nuevo Invitado en Base de Datos</span>
                            </button>
                          </div>
                        ) : (
                          /* Mini Formulario de Nuevo Invitado */
                          <div className="p-3 bg-black/80 border border-amber-500/40 rounded-xl space-y-2 animate-fade-in">
                            <div className="flex items-center justify-between border-b border-white/10 pb-1">
                              <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                                <UserPlus className="w-3.5 h-3.5" /> Registrar Nuevo Invitado en BD
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowNewGuestForm(false)}
                                className="text-gray-400 hover:text-white text-xs"
                              >
                                ✕
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] text-gray-300 font-bold mb-0.5">
                                  Nombre Completo *
                                </label>
                                <input
                                  type="text"
                                  value={newGuestData.fullName}
                                  onChange={e => setNewGuestData({ ...newGuestData, fullName: e.target.value })}
                                  placeholder="Ej. Ana Roca"
                                  className="w-full bg-black/60 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-300 font-bold mb-0.5">
                                  Carnet de Identidad (CI)
                                </label>
                                <input
                                  type="text"
                                  value={newGuestData.documentId}
                                  onChange={e => setNewGuestData({ ...newGuestData, documentId: e.target.value })}
                                  placeholder="Ej. 8392101 LP"
                                  className="w-full bg-black/60 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] text-gray-300 font-bold mb-0.5">
                                Teléfono / WhatsApp (Opcional)
                              </label>
                              <input
                                type="tel"
                                value={newGuestData.phone}
                                onChange={e => setNewGuestData({ ...newGuestData, phone: e.target.value })}
                                placeholder="Ej. 70123456"
                                className="w-full bg-black/60 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                              />
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                disabled={isSavingGuest}
                                onClick={handleSaveAndAddGuest}
                                className="flex-1 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold flex items-center justify-center gap-1 shadow-md transition-colors"
                              >
                                {isSavingGuest ? (
                                  <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Guardar en BD y Añadir</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowNewGuestForm(false)}
                                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Resumen de texto sincronizado */}
                    {playerNames && (
                      <div className="text-[10px] text-amber-300/90 font-mono bg-black/40 px-2.5 py-1 rounded-lg border border-white/5 truncate">
                        Acompañantes: {playerNames}
                      </div>
                    )}
                  </div>
                )}

                {/* Sub-opciones si es Familia */}
                {playerType === 'FAMILY' && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-1.5 animate-fade-in">
                    <label className="block text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                      Nombres de tus familiares acompañantes:
                    </label>
                    <input
                      type="text"
                      value={playerNames}
                      onChange={e => setPlayerNames(e.target.value)}
                      placeholder="Ej: Esposa e hijos / Andrea Mendoza (Hija)"
                      className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-400"
                    />
                    <p className="text-[10px] text-emerald-400/80">
                      * El socio y su grupo familiar pagan únicamente el costo regular de uso de la cancha.
                    </p>
                  </div>
                )}

                {/* Sub-opciones si es Entre Socios */}
                {playerType === 'MEMBERS' && (
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl space-y-2 animate-fade-in">
                    <label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                      Buscar y Registrar Socios del Club:
                    </label>

                    {/* Socios Seleccionados */}
                    {selectedPartnerMembers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {selectedPartnerMembers.map(m => (
                          <div 
                            key={m.id}
                            className="bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-1 rounded-xl text-xs flex items-center gap-1.5 text-white shadow-sm"
                          >
                            <span className="font-bold">{m.fullName}</span>
                            <span className="text-[9px] text-indigo-300 font-mono">[{m.alphaCode}]</span>
                            <button
                              type="button"
                              onClick={() => handleRemovePartnerMember(m.id)}
                              className="text-gray-400 hover:text-rose-400 ml-0.5"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Buscador de Socios */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-indigo-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={memberSearchQuery}
                        onChange={e => {
                          setMemberSearchQuery(e.target.value);
                          fetchDbMembers(e.target.value);
                        }}
                        placeholder="🔍 Buscar socio por nombre o código (ej. M-102 o Carlos)..."
                        className="w-full bg-black/60 border border-white/20 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-400"
                      />
                    </div>

                    {/* Dropdown de Socios Encontrados */}
                    {dbMembers.length > 0 && (
                      <div className="max-h-28 overflow-y-auto bg-black/80 border border-indigo-500/30 rounded-xl p-1 space-y-1">
                        {dbMembers.map(mem => (
                          <div 
                            key={mem.id}
                            onClick={() => handleSelectPartnerMember(mem)}
                            className="p-1.5 hover:bg-indigo-500/20 rounded-lg flex items-center justify-between cursor-pointer text-xs transition-colors"
                          >
                            <div>
                              <strong className="text-white block">{mem.fullName}</strong>
                              <span className="text-[10px] text-indigo-300 font-mono">Código: {mem.alphaCode} • CI: {mem.documentId}</span>
                            </div>
                            <span className="text-indigo-300 text-[10px] font-bold">+ Agregar</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-[10px] text-gray-400 mt-1">
                      * Registro de socios compañeros para control deportivo.
                    </p>
                  </div>
                )}
              </div>

              {/* Desglose de Precios y Resumen */}
              <div className="bg-black/60 p-3.5 rounded-2xl border border-brand-gold/30 space-y-2 text-xs text-gray-300">
                <div className="flex justify-between py-0.5 border-b border-white/5">
                  <span className="text-gray-400">Espacio Deportivo:</span>
                  <span className="font-bold text-white">{selectedCourt.name} ({selectedCourt.sport})</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-white/5">
                  <span className="text-gray-400">Horario:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {selectedTime} - {`${(startH + durationHours).toString().padStart(2, '0')}:00`} ({durationHours} {durationHours === 1 ? 'hora' : 'horas'})
                  </span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-white/5">
                  <span className="text-gray-400">Uso de Cancha ({durationHours}h):</span>
                  <span className="font-mono text-white">Bs. {currentCourtFee}</span>
                </div>
                {currentGuestFee > 0 && (
                  <div className="flex justify-between py-0.5 border-b border-white/5 text-amber-300">
                    <span>Arancel Invitados ({guestsCount} pers.):</span>
                    <span className="font-mono font-bold">+Bs. {currentGuestFee}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 text-sm font-bold">
                  <span className="text-brand-gold">TOTAL A PAGAR:</span>
                  <span className="text-brand-gold font-mono text-base">Bs. {currentTotalPrice}</span>
                </div>
              </div>

              {/* Formulario de Contacto & Botón de Reserva */}
              <form onSubmit={handleBooking} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Celular / WhatsApp de Contacto</span>
                    <span className="text-rose-400 font-black text-[10px] uppercase bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/40">* Para Comprobante</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.memberPhone}
                    onChange={e => setFormData({ ...formData, memberPhone: e.target.value })}
                    placeholder="Ej. 70123456 o +591 70123456"
                    className="w-full bg-black/60 border border-white/20 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder:text-gray-600"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Recibirás un mensaje de WhatsApp automático con el resumen y el número para enviar el comprobante.
                  </p>
                </div>

                <div className="pt-1 flex gap-2.5">
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
                    className="flex-2 glass-button-primary py-3 px-4 text-xs font-bold flex items-center justify-center gap-2 shadow-goldGlow"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <QrCode className="w-4 h-4" />
                        <span>Confirmar & Ver QR (Bs. {currentTotalPrice})</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          </div>
        );
      })()}

      {/* Modal de Pago por QR Oficial & WhatsApp Confirmation (Para nueva reserva o consulta) */}
      {(bookingSuccess || selectedForQrModal) && (() => {
        const target = bookingSuccess || selectedForQrModal;
        const courtName = target.court?.name || target.courtName || 'Cancha del Club';
        const sportName = target.court?.sport || target.sport || selectedSport;
        const totalAmount = target.totalPrice ?? (target.courtFee ?? 30);
        const reservationId = target.id;
        const isPaid = target.paymentStatus === 'VERIFIED' || target.paymentStatus === 'PAID';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
            <div className="bg-[#0b1812] border border-brand-gold/50 rounded-3xl p-5 sm:p-7 max-w-lg w-full text-center shadow-[0_0_60px_rgba(0,0,0,0.9)] space-y-4 my-6 relative">
              
              <button 
                onClick={() => {
                  setBookingSuccess(null);
                  setSelectedForQrModal(null);
                }}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                ✕
              </button>

              {/* Centenary Crest Logo */}
              <div className="flex flex-col items-center justify-center">
                <CrestLogo size="md" />
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold mt-1">
                  Club Hípico Los Sargentos
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white serif-brand mt-0.5">
                  Pago Oficial de Reserva
                </h3>
              </div>

              {/* Reservation Details Box */}
              <div className="bg-black/50 p-3.5 rounded-2xl border border-brand-gold/20 text-left text-xs space-y-1.5">
                <div className="flex justify-between items-center text-gray-300">
                  <span>Cancha / Espacio:</span>
                  <strong className="text-white">{courtName} ({sportName})</strong>
                </div>
                <div className="flex justify-between items-center text-gray-300">
                  <span>Fecha & Horario:</span>
                  <strong className="text-emerald-400 font-mono">
                    {target.date || target.dateRaw} • {target.time || `${target.startTime} - ${target.endTime}`}
                  </strong>
                </div>
                <div className="flex justify-between items-center text-gray-300">
                  <span>Titular:</span>
                  <strong className="text-white">{target.memberName || currentMemberName}</strong>
                </div>
                <div className="flex justify-between items-center text-gray-300">
                  <span>Modalidad:</span>
                  <span className="text-brand-gold font-bold">
                    {target.playerType === 'GUESTS' 
                      ? `Con Invitados (${target.guestsCount || 1})` 
                      : target.playerType === 'MEMBERS' 
                      ? 'Entre Socios' 
                      : 'Familia (Socio + Fam.)'}
                  </span>
                </div>
              </div>

              {/* Código Único de Reserva y Monto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="bg-black/60 p-3 rounded-2xl border border-brand-gold/40 flex flex-col justify-between text-left">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold block">
                    Código de Reserva
                  </span>
                  <div className="flex items-center justify-between gap-1 mt-1">
                    <span className="text-base font-black text-brand-gold font-mono tracking-wider truncate">
                      {target.code || ('RES-' + target.id?.slice(0, 8).toUpperCase())}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const c = target.code || target.id?.slice(0, 8).toUpperCase();
                        navigator.clipboard.writeText(c);
                        toast.success(`Código #${c} copiado`);
                      }}
                      className="px-2 py-1 bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                      title="Copiar código"
                    >
                      <Copy className="w-3 h-3" /> Copiar
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-brand-gold/15 via-brand-gold/25 to-brand-gold/15 p-3 rounded-2xl border border-brand-gold/40 flex flex-col justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-brand-gold block font-bold">
                    Monto a Transferir
                  </span>
                  <span className="text-2xl font-black text-brand-gold font-mono mt-0.5 block drop-shadow-[0_0_15px_rgba(204,161,75,0.4)]">
                    Bs. {totalAmount}
                  </span>
                </div>
              </div>

              {/* QR Oficial Luxury Frame */}
              <div className="relative mx-auto max-w-[280px] p-3 rounded-2xl bg-gradient-to-b from-[#1a2d21] to-[#08130c] border-2 border-brand-gold shadow-[0_0_30px_rgba(204,161,75,0.25)]">
                <img 
                  src={qrPagosUrl} 
                  alt="QR Oficial de Pagos Club Los Sargentos" 
                  className="w-full h-auto rounded-xl shadow-lg border border-brand-gold/30 object-contain"
                />
                <div className="mt-2 flex items-center justify-center gap-2">
                  <a
                    href={qrPagosUrl}
                    download="QR-Pagos-Club-Los-Sargentos.jpg"
                    className="text-[11px] text-brand-gold hover:text-white underline font-bold flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar QR
                  </a>
                </div>
              </div>

              {/* Alerta de Instrucción Clara con Código */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-left space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Instrucción para Validar tu Pago:</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Realiza la transferencia QR colocando en la <strong>glosa o motivo bancario: #{target.code || target.id?.slice(0, 8).toUpperCase()}</strong> y <strong>adjunta tu comprobante aquí abajo</strong> para la consolidación inmediata de tu turno.
                </p>
                <p className="text-[10px] text-brand-gold flex items-center gap-1 mt-1">
                  <span>🤖</span> Puedes consultar el estado en cualquier momento enviando tu código al WhatsApp del Club.
                </p>
              </div>

              {/* Caja de Envío Directo de Comprobante desde el Sistema */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-950/40 via-black/80 to-emerald-950/40 border-2 border-emerald-500/50 rounded-2xl space-y-3 shadow-lg">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={e => reservationId && handleFileUpload(reservationId, e)}
                />

                {isPaid ? (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-left">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <strong className="text-xs text-white block">¡Comprobante Enviado por WhatsApp!</strong>
                        <span className="text-[10px] text-emerald-300">En revisión y auditoría de administración</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingReceipt}
                      className="px-2.5 py-1 text-[10px] bg-white/10 hover:bg-white/20 text-gray-200 rounded-lg font-bold transition-colors"
                    >
                      Reemplazar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isUploadingReceipt}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(16,185,129,0.45)] transition-all scale-[1.01] active:scale-[0.99]"
                  >
                    {isUploadingReceipt ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Enviando comprobante por WhatsApp...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>📤 Adjuntar y Enviar Comprobante por WhatsApp</span>
                      </>
                    )}
                  </button>
                )}

                <div className="flex items-center justify-between text-[10px] text-gray-400 pt-0.5">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <BadgeCheck className="w-3.5 h-3.5" /> No necesitas salir de la aplicación
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenWhatsAppProof({
                      courtName,
                      date: target.date || target.dateRaw || 'Fecha seleccionada',
                      time: target.time || `${target.startTime} - ${target.endTime}`,
                      totalPrice: totalAmount,
                      memberName: target.memberName || currentMemberName
                    })}
                    className="text-gray-400 hover:text-white underline"
                  >
                    Abrir WhatsApp manual
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setBookingSuccess(null);
                    setSelectedForQrModal(null);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-colors"
                >
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};

