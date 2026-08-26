import { useState, useEffect } from 'react';
import { RefreshCw, MessageSquare, LogOut, MessagesSquare, QrCode, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import { api } from '../../../config/api';
import WhatsAppInbox from '../components/WhatsAppInbox';
import CrestLogo from '@shared/components/CrestLogo';
import { BackButton } from '@shared/components/BackButton';

interface WhatsAppStatus {
  status: 'DISCONNECTED' | 'QR_READY' | 'CONNECTED' | 'INITIALIZING';
  qr: string | null;
}

export default function WhatsAppDashboard() {
  const navigate = useNavigate();
  const [waStatus, setWaStatus] = useState<WhatsAppStatus>({ status: 'DISCONNECTED', qr: null });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'connection'>('inbox');

  const fetchStatus = async () => {
    try {
      const res = await api.get('/whatsapp/chls-callcenter/status');
      if (res.data && res.data.success) {
        setWaStatus(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching WA Callcenter status', err);
    }
  };

  useEffect(() => {
    fetchStatus();

    const socket = io(import.meta.env.VITE_WS_URL || `http://${window.location.hostname}:5000`, { 
      withCredentials: true 
    });

    socket.on('whatsapp:status_change', (data: { clientId: string; status: WhatsAppStatus['status']; qr: string | null }) => {
      if (data.clientId === 'chls-callcenter') {
        setWaStatus({ status: data.status, qr: data.qr });
      }
    });

    const interval = setInterval(() => {
      if (waStatus.status !== 'CONNECTED') {
        fetchStatus();
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [waStatus.status]);

  const handleStartSession = async () => {
    setLoading(true);
    try {
      await api.post('/whatsapp/chls-callcenter/start');
      await fetchStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('¿Seguro que deseas desconectar la línea de Call Center & Bot?')) return;
    setLoading(true);
    try {
      await api.post('/whatsapp/chls-callcenter/logout');
      await fetchStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshQR = async () => {
    setLoading(true);
    try {
      await api.post('/whatsapp/chls-callcenter/logout');
      await new Promise(resolve => setTimeout(resolve, 2500));
      await api.post('/whatsapp/chls-callcenter/start');
      await fetchStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden font-sans flex flex-col p-4 sm:p-6 lg:p-10">
      {/* Background aesthetics */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-gold/30 via-transparent to-transparent dark:via-forest dark:to-forest"></div>

      <div className="relative z-10 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 dark:border-glass-border pb-5 gap-4">
          <div className="flex items-center gap-4">
            <BackButton to="/" title="Volver al Menú Principal" />
            <CrestLogo size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Bot className="w-3 h-3" /> Canal 2 • Bot 24/7 & Call Center
                </span>
                <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                  chls-callcenter
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-brand-gold-dark dark:text-brand-gold mt-1 serif-brand">
                Call Center & Chatbot 24/7
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-0.5 text-xs sm:text-sm">
                Atención virtual interactiva, consultas en vivo de socios y seguimiento inteligente de PQRS.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div 
              onClick={() => setActiveTab('connection')}
              className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-black/40 border border-gray-200 dark:border-glass-border shadow-sm hover:border-brand-gold transition-all"
              title="Ver estado o escanear QR de Canal 2"
            >
              <div className={`w-3 h-3 rounded-full ${waStatus.status === 'CONNECTED' ? 'bg-emerald-500 shadow-emeraldGlow' : 'bg-amber-500 animate-pulse'}`} />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-800 dark:text-brand-gold-light">
                {waStatus.status === 'CONNECTED' ? 'Canal 2 Conectado' : waStatus.status === 'QR_READY' ? 'Escanear QR Canal 2' : waStatus.status}
              </span>
            </div>
            {waStatus.status === 'CONNECTED' && (
              <button
                onClick={handleLogout}
                disabled={loading}
                className="p-2 rounded-full hover:bg-red-500/10 text-red-500 dark:text-red-400 transition-colors"
                title="Cerrar sesión de WhatsApp Call Center"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 bg-white/70 dark:bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-gray-200 dark:border-glass-border w-fit shadow-sm">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'inbox'
                ? 'bg-brand-gold text-brand-green shadow-goldGlow font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-brand-gold-dark dark:hover:text-white'
            }`}
          >
            <MessagesSquare className="w-4 h-4" />
            Bandeja de Chats (Call Center en Vivo)
          </button>
          <button
            onClick={() => setActiveTab('connection')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'connection'
                ? 'bg-brand-gold text-brand-green shadow-goldGlow font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-brand-gold-dark dark:hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            Vincular Línea Call Center (QR)
          </button>
        </div>

        {/* Tab Content */}
        <div className="w-full">
          {activeTab === 'inbox' && (
            <div className="w-full space-y-4">
              {waStatus.status !== 'CONNECTED' && (
                <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-4 text-xs text-amber-300">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    <span>La línea del Call Center está desconectada. Vincula el código QR para interactuar en vivo con los socios.</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('connection')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition-colors shrink-0"
                  >
                    Vincular QR ➔
                  </button>
                </div>
              )}
              <WhatsAppInbox />
            </div>
          )}

          {activeTab === 'connection' && (
            <div className="max-w-xl mx-auto py-6">

              {/* Multi-Session Architecture Banner */}
              <div className="mb-6 p-4 rounded-2xl bg-white dark:bg-black/50 border border-brand-gold/30 text-xs text-gray-700 dark:text-gray-300 space-y-2 shadow-lg">
                <div className="flex items-center gap-2 text-brand-gold font-bold">
                  <MessageSquare className="w-4 h-4" />
                  <span>Configuración de Canales Independientes de WhatsApp</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="p-2.5 rounded-xl bg-brand-gold/10 border border-brand-gold/30">
                    <p className="font-bold text-gray-900 dark:text-white text-[11px] flex items-center gap-1">
                      <span>🤖 Canal 2 (Este Panel)</span>
                      <span className="text-emerald-500 dark:text-emerald-400 font-mono text-[9px]">chls-callcenter</span>
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Bot 24/7 interactivo, encuestas de satisfacción, IA y bandeja de chats en vivo.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-[11px] flex items-center gap-1">
                        <span>📢 Canal 3 (Envíos Masivos)</span>
                        <span className="text-blue-400 font-mono text-[9px]">chls-masivo</span>
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        Línea dedicada a campañas masivas y comunicados a socios.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/admin/whatsapp-masivo')}
                      className="text-[10px] text-blue-500 hover:underline font-bold mt-1 text-left"
                    >
                      Ir a Envíos Masivos ➔
                    </button>
                  </div>
                </div>
              </div>

              {waStatus.status === 'DISCONNECTED' && (
                <div className="bg-white dark:bg-glass-bg border border-gray-200 dark:border-glass-border rounded-2xl p-10 text-center flex flex-col items-center shadow-xl">
                  <MessageSquare className="w-16 h-16 text-brand-gold mb-6 opacity-80" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Línea Call Center Desconectada</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-8 text-sm">
                    Inicia el servicio para generar el código QR y conectar el WhatsApp Oficial del Bot y Call Center.
                  </p>
                  <button
                    onClick={handleStartSession}
                    disabled={loading}
                    className="w-full bg-brand-gold hover:bg-brand-gold-light text-brand-green font-bold py-3.5 px-6 rounded-xl transition-all shadow-goldGlow disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Generar Código QR de Call Center'}
                  </button>
                </div>
              )}

              {waStatus.status === 'INITIALIZING' && (
                <div className="bg-white dark:bg-glass-bg border border-gray-200 dark:border-glass-border rounded-2xl p-10 text-center flex flex-col items-center shadow-xl">
                  <RefreshCw className="w-16 h-16 text-brand-gold mb-6 animate-spin opacity-80" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Inicializando Call Center...</h2>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">Preparando la conexión segura de WhatsApp, espera un momento.</p>
                </div>
              )}

              {waStatus.status === 'QR_READY' && (
                <div className="bg-white dark:bg-brand-green-light border border-gray-200 dark:border-brand-green-light rounded-2xl p-8 flex flex-col items-center shadow-2xl text-center">
                  <h2 className="text-2xl font-bold text-brand-gold-dark dark:text-brand-gold mb-2">Escanea el Código QR</h2>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                    Abre WhatsApp en el teléfono de <strong>Call Center / Atención al Socio</strong>, ve a <strong>Dispositivos Vinculados &gt; Vincular un dispositivo</strong> y escanea el código.
                  </p>
                  
                  <div className="bg-white p-4 rounded-2xl shadow-xl inline-block mb-6 border border-gray-200">
                    {waStatus.qr ? (
                      <img src={waStatus.qr} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
                    ) : (
                      <div className="w-64 h-64 flex items-center justify-center text-gray-400">Generando QR...</div>
                    )}
                  </div>
                  
                  <button
                    onClick={handleRefreshQR}
                    disabled={loading}
                    className="bg-gray-100 hover:bg-gray-200 dark:bg-glass-bg border border-gray-300 dark:border-glass-border text-brand-gold-dark dark:text-brand-gold font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar QR
                  </button>
                </div>
              )}

              {waStatus.status === 'CONNECTED' && (
                <div className="bg-white dark:bg-glass-bg border border-green-500/30 rounded-2xl p-10 text-center flex flex-col items-center shadow-xl">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mb-4">
                    <MessagesSquare className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">¡Línea Call Center Conectada y Activa!</h2>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                    El Bot de Atención Virtual 24/7 y la recepción de mensajes están operando normalmente.
                  </p>
                  <button
                    onClick={() => setActiveTab('inbox')}
                    className="bg-brand-gold hover:bg-brand-gold-light text-brand-green font-bold py-3 px-8 rounded-xl transition-all shadow-goldGlow text-sm"
                  >
                    Ir a la Bandeja de Chats
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
