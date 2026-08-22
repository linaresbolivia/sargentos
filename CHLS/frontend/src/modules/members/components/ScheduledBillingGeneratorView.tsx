import React, { useState } from 'react';
import { 
  Calendar, 
  DollarSign, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Users, 
  Layers, 
  Filter, 
  Search, 
  Sparkles, 
  Printer, 
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  onOpenCashier?: (personId: string) => void;
}

export const ScheduledBillingGeneratorView: React.FC<Props> = ({ onOpenCashier }) => {
  // Config state for mass billing generation
  const [billingConfig, setBillingConfig] = useState({
    billingPeriod: '2026-09',
    executionDate: new Date().toISOString().split('T')[0],
    dueDate: '2026-09-10',
    exchangeRate: 6.96,
    targetCategory: 'TODAS', // TODAS, REGULAR_ACTIVO, DIPLOMATICO, JUVENIL, HONORARIO
    chargeType: 'CUOTA_SOCIAL', // CUOTA_SOCIAL, MANUTENCION_HIPICA, BOX_HIPICO, ESCUELAS_DEPORTIVAS, MULTA_MORA
    chargeAmountBs: 500,
    currency: 'BOL',
    glosa: 'Cuota Social Ordinaria - Período Septiembre 2026',
    autoApproveTxn: true,
    applyMoraPenalty: true
  });

  // Generated batches history
  const [batches, setBatches] = useState<any[]>([
    {
      id: 'LOTE-2026-08',
      period: 'Agosto 2026',
      chargeType: 'Cuota Social Ordinaria',
      generatedDate: '2026-08-01',
      totalMembers: 1420,
      totalAmountBs: 710000,
      totalAmountUsd: 102011.49,
      status: 'APROBADO',
      collectedAmountBs: 658500,
      pendingAmountBs: 51500,
      responsible: 'Lic. Federico Betancourt (Contabilidad)'
    },
    {
      id: 'LOTE-2026-08-HIP',
      period: 'Agosto 2026',
      chargeType: 'Manutención Hípica & Boxes',
      generatedDate: '2026-08-02',
      totalMembers: 84,
      totalAmountBs: 105000,
      totalAmountUsd: 15086.20,
      status: 'APROBADO',
      collectedAmountBs: 98000,
      pendingAmountBs: 7000,
      responsible: 'Cap. René Morales (Comisión Hípica)'
    },
    {
      id: 'LOTE-2026-07',
      period: 'Julio 2026',
      chargeType: 'Cuota Social Ordinaria',
      generatedDate: '2026-07-01',
      totalMembers: 1415,
      totalAmountBs: 707500,
      totalAmountUsd: 101652.30,
      status: 'APROBADO',
      collectedAmountBs: 707500,
      pendingAmountBs: 0,
      responsible: 'Lic. Federico Betancourt (Contabilidad)'
    }
  ]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);

  const handleGenerateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      const estimatedCount = billingConfig.chargeType === 'MANUTENCION_HIPICA' ? 86 : 1428;
      const totalBs = estimatedCount * billingConfig.chargeAmountBs;
      const totalUsd = totalBs / billingConfig.exchangeRate;

      const newBatch: any = {
        id: `LOTE-${billingConfig.billingPeriod}-${billingConfig.chargeType.substring(0, 3)}`,
        period: billingConfig.billingPeriod,
        chargeType: billingConfig.chargeType === 'CUOTA_SOCIAL' ? 'Cuota Social Ordinaria' : 'Manutención Hípica & Boxes',
        generatedDate: billingConfig.executionDate,
        totalMembers: estimatedCount,
        totalAmountBs: totalBs,
        totalAmountUsd: totalUsd,
        status: billingConfig.autoApproveTxn ? 'APROBADO' : 'PENDIENTE_REVISION',
        collectedAmountBs: 0,
        pendingAmountBs: totalBs,
        responsible: 'Administrador General (Sistema)'
      };

      setBatches([newBatch, ...batches]);
      setIsProcessing(false);
      toast.success(`¡Lote ${newBatch.id} generado exitosamente para ${estimatedCount} socios por un total de Bs ${totalBs.toLocaleString()}!`);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white serif-brand flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-gold" /> Carga de Cobros Programados & Facturación Masiva
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Generación periódica y masiva de cuotas sociales, mantenimiento de boxes hípicos y aranceles (Págs 13 y 18 - Guía Socio)
          </p>
        </div>
      </div>

      {/* Main Grid: Generator Form on Left, Stats & Batch History on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Batch Generator Form */}
        <div className="lg:col-span-1 p-5 rounded-3xl bg-white dark:bg-[#0d1311] border border-gray-200 dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-3">
            <Sparkles className="w-4 h-4 text-brand-gold" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white serif-brand">
              Nuevo Proceso de Emisión Masiva
            </h3>
          </div>

          <form onSubmit={handleGenerateBatch} className="space-y-3.5 text-xs">
            
            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase">Período de Facturación *</label>
              <input
                type="month"
                value={billingConfig.billingPeriod}
                onChange={e => setBillingConfig({ ...billingConfig, billingPeriod: e.target.value })}
                className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 font-bold text-gray-900 dark:text-white outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase">Concepto / Tipo de Cargo *</label>
              <select
                value={billingConfig.chargeType}
                onChange={e => {
                  const val = e.target.value;
                  let defaultAmount = 500;
                  if (val === 'MANUTENCION_HIPICA') defaultAmount = 1250;
                  if (val === 'BOX_HIPICO') defaultAmount = 350;
                  if (val === 'ESCUELAS_DEPORTIVAS') defaultAmount = 280;
                  if (val === 'MULTA_MORA') defaultAmount = 100;
                  setBillingConfig({ ...billingConfig, chargeType: val, chargeAmountBs: defaultAmount });
                }}
                className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 font-bold text-gray-900 dark:text-white outline-none"
              >
                <option value="CUOTA_SOCIAL">Cuota Social Mensual Ordinaria</option>
                <option value="MANUTENCION_HIPICA">Manutención & Alimentación Hípica (Boxes)</option>
                <option value="BOX_HIPICO">Alquiler de Box Hípico Adicional</option>
                <option value="ESCUELAS_DEPORTIVAS">Aranceles Escuelas Deportivas</option>
                <option value="MULTA_MORA">Recargo Administrativo por Mora</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase">Monto por Socio (Bs)</label>
                <input
                  type="number"
                  value={billingConfig.chargeAmountBs}
                  onChange={e => setBillingConfig({ ...billingConfig, chargeAmountBs: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 font-mono font-bold text-amber-800 dark:text-brand-gold outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase">Tipo de Cambio</label>
                <input
                  type="number"
                  step="0.01"
                  value={billingConfig.exchangeRate}
                  onChange={e => setBillingConfig({ ...billingConfig, exchangeRate: parseFloat(e.target.value) || 6.96 })}
                  className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 font-mono font-bold text-gray-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase">Categoría Objetivo</label>
              <select
                value={billingConfig.targetCategory}
                onChange={e => setBillingConfig({ ...billingConfig, targetCategory: e.target.value })}
                className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white outline-none"
              >
                <option value="TODAS">Todos los Socios Activos (1,428 socios)</option>
                <option value="REGULAR_ACTIVO">Solo Socios Regulares Activos (1,150)</option>
                <option value="DIPLOMATICO">Solo Diplomáticos & Institucionales (85)</option>
                <option value="JUVENIL">Solo Socios Juveniles (120)</option>
                <option value="HIPICA">Solo Propietarios de Equinos / Boxes (86)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase">Glosa Contable Oficial</label>
              <textarea
                rows={2}
                value={billingConfig.glosa}
                onChange={e => setBillingConfig({ ...billingConfig, glosa: e.target.value })}
                className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white outline-none"
              ></textarea>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-brand-gold/10 border border-amber-300 dark:border-brand-gold/30 space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={billingConfig.autoApproveTxn}
                  onChange={e => setBillingConfig({ ...billingConfig, autoApproveTxn: e.target.checked })}
                  className="rounded text-brand-gold focus:ring-brand-gold"
                />
                <span className="text-xs font-bold text-gray-900 dark:text-white">Aprobar Transacción & Contabilizar Automáticamente</span>
              </label>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                Genera los asientos de cuentas por cobrar en el plan de cuentas institucional de forma inmediata.
              </p>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-600 text-black font-extrabold text-xs flex items-center justify-center gap-2 hover:scale-[1.02] shadow-md shadow-brand-gold/20 transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>Procesando emisión masiva...</>
              ) : (
                <><Play className="w-4 h-4 fill-current" /> Ejecutar Emisión Masiva de Cargos</>
              )}
            </button>

          </form>
        </div>

        {/* Right Column: Historical Batches & Analytics */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1311] border border-gray-200 dark:border-white/10">
              <span className="text-[10px] text-gray-400 uppercase font-bold">Total Facturado Agosto</span>
              <p className="text-lg font-black font-mono text-gray-900 dark:text-white mt-1">Bs 815,000</p>
              <span className="text-[10px] text-emerald-500 font-semibold">1,504 cargos emitidos</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1311] border border-gray-200 dark:border-white/10">
              <span className="text-[10px] text-gray-400 uppercase font-bold">Recaudado en Caja</span>
              <p className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">Bs 756,500</p>
              <span className="text-[10px] text-emerald-500 font-semibold">92.8% de efectividad</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1311] border border-gray-200 dark:border-white/10">
              <span className="text-[10px] text-gray-400 uppercase font-bold">Cartera Pendiente</span>
              <p className="text-lg font-black font-mono text-amber-800 dark:text-brand-gold mt-1">Bs 58,500</p>
              <span className="text-[10px] text-amber-500 font-semibold">En gestión de cobro</span>
            </div>
          </div>

          {/* Batches Table */}
          <div className="p-4 rounded-3xl bg-white dark:bg-[#0d1311] border border-gray-200 dark:border-white/10 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white serif-brand">
                Historial de Lotes de Cobros Programados
              </h3>
              <span className="text-xs text-gray-400 font-mono">Mostrando {batches.length} lotes</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 dark:bg-black/60 text-gray-500 uppercase font-bold text-[10px] border-b border-gray-200 dark:border-white/10">
                  <tr>
                    <th className="p-3">Código Lote</th>
                    <th className="p-3">Concepto & Período</th>
                    <th className="p-3">Socios</th>
                    <th className="p-3">Total Emitido</th>
                    <th className="p-3">Recaudado</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="p-3 font-mono font-bold text-amber-800 dark:text-brand-gold">{b.id}</td>
                      <td className="p-3">
                        <span className="font-bold text-gray-900 dark:text-white block">{b.chargeType}</span>
                        <span className="text-[10px] text-gray-400">{b.period} • {b.generatedDate}</span>
                      </td>
                      <td className="p-3 font-semibold text-gray-800 dark:text-gray-200">{b.totalMembers}</td>
                      <td className="p-3 font-mono font-black text-gray-900 dark:text-white">
                        Bs {b.totalAmountBs.toLocaleString()}
                      </td>
                      <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        Bs {b.collectedAmountBs.toLocaleString()}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                          {b.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedBatch(b)}
                          className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/10 hover:bg-brand-gold hover:text-black text-gray-800 dark:text-gray-200 text-[11px] font-bold transition-all"
                        >
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>

      </div>

      {/* MODAL: DETALLE DEL LOTE */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0d1311] border border-gray-300 dark:border-brand-gold/30 rounded-3xl p-6 shadow-2xl space-y-4 text-gray-900 dark:text-white">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold serif-brand">Detalle de Emisión: {selectedBatch.id}</h3>
                <p className="text-xs text-gray-400">{selectedBatch.chargeType} • {selectedBatch.period}</p>
              </div>
              <button onClick={() => setSelectedBatch(null)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Socios Afectados:</span>
                <span className="font-bold">{selectedBatch.totalMembers} cuentas individuales</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Facturado en Moneda Nacional:</span>
                <span className="font-mono font-bold text-amber-800 dark:text-brand-gold">Bs {selectedBatch.totalAmountBs.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Equivalente Dólares ($us):</span>
                <span className="font-mono font-bold">$us {selectedBatch.totalAmountUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Responsable de Contabilidad:</span>
                <span className="font-semibold">{selectedBatch.responsible}</span>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-200 text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Imprimir Planilla de Emisión
              </button>
              <button
                onClick={() => setSelectedBatch(null)}
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
