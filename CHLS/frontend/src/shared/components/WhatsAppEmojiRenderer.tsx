import React from 'react';

/**
 * Convierte un caracter o secuencia de emoji Unicode a su identificador hex "unified"
 * para obtener la imagen oficial de Apple / WhatsApp desde CDN.
 */
export function getEmojiUnifiedCode(emojiStr: string): string {
  const codePoints: string[] = [];
  for (let i = 0; i < emojiStr.length; i++) {
    const codePoint = emojiStr.codePointAt(i);
    if (codePoint !== undefined) {
      codePoints.push(codePoint.toString(16).toLowerCase());
      if (codePoint > 0xffff) {
        i++; // Avanzar un carácter extra para pares subrogados
      }
    }
  }
  // Eliminar selectores de variación 0xfe0e (texto) y mantener 0xfe0f solo si es necesario
  return codePoints.filter((cp) => cp !== 'fe0e').join('-');
}

export function getAppleEmojiUrl(emojiStr: string): string {
  const unified = getEmojiUnifiedCode(emojiStr);
  return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/${unified}.png`;
}

// Regex universal para detectar cualquier emoji Unicode (incluye modificadores de tono de piel y secuencias ZWJ)
export const EMOJI_REGEX = /(\p{Extended_Pictographic}(?:\u200D\p{Extended_Pictographic})*(?:\uFE0F|\uFE0E)?(?:\uD83C[\uDFFB-\uDFFF])?)/u;

interface WhatsAppEmojiTextProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Renderiza texto reemplazando emojis por los iconos gráficos oficiales de WhatsApp / Apple
 */
export const WhatsAppEmojiText: React.FC<WhatsAppEmojiTextProps> = ({
  text,
  className = '',
  size = 'md',
}) => {
  if (!text) return null;

  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';

  // Dividir el texto conservando los emojis en los tokens
  const parts = text.split(EMOJI_REGEX);

  return (
    <span className={`inline-block leading-relaxed break-words whitespace-pre-wrap ${className}`}>
      {parts.map((part, index) => {
        if (!part) return null;

        // Comprobar si esta parte es un emoji
        if (EMOJI_REGEX.test(part)) {
          const imgUrl = getAppleEmojiUrl(part);
          return (
            <img
              key={index}
              src={imgUrl}
              alt={part}
              title={part}
              className={`inline-block ${sizeClass} mx-[1.5px] align-[-0.2em] pointer-events-none select-text`}
              loading="lazy"
              onError={(e) => {
                // Fallback a emoji de texto nativo si la imagen no existiera
                const target = e.currentTarget;
                target.style.display = 'none';
                if (target.parentNode) {
                  const textNode = document.createTextNode(part);
                  target.parentNode.insertBefore(textNode, target);
                }
              }}
            />
          );
        }

        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

export default WhatsAppEmojiText;
