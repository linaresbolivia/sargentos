import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import {
  Vote,
  Tv,
  BarChart3,
  Sliders,
  Maximize,
  Minimize,
  Radio,
  ArrowLeft,
  Sparkles,
  Layers,
  Columns,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CandidateDto, ElectionStatsDto, ResultsFormat } from '../types/election.types';
import { BallotEntryConsole, LastSavedInfo } from '../components/BallotEntryConsole';
import { LiveResultsPillars3D } from '../components/LiveResultsPillars3D';
import { LiveResultsUnitelStyle } from '../components/LiveResultsUnitelStyle';
import { CandidateParametrizationModal } from '../components/CandidateParametrizationModal';
import { CrestLogo } from '@shared/components/CrestLogo';

export const ElectoralHub: React.FC = () => {
  const navigate = useNavigate();

  // Active view: 'BALLOT_ENTRY' | 'LIVE_RESULTS' | 'DUAL_VIEW'
  const isResultsRoute = window.location.pathname.includes('/resultados');
  const [activeTab, setActiveTab] = useState<'BALLOT_ENTRY' | 'LIVE_RESULTS' | 'DUAL_VIEW'>(
    isResultsRoute ? 'LIVE_RESULTS' : 'DUAL_VIEW'
  );

  // Format of Live Results: 'PILLARS_3D' or 'UNITEL_TV'
  const [resultsFormat, setResultsFormat] = useState<ResultsFormat>('PILLARS_3D');

  const [electionId, setElectionId] = useState<string>('');
  const [candidates, setCandidates] = useState<CandidateDto[]>([]);
  const [stats, setStats] = useState<ElectionStatsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);

  // Operator ballot selection & voting state
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentlyVotedCandidateIds, setRecentlyVotedCandidateIds] = useState<string[]>([]);
  const [lastSavedInfo, setLastSavedInfo] = useState<LastSavedInfo | null>(null);

  // Play subtle audio click feedback using Web Audio API
  const playClickSound = useCallback((frequency = 600, duration = 0.05, typeWave: OscillatorType = 'sine') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = typeWave;
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {
      // Audio context fallback
    }
  }, []);

  // Play celebratory chime upon saving ballot
  const playSuccessChime = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.06);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.06 + 0.25);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + idx * 0.06);
        osc.stop(audioCtx.currentTime + idx * 0.06 + 0.25);
      });
    } catch {
      // Audio context fallback
    }
  }, []);

  // 1. Fetch initial election state
  const fetchElectionData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const res = await axios.get('/api/elections/active');
      if (res.data.success && res.data.data) {
        const { election, stats: initialStats } = res.data.data;
        setElectionId(election.id);
        setStats(initialStats);
        setCandidates(initialStats.candidates || []);
      }
    } catch (err: any) {
      if (!silent) toast.error('Error al cargar datos electorales.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchElectionData();
  }, []);

  // 2. High-speed Background Polling as ultra-reliable fallback
  useEffect(() => {
    const interval = setInterval(() => {
      fetchElectionData(true);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // 3. Connect to Socket.io for instantaneous real-time multi-screen sync
  useEffect(() => {
    let socket: Socket | null = null;
    try {
      const socketUrl =
        import.meta.env.VITE_WS_URL ||
        (window.location.port === '5173'
          ? `http://${window.location.hostname}:5000`
          : window.location.origin);

      socket = io(socketUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 30,
        reconnectionDelay: 1000,
      });

      socket.on('connect', () => {
        setIsWsConnected(true);
      });

      socket.on('disconnect', () => {
        setIsWsConnected(false);
      });

      socket.on('elections:ballot_registered', (data: { stats: ElectionStatsDto }) => {
        if (data?.stats) {
          setStats(data.stats);
          setCandidates(data.stats.candidates || []);
        }
      });

      socket.on('elections:ballot_undone', (data: { stats: ElectionStatsDto }) => {
        if (data?.stats) {
          setStats(data.stats);
          setCandidates(data.stats.candidates || []);
        }
      });

      socket.on('elections:ballots_reset', (data: { stats: ElectionStatsDto }) => {
        if (data?.stats) {
          setStats(data.stats);
          setCandidates(data.stats.candidates || []);
        }
      });

      socket.on('elections:settings_updated', (data: { stats: ElectionStatsDto }) => {
        if (data?.stats) {
          setStats(data.stats);
          setCandidates(data.stats.candidates || []);
        }
      });
    } catch {
      // Polling handles fallback
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const maxSelections = stats?.maxSelectionsPerBallot || 5;

  // Toggle candidate selection
  const toggleCandidate = (id: string) => {
    playClickSound(520, 0.04);
    setSelectedCandidateIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((cId) => cId !== id);
      } else {
        if (maxSelections > 0 && prev.length >= maxSelections) {
          toast.error(`Máximo ${maxSelections} postulantes permitidos por boleta.`, {
            id: 'max-selection-warning',
          });
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  // Register ballot
  const handleRegisterBallot = async (type: 'VALID' | 'BLANK' | 'NULL') => {
    if (type === 'VALID' && selectedCandidateIds.length === 0) {
      toast.error('Selecciona al menos un postulante o marca Voto en Blanco / Nulo.');
      return;
    }

    try {
      setIsSubmitting(true);
      const chosenCandidateIds = type === 'VALID' ? [...selectedCandidateIds] : [];
      const chosenNames = candidates
        .filter((c) => chosenCandidateIds.includes(c.id))
        .map((c) => c.fullName);

      const payload = {
        electionId,
        ballotType: type,
        selectedCandidateIds: chosenCandidateIds,
        registeredBy: 'MESA_CENTRAL',
      };

      const res = await axios.post('/api/elections/ballot', payload);
      if (res.data.success) {
        playSuccessChime();
        setLastSavedInfo({
          ballotNumber: res.data.ballot.ballotNumber,
          type,
          candidateIds: chosenCandidateIds,
          candidateNames: chosenNames,
          timestamp: Date.now(),
        });

        setRecentlyVotedCandidateIds(chosenCandidateIds);
        setTimeout(() => {
          setRecentlyVotedCandidateIds([]);
        }, 3500);

        setStats(res.data.stats);
        setCandidates(res.data.stats.candidates || []);
        setSelectedCandidateIds([]);

        toast.success(
          `✓ Boleta #${res.data.ballot.ballotNumber} guardada • Resultados actualizados al instante`,
          {
            duration: 3000,
            style: {
              background: '#041c0e',
              color: '#34d399',
              border: '2px solid #059669',
              fontWeight: 'bold',
            },
          }
        );
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al registrar boleta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Undo last ballot
  const handleUndo = async () => {
    if (!stats || stats.totalBallots === 0) {
      toast.error('No hay boletas registradas para deshacer.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await axios.post('/api/elections/ballot/undo', { electionId });
      if (res.data.success) {
        playClickSound(300, 0.12, 'sawtooth');
        setStats(res.data.stats);
        setCandidates(res.data.stats.candidates || []);
        setLastSavedInfo(null);
        setRecentlyVotedCandidateIds([]);
        toast.success(`Boleta #${res.data.undoneBallotNumber} deshecha.`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al deshacer boleta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcut: Press Enter to submit valid ballot
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && selectedCandidateIds.length > 0 && !isSubmitting && activeTab !== 'LIVE_RESULTS') {
        handleRegisterBallot('VALID');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCandidateIds, isSubmitting, activeTab, electionId, candidates]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-brand-gold selection:text-black">
      {/* Background Subtle Ambient Lights */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[650px] h-[650px] bg-brand-gold/[0.08] rounded-full blur-[140px]" />
        <div className="absolute top-1/4 -right-40 w-[700px] h-[700px] bg-emerald-500/[0.08] rounded-full blur-[160px]" />
      </div>

      {/* TOP UNIVERSAL SINGLE BAR: UNIFIES BRANDING, ÁNFORA STATS, OPERATOR ACTIONS & VIEW CONTROLS */}
      <header className="sticky top-0 z-50 w-full bg-[#03140a]/95 backdrop-blur-xl border-b-2 border-brand-gold/40 shadow-2xl px-3 sm:px-6 py-2.5 transition-all">
        <div className="w-full max-w-[1920px] mx-auto flex items-center justify-between gap-3 flex-wrap">
          
          {/* 1. BRANDING & CLUB INTELIGENTE (Requirement: Club Inteligente al lado del logo principal) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Volver al menú principal"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden xl:inline">Volver</span>
            </button>

            <div className="h-6 w-[1px] bg-white/15 hidden sm:block" />

            {/* Logo + CLUB INTELIGENTE */}
            <div className="flex items-center gap-2.5">
              <CrestLogo size="sm" className="w-8 h-10 shrink-0 drop-shadow-md" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-black tracking-wider uppercase bg-gradient-to-r from-amber-200 via-brand-gold to-yellow-400 bg-clip-text text-transparent drop-shadow-sm font-sans">
                    CLUB INTELIGENTE
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hidden sm:inline-block">
                    ESCRUTINIO EN VIVO
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-300">
                  <span className="font-bold text-gray-200">CHLS 2026</span>
                  <span>•</span>
                  <span className="text-gray-400 hidden md:inline">Elecciones Directorio</span>
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${isWsConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                    <span className={isWsConnected ? 'text-emerald-400' : 'text-amber-400'}>
                      {isWsConnected ? 'En vivo' : 'Sync 1.5s'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. OPERATOR ACTION COMMANDS & ÁNFORA METRICS (Only in Ballot Entry or Dual View) */}
          {(activeTab === 'BALLOT_ENTRY' || activeTab === 'DUAL_VIEW') && (
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              {/* Badges Capsule */}
              <div className="flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-xl border border-brand-gold/40 text-xs font-mono shadow-inner">
                <span className="text-brand-gold font-bold">
                  Boleta <strong className="text-white">#{(stats?.totalBallots || 0) + 1}</strong>
                </span>
                <span className="text-gray-600">|</span>
                <span className="text-gray-300">
                  Ánfora: <strong className="text-white">{stats?.totalBallots || 0}</strong>
                </span>
                <span className="text-gray-600">|</span>
                <span className="text-emerald-300 font-bold">
                  Marcas: <strong>{selectedCandidateIds.length}</strong>/{maxSelections}
                </span>
              </div>

              {/* Botón Registrar Válido */}
              <button
                onClick={() => handleRegisterBallot('VALID')}
                disabled={isSubmitting || selectedCandidateIds.length === 0}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg ${
                  selectedCandidateIds.length > 0
                    ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-300/60 ring-2 ring-emerald-400/40 hover:scale-105 active:scale-95 animate-pulse'
                    : 'bg-emerald-950/40 text-emerald-600 border border-emerald-900/40 cursor-not-allowed opacity-50'
                }`}
                title="Registrar boleta válida (tecla Enter)"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Registrar ({selectedCandidateIds.length})</span>
                <kbd className="hidden sm:inline text-[9px] bg-black/40 px-1 py-0.5 rounded border border-white/20">↵</kbd>
              </button>

              {/* Botón Voto Blanco */}
              <button
                onClick={() => handleRegisterBallot('BLANK')}
                disabled={isSubmitting}
                className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600/50 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow"
                title="Registrar boleta sin marcas (Voto en Blanco)"
              >
                Blanco
              </button>

              {/* Botón Voto Nulo */}
              <button
                onClick={() => handleRegisterBallot('NULL')}
                disabled={isSubmitting}
                className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-rose-200 border border-rose-500/40 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow"
                title="Registrar boleta anulada (Voto Nulo)"
              >
                Nulo
              </button>

              {/* Botón Deshacer */}
              <button
                onClick={handleUndo}
                disabled={isSubmitting || (stats?.totalBallots || 0) === 0}
                className="p-1.5 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-500/40 rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow"
                title="Deshacer última boleta registrada"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Botón Limpiar Selección */}
              {selectedCandidateIds.length > 0 && (
                <button
                  onClick={() => setSelectedCandidateIds([])}
                  className="text-[11px] text-rose-400 hover:text-rose-300 underline font-medium cursor-pointer"
                  title="Desmarcar todos los postulantes seleccionados"
                >
                  Limpiar
                </button>
              )}
            </div>
          )}

          {/* 3. NAVIGATION VIEW SWITCHERS & EXTRAS */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Vistas: Mesa / Modo Dual / Resultados */}
            <div className="flex items-center p-0.5 bg-black/60 rounded-xl border border-white/15">
              <button
                onClick={() => setActiveTab('BALLOT_ENTRY')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'BALLOT_ENTRY'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Mesa de Cargado de Boletas"
              >
                <Vote className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Mesa</span>
              </button>

              <button
                onClick={() => setActiveTab('DUAL_VIEW')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'DUAL_VIEW'
                    ? 'bg-gradient-to-r from-amber-500 via-brand-gold to-yellow-400 text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Modo Dual: Mesa + Resultados simultáneos"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Modo Dual</span>
              </button>

              <button
                onClick={() => setActiveTab('LIVE_RESULTS')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'LIVE_RESULTS'
                    ? 'bg-gradient-to-r from-brand-gold to-amber-500 text-black shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Resultados para Proyector / Sala de Prensa"
              >
                <Tv className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Resultados</span>
              </button>
            </div>

            {/* Formato 3D / TV (si está en Resultados o Dual) */}
            {(activeTab === 'LIVE_RESULTS' || activeTab === 'DUAL_VIEW') && (
              <div className="flex items-center p-0.5 bg-black/60 rounded-xl border border-brand-gold/30">
                <button
                  onClick={() => setResultsFormat('PILLARS_3D')}
                  className={`px-2 py-1 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                    resultsFormat === 'PILLARS_3D'
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Columnas 3D CHLS"
                >
                  3D
                </button>
                <button
                  onClick={() => setResultsFormat('UNITEL_TV')}
                  className={`px-2 py-1 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                    resultsFormat === 'UNITEL_TV'
                      ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Conteo TV HD"
                >
                  TV
                </button>
              </div>
            )}

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Salir de pantalla completa' : 'Ocupar toda la pantalla (Pantalla Completa)'}
              className="p-2 bg-white/5 hover:bg-white/10 text-brand-gold hover:text-amber-300 rounded-xl border border-brand-gold/30 transition-all cursor-pointer"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            {/* Settings Modal Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Parametrizar Postulantes y Reglas de Elección"
              className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl border border-white/10 transition-all cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="relative z-10 flex-1 w-full max-w-[1920px] mx-auto px-3 sm:px-6 py-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <CrestLogo size="md" className="w-16 h-20 animate-pulse" />
            <span className="text-xs uppercase tracking-widest text-brand-gold font-bold">
              Cargando Sistema de Escrutinio...
            </span>
          </div>
        ) : (
          <>
            {/* VIEW 1: ONLY BALLOT ENTRY CONSOLE */}
            {activeTab === 'BALLOT_ENTRY' && (
              <BallotEntryConsole
                electionId={electionId}
                candidates={candidates}
                stats={stats}
                maxSelections={maxSelections}
                selectedCandidateIds={selectedCandidateIds}
                toggleCandidate={toggleCandidate}
                recentlyVotedCandidateIds={recentlyVotedCandidateIds}
                lastSavedInfo={lastSavedInfo}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onViewResults={() => setActiveTab('LIVE_RESULTS')}
              />
            )}

            {/* VIEW 2: ONLY FULLSCREEN / PROJECTOR RESULTS */}
            {activeTab === 'LIVE_RESULTS' && (
              <div className="space-y-4">
                {resultsFormat === 'PILLARS_3D' ? (
                  stats && <LiveResultsPillars3D stats={stats} />
                ) : (
                  stats && <LiveResultsUnitelStyle stats={stats} />
                )}
              </div>
            )}

            {/* VIEW 3: DUAL MODE (MESA DE CARGADO + RESULTADOS EN VIVO SIMULTÁNEOS) */}
            {activeTab === 'DUAL_VIEW' && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                <div className="xl:col-span-6 space-y-4">
                  <BallotEntryConsole
                    electionId={electionId}
                    candidates={candidates}
                    stats={stats}
                    maxSelections={maxSelections}
                    selectedCandidateIds={selectedCandidateIds}
                    toggleCandidate={toggleCandidate}
                    recentlyVotedCandidateIds={recentlyVotedCandidateIds}
                    lastSavedInfo={lastSavedInfo}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onViewResults={() => setActiveTab('LIVE_RESULTS')}
                  />
                </div>

                <div className="xl:col-span-6 sticky top-20">
                  {resultsFormat === 'PILLARS_3D' ? (
                    stats && <LiveResultsPillars3D stats={stats} />
                  ) : (
                    stats && <LiveResultsUnitelStyle stats={stats} />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Parametrization Modal */}
      {electionId && (
        <CandidateParametrizationModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          electionId={electionId}
          candidates={candidates}
          stats={stats}
          onUpdated={(newStats) => {
            setStats(newStats);
            setCandidates(newStats.candidates || []);
          }}
        />
      )}
    </div>
  );
};
