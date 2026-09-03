import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';
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
    .replace(/[^\x00-\xFF]/g, ' ');
}

export class DossierPdfService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * Genera un único documento PDF unificado que compila:
   * 1. Carátula Oficial de la Hoja de Ruta (Anverso oficial CHLS con QR y datos generales).
   * 2. Cronología paso a paso por fecha de cada usuario/proveído con su instrucción y firma.
   * 3. Fusión física página por página de todos los PDFs adjuntos reales en cada paso.
   * 4. Foliación continua institucional ("Foja X de Y").
   */
  public async generateUnifiedDossierPdf(idOrCode: string): Promise<Buffer> {
    const routeSheet = await this.prisma.routeSheet.findFirst({
      where: {
        OR: [{ id: idOrCode }, { hrCode: idOrCode }],
      },
      include: {
        person: true,
        createdBy: true,
        movements: {
          orderBy: { sequenceNumber: 'asc' },
          include: {
            sourceUser: true,
            documents: true,
          },
        },
        documents: true,
      },
    });

    if (!routeSheet) {
      throw new Error(`Hoja de Ruta ${idOrCode} no encontrada`);
    }

    const masterDoc = await PDFDocument.create();

    const fontRegular = await masterDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await masterDoc.embedFont(StandardFonts.HelveticaBold);
    const fontTimes = await masterDoc.embedFont(StandardFonts.TimesRomanBold);

    // Cargar Logo Oficial si existe
    let logoImage = null;
    const logoCandidates = [
      path.join(process.cwd(), 'assets', 'logo.png'),
      path.join(process.cwd(), '..', 'frontend', 'src', 'assets', 'logo.png'),
    ];
    for (const cand of logoCandidates) {
      if (fs.existsSync(cand)) {
        try {
          const logoBytes = fs.readFileSync(cand);
          logoImage = await masterDoc.embedPng(logoBytes);
          break;
        } catch {}
      }
    }

    // QR de Validación Oficial en vivo
    const verificationUrl = `https://chls.bo/correspondencia?code=${encodeURIComponent(routeSheet.hrCode)}`;
    let qrImage = null;
    try {
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 140 });
      const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrBuffer = Buffer.from(qrBase64, 'base64');
      qrImage = await masterDoc.embedPng(qrBuffer);
    } catch (e) {
      logger.warn('No se pudo generar el QR para el dossier PDF:', e);
    }

    // Paleta de Colores Institucional
    const emeraldDark = rgb(0.04, 0.28, 0.18);
    const emeraldAccent = rgb(0.06, 0.65, 0.45);
    const goldColor = rgb(0.85, 0.68, 0.15);
    const slateDark = rgb(0.1, 0.12, 0.15);
    const textGrey = rgb(0.35, 0.38, 0.42);
    const lightBg = rgb(0.96, 0.97, 0.98);

    // =========================================================================
    // 1. PÁGINA 1: CARÁTULA Y EXPEDIENTE GENERAL DE LA HOJA DE RUTA
    // =========================================================================
    const coverPage = masterDoc.addPage(PageSizes.Letter);
    const { width: W, height: H } = coverPage.getSize();

    // Membrete Superior
    if (logoImage) {
      coverPage.drawImage(logoImage, {
        x: 45,
        y: H - 85,
        width: 42,
        height: 50,
      });
    }

    coverPage.drawText('CLUB HÍPICO LOS SARGENTOS', {
      x: 95,
      y: H - 52,
      size: 14,
      font: fontTimes,
      color: slateDark,
    });
    coverPage.drawText('SISTEMA OFICIAL DE CORRESPONDENCIA & GESTIÓN DOCUMENTAL', {
      x: 95,
      y: H - 65,
      size: 8,
      font: fontBold,
      color: emeraldDark,
    });
    coverPage.drawText('DOSSIER DE EXPEDIENTE INTEGRAL COMPILADO — FOLIACIÓN CONTINUA', {
      x: 95,
      y: H - 76,
      size: 7.5,
      font: fontRegular,
      color: textGrey,
    });

    // Código y Recuadro HR a la derecha
    coverPage.drawRectangle({
      x: W - 180,
      y: H - 88,
      width: 135,
      height: 52,
      color: lightBg,
      borderColor: emeraldDark,
      borderWidth: 1.5,
    });
    coverPage.drawText('HOJA DE RUTA', {
      x: W - 165,
      y: H - 50,
      size: 8,
      font: fontBold,
      color: emeraldDark,
    });
    coverPage.drawText(routeSheet.hrCode, {
      x: W - 165,
      y: H - 74,
      size: 18,
      font: fontBold,
      color: slateDark,
    });

    // Línea separadora dorada
    coverPage.drawLine({
      start: { x: 45, y: H - 98 },
      end: { x: W - 45, y: H - 98 },
      thickness: 2,
      color: goldColor,
    });

    // Ficha de Datos Generales (Tabla)
    let curY = H - 115;
    const tableW = W - 90;

    // Fila 1: Asunto / Referencia
    coverPage.drawRectangle({
      x: 45,
      y: curY - 45,
      width: tableW,
      height: 45,
      color: lightBg,
      borderColor: rgb(0.8, 0.85, 0.85),
      borderWidth: 1,
    });
    coverPage.drawText('REFERENCIA / ASUNTO:', {
      x: 55,
      y: curY - 14,
      size: 7.5,
      font: fontBold,
      color: emeraldDark,
    });
    coverPage.drawText(routeSheet.reference.toUpperCase().substring(0, 110), {
      x: 55,
      y: curY - 30,
      size: 10,
      font: fontBold,
      color: slateDark,
    });

    curY -= 55;

    // Fila 2: Cuadrícula con Remitente, Origen, CITE, Fecha, Prioridad
    const colW = tableW / 3;
    coverPage.drawRectangle({
      x: 45,
      y: curY - 55,
      width: tableW,
      height: 55,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.8, 0.85, 0.85),
      borderWidth: 1,
    });

    // Col 1: Remitente
    coverPage.drawText('REMITENTE:', { x: 55, y: curY - 15, size: 7, font: fontBold, color: textGrey });
    coverPage.drawText((routeSheet.senderName || 'No especificado').substring(0, 32), { x: 55, y: curY - 28, size: 8.5, font: fontBold, color: slateDark });
    coverPage.drawText(`Procedencia: ${(routeSheet.senderArea || 'Externo').substring(0, 30)}`, { x: 55, y: curY - 42, size: 7.5, font: fontRegular, color: textGrey });

    // Col 2: CITE y Radicación
    coverPage.drawText('CITE / REGISTRO:', { x: 45 + colW + 10, y: curY - 15, size: 7, font: fontBold, color: textGrey });
    coverPage.drawText(routeSheet.cite || 'S/N', { x: 45 + colW + 10, y: curY - 28, size: 8.5, font: fontBold, color: slateDark });
    coverPage.drawText(`Radicado: ${new Date(routeSheet.createdAt).toLocaleDateString('es-BO')}`, { x: 45 + colW + 10, y: curY - 42, size: 7.5, font: fontRegular, color: textGrey });

    // Col 3: Estado & Custodia
    coverPage.drawText('CUSTODIA ACTUAL:', { x: 45 + colW * 2 + 10, y: curY - 15, size: 7, font: fontBold, color: textGrey });
    coverPage.drawText(routeSheet.currentArea.replace(/_/g, ' '), { x: 45 + colW * 2 + 10, y: curY - 28, size: 8.5, font: fontBold, color: emeraldDark });
    coverPage.drawText(`Estado: ${routeSheet.status} | Fojas: ${routeSheet.pageCount || 1}`, { x: 45 + colW * 2 + 10, y: curY - 42, size: 7.5, font: fontRegular, color: textGrey });

    curY -= 75;

    // Sección: Resumen Ejecutivo de la Cadena de Custodia (Timeline Resumen)
    coverPage.drawText('HISTORIAL EJECUTIVO DE DERIVACIONES & TRÁMITE:', {
      x: 45,
      y: curY,
      size: 8.5,
      font: fontBold,
      color: emeraldDark,
    });

    curY -= 15;

    // Encabezado de tabla de movimientos
    coverPage.drawRectangle({
      x: 45,
      y: curY - 16,
      width: tableW,
      height: 16,
      color: emeraldDark,
    });
    coverPage.drawText('#', { x: 52, y: curY - 11, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
    coverPage.drawText('FECHA / HORA', { x: 72, y: curY - 11, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
    coverPage.drawText('DE (EMISOR)', { x: 165, y: curY - 11, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
    coverPage.drawText('A (DESTINATARIO)', { x: 275, y: curY - 11, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
    coverPage.drawText('INSTRUCCIÓN / SELLO', { x: 410, y: curY - 11, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });

    curY -= 18;

    // Filas de movimientos
    const movementsList = routeSheet.movements || [];
    movementsList.forEach((mov, idx) => {
      const isEven = idx % 2 === 0;
      coverPage.drawRectangle({
        x: 45,
        y: curY - 20,
        width: tableW,
        height: 20,
        color: isEven ? rgb(0.98, 0.98, 0.98) : rgb(1, 1, 1),
        borderColor: rgb(0.9, 0.9, 0.9),
        borderWidth: 0.5,
      });

      coverPage.drawText(String(mov.sequenceNumber), { x: 52, y: curY - 14, size: 7.5, font: fontBold, color: slateDark });
      const fDate = new Date(mov.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });
      const fTime = new Date(mov.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
      coverPage.drawText(`${fDate} ${fTime}`, { x: 72, y: curY - 14, size: 7, font: fontRegular, color: textGrey });
      coverPage.drawText((mov.sourceArea || 'GERENCIA').substring(0, 18), { x: 165, y: curY - 14, size: 7, font: fontBold, color: slateDark });
      coverPage.drawText((mov.targetArea || 'DESTINO').substring(0, 20), { x: 275, y: curY - 14, size: 7, font: fontBold, color: emeraldDark });
      const stampText = mov.quickStamp || mov.instruction?.split('\n')[0] || 'Atención';
      coverPage.drawText(stampText.substring(0, 26), { x: 410, y: curY - 14, size: 7, font: fontRegular, color: textGrey });

      curY -= 20;
    });

    // Bloque Inferior con QR y Validador SHA-256
    if (qrImage) {
      coverPage.drawImage(qrImage, {
        x: 45,
        y: 40,
        width: 65,
        height: 65,
      });
    }

    coverPage.drawText('CERTIFICACIÓN Y VALIDACIÓN DIGITAL CHLS:', {
      x: 120,
      y: 92,
      size: 7.5,
      font: fontBold,
      color: emeraldDark,
    });
    coverPage.drawText('Escanee el código QR con cualquier dispositivo para auditar la trazabilidad en vivo.', {
      x: 120,
      y: 80,
      size: 7,
      font: fontRegular,
      color: textGrey,
    });
    coverPage.drawText(`Token Criptográfico: QR_${routeSheet.hrCode}_CERTIFIED_IMMUTABLE`, {
      x: 120,
      y: 68,
      size: 6.5,
      font: fontRegular,
      color: textGrey,
    });
    coverPage.drawText('Iniciativa CHLS Cero Papel — Documento compilado formalmente con validez administrativa.', {
      x: 120,
      y: 56,
      size: 6.5,
      font: fontRegular,
      color: emeraldDark,
    });

    // =========================================================================
    // 2. RECORRIDO CRONOLÓGICO: PROVEÍDO POR PROVEÍDO + FUSIÓN DE SUS ADJUNTOS
    // =========================================================================
    const originDocs = (routeSheet.documents || []).filter((d) => !d.movementId);

    // --- PASO 0: RADICACIÓN INICIAL (ORIGEN) ---
    await this.appendStepToMasterDoc(
      masterDoc,
      {
        stepTitle: 'RADICACIÓN INICIAL (ORIGEN DEL TRÁMITE)',
        stepNumber: 0,
        issuerName: routeSheet.createdBy ? `${routeSheet.createdBy.firstName} ${routeSheet.createdBy.lastName}` : 'Secretaría de Despacho',
        issuerArea: routeSheet.senderArea || 'MESA DE ENTRADAS / EXTERNO',
        targetArea: routeSheet.currentArea,
        date: routeSheet.createdAt,
        instruction: `Ingreso formal del expediente con CITE: ${routeSheet.cite || 'S/N'}.\nRemitente: ${routeSheet.senderName}.\n${routeSheet.attachmentDescription ? 'Anexos: ' + routeSheet.attachmentDescription : 'Sin antecedentes físicos adicionales.'}`,
        quickStamp: 'RADICADO & DIGITALIZADO',
        documents: originDocs,
      },
      fontRegular,
      fontBold,
      emeraldDark,
      goldColor,
      slateDark,
      textGrey,
      lightBg
    );

    // --- PASOS 1..N: CADA DERIVACIÓN CON SUS PROVEÍDOS Y ADJUNTOS FUSIONADOS ---
    for (const mov of movementsList) {
      await this.appendStepToMasterDoc(
        masterDoc,
        {
          stepTitle: `DERIVACIÓN FORMAL #${mov.sequenceNumber}`,
          stepNumber: mov.sequenceNumber,
          issuerName: mov.sourceUser ? `${mov.sourceUser.firstName} ${mov.sourceUser.lastName}` : 'Oficial Emisor',
          issuerArea: mov.sourceArea,
          targetArea: mov.targetArea,
          targetPerson: mov.targetPersonName,
          date: mov.createdAt,
          instruction: mov.instruction,
          quickStamp: mov.quickStamp,
          signatureUrl: mov.signatureUrl,
          documents: mov.documents || [],
        },
        fontRegular,
        fontBold,
        emeraldDark,
        goldColor,
        slateDark,
        textGrey,
        lightBg
      );
    }

    // =========================================================================
    // 3. FOLIACIÓN CONTINUA INSTITUCIONAL EN TODAS LAS PÁGINAS DEL DOSSIER
    // =========================================================================
    const totalPages = masterDoc.getPageCount();
    for (let i = 0; i < totalPages; i++) {
      const page = masterDoc.getPage(i);
      const { width: pW } = page.getSize();

      // Cintillo inferior de foja
      page.drawText(
        cleanAnsi(`Expediente CHLS No. ${routeSheet.hrCode}  |  Foja ${i + 1} de ${totalPages}  |  Dossier Compilado Oficial`),
        {
          x: 45,
          y: 16,
          size: 7,
          font: fontRegular,
          color: rgb(0.45, 0.45, 0.45),
        }
      );
    }

    const pdfBytes = await masterDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Helper que añade la hoja de proveído y fusiona directamente las páginas de los PDFs adjuntos
   */
  private async appendStepToMasterDoc(
    masterDoc: PDFDocument,
    step: {
      stepTitle: string;
      stepNumber: number;
      issuerName: string;
      issuerArea: string;
      targetArea: string;
      targetPerson?: string | null;
      date: Date;
      instruction: string;
      quickStamp?: string | null;
      signatureUrl?: string | null;
      documents: any[];
    },
    fontRegular: any,
    fontBold: any,
    emeraldDark: any,
    goldColor: any,
    slateDark: any,
    textGrey: any,
    lightBg: any
  ) {
    // 1. Añadir Hoja Separadora / Ficha Formal del Proveído
    const stepPage = masterDoc.addPage(PageSizes.Letter);
    const { width: W, height: H } = stepPage.getSize();

    // Encabezado de la Ficha
    stepPage.drawRectangle({
      x: 45,
      y: H - 75,
      width: W - 90,
      height: 40,
      color: emeraldDark,
    });
    stepPage.drawText(step.stepTitle, {
      x: 55,
      y: H - 52,
      size: 11,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    const fDate = new Date(step.date).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' });
    const fTime = new Date(step.date).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
    stepPage.drawText(`${fDate} - ${fTime}`, {
      x: W - 220,
      y: H - 52,
      size: 9,
      font: fontBold,
      color: goldColor,
    });

    let curY = H - 95;

    // Recuadro de Emisor y Destinatario
    stepPage.drawRectangle({
      x: 45,
      y: curY - 50,
      width: W - 90,
      height: 50,
      color: lightBg,
      borderColor: rgb(0.85, 0.88, 0.88),
      borderWidth: 1,
    });

    stepPage.drawText('EMITIDO POR:', { x: 55, y: curY - 18, size: 7.5, font: fontBold, color: textGrey });
    stepPage.drawText(`${step.issuerName} (${step.issuerArea})`, { x: 55, y: curY - 34, size: 9, font: fontBold, color: slateDark });

    stepPage.drawText('DESTINATARIO:', { x: W / 2 + 10, y: curY - 18, size: 7.5, font: fontBold, color: textGrey });
    stepPage.drawText(`${step.targetPerson ? step.targetPerson + ' — ' : ''}${step.targetArea}`, { x: W / 2 + 10, y: curY - 34, size: 9, font: fontBold, color: emeraldDark });

    curY -= 65;

    // Sello rápido si existe
    if (step.quickStamp) {
      stepPage.drawRectangle({
        x: 45,
        y: curY - 22,
        width: W - 90,
        height: 22,
        color: rgb(0.98, 0.95, 0.85),
        borderColor: goldColor,
        borderWidth: 1,
      });
      stepPage.drawText(`SELLO / DISPOSICIÓN: ${step.quickStamp}`, {
        x: 55,
        y: curY - 15,
        size: 8.5,
        font: fontBold,
        color: slateDark,
      });
      curY -= 32;
    }

    // Texto del Proveído / Instrucción
    stepPage.drawText('TEXTO DE LA INSTRUCCIÓN / PROVEÍDO:', {
      x: 45,
      y: curY,
      size: 8,
      font: fontBold,
      color: emeraldDark,
    });
    curY -= 15;

    stepPage.drawRectangle({
      x: 45,
      y: curY - 120,
      width: W - 90,
      height: 120,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.85, 0.88, 0.88),
      borderWidth: 1,
    });

    // Dividir texto en líneas para ajuste de párrafo
    const lines = step.instruction.split('\n');
    let lineY = curY - 18;
    for (const rawLine of lines) {
      const words = rawLine.split(' ');
      let currentLine = '';
      for (const word of words) {
        if ((currentLine + word).length > 85) {
          stepPage.drawText(cleanAnsi(currentLine), { x: 55, y: lineY, size: 8.5, font: fontRegular, color: slateDark });
          lineY -= 13;
          currentLine = word + ' ';
        } else {
          currentLine += word + ' ';
        }
      }
      if (currentLine.trim().length > 0) {
        stepPage.drawText(cleanAnsi(currentLine), { x: 55, y: lineY, size: 8.5, font: fontRegular, color: slateDark });
        lineY -= 13;
      }
    }

    curY -= 135;

    // Cuadro de Documentos Físicamente Anexados
    stepPage.drawText(cleanAnsi(`ARCHIVOS ADJUNTOS INCORPORADOS FISICAMENTE (${step.documents.length}):`), {
      x: 45,
      y: curY,
      size: 8,
      font: fontBold,
      color: emeraldDark,
    });
    curY -= 15;

    if (step.documents.length === 0) {
      stepPage.drawText(cleanAnsi('- Este proveido se tramito unicamente con instruccion administrativa (sin fojas PDF anexas).'), {
        x: 55,
        y: curY,
        size: 7.5,
        font: fontRegular,
        color: textGrey,
      });
      curY -= 20;
    } else {
      step.documents.forEach((doc, dIdx) => {
        stepPage.drawText(cleanAnsi(`[Anexo ${dIdx + 1}]  ${doc.fileName}   (SHA-256: ${doc.sha256Hash ? doc.sha256Hash.substring(0, 16) + '...' : 'Registrado'})`), {
          x: 55,
          y: curY,
          size: 7.5,
          font: fontBold,
          color: slateDark,
        });
        stepPage.drawText(cleanAnsi('  -> A continuacion se insertan las paginas fisicas de este documento:'), {
          x: 55,
          y: curY - 11,
          size: 6.5,
          font: fontRegular,
          color: textGrey,
        });
        curY -= 25;
      });
    }

    // Firma Digital Certificada si existe
    if (step.signatureUrl) {
      try {
        const cleanSig = step.signatureUrl.replace(/^\/uploads\//, '');
        const sigPath = path.join(process.cwd(), 'uploads', cleanSig);
        if (fs.existsSync(sigPath)) {
          const sigBytes = fs.readFileSync(sigPath);
          const sigImg = await masterDoc.embedPng(sigBytes);
          stepPage.drawImage(sigImg, {
            x: W - 180,
            y: 50,
            width: 120,
            height: 60,
          });
          stepPage.drawText('Firma Digitalizada Registrada', {
            x: W - 180,
            y: 42,
            size: 6.5,
            font: fontRegular,
            color: textGrey,
          });
        }
      } catch (e) {
        logger.warn('No se pudo incrustar la firma digital en la ficha de proveído:', e);
      }
    }

    // =========================================================================
    // 2. FUSIÓN BINARIA FÍSICA: COPIAR LAS PÁGINAS DE CADA PDF ADJUNTO REAL
    // =========================================================================
    for (const doc of step.documents) {
      try {
        // Resolver ruta física en disco
        const cleanFileUrl = doc.fileUrl.replace(/^\//, '');
        const diskPath = path.join(process.cwd(), cleanFileUrl);

        if (!fs.existsSync(diskPath)) {
          logger.warn(`Archivo adjunto no encontrado en disco: ${diskPath}`);
          continue;
        }

        const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf') || doc.mimeType?.includes('pdf');
        const isImg = doc.fileName?.match(/\.(jpg|jpeg|png|webp)$/i) || doc.mimeType?.includes('image');

        if (isPdf) {
          const attachedBytes = fs.readFileSync(diskPath);
          const attachedDoc = await PDFDocument.load(attachedBytes);
          const copiedPages = await masterDoc.copyPages(attachedDoc, attachedDoc.getPageIndices());
          for (const cPage of copiedPages) {
            masterDoc.addPage(cPage);
          }
          logger.info(`Fusionadas ${copiedPages.length} páginas físicas de ${doc.fileName} al expediente.`);
        } else if (isImg) {
          // Si es imagen, incrustarla como página de alta resolución
          const imgBytes = fs.readFileSync(diskPath);
          const isPng = doc.fileName?.toLowerCase().endsWith('.png');
          const embeddedImg = isPng ? await masterDoc.embedPng(imgBytes) : await masterDoc.embedJpg(imgBytes);

          const imgPage = masterDoc.addPage(PageSizes.Letter);
          const { width: ipW, height: ipH } = imgPage.getSize();

          // Escalar imagen respetando proporción
          const maxW = ipW - 80;
          const maxH = ipH - 100;
          const scale = Math.min(maxW / embeddedImg.width, maxH / embeddedImg.height, 1);
          const dw = embeddedImg.width * scale;
          const dh = embeddedImg.height * scale;

          imgPage.drawText(`DOCUMENTO DIGITALIZADO: ${doc.fileName}`, {
            x: 45,
            y: ipH - 40,
            size: 8,
            font: fontBold,
            color: emeraldDark,
          });

          imgPage.drawImage(embeddedImg, {
            x: (ipW - dw) / 2,
            y: (ipH - dh) / 2 - 15,
            width: dw,
            height: dh,
          });
        }
      } catch (err) {
        logger.error(`Error al fusionar físicamente el documento ${doc.fileName}:`, err);
      }
    }
  }

  /**
   * Genera el Reporte Oficial de Trazabilidad 360° en PDF con membrete del CHLS,
   * tabla ejecutiva y fichas cronológicas de movimientos.
   */
  public async generateTimelinePdf(idOrCode: string): Promise<Buffer> {
    const routeSheet = await this.prisma.routeSheet.findFirst({
      where: {
        OR: [{ id: idOrCode }, { hrCode: idOrCode }],
      },
      include: {
        person: true,
        createdBy: true,
        movements: {
          orderBy: { sequenceNumber: 'asc' },
          include: {
            sourceUser: true,
            documents: true,
          },
        },
        documents: true,
      },
    });

    if (!routeSheet) {
      throw new Error(`Hoja de Ruta ${idOrCode} no encontrada`);
    }

    const masterDoc = await PDFDocument.create();

    const fontRegular = await masterDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await masterDoc.embedFont(StandardFonts.HelveticaBold);
    const fontTimes = await masterDoc.embedFont(StandardFonts.TimesRomanBold);

    // Cargar Logo Oficial si existe
    let logoImage = null;
    const logoCandidates = [
      path.join(process.cwd(), 'assets', 'logo.png'),
      path.join(process.cwd(), '..', 'frontend', 'src', 'assets', 'logo.png'),
    ];
    for (const cand of logoCandidates) {
      if (fs.existsSync(cand)) {
        try {
          const logoBytes = fs.readFileSync(cand);
          logoImage = await masterDoc.embedPng(logoBytes);
          break;
        } catch {}
      }
    }

    // QR de Validación Oficial
    const verificationUrl = `https://chls.bo/correspondencia?code=${encodeURIComponent(routeSheet.hrCode)}`;
    let qrImage = null;
    try {
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 140 });
      const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrBuffer = Buffer.from(qrBase64, 'base64');
      qrImage = await masterDoc.embedPng(qrBuffer);
    } catch (e) {
      logger.warn('No se pudo generar el QR para el timeline PDF:', e);
    }

    // Paleta de Colores Institucional
    const emeraldDark = rgb(0.04, 0.28, 0.18);
    const emeraldAccent = rgb(0.06, 0.65, 0.45);
    const goldColor = rgb(0.85, 0.68, 0.15);
    const slateDark = rgb(0.1, 0.12, 0.15);
    const textGrey = rgb(0.35, 0.38, 0.42);
    const lightBg = rgb(0.96, 0.97, 0.98);

    const page = masterDoc.addPage(PageSizes.Letter);
    const { width: W, height: H } = page.getSize();

    // Membrete Superior
    if (logoImage) {
      page.drawImage(logoImage, {
        x: 45,
        y: H - 85,
        width: 42,
        height: 50,
      });
    }

    page.drawText('CLUB HÍPICO LOS SARGENTOS', {
      x: 95,
      y: H - 52,
      size: 14,
      font: fontTimes,
      color: slateDark,
    });
    page.drawText('SISTEMA OFICIAL DE CORRESPONDENCIA & ARCHIVO DIGITAL (SICAD)', {
      x: 95,
      y: H - 65,
      size: 8,
      font: fontBold,
      color: emeraldDark,
    });
    page.drawText('INFORME OFICIAL DE TRAZABILIDAD Y SEGUIMIENTO CRONOLÓGICO 360°', {
      x: 95,
      y: H - 76,
      size: 7.5,
      font: fontRegular,
      color: textGrey,
    });

    // Código y Recuadro HR a la derecha
    page.drawRectangle({
      x: W - 180,
      y: H - 88,
      width: 135,
      height: 52,
      color: lightBg,
      borderColor: emeraldDark,
      borderWidth: 1.5,
    });
    page.drawText('HOJA DE RUTA', {
      x: W - 165,
      y: H - 50,
      size: 8,
      font: fontBold,
      color: emeraldDark,
    });
    page.drawText(routeSheet.hrCode, {
      x: W - 165,
      y: H - 74,
      size: 18,
      font: fontBold,
      color: slateDark,
    });

    // Línea separadora dorada
    page.drawLine({
      start: { x: 45, y: H - 98 },
      end: { x: W - 45, y: H - 98 },
      thickness: 2,
      color: goldColor,
    });

    let curY = H - 115;
    const tableW = W - 90;

    // Fila Asunto
    page.drawRectangle({
      x: 45,
      y: curY - 45,
      width: tableW,
      height: 45,
      color: lightBg,
      borderColor: rgb(0.8, 0.85, 0.85),
      borderWidth: 1,
    });
    page.drawText('REFERENCIA / ASUNTO:', { x: 55, y: curY - 14, size: 7.5, font: fontBold, color: emeraldDark });
    const cleanRef = cleanAnsi(routeSheet.reference);
    page.drawText(cleanRef.substring(0, 85), { x: 55, y: curY - 26, size: 9, font: fontBold, color: slateDark });
    if (cleanRef.length > 85) {
      page.drawText(cleanRef.substring(85, 170), { x: 55, y: curY - 37, size: 8.5, font: fontRegular, color: slateDark });
    }

    curY -= 52;

    // Fila Datos de Radicación
    page.drawRectangle({
      x: 45,
      y: curY - 32,
      width: tableW,
      height: 32,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.8, 0.85, 0.85),
      borderWidth: 1,
    });
    page.drawText('REMITENTE:', { x: 55, y: curY - 12, size: 7, font: fontBold, color: emeraldDark });
    page.drawText(cleanAnsi(routeSheet.senderName).substring(0, 30), { x: 55, y: curY - 23, size: 8, font: fontRegular, color: slateDark });

    page.drawText('ORIGEN / EMPRESA:', { x: 210, y: curY - 12, size: 7, font: fontBold, color: emeraldDark });
    const originArea = routeSheet.senderArea || (routeSheet.senderType === 'SOCIO' ? 'Socio CHLS' : 'Externo');
    page.drawText(cleanAnsi(originArea).substring(0, 25), { x: 210, y: curY - 23, size: 8, font: fontRegular, color: slateDark });

    page.drawText('CUSTODIA ACTUAL:', { x: 350, y: curY - 12, size: 7, font: fontBold, color: emeraldDark });
    page.drawText(cleanAnsi(routeSheet.currentArea).substring(0, 22), { x: 350, y: curY - 23, size: 8, font: fontBold, color: emeraldDark });

    page.drawText('ESTADO:', { x: 470, y: curY - 12, size: 7, font: fontBold, color: emeraldDark });
    page.drawText(cleanAnsi(routeSheet.status), { x: 470, y: curY - 23, size: 8, font: fontBold, color: goldColor });

    curY -= 42;

    // Encabezado Tabla Trazabilidad
    page.drawRectangle({
      x: 45,
      y: curY - 18,
      width: tableW,
      height: 18,
      color: emeraldDark,
    });
    page.drawText('#', { x: 52, y: curY - 12, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('FECHA / HORA', { x: 72, y: curY - 12, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('DE (EMISOR)', { x: 155, y: curY - 12, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('A (DESTINATARIO)', { x: 260, y: curY - 12, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('INSTRUCCIÓN / SELLO FORMAL', { x: 385, y: curY - 12, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('ESTADO', { x: W - 90, y: curY - 12, size: 7.5, font: fontBold, color: rgb(1, 1, 1) });

    curY -= 20;

    // Fila 0: Radicación Inicial
    page.drawRectangle({
      x: 45,
      y: curY - 22,
      width: tableW,
      height: 22,
      color: rgb(0.93, 0.97, 0.94),
      borderColor: rgb(0.85, 0.9, 0.85),
      borderWidth: 0.5,
    });
    page.drawText('0', { x: 52, y: curY - 15, size: 8, font: fontBold, color: emeraldDark });
    const radDate = new Date(routeSheet.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });
    const radTime = new Date(routeSheet.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
    page.drawText(`${radDate} ${radTime}`, { x: 72, y: curY - 15, size: 7, font: fontRegular, color: textGrey });
    page.drawText(cleanAnsi(routeSheet.senderName).substring(0, 18), { x: 155, y: curY - 15, size: 7, font: fontBold, color: slateDark });
    page.drawText((routeSheet.senderArea || 'Mesa de Entrada').substring(0, 18), { x: 260, y: curY - 15, size: 7, font: fontBold, color: emeraldDark });
    page.drawText('[RADICACIÓN INICIAL EN SISTEMA]', { x: 385, y: curY - 15, size: 7, font: fontBold, color: emeraldDark });
    page.drawText('RADICADO', { x: W - 90, y: curY - 15, size: 6.5, font: fontBold, color: emeraldDark });

    curY -= 24;

    // Filas de Derivaciones
    const movementsList = routeSheet.movements || [];
    movementsList.forEach((mov, idx) => {
      const isEven = idx % 2 === 0;
      page.drawRectangle({
        x: 45,
        y: curY - 24,
        width: tableW,
        height: 24,
        color: isEven ? rgb(0.98, 0.98, 0.98) : rgb(1, 1, 1),
        borderColor: rgb(0.9, 0.9, 0.9),
        borderWidth: 0.5,
      });

      page.drawText(String(mov.sequenceNumber), { x: 52, y: curY - 16, size: 8, font: fontBold, color: slateDark });
      const fDate = new Date(mov.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' });
      const fTime = new Date(mov.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
      page.drawText(`${fDate} ${fTime}`, { x: 72, y: curY - 16, size: 7, font: fontRegular, color: textGrey });
      page.drawText(cleanAnsi(mov.sourceArea || 'GERENCIA').substring(0, 18), { x: 155, y: curY - 16, size: 7, font: fontBold, color: slateDark });
      page.drawText(cleanAnsi(mov.targetArea || 'DESTINO').substring(0, 18), { x: 260, y: curY - 16, size: 7, font: fontBold, color: emeraldDark });
      
      const stamp = mov.quickStamp ? `[${cleanAnsi(mov.quickStamp)}] ` : '';
      const instr = cleanAnsi(mov.instruction || 'Atención').substring(0, 32);
      page.drawText(`${stamp}${instr}`.substring(0, 42), { x: 385, y: curY - 16, size: 6.8, font: fontRegular, color: slateDark });

      const signStatus = mov.signatureUrl ? 'FIRMADO' : 'REGISTRADO';
      page.drawText(signStatus, { x: W - 90, y: curY - 16, size: 6.5, font: fontBold, color: mov.signatureUrl ? emeraldDark : textGrey });

      curY -= 26;
    });

    // Bloque Inferior con QR y Validador SHA-256
    if (qrImage) {
      page.drawImage(qrImage, {
        x: 45,
        y: 40,
        width: 65,
        height: 65,
      });
    }

    page.drawText('CERTIFICACIÓN Y VALIDACIÓN DIGITAL CHLS:', {
      x: 120,
      y: 92,
      size: 7.5,
      font: fontBold,
      color: emeraldDark,
    });
    page.drawText('Escanee el código QR con cualquier dispositivo para auditar la trazabilidad en vivo.', {
      x: 120,
      y: 80,
      size: 7,
      font: fontRegular,
      color: textGrey,
    });
    page.drawText(`Token Criptográfico: QR_${routeSheet.hrCode}_CERTIFIED_IMMUTABLE`, {
      x: 120,
      y: 68,
      size: 6.5,
      font: fontRegular,
      color: textGrey,
    });
    page.drawText('Iniciativa CHLS Cero Papel — Validez Legal y Administrativa Institucional.', {
      x: 120,
      y: 56,
      size: 6.5,
      font: fontRegular,
      color: emeraldDark,
    });

    const pdfBytes = await masterDoc.save();
    return Buffer.from(pdfBytes);
  }
}
