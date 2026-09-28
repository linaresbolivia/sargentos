import { PDFDocument } from 'pdf-lib';

/**
 * Cuenta de forma exacta e instantánea las páginas de un archivo PDF o documento en el navegador.
 * Soporta PDFs nativos, PDFs digitalizados por escáneres físicos y fallback binario.
 * Si ocurre cualquier error o el archivo no es PDF (ej. foto de celular JPG/PNG), retorna 1 foja por documento.
 */
export async function countPdfPages(file: File): Promise<number> {
  const fileName = (file.name || '').toLowerCase();
  const fileType = (file.type || '').toLowerCase();
  const isPdf = fileName.endsWith('.pdf') || fileType === 'application/pdf';

  // Si no es PDF (por ej. fotos, comprobantes o recibos escaneados en JPG/PNG), cada documento físico es 1 foja
  if (!isPdf) {
    return 1;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    // 1. Intentar carga estándar con pdf-lib (soporta flate stream decompression)
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const count = pdfDoc.getPageCount();
    if (count > 0) {
      return count;
    }
  } catch (error) {
    console.warn(`[pdfPageCounter] pdf-lib parse issue for ${file.name}, trying binary regex:`, error);
  }

  // 2. Fallback binario con Latin-1: lee la estructura interna del PDF sin corromper bytes nulos
  try {
    const arrayBuffer = await file.arrayBuffer();
    const latin1Text = new TextDecoder('latin1').decode(new Uint8Array(arrayBuffer));

    // Búsqueda en el diccionario de páginas raíz (/Type /Pages ... /Count N)
    const countMatches = [...latin1Text.matchAll(/\/Type\s*\/Pages\b[\s\S]{0,400}?\/Count\s+(\d+)/gi)];
    if (countMatches.length > 0) {
      const counts = countMatches.map((m) => parseInt(m[1], 10)).filter((n) => !isNaN(n) && n > 0);
      if (counts.length > 0) {
        return Math.max(...counts);
      }
    }

    // Búsqueda de objetos de página individual (/Type /Page pero no /Pages)
    const pageMatches = latin1Text.match(/\/Type\s*\/Page(?![a-zA-Z])/g);
    if (pageMatches && pageMatches.length > 0) {
      return pageMatches.length;
    }
  } catch (fallbackErr) {
    console.warn(`[pdfPageCounter] Binary fallback error for ${file.name}:`, fallbackErr);
  }

  return 1;
}

/**
 * Cuenta el total de páginas de una lista de archivos digitalizados (PDFs, imágenes, anexos).
 */
export async function countTotalPdfPages(files: File[]): Promise<{ total: number; byFile: Record<string, number> }> {
  const byFile: Record<string, number> = {};
  let total = 0;

  for (const file of files) {
    try {
      const pages = await countPdfPages(file);
      byFile[file.name] = pages;
      total += pages;
    } catch {
      byFile[file.name] = 1;
      total += 1;
    }
  }

  return { total, byFile };
}

