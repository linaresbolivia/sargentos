import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  CreditCard, 
  DollarSign, 
  FileText, 
  Award, 
  Settings, 
  BarChart3, 
  BarChart2,
  ShieldCheck, 
  UserPlus, 
  Activity, 
  ArrowLeft,
  ChevronRight,
  Download,
  Filter
} from 'lucide-react';
import CrestLogo from '@shared/components/CrestLogo';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import { MemberDirectoryView } from '../components/MemberDirectoryView';
import { MemberRegistrationModal } from '../components/MemberRegistrationModal';
import { MemberProfileDrawer } from '../components/MemberProfileDrawer';
import { MembershipSalesAuditView } from '../components/MembershipSalesAuditView';
import { CashierUnifiedPaymentView } from '../components/CashierUnifiedPaymentView';
import { AssemblyProtocolView } from '../components/AssemblyProtocolView';
import { PredictiveAlertsView } from '../components/PredictiveAlertsView';
import { FinancialReportsView } from '../components/FinancialReportsView';
import { FinancialSettingsView } from '../components/FinancialSettingsView';
import { MemberAnalyticsView } from '../components/MemberAnalyticsView';
import { MemberReportsGeneratorView } from '../components/MemberReportsGeneratorView';
import { VenueRentalsView } from '../components/VenueRentalsView';
import { SportsSchoolsView } from '../components/SportsSchoolsView';
import { ScheduledBillingGeneratorView } from '../components/ScheduledBillingGeneratorView';
import { SalesCommissionsView } from '../components/SalesCommissionsView';
import { MemberNotificationsRegistryView } from '../components/MemberNotificationsRegistryView';
import { GateAttendanceConsoleView } from '../components/GateAttendanceConsoleView';
import { Building, GraduationCap, Layers, Send, UserCheck, Percent } from 'lucide-react';

