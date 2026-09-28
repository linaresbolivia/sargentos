import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  PlusCircle,
  Calendar,
  X,
  Copy,
  Layers,
  Sparkles,
  Loader2,
  CheckCircle2,
  Lock,
  Vote
} from 'lucide-react';
import { ElectionStatsDto } from '../types/election.types';

export interface NewElectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentElectionId?: string;
  currentCandidatesCount?: number;
  onCreatedSuccess?: (newStats: ElectionStatsDto, newElection: any) => void;
}

export const NewElectionModal: React.FC<NewElectionModalProps> = ({
  isOpen,
  onClose,
  currentElectionId,
  currentCandidatesCount = 11,
  onCreatedSuccess,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const nextYear = new Date().getFullYear() + 2;

  const [title, setTitle] = useState('Elecciones de Directorio ' + new Date().getFullYear());
  const [period, setPeriod] = useState(`${new Date().getFullYear()} - ${nextYear}`);
  const [votingDate, setVotingDate] = useState(todayStr);
  const [maxSelectionsPerBallot, setMaxSelectionsPerBallot] = useState(11);
  const [copyCandidates, setCopyCandidates] = useState(true);
  const [closePrevious, setClosePrevious] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCreateNew = async () => {
    if (!title.trim()) {
      toast.error('Por favor escribe un título para la nueva votación.');
      return;
    }
    if (!votingDate) {
      toast.error('Por favor indica la fecha de votación.');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Aperturando nueva sesión de votación...');

    try {
      const res = await axios.post('/api/elections/new', {
        title: title.trim(),
        period: period.trim(),
        votingDate,
        maxSelectionsPerBallot: Number(maxSelectionsPerBallot) || 11,
        copyCandidatesFromElectionId: copyCandidates ? currentElectionId : undefined,
        closePrevious,
        performedBy: 'Comité Electoral',
      });

      if (res.data.success) {
        toast.success('¡Nueva votación aperturada con éxito! Ánfora lista en 0 votos.', {
          id: toastId,
        });
        if (onCreatedSuccess) {
          onCreatedSuccess(res.data.stats, res.data.election);
        }
        onClose();
      } else {
        toast.error(res.data.message || 'No se pudo aperturar la nueva votación.', { id: toastId });
      }
    } catch (err: any) {
      toast.error(
        'Error al crear nueva votación: ' +
          (err.response?.data?.message || err.message || 'Error desconocido'),
        { id: toastId }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-[#081829] via-[#05111d] to-[#02080f] border-2 border-emerald-500/50 rounded-3xl p-5 sm:p-7 max-w-lg w-full text-white shadow-[0_25px_80px_rgba(16,185,129,0.25)] relative space-y-5">
        
        {/* Header del Modal */}
        <div className="flex items-center justify-between border-b border-emerald-500/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-wider uppercase bg-gradient-to-r from-emerald-200 via-teal-300 to-emerald-400 bg-clip-text text-transparent font-sans">
                Aperturar Nueva Votación
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Iniciar un nuevo proceso electoral en el historial
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-all cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Campos del Formulario */}
        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
              Título de la Elección:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Elecciones Extraordinarias de Directorio..."
              className="w-full px-4 py-2.5 rounded-xl bg-black/70 border border-white/20 text-white text-xs focus:outline-none focus:border-emerald-400 transition-all font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Fecha de Votación:</span>
              </label>
              <input
                type="date"
                value={votingDate}
                onChange={(e) => setVotingDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/70 border border-emerald-500/40 text-white font-mono text-xs focus:outline-none focus:border-emerald-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                Gestión / Período:
              </label>
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="2026 - 2028"
                className="w-full px-3 py-2 rounded-xl bg-black/70 border border-white/20 text-white text-xs focus:outline-none focus:border-emerald-400 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
              Límite de Marcas por Boleta:
            </label>
            <input
              type="number"
              min={1}
              max={15}
              value={maxSelectionsPerBallot}
              onChange={(e) => setMaxSelectionsPerBallot(Number(e.target.value))}
              className="w-full px-4 py-2 rounded-xl bg-black/70 border border-white/20 text-white text-xs font-mono focus:outline-none focus:border-emerald-400 transition-all"
            />
          </div>

          {/* Opciones Avanzadas de Conservación */}
          <div className="bg-black/60 rounded-2xl p-3.5 border border-white/10 space-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-gray-200 hover:text-white">
              <input
                type="checkbox"
                checked={copyCandidates}
                onChange={(e) => setCopyCandidates(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
              />
              <span className="flex items-center gap-1.5 font-medium">
                <Copy className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copiar nómina actual de candidatos ({currentCandidatesCount} postulantes)</span>
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-gray-200 hover:text-white">
              <input
                type="checkbox"
                checked={closePrevious}
                onChange={(e) => setClosePrevious(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-500"
              />
              <span className="flex items-center gap-1.5 font-medium">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Cerrar y archivar en el historial la votación previa activa</span>
              </span>
            </label>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleCreateNew}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/30 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <PlusCircle className="w-4 h-4" />
            )}
            <span>Aperturar Elección</span>
          </button>
        </div>
      </div>
    </div>
  );
};
