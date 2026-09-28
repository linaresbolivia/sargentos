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
  CheckCircle2,
  Archive,
  ArrowRight,
  PlusCircle
} from 'lucide-react';
import { CrestLogo } from '@shared/components/CrestLogo';
import { ElectionStatsDto } from '../types/election.types';

export interface ResetElectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  electionId: string;
  stats: ElectionStatsDto | null;
  onResetSuccess?: (newStats: ElectionStatsDto) => void;
  onOpenSaveAndNew?: () => void;
}

export const ResetElectionModal: React.FC<ResetElectionModalProps> = ({
  isOpen,
  onClose,
  electionId,
  stats,
  onResetSuccess,
  onOpenSaveAndNew,
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
                  Reiniciar o Archivar Votación
                </h3>
              </div>
              <p className="text-xs text-rose-200/80 mt-0.5">
                Opciones para el Comité Electoral y Mesa de Control
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

        {/* Opción Recomendada: Guardar en Historial y Nueva Votación */}
        {onOpenSaveAndNew && totalBallots > 0 && (
          <div className="bg-gradient-to-r from-emerald-950/80 via-[#072418] to-teal-950/80 p-4 rounded-2xl border-2 border-emerald-500/50 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-300">
                <Archive className="w-4 h-4 text-emerald-400" />
                <span>Opción Recomendada</span>
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40 font-bold">
                Cero Pérdida de Datos
              </span>
            </div>
            <p className="text-xs text-gray-200 leading-relaxed">
              ¿Deseas <strong>guardar estos {totalBallots} votos en el Historial</strong> con su fecha oficial y comenzar una nueva votación limpia a cero?
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSaveAndNew();
              }}
              className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wider shadow-md hover:scale-[1.01] active:scale-95 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Guardar en Historial y Nueva Votación</span>
              <ArrowRight className="w-4 h-4 ml-auto" />
            </button>
          </div>
        )}

        {/* Resumen de Datos que se Borrarán */}
        <div className="bg-black/50 rounded-2xl p-4 border border-rose-500/30 space-y-3">
          <div className="flex items-center gap-2 text-rose-300 text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Registros de prueba a eliminar definitivamente:</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-rose-950/30 p-2 rounded-xl border border-rose-500/20">
              <span className="text-[10px] text-gray-400 block font-bold">Ánfora</span>
              <span className="text-lg font-black font-mono text-white">{totalBallots}</span>
              <span className="text-[9px] text-gray-400 block">Boletas</span>
            </div>
            <div className="bg-rose-950/30 p-2 rounded-xl border border-rose-500/20">
              <span className="text-[10px] text-emerald-400 block font-bold">Válidos</span>
              <span className="text-lg font-black font-mono text-emerald-400">{stats?.validBallots || 0}</span>
            </div>
            <div className="bg-rose-950/30 p-2 rounded-xl border border-rose-500/20">
              <span className="text-[10px] text-slate-300 block font-bold">Blancos</span>
              <span className="text-lg font-black font-mono text-slate-200">{stats?.blankBallots || 0}</span>
            </div>
            <div className="bg-rose-950/30 p-2 rounded-xl border border-rose-500/20">
              <span className="text-[10px] text-rose-400 block font-bold">Nulos</span>
              <span className="text-lg font-black font-mono text-rose-400">{stats?.nullBallots || 0}</span>
            </div>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed pt-1">
            Esta acción eliminará todas las boletas registradas de esta sesión de prueba.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-emerald-300/90 bg-emerald-950/30 p-2 rounded-xl border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Los postulantes y sus números <strong>NO se borrarán</strong>.</span>
          </div>
        </div>

        {/* Input de Seguridad */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-300">
            Para borrar sólo las boletas de prueba, escribe la palabra <strong className="text-rose-400 font-mono tracking-widest uppercase">REINICIAR</strong> abajo:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Escribe REINICIAR aquí..."
            disabled={isResetting}
            className="w-full px-4 py-2.5 rounded-xl bg-black/70 border border-rose-500/40 text-rose-200 placeholder-gray-600 font-mono font-bold text-center tracking-widest focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 transition-all text-xs"
          />
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isResetting}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={!isConfirmed || isResetting}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xl ${
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
            <span>Borrar Boletas de Prueba</span>
          </button>
        </div>
      </div>
    </div>
  );
};
