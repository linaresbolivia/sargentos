import { useState, useEffect } from 'react';
import { RefreshCw, MessageSquare, LogOut, Send, QrCode, Radio, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import { api } from '../../../config/api';
import MassiveWhatsAppForm from '../components/MassiveWhatsAppForm';
import CrestLogo from '@shared/components/CrestLogo';
import { BackButton } from '@shared/components/BackButton';

interface WhatsAppStatus {
  status: 'DISCONNECTED' | 'QR_READY' | 'CONNECTED' | 'INITIALIZING';
  qr: string | null;
}

export default function MassiveMessagingDashboard() {
  const navigate = useNavigate();
  const [waStatus, setWaStatus] = useState<WhatsAppStatus>({ status: 'DISCONNECTED', qr: null });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'massive' | 'connection'>('massive');

  const fetchStatus = async () => {
    try {
      const res = await api.get('/whatsapp/chls-masivo/status');
      if (res.data && res.data.success) {
        setWaStatus(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching WA Masivo status', err);
    }
  };

  useEffect(() => {
    fetchStatus();

    const socket = io(import.meta.env.VITE_WS_URL || `http://${window.location.hostname}:5000`, { 
      withCredentials: true 
    });

    socket.on('whatsapp:status_change', (data: { clientId: string; status: WhatsAppStatus['status']; qr: string | null }) => {
      if (data.clientId === 'chls-masivo') {
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
      await api.post('/whatsapp/chls-masivo/start');
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
      await api.post('/whatsapp/chls-masivo/logout');
      await handleStartSession();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('¿Seguro que deseas desconectar la línea de Envíos Masivos?')) return;
    setLoading(true);
    try {
      await api.post('/whatsapp/chls-masivo/logout');
      await fetchStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden font-sans flex flex-col p-4 sm:p-6 lg:p-10">
      {/* Background radial glow */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent dark:via-forest dark:to-forest"></div>

      <div className="relative z-10 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 dark:border-glass-border pb-5 gap-4">
          <div className="flex items-center gap-4">
            <BackButton to="/" title="Volver al Menú Principal" />
            <CrestLogo size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                  <Radio className="w-3 h-3" /> Módulo Difusión Masiva • Canal 3
                </span>
                <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                  Sesión: chls-masivo
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1 serif-brand">
                Módulo Difusión Masiva & Comunicados
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-0.5 text-xs sm:text-sm">
                Difusión masiva de avisos, estados de cuenta, cobranzas y comunicados institucionales a socios.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div 
              onClick={() => setActiveTab('connection')}
              className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-black/40 border border-gray-200 dark:border-glass-border shadow-sm hover:border-blue-500 transition-all"
              title="Ver estado o escanear QR de Canal 3 Masivo"
            >
              <div className={`w-3 h-3 rounded-full ${waStatus.status === 'CONNECTED' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500 animate-pulse'}`} />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                {waStatus.status === 'CONNECTED' ? 'Línea Masiva Conectada' : waStatus.status === 'QR_READY' ? 'Escanear QR Masivo' : waStatus.status}
              </span>
            </div>
            {waStatus.status === 'CONNECTED' && (
              <button
                onClick={handleLogout}
                disabled={loading}
                className="p-2 rounded-full hover:bg-red-500/10 text-red-500 dark:text-red-400 transition-colors"
                title="Cerrar sesión de WhatsApp Masivo"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 bg-white/70 dark:bg-black/40 backdrop-blur-md p-1.5 rounded-2xl border border-gray-200 dark:border-glass-border w-fit shadow-sm">
          <button
            onClick={() => setActiveTab('massive')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'massive'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-white'
            }`}
          >
            <Send className="w-4 h-4" />
            Envío Masivo de Mensajes
          </button>
          <button
            onClick={() => setActiveTab('connection')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'connection'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" />
            Vincular Línea Masiva (QR)
          </button>
        </div>

        {/* Tab Content */}
        <div className="w-full">
          {activeTab === 'massive' && (
            <div className="w-full space-y-4">
              {waStatus.status !== 'CONNECTED' && (
                <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-4 text-xs text-amber-300">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    <span>La línea de WhatsApp del <strong>Módulo de Difusión Masiva</strong> está desconectada. Vincula el código QR antes de iniciar el envío.</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('connection')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition-colors shrink-0"
                  >
                    Vincular QR ➔
                  </button>
                </div>
              )}
              <MassiveWhatsAppForm />
            </div>
          )}

          {activeTab === 'connection' && (
            <div className="max-w-3xl mx-auto py-6">
              
              {/* Architecture Info */}
              <div className="mb-6 p-5 rounded-2xl bg-white dark:bg-[#07111a] border border-blue-500/30 text-xs text-gray-700 dark:text-gray-300 space-y-3 shadow-xl">
                <div className="flex items-center justify-between border-b border-blue-500/20 pb-2.5">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                    <Radio className="w-4 h-4" />
                    <span>Canales de WhatsApp por Módulo en CHLS</span>
                  </div>
                  <span className="text-[10px] text-gray-400">4 Líneas Independientes</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Canal 1: Reservas */}
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-xs flex items-center justify-between">
                        <span>🎾 Módulo Reservas Deportivas</span>
                        <span className="text-emerald-500 font-mono text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded">chls-reservas</span>
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                        Pases de cancha (Pádel, Tenis), confirmación de turnos y QR de pagos deportivos.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/admin/courts')}
                      className="text-[11px] text-brand-gold hover:underline font-bold mt-2 text-left"
                    >
                      Ir a Reservas Deportivas ➔
                    </button>
                  </div>

                  {/* Canal 2: Call Center */}
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-xs flex items-center justify-between">
                        <span>🤖 Módulo Call Center & Bot</span>
                        <span className="text-emerald-500 font-mono text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded">chls-callcenter</span>
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                        Asistente virtual 24/7, encuestas de satisfacción, IA y bandeja de chats en vivo.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/admin/whatsapp')}
                      className="text-[11px] text-emerald-500 hover:underline font-bold mt-2 text-left"
                    >
                      Ir a Call Center ➔
                    </button>
                  </div>

                  {/* Canal 3: Masivo (Este Panel) */}
                  <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-500/40 flex flex-col justify-between shadow-sm">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-xs flex items-center justify-between">
                        <span className="text-blue-400 font-black">📢 Módulo Difusión Masiva (Este Panel)</span>
                        <span className="text-blue-400 font-mono text-[9px] bg-blue-500/20 px-1.5 py-0.5 rounded">chls-masivo</span>
                      </p>
                      <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1">
                        Campañas de difusión masiva, estados de cuenta, avisos de cobranza y comunicados institucionales.
                      </p>
                    </div>
                    <span className="text-[10px] text-blue-400 font-bold mt-2 flex items-center gap-1">
                      ● Panel Activo
                    </span>
                  </div>

                  {/* Canal 4: PQRS */}
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white text-xs flex items-center justify-between">
                        <span>📋 Módulo PQRS & Reclamos</span>
                        <span className="text-purple-400 font-mono text-[9px] bg-purple-500/10 px-1.5 py-0.5 rounded">chls-pqrs</span>
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                        Notificaciones de resolución de tickets, seguimiento de reclamos y consultas.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('/admin/pqrs')}
                      className="text-[11px] text-purple-400 hover:underline font-bold mt-2 text-left"
                    >
                      Ir a PQRS & Reclamos ➔
                    </button>
                  </div>
                </div>
              </div>

              {waStatus.status === 'DISCONNECTED' && (
                <div className="bg-white dark:bg-glass-bg border border-gray-200 dark:border-glass-border rounded-2xl p-8 sm:p-10 text-center flex flex-col items-center shadow-xl">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-5 border border-blue-500/20">
                    <MessageSquare className="w-8 h-8 text-blue-500 opacity-80" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Línea de Envíos Masivos Desconectada</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm max-w-md">
                    Inicia el servicio para generar el código QR y conectar el WhatsApp asignado al <strong>Módulo de Difusión Masiva & Cobranzas</strong>.
                  </p>
                  <button
                    onClick={handleStartSession}
                    disabled={loading}
                    className="w-full max-w-sm bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Generar Código QR Masivo'}
                  </button>
                </div>
              )}

              {waStatus.status === 'INITIALIZING' && (
                <div className="bg-white dark:bg-glass-bg border border-gray-200 dark:border-glass-border rounded-2xl p-10 text-center flex flex-col items-center shadow-xl">
                  <RefreshCw className="w-16 h-16 text-blue-500 mb-6 animate-spin opacity-80" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Inicializando WhatsApp Masivo...</h2>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">Preparando la conexión segura para el Módulo de Difusión Masiva, espera un momento.</p>
                </div>
              )}

              {waStatus.status === 'QR_READY' && (
                <div className="bg-white dark:bg-[#07111a] border border-blue-500/40 rounded-2xl p-8 flex flex-col items-center shadow-2xl text-center">
                  <h2 className="text-2xl font-bold text-blue-400 mb-2">Escanea el Código QR</h2>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 max-w-md">
                    Abre WhatsApp en el teléfono asignado al <strong>Módulo de Difusión Masiva</strong>, ve a <strong>Dispositivos Vinculados &gt; Vincular un dispositivo</strong> y escanea el código.
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
                    className="bg-gray-100 hover:bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-blue-400 font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar QR
                  </button>
                </div>
              )}

              {waStatus.status === 'CONNECTED' && (
                <div className="bg-white dark:bg-glass-bg border border-emerald-500/30 rounded-2xl p-10 text-center flex flex-col items-center shadow-xl">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold uppercase mb-3">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    Módulo Difusión Masiva Activo
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">¡Línea de Envíos Masivos Conectada!</h2>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 max-w-md">
                    La línea está lista para despachar comunicados institucionales, campañas y avisos a los socios sin interferir con otros canales.
                  </p>
                  <button
                    onClick={() => setActiveTab('massive')}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-600/30 text-sm"
                  >
                    Ir al Formulario de Envíos
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
