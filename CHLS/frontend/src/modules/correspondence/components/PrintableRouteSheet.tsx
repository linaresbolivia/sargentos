import React, { useState } from 'react';
import { RouteSheetItem } from '../types/correspondence.types';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, Tag, FileText, ShieldCheck, CheckCircle2 } from 'lucide-react';
import logoUrl from '../../../assets/logo-print.png';

interface PrintableRouteSheetProps {
  item: RouteSheetItem;
  onClose: () => void;
}

export const PrintableRouteSheet: React.FC<PrintableRouteSheetProps> = ({ item, onClose }) => {
  const [printMode, setPrintMode] = useState<'A4_SHEET' | 'STICKER_LABEL'>('A4_SHEET');

  const handlePrint = () => {
    window.print();
  };

  // Format date helper: "14 AGO 2026"
  const formatChlsDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Format time helper: "10:30"
  const formatChlsTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const movements = item.movements || [];
  const documents = item.documents || [];
  // Ensure we display at least 3 instruction blocks like the physical sheet
  const totalSlots = Math.max(3, movements.length);
  const slots = Array.from({ length: totalSlots }, (_, i) => movements[i] || null);

  // Verification URL for QR code
  const verificationUrl = `${window.location.origin}/correspondencia?code=${encodeURIComponent(item.hrCode)}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 print:p-0 print:bg-white print:static print:inset-auto">
      
      {/* Non-printable Top Command Bar */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3 print:hidden bg-slate-900/90 border border-white/10 p-2 rounded-2xl shadow-2xl backdrop-blur-md">
        {/* Toggle Mode: Carátula A4 vs Sticker */}
        <div className="flex items-center bg-black/50 p-1 rounded-xl border border-white/10 text-xs font-black">
          <button
            type="button"
            onClick={() => setPrintMode('A4_SHEET')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              printMode === 'A4_SHEET'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Carátula A4 (1:1)</span>
          </button>

          <button
            type="button"
            onClick={() => setPrintMode('STICKER_LABEL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              printMode === 'STICKER_LABEL'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Rótulo / Sticker QR</span>
          </button>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-gradient-to-r from-brand-gold to-yellow-500 hover:from-yellow-400 hover:to-yellow-500 text-black font-black px-5 py-2 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer text-xs"
        >
          <Printer className="w-4 h-4 text-black" />
          <span>Imprimir / Guardar PDF</span>
        </button>

        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. MODO: CARÁTULA OFICIAL A4 (1:1 EXACTA A LA HOJA FÍSICA CHLS)           */}
      {/* ========================================================================= */}
      {printMode === 'A4_SHEET' && (
        <div className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-10 shadow-2xl rounded-sm print:shadow-none print:p-6 print:m-0 print:w-full font-sans text-xs print:rounded-none">
          
          {/* Top Header with Crest Logo & Verification QR */}
          <div className="flex flex-col items-center justify-center mb-1 relative">
            <div className="w-16 h-16 mb-1">
              <img src={logoUrl} alt="Club Hípico Los Sargentos" className="w-full h-full object-contain" />
            </div>
            <div className="text-center">
              <h2 className="text-[13px] font-black tracking-widest text-slate-800 uppercase leading-tight">
                CLUB HÍPICO
              </h2>
              <h1 className="text-[15px] font-black tracking-widest text-slate-900 uppercase leading-none">
                LOS SARGENTOS
              </h1>
            </div>

            {/* Dynamic QR Code for Live Verification in Top Right */}
            <div className="absolute right-0 top-0 flex flex-col items-center">
              <div className="p-1 border-2 border-black rounded bg-white shadow-xs">
                <QRCodeSVG value={verificationUrl} size={62} level="M" />
              </div>
              <span className="text-[7.5px] text-slate-700 font-mono mt-0.5 font-black uppercase">
                Verificación QR
              </span>
            </div>
          </div>

          {/* Black Title Banner */}
          <div className="bg-[#2b2b2b] text-white text-center py-1 font-bold text-sm tracking-wider uppercase mb-1">
            HOJA DE RUTA
          </div>

          {/* Top Info Grid */}
          <div className="border border-black mb-1 divide-y divide-black text-[11px]">
            {/* Row 1: N° Hoja de Ruta | Fecha | Hora */}
            <div className="grid grid-cols-12 divide-x divide-black min-h-[36px]">
              <div className="col-span-6 p-1.5 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-slate-700 uppercase">N° de Hoja de Ruta</span>
                <span className="font-mono font-bold text-sm text-emerald-800 tracking-wider">
                  {item.hrCode}
                </span>
              </div>
              <div className="col-span-3 p-1.5 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-slate-700 uppercase">Fecha</span>
                <span className="font-mono font-bold text-xs">
                  {formatChlsDate(item.createdAt)}
                </span>
              </div>
              <div className="col-span-3 p-1.5 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-slate-700 uppercase">Hora</span>
                <span className="font-mono font-bold text-xs">
                  {formatChlsTime(item.createdAt)}
                </span>
              </div>
            </div>

            {/* Row 2: Remitente | Procedencia */}
            <div className="grid grid-cols-12 divide-x divide-black min-h-[42px]">
              <div className="col-span-7 p-1.5 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-slate-700 uppercase">Remitente</span>
                <span className="font-bold text-xs uppercase leading-tight">
                  {item.senderName}
                </span>
                {item.senderDoc && (
                  <span className="text-[9.5px] text-slate-600 font-mono">
                    DOC: {item.senderDoc}
                  </span>
                )}
              </div>
              <div className="col-span-5 p-1.5 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-slate-700 uppercase">Procedencia</span>
                <span className="font-bold text-xs uppercase leading-tight">
                  {item.senderArea || (item.senderType === 'SOCIO' ? 'SOCIO TITULAR' : 'EXTERNO')}
                </span>
              </div>
            </div>

            {/* Row 3: CITE | N° Fojas */}
            <div className="grid grid-cols-12 divide-x divide-black min-h-[36px]">
              <div className="col-span-8 p-1.5 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-slate-700 uppercase">CITE</span>
                <span className="font-mono font-bold text-xs">
                  {item.cite || 'S/N'}
                </span>
              </div>
              <div className="col-span-4 p-1.5 flex flex-col justify-center">
                <span className="text-[9px] font-bold text-slate-700 uppercase">N° Fojas</span>
                <span className="font-mono font-bold text-xs">
                  {item.pageCount || 1}
                </span>
              </div>
            </div>

            {/* Row 4: Referencia */}
            <div className="p-2 min-h-[48px] flex flex-col justify-center">
              <span className="text-[9px] font-bold text-slate-700 uppercase">Referencia</span>
              <span className="font-black text-xs uppercase leading-snug">
                {item.reference}
              </span>
            </div>

            {/* Row 5: Adjunto */}
            <div className="p-2 min-h-[36px] flex flex-col justify-center">
              <span className="text-[9px] font-bold text-slate-700 uppercase">Adjunto</span>
              <span className="text-xs uppercase font-medium">
                {item.attachmentDescription || 'Sin anexos físicos'}
              </span>
            </div>
          </div>

          {/* Instructions / Proveídos Grid (Slots) */}
          <div className="border border-black divide-y divide-black">
            {slots.map((mov, index) => (
              <div key={mov?.id || index} className="min-h-[145px] p-2 flex flex-col justify-between relative">
                {/* Header of Instruction: "A:" | "Fecha:" | "Hora:" */}
                <div className="grid grid-cols-12 border-b border-slate-300 pb-1 mb-1 text-[10px]">
                  <div className="col-span-6 font-bold uppercase">
                    A: <span className="underline decoration-1 underline-offset-2">{mov?.targetPersonName ? `${mov.targetPersonName} (${mov.targetArea})` : mov?.targetArea || '____________________'}</span>
                  </div>
                  <div className="col-span-3 text-center">
                    Fecha: <span className="font-mono font-bold">{mov ? formatChlsDate(mov.createdAt) : '__ / __ / ____'}</span>
                  </div>
                  <div className="col-span-3 text-right">
                    Hora: <span className="font-mono font-bold">{mov ? formatChlsTime(mov.createdAt) : '__ : __'}</span>
                  </div>
                </div>

                {/* Body of Instruction */}
                {mov ? (
                  <div className="flex-1 flex justify-between gap-4">
                    <div className="flex-1">
                      {mov.quickStamp && (
                        <div className="inline-block px-2 py-0.5 mb-1 border-2 border-emerald-600 text-emerald-700 font-bold text-[10.5px] rounded tracking-wide uppercase">
                          {mov.quickStamp}
                        </div>
                      )}
                      <p className="text-[11px] text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                        {mov.instruction}
                      </p>
                    </div>

                    {/* Stamp & Signature Replica */}
                    <div className="w-52 text-right flex flex-col items-end justify-end shrink-0 pt-1">
                      <div className="border-t border-slate-400 w-40 pt-1 text-center">
                        <div className="font-bold text-[9.5px] text-blue-900 leading-tight">
                          {mov.sourceUser?.firstName} {mov.sourceUser?.lastName}
                        </div>
                        <div className="text-[8px] font-bold text-blue-800 tracking-tight leading-tight uppercase">
                          {mov.sourceArea || 'GERENCIA GENERAL'}
                        </div>
                        <div className="text-[7px] text-slate-500 font-bold">
                          CLUB HÍPICO LOS SARGENTOS
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Empty slot for physical write / stamp */
                  <div className="flex-1 flex justify-between items-end text-slate-300">
                    <div className="text-[9px] italic">Espacio reservado para siguiente proveído / sello institucional</div>
                    <div className="w-40 border-b border-dotted border-slate-300 pb-1 text-center text-[8px]">
                      Firma y Sello
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Security & Cryptographic Integrity Footer */}
          <div className="mt-3 pt-2 border-t-2 border-black flex justify-between items-center text-[8.5px] text-slate-600 font-mono">
            <div className="flex items-center gap-2">
              <span className="font-bold text-black uppercase">🔒 DOCUMENTO OFICIAL CERTIFICADO CHLS</span>
              <span>• Fojas: {item.pageCount || 1}</span>
              {documents.length > 0 && <span>• {documents.length} Archivo(s) Digitalizado(s) con Hash SHA-256</span>}
            </div>
            <div>
              <span>Impreso: {formatChlsDate(new Date().toISOString())} {formatChlsTime(new Date().toISOString())}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MODO: RÓTULO / STICKER ADHESIVO DE SEGURIDAD (5 x 8 cm)                */}
      {/* ========================================================================= */}
      {printMode === 'STICKER_LABEL' && (
        <div className="bg-white text-black w-full max-w-[90mm] min-h-[55mm] p-4 shadow-2xl rounded-xl border-2 border-black print:shadow-none print:p-2 print:m-0 print:border-none font-sans text-xs">
          <div className="border-2 border-black p-3 rounded-lg flex items-center gap-3">
            
            {/* QR Code */}
            <div className="p-1 bg-white border border-black rounded shrink-0">
              <QRCodeSVG value={verificationUrl} size={70} level="M" />
            </div>

            {/* Label Content */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between border-b border-black pb-0.5">
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-800">CHLS CORRESPONDENCIA</span>
                <span className="text-[7.5px] font-mono text-slate-600">{formatChlsDate(item.createdAt)}</span>
              </div>

              <div>
                <span className="text-[8px] font-bold text-slate-500 uppercase block">N° Hoja de Ruta:</span>
                <span className="text-sm font-black font-mono text-emerald-900 tracking-wide block leading-none">
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
  );
};
export default PrintableRouteSheet;
