import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@store/store';
import { archiveRouteSheet, fetchCorrespondenceStats, fetchRouteSheets } from '@store/correspondenceSlice';
import { RouteSheetItem } from '../types/correspondence.types';
import { X, Archive, Building2, Layers, Check, FileText, AlertCircle, Sparkles, FolderArchive, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import SmartCorrespondenceInput from './SmartCorrespondenceInput';
import SmartCorrespondenceTextarea from './SmartCorrespondenceTextarea';

interface ArchiveRouteSheetModalProps {
  item: RouteSheetItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESET_LOCATIONS = [
  'ARCHIVO CENTRAL / ESTANTE A - SECTOR FINANZAS',
  'ARCHIVO CENTRAL / ESTANTE B - SECRETARÍA GENERAL',
  'ARCHIVO CENTRAL / ESTANTE C - HÍPICA & DEPORTES',
  'ARCHIVO CENTRAL / ESTANTE D - ASESORÍA LEGAL',
  'ARCHIVO DE GESTIÓN / CAJA CORRIENTE 2026',
];

const PRESET_REASONS = [
  'Trámite concluido favorablemente y notificado al interesado.',
  'Pago verificado y comprobantes archivados en Tesorería.',
  'Contrato firmado y resguardado para custodia permanente.',
  'Informe técnico emitido y sin observaciones pendientes.',
  'Solicitud de socio atendida y cerrada.',
];

export const ArchiveRouteSheetModal: React.FC<ArchiveRouteSheetModalProps> = ({
  item,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [archiveLocation, setArchiveLocation] = useState(PRESET_LOCATIONS[0]);
  const [archiveBox, setArchiveBox] = useState('TOMO 2026-01 / GAVETA 04');
  const [archiveNotes, setArchiveNotes] = useState(PRESET_REASONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveLocation.trim()) {
      toast.error('Debe indicar la ubicación física en el archivo');
      return;
    }

    setIsSubmitting(true);
    try {
      await dispatch(
        archiveRouteSheet({
          routeSheetId: item.id,
          data: {
            archiveLocation: archiveLocation.trim(),
            archiveBox: archiveBox.trim() || undefined,
            archiveNotes: archiveNotes.trim() || undefined,
          },
        })
      ).unwrap();

      toast.success(`Hoja de Ruta ${item.hrCode} archivada en Archivo Central`);
      dispatch(fetchCorrespondenceStats());
      dispatch(fetchRouteSheets());
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err || 'Error al archivar la Hoja de Ruta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-[#07110c] border-2 border-emerald-500/50 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_0_80px_rgba(16,185,129,0.3)] my-8">
        
        {/* Header */}
        <div className="p-6 border-b border-emerald-500/30 flex justify-between items-center bg-slate-50/90 dark:bg-[#091810]">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Remitir a Archivo Central & Custodia</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/40">
                  {item.hrCode}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Clasificación, signatura topográfica y cierre definitivo del expediente
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Summary Box */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-xs text-slate-800 dark:text-emerald-200">
            <AlertCircle className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-950 dark:text-white">
                Expediente: {item.hrCode} — {item.reference}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-gray-400 mt-0.5">
                Al archivar, el trámite pasará al estado <strong>CONCLUIDO</strong> y quedará registrado en el <strong>Libro de Archivo Central</strong> con su ubicación física exacta para futuras auditorías o consultas.
              </p>
            </div>
          </div>

          {/* 1. Ubicación Física / Signatura */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand-gold" />
              <span>1. Estante / Sector en Archivo Central:</span>
            </label>
            <SmartCorrespondenceInput
              required
              value={archiveLocation}
              onChange={(e) => setArchiveLocation(e.target.value)}
              placeholder="Ej. ARCHIVO CENTRAL / ESTANTE A - SECTOR FINANZAS"
              className="w-full bg-slate-50 dark:bg-black/40 border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl p-3.5 text-xs font-mono font-black text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />
            {/* Quick Location Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESET_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setArchiveLocation(loc)}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Tomo, Archivador o N° de Caja */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-brand-gold" />
              <span>2. Tomo, Archivador o N° de Caja / Gaveta:</span>
            </label>
            <SmartCorrespondenceInput
              value={archiveBox}
              onChange={(e) => setArchiveBox(e.target.value)}
              placeholder="Ej. TOMO 2026-01 / GAVETA 04 o CAJA N° 12"
              className="w-full bg-slate-50 dark:bg-black/40 border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl p-3.5 text-xs font-mono font-bold text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />
          </div>

          {/* 3. Motivo de Archivo / Auto de Conclusión */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-brand-gold" />
                <span>3. Auto de Conclusión / Motivo de Cierre:</span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-brand-gold font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Autocorrector de acentos & Predicción</span>
              </span>
            </label>
            <SmartCorrespondenceTextarea
              rows={3}
              value={archiveNotes}
              onChange={(e) => setArchiveNotes(e.target.value)}
              enablePrediction={true}
              enableQuickPhrases={true}
              placeholder="Describa el motivo o resolución por la cual concluye el expediente..."
              className="w-full bg-slate-50 dark:bg-[#0c1a13] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl p-3.5 text-xs font-medium text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs resize-none"
            />
            {/* Quick Reason Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESET_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setArchiveNotes(reason)}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-emerald-500/30 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-700 hover:from-emerald-400 hover:to-teal-600 text-slate-950 font-black shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
            >
              <FolderArchive className="w-4 h-4 text-slate-950" />
              <span>{isSubmitting ? 'Archivando...' : 'Confirmar y Archivar en Custodia'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
export default ArchiveRouteSheetModal;
