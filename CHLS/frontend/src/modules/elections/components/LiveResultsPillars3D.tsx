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
import { Award, CheckCircle2, TrendingUp, Users } from 'lucide-react';

interface LiveResultsPillars3DProps {
  stats: ElectionStatsDto;
}

export const LiveResultsPillars3D: React.FC<LiveResultsPillars3DProps> = ({ stats }) => {
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
  const isTodos = candidates.length > 9;

  // Maximum percentage to scale the 3D columns proportionally (min 10% to prevent zero-height)
  const maxPct = Math.max(...candidates.map((c) => c.votesPercentage || 0), 10);

  return (
    <div className="w-full flex flex-col items-center justify-between min-h-[680px] p-6 lg:p-8 rounded-3xl bg-gradient-to-b from-[#0a1526] via-[#0e2039] to-[#060d18] border-2 border-brand-gold/50 shadow-[0_25px_70px_rgba(0,0,0,0.85)] relative overflow-hidden select-none">
      {/* Background luxury club watermark - muy sutil y perdido en el fondo como marca de agua genuina */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.035] filter grayscale-[40%]">
        <CrestLogo size="xl" className="w-[580px] h-[680px]" />
      </div>
      {/* Ambient lighting de escenario en tono zafiro profundo que realza el verde y oro */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[1000px] h-[450px] bg-gradient-to-b from-blue-500/10 via-emerald-500/5 to-transparent rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[600px] h-[260px] bg-cyan-500/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[450px] h-[220px] bg-brand-gold/10 rounded-full blur-[110px] pointer-events-none" />
      {/* Reflejo tenue sobre el pedestal base */}
      <div className="absolute bottom-28 inset-x-8 h-16 bg-gradient-to-t from-emerald-500/10 via-cyan-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

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
      <div className="relative z-10 w-full flex-1 flex items-end justify-center pt-14 pb-4 px-1 sm:px-2 overflow-x-auto min-h-[460px] scrollbar-thin scrollbar-thumb-brand-gold/30">
        <div
          className={`flex items-end mx-auto ${
            isTwoCandidates
              ? 'gap-12 sm:gap-20 lg:gap-28'
              : isTodos
              ? 'gap-1 sm:gap-1.5 md:gap-2 lg:gap-2.5 xl:gap-3'
              : 'gap-3 sm:gap-4 lg:gap-5'
          }`}
        >
        {candidates.map((cand, idx) => {
          const pct = cand.votesPercentage || 0;
          // Calculate column height percentage (minimum 16% for visual aesthetics, up to 88%)
          const heightPercent = stats.totalBallots > 0 ? Math.max(16, (pct / maxPct) * 85) : 16;

          const votes = cand.votesCount || 0;
          const hasVotes = votes > 0;
          const isSpecial = isSpecialOrganCandidate(cand);
          const isComite = cand.orderIndex === 10 || (cand.position || '').toUpperCase().includes('COMIT');
          const isTribunal = cand.orderIndex === 11 || (cand.position || '').toUpperCase().includes('TRIBUNAL');
          const isLeader = cand.rank === 1 && votes > 0 && !isSpecial;

          // Sovereign luxury palette: Royal Imperial Emerald, Champagne 24K Gold & Platinum Silk
          let pillarColor;
          if (isLeader) {
            // 1st Place / Absolute Leader: Imperial Royal Emerald with glowing 24K Gold Crown
            pillarColor = {
              front: 'from-[#168541] via-[#0e5c2d] to-[#07391b]',
              side: 'from-[#0b4a24] to-[#041f0f]',
              top: 'bg-gradient-to-r from-[#fff3b0] via-[#eab308] to-[#9a7309]',
              badgeBorder: 'border-[#fde047] ring-2 ring-[#eab308]/70 shadow-[0_0_25px_rgba(234,179,8,0.55)]',
              badgeBg: 'bg-gradient-to-b from-[#0e301b] to-[#031106]',
              badgeVotesColor: 'text-[#fef08a]',
              badgeVotesLabel: 'text-[#eab308]',
              cardBorder: 'border-[#eab308] ring-2 ring-[#eab308]/60 shadow-[0_0_25px_rgba(234,179,8,0.4)]',
            };
          } else if (isTribunal) {
            // Tribunal de Honor: Antique Royal Gold Monolith
            pillarColor = {
              front: 'from-[#8f6609] via-[#614504] to-[#302202]',
              side: 'from-[#473303] to-[#1c1401]',
              top: 'bg-gradient-to-r from-[#fef08a] via-[#eab308] to-[#a16207]',
              badgeBorder: 'border-yellow-400/90 shadow-[0_8px_20px_rgba(0,0,0,0.8)]',
              badgeBg: 'bg-[#291b02]',
              badgeVotesColor: 'text-yellow-100',
              badgeVotesLabel: 'text-yellow-400',
              cardBorder: 'border-yellow-500/80 ring-1 ring-yellow-400/40',
            };
          } else if (isComite) {
            // Comité Electoral: Sovereign Club Emerald Monolith
            pillarColor = {
              front: 'from-[#136f3a] via-[#0d4a27] to-[#062c17]',
              side: 'from-[#093a1e] to-[#03170b]',
              top: 'bg-gradient-to-r from-[#86efac] via-[#22c55e] to-[#15803d]',
              badgeBorder: 'border-emerald-400/90 shadow-[0_8px_20px_rgba(0,0,0,0.8)]',
              badgeBg: 'bg-[#062614]',
              badgeVotesColor: 'text-emerald-100',
              badgeVotesLabel: 'text-emerald-400',
              cardBorder: 'border-emerald-500/80 ring-1 ring-emerald-400/40',
            };
          } else if (hasVotes) {
            // Directorio candidates with votes: British Racing Emerald Monolith with Champagne Gold Capital
            pillarColor = {
              front: 'from-[#11733b] via-[#0b5229] to-[#063319]',
              side: 'from-[#083e1f] to-[#031f0f]',
              top: 'bg-gradient-to-r from-[#fde68a] via-[#d4af37] to-[#927221]',
              badgeBorder: 'border-[#d4af37] shadow-[0_8px_20px_rgba(0,0,0,0.8)]',
              badgeBg: 'bg-gradient-to-b from-[#0a2615] to-[#030e07]',
              badgeVotesColor: 'text-white',
              badgeVotesLabel: 'text-[#fde68a]',
              cardBorder: 'border-[#d4af37]/80 hover:border-brand-gold shadow-lg',
            };
          } else {
            // Candidates without votes yet (0 votes): Dignified Platinum Graphite Slate (Plomo de Gala)
            pillarColor = {
              front: 'from-[#334155] via-[#1e293b] to-[#0f172a]',
              side: 'from-[#1e293b] to-[#090d16]',
              top: 'bg-gradient-to-r from-[#e2e8f0] via-[#94a3b8] to-[#64748b]',
              badgeBorder: 'border-slate-500/70 shadow-md',
              badgeBg: 'bg-[#0f172a]',
              badgeVotesColor: 'text-slate-200',
              badgeVotesLabel: 'text-slate-400',
              cardBorder: 'border-slate-600/70 hover:border-slate-400',
            };
          }

          const isFirstSpecialOrgan = activeCategory === 'TODOS' && idx === 9;

          return (
            <React.Fragment key={cand.id}>
              {isFirstSpecialOrgan && (
                <div className="flex flex-col items-center justify-end pb-8 px-1 shrink-0 self-stretch">
                  <div className="w-[1.5px] h-36 bg-gradient-to-t from-brand-gold/70 via-brand-gold/30 to-transparent rounded-full" />
                  <span className="text-[7px] sm:text-[8px] font-black uppercase text-brand-gold tracking-widest px-1.5 py-0.5 rounded-full bg-black/90 border border-brand-gold/40 mt-2 shadow-lg whitespace-nowrap">
                    Órganos Especiales
                  </span>
                </div>
              )}
              <div
                className={`flex flex-col items-center shrink-0 transition-all duration-500 group ${
                  isTwoCandidates
                    ? 'w-48 sm:w-60 lg:w-72'
                    : isTodos
                    ? 'w-[98px] sm:w-[110px] md:w-[118px] lg:w-[124px] xl:w-[130px]'
                    : 'w-24 sm:w-28 lg:w-32 xl:w-36'
                }`}
              >
              {/* 3D Column with top floating votes badge */}
              <div
                className="w-full flex flex-col items-center justify-end relative transition-all duration-700 ease-out"
                style={{ height: isTwoCandidates ? '340px' : isTodos ? '275px' : '300px' }}
              >
                {/* 3D Pillar Body */}
                <div
                  className={`relative transition-all duration-700 ease-out flex flex-col justify-between ${
                    isTwoCandidates
                      ? 'w-28 sm:w-36 lg:w-44'
                      : isTodos
                      ? 'w-14 sm:w-16 md:w-18 lg:w-20 xl:w-22'
                      : 'w-18 sm:w-22 lg:w-26 xl:w-28'
                  }`}
                  style={{
                    height: `${heightPercent}%`,
                    transform: 'perspective(600px) rotateX(8deg)',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* ARRIBA: Cantidad de votos sobre la columna */}
                  <div className={`absolute left-1/2 -translate-x-1/2 z-20 transition-transform duration-300 group-hover:scale-110 ${
                    isTodos ? '-top-14' : '-top-16'
                  }`}>
                    <div
                      className={`rounded-2xl ${pillarColor.badgeBg} backdrop-blur-md border-2 shadow-[0_10px_25px_rgba(0,0,0,0.95)] text-center shrink-0 whitespace-nowrap flex flex-col items-center justify-center ${
                        isTodos ? 'px-2 py-1 min-w-[54px]' : 'px-3 py-1.5 min-w-[70px]'
                      } ${pillarColor.badgeBorder}`}
                    >
                      <span className={`font-black ${pillarColor.badgeVotesColor} font-mono drop-shadow-md leading-none ${
                        isTodos ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'
                      }`}>
                        {cand.votesCount || 0}
                      </span>
                      <span className={`uppercase font-black tracking-widest ${pillarColor.badgeVotesLabel} mt-0.5 leading-none ${
                        isTodos ? 'text-[7px] sm:text-[8px]' : 'text-[8px] sm:text-[9px]'
                      }`}>
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
              <div className="w-full mt-2.5 flex flex-col items-center text-center">
                {/* Photo Frame */}
                <div
                  className={`rounded-xl border-2 overflow-hidden shadow-xl bg-slate-900 relative transition-transform duration-300 group-hover:scale-105 ${
                    isTwoCandidates
                      ? 'w-28 h-36 sm:w-36 sm:h-44'
                      : isTodos
                      ? 'w-16 h-20 sm:w-18 sm:h-22 md:w-20 md:h-24 lg:w-[82px] lg:h-[100px]'
                      : 'w-18 h-22 sm:w-22 sm:h-26'
                  } ${pillarColor.cardBorder}`}
                >
                  {cand.photoUrl || CANDIDATE_PHOTO_MAP[cand.orderIndex] ? (
                    <img
                      src={cand.photoUrl || CANDIDATE_PHOTO_MAP[cand.orderIndex]}
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
                </div>

                {/* Candidate Name Banner */}
                <div className="mt-1.5 w-full flex flex-col items-center">
                  {(isComite || isTribunal) && (
                    <span
                      className={`font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-1 border ${
                        isTwoCandidates ? 'text-xs' : 'text-[8px]'
                      } ${
                        isComite
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                          : 'bg-yellow-950/80 text-yellow-300 border-yellow-500/50'
                      }`}
                    >
                      {isComite ? 'COMITÉ ELECTORAL' : 'TRIBUNAL DE HONOR'}
                    </span>
                  )}

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
                            isTwoCandidates
                              ? 'text-xs sm:text-sm'
                              : isTodos
                              ? 'text-[9px] sm:text-[9.5px] md:text-[10px]'
                              : 'text-[10px] sm:text-[11px]'
                          }`}
                        >
                          {line1}
                        </span>
                        <span
                          className={`font-black text-white uppercase tracking-tight truncate w-full block ${
                            isTwoCandidates
                              ? 'text-xs sm:text-sm'
                              : isTodos
                              ? 'text-[9px] sm:text-[9.5px] md:text-[10px]'
                              : 'text-[10px] sm:text-[11px]'
                          }`}
                        >
                          {line2 || '\u00A0'}
                        </span>
                      </div>
                    );
                  })()}

                  {/* ABAJO: Porcentaje de votos con respecto a la cantidad de boletas registradas */}
                  <div className="mt-1.5 w-full flex flex-col items-center justify-center">
                    <div
                      className={`rounded-xl bg-gradient-to-r from-[#021f10] to-[#042e18] border-2 border-emerald-400/80 shadow-lg shadow-emerald-950/60 flex items-center justify-center ${
                        isTwoCandidates
                          ? 'min-w-[100px] px-3 py-1'
                          : isTodos
                          ? 'min-w-[56px] px-1.5 py-0.5'
                          : 'min-w-[72px] px-3 py-1'
                      }`}
                    >
                      <span
                        className={`font-black text-emerald-300 font-mono tracking-tight leading-none drop-shadow ${
                          isTwoCandidates
                            ? 'text-base sm:text-lg'
                            : isTodos
                            ? 'text-xs sm:text-[13px]'
                            : 'text-xs sm:text-sm'
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
