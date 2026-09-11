import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  RotateCcw,
  X,
  Trash2,
  ShieldAlert,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { CrestLogo } from '@shared/components/CrestLogo';
import { ElectionStatsDto } from '../types/election.types';

export interface ResetElectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  electionId: string;
  stats: ElectionStatsDto | null;
  onResetSuccess?: (newStats: ElectionStatsDto) => void;
}

export const ResetElectionModal: React.FC<ResetElectionModalProps> = ({
  isOpen,
  onClose,
  electionId,
  stats,
  onResetSuccess,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  if (!isOpen) return null;

  const totalBallots = stats?.totalBallots || 0;
  const isConfirmed = confirmText.trim().toUpperCase() === 'REINICIAR';

  const handleReset = async () => {
    if (!isConfirmed) {
      toast.error('Debe escribir exactamente la palabra REINICIAR para confirmar.');
      return;
    }

    setIsResetting(true);
    const toastId = toast.loading('Reiniciando cómputo de la votación...');

    try {
      const res = await axios.post('/api/elections/ballot/reset', {
        electionId,
        performedBy: 'Comité Electoral - Mesa de Control',
      });

      if (res.data.success) {
        toast.success('¡Escrutinio reiniciado con éxito! El ánfora ha vuelto a 0 votos.', {
          id: toastId,
        });
        if (onResetSuccess && res.data.stats) {
          onResetSuccess(res.data.stats);
        }
        setConfirmText('');
        onClose();
      } else {
        toast.error(res.data.message || 'No se pudo reiniciar la votación.', { id: toastId });
      }
    } catch (err: any) {
      toast.error(
        'Error al reiniciar: ' + (err.response?.data?.message || err.message || 'Error desconocido'),
        { id: toastId }
      );
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-[#1a0507] via-[#120406] to-[#080203] border-2 border-rose-500/60 rounded-3xl p-5 sm:p-7 max-w-lg w-full text-white shadow-[0_25px_80px_rgba(225,29,72,0.35)] relative space-y-5">
        
        {/* Header del Modal */}
        <div className="flex items-center justify-between border-b border-rose-500/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-wider uppercase bg-gradient-to-r from-rose-200 via-red-300 to-rose-400 bg-clip-text text-transparent font-sans">
                  Reiniciar Votación a Cero
                </h3>
              </div>
              <p className="text-xs text-rose-200/80 mt-0.5">
                Acción crítica reservada para el Comité Electoral
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isResetting}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-all cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen de Datos que se Borrarán */}
        <div className="bg-black/50 rounded-2xl p-4 border border-rose-500/30 space-y-3">
          <div className="flex items-center gap-2 text-rose-300 text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Registros que volverán a cero:</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-rose-950/30 p-2.5 rounded-xl border border-rose-500/20">
              <span className="text-[10px] text-gray-400 block font-bold">Ánfora</span>
              <span className="text-xl font-black font-mono text-white">{totalBallots}</span>
              <span className="text-[9px] text-gray-400 block">Boletas</span>
            </div>
            <div className="bg-rose-950/30 p-2.5 rounded-xl border border-rose-500/20">
              <span className="text-[10px] text-emerald-400 block font-bold">Válidos</span>
              <span className="text-xl font-black font-mono text-emerald-400">{stats?.validBallots || 0}</span>
            </div>
            <div className="bg-rose-950/30 p-2.5 rounded-xl border border-rose-500/20">
              <span className="text-[10px] text-slate-300 block font-bold">Blancos</span>
              <span className="text-xl font-black font-mono text-slate-200">{stats?.blankBallots || 0}</span>
            </div>
            <div className="bg-rose-950/30 p-2.5 rounded-xl border border-rose-500/20">
              <span className="text-[10px] text-rose-400 block font-bold">Nulos</span>
              <span className="text-xl font-black font-mono text-rose-400">{stats?.nullBallots || 0}</span>
            </div>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed pt-1">
            Esta operación eliminará todas las boletas sufragadas para <strong>empezar de cero</strong> en la votación oficial.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-emerald-300/90 bg-emerald-950/30 p-2 rounded-xl border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Los postulantes, sus fotos, números y cargos <strong>NO se borrarán</strong>.</span>
          </div>
        </div>

        {/* Input de Seguridad */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-300">
            Para confirmar, escribe la palabra <strong className="text-rose-400 font-mono tracking-widest uppercase">REINICIAR</strong> abajo:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Escribe REINICIAR aquí..."
            disabled={isResetting}
            className="w-full px-4 py-3 rounded-xl bg-black/70 border border-rose-500/40 text-rose-200 placeholder-gray-600 font-mono font-bold text-center tracking-widest focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 transition-all text-sm"
          />
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isResetting}
            className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={!isConfirmed || isResetting}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xl ${
              isConfirmed && !isResetting
                ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white shadow-rose-900/50 hover:scale-[1.02] active:scale-95 border border-rose-400/60 cursor-pointer'
                : 'bg-rose-950/30 text-gray-500 border border-rose-900/40 cursor-not-allowed opacity-60'
            }`}
          >
            {isResetting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4 text-rose-200" />
            )}
            <span>Limpiar y Reiniciar a Cero</span>
          </button>
        </div>
      </div>
    </div>
  );
};
