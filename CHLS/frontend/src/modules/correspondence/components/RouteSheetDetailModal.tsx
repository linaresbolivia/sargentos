import React, { useState } from 'react';
import { RouteSheetItem } from '../types/correspondence.types';
import { PrintableRouteSheet } from './PrintableRouteSheet';
import { AddMovementModal } from './AddMovementModal';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Send, Clock, Building2, User, FileText, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, Leaf, ArrowRight, Stamp, Copy } from 'lucide-react';
import CrestLogo from '@shared/components/CrestLogo';

interface RouteSheetDetailModalProps {
  item: RouteSheetItem | null;
  onClose: () => void;
}

export const RouteSheetDetailModal: React.FC<RouteSheetDetailModalProps> = ({ item, onClose }) => {
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showAddMovementModal, setShowAddMovementModal] = useState(false);

  if (!item) return null;

  const movements = item.movements || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECIBIDO':
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'DERIVADO':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'EN_PROCESO':
        return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'OBSERVADO':
        return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse';
      case 'CONCLUIDO':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';
    }
  };

  const verificationUrl = `${window.location.origin}/correspondencia?code=${encodeURIComponent(item.hrCode)}`;

  return (
    <>
      <div className="fixed inset-0 z-40 overflow-y-auto bg-black/75 backdrop-blur-md flex justify-center items-center p-4 sm:p-6 animate-fadeIn">
        <div className="bg-white dark:bg-[#0c1410] border border-slate-200 dark:border-brand-gold/20 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          
          {/* Top Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-black/20">
            <div className="flex items-center gap-3">
              <CrestLogo size="sm" className="w-11 h-11 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                    {item.hrCode}
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${getStatusBadge(item.status)}`}>
                    {item.status}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    CITE: {item.cite || 'S/N'}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  Expediente & Trazabilidad 360°
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                <Printer className="w-4 h-4 text-brand-gold" />
                <span className="hidden sm:inline">Imprimir 1:1</span>
              </button>

              <button
                onClick={() => setShowAddMovementModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-brand-gold to-yellow-600 hover:from-yellow-500 hover:to-yellow-600 text-black px-4 py-2 rounded-xl text-xs font-black shadow-md shadow-brand-gold/20 transition-all hover:scale-105 active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>+ Derivar / Proveído</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
            
            {/* Paperless Eco Banner */}
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 px-4">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Leaf className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold">
                  Iniciativa CHLS Cero Papel — Expediente Oficial con Firma Digital y Validador QR
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-300">
                {item.pageCount || 1} Folio(s)
              </span>
            </div>

            {/* Main Header Data Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/90 dark:bg-white/[0.02] p-5 rounded-2xl border border-slate-200/90 dark:border-white/5">
              <div className="space-y-1.5 md:col-span-2">
                <span className="text-[10px] font-black text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                  Referencia / Asunto
                </span>
                <p className="text-sm font-black text-slate-950 dark:text-white leading-relaxed uppercase">
                  {item.reference}
                </p>
                {item.attachmentDescription && (
                  <p className="text-xs text-slate-700 dark:text-gray-400 mt-2">
                    <strong className="text-slate-950 dark:text-gray-200 font-bold">Adjunto:</strong> {item.attachmentDescription}
                  </p>
                )}
              </div>

              {/* QR Verification Card */}
              <div className="flex items-center justify-end gap-3 border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/10 pt-3 md:pt-0 md:pl-4">
                <div className="p-1.5 bg-white rounded-xl border border-slate-300 shadow-sm shrink-0">
                  <QRCodeSVG value={verificationUrl} size={64} level="M" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-black text-slate-500 uppercase block">Área Actual</span>
                  <span className="text-xs font-black text-emerald-900 dark:text-brand-gold uppercase block">
                    {item.currentArea}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono font-bold">
                    {new Date(item.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Sender & Origin Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/5">
                <span className="text-slate-500 uppercase text-[10px] font-black block mb-0.5">Remitente</span>
                <span className="font-black text-slate-950 dark:text-white flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-brand-gold" />
                  {item.senderName}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/5">
                <span className="text-slate-500 uppercase text-[10px] font-black block mb-0.5">Origen / Empresa</span>
                <span className="font-black text-slate-950 dark:text-white flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  {item.senderArea || (item.senderType === 'SOCIO' ? 'Socio CHLS' : 'Externo')}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50/90 dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/5">
                <span className="text-slate-500 uppercase text-[10px] font-black block mb-0.5">Radicado Por</span>
                <span className="font-black text-slate-950 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  {item.createdBy?.firstName} {item.createdBy?.lastName || 'Secretaría'}
                </span>
              </div>
            </div>

            {/* Timeline of Movements / Proveídos */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-gray-200 flex items-center gap-2">
                  <Stamp className="w-4 h-4 text-brand-gold" />
                  <span>Historial de Instrucciones & Proveídos ({movements.length})</span>
                </h3>
              </div>

              {movements.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 dark:bg-white/[0.01] rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Aún no se han emitido proveídos para esta Hoja de Ruta.</p>
                  <button
                    onClick={() => setShowAddMovementModal(true)}
                    className="mt-3 text-xs font-bold text-brand-gold hover:underline"
                  >
                    + Emitir primer proveído ahora
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {movements.map((mov, idx) => (
                    <div
                      key={mov.id || idx}
                      className="bg-slate-50 dark:bg-[#0f1a14] border border-slate-200/70 dark:border-white/5 p-4 rounded-2xl relative overflow-hidden transition-all hover:border-brand-gold/40"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-6 h-6 rounded-full bg-brand-gold/20 text-brand-gold text-xs font-black flex items-center justify-center">
                              #{mov.sequenceNumber}
                            </span>
                            <span className="font-bold text-xs text-slate-800 dark:text-white">
                              A: {mov.targetPersonName ? `${mov.targetPersonName} (${mov.targetArea})` : mov.targetArea}
                            </span>
                            {mov.quickStamp && (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                {mov.quickStamp}
                              </span>
                            )}
                          </div>

                          <div className="pl-8 space-y-1.5">
                            <p className="text-xs text-slate-700 dark:text-gray-300 font-medium leading-relaxed whitespace-pre-wrap">
                              {mov.instruction.split('\n[C.C.:')[0]}
                            </p>
                            {mov.instruction.includes('[C.C.:') && (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-[11px] font-bold">
                                <Copy className="w-3.5 h-3.5 text-brand-gold shrink-0" />
                                <span>Con Copia a: {mov.instruction.split('[C.C.: ')[1]?.replace(']', '')}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Stamp & Date Block */}
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {new Date(mov.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 font-mono block">
                            {new Date(mov.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block mt-1">
                            {mov.sourceUser?.firstName} {mov.sourceUser?.lastName}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Footer Bar */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-black/20 text-xs">
            <span className="text-slate-400 font-mono text-[11px]">
              ID Sistema: {item.id}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPrintModal(true)}
                className="font-bold text-slate-700 dark:text-gray-300 hover:text-brand-gold transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Vista Previa de Impresión</span>
              </button>
              <button
                onClick={onClose}
                className="bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white px-4 py-2 rounded-xl font-bold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Submodal for Adding Movements */}
      {showAddMovementModal && (
        <AddMovementModal
          isOpen={showAddMovementModal}
          onClose={() => setShowAddMovementModal(false)}
          item={item}
        />
      )}

      {/* Submodal for Printable Sheet */}
      {showPrintModal && (
        <PrintableRouteSheet
          item={item}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </>
  );
};
export default RouteSheetDetailModal;
