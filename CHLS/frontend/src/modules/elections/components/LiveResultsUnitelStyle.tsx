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
import { Award, BarChart3, CheckSquare, Flame, Radio, Users } from 'lucide-react';

interface LiveResultsUnitelStyleProps {
  stats: ElectionStatsDto;
}

export const LiveResultsUnitelStyle: React.FC<LiveResultsUnitelStyleProps> = ({ stats }) => {
  const [activeCategory, setActiveCategory] = React.useState<'DIRECTORIO' | 'COMITE_Y_TRIBUNAL' | 'TODOS'>('DIRECTORIO');

  const filteredCandidates = React.useMemo(() => {
    const list = stats?.candidates || [];
    if (activeCategory === 'DIRECTORIO') {
      return list.filter(isDirectorioCandidate);
    }
    if (activeCategory === 'COMITE_Y_TRIBUNAL') {
      return list
        .filter(isSpecialOrganCandidate)
        .sort((a, b) => a.orderIndex - b.orderIndex);
    }
    // Para 'TODOS': Directorio primero (ordenados por votos/ranking), y al final Comité Electoral y Tribunal de Honor
    const directorio = list.filter(isDirectorioCandidate);
    const especiales = list
      .filter(isSpecialOrganCandidate)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    return [...directorio, ...especiales];
  }, [stats?.candidates, activeCategory]);

  const candidates = filteredCandidates;
  const isTwoCandidates = candidates.length <= 2;

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

  return (
    <div className="w-full min-h-[680px] p-6 lg:p-8 rounded-3xl bg-gradient-to-b from-[#0a1526] via-[#0e2039] to-[#060d18] border-2 border-[#c5a059]/50 shadow-2xl relative overflow-hidden select-none flex flex-col justify-between">
      {/* Studio lighting ceiling rig visual effect */}
      <div className="absolute top-0 inset-x-0 h-12 bg-gradient-to-b from-white/10 to-transparent pointer-events-none flex justify-around items-center px-10">
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
      <div className="relative z-10 w-full flex flex-col md:flex-row items-center justify-between border-b border-white/15 pb-5 pt-3 gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white font-black text-xs uppercase tracking-wider rounded-md shadow-lg shadow-red-600/40 animate-pulse">
              <Radio className="w-3.5 h-3.5" />
              EN VIVO
            </span>
            <span className="px-3 py-1 bg-black/70 text-brand-gold border border-brand-gold/40 font-black text-xs uppercase tracking-wider rounded-md">
              CONTEO RÁPIDO CHLS
            </span>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase">
              {stats.electionTitle}
            </h1>
            <p className="text-xs text-gray-300">
              Datos Oficiales en Tiempo Real • Ánfora Principal
            </p>
          </div>
        </div>

        {/* Total Boletas & Logo */}
        <div className="flex items-center gap-5">
          <div className="bg-black/70 backdrop-blur-md px-5 py-2.5 rounded-xl border border-white/20 text-center shadow-xl">
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
              Boletas Procesadas
            </span>
            <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-brand-gold to-yellow-400">
              {stats.totalBallots}
            </span>
          </div>

          <CrestLogo size="md" className="w-12 h-14 shrink-0 drop-shadow-lg" />
        </div>
      </div>

      {/* Category Switcher Buttons */}
      <div className="relative z-10 w-full flex items-center justify-center pt-3 pb-1">
        <div className="flex items-center p-1.5 bg-black/85 rounded-2xl border-2 border-brand-gold/50 shadow-2xl backdrop-blur-md gap-2 flex-wrap justify-center">
          <button
            onClick={() => setActiveCategory('DIRECTORIO')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeCategory === 'DIRECTORIO'
                ? 'bg-gradient-to-r from-emerald-600 via-[#0a5c30] to-teal-700 text-white shadow-xl shadow-emerald-600/40 ring-2 ring-emerald-400 scale-[1.02]'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Users className="w-4 h-4 text-brand-gold" />
            <span>DIRECTORIO 2026 (9 Postulantes)</span>
          </button>

          <button
            onClick={() => setActiveCategory('COMITE_Y_TRIBUNAL')}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeCategory === 'COMITE_Y_TRIBUNAL'
                ? 'bg-gradient-to-r from-amber-500 via-brand-gold to-yellow-500 text-black shadow-xl shadow-brand-gold/40 ring-2 ring-brand-gold scale-[1.02]'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Award className="w-4 h-4 text-emerald-950" />
            <span>COMITÉ ELECTORAL Y TRIBUNAL DE HONOR</span>
          </button>

          <button
            onClick={() => setActiveCategory('TODOS')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeCategory === 'TODOS'
                ? 'bg-white/20 text-white border border-white/40 ring-1 ring-white/50'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>Ver Todos (11)</span>
          </button>
        </div>
      </div>

      {/* Main Broadcaster Card Row (Ordered by Rank) */}
      <div
        className={`relative z-10 w-full flex-1 flex items-center justify-center py-6 overflow-x-auto ${
          isTwoCandidates ? 'gap-12 sm:gap-20' : 'gap-3 sm:gap-4 lg:gap-5'
        }`}
      >
        {candidates.map((cand, idx) => {
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
              className={`shrink-0 flex flex-col rounded-2xl border-2 overflow-hidden shadow-2xl transition-all duration-300 group hover:-translate-y-2 relative ${
                isTwoCandidates ? 'w-48 sm:w-60 lg:w-72' : 'w-28 sm:w-36 lg:w-40'
              } ${
                isWinner
                  ? 'border-brand-gold ring-4 ring-brand-gold/50 shadow-[0_0_35px_rgba(212,175,55,0.4)] scale-105'
                  : theme.border
              }`}
            >
              {/* Top Big Votes Count Box (Television News Style) */}
              <div
                className={`w-full py-2.5 sm:py-3.5 ${theme.bgTop} ${theme.textTop} flex flex-col items-center justify-center text-center shadow-md relative`}
              >
                {isWinner && (
                  <div className="absolute top-1 left-2 flex items-center gap-1 text-[9px] font-black text-amber-200 uppercase bg-black/40 px-1.5 py-0.5 rounded">
                    <Award className="w-3 h-3 text-brand-gold" />
                    <span>#1</span>
                  </div>
                )}
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono tracking-tight leading-none drop-shadow-md">
                  {cand.votesCount || 0}
                </span>
                <span className="text-xs uppercase font-black tracking-widest opacity-90 mt-1">
                  {cand.votesCount === 1 ? 'VOTO' : 'VOTOS'}
                </span>
                {cand.orderIndex === 10 || (cand.position || '').toUpperCase().includes('COMIT') ? (
                  <span className="text-[9px] uppercase font-bold tracking-wider opacity-90 mt-0.5 text-emerald-300">
                    COMITÉ ELECTORAL
                  </span>
                ) : cand.orderIndex === 11 || (cand.position || '').toUpperCase().includes('TRIBUNAL') ? (
                  <span className="text-[9px] uppercase font-bold tracking-wider opacity-90 mt-0.5 text-yellow-300">
                    TRIBUNAL DE HONOR
                  </span>
                ) : null}
              </div>

              {/* Candidate Photo Frame */}
              <div className="w-full h-32 sm:h-40 bg-slate-900 overflow-hidden relative">
                {cand.photoUrl || CANDIDATE_PHOTO_MAP[cand.orderIndex] ? (
                  <img
                    src={cand.photoUrl || CANDIDATE_PHOTO_MAP[cand.orderIndex]}
                    alt={cand.fullName}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-gradient-to-b from-slate-900 to-black text-center relative">
                    <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-1 text-white/70">
                      <Users className="w-5 h-5 opacity-80" />
                    </div>
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-wider">
                      Postulante #{cand.orderIndex}
                    </span>
                  </div>
                )}

                {/* Rank Badge overlay */}
                <div className="absolute bottom-1 right-1 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white">
                  Pos. #{cand.rank || idx + 1}
                </div>
              </div>

              {/* Candidate Name Ribbon in EXACTLY TWO LINES */}
              {(() => {
                const { line1, line2 } = formatNameInTwoLines(cand.fullName);
                return (
                  <div
                    className={`w-full py-2 px-1.5 ${theme.nameBg} text-center flex flex-col items-center justify-center min-h-[50px] max-h-[50px] overflow-hidden leading-tight`}
                  >
                    <span className="text-xs sm:text-[13px] md:text-sm font-black text-white uppercase tracking-tight truncate w-full block drop-shadow">
                      {line1}
                    </span>
                    <span className="text-xs sm:text-[13px] md:text-sm font-black text-white uppercase tracking-tight truncate w-full block drop-shadow">
                      {line2 || '\u00A0'}
                    </span>
                  </div>
                );
              })()}

              {/* Bottom Percentage Bar (with respect to registered ballots) */}
              <div className="w-full bg-slate-950 py-2 px-2 border-t border-white/10 flex flex-col items-center justify-center text-center">
                <span className="text-sm font-black text-emerald-400 font-mono leading-none">
                  {pct.toFixed(1).replace('.', ',')}%
                </span>
                <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                  de boletas en ánfora
                </span>
              </div>

              {/* Reflected floor simulation at card base */}
              <div className="w-full h-1.5 bg-white/20" />
            </div>
          );
        })}
      </div>

      {/* Television News Ticker Bar */}
      <div className="relative z-10 w-full pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-300 gap-3">
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
