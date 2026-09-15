import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@store/store';
import { archiveRouteSheet, fetchCorrespondenceStats, fetchRouteSheets } from '@store/correspondenceSlice';
import { RouteSheetItem } from '../types/correspondence.types';
import {
  X,
  Building2,
  Layers,
  FileText,
  AlertCircle,
  Sparkles,
  FolderArchive,
  FolderCheck,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import SmartCorrespondenceInput from './SmartCorrespondenceInput';
import SmartCorrespondenceTextarea from './SmartCorrespondenceTextarea';

interface ArchiveRouteSheetModalProps {
  item: RouteSheetItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialArchiveType?: 'PERSONAL' | 'CENTRAL';
}

const PERSONAL_PRESET_LOCATIONS = [
  'MI ARCHIVO PERSONAL / MI ESCRITORIO',
  'MI ARCHIVO PERSONAL / GESTIÓN 2026',
  'CARPETA PERSONAL / EXPEDIENTES CERRADOS',
  'ARCHIVO DE GESTIÓN / MI DESPACHO',
];

const CENTRAL_PRESET_LOCATIONS = [
  'ARCHIVO CENTRAL / ESTANTE A - SECTOR FINANZAS',
  'ARCHIVO CENTRAL / ESTANTE B - SECRETARÍA GENERAL',
  'ARCHIVO CENTRAL / ESTANTE C - HÍPICA & DEPORTES',
  'ARCHIVO CENTRAL / ESTANTE D - ASESORÍA LEGAL',
  'ARCHIVO DE GESTIÓN / CAJA GENERAL 2026',
];

const PERSONAL_PRESET_REASONS = [
  'Trámite atendido y guardado para mi archivo de consulta personal.',
  'Copia de respaldo y antecedentes resguardados en mi despacho.',
  'Concluido bajo mi responsabilidad y archivado en mi oficina.',
  'Resolución concluida y archivada en mi legajo de gestión.',
];

const CENTRAL_PRESET_REASONS = [
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
  initialArchiveType = 'PERSONAL',
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [archiveType, setArchiveType] = useState<'PERSONAL' | 'CENTRAL'>(initialArchiveType);
  const [archiveLocation, setArchiveLocation] = useState(
    initialArchiveType === 'PERSONAL' ? PERSONAL_PRESET_LOCATIONS[0] : CENTRAL_PRESET_LOCATIONS[0]
  );
  const [archiveBox, setArchiveBox] = useState(
    initialArchiveType === 'PERSONAL' ? 'CARPETA 01 / GESTIÓN 2026' : 'TOMO 2026-01 / GAVETA 04'
  );
  const [archiveNotes, setArchiveNotes] = useState(
    initialArchiveType === 'PERSONAL' ? PERSONAL_PRESET_REASONS[0] : CENTRAL_PRESET_REASONS[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSelectType = (type: 'PERSONAL' | 'CENTRAL') => {
    setArchiveType(type);
    if (type === 'PERSONAL') {
      setArchiveLocation(PERSONAL_PRESET_LOCATIONS[0]);
      setArchiveBox('CARPETA 01 / GESTIÓN 2026');
      setArchiveNotes(PERSONAL_PRESET_REASONS[0]);
    } else {
      setArchiveLocation(CENTRAL_PRESET_LOCATIONS[0]);
      setArchiveBox('TOMO 2026-01 / GAVETA 04');
      setArchiveNotes(CENTRAL_PRESET_REASONS[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveLocation.trim()) {
      toast.error('Debe indicar la ubicación física o carpeta del archivo');
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
            archiveType,
          },
        })
      ).unwrap();

      const successMsg =
        archiveType === 'PERSONAL'
          ? `Hoja de Ruta ${item.hrCode} guardada en tu Archivo Personal 📁`
          : `Hoja de Ruta ${item.hrCode} archivada en Archivo Central 🏛️`;

      toast.success(successMsg);
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

  const activePresets = archiveType === 'PERSONAL' ? PERSONAL_PRESET_LOCATIONS : CENTRAL_PRESET_LOCATIONS;
  const activeReasons = archiveType === 'PERSONAL' ? PERSONAL_PRESET_REASONS : CENTRAL_PRESET_REASONS;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-[#07110c] border-2 border-emerald-500/50 rounded-3xl w-full max-w-2xl overflow-hidden shadow-[0_0_80px_rgba(16,185,129,0.3)] my-8">
        
        {/* Header */}
        <div className="p-6 border-b border-emerald-500/30 flex justify-between items-center bg-slate-50/90 dark:bg-[#091810]">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              {archiveType === 'PERSONAL' ? (
                <FolderCheck className="w-6 h-6 text-emerald-400" />
              ) : (
                <FolderArchive className="w-6 h-6 text-brand-gold" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{archiveType === 'PERSONAL' ? 'Guardar en Mi Archivo Personal' : 'Remitir a Archivo Central'}</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/40">
                  {item.hrCode}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                {archiveType === 'PERSONAL'
                  ? 'Custodia personal en su propio archivo de trabajo / despacho'
                  : 'Custodia institucional permanente y control central del Club'}
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
          
          {/* Selector simple: Archivo Personal vs Archivo Central */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-emerald-300">
              Destino del Archivo:
            </label>
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-black/40 rounded-2xl border border-slate-200 dark:border-emerald-500/20">
              <button
                type="button"
                onClick={() => handleSelectType('PERSONAL')}
                className={`flex items-center gap-3 p-3 rounded-xl font-black text-xs transition-all cursor-pointer ${
                  archiveType === 'PERSONAL'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 border border-emerald-400/50'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="p-1.5 rounded-lg bg-white/20">
                  <FolderCheck className="w-5 h-5 shrink-0" />
                </div>
                <div className="text-left">
                  <div className="leading-none font-black text-xs">📁 Mi Archivo Personal</div>
                  <div className={`text-[10px] mt-1 font-normal ${archiveType === 'PERSONAL' ? 'text-emerald-100' : 'text-slate-500 dark:text-gray-400'}`}>
                    Para consulta y custodia propia
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectType('CENTRAL')}
                className={`flex items-center gap-3 p-3 rounded-xl font-black text-xs transition-all cursor-pointer ${
                  archiveType === 'CENTRAL'
                    ? 'bg-gradient-to-r from-brand-gold to-yellow-500 text-slate-950 shadow-lg shadow-amber-950/40 border border-yellow-300'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="p-1.5 rounded-lg bg-black/10">
                  <Building2 className="w-5 h-5 shrink-0" />
                </div>
                <div className="text-left">
                  <div className="leading-none font-black text-xs">🏛️ Archivo Central</div>
                  <div className={`text-[10px] mt-1 font-normal ${archiveType === 'CENTRAL' ? 'text-slate-900 font-semibold' : 'text-slate-500 dark:text-gray-400'}`}>
                    Custodia general del Club
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Summary Box */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-xs text-slate-800 dark:text-emerald-200">
            <AlertCircle className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-950 dark:text-white">
                Expediente: {item.hrCode} — {item.reference}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-gray-400 mt-0.5">
                {archiveType === 'PERSONAL'
                  ? 'Este trámite se guardará en tu Archivo Personal. Podrás acceder a él en cualquier momento desde tu pestaña "Mi Archivo Personal" y también desarchivarlo si necesitas reabrirlo.'
                  : 'Al archivar en Archivo Central, el trámite pasará a la custodia permanente de la institución y estará disponible para consulta institucional en el Libro de Archivo Central.'}
              </p>
            </div>
          </div>

          {/* 1. Ubicación Física / Signatura */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand-gold" />
              <span>
                {archiveType === 'PERSONAL'
                  ? '1. Ubicación o Carpeta en Mi Archivo Personal:'
                  : '1. Estante / Sector en Archivo Central:'}
              </span>
            </label>
            <SmartCorrespondenceInput
              required
              value={archiveLocation}
              onChange={(e) => setArchiveLocation(e.target.value)}
              placeholder={
                archiveType === 'PERSONAL'
                  ? 'Ej. MI ARCHIVO PERSONAL / MI ESCRITORIO'
                  : 'Ej. ARCHIVO CENTRAL / ESTANTE A - SECTOR FINANZAS'
              }
              className="w-full bg-slate-50 dark:bg-black/40 border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl p-3.5 text-xs font-mono font-black text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />
            {/* Quick Location Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {activePresets.map((loc) => (
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
              <span>
                {archiveType === 'PERSONAL'
                  ? '2. Carpeta, Archivador o Gaveta Propia:'
                  : '2. Tomo, Archivador o N° de Caja / Gaveta:'}
              </span>
            </label>
            <SmartCorrespondenceInput
              value={archiveBox}
              onChange={(e) => setArchiveBox(e.target.value)}
              placeholder={
                archiveType === 'PERSONAL'
                  ? 'Ej. CARPETA 01 / GESTIÓN 2026'
                  : 'Ej. TOMO 2026-01 / GAVETA 04 o CAJA N° 12'
              }
              className="w-full bg-slate-50 dark:bg-black/40 border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl p-3.5 text-xs font-mono font-bold text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />
          </div>

          {/* 3. Motivo de Archivo / Auto de Conclusión */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-brand-gold" />
                <span>3. Motivo o Auto de Conclusión:</span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-brand-gold font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Autocorrector de acentos</span>
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
              {activeReasons.map((reason) => (
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
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer text-xs sm:text-sm ${
                archiveType === 'PERSONAL'
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/40 border border-emerald-400/40'
                  : 'bg-gradient-to-r from-brand-gold via-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-slate-950 shadow-amber-950/40 border border-yellow-300/60'
              }`}
            >
              {archiveType === 'PERSONAL' ? (
                <FolderCheck className="w-4 h-4 text-white" />
              ) : (
                <Building2 className="w-4 h-4 text-slate-950" />
              )}
              <span>
                {isSubmitting
                  ? 'Archivando...'
                  : archiveType === 'PERSONAL'
                  ? 'Confirmar y Guardar en Mi Archivo'
                  : 'Confirmar y Remitir a Archivo Central'}
              </span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default ArchiveRouteSheetModal;
