import React from 'react';
import { RouteSheetItem } from '../types/correspondence.types';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X } from 'lucide-react';
import logoUrl from '../../../assets/logo.png';

interface PrintableRouteSheetProps {
  item: RouteSheetItem;
  onClose: () => void;
}

export const PrintableRouteSheet: React.FC<PrintableRouteSheetProps> = ({ item, onClose }) => {
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
  // Ensure we display at least 3 instruction blocks like the physical sheet
  const totalSlots = Math.max(3, movements.length);
  const slots = Array.from({ length: totalSlots }, (_, i) => movements[i] || null);

  // Verification URL for QR code
  const verificationUrl = `${window.location.origin}/correspondencia?code=${encodeURIComponent(item.hrCode)}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 print:p-0 print:bg-white print:static print:inset-auto">
      {/* Non-printable action bar */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-brand-gold hover:bg-yellow-500 text-black font-bold px-5 py-2.5 rounded-full shadow-2xl transition-transform hover:scale-105 active:scale-95"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir / Guardar PDF</span>
        </button>
        <button
          onClick={onClose}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Printable Sheet Canvas - Exact 1:1 Scale of CHLS Physical Sheet */}
      <div className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-10 shadow-2xl rounded-sm print:shadow-none print:p-6 print:m-0 print:w-full font-sans text-xs print:rounded-none">
        
        {/* Top Header with Crest Logo */}
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
            <div className="p-1 border border-slate-300 rounded bg-white shadow-sm">
              <QRCodeSVG value={verificationUrl} size={58} level="M" />
            </div>
            <span className="text-[8px] text-slate-500 font-mono mt-0.5 font-bold">Verificación Digital</span>
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
              <span className="text-[9px] font-bold text-slate-700 uppercase">FECHA</span>
              <span className="font-bold text-slate-900">
                {formatChlsDate(item.createdAt)}
              </span>
            </div>
            <div className="col-span-3 p-1.5 flex flex-col justify-center">
              <span className="text-[9px] font-bold text-slate-700 uppercase">HORA</span>
              <span className="font-bold text-slate-900">
                {formatChlsTime(item.createdAt)}
              </span>
            </div>
          </div>

          {/* Row 2: Empresa / Área */}
          <div className="p-1.5 flex items-center gap-2">
            <span className="w-28 font-bold text-slate-700 uppercase text-[10px]">EMPRESA/AREA</span>
            <span className="font-bold text-slate-900 uppercase">
              {item.senderArea || (item.senderType === 'SOCIO' ? 'SOCIO TITULAR' : 'EXTERNO')}
            </span>
          </div>

          {/* Row 3: Remite */}
          <div className="p-1.5 flex items-center gap-2">
            <span className="w-28 font-bold text-slate-700 uppercase text-[10px]">REMITE</span>
            <span className="font-bold text-slate-900 uppercase">
              {item.senderName} {item.senderDoc ? `(CI: ${item.senderDoc})` : ''}
            </span>
          </div>

          {/* Row 4: CITE & N° De Páginas */}
          <div className="grid grid-cols-12 divide-x divide-black">
            <div className="col-span-9 p-1.5 flex items-center gap-2">
              <span className="w-28 font-bold text-slate-700 uppercase text-[10px]">CITE</span>
              <span className="font-bold font-mono text-slate-900">
                {item.cite || 'S/N'}
              </span>
            </div>
            <div className="col-span-3 p-1.5 flex items-center gap-2">
              <span className="font-bold text-slate-700 uppercase text-[10px]">N° De Paginas</span>
              <span className="font-bold text-slate-900 font-mono">
                {item.pageCount || 1}
              </span>
            </div>
          </div>

          {/* Row 5: Referencia & Adjunto */}
          <div className="grid grid-cols-12 divide-x divide-black min-h-[64px]">
            <div className="col-span-6 p-2 flex flex-col">
              <span className="text-[10px] font-bold text-slate-700 uppercase mb-1">REFERENCIA</span>
              <p className="font-medium text-slate-900 leading-snug uppercase text-[10.5px]">
                {item.reference}
              </p>
            </div>
            <div className="col-span-6 p-2 flex flex-col">
              <span className="text-[10px] font-bold text-slate-700 uppercase mb-1">ADJUNTO</span>
              <p className="font-medium text-slate-900 leading-snug uppercase text-[10.5px]">
                {item.attachmentDescription || (item.documents && item.documents.length > 0 ? item.documents.map(d => d.fileName).join(', ') : 'DOCUMENTO DIGITAL ADJUNTO')}
              </p>
            </div>
          </div>
        </div>

        {/* Black Instructions Banner */}
        <div className="bg-[#2b2b2b] text-white text-center py-1 font-bold text-sm tracking-wider uppercase mb-1">
          INSTRUCCIONES
        </div>

        {/* Instructions Table / Grid */}
        <div className="border border-black divide-y divide-black">
          {slots.map((mov, idx) => (
            <div key={idx} className="min-h-[140px] flex flex-col justify-between p-2 relative">
              {/* Instruction Header: A: | FECHA | HORA */}
              <div className="grid grid-cols-12 border-b border-slate-300 pb-1.5 mb-2 text-[10px]">
                <div className="col-span-6 flex items-center gap-1.5">
                  <span className="font-bold text-slate-700">A:</span>
                  <span className="font-bold text-slate-900 text-[11px] underline">
                    {mov ? (mov.targetPersonName ? `${mov.targetPersonName} (${mov.targetArea})` : mov.targetArea) : ''}
                  </span>
                </div>
                <div className="col-span-3 flex items-center gap-1.5">
                  <span className="font-bold text-slate-700">FECHA</span>
                  <span className="font-medium text-slate-900">
                    {mov ? formatChlsDate(mov.createdAt) : ''}
                  </span>
                </div>
                <div className="col-span-3 flex items-center gap-1.5">
                  <span className="font-bold text-slate-700">HORA</span>
                  <span className="font-medium text-slate-900">
                    {mov ? formatChlsTime(mov.createdAt) : ''}
                  </span>
                </div>
              </div>

              {/* Instruction Body Text & Stamps */}
              {mov ? (
                <div className="flex-1 flex justify-between items-start gap-4">
                  <div className="flex-1">
                    {mov.quickStamp && (
                      <div className="inline-block px-2 py-0.5 mb-1.5 border-2 border-emerald-600 text-emerald-700 font-bold text-[11px] rounded tracking-wide uppercase">
                        {mov.quickStamp}
                      </div>
                    )}
                    <p className="text-[11px] text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                      {mov.instruction}
                    </p>
                  </div>

                  {/* Stamp & Digital Signature Placeholder / Stamp replica */}
                  <div className="w-56 text-right flex flex-col items-end justify-end shrink-0 pt-2">
                    <div className="border-t border-slate-400 w-44 pt-1 text-center">
                      <div className="font-bold text-[10px] text-blue-900 leading-tight">
                        {mov.sourceUser?.firstName} {mov.sourceUser?.lastName}
                      </div>
                      <div className="text-[8.5px] font-bold text-blue-800 tracking-tight leading-tight uppercase">
                        {mov.sourceArea || 'GERENCIA GENERAL'}
                      </div>
                      <div className="text-[7.5px] text-slate-500 font-bold">
                        CLUB HÍPICO LOS SARGENTOS
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty slot for manual physical write / stamp */
                <div className="flex-1 flex justify-between items-end text-slate-300">
                  <div className="text-[9px] italic">Espacio reservado para siguiente proveído / sello</div>
                  <div className="w-40 border-b border-dotted border-slate-300 pb-1 text-center text-[8px]">
                    Firma y Sello
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Eco / Paperless Note */}
        <div className="mt-4 pt-2 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-400 font-mono">
          <span>Iniciativa CHLS Cero Papel — Club Hípico Los Sargentos</span>
          <span>Impreso el {formatChlsDate(new Date().toISOString())} a las {formatChlsTime(new Date().toISOString())}</span>
        </div>
      </div>
    </div>
  );
};
export default PrintableRouteSheet;
