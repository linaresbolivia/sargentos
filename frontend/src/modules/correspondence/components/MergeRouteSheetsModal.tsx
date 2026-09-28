import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@store/store';
import { mergeRouteSheets, fetchRouteSheets, fetchCorrespondenceStats } from '@store/correspondenceSlice';
import { X, Link2, Search, Check, FileText, AlertTriangle, Layers, Building2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { RouteSheetItem } from '../types/correspondence.types';
import CrestLogo from '@shared/components/CrestLogo';

interface MergeRouteSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetItem: RouteSheetItem;
}

export const MergeRouteSheetsModal: React.FC<MergeRouteSheetsModalProps> = ({
  isOpen,
  onClose,
  targetItem,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { items } = useSelector((state: RootState) => state.correspondence);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [reason, setReason] = useState('Se acumulan antecedentes, cotizaciones e informes conexos al trámite principal.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Filter out the target item and already concluded/fused items if necessary
  const candidateItems = items.filter(
    (item) =>
      item.id !== targetItem.id &&
      item.status !== 'ANULADO' &&
      !item.currentArea?.startsWith('FUSIONADO EN')
  );

  const filteredCandidates = candidateItems.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.hrCode.toLowerCase().includes(q) ||
      item.reference.toLowerCase().includes(q) ||
      item.senderName.toLowerCase().includes(q) ||
      (item.cite && item.cite.toLowerCase().includes(q))
    );
  });

  const selectedItemsData = candidateItems.filter((item) => selectedSourceIds.includes(item.id));
  const additionalPages = selectedItemsData.reduce((acc, curr) => acc + (curr.pageCount || 1), 0);
  const targetPages = targetItem.pageCount || 1;
  const consolidatedPages = targetPages + additionalPages;

  const handleToggleSelect = (id: string) => {
    if (selectedSourceIds.includes(id)) {
      setSelectedSourceIds((prev) => prev.filter((i) => i !== id));
    } else {
      setSelectedSourceIds((prev) => [...prev, id]);
    }
  };

  const handleSelectAllFiltered = () => {
    const ids = filteredCandidates.map((c) => c.id);
    const allSelected = ids.every((id) => selectedSourceIds.includes(id));
    if (allSelected) {
      setSelectedSourceIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedSourceIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedSourceIds.length === 0) {
      toast.error('Por favor selecciona al menos una Hoja de Ruta para fusionar');
      return;
    }

    if (!reason.trim()) {
      toast.error('Por favor especifica el motivo de la acumulación');
      return;
    }

    setIsSubmitting(true);
    try {
      const resultAction = await dispatch(
        mergeRouteSheets({
          targetRouteSheetId: targetItem.id,
          sourceRouteSheetIds: selectedSourceIds,
          reason: reason.trim(),
        })
      );

      if (mergeRouteSheets.fulfilled.match(resultAction)) {
        toast.success(
          `¡Expediente consolidado con éxito! Se fusionaron ${selectedSourceIds.length} trámites. Fojas totales: ${consolidatedPages} 📚✨`
        );
        dispatch(fetchRouteSheets());
        dispatch(fetchCorrespondenceStats());
        onClose();
      } else {
        toast.error('Error al fusionar las Hojas de Ruta');
      }
    } catch {
      toast.error('Error inesperado al ejecutar la fusión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex justify-center items-center p-3 sm:p-6 lg:p-8 animate-fadeIn">
      <div className="bg-white dark:bg-[#0c1410] border-2 border-slate-200 dark:border-emerald-500/30 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/80 dark:bg-black/30">
          <div className="flex items-center gap-3.5">
            <CrestLogo size="sm" className="w-10 h-10 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Link2 className="w-6 h-6 text-brand-gold" />
                  <span>Fusión & Acumulación de Expedientes</span>
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                Consolidar antecedentes, cotizaciones o informes conexos en un solo expediente maestro.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6 text-sm">
          
          {/* Target / Matriz Summary Banner */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-[#0e271a] dark:to-[#050f0a] border-2 border-emerald-500/40 p-5 rounded-3xl space-y-2 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950">
                  EXPEDIENTE MATRIZ (PRINCIPAL)
                </span>
                <span className="font-mono text-sm font-black text-emerald-950 dark:text-emerald-300">
                  {targetItem.hrCode}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-600 dark:text-gray-300">
                Fojas actuales: <strong>{targetPages} fojas</strong>
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase leading-snug">
              {targetItem.reference}
            </h3>
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-gray-400 pt-1">
              <span>Remite: <strong className="text-slate-700 dark:text-gray-200">{targetItem.senderName}</strong></span>
              <span>Ubicación actual: <strong className="text-brand-gold">{targetItem.currentArea}</strong></span>
            </div>
          </div>

          {/* Candidate Selection Section */}
          <div className="bg-slate-50/90 dark:bg-white/[0.02] p-5 rounded-3xl border border-slate-200 dark:border-white/5 space-y-4 shadow-sm">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-gray-200 block">
                  Selecciona las Hojas de Ruta a incorporar al trámite
                </label>
                <span className="text-xs text-slate-500 dark:text-gray-400">
                  Los proveídos y documentos adjuntos se integrarán cronológicamente.
                </span>
              </div>

              {filteredCandidates.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-xs font-bold text-emerald-700 dark:text-brand-gold hover:underline cursor-pointer"
                >
                  {filteredCandidates.every((c) => selectedSourceIds.includes(c.id))
                    ? 'Desmarcar visibles'
                    : 'Marcar todos los visibles'}
                </button>
              )}
            </div>

            {/* Search filter for candidate route sheets */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por N° HR, CITE, remitente o asunto para fusionar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              />
            </div>

            {/* List of candidates */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {filteredCandidates.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No hay otras Hojas de Ruta disponibles que coincidan con la búsqueda.
                </div>
              ) : (
                filteredCandidates.map((candidate) => {
                  const isChecked = selectedSourceIds.includes(candidate.id);
                  return (
                    <div
                      key={candidate.id}
                      onClick={() => handleToggleSelect(candidate.id)}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isChecked
                          ? 'bg-emerald-500/15 border-emerald-500 shadow-sm'
                          : 'bg-white dark:bg-black/30 border-slate-200 dark:border-white/5 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-black'
                              : 'border-slate-300 dark:border-white/20'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-emerald-950 dark:text-emerald-300">
                              {candidate.hrCode}
                            </span>
                            {candidate.cite && (
                              <span className="text-[10.5px] font-mono text-slate-500 dark:text-gray-400">
                                ({candidate.cite})
                              </span>
                            )}
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                              {candidate.pageCount || 1} fojas
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-800 dark:text-gray-200 truncate mt-0.5">
                            {candidate.reference}
                          </p>
                          <span className="text-[10.5px] text-slate-500 dark:text-gray-400 block truncate">
                            Remite: {candidate.senderName} ({candidate.senderArea || 'Externo'})
                          </span>
                        </div>
                      </div>

                      <span className="text-[11px] font-black text-brand-gold uppercase shrink-0 text-right">
                        {candidate.currentArea}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Consolidated Pages Live Counter */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/5 text-center">
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase block">
                Fojas Matriz
              </span>
              <span className="text-lg font-black text-slate-800 dark:text-white font-mono">
                {targetPages}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase block">
                + Fojas Acumuladas
              </span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                +{additionalPages} ({selectedSourceIds.length} {selectedSourceIds.length === 1 ? 'trámite' : 'trámites'})
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase block">
                Total Consolidado
              </span>
              <span className="text-lg font-black text-brand-gold font-mono">
                = {consolidatedPages} Fojas
              </span>
            </div>
          </div>

          {/* Motivo de la Acumulación */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-gray-200">
              Motivo o Justificación de la Fusión <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="Explica el motivo por el cual se acumulan estas Hojas de Ruta (ej. informes conexos, cotizaciones del mismo proveedor)..."
              className="w-full bg-white dark:bg-[#070e0a] border-2 border-slate-300 dark:border-white/10 rounded-2xl p-4 text-slate-950 dark:text-white font-medium text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed shadow-xs"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex justify-end items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-2xl font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white text-sm transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedSourceIds.length === 0}
              className="flex items-center gap-2.5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-700 hover:from-emerald-400 hover:to-teal-600 text-slate-950 font-black px-8 py-3.5 rounded-2xl text-sm sm:text-base shadow-xl shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Link2 className="w-5 h-5 text-slate-950" />
              <span>
                {isSubmitting
                  ? 'Consolidando...'
                  : `Confirmar Fusión (${selectedSourceIds.length} trámites)`}
              </span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
export default MergeRouteSheetsModal;
