import React from 'react';
import { CandidateDto, ElectionStatsDto, formatNameInTwoLines } from '../types/election.types';
import { CrestLogo } from '@shared/components/CrestLogo';
import { Award, CheckCircle2, TrendingUp, Users } from 'lucide-react';

interface LiveResultsPillars3DProps {
  stats: ElectionStatsDto;
}

export const LiveResultsPillars3D: React.FC<LiveResultsPillars3DProps> = ({ stats }) => {
  const [activeCategory, setActiveCategory] = React.useState<'DIRECTORIO' | 'COMITE_Y_TRIBUNAL' | 'TODOS'>('DIRECTORIO');

  const filteredCandidates = React.useMemo(() => {
    if (activeCategory === 'DIRECTORIO') {
      return stats.candidates.filter(
        (c) => c.position === 'DIRECTORIO' || (!c.position && c.orderIndex <= 9)
      );
    }
    if (activeCategory === 'COMITE_Y_TRIBUNAL') {
      return stats.candidates
        .filter(
          (c) =>
            c.position === 'COMITÉ ELECTORAL' ||
            c.position === 'TRIBUNAL DE HONOR' ||
            c.orderIndex > 9
        )
        .sort((a, b) => a.orderIndex - b.orderIndex);
    }
    // Para 'TODOS': Directorio primero (ordenados por votos), y SIEMPRE al final Comité Electoral (#10) y Tribunal de Honor (#11)
    const directorio = stats.candidates.filter(
      (c) => c.position === 'DIRECTORIO' || (!c.position && c.orderIndex <= 9)
    );
    const especiales = stats.candidates
      .filter(
        (c) =>
          c.position === 'COMITÉ ELECTORAL' ||
          c.position === 'TRIBUNAL DE HONOR' ||
          c.orderIndex > 9
      )
      .sort((a, b) => a.orderIndex - b.orderIndex);

    return [...directorio, ...especiales];
  }, [stats.candidates, activeCategory]);

  const candidates = filteredCandidates;
  const isTwoCandidates = candidates.length <= 2;

  // Maximum percentage to scale the 3D columns proportionally (min 10% to prevent zero-height)
  const maxPct = Math.max(...candidates.map((c) => c.votesPercentage || 0), 10);

  return (
    <div className="w-full flex flex-col items-center justify-between min-h-[680px] p-6 lg:p-8 rounded-3xl bg-gradient-to-b from-[#020d06] via-[#04190c] to-[#010804] border-2 border-brand-gold/40 shadow-2xl relative overflow-hidden select-none">
      {/* Background ambient lighting and luxury club watermark */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5">
        <CrestLogo size="xl" className="w-[600px] h-[700px]" />
      </div>
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[300px] bg-brand-gold/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Action Header: Category Switcher & Live Stats Counters */}
      <div className="relative z-10 w-full flex flex-col md:flex-row items-center justify-between border-b border-white/10 pb-4 gap-4">
        {/* Category Switcher Buttons (DIRECTORIO 2026 vs COMITÉ ELECTORAL Y TRIBUNAL DE HONOR) */}
        <div className="flex items-center p-1.5 bg-black/85 rounded-2xl border-2 border-brand-gold/50 shadow-2xl backdrop-blur-md gap-2 flex-wrap justify-center md:justify-start">
          <button
            onClick={() => setActiveCategory('DIRECTORIO')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
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
            className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
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

        {/* Global Stats Counter Pills */}
        <div className="flex items-center gap-3">
          <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-brand-gold/50 text-center shadow-lg">
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
              Boletas en Ánfora
            </span>
            <span className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-brand-gold to-yellow-400">
              {stats.totalBallots}
            </span>
          </div>

          <div className="bg-black/50 px-3.5 py-2 rounded-2xl border border-white/10 text-center">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
              Votos Emitidos
            </span>
            <span className="text-lg sm:text-xl font-black text-white">
              {stats.totalVotesAccumulated}
            </span>
          </div>

          <div className="bg-black/50 px-3.5 py-2 rounded-2xl border border-white/10 text-center hidden sm:block">
            <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
              Blanco / Nulo
            </span>
            <span className="text-sm font-bold text-gray-300">
              {stats.blankBallots} / {stats.nullBallots}
            </span>
          </div>
        </div>
      </div>

      {/* Main 3D Columns Stage */}
      <div
        className={`relative z-10 w-full flex-1 flex items-end justify-center pt-16 pb-6 px-3 overflow-x-auto min-h-[460px] scrollbar-thin scrollbar-thumb-brand-gold/30 ${
          isTwoCandidates ? 'gap-12 sm:gap-20 lg:gap-28' : 'gap-3 sm:gap-4 lg:gap-5'
        }`}
      >
        {candidates.map((cand, idx) => {
          const pct = cand.votesPercentage || 0;
          // Calculate column height percentage (minimum 16% for visual aesthetics, up to 88%)
          const heightPercent = stats.totalBallots > 0 ? Math.max(16, (pct / maxPct) * 85) : 16;
          const isLeader = cand.rank === 1 && (cand.votesCount || 0) > 0;

          const votes = cand.votesCount || 0;
          const hasVotes = votes > 0;

          // Sovereign luxury palette: Royal Imperial Emerald, Champagne 24K Gold & Platinum Silk
          let pillarColor;
          if (isLeader) {
            // 1st Place / Absolute Leader: Imperial Royal Emerald with glowing 24K Gold Crown
            pillarColor = {
              front: 'from-[#0e5c32] via-[#093e21] to-[#041d0e]',
              side: 'from-[#072f19] to-[#021108]',
              top: 'bg-gradient-to-r from-[#ffe89e] via-[#d4af37] to-[#9e7a20]',
              badgeBorder: 'border-[#d4af37] ring-2 ring-[#d4af37]/60 shadow-[0_0_25px_rgba(212,175,55,0.45)]',
              badgeBg: 'bg-gradient-to-b from-[#0e2717] to-[#020b05]',
              badgeVotesColor: 'text-[#fef08a]',
              badgeVotesLabel: 'text-[#d4af37]',
              cardBorder: 'border-[#d4af37] ring-2 ring-[#d4af37]/50 shadow-[0_0_25px_rgba(212,175,55,0.35)]',
            };
          } else if (cand.position === 'TRIBUNAL DE HONOR') {
            // Tribunal de Honor: Antique Royal Gold Monolith
            pillarColor = {
              front: 'from-[#6b4e07] via-[#473303] to-[#241a01]',
              side: 'from-[#332502] to-[#140e00]',
              top: 'bg-gradient-to-r from-[#fef08a] via-[#eab308] to-[#a16207]',
              badgeBorder: 'border-yellow-400/80 shadow-[0_8px_20px_rgba(0,0,0,0.8)]',
              badgeBg: 'bg-[#1f1501]',
              badgeVotesColor: 'text-yellow-100',
              badgeVotesLabel: 'text-yellow-400',
              cardBorder: 'border-yellow-500/80 ring-1 ring-yellow-400/30',
            };
          } else if (cand.position === 'COMITÉ ELECTORAL') {
            // Comité Electoral: Sovereign Club Emerald Monolith
            pillarColor = {
              front: 'from-[#0b542c] via-[#06331a] to-[#031a0d]',
              side: 'from-[#042010] to-[#020d06]',
              top: 'bg-gradient-to-r from-[#86efac] via-[#22c55e] to-[#15803d]',
              badgeBorder: 'border-emerald-400/80 shadow-[0_8px_20px_rgba(0,0,0,0.8)]',
              badgeBg: 'bg-[#041a0d]',
              badgeVotesColor: 'text-emerald-100',
              badgeVotesLabel: 'text-emerald-400',
              cardBorder: 'border-emerald-500/80 ring-1 ring-emerald-400/30',
            };
          } else if (hasVotes) {
            // Directorio candidates with votes: British Racing Emerald Monolith with Champagne Gold Capital
            pillarColor = {
              front: 'from-[#0a4625] via-[#062f18] to-[#03180c]',
              side: 'from-[#042312] to-[#020e06]',
              top: 'bg-gradient-to-r from-[#edd48e] via-[#c5a34a] to-[#8c6f25]',
              badgeBorder: 'border-[#c5a34a]/80 shadow-[0_8px_20px_rgba(0,0,0,0.8)]',
              badgeBg: 'bg-gradient-to-b from-[#07190f] to-[#020a05]',
              badgeVotesColor: 'text-white',
              badgeVotesLabel: 'text-[#edd48e]',
              cardBorder: 'border-[#c5a34a]/70 hover:border-brand-gold shadow-lg',
            };
          } else {
            // Candidates without votes yet (0 votes): Dignified Platinum Graphite Slate (Plomo de Gala)
            pillarColor = {
              front: 'from-[#1f2824] via-[#141b18] to-[#0b100e]',
              side: 'from-[#101513] to-[#060807]',
              top: 'bg-gradient-to-r from-[#cbd5e1] via-[#94a3b8] to-[#64748b]',
              badgeBorder: 'border-slate-600/50 shadow-md',
              badgeBg: 'bg-[#090e0c]',
              badgeVotesColor: 'text-slate-300',
              badgeVotesLabel: 'text-slate-500',
              cardBorder: 'border-slate-700/60 hover:border-slate-500',
            };
          }

          const isFirstSpecialOrgan = activeCategory === 'TODOS' && idx === 9;

          return (
            <React.Fragment key={cand.id}>
              {isFirstSpecialOrgan && (
                <div className="flex flex-col items-center justify-end pb-8 px-1.5 shrink-0 self-stretch">
                  <div className="w-[2px] h-40 bg-gradient-to-t from-brand-gold/60 via-brand-gold/25 to-transparent rounded-full" />
                  <span className="text-[8px] sm:text-[9px] font-black uppercase text-brand-gold tracking-widest px-2 py-0.5 rounded-full bg-black/80 border border-brand-gold/40 mt-2 shadow-lg whitespace-nowrap">
                    Órganos Especiales
                  </span>
                </div>
              )}
              <div
                className={`flex flex-col items-center shrink-0 transition-all duration-500 group ${
                  isTwoCandidates ? 'w-48 sm:w-60 lg:w-72' : 'w-24 sm:w-28 lg:w-32 xl:w-36'
                }`}
              >
              {/* 3D Column with top floating votes badge */}
              <div
                className="w-full flex flex-col items-center justify-end relative transition-all duration-700 ease-out"
                style={{ height: isTwoCandidates ? '340px' : '300px' }}
              >
                {/* 3D Pillar Body */}
                <div
                  className={`relative transition-all duration-700 ease-out flex flex-col justify-between ${
                    isTwoCandidates ? 'w-28 sm:w-36 lg:w-44' : 'w-18 sm:w-22 lg:w-26 xl:w-28'
                  }`}
                  style={{
                    height: `${heightPercent}%`,
                    transform: 'perspective(600px) rotateX(8deg)',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* ARRIBA: Cantidad de votos sobre la columna */}
                  <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-20 transition-transform duration-300 group-hover:scale-110">
                    <div
                      className={`px-3 py-1.5 rounded-2xl ${pillarColor.badgeBg} backdrop-blur-md border-2 shadow-[0_10px_25px_rgba(0,0,0,0.95)] text-center shrink-0 whitespace-nowrap flex flex-col items-center justify-center min-w-[70px] ${pillarColor.badgeBorder}`}
                    >
                      <span className={`text-xl sm:text-2xl font-black ${pillarColor.badgeVotesColor} font-mono drop-shadow-md leading-none`}>
                        {cand.votesCount || 0}
                      </span>
                      <span className={`text-[8px] sm:text-[9px] uppercase font-black tracking-widest ${pillarColor.badgeVotesLabel} mt-0.5 leading-none`}>
                        {cand.votesCount === 1 ? 'VOTO' : 'VOTOS'}
                      </span>
                    </div>
                  </div>

                  {/* Top Cap of 3D Pillar (Isometric angle with realistic metallic gradient) */}
                  <div
                    className={`w-full h-3.5 sm:h-4 ${pillarColor.top} rounded-t-sm shadow-md transition-all duration-500 border-b border-black/30`}
                    style={{
                      transform: 'translateY(-50%) rotateX(60deg)',
                    }}
                  />

                  {/* Front Face with Gradient */}
                  <div
                    className={`w-full flex-1 bg-gradient-to-b ${pillarColor.front} border-x border-white/20 shadow-2xl relative flex flex-col items-center justify-center`}
                  >
                    {/* Subtle internal shine line */}
                    <div className="absolute inset-y-0 left-1.5 w-1 bg-white/15 rounded-full blur-[1px]" />

                    {/* Rank number inside pillar if leader */}
                    {isLeader && (
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase text-amber-200 tracking-wider bg-black/60 px-2.5 py-0.5 rounded-full border border-amber-400/60 shadow-lg">
                        <Award className="w-3 h-3 text-brand-gold" />
                        <span>1° LÍDER</span>
                      </div>
                    )}
                  </div>

                  {/* Right Bevel Face (3D Depth) */}
                  <div
                    className={`absolute top-0 right-0 w-2.5 h-full bg-gradient-to-b ${pillarColor.side} origin-right`}
                    style={{
                      transform: 'rotateY(90deg)',
                    }}
                  />

                  {/* Base Shadow & Pedestal */}
                  <div className="w-full h-2.5 bg-black/80 rounded-b-md shadow-2xl border-t border-white/10" />
                </div>
              </div>

              {/* Base Unit: Candidate Photo Card and Name Badge */}
              <div className="w-full mt-3 flex flex-col items-center text-center">
                {/* Photo Frame */}
                <div
                  className={`rounded-xl border-2 overflow-hidden shadow-xl bg-slate-900 relative transition-transform duration-300 group-hover:scale-105 ${
                    isTwoCandidates ? 'w-28 h-36 sm:w-36 sm:h-44' : 'w-18 h-22 sm:w-22 sm:h-26'
                  } ${pillarColor.cardBorder}`}
                >
                  {cand.photoUrl ? (
                    <img
                      src={cand.photoUrl}
                      alt={cand.fullName}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-b from-[#0a1e12] to-black text-center relative">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand-gold/15 border border-brand-gold/40 flex items-center justify-center mb-1 text-brand-gold shadow-inner">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 opacity-80" />
                      </div>
                      <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">
                        Postulante
                      </span>
                    </div>
                  )}

                  <span className="absolute bottom-0 inset-x-0 bg-black/85 text-brand-gold text-[9px] font-black py-0.5 tracking-wider font-mono">
                    #{cand.orderIndex}
                  </span>
                </div>

                {/* Candidate Name Banner */}
                <div className="mt-2 w-full flex flex-col items-center">
                  <span
                    className={`font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-1 border ${
                      isTwoCandidates ? 'text-xs' : 'text-[8px]'
                    } ${
                      cand.position === 'COMITÉ ELECTORAL'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                        : cand.position === 'TRIBUNAL DE HONOR'
                        ? 'bg-yellow-950/80 text-yellow-300 border-yellow-500/50'
                        : 'bg-black/60 text-brand-gold border-white/20'
                    }`}
                  >
                    {cand.position || 'DIRECTORIO'}
                  </span>

                  {/* Candidate Name in EXACTLY TWO LINES */}
                  {(() => {
                    const { line1, line2 } = formatNameInTwoLines(cand.fullName);
                    return (
                      <div
                        className={`w-full flex flex-col items-center justify-center text-center leading-tight drop-shadow-sm group-hover:text-amber-300 transition-colors ${
                          isTwoCandidates ? 'h-10 sm:h-12' : 'h-8 sm:h-9'
                        }`}
                      >
                        <span
                          className={`font-black text-white uppercase tracking-tight truncate w-full block ${
                            isTwoCandidates ? 'text-xs sm:text-sm' : 'text-[10px] sm:text-[11px]'
                          }`}
                        >
                          {line1}
                        </span>
                        <span
                          className={`font-black text-white uppercase tracking-tight truncate w-full block ${
                            isTwoCandidates ? 'text-xs sm:text-sm' : 'text-[10px] sm:text-[11px]'
                          }`}
                        >
                          {line2 || '\u00A0'}
                        </span>
                      </div>
                    );
                  })()}

                  {/* ABAJO: Porcentaje de votos con respecto a la cantidad de boletas registradas */}
                  <div className="mt-2 w-full flex flex-col items-center justify-center">
                    <div
                      className={`px-3 py-1 rounded-xl bg-gradient-to-r from-[#021f10] to-[#042e18] border-2 border-emerald-400/80 shadow-lg shadow-emerald-950/60 flex items-center justify-center ${
                        isTwoCandidates ? 'min-w-[100px]' : 'min-w-[72px]'
                      }`}
                    >
                      <span
                        className={`font-black text-emerald-300 font-mono tracking-tight leading-none drop-shadow ${
                          isTwoCandidates ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'
                        }`}
                      >
                        {pct.toFixed(1).replace('.', ',')}%
                      </span>
                    </div>
                    <span
                      className={`font-bold text-gray-400 tracking-tight mt-0.5 leading-tight ${
                        isTwoCandidates ? 'text-[10px]' : 'text-[8px]'
                      }`}
                    >
                      de boletas ({stats.totalBallots})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </React.Fragment>
        );
        })}
      </div>

      {/* Footer Status & Quórum Progress Bar */}
      <div className="relative z-10 w-full pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
          <span>Sistema de Cómputo Notarial • CLUB INTELIGENTE CHLS 360°</span>
        </div>

        <div className="flex items-center gap-4 text-gray-300 text-xs">
          <span>
            Válidas:{' '}
            <strong className="text-white">
              {stats.validBallots} ({stats.validPercentage}%)
            </strong>
          </span>
          <span>•</span>
          <span>
            Blancas: <strong className="text-gray-400">{stats.blankBallots}</strong>
          </span>
          <span>•</span>
          <span>
            Nulas: <strong className="text-rose-400">{stats.nullBallots}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
