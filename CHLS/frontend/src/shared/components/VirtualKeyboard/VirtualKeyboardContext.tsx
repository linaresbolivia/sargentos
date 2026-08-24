import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { 
  insertTextAtCursor, 
  backspaceAtCursor, 
  clearInputValue, 
  isNumericInput 
} from './keyboardUtils';

export type KeyboardLayoutType = 'alphanumeric' | 'numeric' | 'symbols' | 'accents';
export type KeyboardTriggerMode = 'auto' | 'always' | 'disabled';
export type KeyboardDockPosition = 'bottom' | 'top' | 'floating';

interface VirtualKeyboardContextType {
  isOpen: boolean;
  mode: KeyboardTriggerMode;
  layout: KeyboardLayoutType;
  position: KeyboardDockPosition;
  customPos: { x: number; y: number } | null;
  isMinimized: boolean;
  isTransparent: boolean;
  hasPhysicalKeyboard: boolean;
  isTouchDevice: boolean;
  activeElement: HTMLInputElement | HTMLTextAreaElement | null;
  inputTitle: string;
  isShift: boolean;
  isCapsLock: boolean;
  openKeyboard: (target?: HTMLInputElement | HTMLTextAreaElement, forceLayout?: KeyboardLayoutType) => void;
  closeKeyboard: () => void;
  toggleKeyboard: () => void;
  setMode: (mode: KeyboardTriggerMode) => void;
  setLayout: (layout: KeyboardLayoutType) => void;
  setPosition: (position: KeyboardDockPosition) => void;
  setCustomPos: (pos: { x: number; y: number } | null) => void;
  toggleMinimized: () => void;
  toggleTransparent: () => void;
  toggleShift: () => void;
  toggleCapsLock: () => void;
  insertChar: (char: string) => void;
  backspace: () => void;
  clear: () => void;
  pressEnter: () => void;
  pressSpace: () => void;
  scrollToActiveInput: () => void;
}

const VirtualKeyboardContext = createContext<VirtualKeyboardContextType | undefined>(undefined);

const STORAGE_KEY_MODE = 'chls_virtual_keyboard_mode';
const STORAGE_KEY_POS = 'chls_virtual_keyboard_pos';

