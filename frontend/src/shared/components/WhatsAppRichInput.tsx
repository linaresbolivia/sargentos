import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { getAppleEmojiUrl } from './WhatsAppEmojiRenderer';

export interface WhatsAppRichInputHandle {
  insertEmoji: (emoji: string) => void;
  clear: () => void;
  focus: () => void;
  getText: () => string;
  setText: (text: string) => void;
}

interface WhatsAppRichInputProps {
  value: string;
  onChange: (text: string) => void;
  onEnterPress: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const WhatsAppRichInput = forwardRef<WhatsAppRichInputHandle, WhatsAppRichInputProps>(
  ({ value, onChange, onEnterPress, placeholder = 'Escribe un mensaje aquí...', className = '', disabled = false }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const isInternalUpdate = useRef(false);

    // Extraer texto plano con emojis a partir del HTML del editor
    const extractTextFromEditor = (element: HTMLElement): string => {
      let result = '';
      element.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          result += node.textContent || '';
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (el.tagName === 'IMG' && el.getAttribute('alt')) {
            result += el.getAttribute('alt') || '';
          } else if (el.tagName === 'BR') {
            result += '\n';
          } else {
            result += extractTextFromEditor(el);
          }
        }
      });
      return result;
    };

    // Convertir texto plano a HTML con imágenes de emojis de WhatsApp
    const convertTextToEmojiHtml = (text: string): string => {
      if (!text) return '';
      // Escape HTML
      const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Reemplazar secuencias de emoji por <img />
      const EMOJI_REGEX = /(\p{Extended_Pictographic}(?:\u200D\p{Extended_Pictographic})*(?:\uFE0F|\uFE0E)?(?:\uD83C[\uDFFB-\uDFFF])?)/gu;
      return escaped.replace(EMOJI_REGEX, (match) => {
        const url = getAppleEmojiUrl(match);
        return `<img src="${url}" alt="${match}" class="inline-block w-5 h-5 align-[-0.2em] mx-[1.5px] select-all pointer-events-none" draggable="false" />`;
      });
    };

    // Sincronizar valor externo si cambia y no fue provocado por el usuario escribiendo
    useEffect(() => {
      if (isInternalUpdate.current) {
        isInternalUpdate.current = false;
        return;
      }

      if (editorRef.current) {
        const currentText = extractTextFromEditor(editorRef.current);
        if (currentText !== value) {
          editorRef.current.innerHTML = convertTextToEmojiHtml(value);
        }
      }
    }, [value]);

    const handleInput = () => {
      if (!editorRef.current) return;
      isInternalUpdate.current = true;
      const text = extractTextFromEditor(editorRef.current);
      onChange(text);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onEnterPress();
      }
    };

    // Exponer métodos imperativos (ej. insertEmoji)
    useImperativeHandle(ref, () => ({
      insertEmoji: (emoji: string) => {
        if (!editorRef.current) return;
        editorRef.current.focus();

        const selection = window.getSelection();
        const url = getAppleEmojiUrl(emoji);
        const imgHtml = `<img src="${url}" alt="${emoji}" class="inline-block w-5 h-5 align-[-0.2em] mx-[1.5px] select-all pointer-events-none" draggable="false" />`;

        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();

          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = imgHtml;
          const imgNode = tempDiv.firstChild as HTMLElement;

          if (imgNode) {
            range.insertNode(imgNode);
            // Colocar el cursor justo después de la imagen insertada
            range.setStartAfter(imgNode);
            range.setEndAfter(imgNode);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        } else {
          editorRef.current.innerHTML += imgHtml;
        }

        handleInput();
      },
      clear: () => {
        if (editorRef.current) {
          editorRef.current.innerHTML = '';
          handleInput();
        }
      },
      focus: () => {
        editorRef.current?.focus();
      },
      getText: () => {
        return editorRef.current ? extractTextFromEditor(editorRef.current) : '';
      },
      setText: (newText: string) => {
        if (editorRef.current) {
          editorRef.current.innerHTML = convertTextToEmojiHtml(newText);
          handleInput();
        }
      },
    }));

    return (
      <div className="relative flex-1 min-w-0">
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          role="textbox"
          aria-multiline="false"
          spellCheck={true}
          lang="es-BO"
          autoCorrect="on"
          autoCapitalize="sentences"
          className={`w-full max-h-28 overflow-y-auto px-4 py-2.5 bg-white dark:bg-black/40 border border-slate-300 dark:border-emerald-500/30 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 placeholder-slate-400 dark:placeholder-gray-500 leading-normal custom-scrollbar ${className}`}
          style={{ minHeight: '38px', wordBreak: 'break-word' }}
        />
        {!value && (
          <div
            onClick={() => editorRef.current?.focus()}
            className="absolute left-4 top-2.5 text-xs sm:text-sm text-slate-400 dark:text-gray-500 pointer-events-none select-none truncate"
          >
            {placeholder}
          </div>
        )}
      </div>
    );
  }
);

WhatsAppRichInput.displayName = 'WhatsAppRichInput';
export default WhatsAppRichInput;
