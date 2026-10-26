import React, { useState, useRef } from 'react';
import { 
  X, 
  QrCode, 
  Copy, 
  Check, 
  Download, 
  Upload, 
  Building2, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  DollarSign,
  Send,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SocioAccountStatementResponse, memberPortalApi, getAssetUrl } from '../services/memberPortalApi';

interface MemberQrPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  statement: SocioAccountStatementResponse | null;
  onVoucherSubmitted: () => void;
  selectedAmount?: number;
}

export const MemberQrPaymentModal: React.FC<MemberQrPaymentModalProps> = ({
  isOpen,
  onClose,
  statement,
  onVoucherSubmitted,
  selectedAmount
}) => {
  if (!isOpen || !statement) return null;

  const [activeTab, setActiveTab] = useState<'PAY_QR' | 'ATTACH_VOUCHER' | 'HISTORY'>('PAY_QR');
  const [copiedGlosa, setCopiedGlosa] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Voucher upload form state
  const [amount, setAmount] = useState<string>(
    selectedAmount ? selectedAmount.toString() : statement.financialSummary.totalDebt > 0 ? statement.financialSummary.totalDebt.toString() : '880.00'
  );
  const [referenceNumber, setReferenceNumber] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [concept, setConcept] = useState('Cuota Social y Expensas');
  const [notes, setNotes] = useState('');
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const suggestedGlosa = `ACCION ${statement.socio.membershipNumber} - ${statement.socio.fullName.toUpperCase()}`;

  const handleCopyGlosa = () => {
    navigator.clipboard.writeText(suggestedGlosa);
    setCopiedGlosa(true);
    toast.success('¡Glosa copiada al portapapeles!');
    setTimeout(() => setCopiedGlosa(false), 2500);
  };

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(statement.qrConfig.accountNumber);
    setCopiedAccount(true);
    toast.success('¡Número de cuenta copiado!');
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVoucherFile(file);
      if (file.type.startsWith('image/')) {
        setFilePreview(URL.createObjectURL(file));
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleSubmitVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherFile) {
      toast.error('Por favor adjunta la foto o captura de tu comprobante');
      return;
    }
    if (!referenceNumber.trim()) {
      toast.error('Indica el N° de transacción o referencia bancaria');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('amount', amount);
      formData.append('referenceNumber', referenceNumber.trim());
      formData.append('transferDate', transferDate);
      formData.append('concept', concept);
      formData.append('notes', notes);
      formData.append('voucher', voucherFile);

      const res = await memberPortalApi.submitPaymentVoucher(formData);
      if (res.success) {
        toast.success('¡Comprobante enviado a Recaudaciones con éxito!');
        setVoucherFile(null);
        setFilePreview(null);
        setReferenceNumber('');
        setNotes('');
        onVoucherSubmitted();
        setActiveTab('HISTORY');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al enviar comprobante');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#13221a] via-[#0b1611] to-[#060b08] border-2 border-brand-gold/50 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-white max-h-[92vh] overflow-y-auto">
        
        {/* Top Header */}
        <div className="flex justify-between items-start border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-gold/30 to-amber-600/30 border border-brand-gold/50 text-brand-gold flex items-center justify-center shadow-lg shrink-0">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-gold/20 text-brand-gold border border-brand-gold/40">
                  Canal Simple QR & Transferencia
                </span>
                <span className="text-xs text-gray-400">Club Hípico Los Sargentos</span>
              </div>
              <h3 className="text-xl font-bold serif-brand text-white mt-0.5">
                Pago de Cuotas & Servicios del Club
              </h3>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 bg-black/50 p-1.5 rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveTab('PAY_QR')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'PAY_QR'
                ? 'bg-gradient-to-r from-brand-gold to-yellow-600 text-black shadow-lg font-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" /> 1. Ver QR & Datos
          </button>

          <button
            onClick={() => setActiveTab('ATTACH_VOUCHER')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'ATTACH_VOUCHER'
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-black shadow-lg font-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" /> 2. Adjuntar Comprobante
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'HISTORY'
                ? 'bg-white/20 text-white font-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" /> Mis Envíos ({statement.submittedVouchers.length})
          </button>
        </div>

        {/* ===================================================================== */}
        {/* TAB 1: PAGO CON QR Y DATOS BANCARIOS                                  */}
        {/* ===================================================================== */}
        {activeTab === 'PAY_QR' && (
          <div className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              
              {/* QR Image Container (from admin upload) */}
              <div className="md:col-span-5 flex flex-col items-center">
                <div className="p-3.5 bg-white rounded-3xl shadow-2xl border-4 border-brand-gold/60 inline-block text-center relative group">
                  <div className="w-48 h-48 sm:w-52 sm:h-52 overflow-hidden rounded-2xl flex items-center justify-center bg-gray-50">
                    <img 
                      src={getAssetUrl(statement.qrConfig.qrImageUrl)} 
                      alt="Código QR de Pago" 
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <a 
                    href={getAssetUrl(statement.qrConfig.qrImageUrl)}
                    download="QR_CHLS_PAGOS.jpg"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 text-[11px] font-black text-black flex items-center justify-center gap-1 hover:text-amber-800 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Descargar Imagen QR
                  </a>
                </div>
                <p className="text-[11px] text-gray-400 text-center mt-2">
                  Válido para BNB Móvil, GanaMóvil, BCP, Bisa, Mercantil, Unión y todos los bancos
                </p>
              </div>

              {/* Account details & amount */}
              <div className="md:col-span-7 space-y-3">
                
                {/* Total amount highlight */}
                <div className="p-4 rounded-2xl bg-black/60 border border-brand-gold/40 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Total Sugerido a Transferir</p>
                    <p className="text-xl sm:text-2xl font-black text-brand-gold mt-0.5">
                      Bs {Number(amount).toFixed(2)}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {statement.financialSummary.debtStatus === 'SIN_DEUDA' ? 'Al Día' : 'Saldo Pendiente'}
                  </span>
                </div>

                {/* Bank data details */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-gray-300">
                    <span>Entidad Bancaria:</span>
                    <strong className="text-white">{statement.qrConfig.bankName}</strong>
                  </div>

                  <div className="flex justify-between items-center text-gray-300">
                    <span>N° de Cuenta:</span>
                    <div className="flex items-center gap-2">
                      <strong className="text-brand-gold font-mono text-sm">{statement.qrConfig.accountNumber}</strong>
                      <button 
                        onClick={handleCopyAccount}
                        className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors"
                        title="Copiar cuenta"
                      >
                        {copiedAccount ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-gray-300">
                    <span>Titular de Cuenta:</span>
                    <strong className="text-white">{statement.qrConfig.accountHolder}</strong>
                  </div>

                  {statement.qrConfig.nit && (
                    <div className="flex justify-between items-center text-gray-300">
                      <span>NIT:</span>
                      <strong className="text-white font-mono">{statement.qrConfig.nit}</strong>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-gray-300">
                    <span>Tipo de Cuenta:</span>
                    <strong className="text-white">{statement.qrConfig.accountType}</strong>
                  </div>
                </div>

                {/* Glosa Recomendada with one-click copy */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider">
                      Glosa Obligatoria para su Banco
                    </span>
                    <button 
                      onClick={handleCopyGlosa}
                      className="px-2.5 py-1 rounded-lg bg-brand-gold/20 hover:bg-brand-gold text-brand-gold hover:text-black text-[10px] font-bold flex items-center gap-1 transition-all"
                    >
                      {copiedGlosa ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedGlosa ? 'Copiado' : 'Copiar Glosa'}
                    </button>
                  </div>
                  <p className="font-mono text-xs font-bold text-white bg-black/40 p-2 rounded-xl border border-white/5 break-all">
                    {suggestedGlosa}
                  </p>
                </div>

              </div>
            </div>

            {/* Bottom Call to Action: Next Step */}
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3">
              <p className="text-xs text-gray-400 text-center sm:text-left">
                ¿Ya realizaste la transferencia o pago por QR desde tu banco?
              </p>
              <button
                onClick={() => setActiveTab('ATTACH_VOUCHER')}
                className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-105 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Upload className="w-4 h-4" /> Ya pagué • Subir mi Comprobante
              </button>
            </div>

          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 2: ADJUNTAR COMPROBANTE DE PAGO REALIZADO                         */}
        {/* ===================================================================== */}
        {activeTab === 'ATTACH_VOUCHER' && (
          <form onSubmit={handleSubmitVoucher} className="space-y-4">
            
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 shrink-0 text-brand-gold" />
              <span>
                Adjunta tu captura o comprobante bancario. El departamento de Recaudaciones validará la transacción y actualizará tu estado de cuenta de forma inmediata.
              </span>
            </div>

            {/* File Upload Area */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Captura o Documento del Comprobante (Imagen o PDF) *
              </label>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/png, image/jpeg, image/jpg, application/pdf"
                className="hidden" 
              />

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-500/40 hover:border-brand-gold bg-black/40 hover:bg-black/60 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
              >
                {filePreview ? (
                  <div className="space-y-2">
                    <img src={filePreview} alt="Preview comprobante" className="max-h-36 rounded-xl border border-white/20 mx-auto" />
                    <p className="text-xs text-emerald-400 font-bold">{voucherFile?.name}</p>
                    <span className="text-[10px] text-gray-400">Haz clic para cambiar archivo</span>
                  </div>
                ) : voucherFile ? (
                  <div className="space-y-1">
                    <FileText className="w-10 h-10 text-brand-gold mx-auto" />
                    <p className="text-xs text-emerald-400 font-bold">{voucherFile.name}</p>
                    <span className="text-[10px] text-gray-400">Archivo seleccionado. Haz clic para cambiar.</span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Haz clic aquí para seleccionar tu comprobante</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Captura de pantalla, foto o PDF de tu banco (máx. 15 MB)</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  N° de Referencia / Comprobante Bancario *
                </label>
                <input 
                  type="text" 
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                  required
                  placeholder="Ej. BNB-93821034 o BMSC-4820"
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white font-mono font-bold focus:border-brand-gold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Monto Transferido (Bs) *
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                  placeholder="880.00"
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white font-mono font-bold focus:border-brand-gold outline-none text-emerald-400 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Fecha de la Transferencia
                </label>
                <input 
                  type="date" 
                  value={transferDate}
                  onChange={e => setTransferDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:border-brand-gold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Concepto de Pago
                </label>
                <select
                  value={concept}
                  onChange={e => setConcept(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:border-brand-gold outline-none"
                >
                  <option value="Cuota Social y Expensas">Cuota Social Mensual</option>
                  <option value="Alquiler Box Hípico">Mantenimiento Box Hípico</option>
                  <option value="Cuota de Participación CDP">Cuota de Participación (CDP)</option>
                  <option value="Escuela Deportiva / Canchas">Escuela Deportiva / Canchas</option>
                  <option value="Liquidación Total de Deuda">Liquidación Total de Deuda</option>
                  <option value="Otro">Otro Concepto</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Notas u Observaciones (Opcional)
                </label>
                <input 
                  type="text" 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ej. Transferencia realizada por conyuge Mariana Suárez"
                  className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:border-brand-gold outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('PAY_QR')}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold"
              >
                Volver a Ver QR
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-black text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:scale-105 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>Enviando Comprobante...</>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Enviar para Verificación
                  </>
                )}
              </button>
            </div>

          </form>
        )}

        {/* ===================================================================== */}
        {/* TAB 3: HISTORIAL DE COMPROBANTES ENVIADOS                             */}
        {/* ===================================================================== */}
        {activeTab === 'HISTORY' && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Tus Comprobantes Enviados Recientemente
            </h4>

            {statement.submittedVouchers.length === 0 ? (
              <div className="p-8 text-center text-gray-400 bg-black/30 rounded-2xl border border-white/5">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                <p className="text-xs">Aún no has reportado comprobantes de pago por esta vía.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {statement.submittedVouchers.map(v => (
                  <div key={v.id} className="p-3.5 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-white font-mono">Ref: {v.referenceNumber}</strong>
                        <span className="text-emerald-400 font-bold font-mono">Bs {v.amount.toFixed(2)}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {v.concept} • Enviado el {new Date(v.createdAt).toLocaleDateString()} {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {v.reviewNotes && (
                        <p className="text-[10px] text-amber-300 mt-1 italic">
                          Nota Recaudaciones: {v.reviewNotes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {v.voucherUrl && (
                        <a 
                          href={getAssetUrl(v.voucherUrl)} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-brand-gold text-[10px] font-bold flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> Ver
                        </a>
                      )}

                      {v.status === 'APROBADO' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Aprobado
                        </span>
                      ) : v.status === 'RECHAZADO' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Observado
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> En Revisión
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
