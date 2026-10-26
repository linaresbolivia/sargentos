import React, { useState } from 'react';
import CrestLogo from '@shared/components/CrestLogo';
import { BackButton } from '@shared/components/BackButton';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import { AccountStatementsView } from '../components/AccountStatementsView';
import { PaymentQrAdminView } from '../components/PaymentQrAdminView';
import { FileText, QrCode } from 'lucide-react';

export const AccountStatementsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CARTERA' | 'CONFIG_QR'>('CARTERA');

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden font-sans pb-16">
      
      {/* Background Atmosphere */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-gold/30 via-transparent to-transparent dark:via-forest dark:to-forest"></div>

      {/* Header */}
      <header className="relative z-10 w-full p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 dark:border-brand-gold/10 backdrop-blur-md sticky top-0 bg-white/90 dark:bg-[#0a100d]/90 shadow-sm transition-colors">
        <div className="flex items-center gap-4">
          <BackButton to="/admin/members" title="Volver a Gestión de Socios" />
          <CrestLogo size="sm" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white serif-brand tracking-tight">
                Estados de Cuenta & Cartera de Socios
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/15 dark:bg-brand-gold/20 text-amber-700 dark:text-brand-gold border border-amber-300 dark:border-brand-gold/40">
                ENLACE GARITA & QR ACTIVO
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Club Hípico Los Sargentos • Sincronización Cartera Especial & Pagos QR Bancarios
            </p>
          </div>
        </div>

        {/* Tab Switcher & Theme */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-black/50 p-1 rounded-2xl border border-gray-200 dark:border-white/10">
            <button
              onClick={() => setActiveTab('CARTERA')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'CARTERA'
                  ? 'bg-brand-gold text-black shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" /> Cartera de Socios
            </button>

            <button
              onClick={() => setActiveTab('CONFIG_QR')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'CONFIG_QR'
                  ? 'bg-brand-gold text-black shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-white'
              }`}
            >
              <QrCode className="w-4 h-4" /> Configurar QR & Pagos
            </button>
          </div>

          <ThemeToggle />
        </div>
      </header>

      {/* Main View Container */}
      <main className="relative z-10 p-6 md:p-8 max-w-7xl mx-auto">
        {activeTab === 'CARTERA' ? (
          <AccountStatementsView />
        ) : (
          <PaymentQrAdminView />
        )}
      </main>
    </div>
  );
};
