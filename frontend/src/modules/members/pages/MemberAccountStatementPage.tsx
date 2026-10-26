import React from 'react';
import CrestLogo from '@shared/components/CrestLogo';
import { BackButton } from '@shared/components/BackButton';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import { MemberAccountStatementView } from '../components/MemberAccountStatementView';

export const MemberAccountStatementPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#030805] text-gray-100 font-sans pb-24 selection:bg-brand-gold selection:text-black">
      
      {/* Background Ambient Glow Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-brand-gold/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[130px]"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-yellow-600/10 rounded-full blur-[140px]"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Top Header */}
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c2016] via-[#08150f] to-[#040a07] border border-brand-gold/30 p-5 sm:p-7 shadow-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <BackButton to="/member" title="Volver a Mi Panel de Socio" />
              <CrestLogo size="sm" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-gold/20 text-brand-gold border border-brand-gold/40">
                    Tesorería & Cobranzas
                  </span>
                  <span className="text-xs text-gray-400">Club Hípico Los Sargentos</span>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white serif-brand tracking-tight mt-1">
                  Mi Estado <span className="text-brand-gold">de Cuentas</span>
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  Consulta de saldos, desglose de cuotas y pagos directos por código QR Simple
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main View */}
        <main>
          <MemberAccountStatementView />
        </main>

      </div>
    </div>
  );
};
