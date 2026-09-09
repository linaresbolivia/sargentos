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

  // Photo mapping for physical ballot candidates
  const CANDIDATE_PHOTO_MAP: Record<number, string> = {
    1: '/elections/karel_rivero.jpg',
    2: '/elections/miguel_chavez.jpg',
    3: '/elections/alvaro_mendoza.jpg',
    4: '/elections/edwin_portocarrero.jpg',
    5: '/elections/mauricio_galindo.jpg',
    6: '/elections/ramiro_vega.jpg',
    7: '/elections/marco_salinas.jpg',
    8: '/elections/carlos_poma.jpg',
    9: '/elections/emilio_barea.jpg',
    10: '/elections/guido_perez.jpg',
    11: '/elections/santiago_goitia.jpg',
  };

  // Stable ordering for physical ballot grid (Always 1, 2, 3... 11 matching paper ballot)
  const ballotCardsCandidates = useMemo(() => {
    return [...candidates].sort((a, b) => a.orderIndex - b.orderIndex);
  }, [candidates]);

  // Columna 1: Directorio 1 al 5
  const directorioCol1 = useMemo(() => {
    return ballotCardsCandidates.filter((c) => c.orderIndex >= 1 && c.orderIndex <= 5);
  }, [ballotCardsCandidates]);

  // Columna 2: Directorio 6 al 9
  const directorioCol2 = useMemo(() => {
    return ballotCardsCandidates.filter((c) => c.orderIndex >= 6 && c.orderIndex <= 9);
  }, [ballotCardsCandidates]);

  // Columna 3: Órganos Especiales (10 Comité Electoral y 11 Tribunal de Honor)
  const comiteElectoralCandidate = useMemo(() => {
    return ballotCardsCandidates.find(
      (c) => c.position === 'COMITÉ ELECTORAL' || c.orderIndex === 10
    );
  }, [ballotCardsCandidates]);

  const tribunalHonorCandidate = useMemo(() => {
    return ballotCardsCandidates.find(
      (c) => c.position === 'TRIBUNAL DE HONOR' || c.orderIndex === 11
    );
  }, [ballotCardsCandidates]);

  // Helper to render a candidate card matching the physical paper ballot: [Casilla] - [Nombre] - [Foto]
  const renderBallotCard = (cand: CandidateDto, badgeLabel?: string, borderClass?: string) => {
    const isSelected = selectedCandidateIds.includes(cand.id);
    const wasJustVoted = recentlyVotedCandidateIds.includes(cand.id);
    const photoSrc = cand.photoUrl || CANDIDATE_PHOTO_MAP[cand.orderIndex];

    return (
      <div
        key={cand.id}
        onClick={() => toggleCandidate(cand.id)}
        className={`group cursor-pointer select-none transition-all duration-150 rounded-xl relative overflow-hidden flex items-center justify-between p-1.5 sm:p-2 ${
          wasJustVoted
            ? 'ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.7)] scale-[1.01] bg-[#0c2e1b]'
            : isSelected
            ? 'ring-2 ring-emerald-400/90 shadow-[0_0_16px_rgba(52,211,153,0.4)] bg-[#0a2c1a]'
            : 'hover:scale-[1.008] shadow-sm hover:shadow-lg bg-[#081b11]/95 hover:bg-[#0c2618]'
        }`}
        style={{
          border: wasJustVoted
            ? '2px solid #34d399'
            : isSelected
            ? '2px solid #10b981'
            : borderClass || '1.5px solid rgba(212, 175, 55, 0.45)',
        }}
      >
        {wasJustVoted && (
          <div className="absolute top-1 right-2 z-20 bg-emerald-400 text-black text-[8px] font-black px-1.5 py-0.2 rounded shadow-lg animate-bounce">
            +1 VOTO
          </div>
        )}

        {/* 1. IZQUIERDA: CASILLA BLANCA DE VOTACIÓN (VERDE ESMERALDA NEÓN SUTIL AL MARCAR) */}
        <div
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-lg border-2 transition-all duration-150 flex items-center justify-center shrink-0 shadow-inner ${
            isSelected
              ? 'bg-emerald-500/25 border-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.6)] ring-1 ring-emerald-400/60'
              : 'bg-white border-slate-300 hover:border-slate-400'
          }`}
        >
          {isSelected ? (
            <span className="text-2xl sm:text-3xl font-black text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.95)] leading-none select-none font-sans animate-in zoom-in-75 duration-100">
              ✕
            </span>
          ) : (
            <span className="text-[8px] text-gray-400 font-black uppercase tracking-wider group-hover:text-gray-600">
              VOTO
            </span>
          )}
        </div>

        {/* 2. CENTRO: NOMBRE DEL POSTULANTE + NÚMERO */}
        <div className="flex-1 px-2.5 flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="bg-black/80 text-brand-gold font-mono font-black text-[10px] px-1.5 py-0.2 rounded border border-brand-gold/30 shrink-0">
              #{cand.orderIndex}
            </span>
            {badgeLabel ? (
              <span
                className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded shrink-0 ${
                  badgeLabel.includes('COMITÉ')
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-950 text-yellow-300 border border-amber-500/40'
                }`}
              >
                {badgeLabel}
              </span>
            ) : (
              <span className="text-[9px] font-mono text-gray-300 font-medium truncate">
                {cand.votesCount || 0} v <span className="text-emerald-400 font-bold">({cand.votesPercentage || 0}%)</span>
              </span>
            )}
          </div>
          <span className="text-xs sm:text-[13px] font-black text-white uppercase tracking-tight leading-tight line-clamp-2 group-hover:text-amber-300 transition-colors drop-shadow-sm">
            {cand.fullName}
          </span>
        </div>

        {/* 3. DERECHA: FOTO OFICIAL DEL POSTULANTE */}
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden border border-white/25 shrink-0 bg-black/70 shadow flex items-center justify-center">
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={cand.fullName}
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-150"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-[#091b2c] to-black flex items-center justify-center text-white/50">
              <CrestLogo size="sm" className="w-4 h-4 opacity-60" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto space-y-2.5">
      {/* Instant Notification Banner upon saving a ballot */}
      {lastSavedInfo && (
        <div className="bg-gradient-to-r from-emerald-950 via-[#062413] to-slate-950 border border-emerald-400/60 rounded-xl px-4 py-1.5 shadow-md flex items-center justify-between gap-3 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
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

      {/* PHYSICAL PAPER BALLOT FRAME - Single Screen Modern Edition */}
      <div
        className={`transition-all duration-300 ${
          isFullScreenBallot
            ? 'fixed inset-0 z-50 bg-[#010904]/98 backdrop-blur-2xl p-3 sm:p-4 overflow-hidden flex flex-col justify-center items-center'
            : 'w-full'
        }`}
      >
        <div className="w-full max-w-[1780px] mx-auto bg-gradient-to-b from-[#061e12] via-[#092918] to-[#04140b] text-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border-2 border-brand-gold/60 shadow-[0_20px_60px_rgba(0,0,0,0.85)] relative overflow-hidden space-y-2.5">
          {/* Subtle crest watermark in background */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.035] filter grayscale-[40%]">
            <CrestLogo size="xl" className="w-[600px] h-[700px]" />
          </div>

          {/* Compact Single-Screen Header */}
          <div className="relative z-10 flex items-center justify-between border-b border-brand-gold/30 pb-2 px-1 gap-3">
            <div className="flex items-center gap-2.5">
              <CrestLogo size="sm" className="w-8 h-10 shrink-0 drop-shadow" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black tracking-wider uppercase text-white font-sans drop-shadow-sm">
                    ELECCIONES DIRECTORIO 2026
                  </h2>
                  <span className="text-[10px] font-black uppercase text-brand-gold px-2 py-0.2 rounded-full bg-brand-gold/15 border border-brand-gold/30">
                    Papeleta Oficial de Escrutinio Físico
                  </span>
                </div>
                <p className="text-[11px] text-gray-300">
                  Haz clic en cualquier tarjeta o casilla para marcar con ✕ • Presiona <kbd className="px-1.5 py-0.2 bg-black/60 rounded border border-white/20 text-brand-gold font-mono font-bold">Enter</kbd> para registrar boleta
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsFullScreenBallot(!isFullScreenBallot)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/90 border border-brand-gold/40 text-brand-gold text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow hover:scale-105 shrink-0"
              title={isFullScreenBallot ? 'Salir Pantalla Completa' : 'Ocupar Toda la Pantalla'}
            >
              {isFullScreenBallot ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Salir (Esc)</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-brand-gold" />
                  <span className="hidden sm:inline">Pantalla Completa</span>
                </>
              )}
            </button>
          </div>

          {/* 3 COLUMNAS EXACTAS COMO EN LA PAPELETA FÍSICA */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5 relative z-10 items-stretch">
            {/* COLUMNA 1: DIRECTORIO (1 AL 5) - 5 postulantes */}
            <div className="lg:col-span-4 flex flex-col space-y-2 justify-between">
              <div className="border-b border-brand-gold/40 pb-1 px-1 flex items-center justify-between">
                <span className="text-xs font-black uppercase text-brand-gold tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-gold shadow-[0_0_6px_#d4af37]" />
                  <span>DIRECTORIO (1 AL 5)</span>
                </span>
                <span className="text-[10px] text-gray-400 font-mono">5 Postulantes</span>
              </div>
              <div className="flex flex-col gap-2 justify-between flex-1">
                {directorioCol1.map((cand) => renderBallotCard(cand))}
              </div>
            </div>

            {/* COLUMNA 2: DIRECTORIO (6 AL 9) - 4 postulantes */}
            <div className="lg:col-span-4 flex flex-col space-y-2 justify-between">
              <div className="border-b border-brand-gold/40 pb-1 px-1 flex items-center justify-between">
                <span className="text-xs font-black uppercase text-brand-gold tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-gold shadow-[0_0_6px_#d4af37]" />
                  <span>DIRECTORIO (6 AL 9)</span>
                </span>
                <span className="text-[10px] text-gray-400 font-mono">4 Postulantes</span>
              </div>
              <div className="flex flex-col gap-2 justify-between flex-1">
                {directorioCol2.map((cand) => renderBallotCard(cand))}
              </div>
            </div>

            {/* COLUMNA 3: ÓRGANOS ESPECIALES (COMITÉ ELECTORAL & TRIBUNAL DE HONOR) */}
            <div className="lg:col-span-4 flex flex-col space-y-2 justify-between">
              <div className="border-b border-emerald-400/40 pb-1 px-1 flex items-center justify-between">
                <span className="text-xs font-black uppercase text-emerald-300 tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  <span>ÓRGANOS ESPECIALES</span>
                </span>
                <span className="text-[10px] text-gray-400 font-mono">2 Postulantes</span>
              </div>

              <div className="flex flex-col gap-3 justify-between flex-1">
                {/* 1. COMITÉ ELECTORAL */}
                {comiteElectoralCandidate && (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/50 shadow-sm">
                        COMITÉ ELECTORAL
                      </span>
                      <span className="text-[9px] text-emerald-400/80 font-mono">Postulante #10</span>
                    </div>
                    {renderBallotCard(comiteElectoralCandidate, 'COMITÉ', '2px solid rgba(16, 185, 129, 0.65)')}
                  </div>
                )}

                {/* 2. TRIBUNAL DE HONOR */}
                {tribunalHonorCandidate && (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-yellow-300 bg-yellow-950/80 px-2.5 py-0.5 rounded-full border border-yellow-500/50 shadow-sm">
                        TRIBUNAL DE HONOR
                      </span>
                      <span className="text-[9px] text-yellow-400/80 font-mono">Postulante #11</span>
                    </div>
                    {renderBallotCard(tribunalHonorCandidate, 'TRIBUNAL', '2px solid rgba(234, 179, 8, 0.65)')}
                  </div>
                )}

                {/* Quick Helper Box inside Columna 3 to perfectly balance vertical height */}
                <div className="bg-black/40 rounded-xl p-2.5 border border-white/10 text-center text-xs text-gray-300 flex items-center justify-around font-mono">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-400 uppercase font-bold">Marcas</span>
                    <span className="text-emerald-400 font-black text-sm">{selectedCandidateIds.length}/9</span>
                  </div>
                  <div className="h-6 w-[1px] bg-white/15" />
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-400 uppercase font-bold">Confirmar</span>
                    <span className="text-brand-gold font-black text-sm">Enter ↵</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

