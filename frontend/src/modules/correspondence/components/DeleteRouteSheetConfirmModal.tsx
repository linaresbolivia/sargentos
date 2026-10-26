import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@store/store';
import { deleteRouteSheet, fetchRouteSheets, fetchCorrespondenceStats } from '@store/correspondenceSlice';
import { RouteSheetItem } from '../types/correspondence.types';
import {
  X,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  FileText,
  User,
  Ban,
  Building2,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DeleteRouteSheetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: RouteSheetItem | null;
  onDeleted?: (deletedId: string) => void;
}

export const DeleteRouteSheetConfirmModal: React.FC<DeleteRouteSheetConfirmModalProps> = ({
  isOpen,
  onClose,
  item,
  onDeleted,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [deleteMode, setDeleteMode] = useState<'DELETE' | 'ANULAR'>('DELETE');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !item) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    const toastId = toast.loading(
      deleteMode === 'DELETE'
        ? `Eliminando Hoja de Ruta ${item.hrCode}...`
        : `Anulando Hoja de Ruta ${item.hrCode}...`
    );

    try {
      const action = await dispatch(
        deleteRouteSheet({
          id: item.id,
          reason: reason.trim() || undefined,
          mode: deleteMode,
        })
      );

      if (deleteRouteSheet.fulfilled.match(action)) {
        toast.success(
          deleteMode === 'DELETE'
            ? `Hoja de Ruta ${item.hrCode} eliminada exitosamente 🗑️`
            : `Hoja de Ruta ${item.hrCode} anulada formalmente 🚫`,
          { id: toastId }
        );
        await dispatch(fetchRouteSheets());
        dispatch(fetchCorrespondenceStats());
        if (onDeleted) {
          onDeleted(item.id);
        }
        onClose();
      } else {
        toast.error((action.payload as string) || 'Error al procesar la solicitud', { id: toastId });
      }
    } catch {
      toast.error('Error inesperado al eliminar la Hoja de Ruta', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center items-center p-3 sm:p-4">
      <div className="bg-white dark:bg-[#07110c] border border-red-500/30 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn">
        {/* Header con advertencia */}
        <div className="p-5 border-b border-red-500/20 bg-red-500/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600/20 text-red-600 dark:text-red-400 border border-red-500/40 flex items-center justify-center shrink-0 shadow-xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-sm text-red-700 dark:text-red-300 bg-red-500/20 px-2 py-0.5 rounded-md border border-red-500/30">
                  {item.hrCode}
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-600 text-white shadow-xs">
                  ACCIÓN RESTRINGIDA
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                Confirmar Eliminación / Anulación
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 text-xs">
          {/* Card Resumen de la HR */}
          <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-2">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Asunto</span>
                <p className="font-bold text-slate-800 dark:text-slate-100 text-xs leading-snug line-clamp-2">
                  {item.reference}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-white/5">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Remitente</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                  {item.senderName}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Custodia Actual</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                  {item.currentArea}
                </span>
              </div>
            </div>
          </div>

          {/* Selector de Modo */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-2">
              Tipo de Operación:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteMode('DELETE')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  deleteMode === 'DELETE'
                    ? 'border-red-500 bg-red-500/15 shadow-sm'
                    : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-xs">
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar Definitivo</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                  Borra el trámite y sus adjuntos permanentemente del sistema.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDeleteMode('ANULAR')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  deleteMode === 'ANULAR'
                    ? 'border-amber-500 bg-amber-500/15 shadow-sm'
                    : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                  <Ban className="w-4 h-4" />
                  <span>Anular Trámite</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                  Mantiene el CITE/código pero cambia su estado a ANULADO.
                </p>
              </button>
            </div>
          </div>

          {/* Motivo de la acción */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
              Motivo u Observación (Opcional):
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Registro duplicado / Solicitud retirada por el remitente / Error de transcripción"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Warning Message */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px]">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>
              Esta acción sólo puede ser realizada por funcionarios con privilegio explícito de correspondencia.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-bold cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className={`px-5 py-2.5 rounded-xl text-white font-black flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${
                deleteMode === 'DELETE'
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30'
                  : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
              }`}
            >
              {deleteMode === 'DELETE' ? <Trash2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
              <span>
                {isSubmitting
                  ? 'Procesando...'
                  : deleteMode === 'DELETE'
                  ? 'Eliminar Hoja de Ruta'
                  : 'Anular Trámite'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
