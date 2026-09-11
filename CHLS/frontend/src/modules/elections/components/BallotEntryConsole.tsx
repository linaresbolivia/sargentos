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
  CheckCircle2,
  FileDown,
  Lock
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
  onRegisterBallot?: (type: 'VALID' | 'BLANK' | 'NULL') => void;
  onUndo?: () => void;
  onClearSelection?: () => void;
  isSubmitting?: boolean;
  onExportResults?: () => void;
  onBallotRegistered?: (newStats: ElectionStatsDto) => void;
  onOpenSettings?: () => void;
  onViewResults?: () => void;
}

export const BallotEntryConsole: React.FC<BallotEntryConsoleProps> = ({
  electionId,
  candidates,
  stats,
  maxSelections = 11,
  selectedCandidateIds: externalSelectedIds,
  toggleCandidate: externalToggleCandidate,
  recentlyVotedCandidateIds: externalRecentlyVoted,
  lastSavedInfo: externalLastSavedInfo,
  onRegisterBallot,
  onUndo,
  onClearSelection,
  isSubmitting = false,
  onExportResults,
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

  // Helper to render a candidate card matching the physical paper ballot: [Foto arriba] - [Nombre al centro] - [Casilla blanca abajo]
  const isClosed = stats?.status === 'FINALIZADA' || stats?.status === 'PROCLAMADA';

  const renderVerticalBallotCard = (
    cand: CandidateDto,
    theme: 'DIRECTORIO' | 'COMITE' | 'TRIBUNAL' = 'DIRECTORIO'
  ) => {
    const isSelected = selectedCandidateIds.includes(cand.id);
    const wasJustVoted = recentlyVotedCandidateIds.includes(cand.id);
    const photoSrc = cand.photoUrl || CANDIDATE_PHOTO_MAP[cand.orderIndex];

    const isWhiteTheme = theme === 'COMITE' || theme === 'TRIBUNAL';

    return (
      <div
        key={cand.id}
        onClick={() => {
          if (isClosed) {
            toast.error('Esta votación está cerrada en el historial (modo sólo lectura).');
            return;
          }
          toggleCandidate(cand.id);
        }}
        className={`group select-none transition-all duration-150 rounded-2xl relative overflow-hidden flex flex-col items-center justify-between p-2 sm:p-2.5 shadow-md ${
          isClosed ? 'cursor-not-allowed opacity-85' : 'cursor-pointer'
        } ${
          wasJustVoted
            ? 'ring-4 ring-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.8)] scale-[1.02]'
            : isSelected
            ? isWhiteTheme
              ? theme === 'COMITE'
                ? 'ring-4 ring-emerald-500 bg-white shadow-[0_0_25px_rgba(16,185,129,0.7)] scale-[1.02]'
                : 'ring-4 ring-yellow-500 bg-white shadow-[0_0_25px_rgba(234,179,8,0.7)] scale-[1.02]'
              : 'ring-2 ring-emerald-400 bg-[#0e3b1f] shadow-[0_0_20px_rgba(52,211,153,0.5)] scale-[1.02]'
            : isWhiteTheme
            ? 'bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-slate-400 hover:scale-[1.01]'
            : 'bg-[#0a2717] hover:bg-[#0e351f] border-2 border-[#165b33] hover:border-brand-gold/60 hover:scale-[1.01]'
        }`}
      >
        {wasJustVoted && (
          <div className="absolute top-1.5 right-1.5 z-20 bg-emerald-400 text-black text-[9px] font-black px-2 py-0.5 rounded shadow-lg animate-bounce">
            +1 VOTO
          </div>
        )}

        {/* 1. PARTE SUPERIOR: FOTO DEL POSTULANTE CON NÚMERO */}
        <div className="relative w-full flex justify-center mb-1">
          <div className="relative">
            <img
              src={photoSrc}
              alt={cand.fullName}
              loading="lazy"
              decoding="async"
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-22 md:h-22 rounded-xl object-cover object-top border-2 border-white/95 shadow-md group-hover:scale-105 transition-transform duration-150"
            />
            <span className="absolute -top-1 -left-1 bg-black/85 text-brand-gold font-mono font-black text-[10px] px-1.5 py-0.2 rounded border border-brand-gold/40 shadow">
              #{cand.orderIndex}
            </span>
          </div>
        </div>

        {/* 2. CENTRO: NOMBRE DEL POSTULANTE */}
        <div className="w-full text-center px-1 my-1">
          <span
            className={`text-xs sm:text-[13px] font-bold uppercase tracking-tight leading-snug line-clamp-2 min-h-[34px] flex items-center justify-center ${
              isWhiteTheme ? 'text-slate-900' : 'text-white group-hover:text-amber-300'
            }`}
          >
            {cand.fullName}
          </span>
          <span
            className={`text-[9px] font-mono block mt-0.5 ${
              isWhiteTheme ? 'text-slate-600' : 'text-emerald-400/80'
            }`}
          >
            {cand.votesCount || 0} v ({cand.votesPercentage || 0}%)
          </span>
        </div>

        {/* 3. PARTE INFERIOR: CASILLA BLANCA DE VOTACIÓN (COMO EN LA BOLETA FÍSICA) */}
        <div className="w-full flex justify-center pt-1">
          <div
            className={`w-11 h-11 sm:w-12 sm:h-12 md:w-13 md:h-13 rounded-xl border-2 transition-all duration-150 flex items-center justify-center shadow-inner ${
              isSelected
                ? 'bg-white border-emerald-500 ring-2 ring-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : 'bg-white border-slate-300 group-hover:border-slate-400'
            }`}
          >
            {isSelected ? (
              <span className="text-3xl sm:text-4xl font-black text-slate-950 leading-none select-none font-sans animate-in zoom-in-75 duration-100">
                ✕
              </span>
            ) : (
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider group-hover:text-slate-500">
                VOTO
              </span>
            )}
          </div>
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

            {isFullScreenBallot && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFullScreenBallot(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/90 border border-brand-gold/40 text-brand-gold text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow hover:scale-105 shrink-0"
                  title="Salir Pantalla Completa"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Salir (Esc)</span>
                </button>
              </div>
            )}
          </div>

          {/* BANNER SI ESTÁ CERRADA */}
          {stats && (stats.status === 'FINALIZADA' || stats.status === 'PROCLAMADA') && (
            <div className="bg-gradient-to-r from-amber-950/90 via-[#261907] to-amber-950/90 border-2 border-brand-gold/60 rounded-2xl p-3 sm:p-4 flex items-center gap-3 text-amber-200 shadow-xl mb-3">
              <Lock className="w-6 h-6 text-brand-gold shrink-0" />
              <div>
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-brand-gold block">
                  Votación Cerrada y Guardada en el Historial (Sólo Lectura)
                </span>
                <span className="text-xs text-gray-300">
                  El ingreso de nuevas boletas está bloqueado para preservar la integridad del escrutinio oficial. Puedes consultar el historial o aperturar una nueva votación.
                </span>
              </div>
            </div>
          )}

          {/* DISTRIBUCIÓN EXACTA DE LA BOLETA FÍSICA */}
          <div className="space-y-4 relative z-10">
            {/* FILA 1: DIRECTORIO (1 AL 5) - 5 Postulantes en horizontal */}
            <div>
              <div className="flex items-center justify-between px-1 mb-1.5">
                <span className="text-xs font-black uppercase text-brand-gold tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-gold shadow-[0_0_8px_#d4af37]" />
                  <span>DIRECTORIO (1 AL 5)</span>
                </span>
                <span className="text-[10px] text-emerald-400/80 font-mono font-bold">5 Postulantes</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3.5">
                {directorioCol1.map((cand) => renderVerticalBallotCard(cand, 'DIRECTORIO'))}
              </div>
            </div>

            {/* FILA 2: DIRECTORIO (6 AL 9) - 4 Postulantes centrados */}
            <div>
              <div className="flex items-center justify-between px-1 mb-1.5">
                <span className="text-xs font-black uppercase text-brand-gold tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-gold shadow-[0_0_8px_#d4af37]" />
                  <span>DIRECTORIO (6 AL 9)</span>
                </span>
                <span className="text-[10px] text-emerald-400/80 font-mono font-bold">4 Postulantes</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3.5">
                {directorioCol2.map((cand) => (
                  <div
                    key={cand.id}
                    className="w-[calc(50%-0.625rem)] sm:w-[calc(33.333%-0.75rem)] md:w-[calc((100%-4*0.875rem)/5)]"
                  >
                    {renderVerticalBallotCard(cand, 'DIRECTORIO')}
                  </div>
                ))}
              </div>
            </div>

            {/* FILA 3: ÓRGANOS ESPECIALES (COMITÉ ELECTORAL & TRIBUNAL DE HONOR) */}
            <div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 sm:gap-3.5 items-stretch">
                {/* Bloque 1: COMITÉ ELECTORAL (Alineado bajo columnas 1 y 2) */}
                <div className="md:col-span-2 bg-[#0c381c]/90 border-2 border-emerald-500/60 rounded-2xl p-3 shadow-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-400/30 px-1">
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-300">
                      COMITÉ ELECTORAL
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">Postulante #10</span>
                  </div>
                  <div className="flex justify-center flex-1 items-center py-1">
                    {comiteElectoralCandidate && (
                      <div className="w-full max-w-[260px]">
                        {renderVerticalBallotCard(comiteElectoralCandidate, 'COMITE')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bloque 2: TRIBUNAL DE HONOR (Alineado bajo columnas 3 y 4) */}
                <div className="md:col-span-2 bg-[#78350f]/60 border-2 border-yellow-500/70 rounded-2xl p-3 shadow-lg flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-yellow-500/40 px-1">
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-yellow-300">
                      TRIBUNAL DE HONOR
                    </span>
                    <span className="text-[10px] text-yellow-400 font-mono font-bold">Postulante #11</span>
                  </div>
                  <div className="flex justify-center flex-1 items-center py-1">
                    {tribunalHonorCandidate && (
                      <div className="w-full max-w-[260px]">
                        {renderVerticalBallotCard(tribunalHonorCandidate, 'TRIBUNAL')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bloque 3: Helper / Instrucciones (Alineado bajo columna 5) */}
                <div className="md:col-span-1 bg-black/40 border border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-2 shadow-inner">
                  <span className="text-[10px] text-brand-gold uppercase font-bold tracking-wider">
                    Escrutinio Físico
                  </span>
                  <div className="text-xs text-gray-300 space-y-1.5 font-mono">
                    <p className="text-[11px]">
                      <strong className="text-white font-bold">✕ Marcar:</strong> Clic en tarjeta
                    </p>
                    <p className="text-[11px]">
                      <strong className="text-brand-gold font-bold">↵ Enter:</strong> Guardar boleta
                    </p>
                  </div>
                  <div className="mt-1 pt-1.5 border-t border-white/10 w-full text-center">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">
                      11 Postulantes en Boleta
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PIE DEL FORMULARIO DE REGISTRO DE VOTOS (ACTION FOOTER) */}
          <div className="relative z-10 pt-2 border-t-2 border-brand-gold/30 flex flex-wrap items-center justify-between gap-3 bg-[#020d06]/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 shadow-2xl">
            {/* LADO IZQUIERDO: RESUMEN Y CONTADOR DE MARCAS */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-black/70 rounded-xl border border-white/10 text-xs font-mono">
                <span className="text-brand-gold font-bold">
                  Boleta <strong className="text-white">#{(stats?.totalBallots || 0) + 1}</strong>
                </span>
                <span className="text-white/20">|</span>
                <span className="text-gray-300">
                  Ánfora: <strong className="text-white">{stats?.totalBallots || 0}</strong>
                </span>
                <span className="text-white/20">|</span>
                <span className="text-emerald-400 font-bold">
                  Marcas: <strong>{selectedCandidateIds.length}</strong>
                </span>
              </div>

              {selectedCandidateIds.length > 0 && onClearSelection && (
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="text-xs text-rose-400 hover:text-rose-300 underline font-semibold transition-colors cursor-pointer"
                  title="Desmarcar todas las selecciones"
                >
                  Limpiar Selección
                </button>
              )}
            </div>

            {/* LADO DERECHO: LOS 3 BOTONES DE ACCIÓN + DESHACER */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* 1. BOTÓN REGISTRAR VÁLIDO */}
              <button
                type="button"
                onClick={() => onRegisterBallot?.('VALID')}
                disabled={isSubmitting || isClosed || selectedCandidateIds.length === 0}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer shadow-lg ${
                  !isClosed && selectedCandidateIds.length > 0
                    ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-300/80 ring-2 ring-emerald-400/50 hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-pulse'
                    : 'bg-emerald-950/40 text-emerald-600 border border-emerald-900/40 cursor-not-allowed opacity-50'
                }`}
                title={isClosed ? 'Votación cerrada' : 'Registrar boleta válida (tecla Enter)'}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Registrar ({selectedCandidateIds.length})</span>
                <kbd className="hidden sm:inline text-[10px] bg-black/40 px-1.5 py-0.5 rounded border border-white/20 text-brand-gold font-mono font-bold">
                  ↵ Enter
                </kbd>
              </button>

              {/* 2. BOTÓN VOTO BLANCO */}
              <button
                type="button"
                onClick={() => onRegisterBallot?.('BLANK')}
                disabled={isSubmitting || isClosed}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all shadow ${
                  isClosed
                    ? 'bg-slate-900/40 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600/50 cursor-pointer hover:scale-105 active:scale-95'
                }`}
                title={isClosed ? 'Votación cerrada' : 'Registrar boleta sin marcas (Voto en Blanco)'}
              >
                <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
                <span>Blanco</span>
              </button>

              {/* 3. BOTÓN VOTO NULO */}
              <button
                type="button"
                onClick={() => onRegisterBallot?.('NULL')}
                disabled={isSubmitting || isClosed}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all shadow ${
                  isClosed
                    ? 'bg-rose-950/30 text-rose-800 border border-rose-950 cursor-not-allowed opacity-50'
                    : 'bg-rose-950/70 hover:bg-rose-900 text-rose-300 hover:text-rose-100 border border-rose-500/50 cursor-pointer hover:scale-105 active:scale-95'
                }`}
                title={isClosed ? 'Votación cerrada' : 'Registrar boleta anulada (Voto Nulo)'}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                <span>Nulo</span>
              </button>

              {/* 4. BOTÓN DESHACER */}
              {onUndo && (
                <button
                  type="button"
                  onClick={onUndo}
                  disabled={isSubmitting || isClosed || (stats?.totalBallots || 0) === 0}
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 hover:text-amber-200 border border-amber-500/40 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow hover:scale-105 active:scale-95"
                  title="Deshacer última boleta registrada"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Deshacer</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

