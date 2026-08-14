import { useState, useEffect } from 'react';
import { RefreshCw, MessageSquare, LogOut, X } from 'lucide-react';
import { api } from '@config/api';

interface WhatsAppStatus {
  status: 'DISCONNECTED' | 'QR_READY' | 'CONNECTED' | 'INITIALIZING';
  qr: string | null;
}

interface WhatsAppConnectorModalProps {
  onClose: () => void;
}

export default function WhatsAppConnectorModal({ onClose }: WhatsAppConnectorModalProps) {
  const [waStatus, setWaStatus] = useState<WhatsAppStatus>({ status: 'DISCONNECTED', qr: null });
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await api.get(`/whatsapp/chls-pqrs/status?t=${Date.now()}`);
      if (res.data && res.data.success) {
        setWaStatus(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching WA PQRS status', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll every 5 seconds if not connected
    const interval = setInterval(() => {
      if (waStatus.status !== 'CONNECTED') {
        fetchStatus();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [waStatus.status]);

  const handleStartSession = async () => {
    setLoading(true);
    try {
      await api.post('/whatsapp/chls-pqrs/start');
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
      await api.post('/whatsapp/chls-pqrs/logout');
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
      await api.post('/whatsapp/chls-pqrs/logout');
      await new Promise(resolve => setTimeout(resolve, 2500));
      await api.post('/whatsapp/chls-pqrs/start');
      await fetchStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-glass-bg border border-glass-border shadow-2xl rounded-2xl w-full max-w-md p-6 relative flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-xl font-bold text-brand-gold mb-6 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Conexión WhatsApp PQRS
        </h2>

        {waStatus.status === 'DISCONNECTED' && (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-brand-gold mb-4 mx-auto opacity-80" />
            <h3 className="text-lg font-bold text-brand-green dark:text-white mb-2">Servicio Apagado</h3>
            <p className="theme-text-muted mb-6 text-sm">
              Inicia la sesión para generar el código QR y conectar el número exclusivo para PQRS.
            </p>
            <button
              onClick={handleStartSession}
              disabled={loading}
              className="w-full bg-brand-gold hover:bg-brand-gold-light text-brand-green font-bold py-3 px-4 rounded-xl transition-all shadow-goldGlow flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Iniciar Sesión PQRS'}
            </button>
          </div>
        )}

        {waStatus.status === 'INITIALIZING' && (
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 text-brand-gold mb-4 mx-auto animate-spin opacity-80" />
            <h3 className="text-lg font-bold text-brand-green dark:text-white mb-2">Inicializando...</h3>
            <p className="theme-text-muted text-sm">Preparando el cliente de WhatsApp para PQRS, por favor espera.</p>
          </div>
        )}

        {waStatus.status === 'QR_READY' && (
          <div className="text-center py-4 flex flex-col items-center">
            <h3 className="text-lg font-bold text-brand-green dark:text-white mb-2">Escanea el Código QR</h3>
            <p className="theme-text-muted text-sm mb-6">Abre WhatsApp, ve a Dispositivos Vinculados y escanea.</p>
            
            <div className="bg-white p-3 rounded-xl shadow-xl inline-block mb-6">
              {waStatus.qr ? (
                <img src={waStatus.qr} alt="QR Code" className="w-48 h-48 object-contain" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-gray-400">Cargando...</div>
              )}
            </div>
            
            <button
              onClick={handleRefreshQR}
              disabled={loading}
              className="w-full bg-glass-bg border border-glass-border hover:bg-white/10 text-brand-gold font-bold py-2 px-4 rounded-xl transition-all shadow-glass flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar QR
            </button>
          </div>
        )}

        {waStatus.status === 'CONNECTED' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-brand-green dark:text-white mb-2">WhatsApp Conectado</h3>
            <p className="theme-text-muted text-sm mb-8">
              El número está listo para enviar respuestas a los tickets PQRS.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-emeraldGlow flex items-center justify-center gap-2 mb-3"
            >
              Continuar
            </button>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><LogOut className="w-5 h-5" /> Desvincular WhatsApp</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
