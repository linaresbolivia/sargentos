import React, { useState, useRef, useEffect } from 'react';
import { 
  Keyboard, 
  X, 
  Delete, 
  CornerDownLeft, 
  ArrowBigUp, 
  Lock, 
  Hash, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp,
  SlidersHorizontal,
  Sparkles,
  Smartphone,
  Cpu,
  GripHorizontal,
  ArrowUpToLine,
  ArrowDownToLine,
  Move,
  Eye,
  EyeOff,
  Minimize2,
  Maximize2,
  Focus
} from 'lucide-react';
import { useVirtualKeyboard, KeyboardLayoutType, KeyboardTriggerMode, KeyboardDockPosition } from './VirtualKeyboardContext';

export const VirtualKeyboard: React.FC = () => {
  const {
    isOpen,
    mode,
    layout,
    position,
    customPos,
    isMinimized,
    isTransparent,
    hasPhysicalKeyboard,
    isTouchDevice,
    inputTitle,
    isShift,
    isCapsLock,
    closeKeyboard,
    openKeyboard,
    toggleKeyboard,
    setMode,
    setLayout,
    setPosition,
    setCustomPos,
    toggleMinimized,
    toggleTransparent,
    toggleShift,
    toggleCapsLock,
    insertChar,
    backspace,
    clear,
    pressEnter,
    pressSpace,
    scrollToActiveInput
  } = useVirtualKeyboard();

  const [showSettings, setShowSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);
  const keyboardRef = useRef<HTMLDivElement | null>(null);

  // Prevent blur of active input when clicking keyboard keys
  const preventBlur = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
  };

  const isUpperCase = (isShift && !isCapsLock) || (!isShift && isCapsLock);

  // Drag handlers for mouse and touch
  const handleDragStart = (clientX: number, clientY: number) => {
    if (!keyboardRef.current) return;
    const rect = keyboardRef.current.getBoundingClientRect();
    
    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      startX: rect.left,
      startY: rect.top
    };
    setIsDragging(true);
    setPosition('floating');
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current || !keyboardRef.current) return;
      const deltaX = e.clientX - dragStartRef.current.mouseX;
      const deltaY = e.clientY - dragStartRef.current.mouseY;

      const kbWidth = keyboardRef.current.offsetWidth || 700;
      const kbHeight = keyboardRef.current.offsetHeight || 300;

      let newX = dragStartRef.current.startX + deltaX;
      let newY = dragStartRef.current.startY + deltaY;

      // Constrain within viewport boundaries
      newX = Math.max(10, Math.min(window.innerWidth - kbWidth - 10, newX));
      newY = Math.max(10, Math.min(window.innerHeight - kbHeight - 10, newY));

      setCustomPos({ x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !dragStartRef.current || !keyboardRef.current || e.touches.length === 0) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.mouseX;
      const deltaY = touch.clientY - dragStartRef.current.mouseY;

      const kbWidth = keyboardRef.current.offsetWidth || 700;
      const kbHeight = keyboardRef.current.offsetHeight || 300;

      let newX = dragStartRef.current.startX + deltaX;
      let newY = dragStartRef.current.startY + deltaY;

      newX = Math.max(10, Math.min(window.innerWidth - kbWidth - 10, newX));
      newY = Math.max(10, Math.min(window.innerHeight - kbHeight - 10, newY));

      setCustomPos({ x: newX, y: newY });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, setCustomPos]);

  // QWERTY Key definitions
  const row1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
  const row2 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
  const row3 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'];
  const row4 = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '_'];

  // Symbols Key definitions
  const symRow1 = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+'];
  const symRow2 = ['~', '`', '|', '\\', '{', '}', '[', ']', ':', ';'];
  const symRow3 = ['"', "'", '<', '>', '?', '/', '=', '-', '€', '£'];
  const symRow4 = ['¡', '¿', '°', '¬', '•', '…', '«', '»', '§', '±'];

  // Accents Key definitions
  const accRow1 = ['á', 'é', 'í', 'ó', 'ú', 'Á', 'É', 'Í', 'Ó', 'Ú'];
  const accRow2 = ['ñ', 'Ñ', 'ü', 'Ü', 'à', 'è', 'ì', 'ò', 'ù'];
  const accRow3 = ['ä', 'ë', 'ï', 'ö', 'ü', 'â', 'ê', 'î', 'ô', 'û'];

  // Calculate keyboard positioning styles
  const getContainerStyle = (): React.CSSProperties => {
    if (position === 'floating' && customPos) {
      return {
        position: 'fixed',
        left: `${customPos.x}px`,
        top: `${customPos.y}px`,
        width: 'min(96vw, 900px)',
        zIndex: 9999
      };
    }
    if (position === 'top') {
      return {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999
      };
    }
    // Default bottom
    return {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999
    };
  };

  return (
    <>
      {/* Floating Quick Action Button (Always accessible in bottom-right corner) */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 select-none print:hidden">
        <button
          type="button"
          onMouseDown={preventBlur}
          onClick={toggleKeyboard}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border shadow-xl backdrop-blur-xl transition-all duration-300 ${
            isOpen
              ? 'bg-brand-gold text-black border-brand-gold font-extrabold shadow-[0_0_20px_rgba(212,175,55,0.4)] scale-105'
              : mode === 'always'
              ? 'bg-[#0a140f]/90 text-brand-gold border-brand-gold/50 hover:border-brand-gold hover:scale-105'
              : 'bg-[#0a140f]/80 text-gray-300 hover:text-brand-gold border-white/10 hover:border-brand-gold/40 hover:scale-105'
          }`}
          title="Teclado Virtual Pantalla Táctil"
        >
          <Keyboard className="w-4 h-4" />
          <span className="text-xs font-bold hidden md:inline">
            {isOpen ? 'Ocultar Teclado' : 'Teclado Virtual'}
          </span>
          {mode === 'auto' && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse hidden sm:inline" title="Modo Automático Activo" />
          )}
        </button>
      </div>

      {/* Virtual Keyboard Main Drawer */}
      {isOpen && (
        <div 
          ref={keyboardRef}
          style={getContainerStyle()}
          className={`text-white border-2 border-brand-gold/40 backdrop-blur-2xl shadow-[0_-15px_50px_rgba(0,0,0,0.85)] animate-slide-up select-none print:hidden transition-opacity duration-200 ${
            position === 'floating' ? 'rounded-3xl' : position === 'top' ? 'border-b-2 rounded-b-3xl' : 'border-t-2 rounded-t-3xl'
          } ${
            isTransparent ? 'bg-[#060c09]/75 dark:bg-[#060c09]/75' : 'bg-[#060c09]/95 dark:bg-[#060c09]/95'
          }`}
          onMouseDown={preventBlur}
        >
          <div className="max-w-5xl mx-auto p-2 sm:p-3 flex flex-col gap-2">
            
            {/* Top Toolbar with Drag Handle */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 px-1">
              
              {/* Left Side: Drag Handle & Input Title */}
              <div className="flex items-center gap-2 truncate max-w-[280px] sm:max-w-md">
                
                {/* Drag Handle */}
                <div
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-brand-gold hover:text-black text-gray-300 cursor-grab active:cursor-grabbing transition-colors border border-white/10 shrink-0"
                  title="Mantén presionado para arrastrar y desplazar el teclado por la pantalla"
                >
                  <GripHorizontal className="w-4 h-4 text-brand-gold" />
                  <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Mover</span>
                </div>

                <button
                  type="button"
                  onMouseDown={preventBlur}
                  onClick={scrollToActiveInput}
                  className="p-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 transition-all shrink-0"
                  title="Desplazar pantalla para centrar y ver el campo de texto"
                >
                  <Focus className="w-3.5 h-3.5" />
                </button>

                {/* Active input indicator */}
                <span className="text-[11px] sm:text-xs text-gray-300 truncate">
                  Escribiendo en:{' '}
                  <span className="text-brand-gold font-bold">
                    {inputTitle || 'Campo de texto'}
                  </span>
                </span>
              </div>

              {/* Right Side: Position & Layout Controls */}
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                
                {/* Dock Position Presets */}
                <div className="flex items-center bg-black/50 rounded-xl p-0.5 border border-white/10 text-[11px]">
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={() => { setPosition('top'); setCustomPos(null); }}
                    className={`p-1 rounded-lg transition-all ${
                      position === 'top' ? 'bg-brand-gold text-black shadow-sm' : 'text-gray-400 hover:text-white'
                    }`}
                    title="Fijar arriba de la pantalla"
                  >
                    <ArrowUpToLine className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={() => { setPosition('bottom'); setCustomPos(null); }}
                    className={`p-1 rounded-lg transition-all ${
                      position === 'bottom' ? 'bg-brand-gold text-black shadow-sm' : 'text-gray-400 hover:text-white'
                    }`}
                    title="Fijar abajo de la pantalla"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={() => {
                      setPosition('floating');
                      if (!customPos) {
                        setCustomPos({
                          x: Math.max(10, (window.innerWidth - 800) / 2),
                          y: Math.max(10, window.innerHeight - 380)
                        });
                      }
                    }}
                    className={`p-1 rounded-lg transition-all ${
                      position === 'floating' ? 'bg-brand-gold text-black shadow-sm' : 'text-gray-400 hover:text-white'
                    }`}
                    title="Modo flotante libre (Arrastrable)"
                  >
                    <Move className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Transparency Toggle */}
                <button
                  type="button"
                  onMouseDown={preventBlur}
                  onClick={toggleTransparent}
                  className={`p-1.5 rounded-xl border transition-all text-xs ${
                    isTransparent
                      ? 'bg-brand-gold text-black border-brand-gold'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                  }`}
                  title={isTransparent ? 'Modo opaco' : 'Modo semi-transparente para ver detrás'}
                >
                  {isTransparent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>

                {/* Minimize / Maximize */}
                <button
                  type="button"
                  onMouseDown={preventBlur}
                  onClick={toggleMinimized}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-all text-xs"
                  title={isMinimized ? 'Expandir teclado completo' : 'Minimizar teclado a barra compacta'}
                >
                  {isMinimized ? <Maximize2 className="w-3.5 h-3.5 text-brand-gold" /> : <Minimize2 className="w-3.5 h-3.5" />}
                </button>

                {/* Layout Tabs */}
                {!isMinimized && (
                  <div className="flex items-center bg-black/40 rounded-xl p-0.5 border border-white/10 text-[11px] font-bold">
                    <button
                      type="button"
                      onMouseDown={preventBlur}
                      onClick={() => setLayout('alphanumeric')}
                      className={`px-2 py-1 rounded-lg transition-all ${
                        layout === 'alphanumeric'
                          ? 'bg-brand-gold text-black shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      ABC
                    </button>
                    <button
                      type="button"
                      onMouseDown={preventBlur}
                      onClick={() => setLayout('numeric')}
                      className={`px-2 py-1 rounded-lg transition-all ${
                        layout === 'numeric'
                          ? 'bg-brand-gold text-black shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      123
                    </button>
                    <button
                      type="button"
                      onMouseDown={preventBlur}
                      onClick={() => setLayout('symbols')}
                      className={`px-2 py-1 rounded-lg transition-all ${
                        layout === 'symbols'
                          ? 'bg-brand-gold text-black shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      #+=
                    </button>
                    <button
                      type="button"
                      onMouseDown={preventBlur}
                      onClick={() => setLayout('accents')}
                      className={`px-2 py-1 rounded-lg transition-all ${
                        layout === 'accents'
                          ? 'bg-brand-gold text-black shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      áéí
                    </button>
                  </div>
                )}

                {/* Clear Input Button */}
                <button
                  type="button"
                  onMouseDown={preventBlur}
                  onClick={clear}
                  className="px-2 py-1 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-[11px] font-bold transition-all"
                  title="Vaciar campo"
                >
                  <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                  Vaciar
                </button>

                {/* Settings Toggle */}
                <button
                  type="button"
                  onMouseDown={preventBlur}
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-1.5 rounded-xl border transition-all text-xs ${
                    showSettings 
                      ? 'bg-brand-gold text-black border-brand-gold' 
                      : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                  }`}
                  title="Configurar detección de teclado"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>

                {/* Close Keyboard */}
                <button
                  type="button"
                  onMouseDown={preventBlur}
                  onClick={closeKeyboard}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all"
                  title="Cerrar teclado"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Settings Panel (Collapsible) */}
            {showSettings && (
              <div className="p-3 bg-black/60 border border-brand-gold/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-brand-gold" />
                  <span className="text-gray-300 font-semibold">Comportamiento:</span>
                  <span className="text-gray-400 text-[11px]">
                    (Táctil: <b className="text-white">{isTouchDevice ? 'Sí' : 'No'}</b> | Físico: <b className="text-white">{hasPhysicalKeyboard ? 'Detectado' : 'No detectado'}</b>)
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={() => setMode('auto')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                      mode === 'auto' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={() => setMode('always')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                      mode === 'always' ? 'bg-brand-gold text-black shadow-sm' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Siempre Activo
                  </button>
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={() => setMode('disabled')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                      mode === 'disabled' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Desactivar
                  </button>
                </div>
              </div>
            )}

            {/* MINIMIZED QUICK BAR MODE */}
            {isMinimized && (
              <div className="flex items-center gap-2 justify-between py-1">
                <div className="flex items-center gap-1 flex-1 overflow-x-auto custom-scrollbar py-1">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Bs.', '+591', '@', '.com'].map(k => (
                    <button
                      key={k}
                      type="button"
                      onMouseDown={preventBlur}
                      onClick={() => insertChar(k)}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xs font-bold shrink-0 transition-all active:scale-95"
                    >
                      {k}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={pressSpace}
                    className="px-4 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold"
                  >
                    Espacio
                  </button>
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={backspace}
                    className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    title="Borrar"
                  >
                    <Delete className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={pressEnter}
                    className="px-3 py-1.5 rounded-xl bg-brand-gold text-black text-xs font-black flex items-center gap-1"
                  >
                    <CornerDownLeft className="w-3.5 h-3.5" />
                    OK
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* LAYOUT 1: NUMERIC / NUMPAD (Special for Cashier, DNI, Lockers, Courts)     */}
            {/* ========================================================================= */}
            {!isMinimized && layout === 'numeric' && (
              <div className="flex flex-col gap-2 max-w-lg mx-auto w-full py-1">
                {/* Quick shortcuts row */}
                <div className="grid grid-cols-5 gap-1.5">
                  {['+591', 'Bs. ', 'CI-', '.00', '-'].map(shortcut => (
                    <button
                      key={shortcut}
                      type="button"
                      onMouseDown={preventBlur}
                      onClick={() => insertChar(shortcut)}
                      className="py-2 rounded-xl bg-white/5 hover:bg-brand-gold/20 text-brand-gold border border-brand-gold/30 text-xs font-black transition-all active:scale-95 shadow-sm"
                    >
                      {shortcut}
                    </button>
                  ))}
                </div>

                {/* 4x4 Grid */}
                <div className="grid grid-cols-4 gap-2">
                  {['7', '8', '9'].map(n => (
                    <button
                      key={n}
                      type="button"
                      onMouseDown={preventBlur}
                      onClick={() => insertChar(n)}
                      className="h-12 sm:h-14 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-2xl font-bold transition-all active:scale-95 shadow-md flex items-center justify-center"
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={backspace}
                    className="h-12 sm:h-14 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-lg font-bold transition-all active:scale-95 shadow-md flex items-center justify-center gap-1"
                    title="Borrar"
                  >
                    <Delete className="w-6 h-6" />
                  </button>

                  {['4', '5', '6'].map(n => (
                    <button
                      key={n}
                      type="button"
                      onMouseDown={preventBlur}
                      onClick={() => insertChar(n)}
                      className="h-12 sm:h-14 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-2xl font-bold transition-all active:scale-95 shadow-md flex items-center justify-center"
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={clear}
                    className="h-12 sm:h-14 rounded-2xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-sm font-black transition-all active:scale-95 shadow-md flex items-center justify-center"
                  >
                    C
                  </button>

                  {['1', '2', '3'].map(n => (
                    <button
                      key={n}
                      type="button"
                      onMouseDown={preventBlur}
                      onClick={() => insertChar(n)}
                      className="h-12 sm:h-14 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-2xl font-bold transition-all active:scale-95 shadow-md flex items-center justify-center"
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={() => setLayout('alphanumeric')}
                    className="h-12 sm:h-14 rounded-2xl bg-brand-gold/15 hover:bg-brand-gold/25 text-brand-gold border border-brand-gold/30 text-sm font-black transition-all active:scale-95 shadow-md flex items-center justify-center"
                  >
                    ABC
                  </button>

                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={() => insertChar('0')}
                    className="h-12 sm:h-14 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-2xl font-bold transition-all active:scale-95 shadow-md flex items-center justify-center"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={() => insertChar('00')}
                    className="h-12 sm:h-14 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xl font-bold transition-all active:scale-95 shadow-md flex items-center justify-center"
                  >
                    00
                  </button>
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={() => insertChar('.')}
                    className="h-12 sm:h-14 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-2xl font-bold transition-all active:scale-95 shadow-md flex items-center justify-center"
                  >
                    .
                  </button>
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={pressEnter}
                    className="h-12 sm:h-14 rounded-2xl bg-gradient-to-r from-brand-gold to-yellow-600 hover:from-yellow-500 hover:to-brand-gold text-black border border-brand-gold text-base font-black transition-all active:scale-95 shadow-lg flex items-center justify-center gap-1.5"
                  >
                    <CornerDownLeft className="w-5 h-5" />
                    <span>OK</span>
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* LAYOUT 2: ALPHANUMERIC QWERTY (Spanish with Ñ and full rows)             */}
            {/* ========================================================================= */}
            {!isMinimized && layout === 'alphanumeric' && (
              <div className="flex flex-col gap-1.5 w-full">
                {/* Row 1: Numbers */}
                <div className="flex gap-1 justify-center">
                  {row1.map(key => (
                    <button
                      key={key}
                      type="button"
                      onMouseDown={preventBlur}
                      onClick={() => insertChar(key)}
                      className="flex-1 max-w-[68px] h-10 sm:h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-base font-bold transition-all active:scale-95 flex items-center justify-center shadow-sm"
                    >
                      {key}
                    </button>
                  ))}
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={backspace}
                    className="w-14 sm:w-16 h-10 sm:h-11 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-sm font-bold transition-all active:scale-95 flex items-center justify-center shadow-sm"
                    title="Borrar"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                </div>

                {/* Row 2: Q W E R T Y U I O P */}
                <div className="flex gap-1 justify-center">
                  {row2.map(key => {
                    const displayChar = isUpperCase ? key.toUpperCase() : key.toLowerCase();
                    return (
                      <button
                        key={key}
                        type="button"
                        onMouseDown={preventBlur}
                        onClick={() => insertChar(displayChar)}
                        className="flex-1 max-w-[76px] h-10 sm:h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-lg font-bold transition-all active:scale-95 flex items-center justify-center shadow-sm"
                      >
                        {displayChar}
                      </button>
                    );
                  })}
                </div>

                {/* Row 3: A S D F G H J K L Ñ */}
                <div className="flex gap-1 justify-center">
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={toggleCapsLock}
                    className={`w-12 sm:w-14 h-10 sm:h-12 rounded-xl border text-xs font-extrabold transition-all active:scale-95 flex items-center justify-center shadow-sm ${
                      isCapsLock 
                        ? 'bg-brand-gold text-black border-brand-gold shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                        : 'bg-white/10 text-gray-300 border-white/10 hover:bg-white/20'
                    }`}
                    title="Bloq Mayús"
                  >
                    <Lock className="w-4 h-4" />
                  </button>
                  {row3.map(key => {
                    const displayChar = isUpperCase ? key.toUpperCase() : key.toLowerCase();
                    return (
                      <button
                        key={key}
                        type="button"
                        onMouseDown={preventBlur}
                        onClick={() => insertChar(displayChar)}
                        className="flex-1 max-w-[76px] h-10 sm:h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-lg font-bold transition-all active:scale-95 flex items-center justify-center shadow-sm"
                      >
                        {displayChar}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={pressEnter}
                    className="w-16 sm:w-20 h-10 sm:h-12 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-600 hover:from-yellow-500 hover:to-brand-gold text-black border border-brand-gold font-black transition-all active:scale-95 flex items-center justify-center shadow-md text-xs sm:text-sm"
                  >
                    <CornerDownLeft className="w-5 h-5" />
                  </button>
                </div>

                {/* Row 4: Shift, Z X C V B N M, Shift */}
                <div className="flex gap-1 justify-center">
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={toggleShift}
                    className={`w-14 sm:w-16 h-10 sm:h-12 rounded-xl border text-xs font-extrabold transition-all active:scale-95 flex items-center justify-center shadow-sm ${
                      isShift 
                        ? 'bg-brand-gold text-black border-brand-gold' 
                        : 'bg-white/10 text-gray-300 border-white/10 hover:bg-white/20'
                    }`}
                    title="Mayúsculas una sola vez"
                  >
                    <ArrowBigUp className="w-5 h-5" />
                  </button>
                  {row4.map(key => {
                    const displayChar = isUpperCase ? key.toUpperCase() : key.toLowerCase();
                    return (
                      <button
                        key={key}
                        type="button"
                        onMouseDown={preventBlur}
                        onClick={() => insertChar(displayChar)}
                        className="flex-1 max-w-[76px] h-10 sm:h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-lg font-bold transition-all active:scale-95 flex items-center justify-center shadow-sm"
                      >
                        {displayChar}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={toggleShift}
                    className={`w-14 sm:w-16 h-10 sm:h-12 rounded-xl border text-xs font-extrabold transition-all active:scale-95 flex items-center justify-center shadow-sm ${
                      isShift 
                        ? 'bg-brand-gold text-black border-brand-gold' 
                        : 'bg-white/10 text-gray-300 border-white/10 hover:bg-white/20'
                    }`}
                  >
                    <ArrowBigUp className="w-5 h-5" />
                  </button>
                </div>

                {/* Row 5: Space, Quick Keys, Symbols Switch */}
                <div className="flex gap-1.5 justify-center mt-0.5">
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={() => setLayout('symbols')}
                    className="w-16 sm:w-20 h-10 sm:h-11 rounded-xl bg-white/15 hover:bg-white/25 text-brand-gold border border-white/15 text-xs font-black transition-all active:scale-95 flex items-center justify-center shadow-sm"
                  >
                    ?123
                  </button>
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={() => setLayout('accents')}
                    className="w-14 sm:w-16 h-10 sm:h-11 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 border border-white/10 text-xs font-bold transition-all active:scale-95 flex items-center justify-center shadow-sm"
                  >
                    áéí
                  </button>
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={() => insertChar('@')}
                    className="w-12 sm:w-14 h-10 sm:h-11 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 border border-white/10 text-base font-bold transition-all active:scale-95 flex items-center justify-center shadow-sm"
                  >
                    @
                  </button>
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={pressSpace}
                    className="flex-1 max-w-xl h-10 sm:h-11 rounded-xl bg-white/20 hover:bg-white/30 text-gray-200 border border-white/20 text-xs font-extrabold uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center shadow-md"
                  >
                    Espacio
                  </button>
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={() => insertChar('.com')}
                    className="w-14 sm:w-16 h-10 sm:h-11 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 border border-white/10 text-xs font-bold transition-all active:scale-95 flex items-center justify-center shadow-sm"
                  >
                    .com
                  </button>
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={() => setLayout('numeric')}
                    className="w-16 sm:w-20 h-10 sm:h-11 rounded-xl bg-brand-gold/20 hover:bg-brand-gold/30 text-brand-gold border border-brand-gold/40 text-xs font-black transition-all active:scale-95 flex items-center justify-center shadow-sm"
                  >
                    123 Num
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* LAYOUT 3: SYMBOLS                                                        */}
            {/* ========================================================================= */}
            {!isMinimized && layout === 'symbols' && (
              <div className="flex flex-col gap-1.5 w-full">
                <div className="flex gap-1 justify-center">
                  {symRow1.map(key => (
                    <button
                      key={key}
                      type="button"
                      onMouseDown={preventBlur}
                      onClick={() => insertChar(key)}
                      className="flex-1 max-w-[76px] h-10 sm:h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-lg font-bold transition-all active:scale-95 flex items-center justify-center shadow-sm"
                    >
                      {key}
                    </button>
                  ))}
                </div>

                <div className="flex gap-1 justify-center">
                  {symRow2.map(key => (
                    <button
                      key={key}
                      type="button"
                      onMouseDown={preventBlur}
                      onClick={() => insertChar(key)}
                      className="flex-1 max-w-[76px] h-10 sm:h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-lg font-bold transition-all active:scale-95 flex items-center justify-center shadow-sm"
                    >
                      {key}
                    </button>
                  ))}
                </div>

                <div className="flex gap-1 justify-center">
                  {symRow3.map(key => (
                    <button
                      key={key}
                      type="button"
                      onMouseDown={preventBlur}
                      onClick={() => insertChar(key)}
                      className="flex-1 max-w-[76px] h-10 sm:h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-lg font-bold transition-all active:scale-95 flex items-center justify-center shadow-sm"
                    >
                      {key}
                    </button>
                  ))}
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={backspace}
                    className="w-14 sm:w-16 h-10 sm:h-12 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-sm font-bold transition-all active:scale-95 flex items-center justify-center shadow-sm"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex gap-1.5 justify-center mt-0.5">
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={() => setLayout('alphanumeric')}
                    className="w-20 sm:w-24 h-10 sm:h-11 rounded-xl bg-brand-gold text-black font-black text-xs transition-all active:scale-95 flex items-center justify-center shadow-md"
                  >
                    ABC
                  </button>
                  {symRow4.map(key => (
                    <button
                      key={key}
                      type="button"
                      onMouseDown={preventBlur}
                      onClick={() => insertChar(key)}
                      className="flex-1 max-w-[50px] h-10 sm:h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-base font-bold transition-all active:scale-95 flex items-center justify-center shadow-sm"
                    >
                      {key}
                    </button>
                  ))}
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={pressSpace}
                    className="flex-1 max-w-md h-10 sm:h-11 rounded-xl bg-white/20 hover:bg-white/30 text-gray-200 border border-white/20 text-xs font-extrabold uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center shadow-md"
                  >
                    Espacio
                  </button>
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={pressEnter}
                    className="w-16 sm:w-20 h-10 sm:h-11 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-600 text-black border border-brand-gold font-black transition-all active:scale-95 flex items-center justify-center shadow-md"
                  >
                    <CornerDownLeft className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* LAYOUT 4: ACCENTS                                                        */}
            {/* ========================================================================= */}
            {!isMinimized && layout === 'accents' && (
              <div className="flex flex-col gap-2 max-w-2xl mx-auto w-full py-1">
                <div className="flex gap-1.5 justify-center">
                  {accRow1.map(key => (
                    <button
                      key={key}
                      type="button"
                      onMouseDown={preventBlur}
                      onClick={() => insertChar(key)}
                      className="flex-1 h-11 sm:h-13 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xl font-bold transition-all active:scale-95 flex items-center justify-center shadow-sm"
                    >
                      {key}
                    </button>
                  ))}
                </div>

                <div className="flex gap-1.5 justify-center">
                  {accRow2.map(key => (
                    <button
                      key={key}
                      type="button"
                      onMouseDown={preventBlur}
                      onClick={() => insertChar(key)}
                      className="flex-1 h-11 sm:h-13 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xl font-bold transition-all active:scale-95 flex items-center justify-center shadow-sm"
                    >
                      {key}
                    </button>
                  ))}
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={backspace}
                    className="w-14 sm:w-16 h-11 sm:h-13 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-sm font-bold transition-all active:scale-95 flex items-center justify-center shadow-sm"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex gap-1.5 justify-center">
                  {accRow3.map(key => (
                    <button
                      key={key}
                      type="button"
                      onMouseDown={preventBlur}
                      onClick={() => insertChar(key)}
                      className="flex-1 h-11 sm:h-13 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xl font-bold transition-all active:scale-95 flex items-center justify-center shadow-sm"
                    >
                      {key}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 justify-center mt-1">
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={() => setLayout('alphanumeric')}
                    className="px-6 py-2 rounded-xl bg-brand-gold text-black font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md"
                  >
                    Volver a Letras ABC
                  </button>
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={pressSpace}
                    className="flex-1 h-10 rounded-xl bg-white/20 hover:bg-white/30 text-gray-200 border border-white/20 text-xs font-extrabold uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center shadow-md"
                  >
                    Espacio
                  </button>
                  <button
                    type="button"
                    onMouseDown={preventBlur}
                    onClick={pressEnter}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-600 text-black border border-brand-gold font-black transition-all active:scale-95 flex items-center justify-center shadow-md"
                  >
                    <CornerDownLeft className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
};
