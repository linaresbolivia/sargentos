import React, { useState } from 'react';
import { api } from '@config/api';
import {
  X,
  Receipt,
  Zap,
  Droplets,
  Flame,
  Wifi,
  Building2,
  Check,
  Printer,
  Camera,
  Upload,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  FileCheck,
  DollarSign,
  Calendar,
  Truck,
  MessageSquare,
  Paperclip,
  UploadCloud,
  Trash2,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import CrestLogo from '@shared/components/CrestLogo';

interface GatehouseInvoiceReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_UTILITIES = [
  {
    id: 'DELAPAZ',
    name: 'DELAPAZ',
    label: 'Luz / Electricidad',
    icon: Zap,
    badgeColor: 'text-amber-400 bg-amber-500/20 border-amber-500/40',
    activeStyle: 'bg-amber-500/15 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.35)]',
  },
  {
    id: 'EPSAS',
    name: 'EPSAS',
    label: 'Agua Potable',
    icon: Droplets,
    badgeColor: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40',
    activeStyle: 'bg-cyan-500/15 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.35)]',
  },
  {
    id: 'YPFB',
    name: 'YPFB GAS',
    label: 'Gas Natural por Red',
    icon: Flame,
    badgeColor: 'text-orange-400 bg-orange-500/20 border-orange-500/40',
    activeStyle: 'bg-orange-500/15 border-orange-400 shadow-[0_0_25px_rgba(249,115,22,0.35)]',
  },
  {
    id: 'ENTEL_TIGO',
    name: 'ENTEL / TIGO',
    label: 'Internet & Telecomunicaciones',
    icon: Wifi,
    badgeColor: 'text-blue-400 bg-blue-500/20 border-blue-500/40',
    activeStyle: 'bg-blue-500/15 border-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.35)]',
  },
  {
    id: 'OTRO',
    name: 'OTRA EMPRESA / PROVEEDOR',
    label: 'Alimentos, Insumos o Obras',
    icon: Building2,
    badgeColor: 'text-purple-400 bg-purple-500/20 border-purple-500/40',
    activeStyle: 'bg-purple-500/15 border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.35)]',
  },
];

const QUICK_OBSERVATIONS = [
  'Sobre cerrado original',
  'Aviso urgente de cobranza',
  'Entregado en mano por mensajero',
  'Con sello de recepción previo',
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
  const [notes, setNotes] = useState('Sobre cerrado original');
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptResult, setReceiptResult] = useState<{
    hrCode: string;
    reference: string;
    date: string;
    filesCount: number;
  } | null>(null);

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
    setNotes('Sobre cerrado original');
    setInvoiceFiles([]);
    setReceiptResult(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setInvoiceFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setInvoiceFiles((prev) => prev.filter((_, i) => i !== index));
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
    const toastId = toast.loading('Radicando y digitalizando factura en Caseta...');
    try {
      const response = await api.post('/correspondence/route-sheets', {
        senderType: 'EXTERNO',
        senderName: `${company} (ENTREGADO POR: ${courierName.trim().toUpperCase() || 'MENSAJERO'})`,
        senderArea: 'CASETA DE CONTROL DE ENTRADA (RECEPCIÓN PUERTA)',
        senderDoc: invoiceNumber.trim().toUpperCase(),
        cite: `FAC-${company.substring(0, 4)}-${invoiceNumber.trim().toUpperCase()}`,
        pageCount: 1,
        reference,
        attachmentDescription: `ORIGINAL FACTURA FÍSICA ${invoiceNumber.trim().toUpperCase()}${notes ? ` — NOTA: ${notes.trim().toUpperCase()}` : ''}${
          invoiceFiles.length > 0 ? ` (${invoiceFiles.length} ARCHIVO/FOTO DIGITALIZADA)` : ''
        }`,
        priority: 'NORMAL',
        initialArea: 'SECRETARIA_GENERAL',
        initialTargetPerson: 'Secretaría de Gerencia General',
        initialInstruction: 'FAVOR SU ATENCIÓN: Factura de servicios recibida en Caseta de Entrada. Derivar a Tesorería y Finanzas para programación de pago.',
        initialQuickStamp: 'FAVOR SU ATENCIÓN',
        initialCcAreas: ['TESORERÍA Y FINANZAS', 'GERENCIA GENERAL'],
      });

      if (response.data.success) {
        const createdId = response.data.data.id;

        // Subir digitalizaciones de la factura si se tomaron fotos o PDFs
        if (invoiceFiles.length > 0) {
          const formData = new FormData();
          invoiceFiles.forEach((file) => {
            formData.append('files', file);
          });
          await api.post(`/correspondence/route-sheets/${createdId}/documents`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }

        toast.success('¡Factura radicada y digitalizada hacia Secretaría y Tesorería! 🧾✨', { id: toastId });
        setReceiptResult({
          hrCode: response.data.data.hrCode,
          reference,
          date: new Date().toLocaleString('es-BO'),
          filesCount: invoiceFiles.length,
        });
      } else {
        toast.error('Error al registrar la factura', { id: toastId });
      }
    } catch {
      toast.error('No se pudo conectar con el servidor para registrar la factura', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-lg flex justify-center items-center p-3 sm:p-6 lg:p-8 animate-fadeIn">
      <div className="bg-[#f8fafc] dark:bg-[#07110c] border-2 border-emerald-500/40 w-full max-w-5xl rounded-3xl shadow-[0_0_80px_rgba(16,185,129,0.25)] overflow-hidden flex flex-col justify-between max-h-[95vh]">
        
        {/* Top Header Command Bar */}
        <div className="px-6 sm:px-8 py-4 border-b border-emerald-500/30 flex justify-between items-center bg-white/90 dark:bg-[#091810] shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Receipt className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-wide">
                  CASETA DE ENTRADA — RECEPCIÓN DE FACTURAS
                </h1>
                <span className="text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                  Cero Papel
                </span>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-400 font-bold mt-0.5">
                Recepción, digitalización fotográfica y derivación instantánea a Secretaría y Tesorería
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 text-sm space-y-6">
          {receiptResult ? (
            /* Pantalla de Éxito y Comprobante QR */
            <div className="space-y-6 text-center py-6">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 text-emerald-500 border-2 border-emerald-500/40 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(16,185,129,0.4)]">
                <Check className="w-10 h-10 stroke-[3]" />
              </div>

              <div>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
                  FACTURA RECIBIDA & RADICADA EXITOSAMENTE
                </span>
                <h2 className="text-3xl font-black text-slate-950 dark:text-white mt-1 font-mono tracking-wider">
                  {receiptResult.hrCode}
                </h2>
                <p className="text-sm font-medium text-slate-600 dark:text-gray-300 mt-2 max-w-lg mx-auto leading-relaxed">
                  El comprobante ha sido generado y derivado automáticamente a <strong>Secretaría de Gerencia General</strong> y <strong>Tesorería y Finanzas</strong> con copia institucional.
                </p>

                {receiptResult.filesCount > 0 && (
                  <div className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                    <FileCheck className="w-4 h-4 text-emerald-500" />
                    <span>{receiptResult.filesCount} documento(s) digitalizado(s) con hash SHA-256 adjunto(s)</span>
                  </div>
                )}
              </div>

              {/* QR Verification Card */}
              <div className="bg-white/80 dark:bg-[#0c1a13] border-2 border-emerald-500/30 p-6 rounded-3xl max-w-md mx-auto flex items-center gap-5 text-left shadow-lg">
                <div className="p-2 bg-white rounded-2xl border border-slate-200 shrink-0 shadow-sm">
                  <QRCodeSVG value={receiptResult.hrCode} size={84} level="M" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10.5px] font-black text-slate-400 uppercase block tracking-wider">Comprobante de Caseta</span>
                  <span className="text-sm font-black text-slate-800 dark:text-white block font-mono">
                    {receiptResult.date}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                    ✓ Radicado en Caseta de Entrada
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-gray-400 block truncate max-w-[200px]">
                    {receiptResult.reference}
                  </span>
                </div>
              </div>

              <div className="flex justify-center gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black px-8 py-3.5 rounded-2xl text-sm shadow-xl shadow-emerald-500/25 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                >
                  + Recibir Otra Factura
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white font-bold px-8 py-3.5 rounded-2xl text-sm hover:bg-slate-300 dark:hover:bg-white/20 transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Columna Izquierda: Selector Táctil de Empresas (5 de 12) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-white/95 dark:bg-[#0c1a13] border-2 border-emerald-500/30 rounded-3xl p-5 shadow-lg shadow-emerald-950/20 space-y-4">
                    
                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-sm">
                          1
                        </div>
                        <h2 className="text-sm font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                          Empresa o Servicio (1 Toque)
                        </h2>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {PRESET_UTILITIES.map((u) => {
                        const isSelected = selectedUtility === u.id;
                        const Icon = u.icon;
                        return (
                          <div
                            key={u.id}
                            onClick={() => setSelectedUtility(u.id)}
                            className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between gap-2.5 select-none ${
                              isSelected
                                ? u.activeStyle + ' border-2 scale-[1.02]'
                                : 'bg-slate-50 dark:bg-black/40 border-slate-200 dark:border-white/5 hover:border-emerald-500/40 hover:bg-slate-100 dark:hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border shadow-xs ${u.badgeColor}`}>
                                <Icon className="w-4.5 h-4.5" />
                              </div>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-sm">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              )}
                            </div>
                            <div>
                              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block">
                                {u.name}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-gray-400 block font-medium mt-0.5">
                                {u.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Si seleccionó OTRA EMPRESA */}
                    {selectedUtility === 'OTRO' && (
                      <div className="bg-purple-500/10 dark:bg-purple-950/30 p-4 rounded-2xl border border-purple-500/30 space-y-2 animate-fadeIn">
                        <label className="block text-xs font-black uppercase text-purple-900 dark:text-purple-300">
                          Nombre de la Empresa o Proveedor <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. DISTRIBUIDORA DE ALIMENTOS, AGUAS DEL ILLIMANI, ETC."
                          value={customCompanyName}
                          onChange={(e) => setCustomCompanyName(e.target.value)}
                          required
                          className="w-full bg-white dark:bg-[#070e0a] border-2 border-purple-400 dark:border-purple-500/50 rounded-xl px-4 py-3 text-sm font-black text-slate-900 dark:text-white uppercase outline-none focus:ring-2 focus:ring-purple-500 shadow-xs"
                        />
                      </div>
                    )}

                  </div>
                </div>

                {/* Columna Derecha: Datos de la Factura, Mensajero & Digitalización (7 de 12) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-white/95 dark:bg-[#0c1a13] border-2 border-emerald-500/30 rounded-3xl p-5 shadow-lg shadow-emerald-950/20 space-y-4">
                    
                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-sm">
                          2
                        </div>
                        <h2 className="text-sm font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                          Datos de la Factura, Mensajero & Foto / PDF
                        </h2>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-black uppercase text-slate-800 dark:text-gray-300 mb-1.5">
                          N° de Factura / Aviso <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. 10492819 o AVISO-492"
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          required
                          className="w-full bg-slate-50 dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-4 py-2.5 text-sm font-mono font-black text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase text-slate-800 dark:text-gray-300 mb-1.5">
                          Monto en Bolivianos (Bs.) <span className="text-slate-400 font-normal">(Opcional)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-emerald-600 dark:text-emerald-400 text-xs">
                            Bs.
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Ej. 1250.50"
                            value={invoiceAmount}
                            onChange={(e) => setInvoiceAmount(e.target.value)}
                            className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl text-sm font-mono font-black text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-black uppercase text-slate-800 dark:text-gray-300 mb-1.5">
                          Mes / Periodo de Facturación
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. AGOSTO 2026"
                          value={billingPeriod}
                          onChange={(e) => setBillingPeriod(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-950 dark:text-white uppercase outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase text-slate-800 dark:text-gray-300 mb-1.5">
                          Mensajero / Courier (Quien entrega)
                        </label>
                        <input
                          type="text"
                          placeholder="Ej. Juan Pérez (Courier)"
                          value={courierName}
                          onChange={(e) => setCourierName(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                        />
                      </div>
                    </div>

                    {/* Observación Rápida de Puerta */}
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-800 dark:text-gray-300 mb-1.5">
                        Observación Rápida de Puerta (1 Toque)
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {QUICK_OBSERVATIONS.map((obs) => (
                          <button
                            key={obs}
                            type="button"
                            onClick={() => setNotes(obs)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border transition-all cursor-pointer ${
                              notes === obs
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-sm'
                                : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300 hover:border-emerald-500'
                            }`}
                          >
                            {obs}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Ej. Medidor Principal de Caballerizas, entregado con sobre cerrado"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#07110c] border-2 border-slate-300 dark:border-emerald-500/30 rounded-2xl px-4 py-2 text-xs text-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                      />
                    </div>

                    {/* 📸 DIGITALIZACIÓN DE LA FACTURA (FOTO O PDF) */}
                    <div className="pt-3 border-t border-emerald-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase text-slate-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <Camera className="w-4 h-4 text-brand-gold" />
                          <span>Digitalizar Factura / Aviso (Foto o PDF)</span>
                        </label>
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-brand-gold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          Recomendado
                        </span>
                      </div>

                      <label className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 p-3.5 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all text-center group">
                        <input
                          type="file"
                          multiple
                          accept="image/*,.pdf"
                          capture="environment"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <div className="flex items-center gap-2 mb-1">
                          <Camera className="w-5 h-5 text-emerald-600 dark:text-brand-gold group-hover:scale-110 transition-transform" />
                          <UploadCloud className="w-5 h-5 text-emerald-600 dark:text-brand-gold" />
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          Tomar foto con la cámara o <span className="text-emerald-700 dark:text-brand-gold underline">subir archivo PDF / JPG</span>
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">
                          Digitalización instantánea de la factura física recibida en caseta
                        </span>
                      </label>

                      {/* Lista de fotos/archivos seleccionados */}
                      {invoiceFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {invoiceFiles.map((file, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-black/60 border border-emerald-500/40 text-xs font-bold text-slate-900 dark:text-gray-200 shadow-xs"
                            >
                              <FileCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="truncate max-w-[180px]">{file.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ({(file.size / 1024 / 1024).toFixed(1)} MB)
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(idx)}
                                className="text-slate-400 hover:text-red-500 transition-colors p-0.5"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>

              </div>

              {/* Barra Inferior de Acción */}
              <div className="pt-4 border-t-2 border-emerald-500/30 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/50 dark:bg-transparent rounded-2xl p-3">
                <div className="text-xs font-bold text-slate-600 dark:text-gray-300">
                  <span>Empresa seleccionada: <strong className="text-emerald-700 dark:text-brand-gold uppercase">{getActiveCompanyName()}</strong></span>
                  {invoiceNumber && <span> • N°: <strong className="font-mono">{invoiceNumber}</strong></span>}
                  {invoiceFiles.length > 0 && <span className="text-emerald-600 font-black"> • ({invoiceFiles.length} foto/archivo adjunto)</span>}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3.5 rounded-2xl font-bold text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !invoiceNumber.trim()}
                    className="flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-700 hover:from-emerald-400 hover:to-teal-600 text-slate-950 font-black px-8 py-3.5 rounded-2xl text-base shadow-xl shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Receipt className="w-5 h-5 text-slate-950" />
                    <span>{isSubmitting ? 'Digitalizando en Caseta...' : '🧾 Registrar & Digitalizar Factura'}</span>
                  </button>
                </div>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};
export default GatehouseInvoiceReceiptModal;
