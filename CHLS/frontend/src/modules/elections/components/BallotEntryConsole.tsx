import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Check,
  RotateCcw,
  PlusCircle,
  HelpCircle,
  AlertTriangle,
  Send,
  Sparkles,
  RefreshCw,
  Sliders,
  Tv,
  Maximize2,
  Minimize2,
  TrendingUp,
  Award,
  BarChart2,
  Layers,
  Radio,
  CheckCircle2
} from 'lucide-react';
import { CandidateDto, ElectionStatsDto, formatNameInTwoLines } from '../types/election.types';
import { CrestLogo } from '@shared/components/CrestLogo';

export interface LastSavedInfo {
  ballotNumber: number;
  type: 'VALID' | 'BLANK' | 'NULL';
  candidateIds: string[];
  candidateNames: string[];
  timestamp: number;
}

export interface BallotEntryConsoleProps {
  electionId: string;
  candidates: CandidateDto[];
  stats: ElectionStatsDto | null;
  maxSelections?: number;
  selectedCandidateIds?: string[];
  toggleCandidate?: (id: string) => void;
  recentlyVotedCandidateIds?: string[];
  lastSavedInfo?: LastSavedInfo | null;
  onBallotRegistered?: (newStats: ElectionStatsDto) => void;
  onOpenSettings?: () => void;
  onViewResults?: () => void;
}

