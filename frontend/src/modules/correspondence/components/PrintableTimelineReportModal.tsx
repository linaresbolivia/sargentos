import React, { useState } from 'react';
import { RouteSheetItem, HrMovement } from '../types/correspondence.types';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer,
  X,
  Paperclip,
  Table,
  ListFilter,
} from 'lucide-react';
import logoUrl from '../../../assets/logo.png';
import { api } from '@config/api';
import toast from 'react-hot-toast';

interface PrintableTimelineReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: RouteSheetItem;
}

export type TimelinePrintFormat = 'HYBRID' | 'TABLE_ONLY' | 'LIST_ONLY';

interface TimelineHito {
  sequenceNumber: number;
  date: string;
  time: string;
  sourceArea: string;
  sourcePerson: string;
  targetArea: string;
  targetPerson: string;
  quickStamp?: string | null;
  instruction: string;
  docCount: number;
  isSigned: boolean;
  signatureUrl?: string | null;
  isInitialRadicacion?: boolean;
  isCurrentCustody?: boolean;
}

export const PrintableTimelineReportModal: React.FC<PrintableTimelineReportModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const [printFormat, setPrintFormat] = useState<TimelinePrintFormat>('TABLE_ONLY');

  if (!isOpen) return null;

  const movements: HrMovement[] = item.movements || [];

  // Orden cronológico estricto de movimientos
  const sortedMovements = [...movements].sort(
    (a, b) => a.sequenceNumber - b.sequenceNumber || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const verificationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/correspondencia?code=${encodeURIComponent(item.hrCode)}`
    : `https://chls.bo/correspondencia?code=${encodeURIComponent(item.hrCode)}`;

  const formatDate = (iso?: string | null) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  const formatTime = (iso?: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Construir lista unificada de hitos: Hito 0 (Radicación) + Hitos 1..N (Movimientos)
  const allHitos: TimelineHito[] = [
    {
      sequenceNumber: 0,
      date: formatDate(item.createdAt),
      time: formatTime(item.createdAt),
      sourceArea: item.senderName,
      sourcePerson: item.senderType === 'SOCIO' ? 'Socio CHLS' : 'Externo',
      targetArea: item.senderArea || 'Mesa de Entradas',
      targetPerson: item.createdBy ? `${item.createdBy.firstName} ${item.createdBy.lastName}` : 'Recepción Oficial',
      quickStamp: 'RADICACIÓN OFICIAL INICIAL',
      instruction: item.attachmentDescription
        ? `Ingreso y digitalización formal del expediente en el Sistema SICAD. Adjunto: ${item.attachmentDescription}`
        : 'Ingreso y digitalización formal del expediente en el Sistema SICAD.',
      docCount: item.documents?.length || 0,
      isSigned: true,
      isInitialRadicacion: true,
    },
    ...sortedMovements.map((mov, idx) => ({
      sequenceNumber: mov.sequenceNumber || idx + 1,
      date: formatDate(mov.createdAt),
      time: formatTime(mov.createdAt),
      sourceArea: mov.sourceArea,
      sourcePerson: mov.sourceUser ? `${mov.sourceUser.firstName} ${mov.sourceUser.lastName}` : 'Titular de Despacho',
      targetArea: mov.targetArea,
      targetPerson: mov.targetPersonName || (mov.sourceUser ? `${mov.sourceUser.firstName} ${mov.sourceUser.lastName}` : 'Titular de Despacho'),
      quickStamp: mov.quickStamp,
      instruction: mov.instruction || 'Para atención y fines correspondientes.',
      docCount: mov.documents?.length || 0,
      isSigned: !!mov.signatureUrl,
      signatureUrl: mov.signatureUrl,
      isCurrentCustody: mov.targetArea === item.currentArea && idx === sortedMovements.length - 1,
    })),
  ];

  // =========================================================================
  // PAGINACIÓN INTELIGENTE PARA PAPEL BOND TAMAÑO CARTA (215.9mm x 279.4mm)
  // =========================================================================
  // En Página 1 con Membrete y Ficha Resumen caben hasta 5 hitos holgadamente.
  // En Páginas de Continuación caben hasta 8 hitos con encabezado compacto y certificación.
  const tablePages: TimelineHito[][] = [];
  if (allHitos.length <= 5) {
    tablePages.push(allHitos);
  } else {
    tablePages.push(allHitos.slice(0, 5)); // Hoja 1: Primeros 5 hitos
    let remaining = allHitos.slice(5);
    while (remaining.length > 0) {
      tablePages.push(remaining.slice(0, 7)); // Hojas siguientes: hasta 7 hitos + pie/certificación
      remaining = remaining.slice(7);
    }
  }

  // Paginación para Fichas Detalladas (Cards con rúbrica): 3 por página Carta
  const cardPages: TimelineHito[][] = [];
  if (printFormat === 'HYBRID' || printFormat === 'LIST_ONLY') {
    let cardRemaining = [...allHitos];
    // Si es LIST_ONLY, la página 1 tiene membrete y resumen, por lo que entran 2 fichas
    if (printFormat === 'LIST_ONLY') {
      cardPages.push(cardRemaining.slice(0, 2));
      cardRemaining = cardRemaining.slice(2);
    }
    while (cardRemaining.length > 0) {
      cardPages.push(cardRemaining.slice(0, 3));
      cardRemaining = cardRemaining.slice(3);
    }
  }

  // Total de hojas a generar según formato seleccionado
  const totalPages =
    printFormat === 'TABLE_ONLY'
      ? tablePages.length
      : printFormat === 'LIST_ONLY'
      ? cardPages.length
      : tablePages.length + cardPages.length;

  const handlePrint = () => {
    const printElement = document.getElementById('printable-timeline-document');
    if (!printElement) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((node) => node.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Trazabilidad 360° - Hoja de Ruta ${item.hrCode} - CHLS</title>
          ${styleTags}
          <style>
            @page {
              size: letter portrait;
              margin: 0;
            }
            *, *::before, *::after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: Arial, Helvetica, sans-serif !important;
              font-size: 10pt !important;
            }
            .no-print {
              display: none !important;
            }
            .printable-timeline-page {
              width: 215.9mm !important;
              height: 279.4mm !important;
              max-height: 279.4mm !important;
              margin: 0 auto !important;
              padding: 8mm 12mm 10mm 12mm !important;
              background: #ffffff !important;
              color: #000000 !important;
              box-shadow: none !important;
              border: none !important;
              overflow: hidden !important;
              box-sizing: border-box !important;
              page-break-after: always !important;
              break-after: page !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
            }
            .printable-timeline-page:last-child {
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
            }
            th, td {
              border-color: #cbd5e1 !important;
            }
          </style>
        </head>
        <body>
          ${printElement.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {}
      }, 1500);
    }, 450);
  };

  // Renderizador del Encabezado Oficial Completo (Hoja 1)
  const renderHeaderFull = (pageNumber: number) => (
    <div className="flex items-start justify-between border-b-2 border-[#064e3b] pb-3 mb-3">
      <div className="flex items-center gap-3">
        <img src={logoUrl} alt="CHLS" className="w-16 h-16 object-contain shrink-0" />
        <div>
          <h1 className="text-base font-black tracking-tight text-[#064e3b] uppercase leading-tight">
            CLUB HÍPICO LOS SARGENTOS
          </h1>
          <span className="text-[10px] font-bold text-[#b45309] block uppercase tracking-wider">
            Fundado en 1955 • La Paz, Bolivia
          </span>
          <span className="text-[9.5px] text-slate-600 font-semibold block mt-0.5">
            Sistema de Correspondencia Institucional & Archivo Digital (SICAD)
          </span>
          <div className="mt-1 inline-block bg-[#064e3b]/10 text-[#064e3b] px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-wide border border-[#064e3b]/20">
            Informe Oficial de Trazabilidad & Cadena de Custodia 360°
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-300 rounded-lg p-2 text-right shrink-0">
        <div className="text-[9.5px] space-y-0.5 leading-tight">
          <div>
            <span className="text-slate-500 font-semibold">Hoja de Ruta:</span>
            <strong className="block text-xs font-mono font-black text-[#064e3b]">
              {item.hrCode}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">CITE:</span>
            <strong className="block font-mono font-bold text-slate-800 text-[10px]">
              {item.cite || 'S/N'}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 font-semibold">Hoja:</span>
            <strong className="block font-mono text-[9px] text-[#b45309]">
              {pageNumber} de {totalPages}
            </strong>
          </div>
        </div>

        <div className="p-0.5 bg-white border border-slate-300 rounded shadow-xs shrink-0">
          <QRCodeSVG value={verificationUrl} size={50} level="M" />
        </div>
      </div>
    </div>
  );

  // Renderizador del Encabezado de Continuación (Hojas 2+)
  const renderHeaderContinuation = (pageNumber: number) => (
    <div className="flex items-center justify-between border-b-2 border-[#064e3b] pb-2 mb-3">
      <div className="flex items-center gap-2.5">
        <img src={logoUrl} alt="CHLS" className="w-8 h-8 object-contain shrink-0" />
        <div>
          <span className="text-[9px] font-black uppercase text-[#064e3b] tracking-wider block leading-tight">
            CLUB HÍPICO LOS SARGENTOS • SICAD
          </span>
          <h2 className="text-[11px] font-black text-slate-900 uppercase leading-tight">
            Trazabilidad & Cadena de Custodia — Hoja {pageNumber} de {totalPages}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2 text-right text-[9.5px]">
        <span className="bg-[#064e3b] text-white px-2 py-0.5 rounded font-mono font-black text-[10px]">
          {item.hrCode}
        </span>
        <span className="text-slate-600 font-mono font-bold">
          CITE: {item.cite || 'S/N'}
        </span>
      </div>
    </div>
  );

  // Ficha Resumen del Expediente
  const renderResumenExpediente = () => (
    <div className="bg-slate-50 border border-slate-300 rounded-lg p-2.5 mb-3 space-y-1.5 text-[9.5px]">
      <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-1.5">
        <div>
          <span className="text-[8.5px] uppercase font-bold text-slate-500 block">Remitente Original</span>
          <strong className="text-[10.5px] text-slate-900 block truncate">{item.senderName}</strong>
          <span className="text-[8.5px] text-slate-600 block">
            {item.senderArea || (item.senderType === 'SOCIO' ? 'Socio CHLS' : 'Externo')}
          </span>
        </div>

        <div>
          <span className="text-[8.5px] uppercase font-bold text-slate-500 block">Fecha Radicación</span>
          <strong className="text-[10.5px] text-slate-900 block font-mono">
            {formatDate(item.createdAt)} — {formatTime(item.createdAt)}
          </strong>
          <span className="text-[8.5px] text-slate-600 block">
            {item.pageCount || 1} Folio(s) / Fojas
          </span>
        </div>

        <div>
          <span className="text-[8.5px] uppercase font-bold text-slate-500 block">Custodia & Estado</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="bg-[#064e3b] text-white px-1.5 py-0.5 rounded text-[9px] font-black uppercase">
              {item.currentArea}
            </span>
            <span className="bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">
              {item.status}
            </span>
          </div>
        </div>
      </div>

      <div>
        <span className="text-[8.5px] uppercase font-bold text-slate-500 block">Referencia / Asunto Formal:</span>
        <p className="text-[10.5px] font-black text-slate-900 uppercase leading-snug">
          {item.reference}
        </p>
        {item.archiveLocation && (
          <p className="text-[9px] font-bold text-amber-800 mt-0.5 bg-amber-50 p-1 rounded border border-amber-200">
            🏛️ Archivo Central: {item.archiveLocation} {item.archiveBox ? `(Caja: ${item.archiveBox})` : ''}
          </p>
        )}
      </div>
    </div>
  );

  // Renderizador de Tabla de Hitos
  const renderHitosTable = (hitos: TimelineHito[], isContinuation: boolean) => (
    <div className="w-full flex-1">
      <div className="flex items-center justify-between pb-1 mb-1 border-b border-[#064e3b]/30">
        <h2 className="text-[10.5px] font-black uppercase tracking-wider text-[#064e3b] flex items-center gap-1">
          <Table className="w-3 h-3 text-[#b45309]" />
          <span>
            {isContinuation
              ? 'Tabla Cronológica de Movimientos (Continuación)'
              : 'Tabla Cronológica de Derivaciones & Movimientos'}
          </span>
        </h2>
        <span className="text-[9px] font-bold text-slate-500">
          Total Hitos: {allHitos.length}
        </span>
      </div>

      <table className="w-full border border-slate-300 text-[9px]">
        <thead>
          <tr className="bg-[#064e3b] text-white font-bold uppercase text-[8.5px]">
            <th className="py-1.5 px-1.5 text-center border-r border-[#043d2e] w-7">#</th>
            <th className="py-1.5 px-2 text-left border-r border-[#043d2e] w-20">Fecha / Hora</th>
            <th className="py-1.5 px-2 text-left border-r border-[#043d2e] w-32">Origen ➔ Destino</th>
            <th className="py-1.5 px-2 text-left border-r border-[#043d2e] w-24">Responsable</th>
            <th className="py-1.5 px-2.5 text-left border-r border-[#043d2e]">Instrucción / Proveído</th>
            <th className="py-1.5 px-1.5 text-center border-r border-[#043d2e] w-12">Adjuntos</th>
            <th className="py-1.5 px-1.5 text-center w-14">Firma</th>
          </tr>
        </thead>
        <tbody>
          {hitos.map((hito, idx) => (
            <tr
              key={hito.sequenceNumber}
              className={`border-b border-slate-200 ${
                idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
              } ${hito.isCurrentCustody ? 'bg-amber-50/60' : ''}`}
            >
              <td className="py-1.5 px-1.5 text-center font-bold text-slate-800 border-r border-slate-200">
                {hito.sequenceNumber}
              </td>
              <td className="py-1.5 px-2 font-mono text-slate-700 border-r border-slate-200 leading-tight">
                {hito.date}
                <br />
                <span className="text-[8px] text-slate-500">{hito.time}</span>
              </td>
              <td className="py-1.5 px-2 border-r border-slate-200 leading-tight">
                <span className="text-slate-600 block truncate max-w-[120px]">{hito.sourceArea}</span>
                <span className="font-bold text-[#064e3b] block truncate max-w-[120px]">
                  ➔ {hito.targetArea}
                </span>
              </td>
              <td className="py-1.5 px-2 border-r border-slate-200 font-semibold text-slate-700 leading-tight">
                <span className="truncate block max-w-[100px]">{hito.targetPerson}</span>
              </td>
              <td className="py-1.5 px-2.5 border-r border-slate-200">
                {hito.quickStamp && (
                  <span className="font-black text-[#b45309] block uppercase text-[8.5px] mb-0.5">
                    [ {hito.quickStamp} ]
                  </span>
                )}
                <span className="text-slate-800 leading-snug block line-clamp-3">
                  {hito.instruction}
                </span>
              </td>
              <td className="py-1.5 px-1.5 text-center border-r border-slate-200 font-bold text-slate-600">
                {hito.docCount > 0 ? `${hito.docCount} PDF` : '0'}
              </td>
              <td className="py-1.5 px-1.5 text-center">
                {hito.signatureUrl ? (
                  <span className="text-[7.5px] bg-emerald-100 text-emerald-800 font-black px-1 py-0.5 rounded border border-emerald-300 block">
                    ✓ FIRMADO
                  </span>
                ) : hito.isInitialRadicacion ? (
                  <span className="text-[7.5px] bg-emerald-100 text-emerald-800 font-black px-1 py-0.5 rounded border border-emerald-300 block">
                    ✓ RADICADO
                  </span>
                ) : (
                  <span className="text-[7.5px] bg-slate-100 text-slate-600 font-bold px-1 py-0.5 rounded block">
                    Registrado
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Certificación Legal Institucional (al final del documento)
  const renderLegalCertification = () => (
    <div className="border-t-2 border-[#064e3b] mt-3 pt-2 text-[8.5px] text-slate-600 space-y-1">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="max-w-md leading-tight">
          <span className="font-bold text-slate-900 block">
            CERTIFICACIÓN INSTITUCIONAL DE TRAZABILIDAD & ARCHIVO DIGITAL
          </span>
          <span>
            El presente informe acredita formalmente la cadena de custodia del Expediente CHLS No.{' '}
            <strong>{item.hrCode}</strong>. Su autenticidad e integridad electrónica pueden ser verificadas
            en cualquier momento mediante el código QR oficial impreso o en la plataforma institucional.
          </span>
        </div>

        <div className="text-right">
          <div className="font-mono text-[8px] text-slate-500">
            HASH AUDITORÍA: {item.id.slice(0, 16).toUpperCase()}
          </div>
          <div className="text-[8px] text-[#064e3b] font-black uppercase mt-0.5">
            Club Hípico Los Sargentos • Bolivia
          </div>
        </div>
      </div>

      <div className="text-center text-[7.5px] text-slate-400 border-t border-slate-200 pt-0.5">
        Documento Oficial Generado Automáticamente por SICAD CHLS • Validez Legal Institucional Interna
      </div>
    </div>
  );

  // Pie de Página para cada Hoja Carta
  const renderPageFooter = (pageNumber: number, isLastPage: boolean) => (
    <div className="pt-2 mt-auto">
      {!isLastPage && (
        <div className="text-right text-[8.5px] font-bold text-[#b45309] italic mb-1">
          Continúa en la Hoja {pageNumber + 1} ➔
        </div>
      )}
      <div className="flex items-center justify-between text-[8px] text-slate-400 border-t border-slate-200 pt-1.5 font-mono">
        <span>SICAD • Club Hípico Los Sargentos</span>
        <span className="font-bold text-slate-600">
          Hoja {pageNumber} de {totalPages}
        </span>
        <span>Formato Oficial Papel Bond Tamaño Carta</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex justify-center items-start p-2 sm:p-4 lg:p-6 animate-fadeIn">
      {/* Contenedor Principal del Modal */}
      <div className="bg-slate-900 border-2 border-slate-700 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Barra Superior de Control y Formato (No se imprime) */}
        <div className="px-5 sm:px-7 py-4 border-b border-white/10 flex justify-between items-center bg-[#07130e] flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="CHLS" className="w-9 h-9 object-contain shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black text-emerald-300 bg-emerald-950 px-2.5 py-0.5 rounded-lg border border-emerald-500/40">
                  {item.hrCode}
                </span>
                <span className="text-xs text-slate-400 font-bold hidden sm:inline">
                  • Reporte Oficial de Trazabilidad 360°
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-white mt-0.5">
                Imprimir Trazabilidad & Cadena de Custodia ({totalPages} {totalPages === 1 ? 'Hoja' : 'Hojas'} Carta)
              </h3>
            </div>
          </div>

          {/* Selector de Formato & Botones de Acción */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-brand-gold/40 text-brand-gold text-xs font-black tracking-wide">
              <span>📄 Formato: Papel Bond Tamaño Carta (21.59 × 27.94 cm)</span>
            </div>

            <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat('TABLE_ONLY')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  printFormat === 'TABLE_ONLY'
                    ? 'bg-brand-gold text-slate-950 font-black shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Solo la tabla ejecutiva paginada en tamaño Carta"
              >
                <Table className="w-3.5 h-3.5 inline mr-1" />
                Tabla
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('HYBRID')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  printFormat === 'HYBRID'
                    ? 'bg-brand-gold text-slate-950 font-black shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Incluye la tabla ejecutiva y las fichas detalladas de actuaciones"
              >
                📑 Completo
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('LIST_ONLY')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  printFormat === 'LIST_ONLY'
                    ? 'bg-brand-gold text-slate-950 font-black shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Solo la lista detallada de actuaciones con rúbricas"
              >
                <ListFilter className="w-3.5 h-3.5 inline mr-1" />
                Lista
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>🖨️ Imprimir Timeline (Carta)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenedor Visual de las Hojas de Impresión (Scrollable Preview Multipage) */}
        <div className="p-4 sm:p-8 overflow-y-auto max-h-[82vh] bg-slate-950/80 flex flex-col items-center">
          {/* CONTENEDOR MULTIPÁGINA PARA IMPRESIÓN LIMPIA */}
          <div
            id="printable-timeline-document"
            className="w-full max-w-[216mm] mx-auto space-y-8 flex flex-col items-center"
          >
            {/* =================================================================== */}
            {/* CASO A / C: TABLA CRONOLÓGICA (PAGINADA EN HOJAS CARTA INDIVIDUALES) */}
            {/* =================================================================== */}
            {(printFormat === 'TABLE_ONLY' || printFormat === 'HYBRID') &&
              tablePages.map((pageHitos, pageIdx) => {
                const pageNumber = pageIdx + 1;
                const isFirstPage = pageIdx === 0;
                const isLastTablePage = pageIdx === tablePages.length - 1;
                const isFinalOverallPage = isLastTablePage && printFormat === 'TABLE_ONLY';

                return (
                  <div key={`table-page-${pageIdx}`} className="w-full flex flex-col items-center">
                    {/* Badge indicador de Hoja Física */}
                    <div className="mb-2 text-[11px] font-mono font-bold text-slate-300 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 shadow-sm print:hidden">
                      📄 Hoja {pageNumber} de {totalPages} —{' '}
                      {isFirstPage ? 'Apertura & Tabla de Trazabilidad' : 'Continuación de Trazabilidad'}
                    </div>

                    {/* HOJA FÍSICA TAMAÑO CARTA */}
                    <div
                      className="printable-timeline-page w-full min-h-[279.4mm] max-w-[215.9mm] bg-white text-slate-900 p-8 sm:p-10 shadow-2xl rounded-sm border border-slate-200 font-sans text-xs flex flex-col justify-between"
                      style={{ minHeight: '279.4mm', boxSizing: 'border-box' }}
                    >
                      <div className="w-full flex flex-col flex-1">
                        {/* 1. Encabezado */}
                        {isFirstPage ? renderHeaderFull(pageNumber) : renderHeaderContinuation(pageNumber)}

                        {/* 2. Ficha Resumen (Solo en Hoja 1) */}
                        {isFirstPage && renderResumenExpediente()}

                        {/* 3. Tabla de Hitos correspondiente a esta hoja */}
                        {renderHitosTable(pageHitos, !isFirstPage)}

                        {/* 4. Certificación Legal (En la última hoja de tabla si no hay fichas) */}
                        {isFinalOverallPage && renderLegalCertification()}
                      </div>

                      {/* 5. Pie de Página */}
                      {renderPageFooter(pageNumber, isFinalOverallPage)}
                    </div>
                  </div>
                );
              })}

            {/* =================================================================== */}
            {/* CASO B / C: FICHAS DETALLADAS DE ACTUACIONES (CARDS CON RÚBRICAS)   */}
            {/* =================================================================== */}
            {(printFormat === 'LIST_ONLY' || printFormat === 'HYBRID') &&
              cardPages.map((pageCards, cardPageIdx) => {
                const pageNumber =
                  printFormat === 'LIST_ONLY'
                    ? cardPageIdx + 1
                    : tablePages.length + cardPageIdx + 1;
                const isFirstPage = printFormat === 'LIST_ONLY' && cardPageIdx === 0;
                const isFinalOverallPage = cardPageIdx === cardPages.length - 1;

                return (
                  <div key={`card-page-${cardPageIdx}`} className="w-full flex flex-col items-center">
                    {/* Badge indicador de Hoja Física */}
                    <div className="mb-2 text-[11px] font-mono font-bold text-slate-300 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 shadow-sm print:hidden">
                      📄 Hoja {pageNumber} de {totalPages} — Fichas Detalladas de Actuaciones
                    </div>

                    {/* HOJA FÍSICA TAMAÑO CARTA */}
                    <div
                      className="printable-timeline-page w-full min-h-[279.4mm] max-w-[215.9mm] bg-white text-slate-900 p-8 sm:p-10 shadow-2xl rounded-sm border border-slate-200 font-sans text-xs flex flex-col justify-between"
                      style={{ minHeight: '279.4mm', boxSizing: 'border-box' }}
                    >
                      <div className="w-full flex flex-col flex-1">
                        {/* 1. Encabezado */}
                        {isFirstPage ? renderHeaderFull(pageNumber) : renderHeaderContinuation(pageNumber)}

                        {/* 2. Ficha Resumen si es LIST_ONLY en Hoja 1 */}
                        {isFirstPage && renderResumenExpediente()}

                        {/* 3. Título de Sección */}
                        <div className="flex items-center justify-between pb-1 mb-2 border-b border-[#064e3b]/30">
                          <h2 className="text-[10.5px] font-black uppercase tracking-wider text-[#064e3b] flex items-center gap-1">
                            <ListFilter className="w-3 h-3 text-[#b45309]" />
                            <span>
                              Ficha Cronológica Detallada de Actuaciones (Paso{' '}
                              {pageCards[0]?.sequenceNumber} a{' '}
                              {pageCards[pageCards.length - 1]?.sequenceNumber})
                            </span>
                          </h2>
                        </div>

                        {/* 4. Lista de Fichas para esta página */}
                        <div className="space-y-2.5 flex-1">
                          {pageCards.map((hito) => (
                            <div
                              key={hito.sequenceNumber}
                              className="border border-slate-300 rounded-lg p-2.5 bg-slate-50/70 text-[9.5px]"
                            >
                              <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`w-4 h-4 rounded-full text-white flex items-center justify-center font-bold text-[9px] ${
                                      hito.sequenceNumber === 0 ? 'bg-[#064e3b]' : 'bg-[#b45309]'
                                    }`}
                                  >
                                    {hito.sequenceNumber}
                                  </span>
                                  <span className="font-black text-slate-900 uppercase text-[10px]">
                                    {hito.sequenceNumber === 0
                                      ? 'Radicación Inicial del Trámite'
                                      : `Paso #${hito.sequenceNumber}: ${hito.sourceArea} ➔ ${hito.targetArea}`}
                                  </span>
                                </div>
                                <span className="font-mono text-[8.5px] text-slate-600 font-bold">
                                  {hito.date} • {hito.time}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[9px] mb-1.5">
                                <div>
                                  <span className="text-slate-500 font-semibold block">Despachado Por:</span>
                                  <strong className="text-slate-900 block truncate">{hito.sourceArea}</strong>
                                  <span className="text-slate-600 text-[8.5px] truncate block">
                                    {hito.sourcePerson}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500 font-semibold block">Destinatario / Titular:</span>
                                  <strong className="text-[#064e3b] block truncate">{hito.targetArea}</strong>
                                  <span className="text-slate-600 text-[8.5px] truncate block">
                                    {hito.targetPerson}
                                  </span>
                                </div>
                              </div>

                              {hito.quickStamp && (
                                <div className="mb-1">
                                  <span className="bg-[#b45309]/15 text-[#b45309] font-black px-1.5 py-0.5 rounded text-[8.5px] inline-block border border-[#b45309]/30">
                                    {hito.quickStamp}
                                  </span>
                                </div>
                              )}

                              <div className="bg-white p-2 rounded border border-slate-200 text-[9.5px] text-slate-800 italic mb-1.5">
                                "{hito.instruction}"
                              </div>

                              <div className="flex items-center justify-between text-[8.5px] pt-0.5">
                                <div className="flex items-center gap-1 text-slate-600">
                                  <Paperclip className="w-3 h-3 text-slate-400" />
                                  <span>{hito.docCount > 0 ? `${hito.docCount} documento(s) PDF adjuntos` : 'Sin adjuntos'}</span>
                                </div>
                                <div>
                                  {hito.signatureUrl ? (
                                    <span className="text-emerald-800 font-bold flex items-center gap-1">
                                      ✓ Rúbrica Digitalizada Registrada
                                    </span>
                                  ) : hito.isInitialRadicacion ? (
                                    <span className="text-emerald-800 font-bold">
                                      ✓ Radicación Aprobada
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">Rúbrica en archivo físico</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* 5. Certificación Legal al final de la última página */}
                        {isFinalOverallPage && renderLegalCertification()}
                      </div>

                      {/* 6. Pie de Página */}
                      {renderPageFooter(pageNumber, isFinalOverallPage)}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableTimelineReportModal;