export const VirtualKeyboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setModeState] = useState<KeyboardTriggerMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MODE);
      if (saved === 'always' || saved === 'disabled' || saved === 'auto') return saved;
    } catch (e) {}
    return 'auto';
  });

  const [layout, setLayout] = useState<KeyboardLayoutType>('alphanumeric');
  const [position, setPositionState] = useState<KeyboardDockPosition>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POS);
      if (saved === 'bottom' || saved === 'top' || saved === 'floating') return saved as KeyboardDockPosition;
    } catch (e) {}
    return 'bottom';
  });

  const [customPos, setCustomPos] = useState<{ x: number; y: number } | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isTransparent, setIsTransparent] = useState(false);

  const [hasPhysicalKeyboard, setHasPhysicalKeyboard] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [activeElement, setActiveElement] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [inputTitle, setInputTitle] = useState('');
  const [isShift, setIsShift] = useState(false);
  const [isCapsLock, setIsCapsLock] = useState(false);

  const activeElementRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  activeElementRef.current = activeElement;

  const modeRef = useRef(mode);
  modeRef.current = mode;

  const hasPhysicalKeyboardRef = useRef(hasPhysicalKeyboard);
  hasPhysicalKeyboardRef.current = hasPhysicalKeyboard;

  // Detect Touchscreen device capability
  useEffect(() => {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || ('msMaxTouchPoints' in navigator && (navigator as any).msMaxTouchPoints > 0);
    setIsTouchDevice(isTouch);
  }, []);

  // Listen for real physical keyboard strokes
  useEffect(() => {
    const handlePhysicalKeyDown = (e: KeyboardEvent) => {
      // Ignore simulated or synthetic events dispatched by virtual keyboard
      if (!e.isTrusted) return;
      
      // If user typed with a real physical keyboard, flag it
      if (!hasPhysicalKeyboardRef.current) {
        setHasPhysicalKeyboard(true);
        hasPhysicalKeyboardRef.current = true;
      }
    };

    window.addEventListener('keydown', handlePhysicalKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handlePhysicalKeyDown, { capture: true });
  }, []);

  // Persist trigger mode
  const setMode = useCallback((newMode: KeyboardTriggerMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY_MODE, newMode);
    } catch (e) {}
  }, []);

  // Persist position
  const setPosition = useCallback((newPos: KeyboardDockPosition) => {
    setPositionState(newPos);
    try {
      localStorage.setItem(STORAGE_KEY_POS, newPos);
    } catch (e) {}
  }, []);

  const toggleMinimized = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  const toggleTransparent = useCallback(() => {
    setIsTransparent(prev => !prev);
  }, []);

  // Extract a human readable title/label for the active input
  const getElementTitle = (el: HTMLInputElement | HTMLTextAreaElement): string => {
    if (el.placeholder) return el.placeholder;
    if (el.name) return el.name;
    if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`);
      if (label && label.textContent) return label.textContent.trim();
      return el.id;
    }
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label')!;
    return el.type === 'number' ? 'Número / Monto' : 'Texto';
  };

  // Scroll active input into view smoothly
  const scrollToActiveInput = useCallback(() => {
    if (!activeElementRef.current) return;
    try {
      activeElementRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    } catch (e) {}
  }, []);

  // Auto-scroll & adjust page padding when keyboard opens or layout/position changes
  useEffect(() => {
    if (isOpen) {
      if (position === 'bottom') {
        document.body.style.paddingBottom = isMinimized ? '90px' : '380px';
      } else if (position === 'top') {
        document.body.style.paddingTop = isMinimized ? '90px' : '380px';
      }

      const timer = setTimeout(() => {
        scrollToActiveInput();
      }, 120);

      return () => {
        document.body.style.paddingBottom = '';
        document.body.style.paddingTop = '';
        clearTimeout(timer);
      };
    } else {
      document.body.style.paddingBottom = '';
      document.body.style.paddingTop = '';
    }
  }, [isOpen, position, isMinimized, activeElement, scrollToActiveInput]);

  // Open keyboard
  const openKeyboard = useCallback((target?: HTMLInputElement | HTMLTextAreaElement, forceLayout?: KeyboardLayoutType) => {
    const el = target || activeElementRef.current || (document.activeElement as HTMLInputElement | HTMLTextAreaElement);
    
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      setActiveElement(el);
      setInputTitle(getElementTitle(el));
      
      if (forceLayout) {
        setLayout(forceLayout);
      } else if (isNumericInput(el)) {
        setLayout('numeric');
      } else {
        setLayout('alphanumeric');
      }
    }
    setIsOpen(true);
  }, []);

  // Close keyboard
  const closeKeyboard = useCallback(() => {
    setIsOpen(false);
    setIsShift(false);
  }, []);

  // Toggle keyboard
  const toggleKeyboard = useCallback(() => {
    if (isOpen) {
      closeKeyboard();
    } else {
      openKeyboard();
    }
  }, [isOpen, closeKeyboard, openKeyboard]);

  // Global listener for focusin on inputs and textareas
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const isInput = target.tagName === 'INPUT';
      const isTextarea = target.tagName === 'TEXTAREA';

      if (!isInput && !isTextarea) return;

      const inputEl = target as HTMLInputElement | HTMLTextAreaElement;

      // Ignore non-text inputs
      if (isInput) {
        const inputType = (inputEl as HTMLInputElement).type?.toLowerCase();
        if (['checkbox', 'radio', 'file', 'hidden', 'button', 'submit', 'reset', 'range', 'color', 'image'].includes(inputType)) {
          return;
        }
      }

      // Ignore readonly or disabled inputs
      if (inputEl.readOnly || inputEl.disabled) return;

      setActiveElement(inputEl);
      setInputTitle(getElementTitle(inputEl));

      const isNumeric = isNumericInput(inputEl);
      setLayout(isNumeric ? 'numeric' : 'alphanumeric');

      const currentMode = modeRef.current;
      const physicalKb = hasPhysicalKeyboardRef.current;
      const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

      // Auto triggering rule:
      if (currentMode === 'always' || (currentMode === 'auto' && (touch || !physicalKb))) {
        setIsOpen(true);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  // Haptic feedback helper
  const triggerHaptic = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(12);
      }
    } catch (e) {}
  };

  // Keyboard typing actions
  const insertChar = useCallback((char: string) => {
    triggerHaptic();
    const el = activeElementRef.current;
    if (!el) return;

    let charToInsert = char;
    if (isShift && !isCapsLock) {
      charToInsert = char.toUpperCase();
      setIsShift(false); // Shift is one-shot
    } else if (isCapsLock) {
      charToInsert = isShift ? char.toLowerCase() : char.toUpperCase();
    }

    insertTextAtCursor(el, charToInsert);
  }, [isShift, isCapsLock]);

  const backspace = useCallback(() => {
    triggerHaptic();
    const el = activeElementRef.current;
    if (!el) return;
    backspaceAtCursor(el);
  }, []);

  const clear = useCallback(() => {
    triggerHaptic();
    const el = activeElementRef.current;
    if (!el) return;
    clearInputValue(el);
  }, []);

  const pressSpace = useCallback(() => {
    triggerHaptic();
    const el = activeElementRef.current;
    if (!el) return;
    insertTextAtCursor(el, ' ');
  }, []);

  const pressEnter = useCallback(() => {
    triggerHaptic();
    const el = activeElementRef.current;
    if (!el) return;

    // Dispatch enter keydown and keyup events
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });
    el.dispatchEvent(enterEvent);

    if (el.tagName === 'TEXTAREA') {
      insertTextAtCursor(el, '\n');
    } else {
      // For form submit or next field
      if (el.form) {
        const submitBtn = el.form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
        if (submitBtn) {
          submitBtn.click();
        }
      }
      closeKeyboard();
    }
  }, [closeKeyboard]);

  const toggleShift = useCallback(() => {
    triggerHaptic();
    setIsShift(prev => !prev);
  }, []);

  const toggleCapsLock = useCallback(() => {
    triggerHaptic();
    setIsCapsLock(prev => !prev);
    setIsShift(false);
  }, []);

  return (
    <VirtualKeyboardContext.Provider
      value={{
        isOpen,
        mode,
        layout,
        position,
        customPos,
        isMinimized,
        isTransparent,
        hasPhysicalKeyboard,
        isTouchDevice,
        activeElement,
        inputTitle,
        isShift,
        isCapsLock,
        openKeyboard,
        closeKeyboard,
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
      }}
    >
      {children}
    </VirtualKeyboardContext.Provider>
  );
};

export const useVirtualKeyboard = () => {
  const context = useContext(VirtualKeyboardContext);
  if (!context) {
    throw new Error('useVirtualKeyboard must be used within a VirtualKeyboardProvider');
  }
  return context;
};
