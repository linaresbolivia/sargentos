import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@store/store';
import { notifySlaAlert } from '@store/correspondenceSlice';
import {
  X,
  Send,
  AlertTriangle,
  Clock,
  MessageSquare,
  Mail,
  Smartphone,
  ShieldAlert,
  CheckCircle2,
  Building2,
  User,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { RouteSheetItem } from '../types/correspondence.types';
import CrestLogo from '@shared/components/CrestLogo';

interface SlaUrgencyAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: RouteSheetItem;
}

export const SlaUrgencyAlertModal: React.FC<SlaUrgencyAlertModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const dispatch = useDispatch<AppDispatch>();

  const [channel, setChannel] = useState<'WHATSAPP' | 'EMAIL' | 'BOTH'>('BOTH');
  const [urgencyNote, setUrgencyNote] = useState(
    `Favor dar máxima prioridad y celeridad a la atención de esta Hoja de Ruta según plazo SLA institucional.`
  );
  const [customPhone, setCustomPhone] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    const toastId = toast.loading('Despachando alerta institucional SLA...');
    try {
      const action = await dispatch(
        notifySlaAlert({
          routeSheetId: item.id,
          channel,
          note: urgencyNote.trim(),
          customPhone: customPhone.trim() || undefined,
          customEmail: customEmail.trim() || undefined,
        })
      );

      if (notifySlaAlert.fulfilled.match(action)) {
        toast.success(`¡Alerta SLA enviada exitosamente para ${item.hrCode}! 🚀`, { id: toastId });
        onClose();
      } else {
        toast.error('Error al despachar la alerta SLA', { id: toastId });
      }
    } catch {
      toast.error('Error inesperado al emitir la alerta', { id: toastId });
    } finally {
      setIsSending(false);
    }
  };

  const isOverdue = item.isOverdue || item.slaStatus === 'OVERDUE';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex justify-center items-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-[#0c1410] border-2 border-red-500/40 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-red-600/15 via-amber-500/10 to-transparent border-b border-red-500/20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/40">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-red-600 dark:text-red-400 bg-red-500/15 px-2.5 py-0.5 rounded-lg border border-red-500/30">
                  {item.hrCode}
                </span>
                <span className="text-[10px] font-black uppercase text-red-500 tracking-wider">
                  Control de Tiempos & SLA
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                Despachar Alerta de Urgencia SLA
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSendAlert} className="p-6 space-y-5 text-xs">
          
          {/* Status Box */}
          <div className={`p-4 rounded-2xl border-2 flex items-start gap-3.5 ${
            isOverdue
              ? 'bg-red-500/10 border-red-500/40 text-red-900 dark:text-red-200'
              : 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200'
          }`}>
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-black uppercase text-xs">
                {item.slaLabel || (isOverdue ? 'Trámite con Plazo Vencido' : 'Trámite Próximo a Vencer')}
              </div>
              <p className="text-[11.5px] leading-relaxed">
                Área en custodia: <strong className="uppercase">{item.currentArea}</strong>.
                {item.slaDeadline && (
                  <span> Límite: <strong>{new Date(item.slaDeadline).toLocaleString('es-BO')}</strong></span>
                )}
              </p>
            </div>
          </div>

          {/* 1. Canal de Envío */}
          <div className="space-y-2">
            <label className="block font-black uppercase tracking-wider text-slate-800 dark:text-gray-200">
              1. Seleccionar Canales de Notificación Inmediata
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setChannel('BOTH')}
                className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer font-bold flex flex-col items-center gap-1.5 ${
                  channel === 'BOTH'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:border-emerald-500'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Smartphone className="w-4 h-4" />
                  <Mail className="w-4 h-4" />
                </div>
                <span>WhatsApp + Email</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('WHATSAPP')}
                className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer font-bold flex flex-col items-center gap-1.5 ${
                  channel === 'WHATSAPP'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:border-emerald-500'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Solo WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setChannel('EMAIL')}
                className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer font-bold flex flex-col items-center gap-1.5 ${
                  channel === 'EMAIL'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:border-emerald-500'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Solo Email</span>
              </button>
            </div>
          </div>

          {/* 2. Mensaje / Proveído de Urgencia */}
          <div className="space-y-2">
            <label className="block font-black uppercase tracking-wider text-slate-800 dark:text-gray-200">
              2. Proveído / Instrucción de Urgencia
            </label>
            <textarea
              rows={3}
              value={urgencyNote}
              onChange={(e) => setUrgencyNote(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-2xl p-3 text-slate-900 dark:text-white font-medium text-xs focus:ring-2 focus:ring-red-500 outline-none leading-relaxed"
            />
          </div>

          {/* 3. Contactos Opcionales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-white/5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-400 mb-1">
                WhatsApp Específico (Opcional)
              </label>
              <input
                type="tel"
                placeholder="Ej. 70123456"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                className="w-full bg-white dark:bg-black/40 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-400 mb-1">
                Email Alternativo (Opcional)
              </label>
              <input
                type="email"
                placeholder="Ej. jefe.area@chls.bo"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="w-full bg-white dark:bg-black/40 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white text-xs outline-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-white/5 flex justify-end items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="flex items-center gap-2 bg-gradient-to-r from-red-600 via-red-500 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black px-6 py-2.5 rounded-xl shadow-lg shadow-red-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{isSending ? 'Enviando Alerta...' : 'Emitir Alerta SLA Inmediata'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
export default SlaUrgencyAlertModal;
