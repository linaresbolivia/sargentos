import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Plus, 
  Trash2, 
  Link as LinkIcon, 
  ExternalLink,
  Film, 
  Copy,
  Check,
  Video
} from 'lucide-react';
import toast from 'react-hot-toast';

import { commercialApi } from '../services/commercialApi';
import { 
  saveLocalVideoToDB, 
  getLocalVideosFromDB, 
  deleteLocalVideoFromDB 
} from '../services/localVideoStorage';

export interface CustomVideoLink {
  id: string;
  title: string;
  url: string;
  isCustom?: boolean;
  isLocal?: boolean;
}

export function parseVideoSource(url: string) {
  if (!url) return { isEmbed: false, type: 'none', src: '' };

  // Local Blob URL or direct video file
  if (url.startsWith('blob:') || url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
    return {
      isEmbed: false,
      type: 'direct',
      src: url,
    };
  }

  // YouTube parser
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return {
      isEmbed: true,
      type: 'youtube',
      videoId: ytMatch[1],
      src: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&playsinline=1&enablejsapi=1&rel=0&modestbranding=1`,
    };
  }

  // Vimeo parser
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      isEmbed: true,
      type: 'vimeo',
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&playsinline=1`,
    };
  }

  // Google Drive parser
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (driveMatch && driveMatch[1]) {
    return {
      isEmbed: true,
      type: 'gdrive',
      src: `https://drive.google.com/file/d/${driveMatch[1]}/preview`,
    };
  }

  // Direct MP4 / WebM / Video file
  return {
    isEmbed: false,
    type: 'direct',
    src: url,
  };
}

