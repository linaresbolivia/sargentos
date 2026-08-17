import { useState, useEffect } from 'react';
import { RefreshCw, MessageSquare, LogOut, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ThemeToggle } from '@shared/components/ThemeToggle';
import { api } from '../../../config/api';
import MassiveWhatsAppForm from '../components/MassiveWhatsAppForm';
import logoClub from '../../../assets/logo.png';

interface WhatsAppStatus {
  status: 'DISCONNECTED' | 'QR_READY' | 'CONNECTED' | 'INITIALIZING';
  qr: string | null;
}

export default function WhatsAppDashboard() {
  const navigate = useNavigate();
  const [waStatus, setWaStatus] = useState<WhatsAppStatus>({ status: 'DISCONNECTED', qr: null });
  const [loading, setLoading] = useState(false);

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

    // Conectar WebSocket para recibir actualizaciones instantáneas de estado
    const socket = io(import.meta.env.VITE_WS_URL || `http://${window.location.hostname}:5000`, { 
      withCredentials: true 
    });

    socket.on('whatsapp:status_change', (data: { clientId: string; status: WhatsAppStatus['status']; qr: string | null }) => {
      if (data.clientId === 'chls-masivo') {
        setWaStatus({ status: data.status, qr: data.qr });
      }
    });

    // Polling de respaldo cada 5 segundos únicamente si no está conectado
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

  const handleLogout = async () => {
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

  const handleRefreshQR = async () => {
    setLoading(true);
    try {
      await api.post('/whatsapp/chls-masivo/logout');
      await new Promise(resolve => setTimeout(resolve, 2500));
      await api.post('/whatsapp/chls-masivo/start');
      await fetchStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden font-sans flex flex-col p-6 lg:p-12">
      {/* Background aesthetics */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-gold/30 via-transparent to-transparent dark:via-forest dark:to-forest"></div>

      <div className="relative z-10 max-w-5xl w-full mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 dark:border-glass-border pb-6 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="p-2 bg-white dark:bg-black/40 hover:bg-gray-100 dark:hover:bg-black/60 border border-gray-200 dark:border-brand-gold/30 rounded-xl text-brand-gold-dark dark:text-brand-gold shadow-sm transition-all"
              title="Volver al Menú Principal"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-brand-gold-dark dark:text-brand-gold flex items-center gap-3">
                <img src={logoClub} alt="Club Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(204,161,75,0.4)]" />
                WhatsApp Masivo
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">
                Envía mensajes masivos con texto, imagen y enlace a tus listas de socios.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-black/40 border border-gray-200 dark:border-glass-border shadow-sm">
              <div className={`w-3 h-3 rounded-full ${waStatus.status === 'CONNECTED' ? 'bg-green-500 shadow-emeraldGlow' : 'bg-red-500'}`} />
              <span className="text-sm font-semibold uppercase tracking-wider text-gray-800 dark:text-brand-gold-light">
                {waStatus.status}
              </span>
            </div>
            {waStatus.status === 'CONNECTED' && (
              <button
                onClick={handleLogout}
                disabled={loading}
                className="p-2 rounded-full hover:bg-red-500/10 text-red-500 dark:text-red-400 transition-colors"
                title="Cerrar sesión de WhatsApp"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {waStatus.status === 'DISCONNECTED' && (
            <div className="bg-white dark:bg-glass-bg border border-gray-200 dark:border-glass-border rounded-2xl p-12 text-center flex flex-col items-center max-w-lg mx-auto shadow-xl dark:shadow-glass">
              <MessageSquare className="w-16 h-16 text-brand-gold mb-6 opacity-80" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Servicio Apagado</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                Inicia la sesión para generar el código QR y conectar tu cuenta de WhatsApp.
              </p>
              <button
                onClick={handleStartSession}
                disabled={loading}
                className="w-full bg-brand-gold hover:bg-brand-gold-light text-brand-green font-bold py-4 px-6 rounded-xl transition-all shadow-goldGlow disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Iniciar Sesión'}
              </button>
            </div>
          )}

          {waStatus.status === 'INITIALIZING' && (
            <div className="bg-white dark:bg-glass-bg border border-gray-200 dark:border-glass-border rounded-2xl p-12 text-center flex flex-col items-center max-w-lg mx-auto shadow-xl dark:shadow-glass">
              <RefreshCw className="w-16 h-16 text-brand-gold mb-6 animate-spin opacity-80" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Inicializando...</h2>
              <p className="text-gray-600 dark:text-gray-300">Preparando el cliente de WhatsApp, por favor espera.</p>
            </div>
          )}

          {waStatus.status === 'QR_READY' && (
            <div className="bg-white dark:bg-brand-green-light border border-gray-200 dark:border-brand-green-light rounded-2xl p-8 lg:p-12 flex flex-col items-center max-w-lg mx-auto shadow-2xl text-center">
              <h2 className="text-2xl font-bold text-brand-gold-dark dark:text-brand-gold mb-2">Escanea el Código QR</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8">Abre WhatsApp en tu teléfono, ve a Dispositivos Vinculados y escanea el siguiente código.</p>
              
              <div className="bg-white p-4 rounded-xl shadow-xl inline-block mb-6 border border-gray-200">
                {waStatus.qr ? (
                  <img src={waStatus.qr} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center text-gray-400">Cargando QR...</div>
                )}
              </div>
              
              <button
                onClick={handleRefreshQR}
                disabled={loading}
                className="mb-4 bg-gray-100 hover:bg-gray-200 dark:bg-glass-bg border border-gray-300 dark:border-glass-border text-brand-gold-dark dark:text-brand-gold font-bold py-2 px-6 rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Actualizar QR
              </button>

              <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Esperando conexión...</p>
            </div>
          )}

          {waStatus.status === 'CONNECTED' && (
            <div className="w-full">
              <MassiveWhatsAppForm />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
