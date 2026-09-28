import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Film, 
  QrCode, 
  Award, 
  Calculator, 
  Sparkles, 
  ShieldCheck, 
  Users, 
  TrendingUp, 
  WifiOff, 
  Eye, 
  Download,
  Share2
} from 'lucide-react';
import CrestLogo from '@shared/components/CrestLogo';
import { BackButton } from '@shared/components/BackButton';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import { MagicBookViewer } from '../components/MagicBookViewer';
import { VideoShowcaseView } from '../components/VideoShowcaseView';
import { VipPassGeneratorView } from '../components/VipPassGeneratorView';
import { CommercialLeadKanban } from '../components/CommercialLeadKanban';
import { QuoteSimulatorModal } from '../components/QuoteSimulatorModal';
import { commercialApi } from '../services/commercialApi';

export const CommercialHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'REVISTA_MAGICA' | 'VIDEOS_OFFLINE' | 'PASES_VIP'
  >('REVISTA_MAGICA');

  const [stats, setStats] = useState({
    activePasses: 0,
    usedToday: 0,
    totalLeads: 0,
  });

  const [showQuoteModal, setShowQuoteModal] = useState(false);

  useEffect(() => {
    loadStats();
  }, [activeTab]);

  const loadStats = async () => {
    try {
      const res = await commercialApi.getStats();
      if (res.data) {
        setStats({
          activePasses: res.data.activePasses || 0,
          usedToday: res.data.usedToday || 0,
          totalLeads: res.data.totalLeads || 0,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden font-sans pb-16">
      
      {/* Background Atmosphere */}
      <div className="absolute inset-0 z-0 opacity-25 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-gold/30 via-transparent to-transparent dark:via-forest dark:to-forest"></div>

      {/* Top Luxury Header */}
      <header className="relative z-20 w-full p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 dark:border-brand-gold/10 backdrop-blur-md sticky top-0 bg-white/90 dark:bg-[#0a100d]/90 shadow-sm transition-colors">
        <div className="flex items-center gap-4">
          <BackButton to="/" title="Volver al Portal Principal" />
          <CrestLogo size="sm" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white serif-brand tracking-tight">
              Módulo Comercial
            </h1>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto p-6 space-y-6">

        {/* Navigation Tabs Bar - Minimalist Modern Pill Style */}
        <div className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/80 dark:bg-[#0d1311]/80 backdrop-blur-md shadow-sm">
          
          <button
            onClick={() => setActiveTab('REVISTA_MAGICA')}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'REVISTA_MAGICA' 
                ? 'bg-gradient-to-r from-brand-gold via-yellow-500 to-amber-500 text-black shadow-md shadow-brand-gold/30 scale-102' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Revista</span>
          </button>

          <button
            onClick={() => setActiveTab('VIDEOS_OFFLINE')}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'VIDEOS_OFFLINE' 
                ? 'bg-gradient-to-r from-brand-gold via-yellow-500 to-amber-500 text-black shadow-md shadow-brand-gold/30 scale-102' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Videos</span>
          </button>

          <button
            onClick={() => setActiveTab('PASES_VIP')}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'PASES_VIP' 
                ? 'bg-gradient-to-r from-brand-gold via-yellow-500 to-amber-500 text-black shadow-md shadow-brand-gold/30 scale-102' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Pases de Cortesía</span>
          </button>

        </div>

        {/* Tab Views */}
        {activeTab === 'REVISTA_MAGICA' && <MagicBookViewer />}
        {activeTab === 'VIDEOS_OFFLINE' && <VideoShowcaseView />}
        {activeTab === 'PASES_VIP' && <VipPassGeneratorView />}

      </main>

      {/* Quote Simulator Modal */}
      <QuoteSimulatorModal
        isOpen={showQuoteModal}
        onClose={() => setShowQuoteModal(false)}
      />

    </div>
  );
};
export default CommercialHub;
