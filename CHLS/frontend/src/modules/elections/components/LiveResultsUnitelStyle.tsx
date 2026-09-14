import React from 'react';
import {
  CandidateDto,
  ElectionStatsDto,
  formatNameInTwoLines,
  CANDIDATE_PHOTO_MAP,
  isSpecialOrganCandidate,
  isDirectorioCandidate,
} from '../types/election.types';
import { CrestLogo } from '@shared/components/CrestLogo';
import { Award, BarChart3, CheckSquare, Flame, Layers, Radio, Users } from 'lucide-react';

interface LiveResultsUnitelStyleProps {
  stats: ElectionStatsDto;
  isDualView?: boolean;
}

export const LiveResultsUnitelStyle: React.FC<LiveResultsUnitelStyleProps> = ({ stats, isDualView = false }) => {
  const [activeCategory, setActiveCategory] = React.useState<'DIRECTORIO' | 'COMITE_Y_TRIBUNAL' | 'TODOS'>('DIRECTORIO');

  const filteredCandidates = React.useMemo(() => {
    const list = stats?.candidates || [];
    if (activeCategory === 'DIRECTORIO') {
      const dir = list.filter(isDirectorioCandidate);
      if (isDualView) {
        return [...dir].sort((a, b) => a.orderIndex - b.orderIndex);
      }
      return dir;
    }
    if (activeCategory === 'COMITE_Y_TRIBUNAL') {
      return list
        .filter(isSpecialOrganCandidate)
        .sort((a, b) => a.orderIndex - b.orderIndex);
    }
    // Para 'TODOS':
    const directorio = list.filter(isDirectorioCandidate);
    const especiales = list
      .filter(isSpecialOrganCandidate)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    if (isDualView) {
      return [
        ...[...directorio].sort((a, b) => a.orderIndex - b.orderIndex),
        ...especiales,
      ];
    }

    return [...directorio, ...especiales];
  }, [stats?.candidates, activeCategory, isDualView]);

  const candidates = filteredCandidates;
  const isTwoCandidates = candidates.length <= 2;
  const isTodos = candidates.length > 9;

  // Splitting candidates into two rows for DUAL_VIEW
  const { row1Candidates, row2Candidates, row1Label, row2Label } = React.useMemo(() => {
    if (!isDualView || candidates.length <= 2) {
      return {
        row1Candidates: candidates,
        row2Candidates: [] as CandidateDto[],
        row1Label: '',
        row2Label: '',
      };
    }

    if (activeCategory === 'DIRECTORIO') {
      return {
        row1Candidates: candidates.slice(0, 5),
        row2Candidates: candidates.slice(5),
        row1Label: 'Directorio • Casillas 1 al 5',
        row2Label: 'Directorio • Casillas 6 al 9',
      };
    }

    if (activeCategory === 'TODOS') {
      return {
        row1Candidates: candidates.slice(0, 6),
        row2Candidates: candidates.slice(6),
        row1Label: 'Directorio • Casillas 1 al 6',
        row2Label: 'Directorio (7 al 9) • Comité y Tribunal',
      };
    }

    const mid = Math.ceil(candidates.length / 2);
    return {
      row1Candidates: candidates.slice(0, mid),
      row2Candidates: candidates.slice(mid),
      row1Label: 'Fila 1',
      row2Label: 'Fila 2',
    };
  }, [candidates, isDualView, activeCategory]);

  // Paleta oficial: Exclusivamente Verde, Dorado y Plomo
  const cardColorThemes = [
    {
      name: 'verde',
      bgTop: 'bg-gradient-to-b from-[#0e5c2f] to-[#083b1d]',
      textTop: 'text-white',
      border: 'border-emerald-500/80',
      bar: 'bg-emerald-500',
      nameBg: 'bg-[#052613]',
    },
    {
      name: 'dorado',
      bgTop: 'bg-gradient-to-b from-[#b8860b] to-[#805d05]',
      textTop: 'text-white',
      border: 'border-amber-400',
      bar: 'bg-amber-400',
      nameBg: 'bg-[#4d3702]',
    },
    {
      name: 'plomo',
      bgTop: 'bg-gradient-to-b from-[#475569] to-[#334155]',
      textTop: 'text-white',
      border: 'border-slate-400/80',
      bar: 'bg-slate-400',
      nameBg: 'bg-[#1e293b]',
    },
  ];

  const renderUnitelCard = (cand: CandidateDto, idx: number, isDualRow = false) => {
    const theme =
      cand.position === 'COMITÉ ELECTORAL'
        ? cardColorThemes[0] // Verde
        : cand.position === 'TRIBUNAL DE HONOR'
        ? cardColorThemes[1] // Dorado
        : cardColorThemes[idx % 3]; // Verde, Dorado, Plomo
    const pct = cand.votesPercentage || 0;
    const isWinner = cand.rank === 1 && (cand.votesCount || 0) > 0;

    return (
      <div
        key={cand.id}
        className={`flex flex-col rounded-xl sm:rounded-2xl border-2 overflow-hidden shadow-xl transition-all duration-300 group hover:-translate-y-1 relative ${
          isDualRow
            ? isTwoCandidates
              ? 'w-44 sm:w-52 shrink-0'
              : isTodos
              ? 'w-[96px] sm:w-[106px] md:w-[116px] shrink-0'
              : 'w-[112px] sm:w-[124px] md:w-[136px] shrink-0'
            : isTwoCandidates
            ? 'w-36 sm:w-40 md:w-44 max-w-[176px] shrink-0'
            : 'flex-1 min-w-0 max-w-[155px]'
        } ${
          isWinner
            ? 'border-brand-gold ring-2 sm:ring-4 ring-brand-gold/50 shadow-[0_0_25px_rgba(212,175,55,0.4)]'
            : theme.border
        }`}
      >
        {/* Top Big Votes Count Box */}
        <div
          className={`w-full ${isDualRow ? 'py-1 sm:py-1.5' : 'py-1.5 sm:py-2'} ${theme.bgTop} ${theme.textTop} flex flex-col items-center justify-center text-center shadow-md relative`}
        >
          {isWinner && (
            <div className="absolute top-0.5 left-1 flex items-center gap-0.5 text-[7px] sm:text-[8px] font-black text-amber-200 uppercase bg-black/60 px-1 py-0.5 rounded">
              <Award className="w-2.5 h-2.5 text-brand-gold" />
              <span>#1</span>
            </div>
          )}
          <span className={`${isDualRow ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl md:text-4xl'} font-black font-mono tracking-tight leading-none drop-shadow-md`}>
            {cand.votesCount || 0}
          </span>
          <span className={`${isDualRow ? 'text-[8px]' : 'text-[10px] sm:text-xs'} uppercase font-black tracking-widest opacity-90 mt-0.5`}>
            {cand.votesCount === 1 ? 'VOTO' : 'VOTOS'}
          </span>
          {cand.orderIndex === 10 || (cand.position || '').toUpperCase().includes('COMIT') ? (
            <span className="text-[7px] uppercase font-bold tracking-wider opacity-90 mt-0.5 text-emerald-300 px-0.5 truncate w-full block text-center">
              COMITÉ ELECTORAL
            </span>
          ) : cand.orderIndex === 11 || (cand.position || '').toUpperCase().includes('TRIBUNAL') ? (
            <span className="text-[7px] uppercase font-bold tracking-wider opacity-90 mt-0.5 text-yellow-300 px-0.5 truncate w-full block text-center">
              TRIBUNAL DE HONOR
            </span>
          ) : null}
        </div>

        {/* Candidate Photo Frame */}
        <div className={`w-full ${isDualRow ? 'h-20 sm:h-24' : 'aspect-[4/5]'} bg-slate-900 overflow-hidden relative`}>
          {cand.photoUrl || CANDIDATE_PHOTO_MAP[cand.orderIndex] ? (
            <img
              src={cand.photoUrl || CANDIDATE_PHOTO_MAP[cand.orderIndex]}
              alt={cand.fullName}
              loading="lazy"
              decoding="async"
              onError={(e) => {
                const target = e.currentTarget;
                const fallback = CANDIDATE_PHOTO_MAP[cand.orderIndex];
                if (fallback && !target.src.endsWith(fallback)) {
                  target.src = fallback;
                } else {
                  target.onerror = null;
                }
              }}
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-gradient-to-b from-slate-900 to-black text-center relative">
              <div className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-0.5 text-white/70">
                <Users className="w-3 h-3 opacity-80" />
              </div>
              <span className="text-[8px] font-black text-white/60 uppercase tracking-wider">
                #{cand.orderIndex}
              </span>
            </div>
          )}
        </div>

        {/* Candidate Name Ribbon in EXACTLY TWO LINES */}
        {(() => {
          const { line1, line2 } = formatNameInTwoLines(cand.fullName);
          return (
            <div
              className={`w-full py-1 px-1 ${theme.nameBg} text-center flex flex-col items-center justify-center ${isDualRow ? 'min-h-[30px] max-h-[32px]' : 'min-h-[42px] sm:min-h-[46px] max-h-[46px]'} overflow-hidden leading-tight`}
            >
              <span className={`${isDualRow ? 'text-[8.5px] sm:text-[9.5px]' : 'text-[10px] sm:text-[11px] md:text-xs'} font-black text-white uppercase tracking-tight truncate w-full block drop-shadow`}>
                {line1}
              </span>
              <span className={`${isDualRow ? 'text-[8.5px] sm:text-[9.5px]' : 'text-[10px] sm:text-[11px] md:text-xs'} font-black text-white uppercase tracking-tight truncate w-full block drop-shadow`}>
                {line2 || '\u00A0'}
              </span>
            </div>
          );
        })()}

        {/* Bottom Percentage Bar */}
        <div className="w-full bg-slate-950 py-1 px-1 border-t border-white/10 flex flex-col items-center justify-center text-center">
          <span className={`${isDualRow ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'} font-black text-emerald-400 font-mono leading-none`}>
            {pct.toFixed(1).replace('.', ',')}%
          </span>
          <span className="text-[6.5px] sm:text-[7.5px] text-gray-400 font-bold uppercase tracking-wider mt-0.5 truncate w-full block">
            de boletas
          </span>
        </div>

        <div className="w-full h-1 bg-white/20" />
      </div>
    );
  };

  return (
    <div className="w-full min-h-[540px] sm:min-h-[580px] p-3 sm:p-4 lg:p-5 rounded-3xl bg-gradient-to-b from-[#0a1526] via-[#0e2039] to-[#060d18] border-2 border-[#c5a059]/50 shadow-2xl relative overflow-hidden select-none flex flex-col justify-between">
      {/* Studio lighting ceiling rig visual effect */}
      <div className="absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-white/10 to-transparent pointer-events-none flex justify-around items-center px-10">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full blur-[2px] ${
              i % 3 === 0
                ? 'bg-amber-400/80 shadow-[0_0_12px_#fbbf24]'
                : i % 2 === 0
                ? 'bg-emerald-400/80 shadow-[0_0_12px_#34d399]'
                : 'bg-white/80 shadow-[0_0_12px_#ffffff]'
            }`}
          />
        ))}
      </div>

      {/* Television Broadcast Header Ribbon */}
      <div className={`relative z-10 w-full flex ${isDualView ? 'flex-col gap-2' : 'flex-col md:flex-row'} items-center justify-between border-b border-white/15 pb-2.5 pt-1 gap-2`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600 text-white font-black text-xs uppercase tracking-wider rounded-md shadow-lg shadow-red-600/40 animate-pulse">
              <Radio className="w-3.5 h-3.5" />
              EN VIVO
            </span>
            <span className="px-2.5 py-1 bg-black/70 text-brand-gold border border-brand-gold/40 font-black text-xs uppercase tracking-wider rounded-md">
              CONTEO RÁPIDO CHLS
            </span>
          </div>

          <div>
            <h1 className="text-base sm:text-lg font-black text-white tracking-wide uppercase">
              {stats.electionTitle}
            </h1>
          </div>
        </div>

        {/* Total Boletas & Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 text-center shadow-xl flex items-center gap-2">
            <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">
              Boletas Procesadas:
            </span>
            <span className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-brand-gold to-yellow-400">
              {stats.totalBallots}
            </span>
          </div>

          <CrestLogo size="sm" className="w-9 h-11 shrink-0 drop-shadow-lg" />
        </div>
      </div>

      {/* Selector de Categorías en Cuadrantes */}
      <div className="relative z-10 w-full flex items-center justify-center pt-2 pb-1">
        <div className={`grid grid-cols-3 gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-black/90 rounded-2xl border-2 border-brand-gold/60 shadow-2xl backdrop-blur-md ${isDualView ? 'w-full' : 'max-w-xl w-full'}`}>
          {/* Botón Cuadrado 1: Directorio */}
          <button
            onClick={() => setActiveCategory('DIRECTORIO')}
            className={`flex flex-col items-center justify-center p-1.5 sm:px-3 sm:py-2 rounded-xl transition-all cursor-pointer border text-center select-none ${
              activeCategory === 'DIRECTORIO'
                ? 'bg-gradient-to-b from-emerald-600 to-teal-800 text-white border-emerald-400 shadow-xl shadow-emerald-700/50 ring-2 ring-emerald-300 scale-[1.02]'
                : 'bg-white/[0.04] text-gray-300 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Users className={`w-3.5 h-3.5 ${activeCategory === 'DIRECTORIO' ? 'text-brand-gold' : 'text-emerald-400'}`} />
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider leading-none">
                Directorio
              </span>
            </div>
            <span
              className={`text-[9.5px] sm:text-[10.5px] font-bold mt-1 px-2 py-0.5 rounded-full leading-none ${
                activeCategory === 'DIRECTORIO'
                  ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-400/40'
                  : 'bg-black/60 text-gray-400 border border-white/10'
              }`}
            >
              9 Postulantes
            </span>
          </button>

          {/* Botón Cuadrado 2: Comité y Tribunal */}
          <button
            onClick={() => setActiveCategory('COMITE_Y_TRIBUNAL')}
            className={`flex flex-col items-center justify-center p-1.5 sm:px-3 sm:py-2 rounded-xl transition-all cursor-pointer border text-center select-none ${
              activeCategory === 'COMITE_Y_TRIBUNAL'
                ? 'bg-gradient-to-b from-amber-400 via-brand-gold to-yellow-500 text-black border-yellow-200 shadow-xl shadow-brand-gold/50 ring-2 ring-yellow-300 scale-[1.02]'
                : 'bg-white/[0.04] text-gray-300 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Award className={`w-3.5 h-3.5 ${activeCategory === 'COMITE_Y_TRIBUNAL' ? 'text-black' : 'text-amber-400'}`} />
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider leading-none">
                Comité y Tribunal
              </span>
            </div>
            <span
              className={`text-[9.5px] sm:text-[10.5px] font-bold mt-1 px-2 py-0.5 rounded-full leading-none ${
                activeCategory === 'COMITE_Y_TRIBUNAL'
                  ? 'bg-amber-950/90 text-amber-200 border border-black/20'
                  : 'bg-black/60 text-gray-400 border border-white/10'
              }`}
            >
              2 Postulantes
            </span>
          </button>

          {/* Botón Cuadrado 3: Ver Todos */}
          <button
            onClick={() => setActiveCategory('TODOS')}
            className={`flex flex-col items-center justify-center p-1.5 sm:px-3 sm:py-2 rounded-xl transition-all cursor-pointer border text-center select-none ${
              activeCategory === 'TODOS'
                ? 'bg-gradient-to-b from-slate-700 to-slate-900 text-cyan-100 border-cyan-400 shadow-xl shadow-cyan-900/50 ring-2 ring-cyan-300 scale-[1.02]'
                : 'bg-white/[0.04] text-gray-400 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Layers className={`w-3.5 h-3.5 ${activeCategory === 'TODOS' ? 'text-cyan-300' : 'text-gray-400'}`} />
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider leading-none">
                Ver Todos
              </span>
            </div>
            <span
              className={`text-[9.5px] sm:text-[10.5px] font-bold mt-1 px-2 py-0.5 rounded-full leading-none ${
                activeCategory === 'TODOS'
                  ? 'bg-cyan-950/80 text-cyan-200 border border-cyan-400/40'
                  : 'bg-black/60 text-gray-400 border border-white/10'
              }`}
            >
              11 en Ánfora
            </span>
          </button>
        </div>
      </div>

      {/* Main Broadcaster Card Area */}
      {isDualView && candidates.length > 2 ? (
        /* MODO DUAL: 2 Filas de Postulantes para ver a TODOS simultáneamente sin recortes */
        <div className="relative z-10 w-full flex-1 flex flex-col justify-start items-center py-2 px-1 gap-2.5 overflow-y-auto">
          {/* Fila 1 */}
          <div className="w-full flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-widest text-brand-gold px-3 py-0.5 rounded-full bg-black/80 border border-brand-gold/40 shadow-sm">
                {row1Label}
              </span>
            </div>
            <div className="flex items-stretch justify-center gap-1.5 sm:gap-2 md:gap-2.5 flex-wrap">
              {row1Candidates.map((cand, idx) => renderUnitelCard(cand, idx, true))}
            </div>
          </div>

          {/* Fila 2 */}
          {row2Candidates.length > 0 && (
            <div className="w-full flex flex-col items-center border-t border-white/15 pt-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-widest text-brand-gold px-3 py-0.5 rounded-full bg-black/80 border border-brand-gold/40 shadow-sm">
                  {row2Label}
                </span>
              </div>
              <div className="flex items-stretch justify-center gap-1.5 sm:gap-2 md:gap-2.5 flex-wrap">
                {row2Candidates.map((cand, idx) => renderUnitelCard(cand, row1Candidates.length + idx, true))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Modo 1 Fila Tradicional */
        <div
          className={`relative z-10 w-full flex-1 flex items-stretch justify-center py-2 sm:py-3 overflow-hidden ${
            isTwoCandidates
              ? 'gap-6 sm:gap-10 md:gap-14'
              : candidates.length > 9
              ? 'gap-1 sm:gap-1.5 md:gap-2'
              : 'gap-1.5 sm:gap-2.5 md:gap-3'
          }`}
        >
          {candidates.map((cand, idx) => renderUnitelCard(cand, idx, false))}
        </div>
      )}

      {/* Television News Ticker Bar */}
      <div className="relative z-10 w-full pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-300 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <span className="font-bold text-white">CONTEO DE MESA:</span>
          <span>
            Total Boletas: <strong className="text-brand-gold">{stats.totalBallots}</strong> | Válidas:{' '}
            <strong className="text-emerald-400">{stats.validBallots}</strong> | Blancas:{' '}
            <strong>{stats.blankBallots}</strong> | Nulas: <strong className="text-rose-400">{stats.nullBallots}</strong>
          </span>
        </div>

        <div className="text-[11px] text-gray-400">
          Club Hípico Los Sargentos • Transmisión Oficial de Resultados
        </div>
      </div>
    </div>
  );
};
