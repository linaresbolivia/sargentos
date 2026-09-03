import React, { useState } from 'react';
import { RouteSheetItem, HrMovement, CorrDocument } from '../types/correspondence.types';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer,
  Download,
  X,
  FileText,
  CheckCircle2,
  Building2,
  User,
  Clock,
  ArrowRight,
  Paperclip,
  ShieldCheck,
  Table,
  ListFilter,
  Sparkles,
  Stamp,
  Calendar,
  Layers,
  FileCheck,
  Check,
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

export const PrintableTimelineReportModal: React.FC<PrintableTimelineReportModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const [printFormat, setPrintFormat] = useState<TimelinePrintFormat>('HYBRID');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  if (!isOpen) return null;

  const movements: HrMovement[] = item.movements || [];

  // Calcular hitos ordenados cronológicamente
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

    // Copiar estilos de la app para que Tailwind y clases de impresión funcionen idénticas
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
              margin: 8mm 10mm 10mm 10mm;
            }
            *, *::before, *::after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
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
            .page-break-inside-avoid {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .page-break-after {
              page-break-after: always !important;
              break-after: page !important;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
            }
          </style>
        </head>
        <body>
          <div style="width: 100%; max-width: 210mm; margin: 0 auto; background: #ffffff;">
            ${printElement.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                setTimeout(function() {
                  window.frameElement.parentNode.removeChild(window.frameElement);
                }, 1000);
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      toast.loading('Generando reporte PDF institucional...', { id: 'pdf-timeline-download' });

      const response = await api.get(`/correspondence/route-sheets/${item.id}/timeline-pdf`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Trazabilidad_${item.hrCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast.success('¡PDF de Trazabilidad descargado con éxito!', { id: 'pdf-timeline-download' });
    } catch {
      // Fallback a impresión nativa si no existe endpoint específico
      toast.dismiss('pdf-timeline-download');
      handlePrint();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

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
                Imprimir Trazabilidad & Cadena de Custodia
              </h3>
            </div>
          </div>

          {/* Selector de Formato & Botones de Acción */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat('HYBRID')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  printFormat === 'HYBRID'
                    ? 'bg-brand-gold text-slate-950 font-black shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Incluye la tabla ejecutiva y la lista cronológica con proveídos"
              >
                📑 Completo
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('TABLE_ONLY')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  printFormat === 'TABLE_ONLY'
                    ? 'bg-brand-gold text-slate-950 font-black shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Solo la tabla ejecutiva resumida"
              >
                <Table className="w-3.5 h-3.5 inline mr-1" />
                Tabla
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('LIST_ONLY')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  printFormat === 'LIST_ONLY'
                    ? 'bg-brand-gold text-slate-950 font-black shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Solo la lista detallada de pasos"
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
              <span>Imprimir / Guardar PDF</span>
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

        {/* Contenedor Visual de la Hoja de Impresión (Scrollable Preview) */}
        <div className="p-4 sm:p-8 overflow-y-auto max-h-[82vh] bg-slate-950/60 flex justify-center">
          
          {/* HOJA DE PAPEL MEMBRETADO CHLS (ID: printable-timeline-document) */}
          <div
            id="printable-timeline-document"
            className="w-full max-w-[215mm] bg-white text-slate-900 p-8 sm:p-10 shadow-2xl rounded-sm border border-slate-200 text-xs font-sans leading-normal print:p-0 print:border-0 print:shadow-none"
            style={{ minHeight: '279mm' }}
          >
            
            {/* ========================================================================= */}
            {/* 1. ENCABEZADO INSTITUCIONAL CON LOGO CHLS Y QR DE AUTENTICIDAD             */}
            {/* ========================================================================= */}
            <div className="flex items-start justify-between border-b-2 border-[#064e3b] pb-4 mb-4">
              
              {/* Logo Oficial y Membrete */}
              <div className="flex items-center gap-4">
                <img
                  src={logoUrl}
                  alt="Club Hípico Los Sargentos"
                  className="w-20 h-20 object-contain shrink-0"
                />
                <div>
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-[#064e3b] uppercase leading-tight">
                    CLUB HÍPICO LOS SARGENTOS
                  </h1>
                  <span className="text-[11px] font-bold text-[#b45309] block uppercase tracking-wider">
                    Fundado en 1955 • La Paz, Bolivia
                  </span>
                  <span className="text-[10px] text-slate-600 font-semibold block mt-0.5">
                    Sistema de Correspondencia Institucional & Archivo Digital (SICAD)
                  </span>
                  <div className="mt-1 inline-block bg-[#064e3b]/10 text-[#064e3b] px-2.5 py-0.5 rounded font-black text-[11px] uppercase tracking-wide border border-[#064e3b]/20">
                    Informe Oficial de Trazabilidad & Cadena de Custodia 360°
                  </div>
                </div>
              </div>

              {/* Caja de Control, CITE, Código y QR de Verificación */}
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-right shrink-0">
                <div className="text-[10px] space-y-0.5">
                  <div>
                    <span className="text-slate-500 font-semibold">Hoja de Ruta:</span>
                    <strong className="block text-sm font-mono font-black text-[#064e3b]">
                      {item.hrCode}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold">CITE:</span>
                    <strong className="block font-mono font-bold text-slate-800">
                      {item.cite || 'S/N'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold">Fecha Emisión:</span>
                    <span className="block font-mono text-[9px] text-slate-700">
                      {new Date().toLocaleDateString('es-BO')} {new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="p-1 bg-white border border-slate-300 rounded shadow-xs">
                  <QRCodeSVG value={verificationUrl} size={62} level="M" />
                  <span className="block text-[7.5px] font-mono text-center text-slate-500 font-bold mt-0.5">
                    VALIDADO
                  </span>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 2. FICHA RESUMEN DEL EXPEDIENTE (DATOS GENERALES)                         */}
            {/* ========================================================================= */}
            <div className="bg-slate-50 border border-slate-300 rounded-lg p-3.5 mb-5 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-b border-slate-200 pb-2">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Remitente Original</span>
                  <strong className="text-[11px] text-slate-900 block truncate">{item.senderName}</strong>
                  <span className="text-[9.5px] text-slate-600 block">
                    {item.senderArea || (item.senderType === 'SOCIO' ? 'Socio CHLS' : 'Externo')}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Fecha Radicación</span>
                  <strong className="text-[11px] text-slate-900 block font-mono">
                    {formatDate(item.createdAt)} — {formatTime(item.createdAt)}
                  </strong>
                  <span className="text-[9.5px] text-slate-600 block">
                    {item.pageCount || 1} Folios / Fojas
                  </span>
                </div>

                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Custodia & Estado Actual</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="bg-[#064e3b] text-white px-2 py-0.5 rounded text-[10px] font-black uppercase">
                      {item.currentArea}
                    </span>
                    <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Referencia / Asunto Formal:</span>
                <p className="text-[11.5px] font-black text-slate-900 uppercase leading-snug">
                  {item.reference}
                </p>
                {item.archiveLocation && (
                  <p className="text-[9.5px] font-bold text-amber-800 mt-1 bg-amber-50 p-1 rounded border border-amber-200">
                    🏛️ Resguardo en Archivo Central: {item.archiveLocation} {item.archiveBox ? `(Caja: ${item.archiveBox})` : ''}
                  </p>
                )}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 3. FORMATO A: TABLA EJECUTIVA DE TRAZABILIDAD (TABULAR)                   */}
            {/* ========================================================================= */}
            {(printFormat === 'HYBRID' || printFormat === 'TABLE_ONLY') && (
              <div className="mb-6 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-[#064e3b]/30">
                  <h2 className="text-xs font-black uppercase tracking-wider text-[#064e3b] flex items-center gap-1.5">
                    <Table className="w-3.5 h-3.5 text-[#b45309]" />
                    <span>Tabla Cronológica de Derivaciones & Movimientos</span>
                  </h2>
                  <span className="text-[10px] font-bold text-slate-500">
                    Total Hitos: {sortedMovements.length + 1}
                  </span>
                </div>

                <table className="w-full border border-slate-300 text-[9.5px]">
                  <thead>
                    <tr className="bg-[#064e3b] text-white font-bold uppercase text-[9px]">
                      <th className="py-2 px-2 text-center border-r border-[#043d2e] w-8">#</th>
                      <th className="py-2 px-2.5 text-left border-r border-[#043d2e] w-24">Fecha / Hora</th>
                      <th className="py-2 px-2.5 text-left border-r border-[#043d2e] w-36">Origen ➔ Destino</th>
                      <th className="py-2 px-2.5 text-left border-r border-[#043d2e] w-28">Responsable</th>
                      <th className="py-2 px-3 text-left border-r border-[#043d2e]">Instrucción / Proveído</th>
                      <th className="py-2 px-2 text-center border-r border-[#043d2e] w-14">Adjuntos</th>
                      <th className="py-2 px-2 text-center w-16">Firma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Hito 0: Radicación / Recepción Inicial */}
                    <tr className="border-b border-slate-200 bg-emerald-50/50">
                      <td className="py-2 px-2 text-center font-bold text-[#064e3b] border-r border-slate-200">
                        0
                      </td>
                      <td className="py-2 px-2.5 font-mono text-slate-700 border-r border-slate-200">
                        {formatDate(item.createdAt)}<br />
                        <span className="text-[8.5px] text-slate-500">{formatTime(item.createdAt)}</span>
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-200">
                        <span className="font-bold text-slate-800">{item.senderName}</span>
                        <span className="block text-[8.5px] text-[#064e3b] font-bold">
                          ➔ {item.senderArea || 'Mesa de Entradas'}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-200 font-semibold text-slate-700">
                        {item.createdBy ? `${item.createdBy.firstName} ${item.createdBy.lastName}` : 'Recepción Oficial'}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200">
                        <span className="font-black text-[#064e3b] block uppercase text-[9px]">
                          [RADICACIÓN OFICIAL INICIAL]
                        </span>
                        <span className="text-slate-700 italic">
                          Ingreso y digitalización formal del expediente en el Sistema SICAD.
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-200 font-bold text-slate-600">
                        {item.documents && item.documents.length > 0 ? `${item.documents.length} PDF` : '0'}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="text-[8px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded border border-emerald-300 block">
                          ✓ RADICADO
                        </span>
                      </td>
                    </tr>

                    {/* Hitos 1..N: Movimientos y Derivaciones */}
                    {sortedMovements.map((mov, idx) => {
                      const isCurrentCustody = mov.targetArea === item.currentArea && idx === sortedMovements.length - 1;
                      return (
                        <tr
                          key={mov.id || idx}
                          className={`border-b border-slate-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'} ${
                            isCurrentCustody ? 'bg-amber-50/60' : ''
                          }`}
                        >
                          <td className="py-2 px-2 text-center font-bold text-slate-800 border-r border-slate-200">
                            {mov.sequenceNumber || idx + 1}
                          </td>
                          <td className="py-2 px-2.5 font-mono text-slate-700 border-r border-slate-200">
                            {formatDate(mov.createdAt)}<br />
                            <span className="text-[8.5px] text-slate-500">{formatTime(mov.createdAt)}</span>
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-200">
                            <span className="text-slate-600 block">{mov.sourceArea}</span>
                            <span className="font-bold text-[#064e3b] block">
                              ➔ {mov.targetArea}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-200 font-semibold text-slate-700">
                            {mov.targetPersonName || (mov.sourceUser ? `${mov.sourceUser.firstName} ${mov.sourceUser.lastName}` : 'Titular de Despacho')}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-200">
                            {mov.quickStamp && (
                              <span className="font-black text-[#b45309] block uppercase text-[9px] mb-0.5">
                                [ {mov.quickStamp} ]
                              </span>
                            )}
                            <span className="text-slate-800 leading-snug">
                              {mov.instruction || 'Para atención y fines correspondientes.'}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center border-r border-slate-200 font-bold text-slate-700">
                            {mov.documents && mov.documents.length > 0 ? `${mov.documents.length} PDF` : '—'}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {mov.signatureUrl ? (
                              <span className="text-[8px] bg-emerald-100 text-emerald-800 font-black px-1 py-0.5 rounded border border-emerald-300 block">
                                ✓ FIRMADO
                              </span>
                            ) : (
                              <span className="text-[8px] bg-slate-100 text-slate-600 font-bold px-1 py-0.5 rounded block">
                                Registrado
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 4. FORMATO B: LISTA DETALLADA DE HITOS Y PROVEÍDOS CON RÚBRICAS           */}
            {/* ========================================================================= */}
            {(printFormat === 'HYBRID' || printFormat === 'LIST_ONLY') && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between pb-1 border-b border-[#064e3b]/30">
                  <h2 className="text-xs font-black uppercase tracking-wider text-[#064e3b] flex items-center gap-1.5">
                    <ListFilter className="w-3.5 h-3.5 text-[#b45309]" />
                    <span>Ficha Cronológica Detallada de Actuaciones</span>
                  </h2>
                </div>

                <div className="space-y-3">
                  {/* Ficha Paso 0: Radicación */}
                  <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/60 page-break-inside-avoid">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#064e3b] text-white flex items-center justify-center font-bold text-[10px]">
                          0
                        </span>
                        <strong className="text-[11px] text-[#064e3b] uppercase">
                          Radicación Inicial del Trámite
                        </strong>
                      </div>
                      <span className="font-mono text-[9.5px] text-slate-600 font-bold">
                        {formatDate(item.createdAt)} • {formatTime(item.createdAt)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] mb-2">
                      <div>
                        <span className="text-slate-500 font-semibold block">Origen Remitente:</span>
                        <strong className="text-slate-900">{item.senderName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold block">Ingreso Autorizado a:</span>
                        <strong className="text-[#064e3b]">{item.senderArea || item.currentArea}</strong>
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded border border-slate-200 text-[10.5px] text-slate-800">
                      <strong className="text-[#064e3b] block mb-0.5">Asunto Inicial:</strong>
                      {item.reference}
                    </div>
                  </div>

                  {/* Fichas Pasos 1..N: Derivaciones */}
                  {sortedMovements.map((mov, idx) => (
                    <div
                      key={mov.id || idx}
                      className="border border-slate-300 rounded-lg p-3 bg-white page-break-inside-avoid shadow-xs"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#b45309] text-white flex items-center justify-center font-bold text-[10px]">
                            {mov.sequenceNumber || idx + 1}
                          </span>
                          <span className="text-[11px] font-black text-slate-900 uppercase">
                            Paso #{mov.sequenceNumber || idx + 1}: {mov.sourceArea} ➔ <strong className="text-[#064e3b]">{mov.targetArea}</strong>
                          </span>
                        </div>
                        <span className="font-mono text-[9.5px] text-slate-600 font-bold">
                          {formatDate(mov.createdAt)} • {formatTime(mov.createdAt)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] mb-2">
                        <div>
                          <span className="text-slate-500 font-semibold block">Despachado Por:</span>
                          <strong className="text-slate-900">{mov.sourceArea}</strong>
                          {mov.sourceUser && (
                            <span className="block text-slate-600 text-[9px]">
                              ({mov.sourceUser.firstName} {mov.sourceUser.lastName})
                            </span>
                          )}
                        </div>

                        <div>
                          <span className="text-slate-500 font-semibold block">Destinatario / Titular:</span>
                          <strong className="text-[#064e3b]">{mov.targetArea}</strong>
                          {mov.targetPersonName && (
                            <span className="block text-slate-600 text-[9px]">
                              ({mov.targetPersonName})
                            </span>
                          )}
                        </div>

                        <div>
                          {mov.quickStamp && (
                            <div>
                              <span className="text-slate-500 font-semibold block">Sello Aplicado:</span>
                              <span className="bg-[#b45309]/15 text-[#b45309] font-black px-1.5 py-0.5 rounded text-[9.5px] inline-block border border-[#b45309]/30">
                                {mov.quickStamp}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Caja de Instrucción */}
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[10.5px] mb-2">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block mb-0.5">
                          Instrucción Formal de Despacho:
                        </span>
                        <p className="text-slate-900 font-medium leading-relaxed italic">
                          "{mov.instruction || 'Para atención y fines correspondientes.'}"
                        </p>
                      </div>

                      {/* Firma y Adjuntos del Movimiento */}
                      <div className="flex items-center justify-between flex-wrap gap-2 text-[9.5px] pt-1">
                        <div className="flex items-center gap-2">
                          {mov.documents && mov.documents.length > 0 ? (
                            <div className="flex items-center gap-1 bg-emerald-50 text-[#064e3b] px-2 py-0.5 rounded border border-emerald-200 font-bold">
                              <Paperclip className="w-3 h-3" />
                              <span>{mov.documents.length} documento(s) PDF adjuntos</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Sin documentos adjuntos en este paso</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {mov.signatureUrl ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[8.5px] font-bold text-emerald-800">
                                ✓ Rúbrica Digitalizada:
                              </span>
                              <img
                                src={mov.signatureUrl}
                                alt="Firma"
                                className="h-8 max-w-[90px] object-contain border border-slate-300 rounded bg-white p-0.5"
                              />
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[9px] italic">
                              Rúbrica en archivo físico
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 5. PIE DE PÁGINA LEGAL E INSTITUCIONAL (FE PÚBLICA SICAD)                 */}
            {/* ========================================================================= */}
            <div className="border-t-2 border-[#064e3b] mt-6 pt-3 text-[9px] text-slate-600 page-break-inside-avoid space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="max-w-md">
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
                  <div className="font-mono text-[8.5px] text-slate-500">
                    HASH AUDITORÍA: {item.id.slice(0, 16).toUpperCase()}
                  </div>
                  <div className="text-[8.5px] text-[#064e3b] font-black uppercase mt-0.5">
                    Club Hípico Los Sargentos • Bolivia
                  </div>
                </div>
              </div>

              <div className="text-center text-[8px] text-slate-400 border-t border-slate-200 pt-1">
                Documento Oficial Generado Automáticamente por SICAD CHLS • Validez Legal Institucional Interna
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
