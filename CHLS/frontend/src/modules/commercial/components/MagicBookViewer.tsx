import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  BookOpen, 
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Hand,
  Save,
  Check,
  Globe,
  RefreshCw
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import CrestLogo from '@shared/components/CrestLogo';
import { FirefliesCanvas } from './FirefliesCanvas';
import { commercialApi } from '../services/commercialApi';
import lawnBgUrl from '../../../assets/lawn_bg.jpg';
import logoUrl from '../../../assets/logo.png';
import toast from 'react-hot-toast';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;



// Built-in Luxury Editorial Magazine for CHLS
export const DEFAULT_CHLS_PAGES = [
  {
    pageNumber: 1,
    type: 'COVER',
    title: 'CLUB HÍPICO LOS SARGENTOS',
    subtitle: '',
    edition: '',
    description: '',
    badge: 'EDICIÓN SELECTA EXCLUSIVA',
  },
  {
    pageNumber: 2,
    type: 'CONTENT',
    chapter: 'CAPÍTULO I',
    title: 'Nuestra Esencia & Patrimonio',
    body: `Fundado en 1955 en el corazón de la zona sur de La Paz, el Club Hípico Los Sargentos representa el estándar más alto de distinción, vida familiar y excelencia deportiva en Bolivia.
    
Con más de 18 hectáreas de áreas verdes, infraestructura ecuestre de nivel internacional y un complejo multideportivo completo, el club es el punto de encuentro predilecto de las familias y líderes más distinguidos del país.
    
Nuestros socios no solo acceden a instalaciones de clase mundial, sino que forman parte de una comunidad donde la hípica, la amistad y los valores familiares se transmiten por generaciones.`,
    quote: '"La elegancia de la tradición, la energía del deporte y el orgullo de pertenecer."',
    author: 'Directorio General CHLS',
  },
  {
    pageNumber: 3,
    type: 'CONTENT',
    chapter: 'CAPÍTULO II',
    title: 'Complejo Hípico & Salto Ecuestre',
    body: `El alma de nuestro club late en el picadero. Contamos con:
    
• Picadero Principal Olímpico y Pistas de Arena de Salto de competición internacional.
• Más de 120 Boxes confortables con atención veterinaria especializada 24/7 y mozos de cuadra experimentados.
• Escuela Ecuestre de iniciación y perfeccionamiento para niños, jóvenes y adultos en salto y adiestramiento.
• Cuadras de paso, caminador mecánico y senderos campestres de recreación.
    
Los binomios sargentinos han representado con honor a Bolivia en certámenes sudamericanos y panamericanos.`,
    quote: 'La hípica como pasión, disciplina y estilo de vida.',
    tag: 'INSTALACIONES ECUESTRES',
  },
  {
    pageNumber: 4,
    type: 'CONTENT',
    chapter: 'CAPÍTULO III',
    title: 'Piscina Semiolímpica Temperada & Spa',
    body: `Un oasis de bienestar los 365 días del año:
    
• Piscina techada semiolímpica climatizada a temperatura constante de 30°C.
• Jacuzzi de hidromasaje a 41°C para relajación muscular profunda.
• Complejo de Saunas: Sauna a Vapor con esencias naturales de hierbas y eucalipto, y Sauna Seco finlandés.
• Escuela de Natación con instructores federados y programas de matronatación infantil.
• Vestuarios de lujo con casilleros individuales y toallero de cortesía.`,
    quote: 'Salud, rendimiento y serenidad en un ambiente de confort absoluto.',
    tag: 'BIENESTAR & NATACIÓN',
  },
  {
    pageNumber: 5,
    type: 'CONTENT',
    chapter: 'CAPÍTULO IV',
    title: 'Tenis, Pádel, Frontón & Raquet',
    body: `El epicentro del deporte de raqueta en La Paz:
    
• 6 Canchas de Tenis reglamentarias de arcilla con iluminación LED nocturna.
• Modernas canchas de Pádel panorámicas de cristal templado.
• Complejo de Frontón, Squash y Raquetball de alta velocidad.
• Gimnasio de Alto Rendimiento equipado con tecnología de musculación y zona cardiovascular.
• Torneos internos mensuales, clínicas con profesionales y ranking oficial del club.`,
    quote: 'Pasión por el juego limpio, la competencia y el espíritu deportivo.',
    tag: 'DEPORTES DE RAQUETA',
  },
  {
    pageNumber: 6,
    type: 'CONTENT',
    chapter: 'CAPÍTULO V',
    title: 'Gastronomía, Salones & Vida Social',
    body: `Espacios diseñados para celebrar los momentos más memorables:
    
• Restaurante Principal "El Estribo" con alta gastronomía nacional e internacional y cava selecta.
• Terraza Lounge con vista panorámica a los picaderos y áreas verdes.
• Gran Salón Colonial y Salón de Convenciones para bodas, anniversarios y recepciones corporativas.
• Parrilleros campestres privados para fines de semana familiares.
• Tradicionales fiestas de gala: Fiesta de San Juan, Gala de Primavera y Brindis de Fin de Año.`,
    quote: 'Momentos inolvidables junto a quienes más aprecias.',
    tag: 'VIDA SOCIAL',
  },
  {
    pageNumber: 7,
    type: 'CONTENT',
    chapter: 'CAPÍTULO VI',
    title: 'Escuelas Deportivas para Hijos',
    body: `El mejor entorno para el crecimiento saludable y seguro de tus hijos:
    
• Academia Hípica Infantil: Desde los primeros pasos en pony hasta salto avanzado.
• Escuela Formativa de Tenis y Pádel por niveles de edad y destreza.
• Semillero de Natación & Waterpolo.
• Escuela de Fútbol y Polideportivo infantil.
• Campamentos vacacionales temáticos de verano e invierno con monitores certificados.`,
    quote: 'Formando el carácter, la disciplina y los campeones del mañana.',
    tag: 'FAMILIA & NIÑOS',
  },
  {
    pageNumber: 8,
    type: 'BACK_COVER',
    title: 'TU LUGAR EN LA HISTORIA DEL CLUB',
    subtitle: 'PROCESO DE ADMISIÓN & CONTACTO DIRECTO',
    body: `Para iniciar tu proceso de postulación a socio propietario o consultar opciones de membresía personalizada, el equipo comercial y de admisiones se encuentra a tu entera disposición.
    
• Teléfono / WhatsApp Admisiones: +591 (2) 279-4500 • Int. 104
• Correo Oficial: admisiones@lossargentos.bo
• Dirección: Av. Los Sargentos s/n, Zona Obrajes / Calacoto, La Paz - Bolivia`,
    footer: 'CLUB HÍPICO LOS SARGENTOS • 70 AÑOS DE PRESTIGIO Y TRADICIÓN',
  },
];

