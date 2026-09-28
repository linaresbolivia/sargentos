import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Lock,
  Calendar,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  UserCheck,
  CreditCard,
  Briefcase
} from 'lucide-react';
import { ElectionSignatory, ElectionStatsDto } from '../types/election.types';

export interface CloseElectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  electionId: string;
  stats: ElectionStatsDto | null;
  onCloseSuccess?: (newStats: ElectionStatsDto) => void;
}

export const CloseElectionModal: React.FC<CloseElectionModalProps> = ({
  isOpen,
  onClose,
  electionId,
  stats,
  onCloseSuccess,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [votingDate, setVotingDate] = useState(todayStr);
  const [notes, setNotes] = useState(
    'Cierre oficial de escrutinio de ánfora con presencia del Comité Electoral y delegados acreditados.'
  );

  // 3 Autoridades con Nombre, CI y Cargo para el Acta Oficial
  const [signers, setSigners] = useState<ElectionSignatory[]>([
    { name: '', ci: '', role: 'Presidente Comité Electoral' },
    { name: '', ci: '', role: 'Secretario Comité Electoral' },
    { name: '', ci: '', role: 'Vocal Comité Electoral' },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const totalBallots = stats?.totalBallots || 0;
  const validBallots = stats?.validBallots || 0;
  const blankBallots = stats?.blankBallots || 0;
  const nullBallots = stats?.nullBallots || 0;
  const winner = stats?.candidates && stats.candidates.length > 0 ? stats.candidates[0] : null;

  const handleSignerChange = (index: number, field: keyof ElectionSignatory, value: string) => {
    setSigners((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleCloseElection = async () => {
    if (!votingDate) {
      toast.error('Por favor especifica la fecha de votación.');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Guardando y cerrando la votación oficial...');

    try {
      const res = await axios.post('/api/elections/close', {
        electionId,
        votingDate,
        notes,
        signers,
        performedBy: signers[0]?.name
          ? `${signers[0].name} (${signers[0].role})`
          : 'Comité Electoral - Mesa de Control',
      });

      if (res.data.success) {
        toast.success('¡Votación guardada y cerrada exitosamente en el historial!', { id: toastId });
        if (onCloseSuccess && res.data.stats) {
          onCloseSuccess(res.data.stats);
        }
        onClose();
      } else {
        toast.error(res.data.message || 'No se pudo cerrar la votación.', { id: toastId });
      }
    } catch (err: any) {
      toast.error(
        'Error al cerrar la votación: ' + (err.response?.data?.message || err.message || 'Error desconocido'),
        { id: toastId }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-[#0a1829] via-[#071322] to-[#040a13] border-2 border-brand-gold/50 rounded-3xl p-5 sm:p-6 max-w-2xl w-full text-white shadow-[0_25px_80px_rgba(212,175,55,0.25)] relative flex flex-col max-h-[92vh]">
        
        {/* Header del Modal */}
        <div className="flex items-center justify-between border-b border-brand-gold/30 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center text-brand-gold shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-wider uppercase bg-gradient-to-r from-amber-200 via-brand-gold to-yellow-400 bg-clip-text text-transparent font-sans">
                Cerrar y Guardar Votación
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Archivar escrutinio oficial en el historial por fecha con firmas oficiales
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

        {/* Cuerpo con Scroll Suave */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
          
          {/* Resumen de la Votación a Guardar */}
          <div className="bg-black/60 rounded-2xl p-3.5 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                {stats?.electionTitle || 'Elecciones Directorio'}
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Cómputo Final
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                <span className="text-[10px] text-gray-400 block font-bold">Ánfora</span>
                <span className="text-lg font-black font-mono text-brand-gold">{totalBallots}</span>
                <span className="text-[9px] text-gray-400 block">Boletas</span>
              </div>
              <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                <span className="text-[10px] text-emerald-400 block font-bold">Válidos</span>
                <span className="text-lg font-black font-mono text-emerald-400">{validBallots}</span>
              </div>
              <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                <span className="text-[10px] text-slate-300 block font-bold">Blancos</span>
                <span className="text-lg font-black font-mono text-slate-300">{blankBallots}</span>
              </div>
              <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                <span className="text-[10px] text-rose-400 block font-bold">Nulos</span>
                <span className="text-lg font-black font-mono text-rose-400">{nullBallots}</span>
              </div>
            </div>

            {winner && totalBallots > 0 && (
              <div className="flex items-center justify-between text-xs bg-brand-gold/10 border border-brand-gold/30 rounded-xl px-3 py-1.5">
                <span className="text-gray-300 font-medium">Mayoría alcanzada:</span>
                <span className="font-bold text-brand-gold truncate max-w-[280px]">
                  {winner.fullName} ({winner.votesCount} votos • {winner.votesPercentage}%)
                </span>
              </div>
            )}
          </div>

          {/* Fecha Oficial y Observaciones */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-gold" />
                <span>Fecha Oficial Votación:</span>
              </label>
              <input
                type="date"
                value={votingDate}
                onChange={(e) => setVotingDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/70 border border-brand-gold/40 text-white font-mono text-xs focus:outline-none focus:border-brand-gold transition-all"
              />
            </div>

            <div className="sm:col-span-7">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">
                Observaciones del Acta de Cierre:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones de cierre notarial..."
                className="w-full px-3 py-2 rounded-xl bg-black/70 border border-white/20 text-gray-200 text-xs focus:outline-none focus:border-brand-gold transition-all"
              />
            </div>
          </div>

          {/* SECCIÓN PRINCIPAL: 3 AUTORIDADES CON NOMBRE, CI Y CARGO */}
          <div className="bg-gradient-to-b from-black/80 to-black/50 p-4 rounded-2xl border border-brand-gold/30 space-y-3">
            <div className="flex items-center justify-between border-b border-brand-gold/20 pb-2">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-brand-gold" />
                <span className="text-xs font-black uppercase tracking-wider text-brand-gold font-sans">
                  Firmantes Oficiales del Acta (3 Autoridades)
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                Aparecerán en PDF y Excel
              </span>
            </div>

            <p className="text-[11px] text-gray-300">
              Registra los datos de los 3 miembros del Comité Electoral o Notario de Fe Pública que suscribirán el acta de escrutinio:
            </p>

            <div className="space-y-3">
              {signers.map((signer, idx) => (
                <div
                  key={idx}
                  className="bg-black/60 p-3 rounded-xl border border-white/10 space-y-2 hover:border-brand-gold/40 transition-all"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-gray-300">
                    <span className="flex items-center gap-1.5 text-brand-gold">
                      <span className="w-5 h-5 rounded-full bg-brand-gold/20 border border-brand-gold/40 inline-flex items-center justify-center text-[10px] text-brand-gold font-bold">
                        {idx + 1}
                      </span>
                      <span>Autoridad #{idx + 1}</span>
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase font-mono">
                      {idx === 0 ? 'Firma Principal' : idx === 1 ? 'Firma Secundaria' : 'Firma Veedora'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    {/* Nombre */}
                    <div className="sm:col-span-5">
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-emerald-400" />
                        <span>Nombre y Apellidos:</span>
                      </label>
                      <input
                        type="text"
                        value={signer.name}
                        onChange={(e) => handleSignerChange(idx, 'name', e.target.value)}
                        placeholder={`Ej: ${
                          idx === 0
                            ? 'Lic. Roberto Gómez Valdez'
                            : idx === 1
                            ? 'Dra. María Elena Prado'
                            : 'Ing. Carlos Villarroel'
                        }`}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/90 border border-white/20 text-white text-xs focus:outline-none focus:border-brand-gold transition-all"
                      />
                    </div>

                    {/* CI */}
                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-blue-400" />
                        <span>C.I. / Documento:</span>
                      </label>
                      <input
                        type="text"
                        value={signer.ci}
                        onChange={(e) => handleSignerChange(idx, 'ci', e.target.value)}
                        placeholder="Ej: 3489201 LP"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/90 border border-white/20 text-white text-xs font-mono focus:outline-none focus:border-brand-gold transition-all"
                      />
                    </div>

                    {/* Cargo */}
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-amber-400" />
                        <span>Cargo Oficial:</span>
                      </label>
                      <input
                        type="text"
                        value={signer.role}
                        onChange={(e) => handleSignerChange(idx, 'role', e.target.value)}
                        placeholder={`Ej: ${
                          idx === 0
                            ? 'Presidente Comité Electoral'
                            : idx === 1
                            ? 'Secretario Comité Electoral'
                            : 'Vocal Comité Electoral'
                        }`}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/90 border border-white/20 text-amber-200 text-xs focus:outline-none focus:border-brand-gold transition-all"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nota Informativa */}
          <div className="flex items-start gap-2 text-xs text-emerald-300 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/30">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              Al cerrar, estos 3 nombres, C.I. y cargos se imprimirán automáticamente al pie del <strong>Acta Notarial en PDF y la planilla Excel</strong> oficial del Club Hípico Los Sargentos.
            </p>
          </div>
        </div>

        {/* Footer con Botones de Acción */}
        <div className="flex items-center gap-3 pt-3 border-t border-white/10 shrink-0">
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
            onClick={handleCloseElection}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-amber-500 via-brand-gold to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black shadow-lg shadow-brand-gold/30 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : (
              <Lock className="w-4 h-4 text-black" />
            )}
            <span>Confirmar Cierre con Firmas</span>
          </button>
        </div>
      </div>
    </div>
  );
};
