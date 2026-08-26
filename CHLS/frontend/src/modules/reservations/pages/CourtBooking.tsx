import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@store/store';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '@store/authSlice';
import { api } from '@config/api';
import toast from 'react-hot-toast';
import { ReservationQrDetailsModal } from '../components/ReservationQrDetailsModal';
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
  LogOut,
  Users,
  UserPlus,
  QrCode,
  Download,
  Copy,
  Check,
  UploadCloud,
  CreditCard,
  Search,
  X,
  Plus,
  BadgeCheck,
  Phone,
  PhoneCall,
  HelpCircle,
  Banknote,
  Pencil
} from 'lucide-react';
import { format, addDays, startOfToday, parseISO, isSameDay, isBefore, isSaturday, isSunday } from 'date-fns';
import { es } from 'date-fns/locale';
import CrestLogo from '@shared/components/CrestLogo';
import { BackButton } from '@shared/components/BackButton';
import { compressImage } from '@shared/utils/imageCompressor';

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
  paymentMethod?: string;
  paymentReceiptUrl?: string | null;
  title?: string | null;
  notes?: string | null;
  memberCode?: string | null;
  memberName: string;
  memberPhone?: string | null;
}

const WEEKDAY_TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', 
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', 
  '18:00', '19:00', '20:00', '21:00'
];

const WEEKEND_TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', 
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', 
  '18:00', '19:00'
];

const SPORT_META: Record<string, { 
  label: string; 
  desc: string; 
  unitSingular: string; 
  unitPlural: string;
  guestRate: number;
  contactPhones: string[];
  contactDesc: string;
  isFixedCourtRate?: boolean;
  fixedRate?: number;
  notes: string;
}> = {
  'Tenis': { 
    label: 'Tenis', 
    desc: '6 Canchas de Arcilla', 
    unitSingular: 'cancha', 
    unitPlural: 'canchas',
    guestRate: 50,
    contactPhones: ['+591 76753734', '+591 76753758'],
    contactDesc: 'Caseta y Atención al Socio',
    notes: 'Reserva de 1 hora. Arancel Bs. 50 por invitado.'
  },
  'Pádel': { 
    label: 'Pádel', 
    desc: '2 Canchas Panorámicas', 
    unitSingular: 'cancha', 
    unitPlural: 'canchas',
    guestRate: 80,
    contactPhones: ['+591 76753758', '+591 76753744'],
    contactDesc: 'Caseta y Atención al Socio',
    notes: 'Reserva de 1 hora. Arancel Bs. 80 por invitado.'
  },
  'Frontón': { 
    label: 'Frontón', 
    desc: '2 Espacios Oficiales', 
    unitSingular: 'espacio', 
    unitPlural: 'espacios',
    guestRate: 50,
    contactPhones: ['+591 76753758', '+591 76753734'],
    contactDesc: 'Caseta y Atención al Socio',
    notes: 'Reserva de 1 hora. Arancel Bs. 50 por invitado.'
  },
  'Polifuncional': { 
    label: 'Polifuncional', 
    desc: 'Futsal / Volley / Basket', 
    unitSingular: 'cancha', 
    unitPlural: 'canchas',
    guestRate: 0,
    isFixedCourtRate: true,
    fixedRate: 100,
    contactPhones: ['+591 76753758', '+591 76753744'],
    contactDesc: 'Caseta y Atención al Socio',
    notes: 'Arancel fijo de Bs. 100 con lista de invitados.'
  },
  'Raquet / Wally': { 
    label: 'Raquet / Wally', 
    desc: '2 Espacios de Madera', 
    unitSingular: 'espacio', 
    unitPlural: 'espacios',
    guestRate: 50,
    contactPhones: ['+591 76753743'],
    contactDesc: 'Recepción de Gimnasio',
    notes: 'Reserva de 1 hora. Arancel Bs. 50 por invitado.'
  },
  'Ping Pong': { 
    label: 'Ping Pong', 
    desc: '2 Mesas de Tenis de Mesa', 
    unitSingular: 'mesa', 
    unitPlural: 'mesas',
    guestRate: 50,
    contactPhones: ['+591 76753758'],
    contactDesc: 'Atención al Socio',
    notes: 'Reserva de 1 hora. Arancel Bs. 50 por invitado.'
  },
};