export const BallotEntryConsole: React.FC<BallotEntryConsoleProps> = ({
  electionId,
  candidates,
  stats,
  maxSelections = 5,
  selectedCandidateIds: externalSelectedIds,
  toggleCandidate: externalToggleCandidate,
  recentlyVotedCandidateIds: externalRecentlyVoted,
  lastSavedInfo: externalLastSavedInfo,
  onOpenSettings,
  onViewResults,
}) => {
  // Support both external state (from ElectoralHub unified bar) and local state fallback
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const selectedCandidateIds = externalSelectedIds ?? internalSelectedIds;

  const toggleCandidate = externalToggleCandidate ?? ((id: string) => {
    setInternalSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  });

  const recentlyVotedCandidateIds = externalRecentlyVoted ?? [];
  const lastSavedInfo = externalLastSavedInfo ?? null;
  const [isFullScreenBallot, setIsFullScreenBallot] = useState(false);

  // Exit fullscreen on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreenBallot) {
        setIsFullScreenBallot(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreenBallot]);

  // Stable ordering for physical ballot grid (Always 1, 2, 3... 11 matching paper ballot)
  const ballotCardsCandidates = useMemo(() => {
    return [...candidates].sort((a, b) => a.orderIndex - b.orderIndex);
  }, [candidates]);

  // Candidates for Directorio (Positions 1 to 9)
  const directorioCandidates = useMemo(() => {
    return ballotCardsCandidates.filter(
      (c) => c.position === 'DIRECTORIO' || (!c.position?.includes('COMITÉ') && !c.position?.includes('TRIBUNAL'))
    );
  }, [ballotCardsCandidates]);

  // Candidate for Comité Electoral (Guido Colvert Pérez Aguirre)
  const comiteElectoralCandidate = useMemo(() => {
    return ballotCardsCandidates.find(
      (c) => c.position === 'COMITÉ ELECTORAL' || c.orderIndex === 10
    );
  }, [ballotCardsCandidates]);

  // Candidate for Tribunal de Honor (Santiago Alberto Goitia Málaga)
  const tribunalHonorCandidate = useMemo(() => {
    return ballotCardsCandidates.find(
      (c) => c.position === 'TRIBUNAL DE HONOR' || c.orderIndex === 11
    );
  }, [ballotCardsCandidates]);

  // Ranked candidates for the Live Leaderboard (sorted by votes descending)
  const rankedCandidates = useMemo(() => {
    if (stats?.candidates && stats.candidates.length > 0) {
      return stats.candidates;
    }
    return [...candidates].sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));
  }, [stats?.candidates, candidates]);



  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-4">
      {/* Instant Notification Banner upon saving a ballot */}
      {lastSavedInfo && (
        <div className="bg-gradient-to-r from-emerald-950 via-[#062413] to-slate-950 border border-emerald-400/60 rounded-2xl px-4 py-2.5 shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-brand-gold">✓ Boleta #{lastSavedInfo.ballotNumber} registrada:</span>
            <span className="text-xs text-white font-medium">
              {lastSavedInfo.type === 'VALID' ? `${lastSavedInfo.candidateIds.length} voto(s) computado(s)` : `Voto ${lastSavedInfo.type}`}
            </span>
            {lastSavedInfo.candidateNames.length > 0 && (
              <span className="text-xs text-emerald-300 hidden md:inline font-mono">
                ({lastSavedInfo.candidateNames.join(', ')})
              </span>
            )}
          </div>
          <span className="text-[11px] text-gray-400">Total Ánfora: <strong className="text-white font-mono">{stats?.totalBallots}</strong></span>
        </div>
      )}

      {/* PHYSICAL PAPER BALLOT FRAME - Ultra Premium Executive Edition */}
      <div
        className={`transition-all duration-300 ${
          isFullScreenBallot
            ? 'fixed inset-0 z-50 bg-[#010904]/98 backdrop-blur-2xl p-4 sm:p-6 lg:p-8 overflow-y-auto flex flex-col items-center justify-start'
            : 'w-full'
        }`}
      >
        <div className="w-full max-w-[1720px] mx-auto bg-gradient-to-b from-[#031d0e] via-[#052914] to-[#021309] text-white rounded-3xl p-5 sm:p-8 lg:p-10 border-2 border-[#d4af37]/60 shadow-[0_25px_80px_rgba(0,0,0,0.9)] relative overflow-hidden space-y-7 sm:space-y-9">
          {/* Subtle Luxury Club crest watermark in background */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.04]">
            <CrestLogo size="xl" className="w-[650px] h-[750px]" />
          </div>
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[260px] bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[260px] bg-brand-gold/10 rounded-full blur-[130px] pointer-events-none" />

          {/* Header */}
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between border-b-2 border-[#d4af37]/30 pb-5 gap-4">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <CrestLogo size="md" className="w-12 h-14 shrink-0 drop-shadow-md" />
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold bg-brand-gold/15 px-2.5 py-0.5 rounded-full border border-brand-gold/30 inline-block">
                    Papeleta Oficial de Escrutinio Físico
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    CHLS 2026
                  </span>
                </div>
                <h2 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-wide uppercase text-white font-sans mt-0.5 drop-shadow">
                  ELECCIONES DIRECTORIO 2026
                </h2>
                <p className="text-xs text-gray-300">
                  Club Hípico Los Sargentos • Haz clic en cada tarjeta para marcar tu voto con ✕
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsFullScreenBallot(!isFullScreenBallot)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/70 hover:bg-black/90 border border-brand-gold/60 text-brand-gold text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg hover:scale-105 shrink-0"
            >
              {isFullScreenBallot ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span>Salir Pantalla Completa (Esc)</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-brand-gold" />
                  <span>Ocupar Toda la Pantalla</span>
                </>
              )}
            </button>
          </div>

          {/* SECCIÓN 1: DIRECTORIO (Fila 1: 5 postulantes | Fila 2: 4 postulantes centrados) */}
          <div className="space-y-4 sm:space-y-5 relative z-10">
            <div className="flex items-center justify-between border-b border-white/15 pb-2 flex-wrap gap-2">
              <span className="text-xs sm:text-sm font-black uppercase text-brand-gold tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-gold shadow-[0_0_8px_#d4af37]" />
                <span>DIRECTORIO (9 Postulantes)</span>
              </span>
              <span className="text-xs text-gray-300 font-medium">
                Marca hasta 9 postulantes haciendo clic en la tarjeta o casilla
              </span>
            </div>

            {/* Fila 1 de Directorio (5 candidatos simétricos) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-5">
              {directorioCandidates.slice(0, 5).map((cand) => {
                const isSelected = selectedCandidateIds.includes(cand.id);
                const wasJustVoted = recentlyVotedCandidateIds.includes(cand.id);

                return (
                  <div
                    key={cand.id}
                    onClick={() => toggleCandidate(cand.id)}
                    className={`group cursor-pointer select-none transition-all duration-300 rounded-2xl relative overflow-hidden flex flex-col items-center p-3 sm:p-4 text-center ${
                      wasJustVoted
                        ? 'ring-4 ring-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.7)] scale-105 -translate-y-1.5 animate-pulse'
                        : isSelected
                        ? 'ring-4 ring-brand-gold shadow-[0_0_35px_rgba(212,175,55,0.6)] scale-105 -translate-y-1'
                        : 'hover:scale-[1.02] hover:-translate-y-1 shadow-xl hover:shadow-2xl'
                    }`}
                    style={{
                      backgroundColor: isSelected ? '#0b4a26' : '#072e18',
                      border: wasJustVoted
                        ? '3px solid #34d399'
                        : isSelected
                        ? '3px solid #d4af37'
                        : '2px solid rgba(212, 175, 55, 0.4)',
                    }}
                  >
                    {wasJustVoted && (
                      <div className="absolute top-2 right-2 z-20 bg-emerald-400 text-black text-[9px] font-black px-2 py-0.5 rounded shadow-lg animate-bounce">
                        +1 VOTO
                      </div>
                    )}

                    {/* Photo Container */}
                    <div className="w-full h-32 sm:h-36 lg:h-40 bg-black/50 rounded-xl border border-white/10 overflow-hidden mb-2.5 shrink-0 flex items-center justify-center relative shadow-inner">
                      {cand.photoUrl ? (
                        <img
                          src={cand.photoUrl}
                          alt={cand.fullName}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-[#092212] to-black flex flex-col items-center justify-center text-white/50 p-2">
                          <div className="w-10 h-10 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center mb-1 text-brand-gold">
                            <CrestLogo size="sm" className="w-6 h-6 opacity-60" />
                          </div>
                          <span className="text-[10px] font-bold text-brand-gold/80">Postulante #{cand.orderIndex}</span>
                        </div>
                      )}
                      <span className="absolute top-1.5 left-1.5 bg-black/85 text-brand-gold text-[10px] font-mono font-black px-2 py-0.5 rounded border border-brand-gold/40 shadow">
                        #{cand.orderIndex}
                      </span>
                    </div>

                    {/* Candidate Name in EXACTLY TWO LINES */}
                    {(() => {
                      const { line1, line2 } = formatNameInTwoLines(cand.fullName);
                      return (
                        <div className="h-10 sm:h-11 flex flex-col items-center justify-center px-1 mb-2.5 leading-tight overflow-hidden w-full">
                          <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight truncate w-full group-hover:text-amber-300 transition-colors drop-shadow-sm">
                            {line1}
                          </span>
                          <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight truncate w-full group-hover:text-amber-300 transition-colors drop-shadow-sm">
                            {line2 || '\u00A0'}
                          </span>
                        </div>
                      );
                    })()}

                    {/* White Voting Box */}
                    <div
                      className={`w-20 h-14 sm:w-24 sm:h-16 rounded-2xl border-3 transition-all flex items-center justify-center relative shadow-md ${
                        isSelected
                          ? 'bg-gradient-to-b from-amber-50 to-emerald-50 border-brand-gold ring-2 ring-brand-gold/60 shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                          : 'bg-white border-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {isSelected ? (
                        <span className="text-3xl sm:text-4xl font-black text-slate-950 leading-none select-none font-sans drop-shadow-sm animate-in zoom-in-75 duration-150">
                          ✕
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest group-hover:text-gray-800">
                          MARCAR
                        </span>
                      )}
                    </div>

                    {/* Live Count on card */}
                    <div className="mt-2.5 pt-2 border-t border-white/10 w-full flex items-center justify-between text-[11px] font-bold px-1 text-amber-300 font-mono">
                      <span>{cand.votesCount || 0} {cand.votesCount === 1 ? 'voto' : 'votos'}</span>
                      <span className="text-emerald-400 font-black">{cand.votesPercentage || 0}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Fila 2 de Directorio (4 candidatos con las MISMAS proporciones y ancho) */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-5 max-w-5xl mx-auto pt-2">
              {directorioCandidates.slice(5, 9).map((cand) => {
                const isSelected = selectedCandidateIds.includes(cand.id);
                const wasJustVoted = recentlyVotedCandidateIds.includes(cand.id);

                return (
                  <div
                    key={cand.id}
                    onClick={() => toggleCandidate(cand.id)}
                    className={`group cursor-pointer select-none transition-all duration-300 rounded-2xl relative overflow-hidden flex flex-col items-center p-3 sm:p-4 text-center ${
                      wasJustVoted
                        ? 'ring-4 ring-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.7)] scale-105 -translate-y-1.5 animate-pulse'
                        : isSelected
                        ? 'ring-4 ring-brand-gold shadow-[0_0_35px_rgba(212,175,55,0.6)] scale-105 -translate-y-1'
                        : 'hover:scale-[1.02] hover:-translate-y-1 shadow-xl hover:shadow-2xl'
                    }`}
                    style={{
                      backgroundColor: isSelected ? '#0b4a26' : '#072e18',
                      border: wasJustVoted
                        ? '3px solid #34d399'
                        : isSelected
                        ? '3px solid #d4af37'
                        : '2px solid rgba(212, 175, 55, 0.4)',
                    }}
                  >
                    {wasJustVoted && (
                      <div className="absolute top-2 right-2 z-20 bg-emerald-400 text-black text-[9px] font-black px-2 py-0.5 rounded shadow-lg animate-bounce">
                        +1 VOTO
                      </div>
                    )}

                    {/* Photo Container */}
                    <div className="w-full h-32 sm:h-36 lg:h-40 bg-black/50 rounded-xl border border-white/10 overflow-hidden mb-2.5 shrink-0 flex items-center justify-center relative shadow-inner">
                      {cand.photoUrl ? (
                        <img
                          src={cand.photoUrl}
                          alt={cand.fullName}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-[#092212] to-black flex flex-col items-center justify-center text-white/50 p-2">
                          <div className="w-10 h-10 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center mb-1 text-brand-gold">
                            <CrestLogo size="sm" className="w-6 h-6 opacity-60" />
                          </div>
                          <span className="text-[10px] font-bold text-brand-gold/80">Postulante #{cand.orderIndex}</span>
                        </div>
                      )}
                      <span className="absolute top-1.5 left-1.5 bg-black/85 text-brand-gold text-[10px] font-mono font-black px-2 py-0.5 rounded border border-brand-gold/40 shadow">
                        #{cand.orderIndex}
                      </span>
                    </div>

                    {/* Candidate Name in EXACTLY TWO LINES */}
                    {(() => {
                      const { line1, line2 } = formatNameInTwoLines(cand.fullName);
                      return (
                        <div className="h-10 sm:h-11 flex flex-col items-center justify-center px-1 mb-2.5 leading-tight overflow-hidden w-full">
                          <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight truncate w-full group-hover:text-amber-300 transition-colors drop-shadow-sm">
                            {line1}
                          </span>
                          <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight truncate w-full group-hover:text-amber-300 transition-colors drop-shadow-sm">
                            {line2 || '\u00A0'}
                          </span>
                        </div>
                      );
                    })()}

                    {/* White Voting Box */}
                    <div
                      className={`w-20 h-14 sm:w-24 sm:h-16 rounded-2xl border-3 transition-all flex items-center justify-center relative shadow-md ${
                        isSelected
                          ? 'bg-gradient-to-b from-amber-50 to-emerald-50 border-brand-gold ring-2 ring-brand-gold/60 shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                          : 'bg-white border-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {isSelected ? (
                        <span className="text-3xl sm:text-4xl font-black text-slate-950 leading-none select-none font-sans drop-shadow-sm animate-in zoom-in-75 duration-150">
                          ✕
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest group-hover:text-gray-800">
                          MARCAR
                        </span>
                      )}
                    </div>

                    {/* Live Count on card */}
                    <div className="mt-2.5 pt-2 border-t border-white/10 w-full flex items-center justify-between text-[11px] font-bold px-1 text-amber-300 font-mono">
                      <span>{cand.votesCount || 0} {cand.votesCount === 1 ? 'voto' : 'votos'}</span>
                      <span className="text-emerald-400 font-black">{cand.votesPercentage || 0}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECCIÓN 2: ÓRGANOS ESPECIALES (COMITÉ ELECTORAL & TRIBUNAL DE HONOR) */}
          <div className="pt-6 border-t-2 border-[#d4af37]/30 relative z-10 space-y-4">
            <div className="text-center">
              <span className="text-xs sm:text-sm font-black uppercase text-brand-gold tracking-widest px-4 py-1 rounded-full bg-brand-gold/15 border border-brand-gold/30 inline-block shadow-sm">
                Órganos Especiales del Club
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* COMITÉ ELECTORAL */}
              {comiteElectoralCandidate && (() => {
                const cand = comiteElectoralCandidate;
                const isSelected = selectedCandidateIds.includes(cand.id);
                const wasJustVoted = recentlyVotedCandidateIds.includes(cand.id);

                return (
                  <div
                    onClick={() => toggleCandidate(cand.id)}
                    className={`group cursor-pointer select-none transition-all duration-300 rounded-2xl relative overflow-hidden flex flex-col items-center p-4 text-center ${
                      wasJustVoted
                        ? 'ring-4 ring-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.7)] scale-105 animate-pulse'
                        : isSelected
                        ? 'ring-4 ring-brand-gold shadow-[0_0_35px_rgba(212,175,55,0.6)] scale-105'
                        : 'hover:scale-[1.02] shadow-xl hover:shadow-2xl'
                    }`}
                    style={{
                      backgroundColor: isSelected ? '#0b4a26' : '#072e18',
                      border: wasJustVoted
                        ? '3px solid #34d399'
                        : isSelected
                        ? '3px solid #d4af37'
                        : '2px solid #10b981',
                    }}
                  >
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/50 mb-3 block">
                      COMITÉ ELECTORAL
                    </span>

                    {/* Photo Container */}
                    <div className="w-full h-36 sm:h-40 bg-black/50 rounded-xl border border-emerald-500/30 overflow-hidden mb-2.5 shrink-0 flex items-center justify-center relative shadow-inner">
                      {cand.photoUrl ? (
                        <img src={cand.photoUrl} alt={cand.fullName} className="w-full h-full object-cover object-top" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-[#092212] to-black flex flex-col items-center justify-center text-white/50 p-2">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mb-1 text-emerald-400">
                            <CrestLogo size="sm" className="w-6 h-6 opacity-60" />
                          </div>
                          <span className="text-[10px] font-bold text-emerald-300">Postulante #{cand.orderIndex}</span>
                        </div>
                      )}
                      <span className="absolute top-1.5 left-1.5 bg-black/85 text-brand-gold text-[10px] font-mono font-black px-2 py-0.5 rounded border border-brand-gold/40 shadow">
                        #{cand.orderIndex}
                      </span>
                    </div>

                    {/* Candidate Name */}
                    {(() => {
                      const { line1, line2 } = formatNameInTwoLines(cand.fullName);
                      return (
                        <div className="h-10 sm:h-11 flex flex-col items-center justify-center px-1 mb-2.5 leading-tight overflow-hidden w-full">
                          <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight truncate w-full group-hover:text-amber-300 transition-colors drop-shadow-sm">
                            {line1}
                          </span>
                          <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight truncate w-full group-hover:text-amber-300 transition-colors drop-shadow-sm">
                            {line2 || '\u00A0'}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Voting Box */}
                    <div
                      className={`w-20 h-14 sm:w-24 sm:h-16 rounded-2xl border-3 transition-all flex items-center justify-center relative shadow-md ${
                        isSelected
                          ? 'bg-gradient-to-b from-amber-50 to-emerald-50 border-brand-gold ring-2 ring-brand-gold/60 shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                          : 'bg-white border-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {isSelected ? (
                        <span className="text-3xl sm:text-4xl font-black text-slate-950 leading-none select-none font-sans drop-shadow-sm">
                          ✕
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                          MARCAR
                        </span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="mt-2.5 pt-2 border-t border-white/10 w-full flex items-center justify-between text-[11px] font-bold px-1 text-amber-300 font-mono">
                      <span>{cand.votesCount || 0} {cand.votesCount === 1 ? 'voto' : 'votos'}</span>
                      <span className="text-emerald-400 font-black">{cand.votesPercentage || 0}%</span>
                    </div>
                  </div>
                );
              })()}

              {/* TRIBUNAL DE HONOR */}
              {tribunalHonorCandidate && (() => {
                const cand = tribunalHonorCandidate;
                const isSelected = selectedCandidateIds.includes(cand.id);
                const wasJustVoted = recentlyVotedCandidateIds.includes(cand.id);

                return (
                  <div
                    onClick={() => toggleCandidate(cand.id)}
                    className={`group cursor-pointer select-none transition-all duration-300 rounded-2xl relative overflow-hidden flex flex-col items-center p-4 text-center ${
                      wasJustVoted
                        ? 'ring-4 ring-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.7)] scale-105 animate-pulse'
                        : isSelected
                        ? 'ring-4 ring-brand-gold shadow-[0_0_35px_rgba(212,175,55,0.6)] scale-105'
                        : 'hover:scale-[1.02] shadow-xl hover:shadow-2xl'
                    }`}
                    style={{
                      backgroundColor: isSelected ? '#5c3f03' : '#3d2b04',
                      border: wasJustVoted
                        ? '3px solid #34d399'
                        : isSelected
                        ? '3px solid #d4af37'
                        : '2px solid #ca8a04',
                    }}
                  >
                    <span className="text-xs font-black uppercase tracking-wider text-yellow-300 bg-yellow-950/80 px-3 py-1 rounded-full border border-yellow-500/50 mb-3 block">
                      TRIBUNAL DE HONOR
                    </span>

                    {/* Photo Container */}
                    <div className="w-full h-36 sm:h-40 bg-black/50 rounded-xl border border-yellow-500/30 overflow-hidden mb-2.5 shrink-0 flex items-center justify-center relative shadow-inner">
                      {cand.photoUrl ? (
                        <img src={cand.photoUrl} alt={cand.fullName} className="w-full h-full object-cover object-top" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-[#2e1d03] to-black flex flex-col items-center justify-center text-white/50 p-2">
                          <div className="w-10 h-10 rounded-full bg-yellow-500/15 border border-yellow-500/40 flex items-center justify-center mb-1 text-yellow-400">
                            <CrestLogo size="sm" className="w-6 h-6 opacity-60" />
                          </div>
                          <span className="text-[10px] font-bold text-yellow-300">Postulante #{cand.orderIndex}</span>
                        </div>
                      )}
                      <span className="absolute top-1.5 left-1.5 bg-black/85 text-brand-gold text-[10px] font-mono font-black px-2 py-0.5 rounded border border-brand-gold/40 shadow">
                        #{cand.orderIndex}
                      </span>
                    </div>

                    {/* Candidate Name */}
                    {(() => {
                      const { line1, line2 } = formatNameInTwoLines(cand.fullName);
                      return (
                        <div className="h-10 sm:h-11 flex flex-col items-center justify-center px-1 mb-2.5 leading-tight overflow-hidden w-full">
                          <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight truncate w-full group-hover:text-amber-300 transition-colors drop-shadow-sm">
                            {line1}
                          </span>
                          <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight truncate w-full group-hover:text-amber-300 transition-colors drop-shadow-sm">
                            {line2 || '\u00A0'}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Voting Box */}
                    <div
                      className={`w-20 h-14 sm:w-24 sm:h-16 rounded-2xl border-3 transition-all flex items-center justify-center relative shadow-md ${
                        isSelected
                          ? 'bg-gradient-to-b from-amber-50 to-emerald-50 border-brand-gold ring-2 ring-brand-gold/60 shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                          : 'bg-white border-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {isSelected ? (
                        <span className="text-3xl sm:text-4xl font-black text-slate-950 leading-none select-none font-sans drop-shadow-sm">
                          ✕
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                          MARCAR
                        </span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="mt-2.5 pt-2 border-t border-white/10 w-full flex items-center justify-between text-[11px] font-bold px-1 text-amber-300 font-mono">
                      <span>{cand.votesCount || 0} {cand.votesCount === 1 ? 'voto' : 'votos'}</span>
                      <span className="text-yellow-400 font-black">{cand.votesPercentage || 0}%</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

