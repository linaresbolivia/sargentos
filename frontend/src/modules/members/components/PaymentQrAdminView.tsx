import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, 
  Upload, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Eye, 
  RefreshCw, 
  Building2, 
  CreditCard, 
  FileText, 
  Search, 
  ExternalLink,
  Clock,
  Sparkles,
  Info,
  DollarSign,
  UserCheck,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { memberAdminApi } from '../services/memberAdminApi';
import { getAssetUrl } from '../services/memberPortalApi';

export const PaymentQrAdminView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'QR_CONFIG' | 'VOUCHERS'>('QR_CONFIG');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [nit, setNit] = useState('');
  const [instructions, setInstructions] = useState('');
  const [currentQrUrl, setCurrentQrUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Vouchers state
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [voucherFilter, setVoucherFilter] = useState<'ALL' | 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'>('PENDIENTE');
  const [voucherSearch, setVoucherSearch] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [zoomedVoucherUrl, setZoomedVoucherUrl] = useState<string | null>(null);

  // Load config
  const loadQrConfig = async () => {
    try {
      setLoading(true);
      const res = await memberAdminApi.getPaymentQrConfig();
      if (res.data) {
        setBankName(res.data.bankName || '');
        setAccountNumber(res.data.accountNumber || '');
        setAccountType(res.data.accountType || '');
        setAccountHolder(res.data.accountHolder || '');
        setNit(res.data.nit || '');
        setInstructions(res.data.instructions || '');
        setCurrentQrUrl(res.data.qrImageUrl || '');
      }
    } catch (err: any) {
      toast.error('Error al cargar configuración del QR de pagos');
    } finally {
      setLoading(false);
    }
  };

  // Load vouchers
  const loadVouchers = async () => {
    try {
      setVouchersLoading(true);
      const res = await memberAdminApi.listPaymentVouchers({
        status: voucherFilter === 'ALL' ? undefined : voucherFilter,
        search: voucherSearch
      });
      if (res.data) {
        setVouchers(res.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setVouchersLoading(false);
    }
  };

  useEffect(() => {
    loadQrConfig();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'VOUCHERS') {
      loadVouchers();
    }
  }, [activeSubTab, voucherFilter, voucherSearch]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('bankName', bankName);
      formData.append('accountNumber', accountNumber);
      formData.append('accountType', accountType);
      formData.append('accountHolder', accountHolder);
      formData.append('nit', nit);
      formData.append('instructions', instructions);

      if (selectedFile) {
        formData.append('qrImage', selectedFile);
      }

      const res = await memberAdminApi.updatePaymentQrConfig(formData);
      if (res.success) {
        toast.success('¡QR de pagos y datos bancarios actualizados correctamente!');
        if (res.data?.qrImageUrl) {
          setCurrentQrUrl(res.data.qrImageUrl);
        }
        setSelectedFile(null);
        setPreviewUrl(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (id: string, action: 'APROBADO' | 'RECHAZADO') => {
    try {
      setReviewingId(id);
      const res = await memberAdminApi.reviewPaymentVoucher(id, action, reviewNotes);
      if (res.success) {
        toast.success(`Comprobante ${action === 'APROBADO' ? 'aprobado y acreditado' : 'rechazado'}`);
        setReviewNotes('');
        await loadVouchers();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al procesar comprobante');
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="space-y-6 text-gray-900 dark:text-white">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 border-l-4 border-brand-gold bg-white/90 dark:bg-[#0d1311]/90 border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 dark:bg-brand-gold/20 text-amber-800 dark:text-brand-gold border border-amber-300 dark:border-brand-gold/40 flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5" /> RECAUDACIONES & COBRANZAS DIGITALES
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Canal Directo Socios</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white serif-brand mt-1">
            Gestor de Pagos QR & Conciliación de Comprobantes
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Sube el código QR oficial del Club, define la cuenta bancaria de destino y verifica los comprobantes transferidos por los socios.
          </p>
        </div>

        {/* Sub-tabs buttons */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-black/50 p-1.5 rounded-2xl border border-gray-200 dark:border-white/10 shrink-0">
          <button
            onClick={() => setActiveSubTab('QR_CONFIG')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'QR_CONFIG'
                ? 'bg-brand-gold text-black shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4" /> Configuración QR
          </button>
          <button
            onClick={() => setActiveSubTab('VOUCHERS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'VOUCHERS'
                ? 'bg-brand-gold text-black shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" /> Comprobantes de Socios
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CONFIGURACIÓN DEL QR Y DATOS BANCARIOS                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'QR_CONFIG' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Form: Bank Data & Upload */}
          <div className="lg:col-span-7 glass-panel p-6 rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0c1410]/90 shadow-xl space-y-5">
            <div className="flex items-center gap-2.5 border-b border-gray-200 dark:border-white/10 pb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-gold/20 text-brand-gold flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Datos de la Cuenta & Subida del QR</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Esta información y el QR se mostrarán inmediatamente al socio en su portal.</p>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              
              {/* File Upload Zone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Imagen del Código QR (PNG, JPG, SVG o WebP) *
                </label>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                  className="hidden" 
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-brand-gold/40 hover:border-brand-gold hover:bg-brand-gold/5 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-brand-gold/15 text-brand-gold group-hover:scale-110 transition-transform flex items-center justify-center shadow-inner">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">
                      {selectedFile ? selectedFile.name : 'Haz clic para seleccionar o arrastra la nueva imagen del QR'}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Soporta Simple QR bancario, BNB, BMSC, BCP, Banco Unión o formato estándar boliviano (máx. 10 MB)
                    </p>
                  </div>
                  {selectedFile && (
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 mt-1">
                      <Check className="w-3 h-3" /> Archivo listo para actualizar
                    </span>
                  )}
                </div>
              </div>

              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    Entidad Bancaria *
                  </label>
                  <input 
                    type="text" 
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    required
                    placeholder="Ej. Banco Nacional de Bolivia (BNB)"
                    className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-black/60 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white font-medium focus:border-brand-gold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    Número de Cuenta *
                  </label>
                  <input 
                    type="text" 
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value)}
                    required
                    placeholder="Ej. 1000-2938472-01"
                    className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-black/60 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white font-mono font-bold focus:border-brand-gold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    Tipo de Cuenta
                  </label>
                  <input 
                    type="text" 
                    value={accountType}
                    onChange={e => setAccountType(e.target.value)}
                    placeholder="Ej. Cuenta Corriente en Bolivianos"
                    className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-black/60 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white font-medium focus:border-brand-gold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    Titular / Razón Social *
                  </label>
                  <input 
                    type="text" 
                    value={accountHolder}
                    onChange={e => setAccountHolder(e.target.value)}
                    required
                    placeholder="Ej. Club Hípico Los Sargentos"
                    className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-black/60 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white font-medium focus:border-brand-gold outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    NIT Institucional
                  </label>
                  <input 
                    type="text" 
                    value={nit}
                    onChange={e => setNit(e.target.value)}
                    placeholder="Ej. 1028394021"
                    className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-black/60 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white font-mono focus:border-brand-gold outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    Instrucciones de Pago y Glosa para el Socio
                  </label>
                  <textarea 
                    rows={3}
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                    placeholder="Indica la glosa obligatoria (ej: colocar N° de Acción y Apellidos) y cómo enviar el comprobante."
                    className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-black/60 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white font-medium focus:border-brand-gold outline-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-gold via-yellow-500 to-amber-600 text-black text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:scale-105 shadow-xl shadow-brand-gold/20 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Guardando Cambios...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Guardar y Publicar QR de Cobranzas
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>

          {/* Right Live Preview: How Socio Sees It */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-panel p-6 rounded-3xl border-2 border-brand-gold/40 bg-gradient-to-b from-[#14231b] to-[#070b09] shadow-2xl text-white space-y-4">
              
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs font-black uppercase tracking-wider text-brand-gold">
                    Vista Previa del Socio
                  </span>
                </div>
                <span className="text-[10px] text-gray-400">Modal de Pago en Vivo</span>
              </div>

              {/* QR Image Box */}
              <div className="p-4 bg-white rounded-3xl text-center shadow-xl flex flex-col items-center justify-center">
                <div className="w-56 h-56 max-w-full flex items-center justify-center overflow-hidden rounded-2xl border-2 border-gray-200">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Nuevo QR Preview" className="w-full h-full object-contain" />
                  ) : currentQrUrl ? (
                    <img src={getAssetUrl(currentQrUrl)} alt="QR Actual" className="w-full h-full object-contain" />
                  ) : (
                    <QrCode className="w-24 h-24 text-gray-300 animate-pulse" />
                  )}
                </div>
                <p className="text-[11px] font-bold text-gray-700 mt-2">
                  Escanea desde la app de tu Banco (Simple QR)
                </p>
              </div>

              {/* Bank Details Card Preview */}
              <div className="p-4 rounded-2xl bg-black/60 border border-brand-gold/30 space-y-2 text-xs">
                <div className="flex justify-between items-center text-brand-gold font-bold">
                  <span>{bankName || 'Banco Nacional de Bolivia (BNB)'}</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-brand-gold/20">
                    {accountType || 'Cuenta Corriente'}
                  </span>
                </div>
                
                <p className="text-gray-300">
                  N° de Cuenta: <strong className="text-white font-mono">{accountNumber || '1000-2938472-01'}</strong>
                </p>
                <p className="text-gray-300">
                  Titular: <strong className="text-white">{accountHolder || 'Club Hípico Los Sargentos'}</strong>
                </p>
                {nit && (
                  <p className="text-gray-300">
                    NIT: <strong className="text-white font-mono">{nit}</strong>
                  </p>
                )}
                
                <div className="pt-2 border-t border-white/10 text-[11px] text-gray-400">
                  <p className="font-semibold text-amber-300">Instrucción al socio:</p>
                  <p className="italic mt-0.5">{instructions || 'Indicar en la glosa su N° de Acción y Apellido.'}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Cualquier cambio guardado se reflejará al instante para todos los 1.600 socios.</span>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COMPROBANTES SUBIDOS POR LOS SOCIOS                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'VOUCHERS' && (
        <div className="space-y-4">
          
          {/* Controls Bar */}
          <div className="glass-panel p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0c1410]/90 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input 
                type="text"
                placeholder="Buscar por socio, N° de acción, carnet o ref. bancaria..."
                value={voucherSearch}
                onChange={e => setVoucherSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-black/60 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none focus:border-brand-gold"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              {(['ALL', 'PENDIENTE', 'APROBADO', 'RECHAZADO'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setVoucherFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    voucherFilter === st
                      ? 'bg-brand-gold text-black shadow-md'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-white'
                  }`}
                >
                  {st === 'ALL' ? 'Todos' : st === 'PENDIENTE' ? 'Pendientes' : st === 'APROBADO' ? 'Aprobados' : 'Rechazados'}
                </button>
              ))}

              <button 
                onClick={loadVouchers}
                className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-white"
                title="Refrescar"
              >
                <RefreshCw className={`w-4 h-4 ${vouchersLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Vouchers Table */}
          <div className="glass-panel rounded-2xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0c1410]/90 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300">
                <thead className="bg-gray-100 dark:bg-black/40 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-wider border-b border-gray-200 dark:border-white/10">
                  <tr>
                    <th className="p-3.5">Fecha / Hora</th>
                    <th className="p-3.5">Socio / Acción</th>
                    <th className="p-3.5">Ref. Bancaria</th>
                    <th className="p-3.5">Monto Transferido</th>
                    <th className="p-3.5">Comprobante</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                  {vouchersLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-gold" />
                        Cargando comprobantes...
                      </td>
                    </tr>
                  ) : vouchers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                        No hay comprobantes pendientes en este filtro.
                      </td>
                    </tr>
                  ) : (
                    vouchers.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="p-3.5 whitespace-nowrap">
                          <p className="font-bold text-gray-900 dark:text-white">
                            {new Date(v.transferDate).toLocaleDateString()}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>

                        <td className="p-3.5">
                          <p className="font-bold text-gray-900 dark:text-white">
                            {v.socio?.fullName || 'Socio'}
                          </p>
                          <p className="text-[11px] text-brand-gold font-mono font-bold">
                            Acción #{v.membershipNumber} • CI: {v.socio?.documentId}
                          </p>
                        </td>

                        <td className="p-3.5 whitespace-nowrap font-mono font-bold text-gray-900 dark:text-white">
                          {v.referenceNumber}
                          {v.notes && <p className="text-[10px] text-gray-400 font-sans font-normal truncate max-w-xs">{v.notes}</p>}
                        </td>

                        <td className="p-3.5 whitespace-nowrap font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                          Bs {v.amount?.toFixed(2)}
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          {v.voucherUrl ? (
                            <button
                              onClick={() => setZoomedVoucherUrl(getAssetUrl(v.voucherUrl))}
                              className="px-3 py-1.5 rounded-xl bg-brand-gold/15 hover:bg-brand-gold/25 text-brand-gold border border-brand-gold/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" /> Ver Adjunto
                            </button>
                          ) : (
                            <span className="text-gray-400 text-[10px]">Sin archivo</span>
                          )}
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          {v.status === 'APROBADO' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-max">
                              <CheckCircle2 className="w-3 h-3" /> Acreditado
                            </span>
                          ) : v.status === 'RECHAZADO' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1 w-max">
                              <XCircle className="w-3 h-3" /> Rechazado
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-max">
                              <Clock className="w-3 h-3" /> Pendiente
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-right whitespace-nowrap">
                          {v.status === 'PENDIENTE' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleReview(v.id, 'APROBADO')}
                                disabled={reviewingId === v.id}
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-black text-xs font-black hover:scale-105 transition-all shadow-md flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" /> Aprobar y Acreditar
                              </button>
                              <button
                                onClick={() => handleReview(v.id, 'RECHAZADO')}
                                disabled={reviewingId === v.id}
                                className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all"
                              >
                                Rechazar
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-400">
                              Revisado por {v.reviewedBy || 'Admin'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* MODAL: ZOOM DEL COMPROBANTE ADJUNTO */}
      {zoomedVoucherUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative max-w-2xl w-full bg-[#0a100d] border border-brand-gold/40 rounded-3xl p-6 shadow-2xl space-y-4 text-white">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold serif-brand flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-gold" /> Comprobante de Pago Adjuntado
              </h3>
              <button 
                onClick={() => setZoomedVoucherUrl(null)}
                className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto rounded-2xl border border-white/10 flex items-center justify-center bg-black/50 p-2">
              <img 
                src={zoomedVoucherUrl} 
                alt="Comprobante ampliado" 
                className="max-h-[65vh] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <a 
                href={zoomedVoucherUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="text-xs text-brand-gold hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir en pestaña nueva
              </a>
              <button
                onClick={() => setZoomedVoucherUrl(null)}
                className="px-5 py-2 rounded-xl bg-brand-gold text-black text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
