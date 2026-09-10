import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  RefreshCw,
  Volume2,
  VolumeX
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
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('chls_elections_muted') === 'true';
  });
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

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
    if (isMuted) return;
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
  }, [isMuted]);

  // Play grand broadcast institutional fanfare upon entering the elections hub
  // Play solely the official voice audio without any background effect sounds
  const playIntroAudio = useCallback(() => {
    if (isMuted) return;

    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      }
      const voiceAudio = new Audio('/audio/intro_elections.mp3');
      voiceAudio.volume = 0.9;
      audioPlayerRef.current = voiceAudio;

      const playPromise = voiceAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay was blocked; it will wait for the first click/keypress
        });
      }
    } catch {
      // Audio playback failed silently
    }
  }, [isMuted]);

  // Trigger intro voice audio upon entering the voting module
  useEffect(() => {
    let hasPlayed = false;
    const tryPlay = () => {
      if (hasPlayed) return;
      hasPlayed = true;
      playIntroAudio();
      window.removeEventListener('click', tryPlay);
      window.removeEventListener('keydown', tryPlay);
    };

    // Attempt direct play immediately on entry
    tryPlay();

    // Fallback: If browser autoplay policy required a user gesture, play on first click/key
    window.addEventListener('click', tryPlay);
    window.addEventListener('keydown', tryPlay);

    return () => {
      window.removeEventListener('click', tryPlay);
      window.removeEventListener('keydown', tryPlay);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, [playIntroAudio]);

  const toggleAudio = () => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem('chls_elections_muted', String(next));
      if (!next) {
        toast('Audio activado', { icon: '🔊' });
        // Replay voice audio upon unmuting
        setTimeout(() => playIntroAudio(), 50);
      } else {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
        }
        toast('Audio silenciado', { icon: '🔇' });
      }
      return next;
    });
  };

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

  // 2. Fallback polling only when WebSocket is disconnected
  useEffect(() => {
    if (isWsConnected) return;
    const interval = setInterval(() => {
      fetchElectionData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [isWsConnected]);

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

  const maxSelections = stats?.maxSelectionsPerBallot || candidates.length || 11;

  // Toggle candidate selection - sin límite artificial de 5 marcas
  const toggleCandidate = (id: string) => {
    playClickSound(520, 0.04);
    setSelectedCandidateIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((cId) => cId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Register ballot with INSTANT 0ms Optimistic UI Response
  const handleRegisterBallot = async (type: 'VALID' | 'BLANK' | 'NULL') => {
    if (type === 'VALID' && selectedCandidateIds.length === 0) {
      toast.error('Selecciona al menos un postulante o marca Voto en Blanco / Nulo.');
      return;
    }
    if (isSubmitting) return;

    const chosenCandidateIds = type === 'VALID' ? [...selectedCandidateIds] : [];
    const chosenNames = candidates
      .filter((c) => chosenCandidateIds.includes(c.id))
      .map((c) => c.fullName);

    // 1. RESPUESTA INSTANTÁNEA (0ms): Limpiar casillas, sonido y animación visual
    playSuccessChime();
    setSelectedCandidateIds([]);
    setRecentlyVotedCandidateIds(chosenCandidateIds);
    setTimeout(() => {
      setRecentlyVotedCandidateIds([]);
    }, 2500);

    // Actualización optimista inmediata de estadísticas en memoria
    setStats((prev) => {
      if (!prev) return prev;
      const nextTotal = prev.totalBallots + 1;
      const nextValid = type === 'VALID' ? prev.validBallots + 1 : prev.validBallots;
      const nextBlank = type === 'BLANK' ? prev.blankBallots + 1 : prev.blankBallots;
      const nextNull = type === 'NULL' ? prev.nullBallots + 1 : prev.nullBallots;
      const nextVotes = prev.totalVotesAccumulated + chosenCandidateIds.length;

      const updatedCandidates = prev.candidates.map((cand) => {
        if (chosenCandidateIds.includes(cand.id)) {
          const newVotes = (cand.votesCount || 0) + 1;
          return {
            ...cand,
            votesCount: newVotes,
            votesPercentage: nextTotal > 0 ? Number(((newVotes / nextTotal) * 100).toFixed(1)) : 0,
          };
        } else {
          return {
            ...cand,
            votesPercentage: nextTotal > 0 ? Number(((cand.votesCount / nextTotal) * 100).toFixed(1)) : 0,
          };
        }
      });

      return {
        ...prev,
        totalBallots: nextTotal,
        validBallots: nextValid,
        validPercentage: nextTotal > 0 ? Number(((nextValid / nextTotal) * 100).toFixed(1)) : 0,
        blankBallots: nextBlank,
        blankPercentage: nextTotal > 0 ? Number(((nextBlank / nextTotal) * 100).toFixed(1)) : 0,
        nullBallots: nextNull,
        nullPercentage: nextTotal > 0 ? Number(((nextNull / nextTotal) * 100).toFixed(1)) : 0,
        totalVotesAccumulated: nextVotes,
        candidates: updatedCandidates,
      };
    });

    // 2. Persistir en base de datos en segundo plano
    try {
      setIsSubmitting(true);
      const payload = {
        electionId,
        ballotType: type,
        selectedCandidateIds: chosenCandidateIds,
        registeredBy: 'MESA_CENTRAL',
      };

      const res = await axios.post('/api/elections/ballot', payload);
      if (res.data.success) {
        setLastSavedInfo({
          ballotNumber: res.data.ballot.ballotNumber,
          type,
          candidateIds: chosenCandidateIds,
          candidateNames: chosenNames,
          timestamp: Date.now(),
        });
        setStats(res.data.stats);
        setCandidates(res.data.stats.candidates || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar boleta en el servidor.');
      fetchElectionData(true);
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
    <div className="min-h-screen bg-gradient-to-br from-[#060e18] via-[#091524] to-[#03080e] text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-brand-gold selection:text-black">
      {/* Background Subtle Ambient Lights */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] bg-blue-600/[0.08] rounded-full blur-[160px]" />
        <div className="absolute top-1/4 -right-40 w-[750px] h-[750px] bg-emerald-500/[0.08] rounded-full blur-[170px]" />
        <div className="absolute bottom-10 left-1/4 w-[600px] h-[600px] bg-brand-gold/[0.07] rounded-full blur-[180px]" />
      </div>

      {/* TOP UNIVERSAL SINGLE BAR: UNIFIES BRANDING, ÁNFORA STATS, OPERATOR ACTIONS & VIEW CONTROLS */}
      <header className="sticky top-0 z-50 w-full bg-[#071322]/95 backdrop-blur-xl border-b-2 border-brand-gold/40 shadow-2xl px-3 sm:px-6 py-2.5 transition-all">
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
          {/* 2. OPERATIONAL INFO (MESA ESCRUTINIO) */}
          {(activeTab === 'BALLOT_ENTRY' || activeTab === 'DUAL_VIEW') && (
            <div className="flex items-center gap-2 sm:gap-2.5">
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
                  Marcas: <strong>{selectedCandidateIds.length}</strong>
                </span>
              </div>
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

            {/* Audio Toggle / Replay Button */}
            <button
              onClick={toggleAudio}
              title={isMuted ? 'Activar audio (Silenciado actualmente)' : 'Audio institucional activo (Clic para silenciar o reproducir)'}
              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                isMuted
                  ? 'bg-rose-950/40 text-rose-300 border-rose-500/40 hover:bg-rose-900/60'
                  : 'bg-white/5 hover:bg-white/10 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
            </button>

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
                onRegisterBallot={handleRegisterBallot}
                onUndo={handleUndo}
                onClearSelection={() => setSelectedCandidateIds([])}
                isSubmitting={isSubmitting}
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
                    onRegisterBallot={handleRegisterBallot}
                    onUndo={handleUndo}
                    onClearSelection={() => setSelectedCandidateIds([])}
                    isSubmitting={isSubmitting}
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