// =========================================================================
// ILUSTRACIONES VECTORIALES 3D HOLOGRÁFICAS (ESTILO IA / MATRIZ LÁSER VERDE)
// =========================================================================
const SportNeonIllustration: React.FC<{ sport: string }> = ({ sport }) => {
  switch (sport) {
    case 'Tenis':
      return (
        <svg viewBox="0 0 280 140" className="w-full h-32 sm:h-36 transition-transform duration-500 group-hover:scale-105 select-none">
          <defs>
            <linearGradient id="aiGridFade" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00ff87" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#00ff87" stopOpacity="0.01" />
            </linearGradient>
            <radialGradient id="aiPulse" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00ff87" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#00ff87" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Sombra de Proyección 3D */}
          <polygon points="42,126 238,126 268,106 72,106" fill="#00ff87" fillOpacity="0.04" filter="blur(6px)" />

          {/* Losa 3D Isométrica con Bisel Láser */}
          <polygon points="38,106 228,106 228,114 38,114" fill="#021a0f" stroke="#00ff87" strokeOpacity="0.35" strokeWidth="0.7" />
          <polygon points="228,106 264,52 264,60 228,114" fill="#011009" stroke="#00ff87" strokeOpacity="0.35" strokeWidth="0.7" />
          <polygon points="74,52 264,52 228,106 38,106" fill="url(#aiGridFade)" stroke="#00ff87" strokeWidth="1" />

          {/* Nodos de Vértice Holográficos */}
          <circle cx="74" cy="52" r="1.8" fill="#00ff87" />
          <circle cx="264" cy="52" r="1.8" fill="#00ff87" />
          <circle cx="228" cy="106" r="1.8" fill="#00ff87" />
          <circle cx="38" cy="106" r="1.8" fill="#00ff87" />

          {/* Trazado de Cancha Láser Ultra-Fino (0.7px - 0.9px) */}
          <polygon points="86,60 248,60 218,98 56,98" fill="none" stroke="#00ff87" strokeOpacity="0.8" strokeWidth="0.8" />
          <line x1="98" y1="60" x2="70" y2="98" stroke="#00ff87" strokeOpacity="0.5" strokeWidth="0.6" />
          <line x1="236" y1="60" x2="204" y2="98" stroke="#00ff87" strokeOpacity="0.5" strokeWidth="0.6" />
          <line x1="104" y1="70" x2="224" y2="70" stroke="#00ff87" strokeOpacity="0.5" strokeWidth="0.6" />
          <line x1="80" y1="88" x2="200" y2="88" stroke="#00ff87" strokeOpacity="0.5" strokeWidth="0.6" />
          <line x1="164" y1="70" x2="140" y2="88" stroke="#00ff87" strokeOpacity="0.7" strokeWidth="0.8" />

          {/* Red 3D Holográfica con Tensión Láser */}
          <line x1="46" y1="68" x2="46" y2="88" stroke="#00ff87" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="46" cy="68" r="1.5" fill="#ffffff" />
          <line x1="246" y1="68" x2="246" y2="88" stroke="#00ff87" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="246" cy="68" r="1.5" fill="#ffffff" />
          <polygon points="46,72 246,72 246,82 46,82" fill="#00ff87" fillOpacity="0.1" stroke="#00ff87" strokeWidth="0.7" />
          <line x1="46" y1="72" x2="246" y2="72" stroke="#00ff87" strokeWidth="1.2" strokeOpacity="0.9" />
          <line x1="146" y1="72" x2="146" y2="82" stroke="#00ff87" strokeWidth="0.8" />

          {/* Raqueta Holográfica 3D Láser */}
          <g transform="translate(54, 88) rotate(-20)">
            <ellipse cx="10" cy="0" rx="10" ry="14" stroke="#00ff87" strokeWidth="1.2" fill="#00ff87" fillOpacity="0.08" />
            <line x1="10" y1="-12" x2="10" y2="12" stroke="#00ff87" strokeOpacity="0.5" strokeWidth="0.5" strokeDasharray="1 1" />
            <line x1="2" y1="0" x2="18" y2="0" stroke="#00ff87" strokeOpacity="0.5" strokeWidth="0.5" strokeDasharray="1 1" />
            <path d="M 7 13 L 10 20 L 13 13" stroke="#00ff87" strokeWidth="1" fill="none" />
            <line x1="10" y1="20" x2="10" y2="34" stroke="#00ff87" strokeWidth="1.8" strokeLinecap="round" />
          </g>

          {/* Partícula de Energía y Vector Balístico */}
          <path d="M 68 96 Q 140 18 212 40" fill="none" stroke="#00ff87" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.7" />
          <circle cx="212" cy="40" r="4.5" fill="#00ff87" stroke="#ffffff" strokeWidth="1" className="drop-shadow-[0_0_8px_#00ff87]" />
          <circle cx="212" cy="40" r="14" fill="url(#aiPulse)" pointerEvents="none" />
        </svg>
      );

    case 'Pádel':
      return (
        <svg viewBox="0 0 280 140" className="w-full h-32 sm:h-36 transition-transform duration-500 group-hover:scale-105 select-none">
          <defs>
            <linearGradient id="aiGlassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00ff87" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#00ff87" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Losa 3D Base */}
          <polygon points="38,106 228,106 228,114 38,114" fill="#021a0f" stroke="#00ff87" strokeOpacity="0.35" strokeWidth="0.7" />
          <polygon points="228,106 264,52 264,60 228,114" fill="#011009" stroke="#00ff87" strokeOpacity="0.35" strokeWidth="0.7" />
          <polygon points="74,52 264,52 228,106 38,106" fill="url(#aiGlassGrad)" stroke="#00ff87" strokeWidth="1" />

          {/* Jaula Panorámica de Cristal 3D (Líneas Finas de Estructura) */}
          <polygon points="74,16 264,16 264,52 74,52" fill="url(#aiGlassGrad)" stroke="#00ff87" strokeOpacity="0.6" strokeWidth="0.9" />
          <line x1="74" y1="16" x2="74" y2="52" stroke="#00ff87" strokeWidth="1.4" />
          <line x1="138" y1="16" x2="138" y2="52" stroke="#00ff87" strokeOpacity="0.4" strokeWidth="0.7" />
          <line x1="202" y1="16" x2="202" y2="52" stroke="#00ff87" strokeOpacity="0.4" strokeWidth="0.7" />
          <line x1="264" y1="16" x2="264" y2="52" stroke="#00ff87" strokeWidth="1.4" />
          <polygon points="264,16 264,52 228,106 228,70" fill="#00ff87" fillOpacity="0.04" stroke="#00ff87" strokeOpacity="0.5" strokeWidth="0.8" />

          {/* Nodos de Esquinas */}
          <circle cx="74" cy="16" r="1.5" fill="#00ff87" />
          <circle cx="264" cy="16" r="1.5" fill="#00ff87" />

          {/* Trazado Interior de Pádel */}
          <line x1="151" y1="52" x2="133" y2="106" stroke="#00ff87" strokeOpacity="0.6" strokeWidth="0.8" strokeDasharray="2 2" />
          <line x1="88" y1="66" x2="242" y2="66" stroke="#00ff87" strokeOpacity="0.5" strokeWidth="0.6" />
          <line x1="62" y1="92" x2="216" y2="92" stroke="#00ff87" strokeOpacity="0.5" strokeWidth="0.6" />

          {/* Red 3D */}
          <line x1="46" y1="74" x2="46" y2="90" stroke="#00ff87" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="246" y1="74" x2="246" y2="90" stroke="#00ff87" strokeWidth="1.6" strokeLinecap="round" />
          <polygon points="46,76 246,76 246,84 46,84" fill="#00ff87" fillOpacity="0.12" stroke="#00ff87" strokeWidth="0.7" />
          <line x1="46" y1="76" x2="246" y2="76" stroke="#00ff87" strokeWidth="1.2" />

          {/* Paleta Holográfica con Matriz Perforada */}
          <g transform="translate(68, 82) rotate(12)">
            <ellipse cx="12" cy="0" rx="12" ry="15" stroke="#00ff87" strokeWidth="1.2" fill="#00ff87" fillOpacity="0.1" />
            <circle cx="8" cy="-5" r="0.9" fill="#00ff87" />
            <circle cx="12" cy="-5" r="0.9" fill="#00ff87" />
            <circle cx="16" cy="-5" r="0.9" fill="#00ff87" />
            <circle cx="6" cy="0" r="0.9" fill="#00ff87" />
            <circle cx="12" cy="0" r="1.1" fill="#ffffff" />
            <circle cx="18" cy="0" r="0.9" fill="#00ff87" />
            <circle cx="8" cy="5" r="0.9" fill="#00ff87" />
            <circle cx="12" cy="5" r="0.9" fill="#00ff87" />
            <circle cx="16" cy="5" r="0.9" fill="#00ff87" />
            <line x1="12" y1="15" x2="12" y2="30" stroke="#00ff87" strokeWidth="2" strokeLinecap="round" />
          </g>

          {/* Esfera de Energía */}
          <circle cx="188" cy="44" r="4.5" fill="#00ff87" stroke="#ffffff" strokeWidth="1" className="drop-shadow-[0_0_8px_#00ff87]" />
        </svg>
      );

    case 'Frontón':
      return (
        <svg viewBox="0 0 280 140" className="w-full h-32 sm:h-36 transition-transform duration-500 group-hover:scale-105 select-none">
          {/* Piso de Frontón 3D */}
          <polygon points="25,108 225,108 260,54 60,54" fill="#00ff87" fillOpacity="0.04" stroke="#00ff87" strokeWidth="0.9" />

          {/* Muro Frontis 3D Estructurado (Monocromático Esmeralda) */}
          <polygon points="20,14 30,10 120,10 110,14" fill="#00ff87" fillOpacity="0.15" stroke="#00ff87" strokeWidth="0.8" />
          <polygon points="110,14 120,10 120,104 110,108" fill="#00ff87" fillOpacity="0.06" stroke="#00ff87" strokeWidth="0.8" />
          <polygon points="20,14 110,14 110,108 20,108" fill="#00ff87" fillOpacity="0.08" stroke="#00ff87" strokeWidth="1.2" />

          {/* Chapa Láser de Alta Intensidad */}
          <rect x="20" y="82" width="90" height="26" fill="#00ff87" fillOpacity="0.12" stroke="#00ff87" strokeWidth="0.8" />
          <line x1="20" y1="82" x2="110" y2="82" stroke="#00ff87" strokeWidth="2.2" className="drop-shadow-[0_0_6px_#00ff87]" />
          <line x1="20" y1="36" x2="110" y2="36" stroke="#00ff87" strokeOpacity="0.5" strokeWidth="0.8" strokeDasharray="2 2" />

          {/* Pared Lateral con Marcas de Falta y Pasa */}
          <polygon points="110,14 250,42 250,104 110,108" fill="#00ff87" fillOpacity="0.03" stroke="#00ff87" strokeOpacity="0.5" strokeWidth="0.8" />
          <line x1="145" y1="50" x2="145" y2="107" stroke="#00ff87" strokeOpacity="0.6" strokeWidth="0.8" />
          <line x1="180" y1="60" x2="180" y2="106" stroke="#00ff87" strokeOpacity="0.6" strokeWidth="0.8" />
          <line x1="215" y1="70" x2="215" y2="105" stroke="#00ff87" strokeWidth="1.2" />

          {/* Vector de Rebote Cinético */}
          <path d="M 215 92 Q 65 30 65 50" fill="none" stroke="#00ff87" strokeWidth="1.2" strokeDasharray="3 2" />
          <circle cx="65" cy="50" r="4.5" fill="#00ff87" stroke="#ffffff" strokeWidth="1" className="drop-shadow-[0_0_8px_#00ff87]" />
        </svg>
      );

    case 'Polifuncional':
      return (
        <svg viewBox="0 0 280 140" className="w-full h-32 sm:h-36 transition-transform duration-500 group-hover:scale-105 select-none">
          {/* Losa 3D Base */}
          <polygon points="38,106 228,106 228,114 38,114" fill="#021a0f" stroke="#00ff87" strokeOpacity="0.35" strokeWidth="0.7" />
          <polygon points="228,106 264,52 264,60 228,114" fill="#011009" stroke="#00ff87" strokeOpacity="0.35" strokeWidth="0.7" />
          <polygon points="74,52 264,52 228,106 38,106" fill="#00ff87" fillOpacity="0.05" stroke="#00ff87" strokeWidth="1" />

          {/* Círculo Central y Línea de Medio Campo */}
          <line x1="151" y1="52" x2="133" y2="106" stroke="#00ff87" strokeWidth="1" />
          <ellipse cx="142" cy="79" rx="15" ry="10" fill="#00ff87" fillOpacity="0.08" stroke="#00ff87" strokeWidth="1" />

          {/* Trazado Láser de Básquetbol y Futsal (Monocromático) */}
          <path d="M 74 62 A 18 14 0 0 1 56 94" fill="none" stroke="#00ff87" strokeOpacity="0.6" strokeWidth="0.8" />
          <polygon points="74,66 88,66 76,90 60,90" fill="#00ff87" fillOpacity="0.06" stroke="#00ff87" strokeOpacity="0.6" strokeWidth="0.7" />
          <path d="M 228 62 A 18 14 0 0 0 210 94" fill="none" stroke="#00ff87" strokeOpacity="0.6" strokeWidth="0.8" />
          <polygon points="228,66 242,66 230,90 216,90" fill="#00ff87" fillOpacity="0.06" stroke="#00ff87" strokeOpacity="0.6" strokeWidth="0.7" />

          {/* Tablero 3D Láser de Básquetbol */}
          <line x1="38" y1="104" x2="38" y2="42" stroke="#00ff87" strokeWidth="1.8" />
          <polygon points="32,34 50,28 50,48 32,54" fill="#00ff87" fillOpacity="0.12" stroke="#00ff87" strokeWidth="1.2" />
          <line x1="42" y1="44" x2="50" y2="44" stroke="#00ff87" strokeWidth="1.4" />
          <circle cx="50" cy="44" r="3" stroke="#00ff87" strokeWidth="1.2" fill="none" />

          {/* Arco 3D de Futsal */}
          <polygon points="252,56 266,50 266,72 252,78" fill="#00ff87" fillOpacity="0.08" stroke="#00ff87" strokeWidth="1.2" />
          <polygon points="252,56 244,60 244,82 252,78" fill="none" stroke="#00ff87" strokeWidth="1.2" />
          <line x1="244" y1="60" x2="258" y2="54" stroke="#00ff87" strokeWidth="1.2" />

          {/* Balón Holográfico */}
          <circle cx="132" cy="72" r="5" fill="#00ff87" stroke="#ffffff" strokeWidth="1" className="drop-shadow-[0_0_8px_#00ff87]" />
        </svg>
      );

    case 'Raquet / Wally':
      return (
        <svg viewBox="0 0 280 140" className="w-full h-32 sm:h-36 transition-transform duration-500 group-hover:scale-105 select-none">
          {/* Habitación Isométrica 3D (Monocromático Esmeralda) */}
          <polygon points="65,24 215,24 215,62 65,62" fill="#00ff87" fillOpacity="0.08" stroke="#00ff87" strokeWidth="1" />
          <line x1="65" y1="44" x2="215" y2="44" stroke="#00ff87" strokeWidth="1.5" />
          <polygon points="215,24 265,56 230,108 215,62" fill="#00ff87" fillOpacity="0.04" stroke="#00ff87" strokeOpacity="0.6" strokeWidth="0.8" />
          <polygon points="65,62 215,62 230,108 40,108" fill="#00ff87" fillOpacity="0.06" stroke="#00ff87" strokeWidth="1" />

          {/* Líneas de Servicio Láser */}
          <line x1="56" y1="78" x2="220" y2="78" stroke="#00ff87" strokeOpacity="0.7" strokeWidth="1" />
          <line x1="48" y1="94" x2="225" y2="94" stroke="#00ff87" strokeOpacity="0.7" strokeWidth="1" />
          <line x1="138" y1="78" x2="138" y2="94" stroke="#00ff87" strokeOpacity="0.7" strokeWidth="0.8" />

          {/* Red de Wally Láser */}
          <line x1="52" y1="68" x2="222" y2="68" stroke="#00ff87" strokeOpacity="0.5" strokeWidth="0.8" strokeDasharray="3 2" />

          {/* Raqueta de Raquetball */}
          <g transform="translate(66, 84) rotate(-15)">
            <ellipse cx="10" cy="0" rx="9" ry="12" stroke="#00ff87" strokeWidth="1.2" fill="#00ff87" fillOpacity="0.1" />
            <line x1="10" y1="12" x2="10" y2="26" stroke="#00ff87" strokeWidth="1.8" strokeLinecap="round" />
          </g>

          {/* Pelota Láser Ultra-Rápida */}
          <path d="M 70 98 Q 130 35 155 38" fill="none" stroke="#00ff87" strokeWidth="1.2" strokeDasharray="3 2" />
          <circle cx="155" cy="38" r="4.5" fill="#00ff87" stroke="#ffffff" strokeWidth="1" className="drop-shadow-[0_0_8px_#00ff87]" />
        </svg>
      );

    case 'Ping Pong':
      return (
        <svg viewBox="0 0 280 140" className="w-full h-32 sm:h-36 transition-transform duration-500 group-hover:scale-105 select-none">
          {/* Sombra */}
          <polygon points="55,128 225,128 258,110 88,110" fill="#00ff87" fillOpacity="0.04" filter="blur(6px)" />

          {/* Patas Estructurales Láser */}
          <line x1="84" y1="54" x2="84" y2="110" stroke="#00ff87" strokeOpacity="0.5" strokeWidth="1.2" />
          <line x1="236" y1="54" x2="236" y2="110" stroke="#00ff87" strokeOpacity="0.5" strokeWidth="1.2" />
          <line x1="52" y1="100" x2="52" y2="124" stroke="#00ff87" strokeWidth="1.4" />
          <line x1="210" y1="100" x2="210" y2="124" stroke="#00ff87" strokeWidth="1.4" />
          <line x1="52" y1="116" x2="210" y2="116" stroke="#00ff87" strokeOpacity="0.6" strokeWidth="1" />

          {/* Borde Extruido y Superficie de Mesa 3D */}
          <polygon points="48,100 206,100 206,106 48,106" fill="#021a0f" stroke="#00ff87" strokeWidth="0.6" />
          <polygon points="206,100 246,48 246,54 206,106" fill="#011009" stroke="#00ff87" strokeWidth="0.6" />
          <polygon points="88,48 246,48 206,100 48,100" fill="#00ff87" fillOpacity="0.07" stroke="#00ff87" strokeWidth="1" />

          {/* Línea Central */}
          <line x1="147" y1="48" x2="127" y2="100" stroke="#00ff87" strokeOpacity="0.7" strokeWidth="0.8" />

          {/* Red Láser Micro-Mesh */}
          <line x1="62" y1="66" x2="62" y2="84" stroke="#00ff87" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="230" y1="66" x2="230" y2="84" stroke="#00ff87" strokeWidth="1.8" strokeLinecap="round" />
          <polygon points="62,70 230,70 230,78 62,78" fill="#00ff87" fillOpacity="0.12" stroke="#00ff87" strokeWidth="0.7" />
          <line x1="62" y1="70" x2="230" y2="70" stroke="#00ff87" strokeWidth="1" />

          {/* Paleta Holográfica 3D */}
          <g transform="translate(68, 88) rotate(-16)">
            <ellipse cx="10" cy="0" rx="9" ry="11" stroke="#00ff87" strokeWidth="1.2" fill="#00ff87" fillOpacity="0.12" />
            <line x1="10" y1="11" x2="10" y2="22" stroke="#00ff87" strokeWidth="1.8" strokeLinecap="round" />
          </g>

          {/* Pelota Láser */}
          <circle cx="150" cy="56" r="4" fill="#00ff87" stroke="#ffffff" strokeWidth="1" className="drop-shadow-[0_0_8px_#00ff87]" />
        </svg>
      );

    default:
      return <div className="h-32 flex items-center justify-center text-emerald-400">🏅</div>;
  }
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

  // WIZARD STEP STATE: 1: Deporte | 2: Cancha | 3: Fecha y Horario | 4: Confirmación
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  const [courts, setCourts] = useState<Court[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  // Selections
  const [selectedSport, setSelectedSport] = useState<string>('Tenis');
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [polifunctionalSport, setPolifunctionalSport] = useState<'Futsal' | 'Volleyball' | 'Basketball'>('Futsal');
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [durationHours, setDurationHours] = useState<number>(1);

  // Booking details
  const [playerType, setPlayerType] = useState<'FAMILY' | 'GUESTS' | 'MEMBERS'>('FAMILY');
  const [guestsCount, setGuestsCount] = useState<number>(1);
  const [hasGuestPasses, setHasGuestPasses] = useState<boolean>(false);
  const [playerNames, setPlayerNames] = useState('');
  
  // Lista detallada de Invitados (Nombre + CI + Pase de Invitado)
  const [guestsList, setGuestsList] = useState<Array<{ 
    name: string; 
    documentId: string;
    guestPassNumber?: string;
  }>>([
    { name: '', documentId: '', guestPassNumber: '' }
  ]);
  
  // Lista detallada de Socios Compañeros (Nombre + Carnet/Acción)
  const [partnersCount, setPartnersCount] = useState<number>(1);
  const [partnerMembersList, setPartnerMembersList] = useState<Array<{ name: string; documentId: string }>>([
    { name: '', documentId: '' }
  ]);

  // Texto o detalles de Familiares
  const [familyMembersText, setFamilyMembersText] = useState('');

  const handleGuestsCountChange = (n: number) => {
    setGuestsCount(n);
    setGuestsList(prev => {
      const copy = [...prev];
      while (copy.length < n) {
        copy.push({ name: '', documentId: '', guestPassNumber: '' });
      }
      return copy.slice(0, n);
    });
  };

  const handleGuestFieldChange = (index: number, field: 'name' | 'documentId' | 'guestPassNumber', val: any) => {
    setGuestsList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handlePartnersCountChange = (n: number) => {
    setPartnersCount(n);
    setPartnerMembersList(prev => {
      const copy = [...prev];
      while (copy.length < n) {
        copy.push({ name: '', documentId: '' });
      }
      return copy.slice(0, n);
    });
  };

  const handlePartnerFieldChange = (index: number, field: 'name' | 'documentId', val: string) => {
    setPartnerMembersList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Modals & Panels
  const [showMyReservationsSheet, setShowMyReservationsSheet] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);
  const [selectedForQrModal, setSelectedForQrModal] = useState<Reservation | null>(null);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = startOfToday();
  const next3Days = useMemo(() => [
    today,
    addDays(today, 1),
    addDays(today, 2)
  ], [today]);

  const savedCode = localStorage.getItem('chls_member_code') || user?.documentId || '';
  const savedPhone = localStorage.getItem('chls_member_phone') || user?.phone || '';
  const savedName = localStorage.getItem('chls_member_name') || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '');

  const [formData, setFormData] = useState({
    memberCode: savedCode || 'CHLS-SOCIO',
    memberName: savedName || 'Socio Titular',
    memberPhone: savedPhone || ''
  });

  const [myReservationsQuery, setMyReservationsQuery] = useState(savedCode || savedPhone || '');

  const currentMemberCode = formData.memberCode || savedCode || user?.documentId || 'CHLS-SOCIO';
  const currentMemberName = formData.memberName || savedName || 'Socio Titular';

  const [bookingPaymentMethod, setBookingPaymentMethod] = useState<'QR' | 'EFECTIVO' | 'TARJETA'>('QR');

  useEffect(() => {
    fetchCourts();
    fetchMyReservations();
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [selectedDate]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const memRes = await api.get('/members/me');
        if (memRes.data?.profile) {
          const profile = memRes.data.profile;
          const newCode = profile.membershipNumber || profile.documentId || formData.memberCode;
          const newName = profile.titularName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : formData.memberName);
          const newPhone = profile.phone || formData.memberPhone;

          if (newCode) localStorage.setItem('chls_member_code', newCode);
          if (newName) localStorage.setItem('chls_member_name', newName);
          if (newPhone) localStorage.setItem('chls_member_phone', newPhone);

          setFormData(prev => ({
            ...prev,
            memberCode: newCode,
            memberName: newName,
            memberPhone: newPhone
          }));
          fetchMyReservations(newCode);
        }
      } catch (e) { }
    };
    fetchUserData();
  }, []);

  const fetchCourts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reservations/courts');
      setCourts(res.data);
      if (res.data.length > 0) {
        const sportsList = Array.from(new Set(res.data.map((c: Court) => c.sport))) as string[];
        if (sportsList.length > 0) {
          setSelectedSport(sportsList[0]);
          const firstInSport = res.data.find((c: Court) => c.sport === sportsList[0]);
          setSelectedCourt(firstInSport || null);
        }
      }
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

  const fetchMyReservations = async (customQuery?: string) => {
    const code = customQuery || formData.memberCode || currentMemberCode || localStorage.getItem('chls_member_code') || '';
    const phone = formData.memberPhone || localStorage.getItem('chls_member_phone') || '';
    const searchTerm = customQuery || code || phone;
    if (!searchTerm) return;
    try {
      const res = await api.get(`/reservations/my-reservations?memberCode=${encodeURIComponent(code)}&phone=${encodeURIComponent(phone)}&search=${encodeURIComponent(searchTerm)}`);
      const upcomingList = res.data?.upcoming || [];
      setMyReservations(upcomingList);
      if (customQuery && upcomingList.length > 0) {
        toast.success(`Se encontraron ${upcomingList.length} reserva(s) activa(s)`);
      }
    } catch (err) { }
  };

  const sports = useMemo(() => {
    return Array.from(new Set(courts.map(c => c.sport)));
  }, [courts]);

  const filteredCourts = useMemo(() => {
    return courts.filter(c => c.sport === selectedSport);
  }, [courts, selectedSport]);

  const sportMeta = SPORT_META[selectedSport] || { guestRate: 50, contactPhones: [], contactDesc: '', notes: '' };

  // Cálculo de aranceles considerando pases de invitados
  let currentGuestFee = 0;
  if (playerType === 'GUESTS' && !hasGuestPasses) {
    const payingGuestsCount = guestsList.filter(g => !g.guestPassNumber?.trim()).length;
    if (sportMeta.isFixedCourtRate) {
      currentGuestFee = payingGuestsCount > 0 ? (sportMeta.fixedRate || 100) : 0;
    } else {
      currentGuestFee = payingGuestsCount * (sportMeta.guestRate || 50);
    }
  }
  const currentTotalPrice = currentGuestFee;

  // Verificación de horario de atención para cobro por Tarjeta en Recepción / Atención al Socio
  const isCardPaymentAllowed = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Domingo, 6 = Sábado
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const timeInMinutes = currentHour * 60 + currentMinute;

    if (isWeekend) {
      // Sábados y Domingos: 07:00 a 20:00 (420 a 1200 minutos)
      return timeInMinutes >= (7 * 60) && timeInMinutes <= (20 * 60);
    } else {
      // Lunes a Viernes: 06:00 a 22:00 (360 a 1320 minutos)
      return timeInMinutes >= (6 * 60) && timeInMinutes <= (22 * 60);
    }
  }, []);

  const currentTimeSlots = useMemo(() => {
    const isWeekend = isSaturday(selectedDate) || isSunday(selectedDate);
    return isWeekend ? WEEKEND_TIME_SLOTS : WEEKDAY_TIME_SLOTS;
  }, [selectedDate]);

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

  const formatEndTime = (startTime: string | null, hours: number) => {
    if (!startTime) return '--:--';
    const [startH] = startTime.split(':').map(Number);
    return `${(startH + hours).toString().padStart(2, '0')}:00`;
  };

  const isNextHourAvailable = useMemo(() => {
    if (!selectedTime) return false;
    const [startH] = selectedTime.split(':').map(Number);
    const nextH = startH + 1;
    const nextTimeString = `${nextH.toString().padStart(2, '0')}:00`;

    if (!currentTimeSlots.includes(nextTimeString)) {
      return false;
    }

    const slotInfo = getSlotInfo(nextTimeString);
    if (!slotInfo) return true;

    if (editingReservation && slotInfo.id === editingReservation.id) {
      return true;
    }

    return false;
  }, [selectedTime, currentTimeSlots, reservations, selectedCourt, editingReservation]);

  const handleSelectSport = (sport: string) => {
    setSelectedSport(sport);
    const inSport = courts.filter(c => c.sport === sport);
    if (inSport.length > 0) {
      setSelectedCourt(inSport[0]);
    }
    setCurrentStep(2);
  };

  const handleSelectCourt = (court: Court) => {
    setSelectedCourt(court);
    setCurrentStep(3);
  };

  const handleSlotClick = (time: string) => {
    const res = getSlotInfo(time);

    // Si estamos en modo edición:
    if (editingReservation) {
      const isAvailableForEdit = !res || res.id === editingReservation.id;
      if (isAvailableForEdit) {
        setSelectedTime(time);
        setCurrentStep(4);
        toast.success(`Horario seleccionado: ${time}`, { icon: '⏱️' });
        return;
      } else {
        toast.error('Este horario se encuentra ocupado.');
        return;
      }
    }

    // Modo creación normal:
    if (!res) {
      if (myReservations.length >= 2) {
        toast.error('Límite de 2 reservas activas alcanzado.');
        return;
      }
      setSelectedTime(time);
      setDurationHours(1);
      setPlayerType('FAMILY');
      setGuestsCount(1);
      setPlayerNames('');
      setHasGuestPasses(false);
      setCurrentStep(4);
    } else if (res.memberCode === currentMemberCode) {
      setSelectedForQrModal(res);
    } else {
      toast.error('Este horario no se encuentra disponible.');
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourt || !selectedTime) return;

    if (!formData.memberPhone || !formData.memberPhone.trim()) {
      toast.error('El número de WhatsApp de contacto es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const hour = parseInt(selectedTime.split(':')[0]);
      const endTime = `${(hour + durationHours).toString().padStart(2, '0')}:00`;

      // Componer nombres de jugadores según la modalidad
      let finalPlayerNames = '';
      if (playerType === 'GUESTS') {
        const validGuests = guestsList.filter(g => g.name.trim());
        if (validGuests.length > 0) {
          finalPlayerNames = 'Invitados: ' + validGuests.map(g => {
            let details = g.name.trim();
            if (g.documentId.trim()) details += ` (CI: ${g.documentId.trim()})`;
            if (g.guestPassNumber?.trim()) details += ` [Pase Tarjeta #${g.guestPassNumber.trim()}]`;
            return details;
          }).join(', ');
        }
      } else if (playerType === 'MEMBERS') {
        const validPartners = partnerMembersList.filter(p => p.name.trim());
        if (validPartners.length > 0) {
          finalPlayerNames = 'Socios: ' + validPartners.map(p => `${p.name.trim()}${p.documentId.trim() ? ` (#${p.documentId.trim()})` : ''}`).join(', ');
        }
      } else if (playerType === 'FAMILY') {
        if (familyMembersText.trim()) {
          finalPlayerNames = `Familia: ${familyMembersText.trim()}`;
        }
      }

      let res;
      if (editingReservation) {
        res = await api.put(`/reservations/${editingReservation.id}`, {
          courtId: selectedCourt.id,
          date: dateStr,
          startTime: selectedTime,
          endTime,
          playerType,
          guestsCount: playerType === 'GUESTS' ? guestsCount : 0,
          playerNames: finalPlayerNames.trim() || undefined,
          totalPrice: currentTotalPrice,
          paymentMethod: bookingPaymentMethod,
          memberPhone: formData.memberPhone.trim(),
          title: selectedSport === 'Polifuncional' ? `Polifuncional - ${polifunctionalSport}` : `Reserva de ${selectedSport}`
        });
        toast.success('¡Reserva actualizada con éxito!');
      } else {
        res = await api.post('/reservations', {
          courtId: selectedCourt.id,
          date: dateStr,
          startTime: selectedTime,
          endTime,
          memberCode: formData.memberCode,
          memberName: formData.memberName,
          memberPhone: formData.memberPhone.trim(),
          playerType,
          guestsCount: playerType === 'GUESTS' ? guestsCount : 0,
          playerNames: finalPlayerNames.trim() || undefined,
          courtFee: 0,
          guestFee: currentGuestFee,
          totalPrice: currentTotalPrice,
          paymentMethod: bookingPaymentMethod,
          title: formData.memberName || (selectedSport === 'Polifuncional' ? `Polifuncional - ${polifunctionalSport}` : `Reserva de ${selectedSport}`)
        });
        toast.success('¡Reserva registrada con éxito!');
      }

      if (formData.memberCode) localStorage.setItem('chls_member_code', formData.memberCode);
      if (formData.memberName) localStorage.setItem('chls_member_name', formData.memberName);
      if (formData.memberPhone) localStorage.setItem('chls_member_phone', formData.memberPhone.trim());

      setEditingReservation(null);
      setBookingSuccess(res.data?.reservation || res.data);
      fetchReservations();
      fetchMyReservations();
      setCurrentStep(1);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Error al procesar la reserva.';
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditReservation = (res: Reservation) => {
    setEditingReservation(res);
    setBookingSuccess(null);
    setSelectedForQrModal(null);
    setShowMyReservationsSheet(false);

    const sport = res.court?.sport || 'Tenis';
    setSelectedSport(sport);

    const matchingCourt = courts.find(c => c.id === res.courtId) || res.court;
    if (matchingCourt) {
      setSelectedCourt(matchingCourt);
    }

    if (res.date) {
      const parts = res.date.split('-');
      if (parts.length === 3) {
        setSelectedDate(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
      }
    }

    if (res.startTime) {
      setSelectedTime(res.startTime);
    }

    if (res.startTime && res.endTime) {
      const startH = parseInt(res.startTime.split(':')[0], 10);
      const endH = parseInt(res.endTime.split(':')[0], 10);
      const dur = endH > startH ? endH - startH : 1;
      setDurationHours(dur);
    }

    if (res.playerType) {
      setPlayerType(res.playerType as any);
    }

    if (res.memberPhone) {
      setFormData(prev => ({ ...prev, memberPhone: res.memberPhone || '' }));
    }

    if (res.paymentMethod) {
      setBookingPaymentMethod((res.paymentMethod as any) || 'QR');
    }

    // Parse playerNames
    if (res.playerType === 'GUESTS') {
      const gCount = res.guestsCount || 1;
      setGuestsCount(gCount);
      const rawNames = res.playerNames ? res.playerNames.replace(/^Invitados:\s*/i, '') : '';
      const guestEntries = rawNames.split(',').map(s => s.trim()).filter(Boolean);
      const parsedList: Array<{ name: string; documentId: string; guestPassNumber?: string }> = [];
      for (let i = 0; i < gCount; i++) {
        const raw = guestEntries[i] || '';
        const ciMatch = raw.match(/\(CI:\s*([^)]+)\)/i);
        const passMatch = raw.match(/\[Pase\s*Tarjeta\s*#?([^\]]+)\]/i);
        let cleanName = raw.replace(/\(CI:[^)]+\)/gi, '').replace(/\[Pase[^\]]+\]/gi, '').trim();
        parsedList.push({
          name: cleanName,
          documentId: ciMatch ? ciMatch[1].trim() : '',
          guestPassNumber: passMatch ? passMatch[1].trim() : ''
        });
      }
      setGuestsList(parsedList);
    } else if (res.playerType === 'MEMBERS') {
      const rawNames = res.playerNames ? res.playerNames.replace(/^Socios:\s*/i, '') : '';
      const partnerEntries = rawNames.split(',').map(s => s.trim()).filter(Boolean);
      const parsedList: Array<{ name: string; documentId: string }> = [];
      partnerEntries.forEach(raw => {
        const docMatch = raw.match(/\(#([^)]+)\)/);
        const cleanName = raw.replace(/\(#[^)]+\)/g, '').trim();
        parsedList.push({
          name: cleanName,
          documentId: docMatch ? docMatch[1].trim() : ''
        });
      });
      if (parsedList.length === 0) parsedList.push({ name: '', documentId: '' });
      setPartnersCount(parsedList.length);
      setPartnerMembersList(parsedList);
    } else if (res.playerType === 'FAMILY') {
      const rawNames = res.playerNames ? res.playerNames.replace(/^Familia:\s*/i, '') : '';
      setFamilyMembersText(rawNames);
    }

    setCurrentStep(4);
    toast('Modificando reserva en el formulario', { icon: '✏️' });
  };

  const handleCancelMyReservation = async (reservationId: string) => {
    if (!confirm('¿Deseas cancelar esta reserva? El turno quedará libre inmediatamente.')) return;
    try {
      await api.delete(`/reservations/${reservationId}`);
      toast.success('Reserva cancelada correctamente');
      fetchReservations();
      fetchMyReservations();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Error al cancelar la reserva';
      toast.error(errorMsg);
    }
  };

  const handleFileUpload = async (reservationId: string, fileOrBase64: string | File) => {
    try {
      setIsUploadingReceipt(true);
      let base64String: string;
      if (typeof fileOrBase64 === 'string') {
        base64String = fileOrBase64;
      } else {
        const compressed = await compressImage(fileOrBase64);
        base64String = compressed.dataUrl;
      }

      const res = await api.post(`/reservations/${reservationId}/receipt`, {
        receiptBase64: base64String
      });

      toast.success('¡Comprobante adjuntado y enviado con éxito!');
      fetchMyReservations();
      fetchReservations();

      const updated = res.data?.reservation || {
        ...(selectedForQrModal || bookingSuccess),
        paymentReceiptUrl: base64String,
        paymentStatus: 'PAID'
      };

      if (selectedForQrModal && selectedForQrModal.id === reservationId) {
        setSelectedForQrModal(updated);
      }
      if (bookingSuccess && bookingSuccess.id === reservationId) {
        setBookingSuccess(updated);
      }
    } catch (err: any) {
      console.error('Error uploading payment receipt:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Error al subir el comprobante';
      toast.error(errorMsg);
      throw err;
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Sesión cerrada');
    navigate('/login');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-3 sm:px-6 py-4 animate-fade-in text-gray-100 pb-16">

      {/* ========================================================================= */}
      {/* HEADER SUPERIOR MINIMALISTA */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#0d1c13] via-[#08120b] to-[#0d1c13] p-4 sm:p-5 rounded-3xl border border-brand-gold/30 shadow-2xl">
        <div className="flex items-center gap-3.5">
          <BackButton 
            to={user?.roles.some(r => ['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(r)) ? '/' : '/member'} 
            title="Volver al Menú Principal" 
          />
          <CrestLogo size="sm" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Reserva de <span className="text-brand-gold">Canchas</span>
              </h1>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                24/7 EN VIVO
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Socio: <strong className="text-white">{currentMemberName}</strong> • Acción #{currentMemberCode}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap sm:flex-nowrap">
          {/* Botón Mis Reservas */}
          <button
            onClick={() => setShowMyReservationsSheet(!showMyReservationsSheet)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all border shadow-sm ${
              showMyReservationsSheet 
                ? 'bg-brand-gold text-black border-brand-gold' 
                : 'bg-black/50 hover:bg-brand-gold/15 text-brand-gold border-brand-gold/40'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Mis Reservas</span>
            <span className="px-1.5 py-0.2 rounded-full bg-brand-gold text-black text-[10px] font-black">
              {myReservations.length} / 2
            </span>
          </button>

          {/* Botón Normativa */}
          <button
            onClick={() => setShowInfoModal(!showInfoModal)}
            className="p-2 rounded-2xl bg-black/50 hover:bg-white/10 text-gray-300 border border-white/10 text-xs font-bold"
            title="Normativa y Casetas"
          >
            <HelpCircle className="w-4 h-4 text-brand-gold" />
          </button>

          {/* Salir */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PANEL DE "MIS RESERVAS ACTIVAS" (DESPLEGABLE) */}
      {/* ========================================================================= */}
      {showMyReservationsSheet && (
        <div className="bg-[#0b1610] border-2 border-brand-gold/50 rounded-3xl p-5 space-y-4 shadow-2xl animate-fade-in">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-gold">
                Gestión de Turnos del Socio
              </span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-[#00ff87]" /> Tus Turnos Programados ({myReservations.length} de 2)
              </h3>
            </div>
            <button 
              onClick={() => setShowMyReservationsSheet(false)}
              className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-gray-300 hover:text-white border border-white/10 transition-colors"
            >
              ✕ Cerrar
            </button>
          </div>

          {/* Buscador / Recuperador Rápido de Reservas por Carnet, Código o Celular */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              fetchMyReservations(myReservationsQuery);
            }} 
            className="flex gap-2 bg-black/40 p-2 rounded-2xl border border-white/10"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input 
                type="text"
                inputMode="text"
                autoComplete="off"
                value={myReservationsQuery}
                onChange={e => setMyReservationsQuery(e.target.value)}
                placeholder="Buscar por carnet, código de socio, celular o código de reserva..."
                className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-brand-gold to-amber-500 hover:from-amber-400 hover:to-brand-gold text-black rounded-xl font-black text-xs transition-all shadow-md shrink-0 flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Buscar</span>
            </button>
          </form>

          {myReservations.length === 0 ? (
            <div className="text-center py-6 px-4 bg-black/30 rounded-2xl border border-white/5 space-y-2">
              <CalendarIcon className="w-8 h-8 text-gray-500 mx-auto" />
              <p className="text-xs text-gray-300 font-medium">
                No se encontraron reservas con el identificador actual.
              </p>
              <p className="text-[11px] text-gray-500">
                Si realizaste una reserva previa o cerraste el navegador, ingresa tu número de Carnet, Código de Socio o Celular en el buscador superior y haz clic en <strong>Buscar</strong>.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {myReservations.map(res => {
                const isPaidOrExempt = res.paymentStatus === 'PAID' || res.paymentStatus === 'EXEMPT' || res.totalPrice === 0;
                return (
                  <div key={res.id} className="p-4 rounded-2xl bg-black/60 border border-brand-gold/40 flex flex-col justify-between gap-3 shadow-lg hover:border-brand-gold transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-white text-sm block">{res.court?.name}</span>
                        <p className="text-xs text-[#00ff87] font-mono font-bold mt-0.5">
                          {format(parseISO(res.date), 'dd/MM/yyyy')} • {res.startTime} - {res.endTime}
                        </p>
                        <span className={`inline-block mt-1.5 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          isPaidOrExempt 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                        }`}>
                          {isPaidOrExempt ? '🟢 Reservado & Confirmado' : '🟡 Pre-reserva (Pago Pendiente)'}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-brand-gold border border-brand-gold/30 font-mono">
                        #{res.code || res.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-white/10">
                      <button
                        onClick={() => setSelectedForQrModal(res)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                          isPaidOrExempt
                            ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                            : 'bg-gradient-to-r from-brand-gold to-amber-500 hover:from-amber-400 hover:to-brand-gold text-black font-black'
                        }`}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        {isPaidOrExempt ? 'Ver Pase / QR' : 'Pagar con QR'}
                      </button>
                      <button
                        onClick={() => handleStartEditReservation(res)}
                        className="px-3 py-2 rounded-xl bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold text-xs font-bold border border-brand-gold/40 flex items-center gap-1 transition-colors"
                        title="Modificar turno, cancha o acompañantes"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleCancelMyReservation(res.id)}
                        className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/30 transition-colors"
                      >
                        Liberar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* AVISO DESTACADO DE RESERVAS ACTIVAS (Visible en todo momento si hay turnos) */}
      {myReservations.length > 0 && !showMyReservationsSheet && (
        <div className="bg-gradient-to-r from-[#0a2215] via-[#06170e] to-[#0a2215] border-2 border-emerald-500/40 rounded-3xl p-4 sm:p-5 shadow-[0_0_25px_rgba(0,255,135,0.15)] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00ff87] shadow-[0_0_8px_#00ff87] animate-pulse"></span>
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                Tienes {myReservations.length} Turno{myReservations.length > 1 ? 's' : ''} Activo{myReservations.length > 1 ? 's' : ''} Programado{myReservations.length > 1 ? 's' : ''}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowMyReservationsSheet(true)}
              className="text-xs font-bold text-brand-gold hover:text-white flex items-center gap-1 underline transition-colors self-start sm:self-auto"
            >
              Administrar mis turnos ({myReservations.length}/2) →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myReservations.map(res => {
              const isPaidOrExempt = res.paymentStatus === 'PAID' || res.paymentStatus === 'EXEMPT' || res.totalPrice === 0;
              return (
                <div key={res.id} className="p-3.5 rounded-2xl bg-black/50 border border-emerald-500/30 flex flex-col justify-between gap-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-white text-sm block">{res.court?.name} ({res.court?.sport})</span>
                      <p className="text-xs text-[#00ff87] font-mono font-bold">
                        {format(parseISO(res.date), 'dd/MM/yyyy')} • {res.startTime} - {res.endTime}
                      </p>
                      <span className={`inline-block mt-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        isPaidOrExempt 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                      }`}>
                        {isPaidOrExempt ? '🟢 Confirmada' : '🟡 Pago Pendiente'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-brand-gold border border-brand-gold/30 font-mono">
                      #{res.code || res.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-1.5 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setSelectedForQrModal(res)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                        isPaidOrExempt
                          ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                          : 'bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold border border-brand-gold/40'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      {isPaidOrExempt ? 'Ver Pase / QR' : 'Pagar / Adjuntar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartEditReservation(res)}
                      className="px-3 py-1.5 rounded-xl bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold text-xs font-bold border border-brand-gold/40 flex items-center gap-1 transition-colors"
                      title="Editar turno"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Banner de Edición Activa */}
      {editingReservation && (
        <div className="p-4 rounded-3xl bg-brand-gold/15 border-2 border-brand-gold/50 flex flex-wrap items-center justify-between gap-3 text-xs shadow-[0_0_25px_rgba(204,161,75,0.2)] animate-fade-in mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-brand-gold/20 flex items-center justify-center border border-brand-gold/40 text-brand-gold shrink-0">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-brand-gold font-bold uppercase tracking-wider block">
                Modo Edición de Turno
              </span>
              <span className="text-white font-bold text-xs">
                Modificando #{editingReservation.code || editingReservation.id?.slice(0, 8).toUpperCase()} ({editingReservation.court?.name || 'Cancha'} • {editingReservation.date} • {editingReservation.startTime})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingReservation(null);
                setCurrentStep(1);
                toast('Edición cancelada', { icon: 'ℹ️' });
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs transition-colors"
            >
              Cancelar Edición
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASO 1: SELECCIONA TU DISCIPLINA DEPORTIVA */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-5 animate-fade-in">
          <div className="text-center py-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Elige tu <span className="text-brand-gold">Disciplina Deportiva</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sports.map(sport => {
              const meta = SPORT_META[sport] || { label: sport, desc: 'Canchas del Club', guestRate: 50 };
              const courtsInSport = courts.filter(c => c.sport === sport);

              return (
                <button
                  key={sport}
                  onClick={() => handleSelectSport(sport)}
                  className="p-5 sm:p-6 rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-b from-[#0b1f14] via-[#07160e] to-[#040e08] hover:border-[#00ff87] hover:from-[#0e2c1c] hover:to-[#071a10] hover:shadow-[0_0_35px_rgba(0,255,135,0.4)] text-left flex flex-col justify-between gap-4 transition-all duration-300 hover:scale-[1.02] group relative overflow-hidden"
                >
                  {/* Neon Glow Ambient Effect */}
                  <div className="absolute -top-10 -right-10 w-36 h-36 bg-[#00ff87]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#00ff87]/25 transition-all duration-500" />

                  {/* Header: Title + Court Badge */}
                  <div className="flex justify-between items-center w-full relative z-10">
                    <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-[#00ff87] transition-colors tracking-tight">
                      {meta.label}
                    </h3>
                    <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 group-hover:border-[#00ff87] group-hover:text-white transition-all shadow-sm">
                      {courtsInSport.length} {meta.unitPlural || 'canchas'}
                    </span>
                  </div>

                  {/* Vector Court Neon Wireframe Centerpiece */}
                  <div className="w-full py-2 flex items-center justify-center relative z-10 group-hover:drop-shadow-[0_0_12px_rgba(0,255,135,0.5)] transition-all">
                    <SportNeonIllustration sport={sport} />
                  </div>

                  {/* Footer: Details + Action Button */}
                  <div className="flex items-center justify-between pt-3 border-t border-emerald-500/20 text-xs relative z-10 w-full">
                    <span className="text-brand-gold font-bold font-mono bg-brand-gold/10 px-2.5 py-1 rounded-xl border border-brand-gold/30">
                      {meta.isFixedCourtRate ? `Bs. ${meta.fixedRate}/cancha` : `Bs. ${meta.guestRate}/inv.`}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 group-hover:text-[#00ff87] group-hover:translate-x-1 transition-all">
                      <span>Elegir</span>
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASO 2: SELECCIONA LA CANCHA O ESPACIO */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 tracking-tight">
                Selecciona la <span className="text-brand-gold">Cancha de {selectedSport}</span>
              </h2>
            </div>
            <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-1 px-3.5 py-2 rounded-2xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all hover:border-[#00ff87] hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" /> Volver
            </button>
          </div>

          {/* Sub-selector si es Polifuncional */}
          {selectedSport === 'Polifuncional' && (
            <div className="p-5 rounded-3xl bg-gradient-to-b from-[#0b1f14] to-[#040e08] border-2 border-emerald-500/40 space-y-3 shadow-lg">
              <label className="text-xs font-black text-[#00ff87] uppercase tracking-wider block flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00ff87] shadow-[0_0_8px_#00ff87]"></span>
                Especifica la Disciplina a Jugar:
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'Futsal', label: 'Futsal', icon: '⚽' },
                  { id: 'Volleyball', label: 'Volleyball', icon: '🏐' },
                  { id: 'Basketball', label: 'Basketball', icon: '🏀' },
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setPolifunctionalSport(sub.id as any)}
                    className={`py-3.5 rounded-2xl border-2 text-center font-bold text-xs flex flex-col items-center gap-1.5 transition-all duration-300 ${
                      polifunctionalSport === sub.id
                        ? 'bg-gradient-to-b from-[#0d331f] to-[#04120b] border-[#00ff87] text-white shadow-[0_0_20px_rgba(0,255,135,0.4)] scale-[1.02]'
                        : 'bg-black/50 border-emerald-500/20 text-gray-400 hover:text-white hover:border-emerald-500/50'
                    }`}
                  >
                    <span className="text-2xl">{sub.icon}</span>
                    <span className="font-black text-xs">{sub.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 max-w-5xl mx-auto">
            {filteredCourts.map(court => (
              <button
                key={court.id}
                onClick={() => handleSelectCourt(court)}
                className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-md p-5 sm:p-6 rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-b from-[#0b1f14] via-[#07160e] to-[#040e08] hover:border-[#00ff87] hover:from-[#0e2c1c] hover:to-[#071a10] hover:shadow-[0_0_35px_rgba(0,255,135,0.4)] text-left flex flex-col justify-between gap-4 transition-all duration-300 hover:scale-[1.02] group relative overflow-hidden"
              >
                {/* Neon Glow Ambient Effect */}
                <div className="absolute -top-10 -right-10 w-36 h-36 bg-[#00ff87]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#00ff87]/25 transition-all duration-500" />

                <div className="flex justify-between items-start w-full relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-center text-[#00ff87] group-hover:border-[#00ff87] group-hover:shadow-[0_0_12px_rgba(0,255,135,0.4)] group-hover:scale-105 transition-all duration-300">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-[#00ff87] transition-colors tracking-tight">
                        {court.name}
                      </h3>
                      <span className="text-[11px] text-emerald-400 font-bold">
                        {selectedSport}
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/40 text-[#00ff87] border border-emerald-500/40 group-hover:border-[#00ff87] transition-all shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00ff87] shadow-[0_0_6px_#00ff87]"></span>
                    En Vivo
                  </span>
                </div>

                {court.description && (
                  <p className="text-xs text-gray-300 leading-relaxed font-medium line-clamp-2 relative z-10">
                    {court.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-emerald-500/20 text-xs relative z-10 w-full">
                  <span className="text-brand-gold font-bold font-mono bg-brand-gold/10 px-2.5 py-1 rounded-xl border border-brand-gold/30">
                    {sportMeta.isFixedCourtRate ? `Bs. ${sportMeta.fixedRate}/cancha` : `Bs. ${sportMeta.guestRate}/inv.`}
                  </span>
                  <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-transparent border border-emerald-500/30 text-xs font-bold text-[#00ff87] group-hover:border-[#00ff87] group-hover:shadow-[0_0_10px_rgba(0,255,135,0.35)] group-hover:text-white group-hover:translate-x-1 transition-all">
                    <span>Elegir Horario</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASO 3: SELECCIONA DÍA Y HORARIO */}
      {/* ========================================================================= */}
      {currentStep === 3 && selectedCourt && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 tracking-tight">
                Turnos Disponibles — <span className="text-brand-gold">{selectedCourt.name}</span>
              </h2>
            </div>
            <button
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all hover:border-[#00ff87]"
            >
              <ChevronLeft className="w-4 h-4" /> Cambiar Cancha
            </button>
          </div>

          {/* Selector de 3 Días Holográfico Neón */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-2xl mx-auto">
            {next3Days.map((d, index) => {
              const isSelected = isSameDay(d, selectedDate);
              const dayLabel = index === 0 ? 'Hoy' : index === 1 ? 'Mañana' : format(d, 'EEEE', { locale: es });

              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelectedDate(d)}
                  className={`p-3.5 sm:p-4 rounded-3xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 group relative overflow-hidden ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#0d331f] via-[#082014] to-[#04120b] border-[#00ff87] shadow-[0_0_25px_rgba(0,255,135,0.45),inset_0_0_15px_rgba(0,255,135,0.15)] scale-[1.03]'
                      : 'bg-gradient-to-b from-[#081910] via-[#05110a] to-[#020805] border-emerald-500/30 text-gray-400 hover:text-white hover:border-[#00ff87] hover:shadow-[0_0_20px_rgba(0,255,135,0.25)] hover:scale-[1.02]'
                  }`}
                >
                  {/* Subtle Ambient Backlight Glow for Active */}
                  {isSelected && (
                    <div className="absolute -top-6 -right-6 w-20 h-20 bg-[#00ff87]/20 rounded-full blur-xl pointer-events-none" />
                  )}

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${
                    isSelected
                      ? 'bg-[#00ff87]/20 text-[#00ff87] border-[#00ff87]/50 shadow-[0_0_8px_#00ff87]'
                      : 'bg-black/40 text-gray-400 border-white/5 group-hover:text-emerald-300 group-hover:border-emerald-500/30'
                  }`}>
                    {index === 0 && '⭐ '}
                    {dayLabel}
                  </span>

                  <span className={`text-2xl sm:text-3xl font-black font-mono my-0.5 tracking-tight transition-all ${
                    isSelected
                      ? 'text-white drop-shadow-[0_0_10px_rgba(0,255,135,0.8)]'
                      : 'text-gray-300 group-hover:text-white'
                  }`}>
                    {format(d, 'd')}
                  </span>

                  <span className={`text-[10px] font-bold uppercase tracking-widest transition-all ${
                    isSelected
                      ? 'text-emerald-300'
                      : 'text-gray-500 group-hover:text-emerald-400'
                  }`}>
                    {format(d, 'MMMM', { locale: es })}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Grilla Gráfica de Horarios Neón */}
          <div className="bg-gradient-to-b from-[#0a1f13] via-[#06150d] to-[#030c07] border-2 border-emerald-500/40 rounded-3xl p-4 sm:p-6 space-y-4 shadow-[0_0_30px_rgba(0,255,135,0.15)]">
            <div className="flex items-center justify-between text-xs border-b border-emerald-500/20 pb-3">
              <span className="font-bold text-gray-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00ff87] shadow-[0_0_8px_#00ff87]"></span>
                Horarios del {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}:
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[#00ff87] font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00ff87] shadow-[0_0_8px_#00ff87]"></span> Disponible
                </span>
                <span className="flex items-center gap-1.5 text-gray-500 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-600"></span> Ocupado
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
              {currentTimeSlots.map(time => {
                const res = getSlotInfo(time);
                const isEditingThisSlot = editingReservation && res && res.id === editingReservation.id;
                const isSelectedTime = selectedTime === time;
                const isMineOther = res && res.memberCode === currentMemberCode && (!editingReservation || res.id !== editingReservation.id);
                const isClass = res && (res.reservationType === 'CLASS' || res.reservationType === 'ESCUELA_DEPORTIVA');
                const isMaintenance = res && res.reservationType === 'MAINTENANCE';
                const isOccupiedByOther = !!res && !isMineOther && !isEditingThisSlot && !isClass && !isMaintenance;

                // Si es el slot de la reserva que estamos editando actualmente
                if (isEditingThisSlot) {
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => handleSlotClick(time)}
                      className={`p-3 rounded-2xl border-2 transition-all flex flex-col justify-between text-left ${
                        isSelectedTime
                          ? 'border-brand-gold bg-brand-gold/25 text-white shadow-[0_0_20px_rgba(204,161,75,0.5)] scale-[1.03]'
                          : 'border-brand-gold/60 bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-mono font-black text-sm text-brand-gold">{time}</span>
                        <span className="w-2 h-2 rounded-full bg-brand-gold shadow-[0_0_8px_#cca14b]"></span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-200 mt-1">
                        ✏️ {isSelectedTime ? '✓ Turno Actual (Elegido)' : 'Tu Turno Actual (Clic)'}
                      </span>
                    </button>
                  );
                }

                // Si es otra reserva del socio (distinta a la que está editando)
                if (isMineOther) {
                  return (
                    <div key={time} className="p-3 rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/20 text-white flex flex-col justify-between shadow-sm">
                      <div className="flex justify-between items-center w-full">
                        <span className="font-mono font-black text-sm text-[#00ff87]">{time}</span>
                        <span className="w-2 h-2 rounded-full bg-[#00ff87] shadow-[0_0_8px_#00ff87]"></span>
                      </div>
                      <span className="text-[10px] text-emerald-200 font-bold mt-1">Otra Reserva Tuya</span>
                    </div>
                  );
                }

                if (isClass || isMaintenance || isOccupiedByOther) {
                  const closureReason = res?.title || (
                    isClass ? 'En Clase / Academia' : 
                    isMaintenance ? 'Cerrada por Mantenimiento' : 
                    res?.reservationType === 'TOURNAMENT' ? 'Torneo Oficial' :
                    res?.reservationType === 'EVENTO_CLUB' ? 'Evento del Club' :
                    res?.reservationType === 'CIERRE_CANCHA' ? 'Cierre de Canchas' :
                    'Ocupado'
                  );

                  return (
                    <div 
                      key={time} 
                      className="p-3 rounded-2xl border border-white/10 bg-black/50 text-gray-400 flex flex-col justify-between cursor-not-allowed opacity-80"
                      title={`${closureReason} (${res?.startTime} - ${res?.endTime})`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-mono font-bold text-sm text-gray-300">{time}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500/70 shadow-[0_0_6px_#f43f5e]"></span>
                      </div>
                      <span className="text-[10px] text-amber-300 font-bold truncate mt-1 block" title={closureReason}>
                        🚫 {closureReason}
                      </span>
                    </div>
                  );
                }

                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleSlotClick(time)}
                    className={`p-3 rounded-2xl border-2 text-white flex flex-col justify-between transition-all hover:scale-[1.03] text-left group ${
                      isSelectedTime
                        ? 'border-[#00ff87] bg-gradient-to-b from-[#0e3a23] to-[#051a0e] shadow-[0_0_20px_rgba(0,255,135,0.5)] scale-[1.02]'
                        : 'border-emerald-500/40 bg-gradient-to-b from-[#092215] to-[#04100a] hover:border-[#00ff87] hover:bg-[#0c2f1d] hover:shadow-[0_0_20px_rgba(0,255,135,0.4)]'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-mono font-black text-sm text-[#00ff87] group-hover:text-white group-hover:drop-shadow-[0_0_8px_#00ff87] transition-all">
                        {time}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${isSelectedTime ? 'bg-[#00ff87] shadow-[0_0_8px_#00ff87]' : 'bg-emerald-500/60 group-hover:bg-[#00ff87]'}`}></span>
                    </div>
                    <span className="text-[10px] text-emerald-400 group-hover:text-white font-bold mt-1 flex items-center justify-between w-full">
                      <span>{isSelectedTime ? '✓ Seleccionado' : 'Disponible'}</span>
                      <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASO 4: CONFIRMACIÓN Y PASE DE RESERVA (ESTILO TICKET DE LUJO) */}
      {/* ========================================================================= */}
      {currentStep === 4 && selectedCourt && selectedTime && (
        <div className="max-w-xl mx-auto space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Confirmar <span className="text-brand-gold">Turno</span>
            </h2>
            <button
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Cambiar Horario
            </button>
          </div>

          <form onSubmit={handleBooking} className="bg-[#0b1811] border-2 border-brand-gold/50 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden">
            
            {/* Cabecera del Pase */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <CrestLogo size="sm" />
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold block">
                    Club Hípico Los Sargentos
                  </span>
                  <strong className="text-base sm:text-lg text-white font-bold block">
                    {selectedCourt.name} ({selectedSport})
                  </strong>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-emerald-400 font-mono font-bold block">
                  {selectedTime} - {formatEndTime(selectedTime, durationHours)} ({durationHours} {durationHours === 1 ? 'hora' : 'horas'})
                </span>
                <span className="text-[10px] text-gray-400 block">
                  {format(selectedDate, "dd/MM/yyyy")}
                </span>
              </div>
            </div>

            {/* Selector de Horario de Inicio & Duración */}
            <div className="p-4 bg-gradient-to-b from-[#081f13] to-[#04100a] rounded-2xl border-2 border-emerald-500/40 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-[#00ff87] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  Horario de Inicio & Duración:
                </label>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="text-[10px] font-bold text-brand-gold hover:text-white flex items-center gap-1 underline transition-colors"
                >
                  Ver matriz completa
                </button>
              </div>

              {/* Selector Rápido de Horas de Inicio Disponibles */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                  Selecciona la Hora de Inicio:
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1.5 bg-black/40 rounded-xl border border-white/5">
                  {currentTimeSlots.map(t => {
                    const res = getSlotInfo(t);
                    const isAvailable = !res || (editingReservation && res.id === editingReservation.id);
                    const isSelected = selectedTime === t;

                    if (!isAvailable) {
                      return (
                        <div
                          key={t}
                          className="py-1.5 px-2 rounded-lg bg-black/60 border border-white/5 text-gray-600 font-mono text-xs text-center cursor-not-allowed opacity-40"
                          title="Horario ocupado"
                        >
                          {t}
                        </div>
                      );
                    }

                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTime(t)}
                        className={`py-1.5 px-2 rounded-lg border font-mono font-bold text-xs transition-all text-center ${
                          isSelected
                            ? 'bg-gradient-to-r from-emerald-500 to-[#00ff87] text-black font-black border-[#00ff87] shadow-[0_0_12px_rgba(0,255,135,0.5)] scale-105'
                            : 'bg-emerald-950/40 border-emerald-500/30 text-gray-300 hover:text-white hover:border-[#00ff87] hover:bg-emerald-900/40'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de Duración: 1 Hora o 2 Horas */}
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                    Duración del Turno:
                  </span>
                  <span className="text-[10px] font-bold text-brand-gold bg-brand-gold/15 px-2 py-0.5 rounded-full border border-brand-gold/30 font-mono">
                    Máximo 2 horas
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDurationHours(1)}
                    className={`p-3 rounded-2xl border-2 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all ${
                      durationHours === 1
                        ? 'bg-gradient-to-b from-[#0d331f] via-[#082014] to-[#04120b] border-[#00ff87] text-white shadow-[0_0_15px_rgba(0,255,135,0.45)] scale-[1.02]'
                        : 'bg-black/50 border-emerald-500/20 text-gray-400 hover:text-white hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-black font-mono text-[#00ff87]">1 Hora</span>
                      <span className="text-[10px] text-gray-300 font-medium">(60 min)</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {selectedTime} a {formatEndTime(selectedTime, 1)}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={!isNextHourAvailable}
                    onClick={() => {
                      if (isNextHourAvailable) setDurationHours(2);
                    }}
                    className={`p-3 rounded-2xl border-2 font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all ${
                      durationHours === 2
                        ? 'bg-gradient-to-b from-[#0d331f] via-[#082014] to-[#04120b] border-[#00ff87] text-white shadow-[0_0_15px_rgba(0,255,135,0.45)] scale-[1.02]'
                        : !isNextHourAvailable
                        ? 'bg-black/20 border-white/5 text-gray-600 cursor-not-allowed opacity-50'
                        : 'bg-black/50 border-emerald-500/20 text-gray-400 hover:text-white hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-black font-mono ${isNextHourAvailable ? 'text-[#00ff87]' : 'text-gray-500'}`}>2 Horas</span>
                      <span className="text-[10px] text-gray-300 font-medium">(120 min)</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {isNextHourAvailable 
                        ? `${selectedTime} a ${formatEndTime(selectedTime, 2)}` 
                        : '🚫 Turno sgte. ocupado'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modalidad de Juego (3 botones Neón) */}
            <div className="space-y-2.5">
              <label className="text-xs font-black text-[#00ff87] uppercase tracking-wider block flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                ¿Con quiénes jugarás?
              </label>
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                {[
                  { id: 'FAMILY', label: 'Familia', icon: '👨‍👩‍👧‍👦', cost: 'Sin Costo' },
                  { id: 'MEMBERS', label: 'Socios', icon: '🎾', cost: 'Sin Costo' },
                  { id: 'GUESTS', label: 'Invitados', icon: '👥', cost: sportMeta.isFixedCourtRate ? `Bs. ${sportMeta.fixedRate}` : `+Bs. ${sportMeta.guestRate}/inv.` }
                ].map(mod => (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setPlayerType(mod.id as any)}
                    className={`p-3 sm:p-3.5 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 group relative overflow-hidden ${
                      playerType === mod.id
                        ? 'bg-gradient-to-b from-[#0d331f] via-[#082014] to-[#04120b] border-[#00ff87] text-white shadow-[0_0_20px_rgba(0,255,135,0.4)] scale-[1.02]'
                        : 'bg-black/50 border-emerald-500/20 text-gray-400 hover:text-white hover:border-emerald-500/50'
                    }`}
                  >
                    <span className="text-xl">{mod.icon}</span>
                    <span className="text-xs font-black text-white">{mod.label}</span>
                    <span className={`text-[10px] font-bold ${playerType === mod.id ? 'text-[#00ff87]' : 'text-gray-500'}`}>
                      {mod.cost}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* SECCIÓN DINÁMICA: INVITADOS (Nombre + CI) */}
            {playerType === 'GUESTS' && (
              <div className="p-4 sm:p-5 bg-gradient-to-b from-[#0b1f14] via-[#07160e] to-[#040e08] border-2 border-emerald-500/40 rounded-3xl space-y-4 shadow-xl animate-fade-in">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                  <span className="text-xs text-[#00ff87] font-black uppercase tracking-wider flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4" />
                    Cantidad de Invitados:
                  </span>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleGuestsCountChange(n)}
                        className={`w-8 h-8 rounded-xl text-xs font-black transition-all flex items-center justify-center border-2 ${
                          guestsCount === n
                            ? 'bg-[#00ff87]/20 border-[#00ff87] text-[#00ff87] shadow-[0_0_10px_#00ff87] scale-105'
                            : 'bg-black/60 border-emerald-500/20 text-gray-400 hover:text-white hover:border-emerald-500/50'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-[11px] text-gray-300 font-medium block">
                    Registra los datos para autorizar el ingreso en Control de Entrada:
                  </span>

                  {Array.from({ length: guestsCount }).map((_, idx) => {
                    const guestItem = guestsList[idx] || { name: '', documentId: '', guestPassNumber: '' };

                    return (
                      <div key={idx} className="p-3.5 bg-black/60 border border-emerald-500/30 rounded-2xl space-y-2.5 hover:border-emerald-400 transition-colors">
                        <div className="flex items-center justify-between text-xs font-black text-[#00ff87]">
                          <span className="flex items-center gap-1.5">
                            <UserPlus className="w-3.5 h-3.5" />
                            Invitado #{idx + 1}
                          </span>
                          <span className="text-[10px] text-emerald-400/80 font-mono bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            Pase Invitado
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="text"
                              autoComplete="name"
                              required
                              value={guestItem.name || ''}
                              onChange={e => handleGuestFieldChange(idx, 'name', e.target.value)}
                              placeholder="Nombre y Apellidos *"
                              className="w-full bg-black/80 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff87] focus:shadow-[0_0_8px_rgba(0,255,135,0.3)] transition-all"
                            />
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="text"
                              autoComplete="off"
                              required
                              value={guestItem.documentId || ''}
                              onChange={e => handleGuestFieldChange(idx, 'documentId', e.target.value)}
                              placeholder="C.I. / DNI / Pasaporte *"
                              className="w-full bg-black/80 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff87] focus:shadow-[0_0_8px_rgba(0,255,135,0.3)] transition-all"
                            />
                          </div>
                        </div>

                        {/* Opción de Pase de Invitado */}
                        <div className="pt-1 border-t border-white/5">
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={guestItem.guestPassNumber || ''}
                            onChange={e => handleGuestFieldChange(idx, 'guestPassNumber', e.target.value)}
                            placeholder="N° Tarjeta / Pase de Invitado (Opcional si cuenta con pase físico)"
                            className="w-full bg-black/80 border border-brand-gold/30 rounded-xl px-3 py-2 text-xs text-brand-gold placeholder-gray-500 focus:outline-none focus:border-brand-gold transition-all"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECCIÓN DINÁMICA: SOCIOS COMPAÑEROS */}
            {playerType === 'MEMBERS' && (
              <div className="p-4 sm:p-5 bg-gradient-to-b from-[#0b1f14] via-[#07160e] to-[#040e08] border-2 border-emerald-500/40 rounded-3xl space-y-4 shadow-xl animate-fade-in">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                  <span className="text-xs text-[#00ff87] font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    Socios Compañeros:
                  </span>
                  <div className="flex gap-2">
                    {[1, 2, 3].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handlePartnersCountChange(n)}
                        className={`w-8 h-8 rounded-xl text-xs font-black transition-all flex items-center justify-center border-2 ${
                          partnersCount === n
                            ? 'bg-[#00ff87]/20 border-[#00ff87] text-[#00ff87] shadow-[0_0_10px_#00ff87] scale-105'
                            : 'bg-black/60 border-emerald-500/20 text-gray-400 hover:text-white hover:border-emerald-500/50'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-[11px] text-gray-300 font-medium block">
                    Indica los datos de los socios que jugarán contigo en esta cancha:
                  </span>

                  {Array.from({ length: partnersCount }).map((_, idx) => (
                    <div key={idx} className="p-3.5 bg-black/60 border border-emerald-500/30 rounded-2xl space-y-2 hover:border-emerald-400 transition-colors">
                      <div className="flex items-center justify-between text-xs font-black text-[#00ff87]">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          Socio Compañero #{idx + 1}
                        </span>
                        <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          Sin Costo
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="text"
                            autoComplete="name"
                            value={partnerMembersList[idx]?.name || ''}
                            onChange={e => handlePartnerFieldChange(idx, 'name', e.target.value)}
                            placeholder="Nombre del Socio (ej. Carlos Paz)"
                            className="w-full bg-black/80 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff87] focus:shadow-[0_0_8px_rgba(0,255,135,0.3)] transition-all"
                          />
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="text"
                            autoComplete="off"
                            value={partnerMembersList[idx]?.documentId || ''}
                            onChange={e => handlePartnerFieldChange(idx, 'documentId', e.target.value)}
                            placeholder="Nro. Acción / Carnet (ej. #CHLS-104)"
                            className="w-full bg-black/80 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff87] focus:shadow-[0_0_8px_rgba(0,255,135,0.3)] transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECCIÓN DINÁMICA: FAMILIA */}
            {playerType === 'FAMILY' && (
              <div className="p-4 sm:p-5 bg-gradient-to-b from-[#0b1f14] via-[#07160e] to-[#040e08] border-2 border-emerald-500/40 rounded-3xl space-y-2.5 shadow-xl animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#00ff87] font-black uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Uso Familiar Directo
                  </span>
                  <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Sin Costo
                  </span>
                </div>
                <p className="text-[11px] text-gray-300">
                  Nombres de familiares dependientes que te acompañarán (opcional):
                </p>
                <input
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  value={familyMembersText}
                  onChange={e => setFamilyMembersText(e.target.value)}
                  placeholder="Ej. Esposa e Hijos: Andrea y Mateo Linares"
                  className="w-full bg-black/80 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff87] focus:shadow-[0_0_8px_rgba(0,255,135,0.3)] transition-all"
                />
              </div>
            )}

            {/* Teléfono WhatsApp */}
            <div className="p-4 bg-gradient-to-b from-[#0b1f14] to-[#040e08] border-2 border-emerald-500/40 rounded-3xl space-y-2 shadow-lg">
              <label className="text-xs font-black text-[#00ff87] uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                Celular / WhatsApp de Notificación:
              </label>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                value={formData.memberPhone}
                onChange={e => setFormData({ ...formData, memberPhone: e.target.value })}
                placeholder="Ej. 70123456"
                className="w-full bg-black/80 border border-emerald-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff87] focus:shadow-[0_0_8px_rgba(0,255,135,0.3)] transition-all"
              />
            </div>

            {/* Resumen y Pase Digital / Opciones de Pago */}
            {currentTotalPrice === 0 ? (
              <div className="p-4 bg-gradient-to-b from-[#0b1f14] via-[#07160e] to-[#040e08] border-2 border-emerald-500/40 rounded-3xl space-y-3 shadow-xl animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#00ff87] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Estado: Confirmación Inmediata
                  </span>
                  <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                    🟢 Cortesía de Socio (Bs. 0)
                  </span>
                </div>

                <div className="p-3.5 bg-black/60 border border-emerald-500/30 rounded-2xl flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex flex-col items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_15px_rgba(0,255,135,0.2)]">
                    <QrCode className="w-8 h-8" />
                    <span className="text-[7px] font-black uppercase tracking-wider mt-0.5">Pase Directo</span>
                  </div>
                  <div className="text-xs text-gray-300 space-y-1">
                    <p className="font-bold text-white flex items-center gap-1">
                      <span>Pase Digital de Acceso Deportivo</span>
                      <span className="text-emerald-400 font-mono text-[11px] font-black">#100% Liberado</span>
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Como socio titular, tu uso de cancha no tiene costo. Al presionar <strong>Confirmar Reserva</strong>, tu turno queda reservado y recibirás tu pase de acceso directamente en tu WhatsApp.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gradient-to-b from-[#0b1f14] via-[#07160e] to-[#040e08] border-2 border-brand-gold/40 rounded-3xl space-y-3 shadow-xl animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-brand-gold uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" />
                    Estado: Pre-Reserva con Pago Requerido
                  </span>
                  <span className="text-[10px] text-amber-300 font-bold bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-brand-gold/40 animate-pulse">
                    🟡 Pre-reserva
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBookingPaymentMethod('QR')}
                    className={`p-2.5 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 relative ${
                      bookingPaymentMethod === 'QR'
                        ? 'bg-brand-gold/20 border-brand-gold text-brand-gold shadow-[0_0_15px_rgba(212,175,55,0.3)] scale-[1.02]'
                        : 'bg-black/50 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="absolute -top-2 bg-brand-gold text-black text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full">
                      Default
                    </span>
                    <QrCode className="w-5 h-5 mt-1" />
                    <span className="text-xs font-black">Pago QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBookingPaymentMethod('EFECTIVO')}
                    className={`p-2.5 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      bookingPaymentMethod === 'EFECTIVO'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-[1.02]'
                        : 'bg-black/50 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Banknote className="w-5 h-5" />
                    <span className="text-xs font-black">Efectivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBookingPaymentMethod('TARJETA')}
                    className={`p-2.5 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      bookingPaymentMethod === 'TARJETA'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-[1.02]'
                        : 'bg-black/50 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-xs font-black">Tarjeta / POS</span>
                  </button>
                </div>

                {bookingPaymentMethod === 'QR' && (
                  <div className="p-3 bg-black/60 border border-brand-gold/30 rounded-2xl flex items-center gap-3">
                    <img src={qrPagosUrl} alt="QR Pagos CHLS" className="w-16 h-16 object-cover rounded-xl border border-brand-gold/40 shrink-0 shadow-md" />
                    <div className="text-[11px] text-gray-300 space-y-0.5">
                      <p className="font-bold text-brand-gold">QR Oficial Club Hípico Los Sargentos</p>
                      <p className="text-gray-400">Banco BMSC / BCP. Al confirmar, este QR también se enviará a tu WhatsApp.</p>
                    </div>
                  </div>
                )}

                {bookingPaymentMethod === 'TARJETA' && (
                  <div className="p-3 bg-blue-950/40 rounded-2xl border border-blue-500/30 space-y-1.5 text-xs text-blue-200">
                    <p>
                      💳 <strong>Pago con Tarjeta:</strong> Puedes cancelar con tarjeta de débito o crédito en <strong>Oficinas de Atención al Socio y recepciones</strong>.
                    </p>
                    <div className="bg-black/40 p-2.5 rounded-xl border border-blue-500/20 text-[11px] text-gray-300 space-y-1">
                      <p className="font-bold text-brand-gold">
                        🕒 Horarios de Atención para Cobro con Tarjeta:
                      </p>
                      <p>• Lunes a Viernes: <strong>06:00 a 22:00 hrs</strong></p>
                      <p>• Sábados y Domingos: <strong>07:00 a 20:00 hrs</strong></p>
                    </div>
                    {!isCardPaymentAllowed && (
                      <p className="text-[10px] text-amber-300 bg-amber-950/50 p-2 rounded-lg border border-amber-500/30">
                        ⚠️ <em>Nota: Te encuentras fuera del horario de atención de cajas. Tu turno quedará reservado y podrás cancelar con tarjeta al abrir las recepciones o pagar con QR ahora.</em>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Total */}
            <div className="p-4 bg-gradient-to-b from-[#0c2417] to-[#05140c] rounded-3xl border-2 border-emerald-500/50 flex items-center justify-between shadow-xl">
              <span className="text-xs font-black text-gray-200 uppercase tracking-wider">TOTAL A PAGAR:</span>
              <span className="text-xl sm:text-2xl font-black text-[#00ff87] font-mono drop-shadow-[0_0_8px_rgba(0,255,135,0.6)]">
                {currentTotalPrice === 0 ? 'Bs. 0 (Cortesía Socio)' : `Bs. ${currentTotalPrice}`}
              </span>
            </div>

            {/* Botón de Confirmación */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-3xl bg-gradient-to-r from-emerald-500 via-[#00ff87] to-emerald-500 hover:from-emerald-400 hover:to-[#00ff87] text-black font-black text-base flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(0,255,135,0.4)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    {editingReservation 
                      ? 'Guardar Cambios de Reserva' 
                      : (currentTotalPrice === 0 ? 'Confirmar Reserva de Cancha' : 'Confirmar Pre-Reserva')}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL QR DE PAGO / CONSULTA DE COMPROBANTE (UNIFICADO) */}
      {/* ========================================================================= */}
      <ReservationQrDetailsModal
        isOpen={!!(bookingSuccess || selectedForQrModal)}
        onClose={() => {
          setBookingSuccess(null);
          setSelectedForQrModal(null);
        }}
        reservation={bookingSuccess || selectedForQrModal}
        onUploadReceipt={handleFileUpload}
        onEdit={handleStartEditReservation}
      />

      {/* ========================================================================= */}
      {/* MODAL DE NORMATIVA & CONTACTOS */}
      {/* ========================================================================= */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b1610] border border-brand-gold/40 rounded-3xl p-6 max-w-lg w-full space-y-4 relative shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="text-sm font-bold text-brand-gold uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="w-4 h-4" /> Normativa & Casetas Deportivas
              </h3>
              <button onClick={() => setShowInfoModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="text-xs space-y-2.5 text-gray-300">
              <p>• <strong>Cortesía de Socio:</strong> El uso de cancha es gratuito para el socio y sus familiares directos.</p>
              <p>• <strong>Aranceles de Invitados:</strong> Tenis (Bs. 50/h), Pádel (Bs. 80/h), Frontón/Raquet (Bs. 50/h), Polifuncional (Bs. 100/reserva).</p>
              <p>• <strong>Pases de Invitados:</strong> Si tienes pases de pronto pago anual, tus invitados no pagan arancel.</p>
              <p>• <strong>Contactos de Casetas:</strong> Tenis/Frontón (+591 76753734 / 76753758) • Pádel (+591 76753744) • Gimnasio (+591 76753743).</p>
            </div>

            <button
              onClick={() => setShowInfoModal(false)}
              className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default CourtBooking;
