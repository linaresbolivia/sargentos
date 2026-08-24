/**
 * Client-side image compressor using HTML5 Canvas.
 * Resizes large images (e.g. 5-10MB camera captures) and compresses to JPEG
 * down to ~100-300KB for instant uploads and WhatsApp compatibility.
 */
export const compressImage = (
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.75
): Promise<{ dataUrl: string; originalSizeKb: number; compressedSizeKb: number }> => {
  return new Promise((resolve, reject) => {
    const originalSizeKb = Math.round(file.size / 1024);
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate proportional scale
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const rawDataUrl = e.target?.result as string;
          const rawKb = Math.round((rawDataUrl.length * 3) / 4 / 1024);
          return resolve({ dataUrl: rawDataUrl, originalSizeKb, compressedSizeKb: rawKb });
        }

        // Draw image on canvas with high-quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to compressed JPEG data URL
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const compressedSizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);

        resolve({ dataUrl, originalSizeKb, compressedSizeKb });
      };

      img.onerror = (err) => reject(new Error('No se pudo decodificar la imagen seleccionada'));
      img.src = e.target?.result as string;
    };

    reader.onerror = (err) => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
};
