import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@store/store';
import { addMovement } from '@store/correspondenceSlice';
import { X, Send, Stamp, ArrowRight, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { RouteSheetItem } from '../types/correspondence.types';

interface AddMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: RouteSheetItem;
}

const CHLS_DESTINATION_AREAS = [
  'CONTRATACIONES Y ADQUISICIONES',
  'TESORERÍA Y FINANZAS',
  'GERENCIA GENERAL',
  'COMISIÓN HÍPICA',
  'CAPITANÍA DEPORTES / TENIS',
  'ASESORÍA LEGAL',
  'MANTENIMIENTO Y OBRAS',
  'DIRECTORIO / PRESIDENCIA',
  'ALMACÉN',
  'SECRETARÍA GENERAL',
];

const QUICK_STAMPS = [
  'FAVOR SU ATENCIÓN',
  'FAVOR REALIZAR EL PAGO',
  'PARA INFORME TÉCNICO / LEGAL',
  'PARA SU CONOCIMIENTO Y FINES',
  'PARA VISTO BUENO Y FIRMA',
  'OBSERVADO / SOLICITAR SUBSANACIÓN',
  'TRÁMITE CONCLUIDO / ARCHIVAR',
];

export const AddMovementModal: React.FC<AddMovementModalProps> = ({ isOpen, onClose, item }) => {
  const dispatch = useDispatch<AppDispatch>();

  const [targetArea, setTargetArea] = useState('TESORERÍA Y FINANZAS');
  const [targetPersonName, setTargetPersonName] = useState('');
  const [selectedCcAreas, setSelectedCcAreas] = useState<string[]>([]);
  const [ccPersonsText, setCcPersonsText] = useState('');
  const [quickStamp, setQuickStamp] = useState('FAVOR REALIZAR EL PAGO');
  const [instruction, setInstruction] = useState('Favor realizar el pago según presupuesto adjunto.');
  const [newStatus, setNewStatus] = useState<string>('DERIVADO');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSelectStamp = (stamp: string) => {
    setQuickStamp(stamp);
    if (stamp === 'TRÁMITE CONCLUIDO / ARCHIVAR') {
      setInstruction('Trámite atendido satisfactoriamente. Proceder al archivo correspondiente.');
      setNewStatus('CONCLUIDO');
    } else if (stamp === 'OBSERVADO / SOLICITAR SUBSANACIÓN') {
      setInstruction('Se observan discrepancias en la documentación. Favor subsanar en un plazo de 10 días.');
      setNewStatus('OBSERVADO');
    } else {
      setInstruction(stamp);
      setNewStatus('DERIVADO');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!instruction.trim()) {
      toast.error('Por favor escribe la instrucción del proveído');
      return;
    }

    setIsSubmitting(true);
    try {
      const action = await dispatch(
        addMovement({
          routeSheetId: item.id,
          data: {
            targetArea,
            targetPersonName: targetPersonName.trim() || null,
            ccAreas: selectedCcAreas,
            ccPersons: ccPersonsText.trim() || null,
            instruction: instruction.trim(),
            quickStamp,
            newStatus,
          },
        })
      );

      if (addMovement.fulfilled.match(action)) {
        toast.success('Derivación con copias emitida exitosamente 🚀');
        onClose();
      } else {
        toast.error('Error al agregar el proveído');
      }
    } catch {
      toast.error('Error inesperado al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-md flex justify-center items-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-[#0c1410] border border-slate-200 dark:border-brand-gold/20 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-black/20">
          <div>
            <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              Hoja de Ruta: {item.hrCode}
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Stamp className="w-5 h-5 text-brand-gold" />
              <span>Nuevo Proveído / Derivación</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-sm">
          
          {/* Destination Area & Person */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                A: Área de Destino <span className="text-red-500">*</span>
              </label>
              <select
                value={targetArea}
                onChange={(e) => setTargetArea(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#070e0a] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-gold/50 outline-none"
              >
                {CHLS_DESTINATION_AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                Destinatario (Funcionario)
              </label>
              <input
                type="text"
                placeholder="Ej. Lic. Meneses / Tesorería"
                value={targetPersonName}
                onChange={(e) => setTargetPersonName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#070e0a] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-gold/50 outline-none"
              />
            </div>
          </div>

          {/* Con Copia a (C.C. Multi-Destinatarios) */}
          <div className="bg-slate-50/80 dark:bg-white/[0.02] p-3.5 rounded-2xl border border-slate-200 dark:border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5 text-brand-gold" />
                <span>Con Copia a (C.C. Informativo):</span>
              </label>
              {selectedCcAreas.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/30">
                  {selectedCcAreas.length} {selectedCcAreas.length === 1 ? 'área' : 'áreas'} en copia
                </span>
              )}
            </div>

            {/* Chips de Selección de Áreas */}
            <div className="flex flex-wrap gap-1.5">
              {CHLS_DESTINATION_AREAS.filter((a) => a !== targetArea).map((area) => {
                const isSelected = selectedCcAreas.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedCcAreas((prev) => prev.filter((a) => a !== area));
                      } else {
                        setSelectedCcAreas((prev) => [...prev, area]);
                      }
                    }}
                    className={`text-[10.5px] font-bold px-2.5 py-1 rounded-xl border transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500 shadow-xs scale-[1.02]'
                        : 'bg-white dark:bg-black/30 text-slate-600 dark:text-gray-400 border-slate-200 dark:border-white/10 hover:border-emerald-500/50'
                    }`}
                  >
                    <span>{isSelected ? '✓' : '+'}</span>
                    <span>{area}</span>
                  </button>
                );
              })}
            </div>

            <div>
              <input
                type="text"
                placeholder="Nombres o cargos adicionales en C.C. (ej. Asesoría Legal Externa, Auditoría)"
                value={ccPersonsText}
                onChange={(e) => setCcPersonsText(e.target.value)}
                className="w-full bg-white dark:bg-[#070e0a] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-1 focus:ring-brand-gold"
              />
            </div>
          </div>

          {/* Quick Stamps 1-Touch */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
              <Stamp className="w-3.5 h-3.5 text-brand-gold" />
              <span>Sellos Frecuentes de 1 Toque:</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_STAMPS.map((stamp) => (
                <button
                  key={stamp}
                  type="button"
                  onClick={() => handleSelectStamp(stamp)}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all ${
                    quickStamp === stamp
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm scale-[1.02]'
                      : 'bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-emerald-500'
                  }`}
                >
                  {stamp}
                </button>
              ))}
            </div>
          </div>

          {/* Instruction Text */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
              Instrucción / Proveído <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-[#070e0a] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-gold/50 outline-none"
            />
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
              Nuevo Estado de la Hoja de Ruta
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#070e0a] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-brand-gold/50 outline-none"
            >
              <option value="DERIVADO">DERIVADO (En traslado a otra área)</option>
              <option value="EN_PROCESO">EN PROCESO (En elaboración de informe)</option>
              <option value="OBSERVADO">OBSERVADO (Requiere corrección o datos)</option>
              <option value="EN_APROBACION">EN APROBACIÓN (Directorio / Gerencia)</option>
              <option value="CONCLUIDO">CONCLUIDO (Atendido y finalizado)</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex justify-end items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-700/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Registrando...' : 'Emitir Proveído & Derivar'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
export default AddMovementModal;