export const MagicBookViewer: React.FC = () => {
  const isTablet = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 1024);
  const [currentPage, setCurrentPage] = useState(0); // 0 = Cover Spread
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [firefliesEnabled, setFirefliesEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isSinglePageMode, setIsSinglePageMode] = useState(false);
  const [pdfPageAspectRatio, setPdfPageAspectRatio] = useState<number | null>(null);
  const [isSavingMagazine, setIsSavingMagazine] = useState(false);
  const [isCustomMagazineSaved, setIsCustomMagazineSaved] = useState(false);

  // Fetch initial saved active magazine from server
  useEffect(() => {
    const loadActiveMagazine = async () => {
      try {
        const data = await commercialApi.getActiveMagazine();
        if (data.success && data.isCustom && data.pages && data.pages.length > 0) {
          setPdfPages(data.pages);
          setPdfFileName(data.fileName);
          if (data.pageAspectRatio) {
            setPdfPageAspectRatio(data.pageAspectRatio);
          }
          setIsCustomMagazineSaved(true);
        }
      } catch (err) {
        console.error('Error fetching active magazine from server:', err);
      }
    };
    loadActiveMagazine();
  }, []);

  // --- LIGHTWEIGHT 3D PAGE FLIP PHYSICS STATE ---
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'FORWARD' | 'BACKWARD' | null>(null);
  const [flipProgress, setFlipProgress] = useState(0); // 0.0 to 1.0
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const bookStageRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const totalPages = pdfPages.length > 0 ? pdfPages.length : DEFAULT_CHLS_PAGES.length;

  // Snappy, GPU-optimized animation loop for turning page (380ms on tablet, 600ms on desktop)
  const animateFlip = useCallback((
    direction: 'FORWARD' | 'BACKWARD',
    startProgress: number = 0,
    targetProgress: number = 1,
    onComplete?: () => void
  ) => {
    setIsFlipping(true);
    setFlipDirection(direction);

    const startTime = performance.now();
    const duration = isTablet ? 380 : 600; // Ultra-fast and snappy on tablets

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      
      // Smooth and lightweight cubic bezier easing
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const current = startProgress + (targetProgress - startProgress) * ease;

      setFlipProgress(current);

      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        setFlipProgress(targetProgress);
        if (onComplete) onComplete();
        setIsFlipping(false);
        setFlipDirection(null);
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);
  }, [isTablet]);

  // Turn page forward
  const handleNextPage = useCallback(() => {
    if (isFlipping) return;
    const step = isSinglePageMode ? 1 : 2;
    if (currentPage + step >= totalPages) return;

    animateFlip('FORWARD', 0, 1, () => {
      setCurrentPage((prev) => prev + step);
      setFlipProgress(0);
    });
  }, [isFlipping, isSinglePageMode, currentPage, totalPages, animateFlip]);

  // Turn page backward
  const handlePrevPage = useCallback(() => {
    if (isFlipping || currentPage === 0) return;
    const step = isSinglePageMode ? 1 : 2;
    const prevTarget = Math.max(0, currentPage - step);

    animateFlip('BACKWARD', 0, 1, () => {
      setCurrentPage(prevTarget);
      setFlipProgress(0);
    });
  }, [isFlipping, isSinglePageMode, currentPage, animateFlip]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrevPage();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextPage, handlePrevPage]);

  // --- PINCH TO ZOOM TOUCH GESTURE ENGINE ---
  // Touch Pan & Zoom State
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPanPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(1);

  // Reset zoom & pan when flipping pages
  useEffect(() => {
    if (zoomLevel > 1.05) {
      setZoomLevel(1.0);
      setPanPosition({ x: 0, y: 0 });
    }
  }, [currentPage]);

  // --- TOUCH HANDLERS FOR PINCH-ZOOM & FREE 2D PAN DRAGGING ---
  const handleTouchStart = (e: React.TouchEvent) => {
    // 2-Finger Pinch Zooming
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistanceRef.current = dist;
      initialZoomRef.current = zoomLevel;
      setIsDragging(false);
      setIsPanning(false);
      return;
    }

    // 1-Finger Touch
    if (e.touches.length === 1) {
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;

      if (zoomLevel > 1.05) {
        // When zoomed in, 1-finger touch pans/moves the book freely around the screen!
        setIsPanning(true);
        setIsDragging(false);
        panStartRef.current = { x: touchX, y: touchY };
        initialPanPosRef.current = { ...panPosition };
      } else {
        // When at 1.0x scale, 1-finger touch drags/flips the page
        setIsPanning(false);
        handleDragStart(e);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // 2-Finger Pinch Zooming
    if (e.touches.length === 2 && initialPinchDistanceRef.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleFactor = currentDist / initialPinchDistanceRef.current;
      const newZoom = Math.min(3.5, Math.max(1.0, initialZoomRef.current * scaleFactor));
      setZoomLevel(parseFloat(newZoom.toFixed(2)));

      if (newZoom <= 1.05) {
        setPanPosition({ x: 0, y: 0 });
      }
      return;
    }

    // 1-Finger Panning when Zoomed In
    if (e.touches.length === 1 && isPanning && zoomLevel > 1.05) {
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const deltaX = touchX - panStartRef.current.x;
      const deltaY = touchY - panStartRef.current.y;

      // Limit max pan offset based on zoom factor
      const maxPanX = (zoomLevel - 1) * 420;
      const maxPanY = (zoomLevel - 1) * 360;

      const newPanX = Math.min(maxPanX, Math.max(-maxPanX, initialPanPosRef.current.x + deltaX));
      const newPanY = Math.min(maxPanY, Math.max(-maxPanY, initialPanPosRef.current.y + deltaY));

      setPanPosition({ x: newPanX, y: newPanY });
      return;
    }

    // 1-Finger Page Turning when at 1.0x Scale
    if (e.touches.length === 1 && !isPanning && zoomLevel <= 1.05) {
      handleDragMove(e);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      initialPinchDistanceRef.current = null;
    }
    if (isPanning) {
      setIsPanning(false);
    } else {
      handleDragEnd();
    }
  };

  // --- MOUSE / TOUCH REALTIME DRAG & PANNING ---
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isFlipping) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (zoomLevel > 1.05) {
      setIsPanning(true);
      panStartRef.current = { x: clientX, y: clientY };
      initialPanPosRef.current = { ...panPosition };
      return;
    }

    setIsDragging(true);
    setDragStartX(clientX);
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (isPanning && zoomLevel > 1.05) {
      const deltaX = clientX - panStartRef.current.x;
      const deltaY = clientY - panStartRef.current.y;

      const maxPanX = (zoomLevel - 1) * 420;
      const maxPanY = (zoomLevel - 1) * 360;

      const newPanX = Math.min(maxPanX, Math.max(-maxPanX, initialPanPosRef.current.x + deltaX));
      const newPanY = Math.min(maxPanY, Math.max(-maxPanY, initialPanPosRef.current.y + deltaY));

      setPanPosition({ x: newPanX, y: newPanY });
      return;
    }

    if (!isDragging) return;
    const deltaX = clientX - dragStartX;
    const bookWidth = bookStageRef.current?.clientWidth || 800;
    const halfWidth = bookWidth / 2;

    if (deltaX < 0 && currentPage + (isSinglePageMode ? 1 : 2) < totalPages) {
      setFlipDirection('FORWARD');
      const progress = Math.min(1, Math.abs(deltaX) / halfWidth);
      setFlipProgress(progress);
    } else if (deltaX > 0 && currentPage > 0) {
      setFlipDirection('BACKWARD');
      const progress = Math.min(1, deltaX / halfWidth);
      setFlipProgress(progress);
    }
  };

  const handleDragEnd = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    if (!isDragging) return;
    setIsDragging(false);

    if (flipDirection === 'FORWARD') {
      if (flipProgress > 0.3) {
        animateFlip('FORWARD', flipProgress, 1, () => {
          const step = isSinglePageMode ? 1 : 2;
          setCurrentPage((prev) => Math.min(totalPages - 1, prev + step));
          setFlipProgress(0);
        });
      } else {
        animateFlip('FORWARD', flipProgress, 0);
      }
    } else if (flipDirection === 'BACKWARD') {
      if (flipProgress > 0.3) {
        animateFlip('BACKWARD', flipProgress, 1, () => {
          const step = isSinglePageMode ? 1 : 2;
          setCurrentPage((prev) => Math.max(0, prev - step));
          setFlipProgress(0);
        });
      } else {
        animateFlip('BACKWARD', flipProgress, 0);
      }
    }
  };

  // PDF Upload handler
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Por favor selecciona un archivo PDF válido');
      return;
    }

    try {
      setIsPdfLoading(true);
      setPdfFileName(file.name);
      toast.loading('Cargando y renderizando revista en alta definición...', { id: 'pdf-load' });

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      const renderedImages: string[] = [];

      // Detect Aspect Ratio from Page 1
      if (numPages > 0) {
        const page1 = await pdf.getPage(1);
        const vp1 = page1.getViewport({ scale: 1.0 });
        const ratio = vp1.width / vp1.height;
        setPdfPageAspectRatio(ratio);
      }

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        // Ultra High Vector Print Scale (3.2x scale + print intent for razor-sharp subpixel text)
        const viewport = page.getViewport({ scale: 3.2 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = 'high';
          await (page as any).render({ 
            canvasContext: context, 
            viewport,
            intent: 'print', // Print-quality vector text rendering mode
          } as any).promise;
          
          // Ultra High-Definition WebP format (0.95 quality) for sharp text & optimized payload size
          const dataUrl = canvas.toDataURL('image/webp', 0.95);
          renderedImages.push(dataUrl.length > 50 ? dataUrl : canvas.toDataURL('image/jpeg', 0.95));
        }
      }

      setPdfPages(renderedImages);
      setCurrentPage(0);
      toast.success(`¡Revista "${file.name}" renderizada en 3D HD (${numPages} páginas)!`, { id: 'pdf-load' });
    } catch (err: any) {
      console.error('Error rendering PDF:', err);
      toast.error('Error al procesar el archivo PDF: ' + (err.message || ''), { id: 'pdf-load' });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleSaveMagazine = async () => {
    if (pdfPages.length === 0) {
      toast.error('Carga primero una revista PDF antes de guardar');
      return;
    }
    try {
      setIsSavingMagazine(true);
      toast.loading('Guardando y publicando revista para todos los dispositivos...', { id: 'save-mag' });
      await commercialApi.saveActiveMagazine({
        fileName: pdfFileName || 'Revista Personalizada CHLS.pdf',
        pages: pdfPages,
        pageAspectRatio: pdfPageAspectRatio,
      });
      setIsCustomMagazineSaved(true);
      toast.success('¡Revista guardada y publicada! Visible en cualquier dispositivo o enlace.', { id: 'save-mag' });
    } catch (err: any) {
      console.error('Error saving magazine:', err);
      toast.error('Error al guardar revista: ' + (err.message || ''), { id: 'save-mag' });
    } finally {
      setIsSavingMagazine(false);
    }
  };

  const handleResetToDefault = async () => {
    try {
      setIsSavingMagazine(true);
      toast.loading('Restableciendo edición oficial CHLS...', { id: 'reset-mag' });
      await commercialApi.resetActiveMagazine();
      setPdfPages([]);
      setPdfFileName(null);
      setPdfPageAspectRatio(null);
      setCurrentPage(0);
      setIsCustomMagazineSaved(false);
      toast.success('¡Edición Oficial CHLS restablecida y guardada para todos!', { id: 'reset-mag' });
    } catch (err: any) {
      console.error('Error resetting magazine:', err);
      toast.error('Error al restablecer revista', { id: 'reset-mag' });
    } finally {
      setIsSavingMagazine(false);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Render PDF page content
  const renderPdfContent = (pageIndex: number, side: 'left' | 'right' | 'single') => {
    if (pageIndex < 0 || pageIndex >= pdfPages.length) {
      return (
        <div className="w-full h-full bg-[#0a1410] flex items-center justify-center p-8 text-center text-stone-500 font-serif">
          <span>Fin de la publicación</span>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full bg-[#fdfcf7] flex items-center justify-center overflow-hidden">
        <img 
          src={pdfPages[pageIndex]} 
          alt={`Página ${pageIndex + 1}`} 
          className="w-full h-full object-contain select-none pointer-events-none"
          style={{
            imageRendering: '-webkit-optimize-contrast',
            WebkitFontSmoothing: 'antialiased',
          }}
        />
        {/* Subtle Paper Grain & Ambient Gutter Shadow */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at center, transparent 60%, rgba(0,0,0,0.08) 100%), linear-gradient(${side === 'left' ? 'to right' : 'to left'}, rgba(0,0,0,0.12) 0%, transparent 8%)`
          }}
        ></div>
        <div className={`absolute bottom-3 ${side === 'left' ? 'left-4' : 'right-4'} text-[10px] font-mono text-stone-600 px-2.5 py-0.5 rounded bg-white/90 shadow-sm border border-stone-200`}>
          {pageIndex + 1} / {pdfPages.length}
        </div>
      </div>
    );
  };

  // Render Editorial CHLS Page
  const renderDefaultContent = (pageIndex: number, side: 'left' | 'right' | 'single') => {
    const page = DEFAULT_CHLS_PAGES[pageIndex];
    if (!page) {
      return (
        <div className="w-full h-full bg-[#0a1410] flex items-center justify-center p-8 text-center text-stone-500 font-serif">
          <span>Fin de edición</span>
        </div>
      );
    }

    if (page.type === 'COVER') {
      return (
        <div className="relative w-full h-full bg-gradient-to-br from-[#05110d] via-[#092218] to-[#030705] text-white p-8 md:p-12 flex flex-col justify-center items-center text-center border-4 border-[#d4af37]/60 shadow-2xl overflow-hidden rounded-r-xl">
          {/* Gold Filigree Ornaments */}
          <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-brand-gold"></div>
          <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-brand-gold"></div>
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-brand-gold"></div>
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-brand-gold"></div>

          <div className="space-y-6 my-auto">
            <div className="inline-block p-4 rounded-2xl bg-black/60 border border-brand-gold/40 shadow-[0_0_35px_rgba(212,175,55,0.35)]">
              <CrestLogo size="lg" />
            </div>
            <div>
              <div className="inline-block px-4 py-1.5 rounded-full bg-brand-gold/15 border border-brand-gold/40 text-[11px] font-black uppercase tracking-widest text-brand-gold shadow-sm mb-4">
                {page.badge || 'EDICIÓN SELECTA EXCLUSIVA'}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold serif-brand text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-brand-gold to-yellow-500 tracking-tight drop-shadow-md">
                {page.title || 'CLUB HÍPICO LOS SARGENTOS'}
              </h1>
              <div className="w-32 h-0.5 mx-auto bg-gradient-to-r from-transparent via-brand-gold to-transparent mt-4"></div>
            </div>
          </div>
        </div>
      );
    }

    if (page.type === 'BACK_COVER') {
      return (
        <div className="relative w-full h-full bg-gradient-to-br from-[#05110d] via-[#092218] to-[#030705] text-white p-8 md:p-12 flex flex-col justify-between border-4 border-[#d4af37]/60 shadow-2xl overflow-hidden rounded-l-xl">
          <div className="text-center pt-2">
            <CrestLogo size="sm" className="mx-auto opacity-80" />
            <h2 className="text-lg font-bold serif-brand text-brand-gold mt-2">
              {page.title}
            </h2>
            <p className="text-[10px] text-gray-400 tracking-wider uppercase font-semibold">
              {page.subtitle}
            </p>
          </div>

          <div className="my-auto space-y-3 text-xs text-gray-300 leading-relaxed bg-black/50 p-6 rounded-2xl border border-white/10 backdrop-blur-sm shadow-xl">
            {(page.body || '').split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          <div className="text-center border-t border-brand-gold/25 pt-3">
            <p className="text-[9px] font-mono text-brand-gold tracking-widest uppercase">
              CLUB HÍPICO LOS SARGENTOS • 70 AÑOS DE PRESTIGIO Y TRADICIÓN
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full bg-[#fdfcf7] text-stone-900 p-6 sm:p-8 flex flex-col justify-between overflow-hidden shadow-inner">
        {/* Header with Chapter & Tag */}
        <div className="flex justify-between items-center border-b border-stone-200 pb-2 text-xs">
          <span className="font-bold tracking-widest text-amber-900 uppercase">{page.chapter}</span>
          <span className="px-2 py-0.5 rounded bg-amber-100/60 text-amber-900 font-bold text-[9px] uppercase tracking-wider">{page.tag}</span>
        </div>

        {/* Content Body */}
        <div className="my-auto space-y-3">
          <h3 className="text-xl sm:text-2xl font-bold serif-brand text-stone-900 leading-snug">
            {page.title}
          </h3>
          <div className="w-12 h-0.5 bg-brand-gold"></div>
          <div className="text-xs sm:text-sm text-stone-700 leading-relaxed space-y-2 font-sans">
            {(page.body || '').split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
          {page.quote && (
            <blockquote className="p-3 bg-amber-50/60 border-l-2 border-brand-gold italic text-xs text-stone-800 rounded-r shadow-xs mt-3">
              {page.quote}
              {page.author && <div className="text-[10px] text-stone-500 font-mono not-italic mt-1">— {page.author}</div>}
            </blockquote>
          )}
        </div>

        {/* Footer with page number */}
        <div className="flex justify-between items-center border-t border-stone-200 pt-2 text-[10px] font-mono text-stone-500">
          <span>Revista Oficial CHLS</span>
          <span className="font-bold text-amber-900">Pág. {page.pageNumber}</span>
        </div>
      </div>
    );
  };

  const renderPage = (index: number, side: 'left' | 'right' | 'single') => {
    if (pdfPages.length > 0) {
      if (index === 0) {
        return renderDefaultContent(0, side); // Official CHLS Front Cover
      }
      if (index === pdfPages.length + 1) {
        return renderDefaultContent(DEFAULT_CHLS_PAGES.length - 1, side); // Official CHLS Back Cover
      }
      return renderPdfContent(index - 1, side); // PDF Page
    }
    return renderDefaultContent(index, side);
  };

  // Calculate active page and spread aspect ratio
  const activeSingleRatio = pdfPageAspectRatio || 0.72; // Default CHLS portrait ratio
  // Dynamic 3D Book Page Stack Thickness Calculations
  const pageRatio = totalPages > 1 ? currentPage / (totalPages - 1) : 0;
  const leftPageCount = Math.max(2, Math.round(pageRatio * 16));
  const rightPageCount = Math.max(2, Math.round((1 - pageRatio) * 16));

  const leftThickness = Math.max(6, leftPageCount * 0.9); // Thickness in px for left page stack
  const rightThickness = Math.max(6, rightPageCount * 0.9); // Thickness in px for right page stack

  const activeSpreadRatio = isSinglePageMode ? activeSingleRatio : activeSingleRatio * 2;

  // --- HYPERREALISTIC 3D ORGANIC PAPER CURVATURE & ANGLE MATHEMATICS ---
  // Forward rotation: 0deg -> -180deg (sheet on right flips over to left)
  const forwardAngle = -flipProgress * 180;
  // Backward rotation: 0deg -> +180deg (sheet on left flips over to right)
  const backwardAngle = flipProgress * 180;

  // Parabolic lift off the spine: maximum Z displacement at 90deg (progress = 0.5)
  const zElevation = Math.sin(flipProgress * Math.PI) * 125; // 125px Z-lift

  // ORGANIC 3D PAPER BENDING MATHEMATICS (Doblez en arco suave de hoja de revista)
  const paperArchBend = Math.sin(flipProgress * Math.PI) * 13; // 13deg 3D paper arch bend
  const paperFlexSkew = Math.sin(flipProgress * Math.PI) * 9.5; // 9.5deg skew along leaf edge
  const paperFlexScale = 1 - Math.sin(flipProgress * Math.PI) * 0.05; // Soft lateral paper flex
  const shadowIntensity = Math.sin(flipProgress * Math.PI);

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full rounded-3xl overflow-hidden border border-brand-gold/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen' : 'min-h-[600px] sm:min-h-[660px] md:min-h-[720px]'}`}
      style={{
        backgroundImage: `radial-gradient(ellipse at center, rgba(0, 0, 0, 0.1) 20%, rgba(0, 20, 10, 0.38) 100%), url(${lawnBgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* 1. Ambient Golden Fireflies Canvas (Exactamente 3-4 con Resplandor) */}
      {firefliesEnabled && (
        <FirefliesCanvas count={4} />
      )}

      {/* Floating Exit Fullscreen Button (Only visible during Fullscreen for 100% Pure Book & Grass presentation) */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="absolute top-5 right-5 z-50 p-3 rounded-full bg-black/65 hover:bg-black/90 text-brand-gold hover:scale-110 border border-brand-gold/40 shadow-2xl backdrop-blur-md transition-all cursor-pointer"
          title="Salir de Pantalla Completa (Esc / F)"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      )}

      {/* 2. Top Luxury Control Toolbar (Hidden in Fullscreen mode for pure Book & Grass view) */}
      {!isFullscreen && (
        <div className="relative z-20 w-full px-6 py-4 flex flex-wrap justify-between items-center gap-3 border-b border-brand-gold/20 bg-black/75 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <img 
              src={logoUrl} 
              alt="Club Hípico Los Sargentos" 
              className="h-10 sm:h-12 w-auto object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] cursor-pointer hover:scale-105 transition-transform" 
              onClick={handleResetToDefault}
              title="Club Hípico Los Sargentos - Clic para restaurar edición oficial"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="application/pdf" 
              className="hidden" 
              onChange={handlePdfUpload} 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isPdfLoading || isSavingMagazine}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-white/20 transition-all border border-white/20 cursor-pointer"
              title="Seleccionar y cargar un archivo PDF de revista"
            >
              <Upload className="w-3.5 h-3.5 text-brand-gold" />
              {isPdfLoading ? 'Procesando...' : 'Subir Revista PDF'}
            </button>

            {pdfPages.length > 0 && (
              <button
                onClick={handleSaveMagazine}
                disabled={isSavingMagazine}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-gold via-yellow-500 to-amber-500 text-black font-extrabold text-xs flex items-center gap-1.5 hover:scale-105 shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all cursor-pointer"
                title="Guardar y publicar revista para todos los dispositivos"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingMagazine ? 'Guardando...' : 'Guardar & Publicar'}
              </button>
            )}

            {(pdfPages.length > 0 || isCustomMagazineSaved) && (
              <button
                onClick={handleResetToDefault}
                disabled={isSavingMagazine}
                className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Restablecer a la Edición Oficial CHLS para todos los dispositivos"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restablecer Oficial
              </button>
            )}

            {/* Fireflies Ambiance Toggle */}
            <button
              onClick={() => setFirefliesEnabled(!firefliesEnabled)}
              className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${firefliesEnabled ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}
              title="Efecto de Luciérnagas Doradas"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            {/* Zoom In & Zoom Out Controls */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setZoomLevel((prev) => Math.min(3.5, parseFloat((prev + 0.25).toFixed(2))))}
                className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                title="Aumentar Zoom (+)"
              >
                <ZoomIn className="w-4 h-4 text-brand-gold" />
              </button>
              <span className="text-[11px] font-mono text-amber-200 min-w-[38px] text-center font-bold">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => {
                  const nextZoom = Math.max(1.0, parseFloat((zoomLevel - 0.25).toFixed(2)));
                  setZoomLevel(nextZoom);
                  if (nextZoom <= 1.05) setPanPosition({ x: 0, y: 0 });
                }}
                className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                title="Reducir Zoom (-)"
              >
                <ZoomOut className="w-4 h-4 text-brand-gold" />
              </button>
              {zoomLevel > 1.05 && (
                <button
                  onClick={() => {
                    setZoomLevel(1.0);
                    setPanPosition({ x: 0, y: 0 });
                  }}
                  className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40 hover:bg-amber-500/30 transition-all cursor-pointer ml-1"
                  title="Restablecer Zoom y Posición a 100%"
                >
                  100%
                </button>
              )}
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white border border-white/10 transition-all"
              title="Pantalla Completa (F)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. The Hyperrealistic 3D Stage (No overflow clipping for 3D page elevation) */}
      <div 
        ref={bookStageRef}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative z-15 flex-1 flex items-center justify-center px-4 sm:px-8 md:px-12 pt-12 md:pt-16 pb-8 select-none ${zoomLevel > 1.05 ? 'cursor-move' : 'cursor-grab active:cursor-grabbing'}`}
        style={{ perspective: '2800px' }}
      >
        {/* Floating Zoom & Pan Touch Indicator Badge */}
        {zoomLevel > 1.05 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full bg-black/80 border border-brand-gold/60 text-amber-300 text-xs font-bold shadow-2xl flex items-center gap-2 backdrop-blur-md animate-pulse">
            <Hand className="w-4 h-4 text-brand-gold animate-bounce" />
            <span>Arrastra la pantalla con 1 dedo para mover el libro libremente</span>
            <button
              onClick={() => {
                setZoomLevel(1.0);
                setPanPosition({ x: 0, y: 0 });
              }}
              className="ml-2 underline text-[10px] hover:text-white"
            >
              (Salir Zoom)
            </button>
          </div>
        )}
        
        {/* Navigation Arrow Left */}
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 0 || isFlipping}
          className="absolute left-3 sm:left-6 z-40 p-3 sm:p-4 rounded-full bg-black/75 border border-brand-gold/40 text-brand-gold hover:bg-brand-gold hover:text-black hover:scale-110 shadow-[0_0_30px_rgba(0,0,0,0.85)] disabled:opacity-20 disabled:hover:scale-100 disabled:hover:bg-black/75 disabled:hover:text-brand-gold transition-all cursor-pointer"
          title="Página Anterior (Flecha Izq)"
        >
          <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>

        {/* Navigation Arrow Right */}
        <button
          onClick={handleNextPage}
          disabled={currentPage >= totalPages - (isSinglePageMode ? 1 : 2) || isFlipping}
          className="absolute right-3 sm:right-6 z-40 p-3 sm:p-4 rounded-full bg-black/75 border border-brand-gold/40 text-brand-gold hover:bg-brand-gold hover:text-black hover:scale-110 shadow-[0_0_30px_rgba(0,0,0,0.85)] disabled:opacity-20 disabled:hover:scale-100 disabled:hover:bg-black/75 disabled:hover:text-brand-gold transition-all cursor-pointer"
          title="Página Siguiente (Flecha Der / Espacio)"
        >
          <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>

        {/* 3D Book Chassis with Exact PDF Aspect Ratio & Reclined Tabletop Tilt */}
        <div 
          className="relative transition-all duration-300 ease-out flex items-center justify-center"
          style={{ 
            width: '100%',
            maxWidth: isSinglePageMode 
              ? `min(calc(62vh * ${activeSingleRatio}), 88vw)`
              : `min(calc(62vh * ${activeSpreadRatio}), 94vw)`,
            height: isSinglePageMode 
              ? `min(460px, calc(88vw / ${activeSingleRatio}))`
              : `min(480px, calc(94vw / ${activeSpreadRatio}))`,
            maxHeight: isFullscreen ? 'calc(100vh - 120px)' : '65vh',
            aspectRatio: `${activeSpreadRatio}`,
            transform: `rotateX(14deg) translate3d(${panPosition.x}px, ${panPosition.y}px, 0px) scale(${zoomLevel})`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Active Spread Frame - Pure Book (No Outer Frame) */}
          <div 
            className="relative z-10 w-full h-full flex rounded-2xl bg-[#09140f] shadow-[0_35px_90px_rgba(0,0,0,0.9)]"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* 3D HARDCOVER & PAPER PAGE STACK BLOCK (BOTTOM & SIDES) */}
            {!isSinglePageMode && (
              <>
                {/* LEFT BOTTOM PAPER BLOCK */}
                <div 
                  className="absolute bottom-0 left-0 w-1/2 pointer-events-none z-0 overflow-hidden"
                  style={{
                    height: `${leftThickness}px`,
                    transform: `translateY(${leftThickness}px) rotateX(-90deg)`,
                    transformOrigin: 'top center',
                    background: 'repeating-linear-gradient(to bottom, #ffffff 0px, #ffffff 1px, #ede9dd 1px, #ede9dd 2px, #fcfbfa 2px, #fcfbfa 3px, #d6cfbe 3px, #d6cfbe 4px, #f7f4ec 4px, #f7f4ec 5px, #c7bf9e 5px, #c7bf9e 6px)',
                    boxShadow: 'inset 0 2px 3px rgba(0,0,0,0.3), 0 6px 12px rgba(0,0,0,0.45)',
                    borderBottom: '2px solid #0f1912',
                  }}
                />

                {/* RIGHT BOTTOM PAPER BLOCK */}
                <div 
                  className="absolute bottom-0 right-0 w-1/2 pointer-events-none z-0 overflow-hidden"
                  style={{
                    height: `${rightThickness}px`,
                    transform: `translateY(${rightThickness}px) rotateX(-90deg)`,
                    transformOrigin: 'top center',
                    background: 'repeating-linear-gradient(to bottom, #ffffff 0px, #ffffff 1px, #ede9dd 1px, #ede9dd 2px, #fcfbfa 2px, #fcfbfa 3px, #d6cfbe 3px, #d6cfbe 4px, #f7f4ec 4px, #f7f4ec 5px, #c7bf9e 5px, #c7bf9e 6px)',
                    boxShadow: 'inset 0 2px 3px rgba(0,0,0,0.3), 0 6px 12px rgba(0,0,0,0.45)',
                    borderBottom: '2px solid #0f1912',
                  }}
                />

                {/* LEFT OUTER SIDE PAPER BLOCK */}
                <div 
                  className="absolute top-0 bottom-0 left-0 pointer-events-none z-0 overflow-hidden"
                  style={{
                    width: `${leftThickness}px`,
                    transform: `translateX(-${leftThickness}px) rotateY(-90deg)`,
                    transformOrigin: 'right center',
                    background: 'repeating-linear-gradient(to right, #ffffff 0px, #ffffff 1px, #ede9dd 1px, #ede9dd 2px, #fcfbfa 2px, #fcfbfa 3px, #d6cfbe 3px, #d6cfbe 4px, #f7f4ec 4px, #f7f4ec 5px, #c7bf9e 5px, #c7bf9e 6px)',
                    boxShadow: 'inset 2px 0 3px rgba(0,0,0,0.3), 0 6px 12px rgba(0,0,0,0.45)',
                    borderLeft: '2px solid #0f1912',
                  }}
                />

                {/* RIGHT OUTER SIDE PAPER BLOCK */}
                <div 
                  className="absolute top-0 bottom-0 right-0 pointer-events-none z-0 overflow-hidden"
                  style={{
                    width: `${rightThickness}px`,
                    transform: `translateX(${rightThickness}px) rotateY(90deg)`,
                    transformOrigin: 'left center',
                    background: 'repeating-linear-gradient(to right, #ffffff 0px, #ffffff 1px, #ede9dd 1px, #ede9dd 2px, #fcfbfa 2px, #fcfbfa 3px, #d6cfbe 3px, #d6cfbe 4px, #f7f4ec 4px, #f7f4ec 5px, #c7bf9e 5px, #c7bf9e 6px)',
                    boxShadow: 'inset -2px 0 3px rgba(0,0,0,0.3), 0 6px 12px rgba(0,0,0,0.45)',
                    borderRight: '2px solid #0f1912',
                  }}
                />

                {/* HARDCOVER BOOK BASE SHADOW ON GRASS */}
                <div className="absolute -bottom-4 inset-x-1 h-8 pointer-events-none z-[-1] rounded-full blur-md opacity-80 bg-black/90"></div>
              </>
            )}

            {isSinglePageMode ? (
              <div className="w-full h-full relative">
                {renderPage(currentPage, 'single')}
              </div>
            ) : (
              <>
                {/* 1. Underlying Left Page */}
                <div className="w-1/2 h-full relative border-r border-stone-300/40">
                  {isFlipping && flipDirection === 'BACKWARD'
                    ? renderPage(Math.max(0, currentPage - 2), 'left')
                    : isFlipping && flipDirection === 'FORWARD'
                    ? renderPage(currentPage + 2, 'left')
                    : renderPage(currentPage, 'left')}

                  {/* Spine Valley Shadow */}
                  <div className="absolute top-0 bottom-0 right-0 w-14 bg-gradient-to-l from-black/50 via-black/20 to-transparent pointer-events-none z-10"></div>

                  {/* Projected Drop Shadow during Backward Flip */}
                  {isFlipping && flipDirection === 'BACKWARD' && (
                    <div 
                      className="absolute inset-0 pointer-events-none z-20"
                      style={{
                        background: `linear-gradient(to right, rgba(0,0,0,${shadowIntensity * 0.5}) 0%, transparent 60%)`,
                      }}
                    ></div>
                  )}
                </div>

                {/* 2. Underlying Right Page */}
                <div className="w-1/2 h-full relative border-l border-stone-300/40">
                  {isFlipping && flipDirection === 'FORWARD'
                    ? renderPage(currentPage + 3, 'right')
                    : isFlipping && flipDirection === 'BACKWARD'
                    ? renderPage(Math.max(0, currentPage - 1), 'right')
                    : renderPage(currentPage + 1, 'right')}

                  {/* Spine Valley Shadow */}
                  <div className="absolute top-0 bottom-0 left-0 w-14 bg-gradient-to-r from-black/50 via-black/20 to-transparent pointer-events-none z-10"></div>

                  {/* Projected Drop Shadow during Forward Flip */}
                  {isFlipping && flipDirection === 'FORWARD' && (
                    <div 
                      className="absolute inset-0 pointer-events-none z-20"
                      style={{
                        background: `linear-gradient(to left, rgba(0,0,0,${shadowIntensity * 0.5}) 0%, transparent 60%)`,
                      }}
                    ></div>
                  )}

                  {/* Interactive Dog-Ear Corner Curl Hint */}
                  {!isFlipping && currentPage + 2 < totalPages && (
                    <div 
                      onClick={handleNextPage}
                      className="absolute bottom-0 right-0 w-16 h-16 cursor-pointer z-30 group"
                      title="Haz clic para pasar la hoja"
                    >
                      <div className="absolute bottom-0 right-0 w-11 h-11 bg-gradient-to-tl from-amber-500/50 via-amber-200/30 to-transparent rounded-tl-3xl border-t border-l border-brand-gold/70 shadow-xl group-hover:scale-125 transition-transform duration-300"></div>
                    </div>
                  )}
                </div>

                {/* 3. HYPERREALISTIC 3D FORWARD TURNING LEAF (Arched paper bending) */}
                {isFlipping && flipDirection === 'FORWARD' && (
                  <div 
                    className="absolute top-0 bottom-0 right-0 w-1/2 h-full z-30 pointer-events-none bg-white"
                    style={{
                      transformOrigin: '0% 50%',
                      transform: `translateZ(${zElevation}px) rotateY(${forwardAngle}deg) rotateZ(${-paperArchBend}deg) skewY(${-paperFlexSkew}deg) scaleX(${paperFlexScale})`,
                      transformStyle: 'preserve-3d',
                      WebkitTransformStyle: 'preserve-3d',
                      willChange: 'transform',
                      boxShadow: isTablet ? '0 12px 28px rgba(0,0,0,0.5)' : undefined,
                      filter: isTablet ? undefined : `drop-shadow(-25px 35px 45px rgba(0,0,0,${0.4 + shadowIntensity * 0.45}))`,
                      transition: isDragging ? 'none' : 'transform 0.04s linear',
                    }}
                  >
                    {/* Front Face of Turning Sheet (showing current right page, visible 0deg -> 90deg) */}
                    <div 
                      className="absolute inset-0 w-full h-full overflow-hidden border-r-2 border-amber-300/80 rounded-r-sm bg-white"
                      style={{ 
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        visibility: flipProgress < 0.5 ? 'visible' : 'hidden',
                        zIndex: flipProgress < 0.5 ? 10 : 1,
                      }}
                    >
                      {renderPage(currentPage + 1, 'right')}
                      
                      {/* Dynamic Specular Highlights & Paper Flex Cylinder Shadow */}
                      <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `linear-gradient(to right, rgba(0,0,0,${shadowIntensity * 0.5}) 0%, rgba(255,255,255,${shadowIntensity * 0.6}) 45%, rgba(0,0,0,${shadowIntensity * 0.45}) 100%)`,
                          boxShadow: `inset -20px 0 35px rgba(0,0,0,${shadowIntensity * 0.4})`
                        }}
                      ></div>
                    </div>

                    {/* Back Face of Turning Sheet (showing next left page, visible 90deg -> 180deg, rotated 180deg) */}
                    <div 
                      className="absolute inset-0 w-full h-full overflow-hidden border-l-2 border-amber-300/80 rounded-l-sm bg-white"
                      style={{ 
                        transform: 'rotateY(180deg)',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        visibility: flipProgress >= 0.5 ? 'visible' : 'hidden',
                        zIndex: flipProgress >= 0.5 ? 10 : 1,
                      }}
                    >
                      {renderPage(currentPage + 2, 'left')}

                      {/* Dynamic Specular Highlights for Back Face */}
                      <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `linear-gradient(to left, rgba(0,0,0,${shadowIntensity * 0.5}) 0%, rgba(255,255,255,${shadowIntensity * 0.6}) 45%, rgba(0,0,0,${shadowIntensity * 0.4}) 100%)`,
                          boxShadow: `inset 20px 0 35px rgba(0,0,0,${shadowIntensity * 0.4})`
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* 4. HYPERREALISTIC 3D BACKWARD TURNING LEAF (Arched paper bending) */}
                {isFlipping && flipDirection === 'BACKWARD' && (
                  <div 
                    className="absolute top-0 bottom-0 left-0 w-1/2 h-full z-30 pointer-events-none bg-white"
                    style={{
                      transformOrigin: '100% 50%',
                      transform: `translateZ(${zElevation}px) rotateY(${backwardAngle}deg) rotateZ(${paperArchBend}deg) skewY(${paperFlexSkew}deg) scaleX(${paperFlexScale})`,
                      transformStyle: 'preserve-3d',
                      WebkitTransformStyle: 'preserve-3d',
                      willChange: 'transform',
                      boxShadow: isTablet ? '0 12px 28px rgba(0,0,0,0.5)' : undefined,
                      filter: isTablet ? undefined : `drop-shadow(25px 35px 45px rgba(0,0,0,${0.4 + shadowIntensity * 0.45}))`,
                      transition: isDragging ? 'none' : 'transform 0.04s linear',
                    }}
                  >
                    {/* Front Face of Turning Sheet (showing current left page, visible 0deg -> 90deg) */}
                    <div 
                      className="absolute inset-0 w-full h-full overflow-hidden border-l-2 border-amber-300/80 rounded-l-sm bg-white"
                      style={{ 
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        visibility: flipProgress < 0.5 ? 'visible' : 'hidden',
                        zIndex: flipProgress < 0.5 ? 10 : 1,
                      }}
                    >
                      {renderPage(currentPage, 'left')}

                      <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `linear-gradient(to left, rgba(0,0,0,${shadowIntensity * 0.5}) 0%, rgba(255,255,255,${shadowIntensity * 0.6}) 45%, rgba(0,0,0,${shadowIntensity * 0.45}) 100%)`,
                          boxShadow: `inset 20px 0 35px rgba(0,0,0,${shadowIntensity * 0.4})`
                        }}
                      ></div>
                    </div>

                    {/* Back Face of Turning Sheet (showing previous right page, visible 90deg -> 180deg, rotated 180deg) */}
                    <div 
                      className="absolute inset-0 w-full h-full overflow-hidden border-r-2 border-amber-300/80 rounded-r-sm bg-white"
                      style={{ 
                        transform: 'rotateY(180deg)',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                        visibility: flipProgress >= 0.5 ? 'visible' : 'hidden',
                        zIndex: flipProgress >= 0.5 ? 10 : 1,
                      }}
                    >
                      {renderPage(Math.max(0, currentPage - 1), 'right')}

                      <div 
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `linear-gradient(to right, rgba(0,0,0,${shadowIntensity * 0.5}) 0%, rgba(255,255,255,${shadowIntensity * 0.6}) 45%, rgba(0,0,0,${shadowIntensity * 0.4}) 100%)`,
                          boxShadow: `inset -20px 0 35px rgba(0,0,0,${shadowIntensity * 0.4})`
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Center Book Spine Seam & Vertical Leather Trough */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-7 bg-gradient-to-r from-black/60 via-black/85 to-black/60 z-20 pointer-events-none shadow-2xl"></div>
              </>
            )}

          </div>
        </div>
      </div>

      {/* 4. Bottom Navigation & Control Scrub Bar */}
      <div className="relative z-20 px-6 py-4 bg-black/80 backdrop-blur-md border-t border-brand-gold/20 flex flex-col sm:flex-row justify-between items-center gap-4">
        
        {/* Page Counter Indicator */}
        <div className="flex items-center gap-3 text-xs text-gray-300">
          <span className="font-mono text-brand-gold font-bold">
            {isSinglePageMode 
              ? `Pág. ${currentPage + 1} de ${totalPages}`
              : `Pág. ${currentPage + 1} - ${Math.min(currentPage + 2, totalPages)} de ${totalPages}`}
          </span>

          <div className="h-4 w-px bg-white/20"></div>

          <span className="text-[11px] text-gray-400 hidden md:flex items-center gap-1">
            <Hand className="w-3.5 h-3.5 text-brand-gold" />
            <span>Arrastre la hoja con el ratón o use las flechas para hojear</span>
          </span>
        </div>

        {/* Page Range Slider */}
        <div className="flex items-center gap-3 w-full sm:w-72">
          <span className="text-[10px] text-gray-500 font-mono">1</span>
          <input
            type="range"
            min={0}
            max={totalPages - 1}
            step={isSinglePageMode ? 1 : 2}
            value={currentPage}
            onChange={(e) => {
              setCurrentPage(parseInt(e.target.value));
            }}
            className="w-full accent-brand-gold h-1.5 bg-gray-800 rounded-lg cursor-pointer"
          />
          <span className="text-[10px] text-gray-500 font-mono">{totalPages}</span>
        </div>

        {/* Zoom Level Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.8, z - 0.1))}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
            title="Alejar Zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-mono text-brand-gold w-10 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
            title="Acercar Zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
export default MagicBookViewer;
