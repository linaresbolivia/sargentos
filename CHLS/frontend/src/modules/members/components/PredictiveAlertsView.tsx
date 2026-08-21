import React, { useState, useEffect } from 'react';
import { AlertCircle, Award, UserCheck, RefreshCw, DollarSign, CheckCircle2, ShieldAlert, ArrowRight, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { memberAdminApi } from '../services/memberAdminApi';

export const PredictiveAlertsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DEPENDIENTES' | 'HONORARIOS'>('DEPENDIENTES');
  
  const [dependentAlerts, setDependentAlerts] = useState<any[]>([]);
  const [honoraryCandidates, setHonoraryCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Promotion to Honorary Modal
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [bankDetails, setBankDetails] = useState({
    bankName: 'Banco Nacional de Bolivia (BNB)',
    bankAccountNumber: '1000-849102-01',
    bankAccountType: 'CUENTA_CORRIENTE',
    beneficiaryName: '',
    monthsInFavor: 7 // Default 7 months remaining from annual payment
  });

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const [depRes, honRes] = await Promise.all([
        memberAdminApi.getDependentAlerts(),
        memberAdminApi.getHonoraryCandidates()
      ]);
      setDependentAlerts(depRes.data || []);
      setHonoraryCandidates(honRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteHonorary = async () => {
    if (!selectedCandidate) return;

    try {
      await memberAdminApi.promoteToHonorary({
        personId: selectedCandidate.personId,
        bankDetails: bankDetails.monthsInFavor > 0 ? bankDetails : undefined
      });
      toast.success('¡Socio ascendido a Socio Honorario y exento al 100% de cuota social!');
      setSelectedCandidate(null);
      loadAlerts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al ascender socio');
    }
  };

  return (
    <div className="space-y-6 text-gray-900 dark:text-white">
      
      {/* Header */}
      <div className="glass-panel p-6 border-l-4 border-amber-500 bg-white/90 dark:bg-[#0d1311]/90 border border-gray-200 dark:border-white/10 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40">
              Motor Predictivo
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Alertas Diarias & Cambios de Estado Automatizados</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white serif-brand mt-1">
            Radar de Alertas Predictivas & Ciclo de Vida del Socio
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Detección de pérdida de dependencia por mayoría de edad (25 años) y elegibilidad a Socio Honorario ($\ge 60$ años + $\ge 20$ antigüedad).
          </p>
        </div>

        <button 
          onClick={loadAlerts}
          className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-gray-200 text-xs font-bold flex items-center gap-1.5 transition-all border border-gray-300 dark:border-white/10 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar Radar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('DEPENDIENTES')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'DEPENDIENTES' ? 'bg-brand-gold text-black shadow-md' : 'bg-gray-100 dark:bg-black/40 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-white/5 hover:text-gray-900 dark:hover:text-white'}`}
        >
          <ShieldAlert className="w-4 h-4" /> Alerta Hijos 25 Años ({dependentAlerts.length})
        </button>
        <button
          onClick={() => setActiveTab('HONORARIOS')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'HONORARIOS' ? 'bg-brand-gold text-black shadow-md' : 'bg-gray-100 dark:bg-black/40 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-white/5 hover:text-gray-900 dark:hover:text-white'}`}
        >
          <Award className="w-4 h-4" /> Candidatos a Socio Honorario ({honoraryCandidates.length})
        </button>
      </div>

      {/* TAB 1: DEPENDIENTES 25 AÑOS */}
      {activeTab === 'DEPENDIENTES' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-brand-gold/30 text-xs text-gray-700 dark:text-gray-300 shadow-sm">
            <p className="font-bold text-gray-900 dark:text-white mb-1">Regla de Negocio: Límite de Edad en Títulos Familiares</p>
            <p className="text-gray-600 dark:text-gray-400">
              Al cumplir los 25 años, el sistema <strong>desactiva automáticamente el carnet del hijo</strong> y activa una alerta comercial para ofrecer pase a <strong>Pre-Asociado</strong> (880 Bs/mes por 1+1 año) o compra de título propio como <strong>Socio Junior Mayor</strong> a precio preferencial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dependentAlerts.map(a => (
              <div key={a.beneficiaryId} className="glass-panel p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0d1311]/90 shadow-sm space-y-3 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${a.alertType === 'MAYOR_DE_25' ? 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-500/30 animate-pulse' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'}`}>
                      {a.alertType === 'MAYOR_DE_25' ? 'Cumplió 25 Años (Carnet Bloqueado)' : 'Cumplirá 25 Años en breve'}
                    </span>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1.5">{a.fullName}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Edad: <span className="text-gray-900 dark:text-white font-bold">{a.ageYears} años</span> • Nacimiento: {new Date(a.birthDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">Título Titular</span>
                    <p className="text-xs font-bold text-amber-800 dark:text-brand-gold">{a.membershipNumber}</p>
                    <p className="text-[11px] text-gray-700 dark:text-gray-300 font-semibold">{a.titularName}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/5 text-xs text-gray-700 dark:text-gray-300">
                  <p className="text-gray-500 dark:text-gray-400 text-[10px] uppercase font-bold">Acción Comercial Recomendada:</p>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">{a.suggestedAction}</p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-white/5">
                  <button 
                    onClick={() => toast.success(`Propuesta de Pre-Asociado enviada al WhatsApp del titular ${a.titularPhone || ''}`)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 text-xs font-bold hover:bg-emerald-500 hover:text-black transition-all"
                  >
                    Contactar WhatsApp Titular
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: SOCIOS HONORARIOS */}
      {activeTab === 'HONORARIOS' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-brand-gold/30 text-xs text-gray-700 dark:text-gray-300 shadow-sm">
            <p className="font-bold text-gray-900 dark:text-white mb-1">Requisitos Estatutarios para Socio Honorario</p>
            <p className="text-gray-600 dark:text-gray-400">
              Cumplir <strong>$\ge 60$ años de edad</strong> $+$ <strong>$\ge 20$ años de antigüedad</strong> como socio activo $+$ <strong>Saldo deudor = 0 Bs</strong>. Al ascender, queda <strong>100% exento del pago de la cuota social mensual</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {honoraryCandidates.map(c => (
              <div key={c.personId} className="glass-panel p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0d1311]/90 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${c.isEligible ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'}`}>
                      {c.isEligible ? '✓ 100% Elegible para Ascenso' : 'Próximo a cumplir criterios'}
                    </span>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1.5">{c.fullName}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">CI: {c.documentId} • Membresía: {c.membershipNumber}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-black/50 p-3 rounded-xl border border-gray-200 dark:border-white/5 text-center text-xs">
                  <div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Edad Actual</p>
                    <p className="text-base font-bold text-gray-900 dark:text-white">{c.ageYears} años</p>
                    <span className="text-[9px] text-emerald-700 dark:text-emerald-400">(&ge; 60 req)</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Antigüedad</p>
                    <p className="text-base font-bold text-amber-800 dark:text-brand-gold">{c.seniorityYears} años</p>
                    <span className="text-[9px] text-emerald-700 dark:text-emerald-400">(&ge; 20 req)</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Deuda Mora</p>
                    <p className={`text-base font-black ${c.totalUnpaidDebt === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      Bs {c.totalUnpaidDebt}
                    </p>
                    <span className="text-[9px] text-gray-500 dark:text-gray-400">(0 Bs req)</span>
                  </div>
                </div>

                {c.isEligible && (
                  <div className="flex justify-end pt-2">
                    <button 
                      onClick={() => { setSelectedCandidate(c); setBankDetails(prev => ({ ...prev, beneficiaryName: c.fullName })); }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-600 text-black text-xs font-black hover:scale-105 transition-all shadow-md shadow-brand-gold/20 flex items-center gap-1.5"
                    >
                      <Award className="w-4 h-4" /> Promocionar a Socio Honorario
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: PROMOTE TO HONORARY & PRORATED REFUND TO TREASURY */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0d1311] border border-gray-300 dark:border-brand-gold/40 rounded-3xl p-6 shadow-2xl space-y-4 text-gray-900 dark:text-white">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-3">
              <h3 className="text-lg font-bold serif-brand flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-700 dark:text-brand-gold" /> Ascenso a Socio Honorario & Liquidación
              </h3>
              <button onClick={() => setSelectedCandidate(null)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-black/60 border border-gray-200 dark:border-white/10 text-xs text-gray-700 dark:text-gray-300">
              Socio: <strong className="text-gray-900 dark:text-white">{selectedCandidate.fullName}</strong> ({selectedCandidate.membershipNumber})
              <p className="text-emerald-700 dark:text-emerald-400 font-semibold mt-1">✓ Se cancelará automáticamente el devengamiento mensual de 880 Bs.</p>
            </div>

            {/* Prorated Refund Section */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-brand-gold/20 space-y-3 text-xs">
              <h4 className="text-xs font-bold text-amber-800 dark:text-brand-gold uppercase tracking-wider">
                Prorrateo Anual & Solicitud de Reembolso a Tesorería
              </h4>
              <p className="text-gray-600 dark:text-gray-400 text-[11px]">
                Si el socio pagó la gestión completa por adelantado, el sistema calcula los meses restantes a su favor y aplica la retención impositiva de ley (12.5%).
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-600 dark:text-gray-400 font-semibold">Meses Pagados No Devengados</label>
                  <input 
                    type="number"
                    value={bankDetails.monthsInFavor}
                    onChange={e => setBankDetails({ ...bankDetails, monthsInFavor: parseInt(e.target.value) || 0 })}
                    className="w-full mt-1 p-2 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs outline-none font-bold text-amber-800 dark:text-brand-gold"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-600 dark:text-gray-400 font-semibold">Banco del Socio</label>
                  <input 
                    type="text"
                    value={bankDetails.bankName}
                    onChange={e => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                    className="w-full mt-1 p-2 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-600 dark:text-gray-400 font-semibold">Nro. de Cuenta Bancaria</label>
                <input 
                  type="text"
                  value={bankDetails.bankAccountNumber}
                  onChange={e => setBankDetails({ ...bankDetails, bankAccountNumber: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs outline-none font-mono"
                />
              </div>

              {bankDetails.monthsInFavor > 0 && (
                <div className="p-3 rounded-xl bg-white dark:bg-black/60 border border-gray-200 dark:border-emerald-500/30 text-xs space-y-1 shadow-sm">
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>Monto Bruto ({bankDetails.monthsInFavor} meses x 880 Bs):</span>
                    <span className="font-bold text-gray-900 dark:text-white">Bs {(bankDetails.monthsInFavor * 880).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-red-600 dark:text-red-400">
                    <span>Retención Impositiva Ley (12.5%):</span>
                    <span>- Bs {(bankDetails.monthsInFavor * 880 * 0.125).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black text-emerald-700 dark:text-emerald-400 pt-1 border-t border-gray-200 dark:border-white/10">
                    <span>Monto Neto a Transferir por Tesorería:</span>
                    <span>Bs {(bankDetails.monthsInFavor * 880 * 0.875).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-white/10">
              <button 
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button 
                onClick={handlePromoteHonorary}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-600 text-black text-xs font-extrabold hover:scale-105 transition-all shadow-md shadow-brand-gold/20"
              >
                Confirmar Ascenso & Enviar a Tesorería
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
