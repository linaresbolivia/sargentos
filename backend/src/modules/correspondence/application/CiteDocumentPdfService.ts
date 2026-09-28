import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { logger } from '@config/logger';

function cleanAnsi(text: any): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/[↳→➔]/g, '->')
    .replace(/[—–]/g, '-')
    .replace(/[•●]/g, '|')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[✓✔]/g, '[OK]')
    .replace(/[🔒🔐📎📌🏢🏷️💼]/g, '')
    .replace(/[^\x00-\xFF]/g, ' ');
}

function formatDateBolivia(dateInput?: Date | string | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return 'La Paz, fecha no especificada';

  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  return `La Paz, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

export interface CitePdfData {
  citeCode: string;
  docType: string;
  areaName: string;
  areaKey: string;
  year: number;
  recipient: string;
  recipientRole?: string | null;
  recipientEntity?: string | null;
  senderName: string;
  senderRole: string;
  initials?: string | null;
  subject: string;
  bodyText?: string | null;
  officialDate?: Date | string | null;
}

export class CiteDocumentPdfService {
  /**
   * Genera el PDF oficial reglamentario del documento según uno de los 5 Modelos Institucionales
   */
  public async generateOfficialDocumentPdf(data: CitePdfData): Promise<Buffer> {
    const doc = await PDFDocument.create();

    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);

    // Cargar Logo del Club Hípico Los Sargentos si existe
    let logoImage = null;
    const logoCandidates = [
      path.join(process.cwd(), 'assets', 'logo.png'),
      path.join(process.cwd(), '..', 'frontend', 'src', 'assets', 'logo.png'),
      path.join(process.cwd(), 'uploads', 'logo.png'),
    ];

    for (const cand of logoCandidates) {
      if (fs.existsSync(cand)) {
        try {
          const logoBytes = fs.readFileSync(cand);
          logoImage = await doc.embedPng(logoBytes);
          break;
        } catch (e) {
          logger.warn('[CitePdf] No se pudo cargar logo de ' + cand, e);
        }
      }
    }

    // Código QR de Verificación Inmutable
    const qrText = `CHLS CITE OFICIAL\nCódigo: ${data.citeCode}\nÁrea: ${data.areaName}\nTipo: ${data.docType}\nFecha: ${formatDateBolivia(data.officialDate)}\nRef: ${data.subject}`;
    const qrDataUrl = await QRCode.toDataURL(qrText, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 150,
      color: { dark: '#0b532c', light: '#ffffff' },
    });
    const qrPngBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    const qrImage = await doc.embedPng(qrPngBytes);

    // Dimensiones de página Letter: 612 x 792 pt
    const pageWidth = 612;
    const pageHeight = 792;

    // Márgenes normativos del instructivo:
    // Superior: 4.5 cm (~127.5 pt)
    // Laterales / Inferior: 3.0 cm (~85 pt)
    const marginLeft = 85;
    const marginRight = pageWidth - 85;
    const contentWidth = marginRight - marginLeft;
    const marginBottom = 85;

    let page = doc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - 35;

    // 1. Cabecera Institucional (Página 1)
    if (logoImage) {
      // Escudo blanco y negro o color institucional centrado (ancho 85 pt, alto 92 pt aprox)
      const logoWidth = 75;
      const logoHeight = 82;
      const logoX = (pageWidth - logoWidth) / 2;
      page.drawImage(logoImage, {
        x: logoX,
        y: currentY - logoHeight,
        width: logoWidth,
        height: logoHeight,
      });
      currentY -= (logoHeight + 15);
    } else {
      // Texto de membrete si no hay imagen
      page.drawText('CLUB HÍPICO LOS SARGENTOS', {
        x: marginLeft,
        y: currentY,
        size: 13,
        font: fontBold,
        color: rgb(0.04, 0.33, 0.17),
      });
      currentY -= 35;
    }

    // 2. Título de Documento o CITE según el modelo
    const docTypeKey = (data.docType || 'INF').trim().toUpperCase();

    if (docTypeKey === 'INF') {
      // INFORME
      page.drawText('INFORME', {
        x: (pageWidth - fontBold.widthOfTextAtSize('INFORME', 14)) / 2,
        y: currentY,
        size: 14,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      currentY -= 18;

      const citeStr = data.citeCode;
      page.drawText(citeStr, {
        x: (pageWidth - fontBold.widthOfTextAtSize(citeStr, 11)) / 2,
        y: currentY,
        size: 11,
        font: fontBold,
        color: rgb(0.15, 0.15, 0.15),
      });
      currentY -= 25;

    } else if (docTypeKey === 'INST') {
      // INSTRUCTIVO
      page.drawText('INSTRUCTIVO', {
        x: (pageWidth - fontBold.widthOfTextAtSize('INSTRUCTIVO', 14)) / 2,
        y: currentY,
        size: 14,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      currentY -= 18;

      page.drawText(data.citeCode, {
        x: (pageWidth - fontBold.widthOfTextAtSize(data.citeCode, 11)) / 2,
        y: currentY,
        size: 11,
        font: fontBold,
        color: rgb(0.15, 0.15, 0.15),
      });
      currentY -= 25;

    } else if (docTypeKey === 'MEM') {
      // MEMORÁNDUM
      page.drawText('MEMORÁNDUM', {
        x: (pageWidth - fontBold.widthOfTextAtSize('MEMORÁNDUM', 14)) / 2,
        y: currentY,
        size: 14,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      currentY -= 18;

      page.drawText(data.citeCode, {
        x: (pageWidth - fontBold.widthOfTextAtSize(data.citeCode, 11)) / 2,
        y: currentY,
        size: 11,
        font: fontBold,
        color: rgb(0.15, 0.15, 0.15),
      });
      currentY -= 25;

    } else if (docTypeKey === 'CI') {
      // COMUNICACIÓN INTERNA - NOTA
      page.drawText('COMUNICACIÓN INTERNA', {
        x: (pageWidth - fontBold.widthOfTextAtSize('COMUNICACIÓN INTERNA', 13)) / 2,
        y: currentY,
        size: 13,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      currentY -= 18;

      page.drawText(data.citeCode, {
        x: (pageWidth - fontBold.widthOfTextAtSize(data.citeCode, 11)) / 2,
        y: currentY,
        size: 11,
        font: fontBold,
        color: rgb(0.15, 0.15, 0.15),
      });
      currentY -= 25;

    } else {
      // CARTA EXTERNA (NE)
      const isSN = !data.citeCode || data.citeCode.startsWith('S/N') || data.citeCode === 'S/N';
      if (!isSN) {
        page.drawText(data.citeCode, {
          x: marginLeft,
          y: currentY,
          size: 11,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.1),
        });
      }

      const fechaStr = formatDateBolivia(data.officialDate);
      const fechaW = fontRegular.widthOfTextAtSize(fechaStr, 10);
      page.drawText(fechaStr, {
        x: marginRight - fechaW,
        y: currentY,
        size: 10,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.2),
      });
      currentY -= 35;
    }

    // 3. Bloque de Datos del Encabezado
    if (docTypeKey !== 'NE') {
      // Para INF, CI, INST, MEM: Formato A: / DE: / REF.: / FECHA:
      const lineHeight = 16;

      // Destinatario A:
      page.drawText('A:', { x: marginLeft, y: currentY, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
      const recipientFull = `${data.recipient}${data.recipientRole ? ' - ' + data.recipientRole : ''}`;
      page.drawText(cleanAnsi(recipientFull), { x: marginLeft + 65, y: currentY, size: 10, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
      currentY -= lineHeight;

      // Remitente DE:
      page.drawText('DE:', { x: marginLeft, y: currentY, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
      const senderFull = `${data.senderName}${data.senderRole ? ' - ' + data.senderRole : ''}`;
      page.drawText(cleanAnsi(senderFull), { x: marginLeft + 65, y: currentY, size: 10, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
      currentY -= lineHeight;

      // Referencia REF.:
      page.drawText('REF.:', { x: marginLeft, y: currentY, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
      const refLines = this.wrapText(cleanAnsi(data.subject.toUpperCase()), contentWidth - 70, fontBold, 10);
      for (let i = 0; i < refLines.length; i++) {
        page.drawText(refLines[i], { x: marginLeft + 65, y: currentY, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
        if (i < refLines.length - 1) currentY -= 13;
      }
      currentY -= lineHeight;

      // Fecha:
      page.drawText('FECHA:', { x: marginLeft, y: currentY, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(formatDateBolivia(data.officialDate), { x: marginLeft + 65, y: currentY, size: 10, font: fontRegular, color: rgb(0.15, 0.15, 0.15) });
      currentY -= 15;

      // Línea divisoria formal
      page.drawLine({
        start: { x: marginLeft, y: currentY },
        end: { x: marginRight, y: currentY },
        thickness: 0.8,
        color: rgb(0.7, 0.7, 0.7),
      });
      currentY -= 22;

    } else {
      // Para Carta Externa: Vocativo
      page.drawText('Señor(a):', { x: marginLeft, y: currentY, size: 11, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
      currentY -= 15;

      page.drawText(cleanAnsi(data.recipient), { x: marginLeft, y: currentY, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
      currentY -= 14;

      if (data.recipientRole) {
        page.drawText(cleanAnsi(data.recipientRole), { x: marginLeft, y: currentY, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
        currentY -= 14;
      }

      if (data.recipientEntity) {
        page.drawText(cleanAnsi(data.recipientEntity), { x: marginLeft, y: currentY, size: 10, font: fontBold, color: rgb(0.15, 0.15, 0.15) });
        currentY -= 14;
      }

      page.drawText('Presente.-', { x: marginLeft, y: currentY, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
      currentY -= 22;

      // Referencia en Carta Externa
      page.drawText('REF.: ' + cleanAnsi(data.subject.toUpperCase()), {
        x: marginLeft,
        y: currentY,
        size: 10,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      currentY -= 20;

      // Saludo
      page.drawText('De mi mayor consideración:', { x: marginLeft, y: currentY, size: 11, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
      currentY -= 22;
    }

    // 4. Contenido del Cuerpo (según modelo)
    const bodyContent = this.prepareBodyContent(data);
    const bodyParagraphs = bodyContent.split('\n');

    for (const para of bodyParagraphs) {
      const trimmed = para.trim();
      if (!trimmed) {
        currentY -= 10;
        continue;
      }

      // Si es un subtítulo normativo (ej. 1. ANTECEDENTES, 2. ANÁLISIS TÉCNICO, etc.)
      const isHeading = /^\d+\.\s+[A-ZÁÉÍÓÚÑ\s]+$/.test(trimmed) || trimmed.startsWith('OBJETO') || trimmed.startsWith('DIRECTRICES');
      const font = isHeading ? fontBold : fontRegular;
      const fontSize = isHeading ? 10.5 : 10;
      const color = isHeading ? rgb(0.04, 0.33, 0.17) : rgb(0.15, 0.15, 0.15);

      const lines = this.wrapText(cleanAnsi(trimmed), contentWidth, font, fontSize);

      for (const line of lines) {
        if (currentY < marginBottom + 110) {
          // Nueva página
          page = doc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - 60;
        }

        page.drawText(line, {
          x: marginLeft,
          y: currentY,
          size: fontSize,
          font,
          color,
        });

        currentY -= 14;
      }

      currentY -= 6;
    }

    // Cierre o fórmula de cortesía reglamentaria
    if (docTypeKey === 'INF') {
      currentY -= 12;
      const closing = 'Es cuanto tengo a bien informar para los fines consiguientes.';
      page.drawText(closing, {
        x: marginLeft,
        y: currentY,
        size: 10,
        font: fontItalic,
        color: rgb(0.2, 0.2, 0.2),
      });
      currentY -= 25;
    } else if (docTypeKey === 'NE') {
      currentY -= 12;
      const closing = 'Con este motivo, saludo a usted con las consideraciones más distinguidas.';
      page.drawText(closing, {
        x: marginLeft,
        y: currentY,
        size: 10,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.2),
      });
      currentY -= 30;
    }

    // 5. Espacio de Firmas y Sellos
    if (currentY < marginBottom + 120) {
      page = doc.addPage([pageWidth, pageHeight]);
      currentY = pageHeight - 80;
    } else {
      currentY -= 35;
    }

    // Bloque de Firma Centrado
    const signLineWidth = 210;
    const signLineX = (pageWidth - signLineWidth) / 2;
    page.drawLine({
      start: { x: signLineX, y: currentY },
      end: { x: signLineX + signLineWidth, y: currentY },
      thickness: 0.8,
      color: rgb(0.4, 0.4, 0.4),
    });
    currentY -= 14;

    const signerName = cleanAnsi(data.senderName);
    page.drawText(signerName, {
      x: (pageWidth - fontBold.widthOfTextAtSize(signerName, 10)) / 2,
      y: currentY,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 12;

    const signerRole = cleanAnsi(data.senderRole);
    page.drawText(signerRole, {
      x: (pageWidth - fontRegular.widthOfTextAtSize(signerRole, 9)) / 2,
      y: currentY,
      size: 9,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
    currentY -= 11;

    const signerOrg = 'CLUB HÍPICO LOS SARGENTOS';
    page.drawText(signerOrg, {
      x: (pageWidth - fontRegular.widthOfTextAtSize(signerOrg, 8.5)) / 2,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.04, 0.33, 0.17),
    });

    // 6. Pie de Página, Foliación e Iniciales de Responsabilidad en todas las páginas
    const totalPages = doc.getPageCount();
    for (let pIdx = 0; pIdx < totalPages; pIdx++) {
      const p = doc.getPage(pIdx);

      // Línea divisoria inferior
      p.drawLine({
        start: { x: marginLeft, y: 55 },
        end: { x: marginRight, y: 55 },
        thickness: 0.5,
        color: rgb(0.75, 0.75, 0.75),
      });

      // Pie de página institucional oficial
      const footerText = 'Av. Los Sargentos N° 1000 esq. Av. Costanera | Central piloto 2788000 | clubhipico@sargentos.net';
      p.drawText(footerText, {
        x: (pageWidth - fontRegular.widthOfTextAtSize(footerText, 7.5)) / 2,
        y: 43,
        size: 7.5,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });

      // Foliación: Página X de Y
      const pageNumText = `Página ${pIdx + 1} de ${totalPages}`;
      p.drawText(pageNumText, {
        x: marginRight - fontRegular.widthOfTextAtSize(pageNumText, 8),
        y: 60,
        size: 8,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });

      // Iniciales de Responsabilidad y C.C. en la última página
      if (pIdx === totalPages - 1) {
        const initials = data.initials?.trim() || 'CHLS/adm';
        p.drawText(cleanAnsi(initials), {
          x: marginLeft,
          y: 72,
          size: 7.5,
          font: fontRegular,
          color: rgb(0.4, 0.4, 0.4),
        });

        p.drawText('c.c. Archivo', {
          x: marginLeft,
          y: 62,
          size: 7.5,
          font: fontRegular,
          color: rgb(0.4, 0.4, 0.4),
        });

        // Estampado QR de validación en la esquina inferior izquierda
        if (qrImage) {
          p.drawImage(qrImage, {
            x: marginLeft,
            y: 83,
            width: 38,
            height: 38,
          });
          p.drawText('VALIDACIÓN DIGITAL', {
            x: marginLeft + 42,
            y: 100,
            size: 6.5,
            font: fontBold,
            color: rgb(0.04, 0.33, 0.17),
          });
          p.drawText(`CITE: ${data.citeCode}`, {
            x: marginLeft + 42,
            y: 91,
            size: 6,
            font: fontRegular,
            color: rgb(0.3, 0.3, 0.3),
          });
        }
      }
    }

    const pdfBytes = await doc.save();
    return Buffer.from(pdfBytes);
  }

  private prepareBodyContent(data: CitePdfData): string {
    if (data.bodyText && data.bodyText.trim().length > 10) {
      return data.bodyText.trim();
    }

    const type = (data.docType || 'INF').trim().toUpperCase();

    if (type === 'INF') {
      return `1. ANTECEDENTES
En cumplimiento a las disposiciones administrativas y a los requerimientos institucionales de la gestión, se emite el presente informe técnico para constancia de las actividades desarrolladas en el área de ${data.areaName}.

2. ANÁLISIS TÉCNICO / DESARROLLO
Se procedió a la revisión exhaustiva de los antecedentes y requerimientos vinculados a ${data.subject}. Se verificó el cumplimiento de los estándares operativos y presupuestarios vigentes en el Club Hípico Los Sargentos, garantizando la optimización de los recursos institucionales.

3. CONCLUSIONES Y RECOMENDACIONES
Por lo expuesto, se concluye que las acciones descritas se encuentran enmarcadas en la planificación institucional. Se recomienda autorizar las gestiones pertinentes y proceder con la derivación correspondiente a las instancias correspondientes.`;
    }

    if (type === 'CI') {
      return `Mediante la presente comunicación interna, me dirijo a su autoridad con el objeto de poner en su conocimiento y coordinar las acciones inherentes a: ${data.subject}.

Agradeceré a usted disponer a quien corresponda la atención respectiva a los puntos señalados a fin de continuar con el normal desarrollo de las operaciones de nuestra institución.

Sin otro particular, agradeciendo de antemano su colaboración, saludo a usted muy cordialmente.`;
    }

    if (type === 'INST') {
      return `1. OBJETO
El presente Instructivo tiene por objeto normar y regular de manera obligatoria las directrices operativas relativas a: ${data.subject}.

2. ÁMBITO DE APLICACIÓN
Las disposiciones contenidas en el presente instrumento son de cumplimiento obligatorio para todo el personal dependiente y las unidades del Club Hípico Los Sargentos.

3. DIRECTRICES DE CUMPLIMIENTO
Se instruye a las jefaturas y responsables de área velar por la estricta aplicación de lo dispuesto, debiendo remitir los respaldos y reportes pertinentes conforme a los cronogramas institucionales.`;
    }

    if (type === 'MEM') {
      return `Mediante el presente Memorándum, se comunica formalmente a usted lo concerniente a: ${data.subject}.

Se le encomienda dar estricto cumplimiento a las directrices encomendadas en el marco de sus funciones y atribuciones estatutarias, con el compromiso y la responsabilidad que caracterizan a nuestra institución.`;
    }

    return `Mediante la presente, tengo a bien dirigirme a usted con el propósito de poner en su conocimiento y coordinar institucionalmente lo relativo a: ${data.subject}.

El Club Hípico Los Sargentos reitera su constante predisposición para estrechar los lazos de cooperación interinstitucional y llevar a cabo las acciones necesarias en beneficio mutuo.

Agradeciendo la gentil atención que se sirva prestar a la presente, quedamos atentos a su cordial respuesta.`;
  }

  private wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }
}
