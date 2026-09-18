import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@store/store';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  MessageSquare,
  Users,
  Settings,
  LogOut,
  CalendarDays,
  Activity,
  Waves,
  Dumbbell,
  CalendarCheck,
  Send,
  Sparkles,
  FileText,
  Leaf,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Lock,
  Compass,
  Crown,
  Key,
  Shield,
  Vote,
} from 'lucide-react';
import CrestLogo from '@shared/components/CrestLogo';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import { logout } from '@store/authSlice';
import { fetchRouteSheets } from '@store/correspondenceSlice';
import toast from 'react-hot-toast';

export const MainPortal: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const correspondenceItems = useSelector((state: RootState) => state.correspondence?.items || []);
  const dispatch = useDispatch<AppDispatch>();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!user) return null;

  const isSuperAdmin = user.roles.includes('SUPER_ADMIN');
  const isAdmin = user.roles.includes('ADMIN') || isSuperAdmin;
  const isStaff = user.roles.includes('STAFF') || isSuperAdmin;
  const isMember = user.roles.includes('USER');

  // Specific Module Access Flags
  const canAccessUsers = isSuperAdmin || isAdmin;
  const canAccessCorrespondence = isAdmin || user.roles.includes('MODULO_CORRESPONDENCIA');
  const canAccessCommercial = isAdmin || user.roles.includes('MODULO_COMERCIAL');
  const canAccessMembers = isAdmin || user.roles.includes('MODULO_SOCIOS');
  const canAccessAccessControl = isAdmin || user.roles.includes('MODULO_CONTROL_ACCESO');
  const isWhatsappUser = user.roles.includes('MODULO_WHATSAPP') || isAdmin || isSuperAdmin;
  const isPqrsUser = user.roles.includes('MODULO_PQRS') || user.roles.includes('MODULO_USUARIO_PQRS') || isAdmin;
  const canAccessCourtsAdmin = isAdmin || user.roles.includes('MODULO_CANCHAS');

  useEffect(() => {
    if (canAccessCorrespondence && correspondenceItems.length === 0) {
      dispatch(fetchRouteSheets());
    }
  }, [canAccessCorrespondence, dispatch, correspondenceItems.length]);

  // Cálculo de trámites pendientes de recepción (que llegan o que salen hasta ser recepcionados)
  const pendingCorrespondenceCount = React.useMemo(() => {
    if (!canAccessCorrespondence || !correspondenceItems.length) return 0;
    const userArea = (user as any)?.area || (user as any)?.department;
    const uId = user.id || (user as any).userId;
    const userFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();

    return correspondenceItems.filter((i) => {
      if (i.status === 'CONCLUIDO' || i.status === 'ANULADO') return false;
      const latestMov = i.movements && i.movements.length > 0 ? i.movements[i.movements.length - 1] : null;

      // 1. Que llegan hasta ser recepcionados (en custodia de mi área o dirigidos a mí y pendientes de recepción)
      const isIncoming = Boolean(
        (userArea && i.currentArea && i.currentArea.toLowerCase() === userArea.toLowerCase()) ||
        (latestMov?.targetPersonName && userFullName && latestMov.targetPersonName.toLowerCase().includes(userFullName)) ||
        (latestMov?.targetArea && userArea && latestMov.targetArea.toLowerCase() === userArea.toLowerCase())
      );

      if (isIncoming && (i.status === 'DERIVADO' || Boolean(latestMov && !latestMov.receivedAt))) {
        return true;
      }

      // 2. Que salen hasta ser recepcionados (derivados por mí o mi área pendientes de recepción en destino)
      const isOutgoing = Boolean(
        (uId && latestMov?.sourceUserId === uId) ||
        (userArea && latestMov?.sourceArea && latestMov.sourceArea.toLowerCase() === userArea.toLowerCase())
      );

      if (isOutgoing && latestMov && !latestMov.receivedAt && i.status === 'DERIVADO') {
        return true;
      }

      return false;
    }).length;
  }, [correspondenceItems, canAccessCorrespondence, user]);

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Sesión finalizada correctamente');
  };

  // Format date in Spanish
  const formattedDate = currentTime.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020704] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300 relative overflow-x-hidden selection:bg-brand-gold selection:text-black">
      
      {/* Background Subtle Ambient Lights */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[650px] h-[650px] bg-brand-gold/15 dark:bg-brand-gold/[0.08] rounded-full blur-[140px]" />
        <div className="absolute top-1/4 -right-40 w-[700px] h-[700px] bg-emerald-500/15 dark:bg-emerald-500/[0.08] rounded-full blur-[160px]" />
        <div className="absolute -bottom-40 left-1/4 w-[600px] h-[600px] bg-teal-500/10 dark:bg-teal-500/[0.06] rounded-full blur-[150px]" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-[1720px] mx-auto px-6 sm:px-10 py-5 flex items-center justify-between border-b border-slate-200/80 dark:border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <CrestLogo size="md" className="w-12 h-14 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-widest uppercase text-amber-800 dark:text-brand-gold">
                Club Hípico Los Sargentos
              </span>
            </div>
            <div className="flex items-center gap-2.5 mt-0.5">
              <h1 className="text-base sm:text-lg font-black tracking-wider uppercase text-[#0B1320] dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-amber-100 dark:via-brand-gold dark:to-yellow-400 drop-shadow-xs">
                CLUB INTELIGENTE
              </h1>
              <span className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/40 shadow-xs">
                Enterprise Suite 360°
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-gray-400 font-medium">
              Portal Unificado de Gestión Institucional
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Live Clock Pill */}
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-gray-300 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-brand-gold animate-pulse" />
            <span className="capitalize">{formattedDate}</span>
            <span className="text-amber-800 dark:text-brand-gold font-bold">| {formattedTime}</span>
          </div>

          <ThemeToggle />

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-black tracking-wide transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="relative z-10 flex-1 w-full max-w-[1720px] mx-auto px-6 sm:px-10 py-4 lg:py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        
        {/* ========================================================= */}
        {/* LEFT SIDE: TOTAL LUXURY GOLD PROFILE CARD (4 Cols) */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Main User Greeting Card - 100% DORADA TOTAL */}
          <div className="relative group overflow-hidden rounded-[2rem] p-6 sm:p-7 transition-all duration-500 bg-gradient-to-b from-[#241a06] via-[#161004] to-[#0a0702] border-2 border-brand-gold shadow-[0_0_60px_rgba(212,175,55,0.35)] hover:shadow-[0_0_80px_rgba(212,175,55,0.5)]">
            
            {/* Ambient Golden Radial Flare inside card */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-gold/30 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Top Badge of Rank & Crown */}
            <div className="flex items-center justify-between gap-2 mb-5">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-brand-gold via-yellow-400 to-amber-500 text-black font-black text-[10px] uppercase tracking-wider shadow-lg shadow-brand-gold/35">
                <Crown className="w-3.5 h-3.5 fill-black" />
                <span>
                  {isSuperAdmin ? 'SUPER ADMIN • ACCESO MAESTRO'
                    : isAdmin ? 'ADMINISTRADOR GENERAL'
                    : user.roles.includes('MODULO_CORRESPONDENCIA') ? 'SECRETARÍA DE GERENCIA'
                    : user.roles.includes('MODULO_COMERCIAL') ? 'GERENCIA COMERCIAL'
                    : user.roles.includes('MODULO_SOCIOS') ? 'ADMINISTRACIÓN & CAJA'
                    : isStaff ? 'FUNCIONARIO STAFF'
                    : 'SOCIO TITULAR'}
                </span>
              </div>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-gold"></span>
              </span>
            </div>

            {/* User Avatar + Name Section */}
            <div className="flex items-center gap-4 mb-5">
              {/* Luxury Gold Avatar Box */}
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-gold via-yellow-400 to-amber-600 text-black font-black text-2xl flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.7)] border-2 border-white/50">
                  {user.firstName 
                    ? `${user.firstName.charAt(0)}${user.lastName ? user.lastName.charAt(0) : ''}`.toUpperCase()
                    : user.email.substring(0, 2).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-black p-1 rounded-full border border-brand-gold shadow-md">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-gold" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold/90 block mb-0.5">
                  USUARIO AUTORIZADO
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate drop-shadow-sm">
                  {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email.split('@')[0]}
                </h1>
                <span className="text-xs text-brand-gold font-mono block truncate">
                  {user.email}
                </span>
              </div>
            </div>

            <p className="text-xs text-amber-100/90 leading-relaxed mb-5 border-b border-brand-gold/30 pb-4">
              Bienvenido al sistema institucional. Selecciona el módulo al que deseas acceder en el panel de la derecha.
            </p>

            {/* Session Details Box - Gold Beveled */}
            <div className="bg-black/60 backdrop-blur-md rounded-2xl p-4 border border-brand-gold/40 space-y-2.5 text-xs shadow-inner">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Estado de Conexión:</span>
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Activa & Conectada
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Seguridad de Acceso:</span>
                <span className="font-bold text-brand-gold flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-brand-gold" />
                  Cifrado Institucional TLS
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Gestión Activa:</span>
                <span className="font-mono font-black text-brand-gold bg-brand-gold/15 px-2 py-0.5 rounded-lg border border-brand-gold/40">
                  AÑO 2026
                </span>
              </div>
            </div>

            {/* Bottom Seal */}
            <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-brand-gold tracking-wider uppercase">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-gold" />
              <span>Credencial Institucional Verificada</span>
            </div>

          </div>

          {/* Quick Help & Protocols Badge - Gold Theme */}
          <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-gradient-to-r dark:from-brand-gold/15 dark:via-amber-500/10 dark:to-transparent border border-amber-300 dark:border-brand-gold/40 text-xs text-slate-700 dark:text-amber-200/90 flex items-center gap-3 shadow-xs">
            <div className="p-2 rounded-xl bg-amber-200 dark:bg-brand-gold/20 text-amber-800 dark:text-brand-gold shrink-0 border border-amber-300 dark:border-brand-gold/40">
              <Compass className="w-4 h-4" />
            </div>
            <p className="text-[11px] leading-relaxed">
              <strong className="text-amber-900 dark:text-brand-gold font-bold">Trazabilidad Total:</strong> Las operaciones y firmas digitales se registran con auditoría institucional 360°.
            </p>
          </div>

        </div>

        {/* ========================================================= */}
        {/* RIGHT SIDE: 2-COLUMN MODULES GRID (ALL EMERALD GREEN) */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 space-y-4">
          
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
                <span>Módulos del Sistema</span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/40 shadow-xs">
                  ACCESO DIRECTO
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Selecciona una aplicación para iniciar operaciones
              </p>
            </div>
          </div>

          {/* 2-COLUMN GRID OF SPACIOUS HORIZONTAL MODULES (ALL EMERALD GREEN) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">

            {/* 1. GESTIÓN DE USUARIOS */}
            {canAccessUsers && (
              <Link 
                to="/superadmin"
                className="group relative flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-950/45 via-[#06150d] to-[#040f09] dark:bg-[#06140c] border border-emerald-500/40 hover:border-emerald-400 rounded-2xl transition-all duration-300 shadow-md shadow-emerald-950/20 hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] hover:-translate-y-1 overflow-hidden"
              >
                <div className="w-13 h-13 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 group-hover:bg-emerald-400 group-hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                  <Users className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                      1. Gestión de Usuarios
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shrink-0">
                      TI & SEGURIDAD
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 line-clamp-1">
                    Administración de personal, permisos y roles.
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform shrink-0" />
              </Link>
            )}

            {/* 2. CORRESPONDENCIA & HOJAS DE RUTA */}
            {canAccessCorrespondence && (
              <Link 
                to="/admin/correspondencia"
                className="group relative flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-950/45 via-[#06150d] to-[#040f09] dark:bg-[#06140c] border border-emerald-500/40 hover:border-emerald-400 rounded-2xl transition-all duration-300 shadow-md shadow-emerald-950/20 hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] hover:-translate-y-1 overflow-hidden"
              >
                {/* Globo de WhatsApp en Rojo para trámites que llegan o salen hasta ser recepcionados */}
                {pendingCorrespondenceCount > 0 && (
                  <div
                    className="absolute top-2.5 right-2.5 z-30 min-w-[24px] h-[24px] px-1.5 rounded-full bg-red-600 text-white font-mono font-black text-xs flex items-center justify-center shadow-[0_0_14px_rgba(239,68,68,0.95)] ring-2 ring-white dark:ring-[#040f09] animate-pulse"
                    title={`${pendingCorrespondenceCount} hojas de ruta que llegan o salen pendientes de recepción`}
                  >
                    {pendingCorrespondenceCount}
                  </div>
                )}
                <div className="w-13 h-13 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 group-hover:bg-emerald-400 group-hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                      2. Correspondencia & HR
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 flex items-center gap-1 shrink-0">
                      <Leaf className="w-2.5 h-2.5" />
                      CERO PAPEL
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 line-clamp-1">
                    {pendingCorrespondenceCount > 0 ? (
                      <span className="text-red-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        {pendingCorrespondenceCount} trámite(s) por recepcionar
                      </span>
                    ) : (
                      'Hojas de Ruta digitales, proveídos y libro oficial.'
                    )}
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform shrink-0" />
              </Link>
            )}

            {/* 3. MÓDULO COMERCIAL */}
            {canAccessCommercial && (
              <Link 
                to="/admin/comercial"
                className="group relative flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-950/45 via-[#06150d] to-[#040f09] dark:bg-[#06140c] border border-emerald-500/40 hover:border-emerald-400 rounded-2xl transition-all duration-300 shadow-md shadow-emerald-950/20 hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] hover:-translate-y-1 overflow-hidden"
              >
                <div className="w-13 h-13 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 group-hover:bg-emerald-400 group-hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                      3. Módulo Comercial
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shrink-0">
                      NUEVOS SOCIOS
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 line-clamp-1">
                    Revista 3D, Videos HD, Pases VIP con QR y CRM.
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform shrink-0" />
              </Link>
            )}

            {/* 4. GESTIÓN DE SOCIOS & COBRANZAS */}
            {canAccessMembers && (
              <Link 
                to="/admin/members"
                className="group relative flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-950/45 via-[#06150d] to-[#040f09] dark:bg-[#06140c] border border-emerald-500/40 hover:border-emerald-400 rounded-2xl transition-all duration-300 shadow-md shadow-emerald-950/20 hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] hover:-translate-y-1 overflow-hidden"
              >
                <div className="w-13 h-13 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 group-hover:bg-emerald-400 group-hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                  <Users className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                      4. Socios & Cobranzas
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shrink-0">
                      ADMIN & CAJA
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 line-clamp-1">
                    Directorio 360°, Caja Unificada y Ventas CDP.
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform shrink-0" />
              </Link>
            )}

            {/* 5. CONTROL DE ACCESO */}
            {canAccessAccessControl && (
              <Link 
                to="/access-selection"
                className="group relative flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-950/45 via-[#06150d] to-[#040f09] dark:bg-[#06140c] border border-emerald-500/40 hover:border-emerald-400 rounded-2xl transition-all duration-300 shadow-md shadow-emerald-950/20 hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] hover:-translate-y-1 overflow-hidden"
              >
                <div className="w-13 h-13 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 group-hover:bg-emerald-400 group-hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                      5. Control de Acceso
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shrink-0">
                      PUERTA & CONTROL
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 line-clamp-1">
                    Caseta Principal, Piscina y Gym con escaneo QR.
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform shrink-0" />
              </Link>
            )}

            {/* 6. CALL CENTER & WHATSAPP 24/7 */}
            {isWhatsappUser && (
              <Link 
                to="/admin/whatsapp"
                className="group relative flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-950/45 via-[#06150d] to-[#040f09] dark:bg-[#06140c] border border-emerald-500/40 hover:border-emerald-400 rounded-2xl transition-all duration-300 shadow-md shadow-emerald-950/20 hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] hover:-translate-y-1 overflow-hidden"
              >
                <div className="w-13 h-13 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 group-hover:bg-emerald-400 group-hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                      6. Call Center & WhatsApp
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shrink-0">
                      BOT 24/7
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 line-clamp-1">
                    Bandeja en vivo y bot automatizado 24/7.
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform shrink-0" />
              </Link>
            )}

            {/* 7. ENVÍOS MASIVOS & COMUNICADOS */}
            {isWhatsappUser && (
              <Link 
                to="/admin/whatsapp-masivo"
                className="group relative flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-950/45 via-[#06150d] to-[#040f09] dark:bg-[#06140c] border border-emerald-500/40 hover:border-emerald-400 rounded-2xl transition-all duration-300 shadow-md shadow-emerald-950/20 hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] hover:-translate-y-1 overflow-hidden"
              >
                <div className="w-13 h-13 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 group-hover:bg-emerald-400 group-hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                  <Send className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                      7. Envíos Masivos
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shrink-0">
                      DIFUSIÓN
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 line-clamp-1">
                    Difusión masiva de avisos y estados de cuenta.
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform shrink-0" />
              </Link>
            )}

            {/* 8. MÓDULO PQRS */}
            {isPqrsUser && (
              <Link 
                to="/admin/pqrs"
                className="group relative flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-950/45 via-[#06150d] to-[#040f09] dark:bg-[#06140c] border border-emerald-500/40 hover:border-emerald-400 rounded-2xl transition-all duration-300 shadow-md shadow-emerald-950/20 hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] hover:-translate-y-1 overflow-hidden"
              >
                <div className="w-13 h-13 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 group-hover:bg-emerald-400 group-hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                      8. Módulo PQRS
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shrink-0">
                      ATENCIÓN
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 line-clamp-1">
                    Peticiones, quejas y reclamos con SLA y control.
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform shrink-0" />
              </Link>
            )}

            {/* 9. GESTIÓN DE CANCHAS */}
            {canAccessCourtsAdmin && (
              <Link 
                to="/admin/reservations"
                className="group relative flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-950/45 via-[#06150d] to-[#040f09] dark:bg-[#06140c] border border-emerald-500/40 hover:border-emerald-400 rounded-2xl transition-all duration-300 shadow-md shadow-emerald-950/20 hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] hover:-translate-y-1 overflow-hidden"
              >
                <div className="w-13 h-13 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 group-hover:bg-emerald-400 group-hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                      9. Gestión de Canchas
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shrink-0">
                      DEPORTES
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 line-clamp-1">
                    Administración deportiva, canchas y torneos.
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform shrink-0" />
              </Link>
            )}

            {/* 10. RESERVA DE CANCHAS (SOCIO) */}
            <Link 
              to="/member/reservations"
              className="group relative flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-950/45 via-[#06150d] to-[#040f09] dark:bg-[#06140c] border border-emerald-500/40 hover:border-emerald-400 rounded-2xl transition-all duration-300 shadow-md shadow-emerald-950/20 hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] hover:-translate-y-1 overflow-hidden"
            >
              <div className="w-13 h-13 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 group-hover:bg-emerald-400 group-hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                    10. Reserva Canchas
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    En Vivo
                  </span>
                </div>
                <p className="text-xs text-gray-300 line-clamp-1">
                  Reserva en vivo (Tenis, Pádel, Frontón, Fútbol).
                </p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform shrink-0" />
            </Link>

            {/* 11. SEMÁFORO: PISCINA Y GIMNASIO */}
            <Link 
              to="/member/occupancy"
              className="group relative flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-950/45 via-[#06150d] to-[#040f09] dark:bg-[#06140c] border border-emerald-500/40 hover:border-emerald-400 rounded-2xl transition-all duration-300 shadow-md shadow-emerald-950/20 hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] hover:-translate-y-1 overflow-hidden"
            >
              <div className="w-13 h-13 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center gap-1 text-emerald-400 shrink-0 group-hover:scale-110 group-hover:bg-emerald-400 group-hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                <Waves className="w-4 h-4" />
                <Dumbbell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                    11. Semáforo Piscina/Gym
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    En Vivo
                  </span>
                </div>
                <p className="text-xs text-gray-300 line-clamp-1">
                  Aforo en tiempo real y temperaturas antes de asistir.
                </p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform shrink-0" />
            </Link>

            {/* 12. PORTAL DEL SOCIO */}
            <Link 
              to="/member"
              className="group relative flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-950/45 via-[#06150d] to-[#040f09] dark:bg-[#06140c] border border-emerald-500/40 hover:border-emerald-400 rounded-2xl transition-all duration-300 shadow-md shadow-emerald-950/20 hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] hover:-translate-y-1 overflow-hidden"
            >
              <div className="w-13 h-13 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 group-hover:bg-emerald-400 group-hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                <Settings className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                    12. Portal del Socio
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shrink-0">
                    AUTOGESTIÓN
                  </span>
                </div>
                <p className="text-xs text-gray-300 line-clamp-1">
                  Membresía, credencial digital QR y estados de cuenta.
                </p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform shrink-0" />
            </Link>

            {/* 13. ELECCIONES DE DIRECTORIO */}
            <Link 
              to="/elecciones"
              className="group relative flex items-center gap-4 p-4 bg-gradient-to-r from-[#142615] via-[#091a10] to-[#040f09] dark:bg-[#06140c] border-2 border-brand-gold/60 hover:border-brand-gold rounded-2xl transition-all duration-300 shadow-md shadow-brand-gold/10 hover:shadow-[0_0_35px_rgba(212,175,55,0.35)] hover:-translate-y-1 overflow-hidden"
            >
              <div className="w-13 h-13 rounded-2xl bg-brand-gold/20 border-2 border-brand-gold/60 flex items-center justify-center text-brand-gold shrink-0 group-hover:scale-110 group-hover:bg-brand-gold group-hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                <Vote className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-black text-white group-hover:text-brand-gold transition-colors truncate">
                    13. Elecciones de Directorio
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-gold/20 text-amber-300 border border-brand-gold/50 flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    ESCRUTINIO EN VIVO
                  </span>
                </div>
                <p className="text-xs text-gray-300 line-clamp-1">
                  Cargado de boletas de ánfora y proyección 3D / TV HD.
                </p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-brand-gold group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform shrink-0" />
            </Link>

          </div>

        </div>

      </main>
    </div>
  );
};

export default MainPortal;