export const MemberAdminHub: React.FC = () => {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<
    | 'DIRECTORIO' 
    | 'VENTAS_CDP' 
    | 'CAJA' 
    | 'FACTURACION_MASIVA'
    | 'GARITA_ASISTENCIAS'
    | 'ALQUILERES' 
    | 'ESCUELAS' 
    | 'COMISIONES'
    | 'NOTIFICACIONES_ENVIOS'
    | 'ASAMBLEAS' 
    | 'ALERTAS' 
    | 'REPORTES' 
    | 'PARAMETROS' 
    | 'ANALYTICS' 
    | 'GENERADOR_REPORTES'
  >('DIRECTORIO');

  // Modals / Drawers state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [cashierTargetPersonId, setCashierTargetPersonId] = useState<string | null>(null);

  const handleOpenCashier = (personId: string) => {
    setSelectedPersonId(null);
    setCashierTargetPersonId(personId);
    setActiveTab('CAJA');
  };

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden font-sans pb-16">
      
      {/* Background Atmosphere */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-gold/30 via-transparent to-transparent dark:via-forest dark:to-forest"></div>

      {/* Top Header with PQRS-style Indicadores and Export Buttons */}
      <header className="relative z-10 w-full p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 dark:border-brand-gold/10 backdrop-blur-md sticky top-0 bg-white/90 dark:bg-[#0a100d]/90 shadow-sm transition-colors">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Volver al Portal Principal"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <CrestLogo size="sm" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white serif-brand tracking-tight">
                Gestión de Socios & Cobranzas
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/15 dark:bg-brand-gold/20 text-amber-700 dark:text-brand-gold border border-amber-300 dark:border-brand-gold/40">
                PROYECTO MODERNIZADO
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Club Hípico Los Sargentos • Reemplazo Integral Sistema Novus</p>
          </div>
        </div>

        {/* Action Header Buttons matching PQRS style */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Button 1: Indicadores Gráficos (Green) */}
          <button 
            onClick={() => setActiveTab(activeTab === 'ANALYTICS' ? 'DIRECTORIO' : 'ANALYTICS')}
            className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all hover:scale-105 ${
              activeTab === 'ANALYTICS'
                ? 'bg-emerald-600 text-white shadow-emerald-500/40 ring-2 ring-emerald-400'
                : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/20'
            }`}
          >
            <BarChart2 className="w-4 h-4" /> INDICADORES GRÁFICOS
          </button>

          {/* Button 2: Filtrar y Exportar (Purple) */}
          <button 
            onClick={() => setActiveTab(activeTab === 'GENERADOR_REPORTES' ? 'DIRECTORIO' : 'GENERADOR_REPORTES')}
            className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all hover:scale-105 ${
              activeTab === 'GENERADOR_REPORTES'
                ? 'bg-purple-700 text-white shadow-purple-500/40 ring-2 ring-purple-400'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-500/20'
            }`}
          >
            <FileText className="w-4 h-4" /> FILTRAR Y EXPORTAR
          </button>

          <button 
            onClick={() => setShowRegisterModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-600 text-black font-extrabold text-xs flex items-center gap-1.5 hover:scale-105 shadow-md shadow-brand-gold/20 transition-all"
          >
            <UserPlus className="w-4 h-4" /> Alta de Socio
          </button>

          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Navigation Tabs Bar (Visible when not in dedicated full-page analytics / generator view) */}
        {activeTab !== 'ANALYTICS' && activeTab !== 'GENERADOR_REPORTES' && (
          <div className="glass-panel p-2 flex items-center gap-2 overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-[#0d1311]/80 shadow-sm">
            <button
              onClick={() => setActiveTab('DIRECTORIO')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'DIRECTORIO' ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/20' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'}`}
            >
              <Users className="w-4 h-4" /> Directorio & Alta 360°
            </button>

            <button
              onClick={() => setActiveTab('VENTAS_CDP')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'VENTAS_CDP' ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/20' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'}`}
            >
              <FileText className="w-4 h-4" /> Adquisición & Auditoría CDP (60/40)
            </button>

            <button
              onClick={() => setActiveTab('CAJA')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'CAJA' ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/20' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'}`}
            >
              <DollarSign className="w-4 h-4" /> Caja & Facturación
            </button>

            <button
              onClick={() => setActiveTab('FACTURACION_MASIVA')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'FACTURACION_MASIVA' ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/20' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'}`}
            >
              <Layers className="w-4 h-4" /> Cobros Programados
            </button>

            <button
              onClick={() => setActiveTab('GARITA_ASISTENCIAS')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'GARITA_ASISTENCIAS' ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/20' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'}`}
            >
              <UserCheck className="w-4 h-4" /> Control de Entrada & Asistencias
            </button>

            <button
              onClick={() => setActiveTab('ALQUILERES')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'ALQUILERES' ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/20' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'}`}
            >
              <Building className="w-4 h-4" /> Salones / Picadero
            </button>

            <button
              onClick={() => setActiveTab('ESCUELAS')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'ESCUELAS' ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/20' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'}`}
            >
              <GraduationCap className="w-4 h-4" /> Escuelas Deportivas
            </button>

            <button
              onClick={() => setActiveTab('COMISIONES')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'COMISIONES' ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/20' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'}`}
            >
              <Percent className="w-4 h-4" /> Comisiones
            </button>

            <button
              onClick={() => setActiveTab('NOTIFICACIONES_ENVIOS')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'NOTIFICACIONES_ENVIOS' ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/20' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'}`}
            >
              <Send className="w-4 h-4" /> Envíos Estatutarios
            </button>

            <button
              onClick={() => setActiveTab('ASAMBLEAS')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'ASAMBLEAS' ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/20' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'}`}
            >
              <ShieldCheck className="w-4 h-4" /> Asambleas & Quórum
            </button>

            <button
              onClick={() => setActiveTab('ALERTAS')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'ALERTAS' ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/20' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'}`}
            >
              <Award className="w-4 h-4" /> Alertas Predictivas
            </button>

            <button
              onClick={() => setActiveTab('REPORTES')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'REPORTES' ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/20' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'}`}
            >
              <BarChart3 className="w-4 h-4" /> Cartera Especial
            </button>

            <button
              onClick={() => setActiveTab('PARAMETROS')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'PARAMETROS' ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/20' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'}`}
            >
              <Settings className="w-4 h-4" /> Parametrización
            </button>
          </div>
        )}

        {/* Dedicated Views */}
        {activeTab === 'ANALYTICS' && (
          <MemberAnalyticsView onBack={() => setActiveTab('DIRECTORIO')} />
        )}

        {activeTab === 'GENERADOR_REPORTES' && (
          <MemberReportsGeneratorView onBack={() => setActiveTab('DIRECTORIO')} />
        )}

        {/* Regular Tabs View Render */}
        {activeTab === 'DIRECTORIO' && (
          <MemberDirectoryView 
            onOpenRegister={() => setShowRegisterModal(true)}
            onSelectMember={(id) => setSelectedPersonId(id)}
            onOpenCashier={handleOpenCashier}
          />
        )}

        {activeTab === 'VENTAS_CDP' && (
          <MembershipSalesAuditView />
        )}

        {activeTab === 'CAJA' && (
          <CashierUnifiedPaymentView initialPersonId={cashierTargetPersonId} />
        )}

        {activeTab === 'FACTURACION_MASIVA' && (
          <ScheduledBillingGeneratorView onOpenCashier={handleOpenCashier} />
        )}

        {activeTab === 'GARITA_ASISTENCIAS' && (
          <GateAttendanceConsoleView />
        )}

        {activeTab === 'ALQUILERES' && (
          <VenueRentalsView onOpenCashier={handleOpenCashier} />
        )}

        {activeTab === 'ESCUELAS' && (
          <SportsSchoolsView onOpenCashier={handleOpenCashier} />
        )}

        {activeTab === 'COMISIONES' && (
          <SalesCommissionsView />
        )}

        {activeTab === 'NOTIFICACIONES_ENVIOS' && (
          <MemberNotificationsRegistryView />
        )}

        {activeTab === 'ASAMBLEAS' && (
          <AssemblyProtocolView />
        )}

        {activeTab === 'ALERTAS' && (
          <PredictiveAlertsView />
        )}

        {activeTab === 'REPORTES' && (
          <FinancialReportsView />
        )}

        {activeTab === 'PARAMETROS' && (
          <FinancialSettingsView />
        )}

      </main>

      {/* DRAWERS & MODALS */}
      <MemberProfileDrawer 
        personId={selectedPersonId}
        isOpen={!!selectedPersonId}
        onClose={() => setSelectedPersonId(null)}
        onOpenCashier={handleOpenCashier}
      />

      <MemberRegistrationModal 
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onOpenCashier={handleOpenCashier}
        onSuccess={() => {
          setShowRegisterModal(false);
          setActiveTab('DIRECTORIO');
        }}
      />

    </div>
  );
};
