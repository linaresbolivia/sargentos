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
    .replace(/[✓✔]/g, '[OK]')
    .replace(/[🔒🔐📎📌🏢🏷️💼]/g, '')
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

    // Obtener datos del usuario que archivó si aplica
    let archivedByUser: any = null;
    if (routeSheet.archivedById) {
      try {
        archivedByUser = await this.prisma.user.findUnique({
          where: { id: routeSheet.archivedById },
          select: { firstName: true, lastName: true, email: true },
        });
      } catch {}
    }

    // =========================================================================
    // 1. BLOQUE PRINCIPAL: HOJA DE RUTA OFICIAL CHLS (ANVERSO & REVERSO)
    // En el compendio final del expediente completo, DEBE ir al principio la Hoja de Ruta
    // oficial exactamente idéntica al formato impreso del Club (Anverso y Reverso).
    // =========================================================================
    await this.appendOfficialRouteSheetPages(
      masterDoc,
      routeSheet,
      archivedByUser,
      fontRegular,
      fontBold,
      fontTimes,
      logoImage,
      qrImage,
      emeraldDark,
      emeraldAccent,
      goldColor,
      slateDark,
      textGrey,
      lightBg
    );

    // =========================================================================
    // 2. BLOQUE ADJUNTOS: ANEXOS Y EXPEDIENTE DIGITALIZADO (DESPUÉS DE HOJA DE RUTA)
    // =========================================================================
    const originDocs = (routeSheet.documents || []).filter((d) => !d.movementId);
    const movementsList = routeSheet.movements || [];
    const seenDocIds = new Set<string>();
    const allDossierDocs: Array<{
      doc: any;
      originLabel: string;
      sequenceNumber: number;
    }> = [];

    // Documentos adjuntados en radicación inicial
    for (const doc of originDocs) {
      if (!seenDocIds.has(doc.id)) {
        seenDocIds.add(doc.id);
        allDossierDocs.push({
          doc,
          originLabel: 'Radicación Inicial (Origen)',
          sequenceNumber: 0,
        });
      }
    }

    // Documentos adjuntados en cada derivación (en estricto orden cronológico)
    for (const mov of movementsList) {
      const movDocs = (mov.documents && mov.documents.length > 0)
        ? mov.documents
        : (routeSheet.documents || []).filter((d) => d.movementId === mov.id);

      for (const doc of movDocs) {
        if (!seenDocIds.has(doc.id)) {
          seenDocIds.add(doc.id);
          allDossierDocs.push({
            doc,
            originLabel: `Derivación #${mov.sequenceNumber} (${cleanAnsi(mov.sourceArea || 'Emisor')} -> ${cleanAnsi(mov.targetArea || 'Destino')})`,
            sequenceNumber: mov.sequenceNumber,
          });
        }
      }
    }

    if (allDossierDocs.length > 0) {
      // Carátula e inventario de fojas físicas de anexos
      await this.appendAnnexesCoverPage(
        masterDoc,
        routeSheet.hrCode,
        allDossierDocs,
        fontRegular,
        fontBold,
        fontTimes,
        logoImage,
        emeraldDark,
        goldColor,
        slateDark,
        textGrey,
        lightBg
      );

      // Fusión física página por página de los archivos adjuntos
      await this.mergeAttachedDocuments(
        masterDoc,
        allDossierDocs,
        fontBold,
        emeraldDark
      );
    }

    // =========================================================================
    // 4. FOLIACIÓN CONTINUA INSTITUCIONAL EN TODAS LAS PÁGINAS DEL DOSSIER
    // =========================================================================
    const totalPages = masterDoc.getPageCount();
    for (let i = 0; i < totalPages; i++) {
      const page = masterDoc.getPage(i);
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
   * Renderiza las páginas oficiales de la Hoja de Ruta (Anverso y Reverso) exactamente
   * idénticas al formato oficial impreso y normado por el Club Hípico Los Sargentos.
   */
  private async appendOfficialRouteSheetPages(
    masterDoc: PDFDocument,
    routeSheet: any,
    archivedByUser: any,
    fontRegular: any,
    fontBold: any,
    fontTimes: any,
    logoImage: any,
    qrImage: any,
    emeraldDark: any,
    emeraldAccent: any,
    goldColor: any,
    slateDark: any,
    textGrey: any,
    lightBg: any
  ) {
    const formatChlsDate = (dateStr?: string | null | Date) => {
      if (!dateStr) return '__ / __ / ____';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '__ / __ / ____';
      const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
      const day = String(d.getDate()).padStart(2, '0');
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    };

    const formatChlsTime = (dateStr?: string | null | Date) => {
      if (!dateStr) return '__ : __';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '__ : __';
      return d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const wrapLines = (text: string, font: any, size: number, maxWidth: number): string[] => {
      const clean = cleanAnsi(text).trim();
      if (!clean) return [];
      const lines: string[] = [];
      const paragraphs = clean.split('\n');

      for (const para of paragraphs) {
        const words = para.split(/\s+/);
        let cur = '';
        for (const w of words) {
          const testLine = cur ? `${cur} ${w}` : w;
          const wLen = font.widthOfTextAtSize(testLine, size);
          if (wLen <= maxWidth) {
            cur = testLine;
          } else {
            if (cur) lines.push(cur);
            cur = w;
          }
        }
        if (cur) lines.push(cur);
      }
      return lines;
    };

    const movements = routeSheet.movements || [];
    const documents = routeSheet.documents || [];
    const frontSlots = Array.from({ length: 4 }, (_, i) => movements[i] || null);
    const backSlots = Array.from({ length: 4 }, (_, i) => movements[i + 4] || null);

    // =========================================================================
    // PÁGINA 1: ANVERSO DE LA HOJA DE RUTA (CARTA)
    // =========================================================================
    const frontPage = masterDoc.addPage(PageSizes.Letter);
    const { width: W, height: H } = frontPage.getSize();
    const startX = 28;
    const tableW = 556;

    // 1. Membrete Superior Oficial
    if (logoImage) {
      frontPage.drawImage(logoImage, {
        x: 30,
        y: 720,
        width: 40,
        height: 46,
      });
    }

    frontPage.drawText('CLUB HÍPICO', {
      x: 76,
      y: 752,
      size: 9.5,
      font: fontBold,
      color: slateDark,
    });
    frontPage.drawText('LOS SARGENTOS', {
      x: 76,
      y: 738,
      size: 13.5,
      font: fontTimes,
      color: slateDark,
    });
    frontPage.drawText('Sistema Oficial de Correspondencia & Gestión Documental', {
      x: 76,
      y: 727,
      size: 6.5,
      font: fontBold,
      color: textGrey,
    });

    // Badge Central "HOJA DE RUTA - ANVERSO (ORIGINAL)"
    frontPage.drawRectangle({
      x: 232,
      y: 732,
      width: 148,
      height: 22,
      color: rgb(0.11, 0.18, 0.14),
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });
    frontPage.drawText('HOJA DE RUTA', {
      x: 260,
      y: 738,
      size: 11,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    frontPage.drawText('ANVERSO (ORIGINAL)', {
      x: 255,
      y: 723,
      size: 6.5,
      font: fontBold,
      color: textGrey,
    });

    // Validador QR Oficial a la derecha
    if (qrImage) {
      frontPage.drawImage(qrImage, {
        x: 528,
        y: 720,
        width: 42,
        height: 42,
      });
      frontPage.drawRectangle({
        x: 526,
        y: 718,
        width: 46,
        height: 46,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1.5,
      });
      frontPage.drawText('VALIDADOR QR', {
        x: 522,
        y: 709,
        size: 5.5,
        font: fontBold,
        color: slateDark,
      });
    }

    // Línea divisoria de cabecera
    frontPage.drawLine({
      start: { x: startX, y: 704 },
      end: { x: startX + tableW, y: 704 },
      thickness: 1.5,
      color: rgb(0, 0, 0),
    });

    // 2. Cuadrícula de Datos de Radicación del Expediente
    const radY = 554;
    const radH = 146;
    frontPage.drawRectangle({
      x: startX,
      y: radY,
      width: tableW,
      height: radH,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1.5,
    });

    // Fila 1: N° HR | Fecha | Hora | Prioridad (y: 668 a 700)
    frontPage.drawRectangle({
      x: startX,
      y: 668,
      width: 187,
      height: 32,
      color: lightBg,
    });
    frontPage.drawText('N° DE HOJA DE RUTA', { x: 34, y: 688, size: 7, font: fontBold, color: textGrey });
    frontPage.drawText(cleanAnsi(routeSheet.hrCode), { x: 34, y: 674, size: 13, font: fontBold, color: emeraldDark });

    frontPage.drawText('FECHA DE INGRESO', { x: 221, y: 688, size: 7, font: fontBold, color: textGrey });
    frontPage.drawText(formatChlsDate(routeSheet.createdAt), { x: 221, y: 675, size: 8.5, font: fontBold, color: slateDark });

    frontPage.drawText('HORA', { x: 351, y: 688, size: 7, font: fontBold, color: textGrey });
    frontPage.drawText(formatChlsTime(routeSheet.createdAt), { x: 351, y: 675, size: 8.5, font: fontBold, color: slateDark });

    frontPage.drawRectangle({
      x: 455,
      y: 668,
      width: 129,
      height: 32,
      color: lightBg,
    });
    frontPage.drawText('PRIORIDAD', { x: 461, y: 688, size: 7, font: fontBold, color: textGrey });
    const prioColor = routeSheet.priority === 'URGENTE' ? rgb(0.8, 0.1, 0.1) : emeraldDark;
    frontPage.drawText(cleanAnsi(routeSheet.priority || 'NORMAL'), { x: 461, y: 675, size: 8.5, font: fontBold, color: prioColor });

    frontPage.drawLine({ start: { x: startX, y: 668 }, end: { x: startX + tableW, y: 668 }, thickness: 1, color: rgb(0, 0, 0) });
    frontPage.drawLine({ start: { x: 215, y: 668 }, end: { x: 215, y: 700 }, thickness: 1, color: rgb(0, 0, 0) });
    frontPage.drawLine({ start: { x: 345, y: 668 }, end: { x: 345, y: 700 }, thickness: 1, color: rgb(0, 0, 0) });
    frontPage.drawLine({ start: { x: 455, y: 668 }, end: { x: 455, y: 700 }, thickness: 1, color: rgb(0, 0, 0) });

    // Fila 2: Remitente | Procedencia / Área (y: 636 a 668)
    frontPage.drawText('REMITENTE', { x: 34, y: 657, size: 7, font: fontBold, color: textGrey });
    frontPage.drawText(cleanAnsi(routeSheet.senderName || 'No especificado').substring(0, 52), { x: 34, y: 646, size: 8.5, font: fontBold, color: slateDark });
    if (routeSheet.senderDoc) {
      frontPage.drawText(`C.I. / NIT: ${cleanAnsi(routeSheet.senderDoc)}`, { x: 34, y: 638, size: 6.5, font: fontRegular, color: textGrey });
    }

    frontPage.drawText('PROCEDENCIA / ÁREA', { x: 356, y: 657, size: 7, font: fontBold, color: textGrey });
    const originLabel = routeSheet.senderArea || (routeSheet.senderType === 'SOCIO' ? 'SOCIO TITULAR CHLS' : 'EXTERNO');
    frontPage.drawText(cleanAnsi(originLabel).substring(0, 42), { x: 356, y: 645, size: 8.5, font: fontBold, color: slateDark });

    frontPage.drawLine({ start: { x: startX, y: 636 }, end: { x: startX + tableW, y: 636 }, thickness: 1, color: rgb(0, 0, 0) });
    frontPage.drawLine({ start: { x: 350, y: 636 }, end: { x: 350, y: 668 }, thickness: 1, color: rgb(0, 0, 0) });

    // Fila 3: CITE | N° Fojas | Anexos Digitales (y: 608 a 636)
    frontPage.drawText('CITE OFICIAL / NOTA N°', { x: 34, y: 625, size: 7, font: fontBold, color: textGrey });
    frontPage.drawText(cleanAnsi(routeSheet.cite || 'S/N').substring(0, 40), { x: 34, y: 614, size: 8.5, font: fontBold, color: slateDark });

    frontPage.drawText('N° DE FOJAS', { x: 286, y: 625, size: 7, font: fontBold, color: textGrey });
    frontPage.drawText(`${routeSheet.pageCount || 1} Folio(s)`, { x: 286, y: 614, size: 8.5, font: fontBold, color: slateDark });

    frontPage.drawText('ANEXOS DIGITALES', { x: 436, y: 625, size: 7, font: fontBold, color: textGrey });
    frontPage.drawText(`${documents.length} Archivo(s)`, { x: 436, y: 614, size: 8.5, font: fontBold, color: slateDark });

    frontPage.drawLine({ start: { x: startX, y: 608 }, end: { x: startX + tableW, y: 608 }, thickness: 1, color: rgb(0, 0, 0) });
    frontPage.drawLine({ start: { x: 280, y: 608 }, end: { x: 280, y: 636 }, thickness: 1, color: rgb(0, 0, 0) });
    frontPage.drawLine({ start: { x: 430, y: 608 }, end: { x: 430, y: 636 }, thickness: 1, color: rgb(0, 0, 0) });

    // Fila 4: Referencia / Asunto (y: 576 a 608)
    frontPage.drawRectangle({
      x: startX,
      y: 576,
      width: tableW,
      height: 32,
      color: rgb(0.98, 0.98, 0.98),
    });
    frontPage.drawText('REFERENCIA / ASUNTO', { x: 34, y: 597, size: 7, font: fontBold, color: textGrey });
    const refLines = wrapLines(routeSheet.reference, fontBold, 8.5, tableW - 16);
    if (refLines[0]) frontPage.drawText(refLines[0], { x: 34, y: 586, size: 8.5, font: fontBold, color: slateDark });
    if (refLines[1]) frontPage.drawText(refLines[1], { x: 34, y: 577, size: 8, font: fontBold, color: slateDark });

    frontPage.drawLine({ start: { x: startX, y: 576 }, end: { x: startX + tableW, y: 576 }, thickness: 1, color: rgb(0, 0, 0) });

    // Fila 5: Anexos Físicos Acompañantes (y: 554 a 576)
    frontPage.drawText('DOCUMENTOS Y ANEXOS FÍSICOS ACOMPAÑANTES', { x: 34, y: 566, size: 6.5, font: fontBold, color: textGrey });
    const attachText = routeSheet.attachmentDescription || 'Sin anexos físicos complementarios.';
    frontPage.drawText(cleanAnsi(attachText).substring(0, 110), { x: 34, y: 557, size: 7.5, font: fontRegular, color: slateDark });

    // 3. Proveídos y Derivaciones del Anverso (Proveídos 1 al 4)
    const slotHeight = 121;
    const slotGap = 4;
    const slotsBaseY = [429, 304, 179, 54]; // Posición Y inferior de cada casilla

    for (let index = 0; index < 4; index++) {
      const mov = frontSlots[index];
      const slotY = slotsBaseY[index];
      const proveidoNum = index + 1;

      // Recuadro del Proveído
      frontPage.drawRectangle({
        x: startX,
        y: slotY,
        width: tableW,
        height: slotHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1.5,
      });

      // Encabezado del Proveído
      const topY = slotY + slotHeight;
      frontPage.drawRectangle({
        x: 32,
        y: topY - 14,
        width: 26,
        height: 11,
        color: rgb(0, 0, 0),
      });
      frontPage.drawText(`N° ${proveidoNum}`, {
        x: 35,
        y: topY - 11,
        size: 7,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      const destTarget = mov?.targetPersonName
        ? `${mov.targetPersonName} (${mov.targetArea})`
        : mov?.targetArea || '__________________________________';
      frontPage.drawText(`A: ${cleanAnsi(destTarget).substring(0, 48)}`, {
        x: 64,
        y: topY - 11,
        size: 8,
        font: fontBold,
        color: slateDark,
      });

      frontPage.drawText(`Fecha: ${formatChlsDate(mov?.createdAt)}`, {
        x: 380,
        y: topY - 11,
        size: 7.5,
        font: fontBold,
        color: slateDark,
      });
      frontPage.drawText(`Hora: ${formatChlsTime(mov?.createdAt)}`, {
        x: 495,
        y: topY - 11,
        size: 7.5,
        font: fontBold,
        color: slateDark,
      });

      frontPage.drawLine({
        start: { x: startX, y: topY - 17 },
        end: { x: startX + tableW, y: topY - 17 },
        thickness: 0.8,
        color: rgb(0.85, 0.85, 0.85),
      });

      if (mov) {
        // Columna Izquierda: Sello rápido e instrucción
        let instrY = topY - 26;
        if (mov.quickStamp) {
          const stampText = cleanAnsi(mov.quickStamp).toUpperCase();
          const stampW = Math.min(fontBold.widthOfTextAtSize(stampText, 7) + 12, 340);
          frontPage.drawRectangle({
            x: 34,
            y: instrY - 4,
            width: stampW,
            height: 13,
            borderColor: rgb(0.04, 0.45, 0.25),
            borderWidth: 1.2,
          });
          frontPage.drawText(stampText, {
            x: 39,
            y: instrY,
            size: 7,
            font: fontBold,
            color: rgb(0.04, 0.45, 0.25),
          });
          instrY -= 17;
        }

        const lines = wrapLines(mov.instruction || '', fontRegular, 8, 360);
        for (let li = 0; li < Math.min(lines.length, 6); li++) {
          frontPage.drawText(lines[li], {
            x: 34,
            y: instrY,
            size: 8,
            font: fontRegular,
            color: slateDark,
          });
          instrY -= 10.5;
        }

        const movDocs = (mov.documents && mov.documents.length > 0)
          ? mov.documents
          : (documents || []).filter((d: any) => d.movementId === mov.id);
        if (movDocs.length > 0) {
          const docNames = movDocs.map((d: any) => d.fileName).join(', ');
          frontPage.drawText(cleanAnsi(`📎 Adjuntos (${movDocs.length}): ${docNames}`).substring(0, 80), {
            x: 34,
            y: slotY + 8,
            size: 6.5,
            font: fontBold,
            color: emeraldDark,
          });
        }

        // Columna Derecha: Firma y Sello
        const stampRightX = 495;
        frontPage.drawLine({
          start: { x: 425, y: slotY + 36 },
          end: { x: 565, y: slotY + 36 },
          thickness: 0.8,
          color: rgb(0.6, 0.6, 0.6),
        });

        const uName = mov.sourceUser ? `${mov.sourceUser.firstName} ${mov.sourceUser.lastName}` : 'DESPACHO OFICIAL';
        const nameLen = fontBold.widthOfTextAtSize(cleanAnsi(uName), 7.5);
        frontPage.drawText(cleanAnsi(uName), {
          x: Math.max(425, stampRightX - nameLen / 2),
          y: slotY + 26,
          size: 7.5,
          font: fontBold,
          color: slateDark,
        });

        const areaName = mov.sourceArea || 'GERENCIA GENERAL';
        const areaLen = fontBold.widthOfTextAtSize(cleanAnsi(areaName), 6.5);
        frontPage.drawText(cleanAnsi(areaName), {
          x: Math.max(425, stampRightX - areaLen / 2),
          y: slotY + 17,
          size: 6.5,
          font: fontBold,
          color: textGrey,
        });

        frontPage.drawText('CLUB HÍPICO LOS SARGENTOS', {
          x: 435,
          y: slotY + 9,
          size: 5.5,
          font: fontBold,
          color: emeraldDark,
        });

        if (mov.signatureUrl) {
          frontPage.drawText(cleanAnsi('[OK] FIRMA DIGITAL CHLS'), {
            x: 440,
            y: slotY + 40,
            size: 6.5,
            font: fontBold,
            color: rgb(0.1, 0.3, 0.7),
          });
        }
      } else {
        // Casilla reservada en blanco
        frontPage.drawText(cleanAnsi(`Espacio reservado para instruccion / proveido N ${proveidoNum}`), {
          x: 34,
          y: slotY + 20,
          size: 7.5,
          font: fontRegular,
          color: textGrey,
        });
        frontPage.drawLine({
          start: { x: 430, y: slotY + 28 },
          end: { x: 565, y: slotY + 28 },
          thickness: 0.8,
          color: rgb(0.7, 0.7, 0.7),
        });
        frontPage.drawText(cleanAnsi('Firma y Sello de Despacho'), {
          x: 448,
          y: slotY + 16,
          size: 7,
          font: fontRegular,
          color: textGrey,
        });
      }
    }

    // Pie de Pagina del Anverso
    frontPage.drawText(cleanAnsi('HOJA DE RUTA OFICIAL CHLS - PAPEL BOND TAMANO CARTA - ANVERSO | Cero Papel | Validez Legal'), {
      x: startX,
      y: 36,
      size: 6.5,
      font: fontBold,
      color: slateDark,
    });
    frontPage.drawText(`Impresion: ${formatChlsDate(new Date())} ${formatChlsTime(new Date())}`, {
      x: 445,
      y: 36,
      size: 6.5,
      font: fontRegular,
      color: textGrey,
    });

    // =========================================================================
    // PÁGINA 2: REVERSO DE LA HOJA DE RUTA (CARTA)
    // Se incluye siempre que existan proveídos 5-8 o el expediente esté concluido/archivado
    // =========================================================================
    const backPage = masterDoc.addPage(PageSizes.Letter);

    // 1. Header del Reverso
    if (logoImage) {
      backPage.drawImage(logoImage, {
        x: 30,
        y: 730,
        width: 34,
        height: 38,
      });
    }

    backPage.drawText('CLUB HÍPICO LOS SARGENTOS', {
      x: 72,
      y: 752,
      size: 11,
      font: fontBold,
      color: slateDark,
    });
    backPage.drawText(cleanAnsi('Hoja de Ruta - Reverso (Continuacion de Proveidos y Archivo Final)'), {
      x: 72,
      y: 740,
      size: 7,
      font: fontBold,
      color: textGrey,
    });

    backPage.drawText(`Hoja de Ruta: ${cleanAnsi(routeSheet.hrCode)}`, {
      x: 435,
      y: 752,
      size: 11,
      font: fontBold,
      color: emeraldDark,
    });
    if (routeSheet.cite) {
      backPage.drawText(`CITE: ${cleanAnsi(routeSheet.cite)}`, {
        x: 435,
        y: 740,
        size: 7.5,
        font: fontRegular,
        color: textGrey,
      });
    }

    backPage.drawLine({
      start: { x: startX, y: 724 },
      end: { x: startX + tableW, y: 724 },
      thickness: 1.5,
      color: rgb(0, 0, 0),
    });

    // 2. Proveídos del Reverso (Proveídos 5 al 8)
    const backSlotH = 88;
    const backSlotBaseY = [628, 534, 440, 346];

    for (let index = 0; index < 4; index++) {
      const mov = backSlots[index];
      const slotY = backSlotBaseY[index];
      const proveidoNum = index + 5;
      const topY = slotY + backSlotH;

      backPage.drawRectangle({
        x: startX,
        y: slotY,
        width: tableW,
        height: backSlotH,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1.5,
      });

      backPage.drawRectangle({
        x: 32,
        y: topY - 14,
        width: 26,
        height: 11,
        color: rgb(0.2, 0.2, 0.2),
      });
      backPage.drawText(`N° ${proveidoNum}`, {
        x: 35,
        y: topY - 11,
        size: 7,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      const destTarget = mov?.targetPersonName
        ? `${mov.targetPersonName} (${mov.targetArea})`
        : mov?.targetArea || '__________________________________';
      backPage.drawText(`A: ${cleanAnsi(destTarget).substring(0, 48)}`, {
        x: 64,
        y: topY - 11,
        size: 8,
        font: fontBold,
        color: slateDark,
      });

      backPage.drawText(`Fecha: ${formatChlsDate(mov?.createdAt)}`, {
        x: 380,
        y: topY - 11,
        size: 7.5,
        font: fontBold,
        color: slateDark,
      });
      backPage.drawText(`Hora: ${formatChlsTime(mov?.createdAt)}`, {
        x: 495,
        y: topY - 11,
        size: 7.5,
        font: fontBold,
        color: slateDark,
      });

      backPage.drawLine({
        start: { x: startX, y: topY - 17 },
        end: { x: startX + tableW, y: topY - 17 },
        thickness: 0.8,
        color: rgb(0.85, 0.85, 0.85),
      });

      if (mov) {
        let instrY = topY - 26;
        if (mov.quickStamp) {
          const stampText = cleanAnsi(mov.quickStamp).toUpperCase();
          const stampW = Math.min(fontBold.widthOfTextAtSize(stampText, 7) + 12, 340);
          backPage.drawRectangle({
            x: 34,
            y: instrY - 4,
            width: stampW,
            height: 12,
            borderColor: rgb(0.04, 0.45, 0.25),
            borderWidth: 1.2,
          });
          backPage.drawText(stampText, {
            x: 39,
            y: instrY,
            size: 7,
            font: fontBold,
            color: rgb(0.04, 0.45, 0.25),
          });
          instrY -= 15;
        }

        const lines = wrapLines(mov.instruction || '', fontRegular, 8, 360);
        for (let li = 0; li < Math.min(lines.length, 4); li++) {
          backPage.drawText(lines[li], {
            x: 34,
            y: instrY,
            size: 8,
            font: fontRegular,
            color: slateDark,
          });
          instrY -= 10;
        }

        // Firma
        const stampRightX = 495;
        backPage.drawLine({
          start: { x: 425, y: slotY + 28 },
          end: { x: 565, y: slotY + 28 },
          thickness: 0.8,
          color: rgb(0.6, 0.6, 0.6),
        });
        const uName = mov.sourceUser ? `${mov.sourceUser.firstName} ${mov.sourceUser.lastName}` : 'DESPACHO OFICIAL';
        const nameLen = fontBold.widthOfTextAtSize(cleanAnsi(uName), 7);
        backPage.drawText(cleanAnsi(uName), {
          x: Math.max(425, stampRightX - nameLen / 2),
          y: slotY + 19,
          size: 7,
          font: fontBold,
          color: slateDark,
        });
        backPage.drawText(cleanAnsi(mov.sourceArea || 'GERENCIA GENERAL'), {
          x: 435,
          y: slotY + 10,
          size: 6,
          font: fontBold,
          color: textGrey,
        });
      } else {
        backPage.drawText(`Espacio reservado para instrucción / proveído N° ${proveidoNum}`, {
          x: 34,
          y: slotY + 16,
          size: 7.5,
          font: fontRegular,
          color: textGrey,
        });
        backPage.drawLine({
          start: { x: 430, y: slotY + 24 },
          end: { x: 565, y: slotY + 24 },
          thickness: 0.8,
          color: rgb(0.7, 0.7, 0.7),
        });
        backPage.drawText('Firma y Sello de Despacho', {
          x: 448,
          y: slotY + 12,
          size: 7,
          font: fontRegular,
          color: textGrey,
        });
      }
    }

    // 3. Recuadro Oficial de "CUSTODIA & ARCHIVO FINAL"
    const archY = 165;
    const archH = 165;
    backPage.drawRectangle({
      x: startX,
      y: archY,
      width: tableW,
      height: archH,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1.5,
    });

    // Franja Superior de Archivo
    backPage.drawRectangle({
      x: startX,
      y: archY + archH - 22,
      width: tableW,
      height: 22,
      color: rgb(0.11, 0.18, 0.14),
    });
    backPage.drawText(cleanAnsi('EXPEDIENTE CONCLUIDO - REGISTRO OFICIAL DE CUSTODIA Y ARCHIVO DEFINITIVO'), {
      x: 75,
      y: archY + archH - 15,
      size: 8.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // Columna 1
    backPage.drawText('UBICACIÓN FÍSICA (ESTANTE / GAVETA / TOMO / CARPETA):', {
      x: 34,
      y: archY + 126,
      size: 7,
      font: fontBold,
      color: textGrey,
    });
    const locText = routeSheet.archiveLocation || 'EN PROCESO / NO ASIGNADO';
    backPage.drawText(cleanAnsi(locText).substring(0, 48), {
      x: 34,
      y: archY + 112,
      size: 9.5,
      font: fontBold,
      color: emeraldDark,
    });

    backPage.drawText('CÓDIGO DE CAJA / ARCHIVADOR:', {
      x: 34,
      y: archY + 94,
      size: 7,
      font: fontBold,
      color: textGrey,
    });
    const boxText = routeSheet.archiveBox || 'CAJA ESTÁNDAR / EXPEDIENTE GENERAL';
    backPage.drawText(cleanAnsi(boxText).substring(0, 48), {
      x: 34,
      y: archY + 82,
      size: 8.5,
      font: fontBold,
      color: slateDark,
    });

    // Columna 2
    backPage.drawText('TIPO DE ARCHIVO & CUSTODIA:', {
      x: 310,
      y: archY + 126,
      size: 7,
      font: fontBold,
      color: textGrey,
    });
    const typeLabel = routeSheet.currentArea === 'ARCHIVO_PERSONAL'
      ? 'ARCHIVO PERSONAL (CUSTODIA DE DESPACHO)'
      : 'ARCHIVO CENTRAL INSTITUCIONAL';
    backPage.drawText(typeLabel, {
      x: 310,
      y: archY + 112,
      size: 8.5,
      font: fontBold,
      color: slateDark,
    });

    backPage.drawText('RESPONSABLE DE CUSTODIA / ARCHIVADO POR:', {
      x: 310,
      y: archY + 94,
      size: 7,
      font: fontBold,
      color: textGrey,
    });
    const respName = archivedByUser
      ? `${archivedByUser.firstName} ${archivedByUser.lastName}`
      : (routeSheet.currentArea || 'Custodio Autorizado');
    backPage.drawText(cleanAnsi(respName).substring(0, 42), {
      x: 310,
      y: archY + 82,
      size: 8.5,
      font: fontBold,
      color: slateDark,
    });

    backPage.drawText('FECHA DE ARCHIVO:', {
      x: 310,
      y: archY + 68,
      size: 7,
      font: fontBold,
      color: textGrey,
    });
    backPage.drawText(formatChlsDate(routeSheet.archivedAt || routeSheet.updatedAt), {
      x: 310,
      y: archY + 57,
      size: 8.5,
      font: fontBold,
      color: slateDark,
    });

    // Línea divisoria notas
    backPage.drawLine({
      start: { x: startX, y: archY + 48 },
      end: { x: startX + tableW, y: archY + 48 },
      thickness: 0.8,
      color: rgb(0.85, 0.85, 0.85),
    });

    backPage.drawText('AUTO / MOTIVO DE ARCHIVO & OBSERVACIONES LEGALES:', {
      x: 34,
      y: archY + 36,
      size: 7,
      font: fontBold,
      color: textGrey,
    });
    const archNotes = routeSheet.archiveNotes || 'Trámite concluido formalmente con toda la documentación de respaldo y archivado para resguardo definitivo.';
    const notesLines = wrapLines(archNotes, fontRegular, 7.5, tableW - 20);
    if (notesLines[0]) backPage.drawText(notesLines[0], { x: 34, y: archY + 25, size: 7.5, font: fontRegular, color: slateDark });
    if (notesLines[1]) backPage.drawText(notesLines[1], { x: 34, y: archY + 15, size: 7.5, font: fontRegular, color: slateDark });

    // Pie de Pagina del Reverso
    backPage.drawText(cleanAnsi('HOJA DE RUTA OFICIAL CHLS - REVERSO | Validez Legal Institucional | Auditoria Administrativa'), {
      x: startX,
      y: 36,
      size: 6.5,
      font: fontBold,
      color: slateDark,
    });
    backPage.drawText(`Impresion: ${formatChlsDate(new Date())} ${formatChlsTime(new Date())}`, {
      x: 445,
      y: 36,
      size: 6.5,
      font: fontRegular,
      color: textGrey,
    });
  }


  /**
   * Helper que añade la carátula divisoria e inventario de anexos físicos digitalizados
   */
  private async appendAnnexesCoverPage(
    masterDoc: PDFDocument,
    hrCode: string,
    attachments: Array<{
      doc: any;
      originLabel: string;
      sequenceNumber: number;
    }>,
    fontRegular: any,
    fontBold: any,
    fontTimes: any,
    logoImage: any,
    emeraldDark: any,
    goldColor: any,
    slateDark: any,
    textGrey: any,
    lightBg: any
  ) {
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
    page.drawText('SISTEMA OFICIAL DE CORRESPONDENCIA & GESTIÓN DOCUMENTAL', {
      x: 95,
      y: H - 65,
      size: 8,
      font: fontBold,
      color: emeraldDark,
    });
    page.drawText(cleanAnsi(`EXPEDIENTE DIGITALIZADO - HOJA DE RUTA ${hrCode}`), {
      x: 95,
      y: H - 76,
      size: 7.5,
      font: fontRegular,
      color: textGrey,
    });

    // Línea divisoria
    page.drawLine({
      start: { x: 45, y: H - 98 },
      end: { x: W - 45, y: H - 98 },
      thickness: 2,
      color: goldColor,
    });

    // Banner de Sección de Anexos
    page.drawRectangle({
      x: 45,
      y: H - 155,
      width: W - 90,
      height: 46,
      color: emeraldDark,
    });
    page.drawText('SECCIÓN II: ANEXOS Y DOCUMENTACIÓN DE RESPALDO DIGITALIZADA', {
      x: 55,
      y: H - 128,
      size: 11,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText('COMPILACIÓN FÍSICA PÁGINA A PÁGINA DE ANTECEDENTES Y ARCHIVOS ADJUNTOS', {
      x: 55,
      y: H - 144,
      size: 7.5,
      font: fontRegular,
      color: goldColor,
    });

    let curY = H - 175;
    const tableW = W - 90;

    page.drawText('ÍNDICE DE ANEXOS FÍSICOS INCORPORADOS AL EXPEDIENTE:', {
      x: 45,
      y: curY,
      size: 8.5,
      font: fontBold,
      color: slateDark,
    });
    curY -= 16;

    // Encabezado de tabla de anexos
    page.drawRectangle({
      x: 45,
      y: curY - 18,
      width: tableW,
      height: 18,
      color: lightBg,
      borderColor: rgb(0.8, 0.85, 0.85),
      borderWidth: 1,
    });
    page.drawText('#', { x: 52, y: curY - 12, size: 7.5, font: fontBold, color: slateDark });
    page.drawText('NOMBRE DEL ARCHIVO', { x: 80, y: curY - 12, size: 7.5, font: fontBold, color: slateDark });
    page.drawText('ETAPA / INCORPORADO EN', { x: 270, y: curY - 12, size: 7.5, font: fontBold, color: slateDark });
    page.drawText('CÓDIGO HASH SHA-256 (INTEGRIDAD)', { x: 420, y: curY - 12, size: 7.5, font: fontBold, color: slateDark });
    curY -= 20;

    // Filas de anexos (hasta 12 por página de carátula)
    attachments.forEach((att, idx) => {
      const isEven = idx % 2 === 0;
      page.drawRectangle({
        x: 45,
        y: curY - 22,
        width: tableW,
        height: 22,
        color: isEven ? rgb(0.98, 0.98, 0.98) : rgb(1, 1, 1),
        borderColor: rgb(0.9, 0.9, 0.9),
        borderWidth: 0.5,
      });

      page.drawText(String(idx + 1), { x: 52, y: curY - 14, size: 7.5, font: fontBold, color: emeraldDark });
      page.drawText(cleanAnsi(att.doc.fileName || 'Documento').substring(0, 32), {
        x: 80,
        y: curY - 14,
        size: 7.5,
        font: fontBold,
        color: slateDark,
      });
      page.drawText(cleanAnsi(att.originLabel).substring(0, 26), {
        x: 270,
        y: curY - 14,
        size: 7,
        font: fontRegular,
        color: textGrey,
      });
      const hashStr = att.doc.sha256Hash ? att.doc.sha256Hash.substring(0, 20) + '...' : 'Registrado';
      page.drawText(hashStr, {
        x: 420,
        y: curY - 14,
        size: 6.8,
        font: fontRegular,
        color: textGrey,
      });

      curY -= 22;
    });

    curY -= 20;

    // Recuadro de Certificación Legal
    page.drawRectangle({
      x: 45,
      y: curY - 50,
      width: tableW,
      height: 50,
      color: rgb(0.95, 0.98, 0.96),
      borderColor: emeraldDark,
      borderWidth: 1,
    });
    page.drawText('CERTIFICACIÓN Y CADENA DE CUSTODIA DOCUMENTAL:', {
      x: 55,
      y: curY - 16,
      size: 7.5,
      font: fontBold,
      color: emeraldDark,
    });
    page.drawText(
      cleanAnsi('A continuación se compilan fojas físicas de cada anexo en estricto orden cronológico.'),
      { x: 55, y: curY - 28, size: 7.5, font: fontRegular, color: slateDark }
    );
    page.drawText(
      cleanAnsi('La foliación continua institucional inferior acredita la validez administrativa del expediente.'),
      { x: 55, y: curY - 40, size: 7.5, font: fontRegular, color: textGrey }
    );
  }

  /**
   * Helper que fusiona página por página todos los documentos físicos (PDFs e imágenes)
   */
  private async mergeAttachedDocuments(
    masterDoc: PDFDocument,
    attachments: Array<{
      doc: any;
      originLabel: string;
      sequenceNumber: number;
    }>,
    fontBold: any,
    emeraldDark: any
  ) {
    for (const item of attachments) {
      const { doc, originLabel } = item;
      try {
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
          const attachedDoc = await PDFDocument.load(attachedBytes, { ignoreEncryption: true });
          const copiedPages = await masterDoc.copyPages(attachedDoc, attachedDoc.getPageIndices());
          for (const cPage of copiedPages) {
            masterDoc.addPage(cPage);
          }
          logger.info(`[DossierPdfService] Fusionadas ${copiedPages.length} páginas físicas de ${doc.fileName} (${originLabel}).`);
        } else if (isImg) {
          const imgBytes = fs.readFileSync(diskPath);
          const isPng = doc.fileName?.toLowerCase().endsWith('.png');
          const embeddedImg = isPng ? await masterDoc.embedPng(imgBytes) : await masterDoc.embedJpg(imgBytes);

          const imgPage = masterDoc.addPage(PageSizes.Letter);
          const { width: ipW, height: ipH } = imgPage.getSize();

          const maxW = ipW - 80;
          const maxH = ipH - 100;
          const scale = Math.min(maxW / embeddedImg.width, maxH / embeddedImg.height, 1);
          const dw = embeddedImg.width * scale;
          const dh = embeddedImg.height * scale;

          imgPage.drawText(cleanAnsi(`DOCUMENTO DIGITALIZADO: ${doc.fileName} (${originLabel})`), {
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
    page.drawText(cleanAnsi('Iniciativa CHLS Cero Papel - Validez Legal y Administrativa Institucional.'), {
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
