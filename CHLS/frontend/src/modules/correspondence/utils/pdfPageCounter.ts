import { PDFDocument } from 'pdf-lib';

/**
 * Cuenta de forma exacta e instantánea las páginas de un archivo PDF en el navegador.
 * Si ocurre cualquier error de lectura o el PDF está protegido, utiliza un fallback o retorna 1.
 */
export async function countPdfPages(file: File): Promise<number> {
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    return 1;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const count = pdfDoc.getPageCount();
    return Math.max(1, count);
  } catch (error) {
    console.warn(`[pdfPageCounter] Fallback parsing for ${file.name}:`, error);
    try {
      const text = await file.text();
      const matches = text.match(/\/Type\s*\/Page\b/g);
      if (matches && matches.length > 0) {
        return matches.length;
      }
    } catch {}
    return 1;
  }
}

/**
 * Cuenta el total de páginas de una lista de archivos PDF.
 */
export async function countTotalPdfPages(files: File[]): Promise<{ total: number; byFile: Record<string, number> }> {
  const byFile: Record<string, number> = {};
  let total = 0;

  for (const file of files) {
    const pages = await countPdfPages(file);
    byFile[file.name] = pages;
    total += pages;
  }

  return { total, byFile };
}
