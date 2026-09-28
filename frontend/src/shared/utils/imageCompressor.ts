/**
 * Client-side image compressor using HTML5 Canvas and createImageBitmap.
 * Resizes large images (e.g. 5-15MB camera captures) and compresses to WebP/JPEG
 * down to ~30-60KB without visible quality loss, optimizing performance,
 * memory footprint, and network transfer.
 */
export const compressImage = async (
  file: File,
  maxWidth = 640,
  maxHeight = 640,
  quality = 0.85
): Promise<{ dataUrl: string; originalSizeKb: number; compressedSizeKb: number }> => {
  const originalSizeKb = Math.round(file.size / 1024);

  // Helper to load image dimensions and bitmap/element
  let imgSource: ImageBitmap | HTMLImageElement;
  let sourceWidth = 0;
  let sourceHeight = 0;

  if (typeof window.createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      imgSource = bitmap;
      sourceWidth = bitmap.width;
      sourceHeight = bitmap.height;
    } catch {
      imgSource = await loadImageElement(file);
      sourceWidth = (imgSource as HTMLImageElement).naturalWidth || (imgSource as HTMLImageElement).width;
      sourceHeight = (imgSource as HTMLImageElement).naturalHeight || (imgSource as HTMLImageElement).height;
    }
  } else {
    imgSource = await loadImageElement(file);
    sourceWidth = (imgSource as HTMLImageElement).naturalWidth || (imgSource as HTMLImageElement).width;
    sourceHeight = (imgSource as HTMLImageElement).naturalHeight || (imgSource as HTMLImageElement).height;
  }

  // Calculate proportional dimensions maintaining aspect ratio
  const scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo obtener el contexto 2D del canvas');
  }

  // Draw image with high-quality bicubic interpolation
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imgSource, 0, 0, targetWidth, targetHeight);

  if ('close' in imgSource && typeof (imgSource as ImageBitmap).close === 'function') {
    (imgSource as ImageBitmap).close();
  }

  // Try WebP first; if browser doesn't support WebP export, fallback to JPEG
  let dataUrl = canvas.toDataURL('image/webp', quality);
  if (!dataUrl.startsWith('data:image/webp')) {
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  const compressedSizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);

  return { dataUrl, originalSizeKb, compressedSizeKb };
};

const loadImageElement = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo decodificar la imagen seleccionada'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
};

