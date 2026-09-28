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
import { Award, CheckCircle2, Layers, TrendingUp, Users, Vote } from 'lucide-react';

interface LiveResultsPillars3DProps {
  stats: ElectionStatsDto;
  isDualView?: boolean;
}

export const LiveResultsPillars3D: React.FC<LiveResultsPillars3DProps> = ({ stats, isDualView = false }) => {
  const [activeCategory, setActiveCategory] = React.useState<'DIRECTORIO' | 'COMITE_Y_TRIBUNAL' | 'TODOS'>('DIRECTORIO');

  const filteredCandidates = React.useMemo(() => {
    const list = stats?.candidates || [];
    if (activeCategory === 'DIRECTORIO') {
      const dir = list.filter(isDirectorioCandidate);
      // En modo dual mantenemos el orden físico de papeleta (1 al 5 y 6 al 9) para reflejar exactamente la entrada
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

  // Maximum percentage to scale the 3D columns proportionally (min 10% to prevent zero-height)
  const maxPct = Math.max(...candidates.map((c) => c.votesPercentage || 0), 10);

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

  const renderCandidatePillar = (cand: CandidateDto, idx: number, isDualRow = false) => {
    const pct = cand.votesPercentage || 0;
    const maxColumnScale = isDualRow ? 52 : isTwoCandidates ? 54 : isTodos ? 72 : 75;
    const heightPercent = stats.totalBallots > 0 ? Math.max(16, (pct / maxPct) * maxColumnScale) : 16;

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

    const isFirstSpecialOrgan = !isDualRow && activeCategory === 'TODOS' && idx === 9;

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
          className={`flex flex-col items-center shrink-0 transition-all duration-300 group ${
            isDualRow
              ? isTwoCandidates
                ? 'w-44 sm:w-52'
                : isTodos
                ? 'w-[94px] sm:w-[104px] md:w-[114px]'
                : 'w-[110px] sm:w-[124px] md:w-[136px]'
              : isTwoCandidates
              ? 'w-48 sm:w-60 lg:w-72'
              : isTodos
              ? 'w-[98px] sm:w-[110px] md:w-[118px] lg:w-[126px] xl:w-[132px]'
              : 'w-26 sm:w-28 md:w-30 lg:w-32 xl:w-34'
          }`}
        >
          {/* 3D Column with top floating votes badge */}
          <div
            className="w-full flex flex-col items-center justify-end relative transition-all duration-500 ease-out"
            style={{
              height: isDualRow
                ? '88px'
                : isTwoCandidates
                ? '170px'
                : isTodos
                ? '205px'
                : '230px',
            }}
          >
            {/* 3D Pillar Body */}
            <div
              className={`relative transition-all duration-500 ease-out flex flex-col justify-between ${
                isDualRow
                  ? isTwoCandidates
                    ? 'w-24 sm:w-28'
                    : isTodos
                    ? 'w-11 sm:w-12'
                    : 'w-13 sm:w-15'
                  : isTwoCandidates
                  ? 'w-32 sm:w-40 lg:w-48'
                  : isTodos
                  ? 'w-14 sm:w-16 md:w-18 lg:w-20'
                  : 'w-20 sm:w-22 md:w-24 lg:w-26'
              }`}
              style={{
                height: `${heightPercent}%`,
                transform: 'perspective(600px) rotateX(8deg)',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Flotando ENCIMA de la barra */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-30 pointer-events-none transition-transform duration-300 group-hover:-translate-y-1">
                <div
                  className={`rounded-xl ${pillarColor.badgeBg} backdrop-blur-md border shadow-lg text-center shrink-0 whitespace-nowrap flex flex-col items-center justify-center pointer-events-auto ${
                    isDualRow
                      ? 'px-1.5 py-0.5 min-w-[48px]'
                      : isTwoCandidates
                      ? 'px-3.5 sm:px-4 py-1 sm:py-1.5 min-w-[80px] sm:min-w-[96px]'
                      : isTodos
                      ? 'px-2 py-0.5 sm:px-2.5 sm:py-1 min-w-[54px] sm:min-w-[60px]'
                      : 'px-2.5 sm:px-3.5 py-0.5 sm:py-1 min-w-[68px] sm:min-w-[78px]'
                  } ${pillarColor.badgeBorder}`}
                >
                  <span
                    className={`font-black ${pillarColor.badgeVotesColor} font-mono drop-shadow-md leading-none tracking-tight ${
                      isDualRow
                        ? 'text-base sm:text-lg md:text-xl'
                        : isTwoCandidates
                        ? 'text-3xl sm:text-4xl'
                        : isTodos
                        ? 'text-xl sm:text-[23px] md:text-[25px]'
                        : 'text-[27px] sm:text-[29px] md:text-[31px]'
                    }`}
                  >
                    {cand.votesCount || 0}
                  </span>
                  <span
                    className={`uppercase font-black tracking-widest ${pillarColor.badgeVotesLabel} mt-0.5 leading-none ${
                      isDualRow
                        ? 'text-[7px]'
                        : isTwoCandidates
                        ? 'text-[10px] sm:text-xs'
                        : isTodos
                        ? 'text-[7px] sm:text-[8px]'
                        : 'text-[8px] sm:text-[9px]'
                    }`}
                  >
                    {cand.votesCount === 1 ? 'VOTO' : 'VOTOS'}
                  </span>
                </div>
              </div>

              {/* Top Cap of 3D Pillar */}
              <div
                className={`w-full ${isDualRow ? 'h-2 sm:h-2.5' : 'h-3 sm:h-3.5'} ${pillarColor.top} rounded-t-sm shadow-md transition-all duration-500 border-b border-black/30`}
                style={{
                  transform: 'translateY(-50%) rotateX(60deg)',
                }}
              />

              {/* Front Face with Gradient */}
              <div
                className={`w-full flex-1 bg-gradient-to-b ${pillarColor.front} border-x border-white/20 shadow-2xl relative flex flex-col items-center justify-center`}
              >
                <div className="absolute inset-y-0 left-1 w-0.5 bg-white/20 rounded-full blur-[0.5px]" />
              </div>

              {/* Right Bevel Face (3D Depth) */}
              <div
                className={`absolute top-0 right-0 ${isDualRow ? 'w-2' : 'w-2.5'} h-full bg-gradient-to-b ${pillarColor.side} origin-right`}
                style={{
                  transform: 'rotateY(90deg)',
                }}
              />

              {/* Base Shadow & Pedestal */}
              <div className={`w-full ${isDualRow ? 'h-1.5' : 'h-2'} bg-black/80 rounded-b-md shadow-2xl border-t border-white/10`} />
            </div>
          </div>

          {/* Base Unit: Candidate Photo Card and Name Badge */}
          <div className="w-full mt-1.5 flex flex-col items-center text-center">
            {/* Photo Frame */}
            <div
              className={`rounded-xl border-2 overflow-hidden shadow-xl bg-slate-900 relative transition-transform duration-300 group-hover:scale-105 ${
                isDualRow
                  ? isTwoCandidates
                    ? 'w-24 h-28 sm:w-28 sm:h-34'
                    : isTodos
                    ? 'w-14 h-18 sm:w-16 sm:h-20'
                    : 'w-16 h-20 sm:w-18 sm:h-22'
                  : isTwoCandidates
                  ? 'w-28 h-34 sm:w-32 sm:h-40 lg:w-36 lg:h-44'
                  : isTodos
                  ? 'w-18 h-22 sm:w-20 sm:h-24 md:w-22 md:h-26 lg:w-24 lg:h-28'
                  : 'w-24 h-28 sm:w-26 sm:h-30 md:w-28 md:h-32 xl:w-30 xl:h-34'
              } ${pillarColor.cardBorder}`}
            >
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
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-1 bg-gradient-to-b from-[#0a1e12] to-black text-center relative">
                  <div className="w-6 h-6 rounded-full bg-brand-gold/15 border border-brand-gold/40 flex items-center justify-center mb-0.5 text-brand-gold">
                    <Users className="w-3 h-3 opacity-80" />
                  </div>
                  <span className="text-[7px] font-bold text-white/50 uppercase tracking-wider">
                    Postulante
                  </span>
                </div>
              )}
            </div>

            {/* Candidate Name Banner */}
            <div className="mt-1 w-full flex flex-col items-center">
              {(isComite || isTribunal) && (
                <span
                  className={`font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full inline-block mb-0.5 border ${
                    isDualRow ? 'text-[7px]' : isTwoCandidates ? 'text-xs' : 'text-[7.5px]'
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
                    className={`w-full flex flex-col items-center justify-center text-center leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] group-hover:text-amber-300 transition-colors ${
                      isDualRow
                        ? 'min-h-[26px]'
                        : isTwoCandidates
                        ? 'min-h-[36px] sm:min-h-[42px]'
                        : isTodos
                        ? 'min-h-[30px] sm:min-h-[34px]'
                        : 'min-h-[36px] sm:min-h-[40px]'
                    }`}
                  >
                    <span
                      className={`font-black text-white uppercase tracking-tight text-center w-full block truncate ${
                        isDualRow
                          ? 'text-[8.5px] sm:text-[9.5px]'
                          : isTwoCandidates
                          ? 'text-sm sm:text-base md:text-lg'
                          : isTodos
                          ? 'text-[9.5px] sm:text-[10px] md:text-[10.5px]'
                          : 'text-[11.5px] sm:text-xs md:text-[12.5px]'
                      }`}
                    >
                      {line1}
                    </span>
                    <span
                      className={`font-black text-white uppercase tracking-tight text-center w-full block truncate ${
                        isDualRow
                          ? 'text-[8.5px] sm:text-[9.5px]'
                          : isTwoCandidates
                          ? 'text-sm sm:text-base md:text-lg'
                          : isTodos
                          ? 'text-[9.5px] sm:text-[10px] md:text-[10.5px]'
                          : 'text-[11.5px] sm:text-xs md:text-[12.5px]'
                      }`}
                    >
                      {line2 || '\u00A0'}
                    </span>
                  </div>
                );
              })()}

              {/* Porcentaje de votos con respecto a la cantidad de boletas registradas */}
              <div className="mt-0.5 w-full flex flex-col items-center justify-center">
                <div
                  className={`rounded-lg bg-gradient-to-r from-[#021f10] to-[#042e18] border border-emerald-400/80 shadow-md shadow-emerald-950/60 flex items-center justify-center ${
                    isDualRow
                      ? 'min-w-[48px] px-1.5 py-0.5'
                      : isTwoCandidates
                      ? 'min-w-[90px] px-3 py-0.5'
                      : isTodos
                      ? 'min-w-[56px] px-1.5 py-0.5'
                      : 'min-w-[76px] px-2.5 py-0.5'
                  }`}
                >
                  <span
                    className={`font-black text-emerald-300 font-mono tracking-tight leading-none drop-shadow ${
                      isDualRow
                        ? 'text-[10px] sm:text-[11px]'
                        : isTwoCandidates
                        ? 'text-base sm:text-lg'
                        : isTodos
                        ? 'text-[11px] sm:text-xs'
                        : 'text-xs sm:text-[13px]'
                    }`}
                  >
                    {pct.toFixed(1).replace('.', ',')}%
                  </span>
                </div>
                <span
                  className={`font-bold text-gray-400 tracking-tight mt-0.5 leading-tight ${
                    isDualRow
                      ? 'text-[7px]'
                      : isTwoCandidates
                      ? 'text-xs'
                      : 'text-[8px] sm:text-[9px]'
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
  };

  return (
    <div className="w-full flex flex-col items-center justify-between min-h-[540px] p-3 sm:p-4 lg:p-5 pb-2 rounded-3xl bg-gradient-to-b from-[#0a1526] via-[#0e2039] to-[#060d18] border-2 border-brand-gold/50 shadow-[0_25px_70px_rgba(0,0,0,0.85)] relative overflow-hidden select-none">
      {/* Background luxury club watermark */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.035] filter grayscale-[40%]">
        <CrestLogo size="xl" className="w-[580px] h-[680px]" />
      </div>
      {/* Ambient lighting de escenario */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[1000px] h-[450px] bg-gradient-to-b from-blue-500/10 via-emerald-500/5 to-transparent rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[600px] h-[260px] bg-cyan-500/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[450px] h-[220px] bg-brand-gold/10 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-28 inset-x-8 h-16 bg-gradient-to-t from-emerald-500/10 via-cyan-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* Action Header: Category Switcher & Live Stats Counters */}
      <div className={`relative z-10 w-full flex ${isDualView ? 'flex-col gap-2' : 'flex-col md:flex-row'} items-center justify-between border-b border-white/10 pb-2.5 gap-2.5`}>
        {/* Selector de Categorías en Cuadrantes */}
        <div className={`grid grid-cols-3 gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-black/90 rounded-2xl border-2 border-brand-gold/60 shadow-2xl backdrop-blur-md ${isDualView ? 'w-full' : 'max-w-full'}`}>
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

        {/* Panel Superior de Estadísticas */}
        <div className={`flex items-stretch gap-2 sm:gap-3 flex-wrap justify-center ${isDualView ? 'w-full' : 'md:justify-end'}`}>
          {/* Cuadro 1: Boletas Contabilizadas con Desglose */}
          <div className={`bg-gradient-to-b from-black/95 via-[#081320]/95 to-black/95 backdrop-blur-md rounded-2xl border-2 border-brand-gold/70 shadow-[0_15px_45px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col justify-between ${isDualView ? 'flex-1 min-w-[240px]' : 'min-w-[300px] sm:min-w-[340px] flex-1 md:flex-initial'}`}>
            <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-amber-500/25 via-brand-gold/20 to-transparent border-b border-brand-gold/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Vote className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-gold shrink-0" />
                <span className="text-[11px] sm:text-xs font-black uppercase text-amber-200 tracking-wider">
                  Boletas Contabilizadas
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[9px] font-black uppercase tracking-wider text-amber-300">
                Ánfora Oficial
              </span>
            </div>

            <div className="p-2 sm:p-2.5 flex items-center justify-between gap-2 sm:gap-3 bg-gradient-to-b from-white/[0.03] to-transparent">
              <div className="flex flex-col items-start pl-1">
                <span className="text-[9px] font-black uppercase text-amber-300/80 tracking-widest leading-none mb-0.5">
                  Total Ánfora
                </span>
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-brand-gold to-yellow-300 leading-none drop-shadow-[0_2px_14px_rgba(234,179,8,0.4)]">
                  {stats.totalBallots}
                </span>
              </div>

              <div className="grid grid-cols-3 divide-x divide-white/15 bg-black/70 py-1.5 px-1 rounded-xl border border-white/10 text-center flex-1">
                <div className="px-1 flex flex-col items-center justify-center">
                  <span className="text-[8.5px] sm:text-[9.5px] uppercase font-black text-emerald-400 tracking-wider">
                    Válidos
                  </span>
                  <span className="text-sm sm:text-lg font-black font-mono text-emerald-300 leading-tight">
                    {stats.validBallots}
                  </span>
                  <span className="text-[8px] font-bold text-emerald-400/90 leading-none mt-0.5">
                    ({stats.validPercentage}%)
                  </span>
                </div>

                <div className="px-1 flex flex-col items-center justify-center">
                  <span className="text-[8.5px] sm:text-[9.5px] uppercase font-black text-gray-400 tracking-wider">
                    Blancos
                  </span>
                  <span className="text-sm sm:text-lg font-black font-mono text-gray-100 leading-tight">
                    {stats.blankBallots}
                  </span>
                  <span className="text-[8px] font-bold text-gray-400 leading-none mt-0.5">
                    ({stats.blankPercentage}%)
                  </span>
                </div>

                <div className="px-1 flex flex-col items-center justify-center">
                  <span className="text-[8.5px] sm:text-[9.5px] uppercase font-black text-rose-400 tracking-wider">
                    Nulos
                  </span>
                  <span className="text-sm sm:text-lg font-black font-mono text-rose-300 leading-tight">
                    {stats.nullBallots}
                  </span>
                  <span className="text-[8px] font-bold text-rose-400/90 leading-none mt-0.5">
                    ({stats.nullPercentage}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cuadro 2: Total Cantidad de Votos */}
          <div className={`bg-gradient-to-b from-black/95 via-[#061810]/95 to-black/95 backdrop-blur-md rounded-2xl border-2 border-brand-gold/70 shadow-[0_15px_45px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col justify-between ${isDualView ? 'flex-1 sm:flex-initial min-w-[130px]' : 'min-w-[170px] sm:min-w-[200px]'}`}>
            <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-500/25 via-brand-gold/20 to-transparent border-b border-brand-gold/40 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                <span className="text-[11px] sm:text-xs font-black uppercase text-amber-200 tracking-wider">
                  Total Votos
                </span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300">
                  En Vivo
                </span>
              </div>
            </div>

            <div className="p-2 sm:p-2.5 flex flex-col items-center justify-center bg-gradient-to-b from-white/[0.03] to-transparent text-center my-auto">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tight text-emerald-400 leading-none drop-shadow-[0_2px_14px_rgba(52,211,153,0.4)]">
                {stats.totalVotesAccumulated}
              </span>
              <span className="text-[9px] font-black uppercase text-emerald-300/80 tracking-widest leading-none mt-1">
                Votos Emitidos
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 3D Columns Stage */}
      {isDualView && candidates.length > 2 ? (
        /* Modo Dual: 2 Filas de Postulantes para ver a TODOS simultáneamente sin cortes */
        <div className="relative z-10 w-full flex-1 flex flex-col justify-start items-center py-2 px-1 gap-2.5 overflow-y-auto">
          {/* Fila 1 */}
          <div className="w-full flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-widest text-brand-gold px-3 py-0.5 rounded-full bg-black/80 border border-brand-gold/40 shadow-sm">
                {row1Label}
              </span>
            </div>
            <div className="flex items-end justify-center gap-1.5 sm:gap-2 md:gap-2.5 flex-wrap">
              {row1Candidates.map((cand, idx) => renderCandidatePillar(cand, idx, true))}
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
              <div className="flex items-end justify-center gap-1.5 sm:gap-2 md:gap-2.5 flex-wrap">
                {row2Candidates.map((cand, idx) => renderCandidatePillar(cand, row1Candidates.length + idx, true))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Modo 1 Fila Tradicional (Pantalla Completa o 2 Postulantes) */
        <div className="relative z-10 w-full flex-1 flex items-end justify-center pt-8 sm:pt-10 pb-2 px-1 sm:px-2 overflow-x-auto min-h-[360px] scrollbar-thin scrollbar-thumb-brand-gold/30">
          <div
            className={`flex items-end mx-auto ${
              isTwoCandidates
                ? 'gap-12 sm:gap-20 lg:gap-28'
                : isTodos
                ? 'gap-1 sm:gap-1.5 md:gap-2'
                : 'gap-2 sm:gap-2.5 md:gap-3 lg:gap-3.5'
            }`}
          >
            {candidates.map((cand, idx) => renderCandidatePillar(cand, idx, false))}
          </div>
        </div>
      )}

      {/* Footer Status */}
      <div className="relative z-10 w-full pt-2.5 mt-1 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          <span className="text-[11px]">Sistema de Cómputo Notarial • CLUB INTELIGENTE CHLS 360°</span>
        </div>

        <div className="flex items-center gap-3 text-gray-300 text-[11px]">
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
