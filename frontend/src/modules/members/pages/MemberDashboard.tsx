import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@store/store';
import { fetchCurrentProfile } from '@store/membersSlice';
import CrestLogo from '@shared/components/CrestLogo';
import { BackButton } from '@shared/components/BackButton';
import { ThemeToggle } from '@shared/components/ThemeToggle';
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
  PhoneCall,
  Leaf,
  MessageSquare
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { logout } from '@store/authSlice';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '@shared/components/LanguageToggle';
import { MemberEcoImpactModal } from '../components/MemberEcoImpactModal';
import { memberPortalApi, SocioAccountStatementResponse } from '../services/memberPortalApi';
import { MemberQrPaymentModal } from '../components/MemberQrPaymentModal';

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
  const [showQrPayModal, setShowQrPayModal] = useState(false);
  const [showEcoModal, setShowEcoModal] = useState(false);
  const [statement, setStatement] = useState<SocioAccountStatementResponse | null>(null);

  const loadStatement = () => {
    memberPortalApi.getMyAccountStatement()
      .then(data => setStatement(data))
      .catch(err => console.error('Error fetching statement in dashboard:', err));
  };

  useEffect(() => {
    dispatch(fetchCurrentProfile());
    loadStatement();
  }, [dispatch]);

  const dynamicDebt = statement?.financialSummary?.totalDebt ?? currentProfile?.debt ?? 0;
  const dynamicAccessStatus = statement?.financialSummary?.accessStatus ?? (dynamicDebt === 0 ? 'GRANTED' : 'WARNING');
  const dynamicMembershipNum = statement?.socio?.membershipNumber ?? currentProfile?.membershipNumber ?? 'FAM-1042';
  const dynamicFullName = statement?.socio?.fullName ?? (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Gonzalo Durán Morales');
  const dynamicCategory = statement?.socio?.category ?? currentProfile?.category ?? 'Socio Familiar Propietario';
  const dynamicDocumentId = statement?.socio?.documentId ?? user?.documentId ?? '3489201 LP';

  // Master Comprehensive Data for the Member
  const socio = {
    fullName: dynamicFullName,
    alphaCode: statement?.socio?.alphaCode || 'DUR-MOR-G-M',
    documentId: dynamicDocumentId,
    membershipNumber: dynamicMembershipNum,
    status: statement?.socio?.membershipStatus || 'ACTIVA',
    category: dynamicCategory,
    seniorityYears: currentProfile?.antiquityYears || 4,
    admissionVoucher: 'BNB-9482018 (15/03/2022)',
    debt: dynamicDebt,
    nextQuotaDate: statement?.financialSummary?.nextDueDate || '05 de Noviembre, 2026',
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
    <div className="min-h-screen bg-[#f8f9f6] dark:bg-[#050906] text-gray-900 dark:text-gray-100 font-sans pb-16 selection:bg-brand-gold selection:text-black transition-colors duration-300">
      
      {/* Background Ambient Radial Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] bg-gradient-to-b from-brand-gold/[0.12] dark:from-brand-gold/[0.08] via-emerald-600/[0.06] dark:via-emerald-600/[0.04] to-transparent rounded-full blur-[140px]"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-emerald-500/[0.08] dark:bg-emerald-500/[0.05] rounded-full blur-[140px]"></div>
        <div className="absolute bottom-10 -left-40 w-96 h-96 bg-amber-600/[0.06] dark:bg-amber-600/[0.04] rounded-full blur-[140px]"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        
        {/* ========================================================================= */}
        {/* TOP VIP HERO BANNER (Quiet Luxury & Minimalist)                           */}
        {/* ========================================================================= */}
        <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white/95 via-[#fcfbfa]/95 to-[#f6f5f0]/95 dark:from-[#0c1811]/90 dark:via-[#070f0b]/90 dark:to-[#040806]/95 border border-amber-900/10 dark:border-white/[0.08] backdrop-blur-2xl p-4 sm:p-5 shadow-xl shadow-amber-950/[0.04] dark:shadow-2xl transition-colors duration-300">
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-brand-gold/[0.12] dark:bg-brand-gold/[0.08] rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <BackButton to="/" title="Volver al Portal Principal" />
              <CrestLogo size="sm" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.18em] bg-amber-500/15 text-amber-900 dark:text-brand-gold border border-amber-500/30 dark:border-brand-gold/30">
                    Socio Distinguido
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/15 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30 dark:border-emerald-500/25 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
                    <span>EN LÍNEA</span>
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-950 dark:text-white serif-brand tracking-tight mt-1">
                  Portal del <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-700 via-amber-600 to-yellow-600 dark:from-brand-gold dark:via-yellow-200 dark:to-amber-400">Socio</span>
                </h1>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 tracking-wider">
                  Club Hípico Los Sargentos • Sede Principal La Paz
                </p>
              </div>
            </div>

            {/* Controls: Language, Theme, Logout */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <LanguageToggle />
              <ThemeToggle />

              <button 
                onClick={handleLogout}
                className="p-2.5 rounded-xl bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-300 dark:bg-white/[0.04] dark:hover:bg-red-500/15 dark:border-white/[0.08] dark:hover:border-red-500/30 dark:text-gray-400 dark:hover:text-red-400 transition-all shadow-sm dark:shadow-none"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* VIP MEMBER PROFILE CARD (Sleek Black Titanium Luxury Card)                 */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#ffffff] via-[#faf8f3] to-[#f4eee2] dark:from-[#121f17]/95 dark:via-[#09130d]/95 dark:to-[#040705]/98 border border-amber-400/40 dark:border-amber-500/35 p-5 sm:p-6 shadow-[0_20px_50px_rgba(204,161,75,0.12),0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),0_0_35px_rgba(217,171,83,0.09)] backdrop-blur-2xl space-y-4 transition-colors duration-300">
          {/* Subtle Ambient Radial Gold Glow */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br from-brand-gold/20 dark:from-brand-gold/15 via-amber-500/10 dark:via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>

          {/* Card Holographic Watermark Crest */}
          <div className="absolute right-3 bottom-1 opacity-[0.06] dark:opacity-[0.08] pointer-events-none transform translate-x-4 translate-y-4 text-amber-900 dark:text-white">
            <CrestLogo size="xl" />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
            {/* Titular Details */}
            <div className="flex items-center gap-4">
              {/* Luxury Seal Medallion Avatar */}
              <div className="relative shrink-0">
                <div className="p-[2.5px] rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-300 to-yellow-600 shadow-xl shadow-amber-500/25">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[14px] bg-gradient-to-b from-[#18291f] via-[#0d1712] to-[#060a08] flex items-center justify-center font-serif text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-300 to-amber-500">
                    {socio.fullName.charAt(0)}
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white dark:border-[#08100c] shadow-sm"></span>
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-amber-500/20 to-yellow-500/25 dark:from-amber-500/25 dark:to-yellow-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/30 dark:border-amber-400/40 shadow-sm">
                    {socio.category}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 dark:bg-black/70 text-emerald-800 dark:text-emerald-300 border border-emerald-600/30 dark:border-emerald-500/30">
                    {socio.alphaCode}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-white/[0.08] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/[0.08]">
                    {socio.seniorityYears} años antigüedad
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-950 dark:text-white serif-brand tracking-tight">
                  {socio.fullName}
                </h2>

                <p className="text-xs text-gray-600 dark:text-gray-400">
                  CI: <span className="text-gray-900 dark:text-white font-mono font-semibold">{socio.documentId}</span> • Nro. Título: <span className="text-amber-700 dark:text-brand-gold font-bold font-mono tracking-wider">{socio.membershipNumber}</span>
                </p>
              </div>
            </div>

            {/* Subtle VIP Club Crest badge on right */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50/90 dark:bg-black/40 border border-amber-300 dark:border-amber-500/20 text-amber-900 dark:text-amber-300/80 text-[11px] font-medium shadow-sm dark:shadow-none">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-brand-gold animate-pulse" />
              <span>Membresía Vitalicia Activa</span>
            </div>
          </div>

          {/* Integrated Luxury Telemetry Strip (2 Columns with Hairline Divider) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-amber-900/10 dark:divide-white/[0.08] bg-white/80 dark:bg-black/50 border border-amber-400/30 dark:border-amber-500/20 rounded-2xl overflow-hidden shadow-sm dark:shadow-inner">
            <div className="p-3.5 sm:p-4 flex flex-col justify-center">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-[0.18em]">Estado de Membresía</p>
              {dynamicAccessStatus === 'GRANTED' ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse"></span>
                  <span className="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-300">100% Habilitado</span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-normal hidden lg:inline">• Garita, Molinetes y Canchas</span>
                </div>
              ) : dynamicAccessStatus === 'WARNING' ? (
                <div className="flex items-center gap-2 mt-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm sm:text-base font-bold text-amber-700 dark:text-amber-400">1 Mes Mora (Tolerancia)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm sm:text-base font-bold text-red-700 dark:text-red-400">Acceso Restringido</span>
                </div>
              )}
            </div>

            <div className="p-3.5 sm:p-4 flex flex-col justify-center">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-[0.18em]">Próximo Vencimiento</p>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400/80" />
                <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 font-mono">
                  {socio.nextQuotaDate}
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-normal hidden lg:inline">• Cuota Mensual Ordinaria</span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* CORE SERVICES (Harmonious, Ultra-Premium Minimalist 4-Card Grid)          */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Reserva de Canchas Deportivas */}
          <div 
            onClick={() => navigate('/member/reservations')}
            className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-b from-white via-[#f7fbf8] to-[#edf7f0] dark:from-[#102218]/95 dark:via-[#0b1711]/90 dark:to-[#050b07]/95 border border-emerald-600/30 hover:border-emerald-500 dark:border-amber-500/30 dark:hover:border-amber-400/80 shadow-[0_12px_30px_rgba(29,78,52,0.08)] hover:shadow-[0_20px_45px_rgba(29,78,52,0.16)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.7)] dark:hover:shadow-[0_20px_45px_rgba(245,158,11,0.2),0_0_25px_rgba(16,185,129,0.12)] cursor-pointer transition-all duration-300 hover:-translate-y-1.5 group flex flex-col justify-between space-y-4"
          >
            {/* Ambient Radial Flare */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 dark:bg-amber-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 dark:group-hover:bg-amber-400/20 transition-all pointer-events-none"></div>

            <div className="space-y-3.5 relative z-10">
              <div className="flex justify-between items-center">
                <div className="w-14 h-14 p-0.5 rounded-2xl bg-gradient-to-br from-emerald-500/40 via-amber-400/30 to-emerald-600/40 dark:from-amber-400/50 dark:via-yellow-500/20 dark:to-emerald-500/30 shadow-lg shadow-emerald-500/10 dark:shadow-amber-500/10 group-hover:scale-105 group-hover:rotate-1 transition-all duration-300">
                  <div className="w-full h-full rounded-[14px] bg-[#0c1912] flex items-center justify-center text-amber-300 group-hover:text-amber-200">
                    <CalendarCheck className="w-6 h-6" />
                  </div>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
                  <span>En Vivo</span>
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-800 dark:text-white dark:group-hover:text-amber-200 transition-colors serif-brand tracking-tight">
                  Reserva de Canchas
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300/85 mt-1.5 leading-relaxed">
                  Tenis, Pádel Panorámico, Frontón Oficial, Raquet, Wally y Fútbol de césped sintético.
                </p>
              </div>
            </div>

            {/* Tactile Premium Button Bar */}
            <div className="relative z-10 pt-2 border-t border-emerald-900/10 dark:border-white/[0.08]">
              <div className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-50 via-amber-50/50 to-emerald-50 hover:from-emerald-100 hover:to-amber-100 dark:from-amber-500/15 dark:via-yellow-500/10 dark:to-emerald-500/10 dark:group-hover:from-amber-500/25 dark:group-hover:to-emerald-500/20 border border-emerald-300/80 dark:border-amber-400/30 group-hover:border-emerald-500 dark:group-hover:border-amber-400/60 text-emerald-900 dark:text-amber-200 dark:group-hover:text-white flex items-center justify-between text-xs font-semibold tracking-wide shadow-sm dark:shadow-md transition-all duration-300">
                <span>Reservar Online</span>
                <div className="w-6 h-6 rounded-lg bg-emerald-700 group-hover:bg-emerald-800 dark:bg-amber-400/20 dark:group-hover:bg-amber-400 text-white dark:text-amber-300 dark:group-hover:text-black flex items-center justify-center transition-all duration-300 group-hover:translate-x-1 shadow-sm">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Estado de Cuenta & Pagos QR */}
          <div 
            onClick={() => navigate('/member/statement')}
            className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-b from-white via-[#f6fcf8] to-[#edf9f1] dark:from-[#0e2119]/95 dark:via-[#091711]/90 dark:to-[#040b07]/95 border border-emerald-600/30 hover:border-emerald-500 dark:border-emerald-500/30 dark:hover:border-emerald-400/80 shadow-[0_12px_30px_rgba(16,185,129,0.08)] hover:shadow-[0_20px_45px_rgba(16,185,129,0.16)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.7)] dark:hover:shadow-[0_20px_45px_rgba(16,185,129,0.2),0_0_25px_rgba(245,158,11,0.12)] cursor-pointer transition-all duration-300 hover:-translate-y-1.5 group flex flex-col justify-between space-y-4"
          >
            {/* Ambient Radial Flare */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-400/20 transition-all pointer-events-none"></div>

            <div className="space-y-3.5 relative z-10">
              <div className="flex justify-between items-center">
                <div className="w-14 h-14 p-0.5 rounded-2xl bg-gradient-to-br from-emerald-500/40 via-teal-500/30 to-amber-500/30 dark:from-emerald-400/50 dark:via-teal-500/20 dark:to-amber-500/30 shadow-lg shadow-emerald-500/10 group-hover:scale-105 group-hover:rotate-1 transition-all duration-300">
                  <div className="w-full h-full rounded-[14px] bg-[#091913] flex items-center justify-center text-emerald-300 group-hover:text-emerald-200">
                    <CreditCard className="w-6 h-6" />
                  </div>
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-[0.16em] px-2.5 py-1 rounded-full shadow-sm ${
                  dynamicDebt === 0
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                    : 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
                }`}>
                  {dynamicDebt === 0 ? 'Al Día' : `Mora Bs ${dynamicDebt.toFixed(2)}`}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-800 dark:text-white dark:group-hover:text-amber-200 transition-colors serif-brand tracking-tight">
                  Estado de Cuenta & Pagos
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300/85 mt-1.5 leading-relaxed">
                  Extracto de aportes, cuotas sociales, notas de débito y pago rápido mediante QR Simple bancario.
                </p>
              </div>
            </div>

            {/* Tactile Premium Button Bar */}
            <div className="relative z-10 pt-2 border-t border-emerald-900/10 dark:border-white/[0.08]">
              <div className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 hover:from-emerald-100 hover:to-teal-100 dark:from-emerald-500/15 dark:via-teal-500/10 dark:to-amber-500/10 dark:group-hover:from-emerald-500/25 dark:group-hover:to-amber-500/20 border border-emerald-300/80 dark:border-emerald-400/30 group-hover:border-emerald-500 dark:group-hover:border-emerald-400/60 text-emerald-900 dark:text-emerald-200 dark:group-hover:text-white flex items-center justify-between text-xs font-semibold tracking-wide shadow-sm dark:shadow-md transition-all duration-300">
                <span>Ver Extracto y Pagar</span>
                <div className="w-6 h-6 rounded-lg bg-emerald-700 group-hover:bg-emerald-800 dark:bg-emerald-400/20 dark:group-hover:bg-emerald-400 text-white dark:text-emerald-300 dark:group-hover:text-black flex items-center justify-center transition-all duration-300 group-hover:translate-x-1 shadow-sm">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Piscina, Saunas & Gimnasio */}
          <div 
            onClick={() => navigate('/member/occupancy')}
            className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-b from-white via-[#f5fbfd] to-[#eaf5f9] dark:from-[#0c1f26]/95 dark:via-[#08151c]/90 dark:to-[#040a0e]/95 border border-cyan-600/30 hover:border-cyan-500 dark:border-cyan-500/30 dark:hover:border-cyan-400/80 shadow-[0_12px_30px_rgba(6,182,212,0.08)] hover:shadow-[0_20px_45px_rgba(6,182,212,0.16)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.7)] dark:hover:shadow-[0_20px_45px_rgba(6,182,212,0.2),0_0_25px_rgba(59,130,246,0.12)] cursor-pointer transition-all duration-300 hover:-translate-y-1.5 group flex flex-col justify-between space-y-4"
          >
            {/* Ambient Radial Flare */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-400/20 transition-all pointer-events-none"></div>

            <div className="space-y-3.5 relative z-10">
              <div className="flex justify-between items-center">
                <div className="w-14 h-14 p-0.5 rounded-2xl bg-gradient-to-br from-cyan-500/40 via-sky-500/30 to-teal-500/30 dark:from-cyan-400/50 dark:via-sky-500/20 dark:to-teal-500/30 shadow-lg shadow-cyan-500/10 group-hover:scale-105 group-hover:rotate-1 transition-all duration-300">
                  <div className="w-full h-full rounded-[14px] bg-[#07181f] flex items-center justify-center text-cyan-300 group-hover:text-cyan-200">
                    <Waves className="w-6 h-6" />
                  </div>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-300 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30 shadow-sm">
                  Telemetría
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-cyan-800 dark:text-white dark:group-hover:text-amber-200 transition-colors serif-brand tracking-tight">
                  Aforo & Telemetría
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300/85 mt-1.5 leading-relaxed">
                  Temperaturas de piscinas 5 y 3 carriles, jacuzzi, saunas y aforo de deportistas en tiempo real.
                </p>
              </div>
            </div>

            {/* Tactile Premium Button Bar */}
            <div className="relative z-10 pt-2 border-t border-cyan-900/10 dark:border-white/[0.08]">
              <div className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-cyan-50 via-sky-50/50 to-cyan-50 hover:from-cyan-100 hover:to-sky-100 dark:from-cyan-500/15 dark:via-sky-500/10 dark:to-teal-500/10 dark:group-hover:from-cyan-500/25 dark:group-hover:to-teal-500/20 border border-cyan-300/80 dark:border-cyan-400/30 group-hover:border-cyan-500 dark:group-hover:border-cyan-400/60 text-cyan-900 dark:text-cyan-200 dark:group-hover:text-white flex items-center justify-between text-xs font-semibold tracking-wide shadow-sm dark:shadow-md transition-all duration-300">
                <span>Ver Aforo y Clima</span>
                <div className="w-6 h-6 rounded-lg bg-cyan-700 group-hover:bg-cyan-800 dark:bg-cyan-400/20 dark:group-hover:bg-cyan-400 text-white dark:text-cyan-300 dark:group-hover:text-black flex items-center justify-center transition-all duration-300 group-hover:translate-x-1 shadow-sm">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Formulario PQRS */}
          <div 
            onClick={() => navigate('/pqrs')}
            className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-b from-white via-[#f7f8fe] to-[#edf0fc] dark:from-[#121626]/95 dark:via-[#0b0e1a]/90 dark:to-[#05070f]/95 border border-indigo-600/30 hover:border-indigo-500 dark:border-indigo-500/30 dark:hover:border-amber-400/80 shadow-[0_12px_30px_rgba(99,102,241,0.08)] hover:shadow-[0_20px_45px_rgba(99,102,241,0.16)] dark:shadow-[0_15px_35px_rgba(0,0,0,0.7)] dark:hover:shadow-[0_20px_45px_rgba(99,102,241,0.2),0_0_25px_rgba(245,158,11,0.12)] cursor-pointer transition-all duration-300 hover:-translate-y-1.5 group flex flex-col justify-between space-y-4"
          >
            {/* Ambient Radial Flare */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-amber-400/20 transition-all pointer-events-none"></div>

            <div className="space-y-3.5 relative z-10">
              <div className="flex justify-between items-center">
                <div className="w-14 h-14 p-0.5 rounded-2xl bg-gradient-to-br from-indigo-500/40 via-blue-500/30 to-amber-500/30 dark:from-indigo-400/50 dark:via-blue-500/20 dark:to-amber-500/30 shadow-lg shadow-indigo-500/10 group-hover:scale-105 group-hover:rotate-1 transition-all duration-300">
                  <div className="w-full h-full rounded-[14px] bg-[#0c1021] flex items-center justify-center text-indigo-300 group-hover:text-amber-200">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30 shadow-sm">
                  Oficial
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-800 dark:text-white dark:group-hover:text-amber-200 transition-colors serif-brand tracking-tight">
                  Formulario PQRS
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300/85 mt-1.5 leading-relaxed">
                  Peticiones, quejas, reclamos y sugerencias directamente con la administración del club.
                </p>
              </div>
            </div>

            {/* Tactile Premium Button Bar */}
            <div className="relative z-10 pt-2 border-t border-indigo-900/10 dark:border-white/[0.08]">
              <div className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-indigo-50 via-blue-50/50 to-indigo-50 hover:from-indigo-100 hover:to-blue-100 dark:from-indigo-500/15 dark:via-blue-500/10 dark:to-amber-500/10 dark:group-hover:from-indigo-500/25 dark:group-hover:to-amber-500/20 border border-indigo-300/80 dark:border-indigo-400/30 group-hover:border-indigo-500 dark:group-hover:border-amber-400/60 text-indigo-900 dark:text-indigo-200 dark:group-hover:text-white flex items-center justify-between text-xs font-semibold tracking-wide shadow-sm dark:shadow-md transition-all duration-300">
                <span>Llenar Formulario</span>
                <div className="w-6 h-6 rounded-lg bg-indigo-700 group-hover:bg-indigo-800 dark:bg-indigo-400/20 dark:group-hover:bg-amber-400 text-white dark:text-indigo-300 dark:group-hover:text-black flex items-center justify-center transition-all duration-300 group-hover:translate-x-1 shadow-sm">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
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
      {/* MODAL 5: PAGO QR & COMPROBANTES                                           */}
      {/* ========================================================================= */}
      <MemberQrPaymentModal
        isOpen={showQrPayModal}
        onClose={() => setShowQrPayModal(false)}
        statement={statement}
        onVoucherSubmitted={() => {
          loadStatement();
          dispatch(fetchCurrentProfile());
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL: INICIATIVA CERO PAPEL • CLUB INTELIGENTE (SOCIO ECO-IMPACT)        */}
      {/* ========================================================================= */}
      <MemberEcoImpactModal
        isOpen={showEcoModal}
        onClose={() => setShowEcoModal(false)}
        socio={socio}
      />

    </div>
  );
};
