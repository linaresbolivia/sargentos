import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@store/store';
import { unmergeRouteSheet, fetchRouteSheets, fetchCorrespondenceStats } from '@store/correspondenceSlice';
import { X, Unlink, AlertCircle, FileText, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import CrestLogo from '@shared/components/CrestLogo';

interface UnmergeRouteSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  childId: string;
  childHrCode: string;
  parentHrCode?: string;
  childReference?: string;
}

export const UnmergeRouteSheetModal: React.FC<UnmergeRouteSheetModalProps> = ({
  isOpen,
  onClose,
  childId,
  childHrCode,
  parentHrCode,
  childReference,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [reason, setReason] = useState('Separación y desglose de expediente para tramitación y atención independiente');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const presets = [
    'Separación y desglose para tramitación y atención independiente',
    'Conclusión de conexidad: se deriva a despacho distinto por competencia',
    'Subsanación de acumulación errónea o preliminar',
  ];

  const handleConfirm = async () => {
    if (!reason.trim()) {
      toast.error('Por favor ingrese el motivo del auto de separación');
      return;
    }

    try {
      setIsSubmitting(true);
      await dispatch(
        unmergeRouteSheet({
          routeSheetId: childId,
          reason: reason.trim(),
        })
      ).unwrap();

      await dispatch(fetchRouteSheets());
      dispatch(fetchCorrespondenceStats());
      toast.success(`Hoja de Ruta ${childHrCode} desvinculada exitosamente. Continúa como trámite independiente.`);
      onClose();
    } catch (err: any) {
      toast.error(typeof err === 'string' ? err : 'Error al desvincular Hoja de Ruta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 animate-fadeIn print:hidden">
      <div className="bg-white dark:bg-[#07130E] border border-slate-200 dark:border-teal-800/40 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-teal-800/30 bg-slate-50/80 dark:bg-[#091913]/90 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CrestLogo size="sm" className="w-10 h-10 shrink-0 filter drop-shadow-[0_0_8px_rgba(20,184,166,0.3)]" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/30">
                  {childHrCode}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                  Desvincular / Desfusión
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                Separar Expediente Acumulado
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-teal-950/40 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Informative alert */}
          <div className="bg-teal-500/10 border border-teal-500/30 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-teal-950 dark:text-teal-200">
            <Unlink className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-teal-900 dark:text-teal-100">
                Efectos legales y administrativos de la desvinculación:
              </p>
              <ul className="list-disc list-inside mt-1.5 space-y-1 text-teal-900/85 dark:text-teal-300/85">
                <li>
                  La Hoja de Ruta <strong>{childHrCode}</strong> se desacopla de la Matriz{' '}
                  <strong>{parentHrCode || 'principal'}</strong>.
                </li>
                <li>Volverá a derivarse y recepcionarse de manera individual.</li>
                <li>Las fojas correspondientes se descontarán automáticamente de la carátula matriz.</li>
                <li>Se registrará el Auto Oficial de Separación en las bitácoras de ambas hojas.</li>
              </ul>
            </div>
          </div>

          {childReference && (
            <div className="bg-slate-50 dark:bg-[#091913] border border-slate-200 dark:border-teal-800/30 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-teal-400 block mb-0.5">
                Referencia del Trámite a Desvincular
              </span>
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                {childReference}
              </p>
            </div>
          )}

          {/* Motivo / Auto de Desglose */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-teal-300 flex items-center justify-between">
              <span>Motivo / Auto Oficial de Desglose</span>
              <span className="text-[10px] font-normal text-slate-400">Requerido</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Escriba el fundamento de la separación o desglose..."
              className="w-full text-xs rounded-xl bg-slate-50 dark:bg-[#07130E] border border-slate-300 dark:border-teal-800/50 p-3 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-teal-500 transition-all resize-none shadow-xs"
            />
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setReason(preset)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-teal-950/30 hover:bg-teal-500/15 dark:hover:bg-teal-900/40 text-slate-700 dark:text-teal-300 border border-slate-200 dark:border-teal-800/30 transition-all cursor-pointer text-left"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-[#091913]/90 border-t border-slate-200 dark:border-teal-800/30 flex justify-end items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white bg-slate-200/60 hover:bg-slate-200 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 border border-slate-300 dark:border-teal-800/40 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || !reason.trim()}
            className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 border border-teal-400/40 transition-all shadow-md shadow-teal-950/30 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <Unlink className="w-4 h-4 shrink-0" />
            )}
            <span>Confirmar Desvinculación</span>
          </button>
        </div>
      </div>
    </div>
  );
};
