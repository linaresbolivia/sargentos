import { useState, useEffect } from 'react';
import { RefreshCw, MessageSquare, LogOut, X } from 'lucide-react';
import { api } from '@config/api';

interface WhatsAppStatus {
  status: 'DISCONNECTED' | 'QR_READY' | 'CONNECTED' | 'INITIALIZING';
  qr: string | null;
}

interface WhatsAppConnectorModalProps {
  onClose: () => void;
  clientId?: string;
  moduleName?: string;
  channelBadge?: string;
  title?: string;
  subtitle?: string;
  successMessage?: string;
  purposeDescription?: string;
}

export default function WhatsAppConnectorModal({ 
  onClose,
  clientId = 'chls-pqrs',
  moduleName = 'Módulo PQRS & Atención al Socio',
  channelBadge,
  title = 'Conexión WhatsApp',
  subtitle,
  successMessage,
  purposeDescription
}: WhatsAppConnectorModalProps) {
  const [waStatus, setWaStatus] = useState<WhatsAppStatus>({ status: 'DISCONNECTED', qr: null });
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await api.get(`/whatsapp/${clientId}/status`);
      if (res.data && res.data.success) {
        setWaStatus(res.data.data);
      }
    } catch (err) {
      console.error(`Error fetching WA ${clientId} status`, err);
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
  }, [waStatus.status, clientId]);

  const handleStartSession = async () => {
    setLoading(true);
    try {
      await api.post(`/whatsapp/${clientId}/start`);
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
      await api.post(`/whatsapp/${clientId}/logout`);
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
      await api.post(`/whatsapp/${clientId}/logout`);
      await new Promise(resolve => setTimeout(resolve, 2500));
      await api.post(`/whatsapp/${clientId}/start`);
      await fetchStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fallback status text according to module
  const resolvedSuccessMsg = successMessage || `La línea de WhatsApp está vinculada y operando correctamente para ${moduleName}.`;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-[#0c1512] border border-gray-200 dark:border-brand-gold/40 shadow-2xl rounded-2xl w-full max-w-lg p-6 sm:p-7 relative flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          title="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Module Header Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-brand-gold/15 text-brand-gold-dark dark:text-brand-gold border border-brand-gold/30">
            {moduleName}
          </span>
          {channelBadge && (
            <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              {channelBadge}
            </span>
          )}
          <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-gray-200 dark:border-white/10">
            Sesión: {clientId}
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-brand-gold mb-1 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brand-gold shrink-0" />
          <span>{title}</span>
        </h2>
        {subtitle && <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">{subtitle}</p>}

        {purposeDescription && (
          <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-300">
            <span className="font-bold">Propósito del Módulo:</span> {purposeDescription}
          </div>
        )}

        {waStatus.status === 'DISCONNECTED' && (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-brand-gold/10 flex items-center justify-center mx-auto mb-4 border border-brand-gold/20">
              <MessageSquare className="w-7 h-7 text-brand-gold" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Servicio Desconectado</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-xs sm:text-sm max-w-sm mx-auto">
              Inicia la sesión para generar el código QR y conectar el WhatsApp dedicado exclusivamente al <strong>{moduleName}</strong>.
            </p>
            <button
              onClick={handleStartSession}
              disabled={loading}
              className="w-full bg-brand-gold hover:bg-brand-gold-light text-brand-green font-bold py-3.5 px-4 rounded-xl transition-all shadow-goldGlow flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : `Iniciar Sesión de ${moduleName}`}
            </button>
          </div>
        )}

        {waStatus.status === 'INITIALIZING' && (
          <div className="text-center py-10">
            <RefreshCw className="w-12 h-12 text-brand-gold mb-4 mx-auto animate-spin opacity-80" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Inicializando WhatsApp...</h3>
            <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm">
              Preparando el cliente de WhatsApp para <strong>{moduleName}</strong>, por favor espera un momento.
            </p>
          </div>
        )}

        {waStatus.status === 'QR_READY' && (
          <div className="text-center py-3 flex flex-col items-center">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Escanea el Código QR</h3>
            <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm mb-4 max-w-sm">
              Abre WhatsApp en el teléfono asignado a <strong>{moduleName}</strong>, ve a <strong>Dispositivos Vinculados &gt; Vincular un dispositivo</strong> y escanea el código.
            </p>
            
            <div className="bg-white p-3 rounded-2xl shadow-xl inline-block mb-4 border border-gray-200">
              {waStatus.qr ? (
                <img src={waStatus.qr} alt="Código QR WhatsApp" className="w-52 h-52 object-contain" />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center text-gray-400 text-sm">Generando QR...</div>
              )}
            </div>
            
            <button
              onClick={handleRefreshQR}
              disabled={loading}
              className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-brand-gold-dark dark:text-brand-gold font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs sm:text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar Código QR
            </button>
          </div>
        )}

        {waStatus.status === 'CONNECTED' && (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-500">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold uppercase mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Conexión Activa
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              WhatsApp Conectado a {moduleName}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm mb-6 max-w-sm mx-auto">
              {resolvedSuccessMsg}
            </p>
            <button
              onClick={onClose}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-emeraldGlow flex items-center justify-center gap-2 mb-3 text-sm"
            >
              Continuar al Módulo
            </button>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 dark:text-red-400 font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs sm:text-sm"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><LogOut className="w-4 h-4" /> Desvincular WhatsApp de {moduleName}</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
