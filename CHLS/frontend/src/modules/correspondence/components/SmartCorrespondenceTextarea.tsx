import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Sparkles, CheckCheck } from 'lucide-react';
import { autoCorrectAccents, getPredictiveSuggestion, CORRESPONDENCE_PREDICTIVE_PHRASES } from '../utils/correspondencePredictiveEngine';

export interface SmartTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  enablePrediction?: boolean;
  enableQuickPhrases?: boolean;
  onValueChange?: (value: string) => void;
  containerClassName?: string;
}

export const SmartCorrespondenceTextarea = forwardRef<HTMLTextAreaElement, SmartTextareaProps>(
  (
    {
      value,
      onChange,
      onValueChange,
      onKeyDown,
      onBlur,
      label,
      enablePrediction = true,
      enableQuickPhrases = true,
      className = '',
      containerClassName = '',
      placeholder = '',
      rows = 3,
      ...props
    },
    ref
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

    const [currentVal, setCurrentVal] = useState<string>((value as string) || '');
    const [suggestion, setSuggestion] = useState<string | null>(null);
    const [showPhrasesList, setShowPhrasesList] = useState<boolean>(false);

    useEffect(() => {
      if (value !== undefined) {
        setCurrentVal(value as string);
      }
    }, [value]);

    useEffect(() => {
      if (enablePrediction && currentVal) {
        // Predecir sobre la última línea o texto general
        const lines = currentVal.split('\n');
        const lastLine = lines[lines.length - 1];
        const pred = getPredictiveSuggestion(lastLine || currentVal);
        setSuggestion(pred);
      } else {
        setSuggestion(null);
      }
    }, [currentVal, enablePrediction]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setCurrentVal(val);
      if (onChange) onChange(e);
      if (onValueChange) onValueChange(val);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Tab para autocompletar predicción
      if (e.key === 'Tab' && suggestion) {
        e.preventDefault();
        const completedText = currentVal + suggestion;
        setCurrentVal(completedText);
        setSuggestion(null);

        if (textareaRef.current) {
          textareaRef.current.value = completedText;
        }
        if (onValueChange) onValueChange(completedText);
        if (onChange) {
          const syntheticEvent = {
            ...e,
            target: textareaRef.current || e.target,
            currentTarget: textareaRef.current || e.currentTarget,
          } as unknown as React.ChangeEvent<HTMLTextAreaElement>;
          onChange(syntheticEvent);
        }
        return;
      }

      // Al presionar Espacio, auto-corregir acentos de la palabra
      if (e.key === ' ') {
        const corrected = autoCorrectAccents(currentVal);
        if (corrected !== currentVal) {
          setCurrentVal(corrected);
          if (onValueChange) onValueChange(corrected);
        }
      }

      if (onKeyDown) onKeyDown(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      const corrected = autoCorrectAccents(currentVal);
      if (corrected !== currentVal) {
        setCurrentVal(corrected);
        if (textareaRef.current) textareaRef.current.value = corrected;
        if (onValueChange) onValueChange(corrected);
        if (onChange) {
          const syntheticEvent = {
            ...e,
            target: textareaRef.current || e.target,
            currentTarget: textareaRef.current || e.currentTarget,
          } as unknown as React.ChangeEvent<HTMLTextAreaElement>;
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
      if (textareaRef.current) {
        textareaRef.current.value = completedText;
        textareaRef.current.focus();
      }
      if (onValueChange) onValueChange(completedText);
    };

    const insertPhrase = (phrase: string) => {
      const newText = currentVal ? `${currentVal.trim()}\n${phrase}` : phrase;
      setCurrentVal(newText);
      setShowPhrasesList(false);
      if (textareaRef.current) {
        textareaRef.current.value = newText;
        textareaRef.current.focus();
      }
      if (onValueChange) onValueChange(newText);
    };

    return (
      <div className={`relative flex flex-col ${containerClassName}`}>
        {label && (
          <div className="flex items-center justify-between mb-1 text-xs font-bold text-gray-300">
            <span>{label}</span>
            <div className="flex items-center gap-2">
              {suggestion && (
                <button
                  type="button"
                  onClick={acceptSuggestion}
                  className="text-[10px] text-brand-gold bg-amber-500/10 border border-brand-gold/30 px-1.5 py-0.5 rounded-md flex items-center gap-1 hover:bg-amber-500/20 cursor-pointer animate-pulse select-none"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Tab autocompletar</span>
                </button>
              )}
              {enableQuickPhrases && (
                <button
                  type="button"
                  onClick={() => setShowPhrasesList(!showPhrasesList)}
                  className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-1 hover:bg-emerald-500/20 cursor-pointer select-none"
                  title="Fórmulas y proveídos oficiales"
                >
                  <CheckCheck className="w-3 h-3 text-emerald-400" />
                  <span>Fórmulas oficiales</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Dropdown de Fórmulas Oficiales */}
        {showPhrasesList && (
          <div className="mb-2 p-2 bg-[#111b21] border border-emerald-500/40 rounded-xl shadow-2xl max-h-44 overflow-y-auto custom-scrollbar animate-fadeIn z-20">
            <div className="text-[10px] font-black uppercase text-brand-gold px-1.5 py-1 mb-1 border-b border-white/10 flex items-center justify-between">
              <span>Proveídos y Fórmulas Institucionales CHLS</span>
              <button
                type="button"
                onClick={() => setShowPhrasesList(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1">
              {CORRESPONDENCE_PREDICTIVE_PHRASES.slice(0, 8).map((phrase, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => insertPhrase(phrase)}
                  className="w-full text-left text-xs text-gray-200 hover:text-white hover:bg-emerald-500/20 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="text-emerald-400 text-xs">▸</span>
                  <span className="truncate">{phrase}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative w-full">
          <textarea
            ref={textareaRef}
            rows={rows}
            value={currentVal}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            spellCheck={true}
            lang="es-BO"
            autoCorrect="on"
            autoCapitalize="sentences"
            placeholder={placeholder}
            className={`w-full px-3.5 py-2.5 bg-black/40 border border-emerald-500/30 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 transition-all font-medium custom-scrollbar ${className}`}
            {...props}
          />
        </div>
      </div>
    );
  }
);

SmartCorrespondenceTextarea.displayName = 'SmartCorrespondenceTextarea';
export default SmartCorrespondenceTextarea;
