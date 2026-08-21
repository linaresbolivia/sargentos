import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, AlertTriangle, FileText, Search, UserCheck, Shield, DollarSign, Clock, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { memberAdminApi } from '../services/memberAdminApi';

export const MembershipSalesAuditView: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPlanToAudit, setSelectedPlanToAudit] = useState<any>(null);
  const [auditNotes, setAuditNotes] = useState('');

  // Form State for Sales
  const [formData, setFormData] = useState({
    membershipId: '',
    titularId: '',
    totalAmount: 69600,
    downPayment: 15000,
    monthsTerm: 60,
    monthlyInterestRate: 0,
    acquisitionType: 'COMPRA_DIRECTA',
    paymentMethodType: 'CREDITO',
    sellerName: 'Eduardo (Ventas)',
    folioNumber: ''
  });

  const [membersList, setMembersList] = useState<any[]>([]);

  useEffect(() => {
    loadPlans();
    loadMembersForSelect();
  }, [statusFilter]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await memberAdminApi.listSalesPlans(statusFilter);
      setPlans(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMembersForSelect = async () => {
    try {
      const res = await memberAdminApi.searchMembers();
      setMembersList(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectMember = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const personId = e.target.value;
    const m = membersList.find(x => x.id === personId);
    if (m) {
      setFormData(prev => ({
        ...prev,
        titularId: m.id,
        membershipId: m.membership?.id || ''
      }));
    }
  };

  const handleCreatePlan = async () => {
    if (!formData.titularId || !formData.membershipId) {
      toast.error('Debes seleccionar un socio válido con membresía');
      return;
    }

    try {
      await memberAdminApi.createSalesPlan(formData);
      toast.success('¡Plan formulado y enviado a Bandeja de Auditoría!');
      setShowCreateModal(false);
      loadPlans();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al crear plan');
    }
  };

  const handleAudit = async (action: 'APROBAR' | 'OBSERVAR' | 'CANCELAR') => {
    if (!selectedPlanToAudit) return;
    try {
      await memberAdminApi.auditSalesPlan(selectedPlanToAudit.id, {
        action,
        auditedBy: 'Mónica (Recaudaciones)',
        auditNotes
      });
      toast.success(`Plan ${action === 'APROBAR' ? 'Aprobado' : action === 'OBSERVAR' ? 'Observado' : 'Cancelado'} con éxito`);
      setSelectedPlanToAudit(null);
      setAuditNotes('');
      loadPlans();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al auditar plan');
    }
  };

  // 60/40 Live Split calculation for modal
  const incomeFee = Number((formData.totalAmount * 0.60).toFixed(2));
  const cdpFee = Number((formData.totalAmount * 0.40).toFixed(2));
  const financed = Math.max(0, formData.totalAmount - formData.downPayment);
  const monthlyFixed = formData.paymentMethodType === 'CONTADO' ? financed : Math.round(financed / (formData.monthsTerm || 60));

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="glass-panel p-6 border-l-4 border-brand-gold bg-white/90 dark:bg-[#0d1311]/90 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-gray-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 dark:bg-brand-gold/20 text-amber-800 dark:text-brand-gold border border-amber-300 dark:border-brand-gold/40">
              Circuito Comercial & Auditoría
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Ventas (Eduardo) ➔ Auditoría (Mónica)</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white serif-brand mt-1">
            Adquisición de Membresías & Planes de Pago CDP (60/40)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Partición legal obligatoria: <strong className="text-blue-600 dark:text-blue-400">60% Derecho de Ingreso (Factura)</strong> y <strong className="text-emerald-600 dark:text-emerald-400">40% Cuota de Participación (Recibo Oficial)</strong>.
          </p>
        </div>

        <button 
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-600 text-black font-extrabold text-xs flex items-center gap-2 hover:scale-105 shadow-lg shadow-brand-gold/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" /> Formular Nuevo Plan CDP
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['ALL', 'EN_REVISION', 'APROBADO', 'OBSERVADO'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === st ? 'bg-brand-gold text-black shadow-md' : 'bg-gray-100 dark:bg-black/40 text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/5'}`}
          >
            {st === 'ALL' ? 'Todos los Planes' : st === 'EN_REVISION' ? '🟡 En Revisión (Mónica)' : st === 'APROBADO' ? '🟢 Aprobados' : '🔴 Observados'}
          </button>
        ))}
      </div>

      {/* Plans Table */}
      <div className="glass-panel overflow-hidden border border-gray-200 dark:border-white/10 rounded-2xl bg-white/90 dark:bg-[#0d1311]/90 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100/90 dark:bg-white/5 text-gray-700 dark:text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-200 dark:border-white/10 font-black">
              <tr>
                <th className="p-4">Txn / Folio</th>
                <th className="p-4">Titular / Socio</th>
                <th className="p-4">Tipo Adquisición</th>
                <th className="p-4">Monto Total</th>
                <th className="p-4">60% Factura / 40% Recibo</th>
                <th className="p-4">Plazo & Cuota</th>
                <th className="p-4">Estado Auditoría</th>
                <th className="p-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-amber-700 dark:text-brand-gold font-bold animate-pulse">Cargando planes de venta...</td></tr>
              ) : plans.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500">No hay planes registrados en esta categoría.</td></tr>
              ) : (
                plans.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono">
                      <p className="font-bold text-gray-900 dark:text-white">{p.transactionNumber}</p>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">Folio: {p.folioNumber || 'N/A'}</span>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-gray-900 dark:text-white">{p.titular?.firstName} {p.titular?.lastName || p.titular?.paternalSurname}</p>
                      <span className="text-[10px] text-amber-800 dark:text-brand-gold font-semibold">CI: {p.titular?.documentId}</span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                        {p.acquisitionType}
                      </span>
                    </td>
                    <td className="p-4 font-black text-gray-900 dark:text-white">
                      Bs {Number(p.totalAmount).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <p className="text-blue-600 dark:text-blue-400 font-bold">Fact: Bs {Number(p.incomeFeeAmount).toLocaleString()}</p>
                      <p className="text-emerald-600 dark:text-emerald-400 font-bold">Rec: Bs {Number(p.cdpAmount).toLocaleString()}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-gray-800 dark:text-gray-200 font-semibold">{p.monthsTerm} meses ({p.paymentMethodType})</p>
                      <p className="text-amber-700 dark:text-brand-gold font-bold">Bs {Number(p.fixedMonthlyInstallment).toFixed(2)} /mes</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${p.status === 'APROBADO' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30' : p.status === 'EN_REVISION' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 animate-pulse' : 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-500/30'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedPlanToAudit(p)}
                        className="px-3.5 py-1.5 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-brand-gold hover:text-black text-gray-800 dark:text-gray-200 text-xs font-bold transition-all border border-gray-300 dark:border-white/10 shadow-sm"
                      >
                        Auditar / Ver
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE PLAN MODAL (VENTAS) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#0d1311] border border-gray-300 dark:border-brand-gold/30 rounded-3xl p-6 shadow-2xl space-y-4 text-gray-900 dark:text-white">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-3">
              <h3 className="text-lg font-bold serif-brand text-gray-900 dark:text-white">
                Formular Plan de Adquisición de Membresía (CDP)
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">Seleccionar Socio Titular *</label>
                <select 
                  onChange={handleSelectMember}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm outline-none"
                >
                  <option value="">-- Seleccionar Socio del Directorio --</option>
                  {membersList.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.membership?.number} - {m.membership?.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">Monto Total de Membresía (Bs) *</label>
                  <input 
                    type="number"
                    value={formData.totalAmount}
                    onChange={e => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">Cuota Inicial Abonada (Bs)</label>
                  <input 
                    type="number"
                    value={formData.downPayment}
                    onChange={e => setFormData({ ...formData, downPayment: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-amber-700 dark:text-brand-gold text-sm font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">Modalidad</label>
                  <select 
                    value={formData.paymentMethodType}
                    onChange={e => setFormData({ ...formData, paymentMethodType: e.target.value, monthsTerm: e.target.value === 'CONTADO' ? 1 : 60 })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm outline-none"
                  >
                    <option value="CREDITO">Venta a Crédito (hasta 60 meses)</option>
                    <option value="CONTADO">Venta al Contado (Plan virtual 1 mes)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">Plazo (Meses)</label>
                  <input 
                    type="number"
                    disabled={formData.paymentMethodType === 'CONTADO'}
                    value={formData.monthsTerm}
                    onChange={e => setFormData({ ...formData, monthsTerm: parseInt(e.target.value) || 60 })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm outline-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">Tipo Adquisición</label>
                  <select 
                    value={formData.acquisitionType}
                    onChange={e => setFormData({ ...formData, acquisitionType: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm outline-none"
                  >
                    <option value="COMPRA_DIRECTA">Compra Directa (Club)</option>
                    <option value="TRANSFERENCIA">Transferencia entre Particulares</option>
                    <option value="HERENCIA">Anticipo Legítima / Herencia</option>
                  </select>
                </div>
              </div>

              {/* 60/40 Live Preview Card */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/60 border border-gray-200 dark:border-brand-gold/40 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold">60% Derecho Ingreso</p>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">Bs {incomeFee.toLocaleString()}</p>
                  <span className="text-[9px] text-gray-500">Sujeto a Factura</span>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold">40% Cuota Participación</p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Bs {cdpFee.toLocaleString()}</p>
                  <span className="text-[9px] text-gray-500">Recibo Oficial CDP</span>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold">Cuota Fija Mensual</p>
                  <p className="text-sm font-bold text-amber-700 dark:text-brand-gold">Bs {monthlyFixed.toLocaleString()}</p>
                  <span className="text-[9px] text-gray-500">{formData.monthsTerm} cuotas</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreatePlan}
                className="px-6 py-2 rounded-xl bg-brand-gold text-black text-xs font-bold hover:scale-105 transition-all shadow-md"
              >
                Enviar a Auditoría (Mónica)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT MODAL (RECAUDACIONES - MONICA) */}
      {selectedPlanToAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#0d1311] border border-gray-300 dark:border-brand-gold/30 rounded-3xl p-6 shadow-2xl space-y-4 text-gray-900 dark:text-white">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-brand-gold/20 pb-3">
              <div>
                <h3 className="text-lg font-bold serif-brand text-gray-900 dark:text-white">
                  Auditoría Financiera de Plan de Pagos
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Revisión de Mónica (Recaudaciones)</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30">
                {selectedPlanToAudit.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 dark:bg-black/40 p-4 rounded-2xl border border-gray-200 dark:border-white/10">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Socio Titular:</p>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{selectedPlanToAudit.titular?.firstName} {selectedPlanToAudit.titular?.lastName || selectedPlanToAudit.titular?.paternalSurname}</p>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Vendedor:</p>
                <p className="font-semibold text-amber-700 dark:text-brand-gold">{selectedPlanToAudit.sellerName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-gray-500 dark:text-gray-400">Monto Total: <span className="font-bold text-gray-900 dark:text-white">Bs {Number(selectedPlanToAudit.totalAmount).toLocaleString()}</span></p>
                <p className="text-blue-600 dark:text-blue-400 font-semibold">60% Derecho Ingreso: Bs {Number(selectedPlanToAudit.incomeFeeAmount).toLocaleString()}</p>
                <p className="text-emerald-600 dark:text-emerald-400 font-semibold">40% Cuota Participación: Bs {Number(selectedPlanToAudit.cdpAmount).toLocaleString()}</p>
                <p className="text-gray-800 dark:text-gray-300 font-bold">Cuota Mensual: Bs {Number(selectedPlanToAudit.fixedMonthlyInstallment).toFixed(2)} ({selectedPlanToAudit.monthsTerm} meses)</p>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">Observaciones / Notas de Auditoría</label>
              <textarea 
                rows={2}
                placeholder="Ingresa notas o motivo de aprobación/observación..."
                value={auditNotes}
                onChange={e => setAuditNotes(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs outline-none"
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-white/10">
              <button 
                onClick={() => setSelectedPlanToAudit(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold"
              >
                Cerrar
              </button>

              <div className="flex gap-2">
                <button 
                  onClick={() => handleAudit('OBSERVAR')}
                  className="px-4 py-2 rounded-xl bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/30 text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
                >
                  Observar / Devolver
                </button>
                <button 
                  onClick={() => handleAudit('APROBAR')}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-black text-xs font-extrabold hover:scale-105 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Aprobar Plan & Publicar en Cartera
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
