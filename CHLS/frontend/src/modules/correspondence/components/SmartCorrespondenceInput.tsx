import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Sparkles } from 'lucide-react';
import { autoCorrectAccents, getPredictiveSuggestion } from '../utils/correspondencePredictiveEngine';

export interface SmartInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  enablePrediction?: boolean;
  onValueChange?: (value: string) => void;
  containerClassName?: string;
}

export const SmartCorrespondenceInput = forwardRef<HTMLInputElement, SmartInputProps>(
  (
    {
      value,
      onChange,
      onValueChange,
      onKeyDown,
      onBlur,
      label,
      enablePrediction = true,
      className = '',
      containerClassName = '',
      placeholder = '',
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const [currentVal, setCurrentVal] = useState<string>((value as string) || '');
    const [suggestion, setSuggestion] = useState<string | null>(null);

    useEffect(() => {
      if (value !== undefined) {
        setCurrentVal(value as string);
      }
    }, [value]);

    useEffect(() => {
      if (enablePrediction && currentVal) {
        const pred = getPredictiveSuggestion(currentVal);
        setSuggestion(pred);
      } else {
        setSuggestion(null);
      }
    }, [currentVal, enablePrediction]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setCurrentVal(val);
      if (onChange) onChange(e);
      if (onValueChange) onValueChange(val);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Si hay una sugerencia predictiva y presiona Tab o Flecha Derecha, autocompletar
      if ((e.key === 'Tab' || e.key === 'ArrowRight') && suggestion) {
        e.preventDefault();
        const completedText = currentVal + suggestion;
        setCurrentVal(completedText);
        setSuggestion(null);

        // Crear evento sintético para disparar onChange
        if (inputRef.current) {
          inputRef.current.value = completedText;
        }
        if (onValueChange) onValueChange(completedText);
        if (onChange) {
          const syntheticEvent = {
            ...e,
            target: inputRef.current || e.target,
            currentTarget: inputRef.current || e.currentTarget,
          } as unknown as React.ChangeEvent<HTMLInputElement>;
          onChange(syntheticEvent);
        }
        return;
      }

      // Al presionar Espacio, aplicar auto-corrección de acentos a la palabra escrita
      if (e.key === ' ') {
        const corrected = autoCorrectAccents(currentVal);
        if (corrected !== currentVal) {
          setCurrentVal(corrected);
          if (onValueChange) onValueChange(corrected);
        }
      }

      if (onKeyDown) onKeyDown(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Auto-corregir acentos al salir del campo
      const corrected = autoCorrectAccents(currentVal);
      if (corrected !== currentVal) {
        setCurrentVal(corrected);
        if (inputRef.current) inputRef.current.value = corrected;
        if (onValueChange) onValueChange(corrected);
        if (onChange) {
          const syntheticEvent = {
            ...e,
            target: inputRef.current || e.target,
            currentTarget: inputRef.current || e.currentTarget,
          } as unknown as React.ChangeEvent<HTMLInputElement>;
          onChange(syntheticEvent);
        }
      }
      setSuggestion(null);
      if (onBlur) onBlur(e);
    };

    const acceptSuggestion = () => {
      if (!suggestion) return;
      const completedText = currentVal + suggestion;
      setCurrentVal(completedText);
      setSuggestion(null);
      if (inputRef.current) {
        inputRef.current.value = completedText;
        inputRef.current.focus();
      }
      if (onValueChange) onValueChange(completedText);
    };

    return (
      <div className={`relative flex flex-col ${containerClassName}`}>
        {label && (
          <div className="flex items-center justify-between mb-1 text-xs font-bold text-slate-800 dark:text-gray-300">
            <span>{label}</span>
            {suggestion && (
              <button
                type="button"
                onClick={acceptSuggestion}
                className="text-[10px] text-amber-700 dark:text-brand-gold bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-1 hover:bg-amber-500/20 cursor-pointer animate-pulse select-none"
              >
                <Sparkles className="w-2.5 h-2.5" />
                <span>Tab para autocompletar</span>
              </button>
            )}
          </div>
        )}

        <div className="relative flex items-center w-full">
          <input
            ref={inputRef}
            type="text"
            value={currentVal}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            spellCheck={true}
            lang="es-BO"
            autoCorrect="on"
            autoCapitalize="sentences"
            placeholder={placeholder}
            className={`w-full px-3.5 py-2.5 bg-white dark:bg-black/40 border border-slate-300 dark:border-emerald-500/30 rounded-xl text-xs sm:text-sm text-slate-950 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 dark:focus:border-emerald-400 transition-all font-medium ${className}`}
            {...props}
          />

          {/* Ghost Text Overlay para Predicción Inline */}
          {suggestion && (
            <div
              onClick={acceptSuggestion}
              className="absolute left-3.5 text-xs sm:text-sm pointer-events-auto cursor-pointer select-none font-medium flex items-center"
              style={{ zIndex: 1 }}
            >
              {/* Texto transparente para alinear con el cursor */}
              <span className="opacity-0">{currentVal}</span>
              {/* Texto fantasma sugerido */}
              <span className="text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-1.5 py-0.5 rounded shadow-xs font-semibold">
                {suggestion}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

SmartCorrespondenceInput.displayName = 'SmartCorrespondenceInput';
export default SmartCorrespondenceInput;
