import React, { useState } from 'react';
import { api } from '@config/api';
import { X, Receipt, Zap, Droplets, Flame, Wifi, Building2, Check, Printer, Camera, Upload, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

interface GatehouseInvoiceReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_UTILITIES = [
  { id: 'DELAPAZ', name: 'DELAPAZ', label: 'Luz / Electricidad', icon: Zap, color: 'text-amber-500 bg-amber-500/15 border-amber-500/30' },
  { id: 'EPSAS', name: 'EPSAS', label: 'Agua Potable', icon: Droplets, color: 'text-cyan-500 bg-cyan-500/15 border-cyan-500/30' },
  { id: 'YPFB', name: 'YPFB GAS', label: 'Gas Natural', icon: Flame, color: 'text-orange-500 bg-orange-500/15 border-orange-500/30' },
  { id: 'ENTEL_TIGO', name: 'ENTEL / TIGO', label: 'Internet & Telefonía', icon: Wifi, color: 'text-blue-500 bg-blue-500/15 border-blue-500/30' },
  { id: 'OTRO', name: 'OTRA EMPRESA', label: 'Proveedor / Insumos', icon: Building2, color: 'text-purple-500 bg-purple-500/15 border-purple-500/30' },
];

export const GatehouseInvoiceReceiptModal: React.FC<GatehouseInvoiceReceiptModalProps> = ({ isOpen, onClose }) => {
  const [selectedUtility, setSelectedUtility] = useState('DELAPAZ');
  const [customCompanyName, setCustomCompanyName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [billingPeriod, setBillingPeriod] = useState(
    new Intl.DateTimeFormat('es-BO', { month: 'long', year: 'numeric' }).format(new Date()).toUpperCase()
  );
  const [courierName, setCourierName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptResult, setReceiptResult] = useState<{ hrCode: string; reference: string; date: string } | null>(null);

  if (!isOpen) return null;

  const getActiveCompanyName = () => {
    if (selectedUtility === 'OTRO') {
      return customCompanyName.trim() || 'PROVEEDOR EXTERNO';
    }
    const found = PRESET_UTILITIES.find((u) => u.id === selectedUtility);
    return found ? found.name : 'EMPRESA DE SERVICIO';
  };

  const handleReset = () => {
    setSelectedUtility('DELAPAZ');
    setCustomCompanyName('');
    setInvoiceNumber('');
    setInvoiceAmount('');
    setCourierName('');
    setNotes('');
    setReceiptResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invoiceNumber.trim()) {
      toast.error('Por favor ingresa el N° de Factura o Aviso');
      return;
    }

    const company = getActiveCompanyName();
    const reference = `RECEPCIÓN DE FACTURA DE SERVICIO: ${company} — N° ${invoiceNumber.trim().toUpperCase()} — PERIODO ${billingPeriod.toUpperCase()} ${
      invoiceAmount ? `— MONTO: BS. ${invoiceAmount}` : ''
    }`;

    setIsSubmitting(true);
    try {
      const response = await api.post('/correspondence/route-sheets', {
        senderType: 'EXTERNO',
        senderName: `${company} (ENTREGADO POR: ${courierName.trim().toUpperCase() || 'MENSAJERO'})`,
        senderArea: 'CASETA DE CONTROL DE ENTRADA (RECEPCIÓN PUERTA)',
        senderDoc: invoiceNumber.trim().toUpperCase(),
        cite: `FAC-${company.substring(0, 4)}-${invoiceNumber.trim().toUpperCase()}`,
        pageCount: 1,
        reference,
        attachmentDescription: `ORIGINAL FACTURA FÍSICA ${invoiceNumber.trim().toUpperCase()}${notes ? ` — NOTA: ${notes.trim().toUpperCase()}` : ''}`,
        priority: 'NORMAL',
        initialTargetArea: 'SECRETARÍA GENERAL',
        initialTargetPerson: 'Secretaría de Gerencia General',
        initialInstruction: 'FAVOR SU ATENCIÓN: Factura de servicios recibida en Caseta de Entrada. Derivar a Tesorería y Finanzas para programación de pago.',
        initialQuickStamp: 'FAVOR SU ATENCIÓN',
      });

      if (response.data.success) {
        toast.success('¡Factura radicada y enviada a Secretaría y Tesorería! 🧾✨');
        setReceiptResult({
          hrCode: response.data.data.hrCode,
          reference,
          date: new Date().toLocaleString('es-BO'),
        });
      } else {
        toast.error('Error al registrar la factura');
      }
    } catch {
      toast.error('No se pudo conectar con el servidor para registrar la factura');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex justify-center items-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-white dark:bg-[#0c1410] border border-slate-200 dark:border-brand-gold/20 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/80 dark:bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Caseta de Entrada — Recepción de Facturas
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  SERVICIOS BÁSICOS
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Registro rápido exclusivo para facturas de luz, agua, gas y proveedores en puerta.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-sm space-y-6">
          {receiptResult ? (
            /* Success confirmation screen */
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
                  REGISTRO COMPLETADO EXITOSAMENTE
                </span>
                <h3 className="text-2xl font-black text-slate-950 dark:text-white mt-1 font-mono">
                  {receiptResult.hrCode}
                </h3>
                <p className="text-xs text-slate-600 dark:text-gray-300 mt-2 max-w-md mx-auto leading-relaxed">
                  La factura ha sido registrada en el sistema y remitida automáticamente a la <strong>Secretaría de Gerencia General</strong> y <strong>Tesorería y Finanzas</strong>.
                </p>
              </div>

              {/* QR Verification Card */}
              <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 p-5 rounded-2xl max-w-sm mx-auto flex items-center gap-4 text-left">
                <div className="p-1.5 bg-white rounded-xl border border-slate-200 shrink-0">
                  <QRCodeSVG value={receiptResult.hrCode} size={68} level="M" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Fecha y Hora</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-white block font-mono">
                    {receiptResult.date}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                    Radicado en Caseta de Entrada
                  </span>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="bg-brand-gold hover:bg-yellow-500 text-slate-950 font-black px-6 py-2.5 rounded-2xl text-xs shadow-md transition-transform hover:scale-105 active:scale-95"
                >
                  + Recibir Otra Factura
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white font-bold px-6 py-2.5 rounded-2xl text-xs hover:bg-slate-200 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* 1. Selector de Empresa / Servicio (1 toque) */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-2.5">
                  1. Selecciona la Empresa o Servicio <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PRESET_UTILITIES.map((u) => {
                    const Icon = u.icon;
                    const isSelected = selectedUtility === u.id;
                    return (
                      <div
                        key={u.id}
                        onClick={() => setSelectedUtility(u.id)}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/20 scale-[1.02]'
                            : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${u.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />}
                        </div>
                        <div>
                          <span className="text-xs font-black text-slate-900 dark:text-white block">
                            {u.name}
                          </span>
                          <span className="text-[10.5px] text-slate-500 dark:text-gray-400 block font-medium">
                            {u.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Si seleccionó OTRA EMPRESA */}
              {selectedUtility === 'OTRO' && (
                <div className="bg-slate-50 dark:bg-white/[0.02] p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 animate-fadeIn">
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Nombre de la Empresa o Proveedor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. AGUAS DEL ILLIMANI, DISTRIBUIDORA DE ALIMENTOS, ETC."
                    value={customCompanyName}
                    onChange={(e) => setCustomCompanyName(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white uppercase outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              {/* 2. Datos de la Factura */}
              <div className="bg-slate-50/80 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200 dark:border-white/5 space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-gray-300 block">
                  2. Datos del Documento
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                      N° de Factura / Aviso de Cobranza <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 10492819 o AVISO-492"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      required
                      className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                      Monto en Bolivianos (Bs.) <span className="text-slate-400 font-normal">(Opcional)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ej. 1250.50"
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(e.target.value)}
                      className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                      Mes / Periodo de Facturación
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. AGOSTO 2026"
                      value={billingPeriod}
                      onChange={(e) => setBillingPeriod(e.target.value)}
                      className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white uppercase outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                      Nombre del Mensajero / Quien Entrega
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Juan Pérez (Courier)"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Lectura / Observación Rápida de Puerta (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Medidor Principal de Caballerizas, entregado con sobre cerrado"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Botón de Envío */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black px-6 py-2.5 rounded-2xl text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  <Receipt className="w-4 h-4" />
                  <span>{isSubmitting ? 'Registrando...' : 'Registrar Factura en Puerta'}</span>
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};
export default GatehouseInvoiceReceiptModal;
