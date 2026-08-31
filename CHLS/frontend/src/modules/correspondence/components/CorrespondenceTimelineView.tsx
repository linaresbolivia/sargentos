import React, { useState } from 'react';
import { RouteSheetItem, HrMovement } from '../types/correspondence.types';
import {
  MapPin,
  Clock,
  User,
  Building2,
  Stamp,
  ShieldCheck,
  FileText,
  Copy,
  AlertTriangle,
  CheckCircle2,
  ArrowDown,
  ArrowRight,
  ExternalLink,
  Paperclip,
  FolderArchive,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Bell,
  Calendar,
} from 'lucide-react';
import CrestLogo from '@shared/components/CrestLogo';

interface CorrespondenceTimelineViewProps {
  item: RouteSheetItem;
  onOpenSlaModal: () => void;
  onAddMovement: () => void;
}

export const CorrespondenceTimelineView: React.FC<CorrespondenceTimelineViewProps> = ({
  item,
  onOpenSlaModal,
  onAddMovement,
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [selectedSignaturePreview, setSelectedSignaturePreview] = useState<string | null>(null);

  const movements = item.movements || [];
  const isConcluido = item.status === 'CONCLUIDO';
  const isArchived = !!item.archiveLocation;
  const isOverdue = item.isOverdue || item.slaStatus === 'OVERDUE';
  const isWarning = item.slaStatus === 'WARNING';

  // Toggle expansion of movement card
  const toggleExpand = (idx: number) => {
    setExpandedIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* SLA & Time Management Banner */}
      <div className={`p-5 rounded-3xl border-2 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isOverdue
          ? 'bg-gradient-to-r from-red-500/15 via-red-500/5 to-transparent border-red-500/40 text-red-950 dark:text-red-200'
          : isWarning
          ? 'bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/40 text-amber-950 dark:text-amber-200'
          : isConcluido
          ? 'bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/40 text-emerald-950 dark:text-emerald-200'
          : 'bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
      }`}>
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`text-[11px] font-black uppercase px-3 py-1 rounded-full border shadow-xs flex items-center gap-1.5 ${
              isOverdue
                ? 'bg-red-500 text-white border-red-600'
                : isWarning
                ? 'bg-amber-500 text-white border-amber-600'
                : isConcluido
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{item.slaLabel || (isOverdue ? 'Plazo SLA Vencido' : 'En Plazo SLA')}</span>
            </span>

            <span className="text-xs font-bold text-slate-700 dark:text-gray-300">
              Prioridad: <strong className="uppercase text-slate-900 dark:text-white">{item.priority}</strong>
            </span>

            {item.slaDeadline && (
              <span className="text-xs text-slate-500 dark:text-gray-400 font-mono">
                • Vencimiento: {new Date(item.slaDeadline).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {/* Progress Bar */}
          {!isConcluido && (
            <div className="space-y-1">
              <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOverdue ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, item.slaProgressPercent || 50)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10.5px] font-bold text-slate-500 dark:text-gray-400 font-mono">
                <span>Radicado: {new Date(item.createdAt).toLocaleDateString('es-BO')}</span>
                <span>{item.slaProgressPercent || 0}% de tiempo consumido</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Button: Alert SLA */}
        {!isConcluido && (
          <button
            type="button"
            onClick={onOpenSlaModal}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 via-red-500 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black px-5 py-2.5 rounded-2xl text-xs shadow-lg shadow-red-500/20 transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
          >
            <Bell className="w-4 h-4 animate-bounce" />
            <span>📢 Despachar Alerta SLA</span>
          </button>
        )}
      </div>

      {/* Main Interactive Timeline Pathway */}
      <div className="relative pl-6 sm:pl-10 space-y-8 before:absolute before:left-3 sm:before:left-5 before:top-4 before:bottom-4 before:w-1 before:bg-gradient-to-b before:from-emerald-500 before:via-brand-gold before:to-teal-500 before:rounded-full">
        
        {/* MILESTONE 1: INGRESO & RADICACIÓN */}
        <div className="relative group">
          {/* Node Icon */}
          <div className="absolute -left-6 sm:-left-10 top-0.5 w-7 h-7 rounded-full bg-emerald-600 border-4 border-white dark:border-[#0c1410] text-white flex items-center justify-center shadow-md shadow-emerald-600/30 z-10">
            <Sparkles className="w-3.5 h-3.5" />
          </div>

          <div className="bg-white dark:bg-[#0c1a13] border-2 border-emerald-500/30 rounded-3xl p-5 shadow-sm space-y-3 transition-all hover:border-emerald-500">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40">
                  Punto de Origen • Radicación
                </span>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {item.senderName}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-gray-400">
                {new Date(item.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })} • {new Date(item.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="text-xs space-y-1 text-slate-700 dark:text-gray-300">
              <p className="font-bold text-slate-950 dark:text-white uppercase">
                Asunto: {item.reference}
              </p>
              <div className="flex items-center gap-4 text-[11px] text-slate-500 flex-wrap pt-1">
                <span>🏢 Origen: <strong>{item.senderArea || (item.senderType === 'SOCIO' ? 'Socio Club' : 'Externo')}</strong></span>
                {item.cite && <span>📋 CITE: <strong className="font-mono">{item.cite}</strong></span>}
                <span>📄 {item.pageCount || 1} Fojas</span>
                <span>👤 Radicado por: <strong>{item.createdBy?.firstName} {item.createdBy?.lastName}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* MILESTONES 2..N: DERIVACIONES & PROVEÍDOS */}
        {movements.map((mov, idx) => {
          const isExpanded = expandedIndex === idx;
          const isLast = idx === movements.length - 1;

          return (
            <div key={mov.id || idx} className="relative group">
              {/* Node Icon */}
              <div className={`absolute -left-6 sm:-left-10 top-0.5 w-7 h-7 rounded-full border-4 border-white dark:border-[#0c1410] text-slate-950 font-black text-[11px] flex items-center justify-center shadow-md z-10 ${
                isLast
                  ? 'bg-brand-gold ring-4 ring-brand-gold/20'
                  : 'bg-slate-200 dark:bg-emerald-800 text-slate-800 dark:text-white'
              }`}>
                #{mov.sequenceNumber}
              </div>

              <div className={`bg-white dark:bg-[#0f1d16] border rounded-3xl p-5 shadow-sm space-y-3 transition-all ${
                isLast
                  ? 'border-2 border-brand-gold/60 shadow-brand-gold/10'
                  : 'border-slate-200 dark:border-white/5 hover:border-emerald-500/40'
              }`}>
                
                {/* Milestone Header */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg bg-brand-gold/20 text-yellow-800 dark:text-brand-gold border border-brand-gold/40">
                      Paso #{mov.sequenceNumber} • {mov.sourceArea || 'ÁREA'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-brand-gold" />
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase">
                      {mov.targetPersonName ? `${mov.targetPersonName} (${mov.targetArea})` : mov.targetArea}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Dwell Time Badge */}
                    {mov.durationFormatted && (
                      <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-500/15 px-2.5 py-0.5 rounded-lg border border-purple-500/30 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        Permanencia: {mov.durationFormatted}
                      </span>
                    )}
                    <span className="text-xs font-mono font-bold text-slate-500 dark:text-gray-400">
                      {new Date(mov.createdAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })} • {new Date(mov.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Quick Stamp if any */}
                {mov.quickStamp && (
                  <div>
                    <span className="text-[10px] font-black uppercase px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1.5 shadow-xs">
                      <Stamp className="w-3.5 h-3.5 text-brand-gold" />
                      {mov.quickStamp}
                    </span>
                  </div>
                )}

                {/* Proveído Body */}
                <div className="text-xs text-slate-800 dark:text-gray-200 font-medium leading-relaxed bg-slate-50 dark:bg-black/40 p-4 rounded-2xl border border-slate-200/80 dark:border-white/5">
                  <p className="whitespace-pre-wrap">
                    {mov.instruction.split('\n[C.C.:')[0]}
                  </p>

                  {/* C.C. Copies if any */}
                  {mov.instruction.includes('[C.C.:') && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 text-[11px] text-brand-gold font-bold">
                      <Copy className="w-3.5 h-3.5 shrink-0" />
                      <span>Con Copia a: {mov.instruction.split('[C.C.: ')[1]?.replace(']', '')}</span>
                    </div>
                  )}
                </div>

                {/* Digital Signature & Responsible Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 text-[11px] flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span className="text-slate-600 dark:text-gray-400">
                      Emitido por: <strong className="text-slate-900 dark:text-white">{mov.sourceUser?.firstName} {mov.sourceUser?.lastName}</strong> ({mov.sourceArea})
                    </span>
                  </div>

                  {/* Digital Signature Thumbnail / Sello Modal Preview */}
                  {mov.signatureUrl ? (
                    <button
                      type="button"
                      onClick={() => setSelectedSignaturePreview(mov.signatureUrl || null)}
                      className="flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-300 hover:text-brand-gold transition-colors bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/30 cursor-pointer"
                    >
                      <Stamp className="w-3.5 h-3.5" />
                      <span>Ver Sello / Firma Certificada</span>
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 italic">
                      Sello Institucional CHLS Certificado
                    </span>
                  )}
                </div>

              </div>
            </div>
          );
        })}

        {/* MILESTONE FINAL: ESTADO ACTUAL / ARCHIVO CENTRAL */}
        <div className="relative group">
          {/* Node Icon */}
          <div className={`absolute -left-6 sm:-left-10 top-0.5 w-7 h-7 rounded-full border-4 border-white dark:border-[#0c1410] text-white flex items-center justify-center shadow-md z-10 ${
            isConcluido ? 'bg-emerald-600' : 'bg-brand-gold text-black animate-pulse'
          }`}>
            {isArchived ? (
              <FolderArchive className="w-3.5 h-3.5" />
            ) : isConcluido ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <MapPin className="w-3.5 h-3.5 text-black" />
            )}
          </div>

          <div className={`border-2 rounded-3xl p-5 shadow-md space-y-3 ${
            isArchived
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-200'
              : isConcluido
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-200'
              : 'bg-white dark:bg-[#0c1a13] border-emerald-500/40'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg border ${
                  isConcluido
                    ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-800 dark:text-brand-gold border-amber-500/40'
                }`}>
                  {isArchived ? 'Custodia Definitiva' : isConcluido ? 'Trámite Concluido' : 'Punto Actual en Custodia'}
                </span>
                <span className="text-sm font-black uppercase text-slate-900 dark:text-white">
                  {item.currentArea}
                </span>
              </div>

              {!isConcluido && (
                <button
                  type="button"
                  onClick={onAddMovement}
                  className="flex items-center gap-1.5 bg-brand-gold hover:bg-yellow-500 text-black font-black px-4 py-1.5 rounded-xl text-xs shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Stamp className="w-3.5 h-3.5" />
                  <span>+ Derivar / Proveer Siguiente</span>
                </button>
              )}
            </div>

            {/* Archive Location Details if archived */}
            {isArchived && (
              <div className="text-xs space-y-1 bg-white/70 dark:bg-black/40 p-3.5 rounded-2xl border border-amber-500/30">
                <p className="font-bold text-slate-900 dark:text-white">
                  Ubicación Física: <strong className="text-emerald-700 dark:text-brand-gold">{item.archiveLocation}</strong>
                  {item.archiveBox ? ` — Caja: ${item.archiveBox}` : ''}
                </p>
                {item.archiveNotes && (
                  <p className="text-[11.5px] italic text-slate-600 dark:text-gray-300">
                    "{item.archiveNotes}"
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Signature Preview Modal */}
      {selectedSignaturePreview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedSignaturePreview(null)}
        >
          <div
            className="bg-white dark:bg-[#0c1410] border-2 border-emerald-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-gold" />
                <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase">
                  Sello & Firma Digital Certificada
                </h4>
              </div>
              <button
                onClick={() => setSelectedSignaturePreview(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-center">
              <img
                src={selectedSignaturePreview}
                alt="Firma Digital"
                className="max-h-48 object-contain"
              />
            </div>

            <p className="text-[11px] text-slate-500 dark:text-gray-400 font-mono">
              🔒 Verificación Criptográfica CHLS — Integridad Inmutable
            </p>

            <button
              onClick={() => setSelectedSignaturePreview(null)}
              className="w-full bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white py-2.5 rounded-xl text-xs font-bold transition-colors"
            >
              Cerrar Vista Previa
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
export default CorrespondenceTimelineView;
