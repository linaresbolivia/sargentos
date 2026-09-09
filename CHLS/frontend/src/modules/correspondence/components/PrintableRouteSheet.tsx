import React, { useState } from 'react';
import { RouteSheetItem } from '../types/correspondence.types';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer,
  X,
  Tag,
  FileText,
  RotateCw,
  Copy,
  Layers,
  CheckCircle2,
  FolderArchive,
  Building2,
  Calendar,
  Clock,
} from 'lucide-react';
import logoUrl from '../../../assets/logo.png';

interface PrintableRouteSheetProps {
  item: RouteSheetItem;
  onClose: () => void;
}

export type PrintPageMode = 'FRONT_ONLY' | 'BACK_ONLY' | 'DUPLEX_FULL' | 'STICKER_LABEL';

export const PrintableRouteSheet: React.FC<PrintableRouteSheetProps> = ({ item, onClose }) => {
  const [pageMode, setPageMode] = useState<PrintPageMode>('DUPLEX_FULL');

  const handlePrint = () => {
    // Motor de Impresión Aislado: Garantiza un documento 100% limpio, centrado y sin elementos de la app
    const printContent = document.getElementById('printable-routesheet-container');
    if (!printContent) {
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

    // Copiar todos los estilos del documento principal
    const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((node) => node.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Hoja de Ruta ${item.hrCode} - CHLS</title>
          ${styleTags}
          <style>
            @page {
              size: letter portrait; /* Formato Oficial CHLS: Papel Bond Tamaño Carta (8.5" x 11" / 215.9mm x 279.4mm) */
              margin: 5mm 7mm;
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
              -webkit-font-smoothing: antialiased;
            }
            .page-break-after {
              page-break-after: always !important;
              break-after: page !important;
            }
            .printable-sheet-page {
              width: 100% !important;
              max-width: 201mm !important;
              height: 268mm !important;
              max-height: 268mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              box-shadow: none !important;
              border: none !important;
              overflow: hidden !important;
              box-sizing: border-box !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
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

  // Helper de formateo de fecha: "14 AGO 2026"
  const formatChlsDate = (dateStr?: string | null) => {
    if (!dateStr) return '__ / __ / ____';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '__ / __ / ____';
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Helper de formateo de hora: "10:30"
  const formatChlsTime = (dateStr?: string | null) => {
    if (!dateStr) return '__ : __';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '__ : __';
    return d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const movements = item.movements || [];
  const documents = item.documents || [];

  // Proveídos del Anverso: Proveídos 1 al 4
  const frontSlots = Array.from({ length: 4 }, (_, i) => movements[i] || null);

  // Proveídos del Reverso: Proveídos 5 al 8
  const backSlots = Array.from({ length: 4 }, (_, i) => movements[i + 4] || null);

  // URL de verificación en vivo del QR
  const verificationUrl = `${window.location.origin}/correspondencia?code=${encodeURIComponent(item.hrCode)}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md flex flex-col items-center justify-start p-3 sm:p-6 print:p-0 print:bg-white print:static print:inset-auto">
      
      {/* ========================================================================= */}
      {/* BARRA DE HERRAMIENTAS DE IMPRESIÓN (OCULTA AL IMPRIMIR)                   */}
      {/* ========================================================================= */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 print:hidden bg-slate-900/95 border-2 border-emerald-500/40 p-2 rounded-2xl shadow-2xl backdrop-blur-xl max-w-[95vw] flex-wrap justify-center">
        
        {/* Badge Informativo de Formato Bond Carta */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-brand-gold/40 text-brand-gold text-xs font-black tracking-wide">
          <span>📄 Formato: Papel Bond Tamaño Carta (21.59 × 27.94 cm)</span>
        </div>

        {/* Selector de Modos de Impresión */}
        <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/10 text-xs font-black gap-1">
          <button
            type="button"
            onClick={() => setPageMode('FRONT_ONLY')}
            title="Imprimir únicamente el Anverso (Carátula Carta)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              pageMode === 'FRONT_ONLY'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>1. Anverso (Carta)</span>
          </button>

          <button
            type="button"
            onClick={() => setPageMode('BACK_ONLY')}
            title="Imprimir únicamente el Reverso (Proveídos Carta)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              pageMode === 'BACK_ONLY'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>2. Reverso (Carta)</span>
          </button>

          <button
            type="button"
            onClick={() => setPageMode('DUPLEX_FULL')}
            title="Imprimir Hoja Completa (Anverso + Reverso Dúplex Carta)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              pageMode === 'DUPLEX_FULL'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-brand-gold" />
            <span>3. Dúplex Completo (Carta)</span>
          </button>

          <button
            type="button"
            onClick={() => setPageMode('STICKER_LABEL')}
            title="Imprimir Rótulo / Sticker Adhesivo"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              pageMode === 'STICKER_LABEL'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Sticker QR</span>
          </button>
        </div>

        {/* Botón Principal de Impresión */}
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-gradient-to-r from-brand-gold to-yellow-500 hover:from-yellow-400 hover:to-yellow-500 text-slate-950 font-black px-5 py-2 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer text-xs uppercase tracking-wider"
        >
          <Printer className="w-4 h-4 text-slate-950" />
          <span>🖨️ Imprimir Hoja de Ruta (Carta)</span>
        </button>

        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          title="Cerrar ventana de impresión"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Espaciador para la barra fija */}
      <div className="h-20 print:hidden w-full shrink-0" />

      <div id="printable-routesheet-container" className="w-full max-w-[216mm] mx-auto space-y-8 print:space-y-0 print:m-0 print:p-0 flex flex-col items-center">

        {/* ========================================================================= */}
        {/* PÁGINA 1: ANVERSO DE LA HOJA DE RUTA (CARÁTULA OFICIAL)                   */}
        {/* ========================================================================= */}
        {(pageMode === 'FRONT_ONLY' || pageMode === 'DUPLEX_FULL') && (
          <div className={`printable-sheet-page bg-white text-black w-full min-h-[279.4mm] max-w-[215.9mm] p-6 sm:p-7 shadow-2xl rounded-sm font-sans text-xs print:shadow-none print:p-0 print:m-0 print:w-full print:rounded-none ${
            pageMode === 'DUPLEX_FULL' ? 'page-break-after' : ''
          }`}>
            
            {/* Header Oficial con Membrete y QR de Validación */}
            <div className="flex items-center justify-between pb-2 mb-1 border-b-2 border-black relative">
              <div className="flex items-center gap-3">
                <div className="w-14 h-16 shrink-0">
                  <img src={logoUrl} alt="Club Hípico Los Sargentos" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h2 className="text-[12px] font-black tracking-widest text-slate-800 uppercase leading-tight">
                    CLUB HÍPICO
                  </h2>
                  <h1 className="text-[15px] font-black tracking-widest text-slate-950 uppercase leading-none font-serif">
                    LOS SARGENTOS
                  </h1>
                  <span className="text-[8.5px] font-bold text-slate-600 uppercase tracking-tight block mt-0.5">
                    Sistema Oficial de Correspondencia & Gestión Documental
                  </span>
                </div>
              </div>

              {/* Título Central */}
              <div className="text-center px-4">
                <div className="bg-[#1c2e24] text-white px-5 py-1 rounded font-black text-sm tracking-widest uppercase border border-black shadow-xs">
                  HOJA DE RUTA
                </div>
                <span className="text-[8px] font-mono font-bold text-slate-700 uppercase block mt-0.5">
                  ANVERSO (ORIGINAL)
                </span>
              </div>

              {/* Código QR de Validación Institucional */}
              <div className="flex flex-col items-center shrink-0">
                <div className="p-1 border-2 border-black rounded bg-white shadow-2xs">
                  <QRCodeSVG value={verificationUrl} size={54} level="M" />
                </div>
                <span className="text-[7px] text-slate-800 font-mono mt-0.5 font-black uppercase">
                  Validador QR
                </span>
              </div>
            </div>

            {/* Cuadrícula de Datos de Radicación del Documento */}
            <div className="border-2 border-black mb-1.5 divide-y-2 border-collapse divide-black text-[11px]">
              
              {/* Fila 1: Código HR | Fecha de Ingreso | Hora | Prioridad */}
              <div className="grid grid-cols-12 divide-x-2 divide-black min-h-[38px]">
                <div className="col-span-5 p-1.5 flex flex-col justify-center bg-slate-50">
                  <span className="text-[8.5px] font-black text-slate-700 uppercase">N° de Hoja de Ruta</span>
                  <span className="font-mono font-black text-base text-emerald-950 tracking-wider">
                    {item.hrCode}
                  </span>
                </div>
                <div className="col-span-3 p-1.5 flex flex-col justify-center">
                  <span className="text-[8.5px] font-black text-slate-700 uppercase">Fecha de Ingreso</span>
                  <span className="font-mono font-bold text-xs">
                    {formatChlsDate(item.createdAt)}
                  </span>
                </div>
                <div className="col-span-2 p-1.5 flex flex-col justify-center">
                  <span className="text-[8.5px] font-black text-slate-700 uppercase">Hora</span>
                  <span className="font-mono font-bold text-xs">
                    {formatChlsTime(item.createdAt)}
                  </span>
                </div>
                <div className="col-span-2 p-1.5 flex flex-col justify-center text-center bg-slate-50">
                  <span className="text-[8.5px] font-black text-slate-700 uppercase">Prioridad</span>
                  <span className="font-black text-[10px] uppercase">
                    {item.priority === 'URGENTE' ? '🔴 URGENTE' : item.priority === 'ALTA' ? '🟡 ALTA' : '🟢 NORMAL'}
                  </span>
                </div>
              </div>

              {/* Fila 2: Remitente | Procedencia / Tipo */}
              <div className="grid grid-cols-12 divide-x-2 divide-black min-h-[42px]">
                <div className="col-span-7 p-1.5 flex flex-col justify-center">
                  <span className="text-[8.5px] font-black text-slate-700 uppercase">Remitente</span>
                  <span className="font-black text-xs uppercase leading-tight">
                    {item.senderName}
                  </span>
                  {item.senderDoc && (
                    <span className="text-[9px] text-slate-600 font-mono">
                      C.I. / NIT: {item.senderDoc}
                    </span>
                  )}
                </div>
                <div className="col-span-5 p-1.5 flex flex-col justify-center">
                  <span className="text-[8.5px] font-black text-slate-700 uppercase">Procedencia / Área</span>
                  <span className="font-bold text-xs uppercase leading-tight">
                    {item.senderArea || (item.senderType === 'SOCIO' ? 'SOCIO TITULAR CHLS' : 'EXTERNO')}
                  </span>
                </div>
              </div>

              {/* Fila 3: CITE | N° de Fojas | Cantidad de Adjuntos */}
              <div className="grid grid-cols-12 divide-x-2 divide-black min-h-[36px]">
                <div className="col-span-6 p-1.5 flex flex-col justify-center">
                  <span className="text-[8.5px] font-black text-slate-700 uppercase">CITE Oficial / Nota N°</span>
                  <span className="font-mono font-bold text-xs">
                    {item.cite || 'S/N'}
                  </span>
                </div>
                <div className="col-span-3 p-1.5 flex flex-col justify-center text-center">
                  <span className="text-[8.5px] font-black text-slate-700 uppercase">N° de Fojas</span>
                  <span className="font-mono font-black text-xs">
                    {item.pageCount || 1} Folio(s)
                  </span>
                </div>
                <div className="col-span-3 p-1.5 flex flex-col justify-center text-center">
                  <span className="text-[8.5px] font-black text-slate-700 uppercase">Anexos Digitales</span>
                  <span className="font-mono font-bold text-xs">
                    {documents.length} Archivo(s)
                  </span>
                </div>
              </div>

              {/* Fila 4: Referencia / Asunto */}
              <div className="p-2 min-h-[46px] flex flex-col justify-center bg-slate-50/50">
                <span className="text-[8.5px] font-black text-slate-700 uppercase">Referencia / Asunto</span>
                <span className="font-black text-xs uppercase leading-snug text-slate-950">
                  {item.reference}
                </span>
              </div>

              {/* Fila 5: Descripción de Adjuntos Físicos */}
              <div className="p-1.5 min-h-[32px] flex flex-col justify-center">
                <span className="text-[8.5px] font-black text-slate-700 uppercase">Documentos y Anexos Físicos Acompañantes</span>
                <span className="text-[10.5px] uppercase font-medium">
                  {item.attachmentDescription || 'Sin anexos físicos complementarios.'}
                </span>
              </div>
            </div>

            {/* PROVEÍDOS Y DERIVACIONES DEL ANVERSO (Proveídos 1 al 4) */}
            <div className="border-2 border-black divide-y-2 divide-black">
              {frontSlots.map((mov, index) => {
                const proveidoNum = index + 1;
                return (
                  <div key={mov?.id || index} className="min-h-[125px] p-2 flex flex-col justify-between relative">
                    
                    {/* Encabezado del Proveído */}
                    <div className="grid grid-cols-12 border-b border-slate-400 pb-1 mb-1 text-[10px] items-center">
                      <div className="col-span-1 font-black bg-black text-white text-center py-0.5 rounded text-[9px]">
                        N° {proveidoNum}
                      </div>
                      <div className="col-span-6 pl-2 font-black uppercase truncate">
                        A: <span className="underline decoration-1 underline-offset-2">{mov?.targetPersonName ? `${mov.targetPersonName} (${mov.targetArea})` : mov?.targetArea || '__________________________________'}</span>
                      </div>
                      <div className="col-span-3 text-center text-[9.5px]">
                        Fecha: <span className="font-mono font-bold">{formatChlsDate(mov?.createdAt)}</span>
                      </div>
                      <div className="col-span-2 text-right text-[9.5px]">
                        Hora: <span className="font-mono font-bold">{formatChlsTime(mov?.createdAt)}</span>
                      </div>
                    </div>

                    {/* Cuerpo de Instrucción / Proveído */}
                    {mov ? (
                      <div className="flex-1 flex justify-between gap-3">
                        <div className="flex-1">
                          {mov.quickStamp && (
                            <div className="inline-block px-2 py-0.5 mb-1 border-2 border-emerald-700 text-emerald-800 font-black text-[10px] rounded uppercase">
                              {mov.quickStamp}
                            </div>
                          )}
                          <p className="text-[10.5px] text-slate-900 font-medium whitespace-pre-wrap leading-relaxed">
                            {mov.instruction}
                          </p>
                          {(() => {
                            const movDocs = (mov.documents && mov.documents.length > 0)
                              ? mov.documents
                              : (item.documents || []).filter((d) => d.movementId === mov.id);
                            if (movDocs.length === 0) return null;
                            return (
                              <div className="mt-1 pt-1 border-t border-slate-300 flex items-center gap-1.5 text-[8.5px] text-slate-700 font-bold flex-wrap">
                                <span className="text-emerald-900 font-black">📎 Adjuntos ({movDocs.length}):</span>
                                {movDocs.map((doc, di) => (
                                  <span key={doc.id || di} className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-300">
                                    {doc.fileName} {doc.fileSize ? `(${(doc.fileSize / 1024 / 1024).toFixed(1)}MB)` : ''}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Sello y Firma del Remitente */}
                        <div className="w-48 text-right flex flex-col items-end justify-end shrink-0">
                          {mov.signatureUrl ? (
                            <div className="flex flex-col items-center">
                              <img src={mov.signatureUrl} alt="Firma/Sello" className="max-h-12 max-w-[130px] object-contain mb-0.5" />
                              <span className="text-[7px] font-bold text-blue-900 uppercase">
                                ✓ Firma Digital CHLS
                              </span>
                            </div>
                          ) : (
                            <div className="border-t border-slate-500 w-36 pt-1 text-center">
                              <div className="font-black text-[9px] text-slate-900 leading-tight">
                                {mov.sourceUser ? `${mov.sourceUser.firstName} ${mov.sourceUser.lastName}` : 'DESPACHO OFICIAL'}
                              </div>
                              <div className="text-[8px] font-bold text-slate-700 uppercase leading-tight">
                                {mov.sourceArea || 'GERENCIA GENERAL'}
                              </div>
                              <div className="text-[6.5px] text-slate-500 font-bold">
                                CLUB HÍPICO LOS SARGENTOS
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Casilla en blanco para proveído físico */
                      <div className="flex-1 flex justify-between items-end text-slate-400 pt-8">
                        <div className="text-[8.5px] italic">
                          Espacio reservado para instrucción / proveído N° {proveidoNum}
                        </div>
                        <div className="w-36 border-t border-dotted border-slate-400 pt-1 text-center text-[8px] text-slate-500">
                          Firma y Sello de Despacho
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pie de Página del Anverso */}
            <div className="mt-2 pt-1 border-t-2 border-black flex justify-between items-center text-[8px] text-slate-600 font-mono">
              <div className="flex items-center gap-2">
                <span className="font-bold text-black uppercase">🔒 HOJA DE RUTA OFICIAL CHLS — PAPEL BOND TAMAÑO CARTA — ANVERSO</span>
                <span>• Cero Papel</span>
                <span>• Validez Legal Institucional</span>
              </div>
              <div>
                <span>Impresión: {formatChlsDate(new Date().toISOString())} {formatChlsTime(new Date().toISOString())}</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PÁGINA 2: REVERSO DE LA HOJA DE RUTA (CONTINUACIÓN DE PROVEÍDOS & ARCHIVO) */}
        {/* ========================================================================= */}
        {(pageMode === 'BACK_ONLY' || pageMode === 'DUPLEX_FULL') && (
          <div className="printable-sheet-page bg-white text-black w-full min-h-[279.4mm] max-w-[215.9mm] p-6 sm:p-7 shadow-2xl rounded-sm font-sans text-xs print:shadow-none print:p-0 print:m-0 print:w-full print:rounded-none">
            
            {/* Header del Reverso */}
            <div className="flex items-center justify-between pb-2 mb-1.5 border-b-2 border-black">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-12 shrink-0">
                  <img src={logoUrl} alt="Club Hípico Los Sargentos" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-[11px] font-black tracking-widest text-slate-900 uppercase leading-none font-serif">
                    CLUB HÍPICO LOS SARGENTOS
                  </h3>
                  <span className="text-[8px] font-bold text-slate-600 uppercase block mt-0.5">
                    Hoja de Ruta — Reverso (Continuación de Proveídos y Archivo Final)
                  </span>
                </div>
              </div>

              {/* Código HR y CITE */}
              <div className="text-right">
                <span className="text-[8.5px] font-black text-slate-600 uppercase block">Hoja de Ruta</span>
                <span className="font-mono font-black text-sm text-emerald-950 tracking-wider">
                  {item.hrCode}
                </span>
                {item.cite && (
                  <span className="text-[8px] font-mono text-slate-600 block">
                    CITE: {item.cite}
                  </span>
                )}
              </div>
            </div>

            {/* PROVEÍDOS SUCESIVOS DEL REVERSO (Proveídos 5 al 8) */}
            <div className="border-2 border-black divide-y-2 divide-black mb-3">
              {backSlots.map((mov, index) => {
                const proveidoNum = index + 5;
                return (
                  <div key={mov?.id || index} className="min-h-[120px] p-2 flex flex-col justify-between relative">
                    
                    {/* Encabezado del Proveído */}
                    <div className="grid grid-cols-12 border-b border-slate-400 pb-1 mb-1 text-[10px] items-center">
                      <div className="col-span-1 font-black bg-slate-800 text-white text-center py-0.5 rounded text-[9px]">
                        N° {proveidoNum}
                      </div>
                      <div className="col-span-6 pl-2 font-black uppercase truncate">
                        A: <span className="underline decoration-1 underline-offset-2">{mov?.targetPersonName ? `${mov.targetPersonName} (${mov.targetArea})` : mov?.targetArea || '__________________________________'}</span>
                      </div>
                      <div className="col-span-3 text-center text-[9.5px]">
                        Fecha: <span className="font-mono font-bold">{formatChlsDate(mov?.createdAt)}</span>
                      </div>
                      <div className="col-span-2 text-right text-[9.5px]">
                        Hora: <span className="font-mono font-bold">{formatChlsTime(mov?.createdAt)}</span>
                      </div>
                    </div>

                    {/* Cuerpo de Instrucción / Proveído */}
                    {mov ? (
                      <div className="flex-1 flex justify-between gap-3">
                        <div className="flex-1">
                          {mov.quickStamp && (
                            <div className="inline-block px-2 py-0.5 mb-1 border-2 border-emerald-700 text-emerald-800 font-black text-[10px] rounded uppercase">
                              {mov.quickStamp}
                            </div>
                          )}
                          <p className="text-[10.5px] text-slate-900 font-medium whitespace-pre-wrap leading-relaxed">
                            {mov.instruction}
                          </p>
                          {(() => {
                            const movDocs = (mov.documents && mov.documents.length > 0)
                              ? mov.documents
                              : (item.documents || []).filter((d) => d.movementId === mov.id);
                            if (movDocs.length === 0) return null;
                            return (
                              <div className="mt-1 pt-1 border-t border-slate-300 flex items-center gap-1.5 text-[8.5px] text-slate-700 font-bold flex-wrap">
                                <span className="text-emerald-900 font-black">📎 Adjuntos ({movDocs.length}):</span>
                                {movDocs.map((doc, di) => (
                                  <span key={doc.id || di} className="font-mono bg-slate-100 px-1 py-0.5 rounded border border-slate-300">
                                    {doc.fileName} {doc.fileSize ? `(${(doc.fileSize / 1024 / 1024).toFixed(1)}MB)` : ''}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Sello y Firma del Remitente */}
                        <div className="w-48 text-right flex flex-col items-end justify-end shrink-0">
                          {mov.signatureUrl ? (
                            <div className="flex flex-col items-center">
                              <img src={mov.signatureUrl} alt="Firma/Sello" className="max-h-12 max-w-[130px] object-contain mb-0.5" />
                              <span className="text-[7px] font-bold text-blue-900 uppercase">
                                ✓ Firma Digital CHLS
                              </span>
                            </div>
                          ) : (
                            <div className="border-t border-slate-500 w-36 pt-1 text-center">
                              <div className="font-black text-[9px] text-slate-900 leading-tight">
                                {mov.sourceUser ? `${mov.sourceUser.firstName} ${mov.sourceUser.lastName}` : 'DESPACHO OFICIAL'}
                              </div>
                              <div className="text-[8px] font-bold text-slate-700 uppercase leading-tight">
                                {mov.sourceArea || 'ÁREA INTERNA'}
                              </div>
                              <div className="text-[6.5px] text-slate-500 font-bold">
                                CLUB HÍPICO LOS SARGENTOS
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Casilla en blanco para proveído físico */
                      <div className="flex-1 flex justify-between items-end text-slate-400 pt-7">
                        <div className="text-[8.5px] italic">
                          Espacio reservado para instrucción / proveído N° {proveidoNum}
                        </div>
                        <div className="w-36 border-t border-dotted border-slate-400 pt-1 text-center text-[8px] text-slate-500">
                          Firma y Sello de Despacho
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* SECCIÓN OFICIAL DE CONCLUSIÓN Y ARCHIVO EN CUSTODIA DEFINITIVA */}
            <div className="border-2 border-black p-2.5 rounded bg-slate-50/70 space-y-2">
              <div className="flex items-center justify-between border-b-2 border-black pb-1">
                <div className="flex items-center gap-1.5 font-black uppercase text-[11px] text-slate-950">
                  <FolderArchive className="w-4 h-4 text-emerald-900" />
                  <span>AUTO DE CONCLUSIÓN Y ARCHIVO EN CUSTODIA DEFINITIVA (ARCHIVO CENTRAL)</span>
                </div>
                <span className="text-[9px] font-mono font-bold bg-black text-white px-2 py-0.5 rounded">
                  {item.status === 'CONCLUIDO' ? 'TRÁMITE CONCLUIDO' : 'EN PROCESO'}
                </span>
              </div>

              <div className="grid grid-cols-12 gap-2 text-[10px]">
                <div className="col-span-4 p-1.5 border border-black rounded bg-white">
                  <span className="font-black block text-[8.5px] text-slate-700 uppercase">Fecha de Archivo Definitivo</span>
                  <span className="font-mono font-bold">
                    {item.archivedAt ? formatChlsDate(item.archivedAt) : '__ / __ / ______'}
                  </span>
                </div>

                <div className="col-span-5 p-1.5 border border-black rounded bg-white">
                  <span className="font-black block text-[8.5px] text-slate-700 uppercase">Ubicación Topográfica / Estante</span>
                  <span className="font-bold uppercase">
                    {item.archiveLocation || '_________________________________'}
                  </span>
                </div>

                <div className="col-span-3 p-1.5 border border-black rounded bg-white">
                  <span className="font-black block text-[8.5px] text-slate-700 uppercase">Caja / Archivador</span>
                  <span className="font-bold uppercase">
                    {item.archiveBox || '____________'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2 text-[10px] items-end">
                <div className="col-span-8 p-1.5 border border-black rounded bg-white min-h-[48px]">
                  <span className="font-black block text-[8.5px] text-slate-700 uppercase">Observaciones / Motivo de Conclusión</span>
                  <span className="text-[10px] italic leading-tight block mt-0.5">
                    {item.archiveNotes || 'Trámite concluido formalmente y remitido a archivo pasivo para resguardo institucional.'}
                  </span>
                </div>

                <div className="col-span-4 text-center border border-black rounded bg-white p-1.5 min-h-[48px] flex flex-col justify-end">
                  <div className="border-t border-dotted border-black pt-0.5 text-[8px] font-bold uppercase text-slate-800">
                    Firma y Sello Responsable Archivo Central
                  </div>
                </div>
              </div>
            </div>

            {/* Pie de Página del Reverso */}
            <div className="mt-2 pt-1 border-t-2 border-black flex justify-between items-center text-[8px] text-slate-600 font-mono">
              <div className="flex items-center gap-2">
                <span className="font-bold text-black uppercase">🔒 HOJA DE RUTA OFICIAL CHLS — PAPEL BOND TAMAÑO CARTA — REVERSO</span>
                <span>• Archivo Central</span>
                <span>• Custodia Definitiva</span>
              </div>
              <div>
                <span>Página 2 / 2</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PÁGINA 3: MODO STICKER / RÓTULO QR ADHESIVO                               */}
        {/* ========================================================================= */}
        {pageMode === 'STICKER_LABEL' && (
          <div className="printable-sheet-page bg-white text-black w-full max-w-[95mm] min-h-[55mm] p-4 shadow-2xl rounded-xl border-2 border-black font-sans text-xs mx-auto print:border-none print:shadow-none print:p-2">
            <div className="border-2 border-black p-3 rounded-lg flex items-center gap-3">
              {/* QR Code */}
              <div className="p-1 bg-white border border-black rounded shrink-0">
                <QRCodeSVG value={verificationUrl} size={70} level="M" />
              </div>

              {/* Contenido del Sticker */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between border-b border-black pb-0.5">
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-800">CHLS CORRESPONDENCIA</span>
                  <span className="text-[7.5px] font-mono text-slate-600">{formatChlsDate(item.createdAt)}</span>
                </div>

                <div>
                  <span className="text-[8px] font-bold text-slate-500 uppercase block">N° Hoja de Ruta:</span>
                  <span className="text-base font-black font-mono text-emerald-950 tracking-wide block leading-none">
                    {item.hrCode}
                  </span>
                </div>

                <div className="text-[8.5px] leading-tight text-slate-900">
                  <span className="font-bold">Remitente:</span> <span className="truncate block font-medium uppercase">{item.senderName}</span>
                  {item.cite && <span className="font-mono text-[8px] block">CITE: {item.cite} • {item.pageCount || 1} fojas</span>}
                </div>

                <div className="pt-0.5 border-t border-dotted border-slate-400 text-[7px] text-slate-500 font-mono flex items-center justify-between">
                  <span>🛡️ SHA-256 Certificado</span>
                  <span>Radicado en CHLS</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PrintableRouteSheet;
