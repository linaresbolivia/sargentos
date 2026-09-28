import React, { useState, useMemo } from 'react';

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

interface EmojiImageProps {
  part: string;
  sizeClass: string;
}

const EmojiImage: React.FC<EmojiImageProps> = ({ part, sizeClass }) => {
  const [hasError, setHasError] = useState(false);
  const imgUrl = useMemo(() => getAppleEmojiUrl(part), [part]);

  if (hasError) {
    return <span className="inline-block mx-[1px]">{part}</span>;
  }

  return (
    <img
      src={imgUrl}
      alt={part}
      title={part}
      className={`inline-block ${sizeClass} mx-[1.5px] align-[-0.2em] pointer-events-none select-text`}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
};

interface WhatsAppEmojiTextProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Renderiza texto reemplazando emojis por los iconos gráficos oficiales de WhatsApp / Apple
 * con manejo de estado puro en React para evitar corrupción del DOM.
 */
export const WhatsAppEmojiText: React.FC<WhatsAppEmojiTextProps> = ({
  text,
  className = '',
  size = 'md',
}) => {
  if (!text) return null;

  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';

  // Dividir el texto conservando los emojis en los tokens
  const parts = useMemo(() => text.split(EMOJI_REGEX), [text]);

  return (
    <span className={`inline-block leading-relaxed break-words whitespace-pre-wrap ${className}`}>
      {parts.map((part, index) => {
        if (!part) return null;

        if (EMOJI_REGEX.test(part)) {
          return <EmojiImage key={`${part}-${index}`} part={part} sizeClass={sizeClass} />;
        }

        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

export default WhatsAppEmojiText;
