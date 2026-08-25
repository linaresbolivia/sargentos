import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@store/store';
import { fetchCurrentProfile } from '@store/membersSlice';
import CrestLogo from '@shared/components/CrestLogo';
import { 
  Users, 
  CalendarCheck, 
  CreditCard, 
  History, 
  Car, 
  ChevronRight, 
  LogOut, 
  CheckCircle2, 
  Clock,
  ShieldCheck, 
  UserPlus, 
  QrCode, 
  Waves, 
  Dumbbell, 
  Sparkles, 
  Activity,
  X,
  Lock,
  Award,
  DollarSign,
  Home,
  FileText,
  Calendar,
  Smartphone,
  Check,
  AlertTriangle,
  ArrowRight,
  Download,
  Info,
  PhoneCall
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { logout } from '@store/authSlice';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '@shared/components/LanguageToggle';

export const MemberDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { currentProfile } = useSelector((state: RootState) => state.members);
  const { user } = useSelector((state: RootState) => state.auth);

  // Active Modals
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedFamilyMemberQr, setSelectedFamilyMemberQr] = useState<any>(null);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [showHorsesModal, setShowHorsesModal] = useState(false);
  const [showVehiclesModal, setShowVehiclesModal] = useState(false);
  const [showAccountStatementModal, setShowAccountStatementModal] = useState(false);
  const [showQrPayModal, setShowQrPayModal] = useState(false);

  useEffect(() => {
    dispatch(fetchCurrentProfile());
  }, [dispatch]);

  // Master Comprehensive Data for the Member
  const socio = {
    fullName: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Gonzalo Durán Morales',
    alphaCode: 'DUR-MOR-G-M',
    documentId: '3489201 LP',
    membershipNumber: 'FAM-1042',
    status: 'ACTIVA',
    category: 'Socio Familiar Propietario',
    seniorityYears: 4,
    admissionVoucher: 'BNB-9482018 (15/03/2022)',
    debt: 0.00,
    nextQuotaDate: '01 de Septiembre, 2026',
    monthlyQuotaAmount: 880,
    boxMonthlyAmount: 195,
    lastEntry: 'Hoy a las 08:30 am (Garita Principal)',
    totalCDPInstallments: 60,
    paidCDPInstallments: 40,
    cdpAmountPaid: 46400,
    cdpTotalAmount: 69600,
    beneficiaries: [
      { id: 'b1', name: 'Mariana Suárez de Durán', relationship: 'Cónyuge', age: 42, status: 'HABILITADO', photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', rfidTag: 'TAG-M-1042-01' },
      { id: 'b2', name: 'Mateo Durán Suárez', relationship: 'Hijo', age: 17, status: 'HABILITADO', photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', rfidTag: 'TAG-M-1042-02' },
      { id: 'b3', name: 'Sebastian Durán Suárez', relationship: 'Hijo Mayor', age: 25, status: 'BLOQUEADO_EDAD', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', rfidTag: 'TAG-M-1042-03', note: 'Mayor de 25 años. Opción pase a Pre-Asociado.' },
      { id: 'b4', name: 'Juana Mamani Quispe', relationship: 'Personal de Apoyo (Nana)', age: 38, status: 'HABILITADO', photo: '', rfidTag: 'TAG-M-1042-04', note: 'Acceso para custodia de menores.' }
    ],
    horses: [
      { id: 'h1', name: 'Sultán de la Colina', box: 'Box H-08', breed: 'Pura Sangre / Salto', vet: 'Dr. Ramiro Vargas', diet: 'Heno de alfalfa + avena suplementada', lastVetCheck: '14 de Agosto, 2026' }
    ],
    vehicles: [
      { id: 'v1', plate: '4820-KPL', brand: 'Toyota', model: 'Land Cruiser Prado', color: 'Gris Grafito', rfidStatus: 'ACTIVO', autoOpenGate: true }
    ],
    activeReservations: [
      { id: 'r1', sport: 'Tenis', court: 'Cancha 2 (Arcilla)', date: 'Hoy', time: '10:00 - 11:00', status: 'CONFIRMADA' },
      { id: 'r2', sport: 'Pádel', court: 'Cancha Panorámica 1', date: 'Mañana', time: '18:00 - 19:00', status: 'CONFIRMADA' }
    ]
  };

  const handleLogout = () => {
    dispatch(logout());
    toast.success(t('header.logoutSuccess') || 'Sesión cerrada correctamente');
  };

  const cdpPercentage = Math.round((socio.paidCDPInstallments / socio.totalCDPInstallments) * 100);

  const activeFamilyMemberForQr = selectedFamilyMemberQr || {
    name: socio.fullName,
    relationship: 'Titular Propietario',
    membershipNumber: socio.membershipNumber,
    alphaCode: socio.alphaCode,
    status: socio.status
  };

  const dynamicQrData = JSON.stringify({
    membership: socio.membershipNumber,
    alphaCode: socio.alphaCode,
    person: activeFamilyMemberForQr.name,
    relationship: activeFamilyMemberForQr.relationship,
    status: activeFamilyMemberForQr.status,
    issuedAt: new Date().toISOString()
  });

  return (
    <div className="min-h-screen bg-[#030805] text-gray-100 font-sans pb-24 selection:bg-brand-gold selection:text-black">
      
      {/* Background Ambient Glow Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-brand-gold/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[130px]"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-yellow-600/10 rounded-full blur-[140px]"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* ========================================================================= */}
        {/* TOP VIP HERO BANNER (Elegance & Polish like Court Booking)                 */}
        {/* ========================================================================= */}
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c2016] via-[#08150f] to-[#040a07] border border-brand-gold/30 p-5 sm:p-7 shadow-2xl">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-gold/15 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <CrestLogo size="md" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-gold/20 text-brand-gold border border-brand-gold/40">
                    Socio Distinguido
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> EN LÍNEA
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white serif-brand tracking-tight mt-1">
                  Portal Exclusivo <span className="text-brand-gold">del Socio</span>
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  Club Hípico Los Sargentos • Sede Principal La Paz
                </p>
              </div>
            </div>

            {/* Quick Actions Header Pills */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap sm:flex-nowrap">
              <Link
                to="/"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all text-xs font-semibold"
                title="Menú General"
              >
                <Home className="w-3.5 h-3.5 text-brand-gold" />
                <span>Menú Principal</span>
              </Link>

              <button
                onClick={() => navigate('/member/reservations')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-brand-gold to-yellow-600 text-black text-xs font-extrabold shadow-md shadow-brand-gold/20 hover:scale-105 transition-all"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Reservar Cancha</span>
              </button>

              <div className="hidden sm:block">
                <LanguageToggle />
              </div>

              <button 
                onClick={handleLogout}
                className="p-2 rounded-2xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-red-400 transition-all"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* VIP BLACK & GOLD DIGITAL PASSPORT CARD (Exclusive Metal Card Styling)     */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#16251d] via-[#0d1712] to-[#080d0a] border-2 border-brand-gold/40 p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Card Holographic Watermark Crest */}
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-8 translate-y-8">
            <CrestLogo size="xl" />
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            
            {/* Titular Details */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-brand-gold/50 bg-black/60 overflow-hidden shadow-lg shrink-0 flex items-center justify-center text-brand-gold font-bold text-2xl">
                {socio.fullName.charAt(0)}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-gold/20 text-brand-gold border border-brand-gold/40">
                    {socio.category}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/60 text-emerald-400 border border-emerald-500/30">
                    {socio.alphaCode}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-gray-300 border border-white/10">
                    {socio.seniorityYears} años antigüedad
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-white serif-brand">
                  {socio.fullName}
                </h2>

                <p className="text-xs text-gray-400">
                  CI: <span className="text-white font-mono font-semibold">{socio.documentId}</span> • Nro. Título: <span className="text-brand-gold font-bold">{socio.membershipNumber}</span>
                </p>
              </div>
            </div>

            {/* Credential Trigger Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => { setSelectedFamilyMemberQr(null); setShowQrModal(true); }}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-gold via-yellow-500 to-amber-600 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-105 shadow-xl shadow-brand-gold/20 transition-all border border-brand-gold"
              >
                <QrCode className="w-4 h-4" /> Ver Pase Digital Holográfico
              </button>

              <button
                onClick={() => setShowAccountStatementModal(true)}
                className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-200 text-xs font-bold flex items-center justify-center gap-2 border border-white/10 transition-all"
              >
                <CreditCard className="w-4 h-4 text-emerald-400" /> Estado de Cuenta
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-brand-gold/15 text-xs">
            <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Estado de Membresía</p>
              <p className="text-sm font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-4 h-4" /> 100% Habilitado
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Saldo en Mora</p>
              <p className="text-sm font-bold text-emerald-400 mt-0.5">
                Bs {socio.debt.toFixed(2)} (Al Día)
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Próximo Vencimiento</p>
              <p className="text-sm font-bold text-gray-200 mt-0.5">
                {socio.nextQuotaDate}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Cuota Social Mensual</p>
              <p className="text-sm font-bold text-brand-gold mt-0.5">
                Bs {socio.monthlyQuotaAmount} + {socio.boxMonthlyAmount} Box
              </p>
            </div>
          </div>

          {/* CDP Equity Amortization Progress Bar */}
          <div className="p-4 rounded-2xl bg-black/50 border border-brand-gold/20 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-gold" />
                <span className="font-bold text-white">Amortización Patrimonial CDP (Cuota de Participación)</span>
              </div>
              <span className="font-mono font-bold text-brand-gold">
                {socio.paidCDPInstallments} de {socio.totalCDPInstallments} cuotas ({cdpPercentage}%)
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/5">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-yellow-500 via-brand-gold to-emerald-400 transition-all duration-700 shadow-md shadow-brand-gold/30"
                style={{ width: `${cdpPercentage}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-[11px] text-gray-400 pt-0.5">
              <span>Abonado acumulado: <strong className="text-emerald-400">Bs {socio.cdpAmountPaid.toLocaleString()}</strong></span>
              <span>Valor total del título: <strong className="text-white">Bs {socio.cdpTotalAmount.toLocaleString()}</strong></span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* LIVE CLUB OCCUPANCY & RADAR TELEMETRY WIDGET                              */}
        {/* ========================================================================= */}
        <section 
          onClick={() => navigate('/member/occupancy')}
          className="relative overflow-hidden rounded-3xl p-5 border border-emerald-500/30 hover:border-brand-gold bg-gradient-to-r from-[#0c2317] via-[#091810] to-[#06110a] cursor-pointer group shadow-xl hover:shadow-emerald-500/10 transition-all"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 tracking-wider">
                    RADAR EN TIEMPO REAL
                  </span>
                  <span className="text-xs text-brand-gold font-bold">Semáforo de Aforo del Club</span>
                </div>
                <h3 className="text-base font-extrabold text-white group-hover:text-brand-gold transition-colors mt-0.5">
                  ¿Cuán concurrido está el Club en este momento?
                </h3>
                <p className="text-xs text-gray-400">
                  Piscina: <span className="text-emerald-400 font-semibold">38% (Normal)</span> • Gimnasio: <span className="text-emerald-400 font-semibold">42% (Normal)</span> • Tenis: <span className="text-amber-400 font-semibold">65% (Moderado)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center px-4 py-2 rounded-xl bg-white/5 border border-white/10 group-hover:border-brand-gold/40 transition-colors">
              <span className="text-xs font-bold text-brand-gold uppercase tracking-wider">
                Ver Semáforo Completo
              </span>
              <ChevronRight className="w-4 h-4 text-brand-gold group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* INTERACTIVE ASSETS & ATTRIBUTES GRID (4 Cards with Modal Drawers)         */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* 1. Beneficiarios */}
          <div 
            onClick={() => setShowFamilyModal(true)}
            className="p-5 rounded-3xl bg-gradient-to-b from-[#121c17] to-[#09110d] border border-white/10 hover:border-brand-gold transition-all duration-300 hover:-translate-y-1 cursor-pointer group shadow-lg text-center space-y-2 relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-brand-gold/15 text-brand-gold flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-2xl font-black text-white">{socio.beneficiaries.length}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Núcleo Familiar</p>
            <span className="text-[10px] text-brand-gold block group-hover:underline">Ver Dependientes →</span>
          </div>

          {/* 2. Equinos */}
          <div 
            onClick={() => setShowHorsesModal(true)}
            className="p-5 rounded-3xl bg-gradient-to-b from-[#121c17] to-[#09110d] border border-white/10 hover:border-emerald-500 transition-all duration-300 hover:-translate-y-1 cursor-pointer group shadow-lg text-center space-y-2 relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <p className="text-2xl font-black text-white">{socio.horses.length}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Equinos (Box H-08)</p>
            <span className="text-[10px] text-emerald-400 block group-hover:underline">Ver Establo & Dieta →</span>
          </div>

          {/* 3. Vehículos */}
          <div 
            onClick={() => setShowVehiclesModal(true)}
            className="p-5 rounded-3xl bg-gradient-to-b from-[#121c17] to-[#09110d] border border-white/10 hover:border-blue-500 transition-all duration-300 hover:-translate-y-1 cursor-pointer group shadow-lg text-center space-y-2 relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <Car className="w-6 h-6" />
            </div>
            <p className="text-2xl font-black text-white">{socio.vehicles.length}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tag Garita (Prado)</p>
            <span className="text-[10px] text-blue-400 block group-hover:underline">Ver Placas Activas →</span>
          </div>

          {/* 4. Reservas */}
          <div 
            onClick={() => navigate('/reservations')}
            className="p-5 rounded-3xl bg-gradient-to-b from-[#121c17] to-[#09110d] border border-white/10 hover:border-purple-500 transition-all duration-300 hover:-translate-y-1 cursor-pointer group shadow-lg text-center space-y-2 relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <p className="text-2xl font-black text-white">{socio.activeReservations.length}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Canchas Reservadas</p>
            <span className="text-[10px] text-purple-400 block group-hover:underline">Gestionar Canchas →</span>
          </div>

        </section>

        {/* ========================================================================= */}
        {/* CURATED SERVICES ECOSYSTEM (High-End Action Cards)                       */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div>
              <h3 className="text-base font-bold text-white serif-brand uppercase tracking-wider">
                Ecosistema de Servicios Exclusivos
              </h3>
              <p className="text-xs text-gray-400">Accede directamente a todas las facilidades de tu club</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: Canchas */}
            <div 
              onClick={() => navigate('/reservations')}
              className="p-5 rounded-3xl bg-gradient-to-br from-[#101b15] to-[#08100c] border border-white/10 hover:border-brand-gold cursor-pointer transition-all duration-300 hover:-translate-y-1 group space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-brand-gold flex items-center justify-center font-bold">
                  🎾
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  En Vivo
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-brand-gold transition-colors">
                  Reserva de Canchas Deportivas
                </h4>
                <p className="text-xs text-gray-400 mt-1">
                  Tenis, Pádel Panorámico, Frontón Oficial, Raquet, Wally y Fútbol de césped.
                </p>
              </div>
              <div className="pt-2 flex items-center text-xs font-bold text-brand-gold group-hover:translate-x-1 transition-transform">
                <span>Reservar turno online</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* Card 2: Aforo & Semáforo */}
            <div 
              onClick={() => navigate('/member/occupancy')}
              className="p-5 rounded-3xl bg-gradient-to-br from-[#101b15] to-[#08100c] border border-white/10 hover:border-emerald-500 cursor-pointer transition-all duration-300 hover:-translate-y-1 group space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  🏊
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  En Vivo
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                  Piscina, Saunas & Gimnasio en Vivo
                </h4>
                <p className="text-xs text-gray-400 mt-1">
                  Temperaturas de piscinas 5 y 3 carriles, jacuzzi, saunas y aforo en tiempo real.
                </p>
              </div>
              <div className="pt-2 flex items-center text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                <span>Ver telemetría y temperaturas</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* Card 3: Estado de Cuenta & Pagos */}
            <div 
              onClick={() => setShowAccountStatementModal(true)}
              className="p-5 rounded-3xl bg-gradient-to-br from-[#101b15] to-[#08100c] border border-white/10 hover:border-brand-gold cursor-pointer transition-all duration-300 hover:-translate-y-1 group space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-brand-gold flex items-center justify-center font-bold">
                  💳
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  Al Día
                </span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-brand-gold transition-colors">
                  Estado de Cuenta & Pagos QR
                </h4>
                <p className="text-xs text-gray-400 mt-1">
                  Consulta de cuotas sociales, notas veterinarias y pago rápido por QR bancario.
                </p>
              </div>
              <div className="pt-2 flex items-center text-xs font-bold text-brand-gold group-hover:translate-x-1 transition-transform">
                <span>Ver historial & facturas</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

          </div>
        </section>

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ULTRA-LUXURY HOLOGRAPHIC DIGITAL PASS (QR MODAL)                 */}
      {/* ========================================================================= */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-gradient-to-b from-[#14231b] via-[#0d1611] to-[#070b09] border-2 border-brand-gold/60 rounded-3xl p-6 shadow-2xl space-y-5 text-center text-white">
            
            <button 
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <CrestLogo size="sm" />
              <h3 className="text-lg font-bold text-white serif-brand mt-2">
                Pase Digital de Acceso Holográfico
              </h3>
              <p className="text-[11px] text-brand-gold font-bold uppercase tracking-wider">
                Club Hípico Los Sargentos
              </p>
            </div>

            {/* Selector of Family Member for Credential */}
            <div className="flex gap-1.5 overflow-x-auto p-1 bg-black/50 rounded-2xl border border-white/5 text-[11px]">
              <button
                onClick={() => setSelectedFamilyMemberQr(null)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${!selectedFamilyMemberQr ? 'bg-brand-gold text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                Titular ({socio.fullName.split(' ')[0]})
              </button>
              {socio.beneficiaries.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedFamilyMemberQr(b)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${selectedFamilyMemberQr?.id === b.id ? 'bg-brand-gold text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
                >
                  {b.name.split(' ')[0]} ({b.relationship})
                </button>
              ))}
            </div>

            {/* The QR Container */}
            <div className="p-5 bg-white rounded-3xl inline-block shadow-2xl border-4 border-brand-gold/40 relative">
              <QRCodeSVG value={dynamicQrData} size={190} level="H" />
            </div>

            {/* Credential Data Summary */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-black/40 border border-white/10 text-xs">
              <p className="text-base font-bold text-white">{activeFamilyMemberForQr.name}</p>
              <p className="text-xs text-gray-400">
                {activeFamilyMemberForQr.relationship} • Membresía <span className="text-brand-gold font-bold">{socio.membershipNumber}</span>
              </p>
              
              {activeFamilyMemberForQr.status === 'BLOQUEADO_EDAD' ? (
                <span className="inline-block mt-1 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                  🔴 Acceso Restringido (&gt;25 años)
                </span>
              ) : (
                <span className="inline-block mt-1 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  🟢 Habilitado para Molinetes & Garita
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => toast.success('¡Credencial agregada a Apple / Google Wallet!')}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-white/10"
              >
                <Smartphone className="w-4 h-4 text-brand-gold" /> Guardar en Wallet
              </button>
              <button 
                onClick={() => window.print()}
                className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-bold transition-all"
                title="Imprimir"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: NÚCLEO FAMILIAR & DEPENDIENTES                                    */}
      {/* ========================================================================= */}
      {showFamilyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#13221a] to-[#0a100d] border border-brand-gold/40 rounded-3xl p-6 shadow-2xl space-y-4 text-white">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold serif-brand flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-gold" /> Núcleo Familiar Registrado
                </h3>
                <p className="text-xs text-gray-400">Título #{socio.membershipNumber} ({socio.category})</p>
              </div>
              <button onClick={() => setShowFamilyModal(false)} className="p-1 rounded-full hover:bg-white/10 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {socio.beneficiaries.map(b => (
                <div key={b.id} className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-black/60 border border-brand-gold/30 overflow-hidden flex items-center justify-center text-brand-gold font-bold shrink-0">
                      {b.photo ? <img src={b.photo} alt={b.name} className="w-full h-full object-cover" /> : b.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{b.name}</h4>
                      <p className="text-xs text-gray-400">{b.relationship} • {b.age} años</p>
                      {b.note && <p className="text-[11px] text-amber-400 mt-0.5">{b.note}</p>}
                    </div>
                  </div>

                  <div className="text-right">
                    {b.status === 'BLOQUEADO_EDAD' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                        Bloqueado (&gt;25a)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Habilitado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button 
                onClick={() => setShowFamilyModal(false)}
                className="px-5 py-2 rounded-xl bg-brand-gold text-black text-xs font-bold"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ÁREA HÍPICA & BOXES                                              */}
      {/* ========================================================================= */}
      {showHorsesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-gradient-to-b from-[#13221a] to-[#0a100d] border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-white">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold serif-brand flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" /> Registro Hípico & Boxes
                </h3>
                <p className="text-xs text-gray-400">Tarifa asignada: 195 Bs/mes por box</p>
              </div>
              <button onClick={() => setShowHorsesModal(false)} className="p-1 rounded-full hover:bg-white/10 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {socio.horses.map(h => (
              <div key={h.id} className="p-4 rounded-2xl bg-black/50 border border-emerald-500/30 space-y-2.5 text-xs">
                <div className="flex justify-between font-bold text-sm">
                  <span className="text-white">🐎 {h.name}</span>
                  <span className="text-brand-gold font-mono">{h.box}</span>
                </div>
                <p className="text-gray-300">Raza / Disciplina: <strong className="text-white">{h.breed}</strong></p>
                <p className="text-gray-300">Médico Veterinario: <strong className="text-white">{h.vet}</strong></p>
                <p className="text-gray-300">Plan Nutricional: <strong className="text-white">{h.diet}</strong></p>
                <p className="text-emerald-400">Última Revisión Médica: {h.lastVetCheck}</p>
              </div>
            ))}

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button 
                onClick={() => setShowHorsesModal(false)}
                className="px-5 py-2 rounded-xl bg-emerald-500 text-black text-xs font-bold"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: VEHÍCULOS AUTORIZADOS & TAG GARITA                               */}
      {/* ========================================================================= */}
      {showVehiclesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-gradient-to-b from-[#13221a] to-[#0a100d] border border-blue-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-white">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold serif-brand flex items-center gap-2">
                  <Car className="w-5 h-5 text-blue-400" /> Vehículos Autorizados para Garita
                </h3>
                <p className="text-xs text-gray-400">Apertura automática con sensor RFID en barrera principal</p>
              </div>
              <button onClick={() => setShowVehiclesModal(false)} className="p-1 rounded-full hover:bg-white/10 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {socio.vehicles.map(v => (
              <div key={v.id} className="p-4 rounded-2xl bg-black/50 border border-blue-500/30 flex items-center justify-between text-xs">
                <div>
                  <p className="text-base font-bold font-mono text-white">{v.plate}</p>
                  <p className="text-gray-400">{v.brand} {v.model} ({v.color})</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Tag Activo
                </span>
              </div>
            ))}

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button 
                onClick={() => setShowVehiclesModal(false)}
                className="px-5 py-2 rounded-xl bg-blue-500 text-black text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: ESTADO DE CUENTA & PAGOS QR                                      */}
      {/* ========================================================================= */}
      {showAccountStatementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-xl bg-gradient-to-b from-[#13221a] to-[#0a100d] border border-brand-gold/40 rounded-3xl p-6 shadow-2xl space-y-4 text-white">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold serif-brand flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-brand-gold" /> Estado de Cuenta & Historial de Pagos
                </h3>
                <p className="text-xs text-gray-400">Socio #{socio.membershipNumber} - {socio.fullName}</p>
              </div>
              <button onClick={() => setShowAccountStatementModal(false)} className="p-1 rounded-full hover:bg-white/10 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Financial Status */}
            <div className="p-4 rounded-2xl bg-black/60 border border-brand-gold/30 flex justify-between items-center text-xs">
              <div>
                <p className="text-gray-400">Estado de Cobranza:</p>
                <p className="text-base font-bold text-emerald-400 mt-0.5">✓ Al Día (0.00 Bs Mora)</p>
                <p className="text-[11px] text-gray-400 mt-1">Próxima Cuota Social: 01/09/2026 (Bs 880 + Bs 195 Box)</p>
              </div>
              <button 
                onClick={() => setShowQrPayModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-600 text-black text-xs font-black hover:scale-105 transition-all shadow-md shadow-brand-gold/20 flex items-center gap-1.5"
              >
                <DollarSign className="w-4 h-4" /> Pagar por QR
              </button>
            </div>

            {/* Recent Billing Breakdown */}
            <div className="space-y-2 text-xs">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Últimas Transacciones Registradas</h4>
              
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex justify-between items-center">
                <div>
                  <p className="font-bold text-white">Cuota Social Agosto 2026</p>
                  <p className="text-[11px] text-gray-400">Factura #FAC-2026-0814 • Pagado 01/08/2026</p>
                </div>
                <p className="font-bold text-emerald-400">Bs 880.00</p>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex justify-between items-center">
                <div>
                  <p className="font-bold text-white">Alquiler Box H-08 (Sultán)</p>
                  <p className="text-[11px] text-gray-400">Factura #FAC-2026-0814 • Pagado 01/08/2026</p>
                </div>
                <p className="font-bold text-emerald-400">Bs 195.00</p>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex justify-between items-center">
                <div>
                  <p className="font-bold text-white">Cuota CDP 40/60</p>
                  <p className="text-[11px] text-gray-400">Recibo Oficial #REC-2026-0040 • Pagado 01/08/2026</p>
                </div>
                <p className="font-bold text-emerald-400">Bs 464.00</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button 
                onClick={() => toast.success('Descargando extracto oficial de cuenta en PDF...')}
                className="px-4 py-2 rounded-xl bg-white/10 text-gray-200 text-xs font-bold hover:bg-white/20 flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Descargar Extracto PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR BANCO SIMPLE PAYMENT MODAL */}
      {showQrPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-sm bg-gradient-to-b from-[#14231b] to-[#070b09] border-2 border-brand-gold/60 rounded-3xl p-6 shadow-2xl space-y-4 text-center text-white">
            <button onClick={() => setShowQrPayModal(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-gray-400">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold serif-brand">Pago por QR Simple Bancario</h3>
            <p className="text-xs text-gray-400">Escanea desde la app de cualquier banco boliviano</p>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-xl">
              <QRCodeSVG value="https://pagos.chls.bo/qr/pay/FAM-1042" size={170} level="H" />
            </div>

            <p className="text-sm font-bold text-brand-gold">Monto: Bs 1,075.00</p>
            <p className="text-[10px] text-gray-400">Concepto: Cuota Social Septiembre 2026 + Box H-08</p>

            <button 
              onClick={() => { toast.success('¡Pago verificado y acreditado!'); setShowQrPayModal(false); }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-black text-xs font-black"
            >
              Ya realicé el pago
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