export const VideoShowcaseView: React.FC = () => {
  const [videoList, setVideoList] = useState<CustomVideoLink[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<CustomVideoLink | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls in Fullscreen mode when inactive
  const handleMouseMovePlayer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);

    if (isFullscreen) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 2500);
    }
  };

  useEffect(() => {
    if (!isFullscreen) {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      handleMouseMovePlayer();
    }
  }, [isFullscreen, isPlaying]);

  // Form states to add new link
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const embedInfo = parseVideoSource(selectedVideo ? selectedVideo.url : '');

  // Reset video error when selected video changes
  useEffect(() => {
    setVideoError(false);
  }, [selectedVideo?.id, selectedVideo?.url]);

  // Load both server videos AND local device IndexedDB videos on mount
  useEffect(() => {
    loadAllVideos();
  }, []);

  const loadAllVideos = async () => {
    try {
      // 1. Local IndexedDB videos stored on this specific device
      const localDBRecords = await getLocalVideosFromDB();
      const localItems: CustomVideoLink[] = localDBRecords.map(v => ({
        id: v.id,
        title: v.title,
        url: v.blobUrl || '',
        isCustom: true,
        isLocal: true,
      }));

      // 2. Online shared videos from server
      let serverItems: CustomVideoLink[] = [];
      try {
        const res = await commercialApi.getCommercialVideos();
        if (res && res.videos && Array.isArray(res.videos)) {
          serverItems = res.videos;
        }
      } catch (e) {
        console.error('Failed to fetch server videos:', e);
      }

      if (serverItems.length === 0) {
        serverItems = [
          {
            id: 'vid_yt_chls100',
            title: 'CHLS - Video Institucional Club Hípico',
            url: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
            isCustom: false,
          },
        ];
      }

      const combined = [...localItems, ...serverItems];
      setVideoList(combined);
      if (combined.length > 0) {
        setSelectedVideo(combined[0]);
      }
    } catch (err) {
      console.error('Error loading videos:', err);
    }
  };

  // Save list to localStorage
  useEffect(() => {
    localStorage.setItem('chls_user_video_links', JSON.stringify(videoList));
  }, [videoList]);

  // Sync selected video if list changes
  useEffect(() => {
    if (videoList.length > 0 && !videoList.some((v) => v.id === selectedVideo?.id)) {
      setSelectedVideo(videoList[0]);
    }
  }, [videoList, selectedVideo]);

  // Video listeners for direct MP4 videos
  useEffect(() => {
    if (embedInfo.isEmbed) return;

    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration || 0);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('ended', handleEnded);
    };
  }, [selectedVideo?.url, embedInfo.isEmbed]);

  const togglePlay = () => {
    if (embedInfo.isEmbed) return;
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (embedInfo.isEmbed) return;
    const video = videoRef.current;
    if (!video) return;
    const target = parseFloat(e.target.value);
    video.currentTime = target;
    setCurrentTime(target);
  };

  const toggleMute = () => {
    if (embedInfo.isEmbed) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (embedInfo.isEmbed) return;
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.volume = val;
    setVolume(val);
    if (val === 0) setIsMuted(true);
    else if (isMuted) setIsMuted(false);
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Handle INSTANT local video file selection from device memory (0s delay, 0s upload)
  const handleUploadLocalVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Create an INSTANT Blob URL directly pointing to the local file (takes 0.001ms)
    const instantBlobUrl = URL.createObjectURL(file);
    const cleanTitle = `📱 ${file.name.replace(/\.[^/.]+$/, '')}`;

    const newLocalItem: CustomVideoLink = {
      id: `local_vid_${Date.now()}`,
      title: cleanTitle,
      url: instantBlobUrl,
      isCustom: true,
      isLocal: true,
    };

    // 2. Play IMMEDIATELY! Zero waiting time!
    setVideoList(prev => [newLocalItem, ...prev]);
    setSelectedVideo(newLocalItem);
    
    toast.success(`▶ Reproduciendo al instante desde la tablet: ${file.name}`, {
      duration: 4000,
      icon: '⚡'
    });

    if (fileInputRef.current) fileInputRef.current.value = '';

    // 3. Save file in IndexedDB asynchronously in background so it persists on reload
    try {
      await saveLocalVideoToDB(file, file.name.replace(/\.[^/.]+$/, ''));
    } catch (err) {
      console.warn('Background IndexedDB save notice:', err);
    }
  };

  // Add a new online link
  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) {
      toast.error('Ingresa un título y una URL de video válidos');
      return;
    }

    const newItem: CustomVideoLink = {
      id: `vid_link_${Date.now()}`,
      title: newTitle.trim(),
      url: newUrl.trim(),
      isCustom: true,
      isLocal: false,
    };

    const updatedList = [newItem, ...videoList];
    setVideoList(updatedList);
    setSelectedVideo(newItem);
    setNewTitle('');
    setNewUrl('');
    setShowAddForm(false);

    try {
      const serverOnlyList = updatedList.filter(v => !v.isLocal);
      await commercialApi.saveCommercialVideos(serverOnlyList);
      toast.success('¡Enlace de video guardado y sincronizado!');
    } catch (err) {
      console.error(err);
      toast.success('¡Enlace guardado localmente!');
    }
  };

  // Delete a video link or local tablet video
  const handleDeleteLink = async (id: string, isLocal?: boolean) => {
    if (isLocal) {
      await deleteLocalVideoFromDB(id);
      toast.success('Video eliminado de la memoria de esta tablet');
    }

    const updatedList = videoList.filter((item) => item.id !== id);
    setVideoList(updatedList);
    if (updatedList.length > 0) {
      setSelectedVideo(updatedList[0]);
    } else {
      setSelectedVideo(null);
    }

    if (!isLocal) {
      try {
        const serverOnlyList = updatedList.filter(v => !v.isLocal);
        await commercialApi.saveCommercialVideos(serverOnlyList);
        toast.success('Enlace de video eliminado en el servidor');
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Copy link URL
  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('Enlace copiado al portapapeles');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      
      {/* Hidden File Input for Device Video Selection */}
      <input 
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
        onChange={handleUploadLocalVideo}
        className="hidden"
      />

      {/* Clean Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/90 dark:bg-[#0d1311]/90 p-5 rounded-3xl border border-gray-200 dark:border-white/10 backdrop-blur-md shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-gold/20 text-brand-gold border border-brand-gold/30 flex items-center gap-1">
              <Film className="w-3 h-3" /> Reproductor de Videos
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white serif-brand mt-1">
            Galería de Videos Institucionales
          </h2>
        </div>

        {/* Action Buttons: Local Upload + Online Link */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20 hover:scale-105 transition-all cursor-pointer border border-emerald-400/30"
          >
            <Plus className="w-4 h-4" />
            <span>📁 Cargar Video Local (MP4 / MOV)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-gold via-yellow-500 to-amber-500 text-black font-extrabold text-xs flex items-center gap-2 hover:scale-105 shadow-md shadow-brand-gold/20 transition-all cursor-pointer"
          >
            <LinkIcon className="w-4 h-4" />
            <span>{showAddForm ? 'Cerrar Formulario' : 'Agregar Enlace YouTube'}</span>
          </button>
        </div>
      </div>

      {/* Inline Form to Add Video Link */}
      {showAddForm && (
        <form 
          onSubmit={handleAddLink}
          className="p-5 rounded-3xl bg-amber-500/10 border border-brand-gold/40 space-y-4 animate-fadeIn"
        >
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-brand-gold" />
            Agregar Nuevo Enlace de Video (YouTube, Vimeo, MP4, etc.)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Título del Video:
              </label>
              <input
                type="text"
                placeholder="Ej. CHLS 100 Años"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-black/60 border border-gray-300 dark:border-white/20 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-brand-gold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Enlace / URL (YouTube, MP4, Vimeo):
              </label>
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=WW7E8cYDbgy"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-black/60 border border-gray-300 dark:border-white/20 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-brand-gold font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-brand-gold text-black font-extrabold text-xs hover:scale-105 transition-transform cursor-pointer"
            >
              Guardar Enlace en la Lista
            </button>
          </div>
        </form>
      )}

      {/* Main Grid: Video Player + Clean Links List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Main Video Player */}
        <div className="lg:col-span-2 space-y-3">
          <div 
            ref={playerContainerRef}
            onMouseMove={handleMouseMovePlayer}
            onTouchStart={handleMouseMovePlayer}
            onMouseLeave={() => {
              if (isFullscreen && isPlaying) {
                setShowControls(false);
              }
            }}
            className={`relative overflow-hidden bg-black border border-brand-gold/30 shadow-2xl transition-all ${
              isFullscreen 
                ? 'fixed inset-0 z-50 rounded-none h-screen w-screen' 
                : 'aspect-video rounded-3xl'
            }`}
          >
            {selectedVideo ? (
              embedInfo.isEmbed ? (
                /* Universal Embed Iframe (YouTube, Vimeo, Google Drive) */
                <iframe
                  src={embedInfo.src}
                  title={selectedVideo.title}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              ) : (
                /* Direct HTML5 Video Player */
                <>
                  <video
                    ref={videoRef}
                    key={embedInfo.src}
                    src={embedInfo.src}
                    onClick={togglePlay}
                    onError={() => setVideoError(true)}
                    className="absolute inset-0 w-full h-full object-cover cursor-pointer"
                    playsInline
                    autoPlay
                    loop
                    preload="auto"
                    controls={false}
                  >
                    <source src={embedInfo.src} type="video/mp4" />
                    <source src={embedInfo.src} type="video/quicktime" />
                    <source src={embedInfo.src} type="video/webm" />
                  </video>

                  {videoError && (
                    <div className="absolute inset-0 bg-black/95 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center space-y-3 z-30">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
                        <Film className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-wider">
                          Formato de Video (.MOV HEVC) No Soportado
                        </h4>
                        <p className="text-xs text-amber-200/90 max-w-md mt-1 leading-relaxed">
                          Este archivo <strong>.MOV</strong> fue grabado con el códec <strong>HEVC de Apple</strong>, el cual Chrome restringe.
                        </p>
                      </div>
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-left text-xs space-y-1 max-w-md text-gray-300">
                        <p className="font-bold text-brand-gold">💡 Recomendación:</p>
                        <p>Guarda o convierte el video a formato <strong>.MP4 (H.264)</strong> antes de seleccionarlo.</p>
                      </div>
                    </div>
                  )}

                  {!isPlaying && (
                    <button
                      onClick={togglePlay}
                      className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-brand-gold/90 text-black flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.6)] hover:scale-110 transition-all z-10 cursor-pointer"
                    >
                      <Play className="w-7 h-7 ml-1 fill-black" />
                    </button>
                  )}

                  {/* Absolute Floating Control Bar (Slides down seamlessly without affecting video size) */}
                  <div className={`absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent backdrop-blur-sm space-y-2 transition-all duration-500 ease-in-out transform ${
                    isFullscreen && !showControls 
                      ? 'translate-y-full opacity-0 pointer-events-none' 
                      : 'translate-y-0 opacity-100'
                  }`}>
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      step={0.1}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full accent-brand-gold h-1.5 bg-white/20 rounded-lg cursor-pointer"
                    />

                    <div className="flex justify-between items-center text-white text-xs">
                      <div className="flex items-center gap-3">
                        <button onClick={togglePlay} className="text-brand-gold hover:text-white transition-colors">
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button onClick={toggleMute} className="text-gray-300 hover:text-white">
                            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </button>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-16 accent-brand-gold h-1 bg-white/20 rounded cursor-pointer"
                          />
                        </div>

                        <span className="font-mono text-[11px] text-gray-300">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>

                      <button onClick={toggleFullscreen} className="text-gray-300 hover:text-white">
                        {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
                <Video className="w-12 h-12 mb-2 text-brand-gold/60" />
                <p className="font-bold">No hay videos seleccionados</p>
                <p className="text-xs text-gray-500 mt-1">Carga un video local (MP4) o agrega un enlace</p>
              </div>
            )}
          </div>

          {/* Active Video Title Bar */}
          {selectedVideo && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#0d1311]/90 border border-gray-200 dark:border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Video className="w-3 h-3 text-brand-gold" />
                    <span className="text-brand-gold font-extrabold">{selectedVideo.isLocal ? 'Video Local MP4' : (embedInfo.type === 'youtube' ? 'YouTube HD' : embedInfo.type === 'vimeo' ? 'Vimeo' : 'Video Directo')}</span>
                  </span>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white serif-brand">
                    {selectedVideo.title}
                  </h3>
                </div>

                {!selectedVideo.isLocal && embedInfo.type === 'youtube' && (
                  <a 
                    href={selectedVideo.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-gold via-yellow-500 to-amber-500 text-black font-extrabold text-xs flex items-center gap-1.5 hover:scale-105 shadow-md shadow-brand-gold/20 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Abrir en YouTube</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Clean List of Videos (Local + Online) */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Videos Disponibles ({videoList.length})
            </h3>
          </div>

          {videoList.length > 0 ? (
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {videoList.map((video) => {
                const isSelected = selectedVideo?.id === video.id;

                return (
                  <div
                    key={video.id}
                    className={`p-3.5 rounded-2xl transition-all border flex flex-col justify-between gap-2 group ${
                      isSelected 
                        ? (video.isLocal ? 'bg-emerald-500/15 border-emerald-500 shadow-md' : 'bg-amber-500/15 border-brand-gold shadow-md')
                        : 'bg-white dark:bg-[#0a100d] border-gray-200 dark:border-white/10 hover:border-brand-gold/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div 
                        onClick={() => setSelectedVideo(video)}
                        className="cursor-pointer flex-1 min-w-0"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          {video.isLocal ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              📱 En esta tablet
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              🌐 Enlace Online
                            </span>
                          )}
                        </div>
                        <h4 className={`text-xs font-bold line-clamp-2 transition-colors ${isSelected ? (video.isLocal ? 'text-emerald-400' : 'text-brand-gold') : 'text-gray-900 dark:text-white group-hover:text-brand-gold'}`}>
                          {video.title}
                        </h4>
                        {!video.isLocal && (
                          <p className="text-[10px] text-gray-400 font-mono truncate mt-1">
                            {video.url}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => setSelectedVideo(video)}
                        className={`p-2 rounded-xl transition-all cursor-pointer ${isSelected ? (video.isLocal ? 'bg-emerald-500 text-black' : 'bg-brand-gold text-black') : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
                        title="Reproducir Video"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-white/5 text-[10px]">
                      {!video.isLocal ? (
                        <button
                          onClick={() => handleCopyLink(video.url, video.id)}
                          className="text-gray-500 hover:text-brand-gold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {copiedId === video.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedId === video.id ? 'Copiado' : 'Copiar Enlace'}</span>
                        </button>
                      ) : (
                        <span className="text-[9px] text-gray-400">Guardado en IndexedDB</span>
                      )}

                      <button
                        onClick={() => handleDeleteLink(video.id, video.isLocal)}
                        className="text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Eliminar video"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white/5 border border-dashed border-white/10 text-center space-y-3">
              <Film className="w-8 h-8 mx-auto text-brand-gold/60" />
              <p className="text-xs font-bold text-gray-300">No hay videos en la lista</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-extrabold hover:scale-105 transition-transform"
              >
                + Cargar Video Local MP4
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
export default VideoShowcaseView;
