import React, { useState } from 'react';
import { 
  Award, 
  DollarSign, 
  Users, 
  Calendar, 
  CheckCircle2, 
  Search, 
  Filter, 
  Printer, 
  TrendingUp, 
  Percent, 
  ShieldCheck, 
  Plus, 
  X,
  FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';

export const SalesCommissionsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'ASESORES' | 'COBRADORES'>('ASESORES');
  const [dateRange, setDateRange] = useState({
    startDate: '2026-08-01',
    endDate: '2026-08-31'
  });

  // Commission records for Sales Advisors (Adquisición Membresías CDP 60/40)
  const [advisorCommissions, setAdvisorCommissions] = useState([
    {
      id: 'COM-ASE-001',
      code: 'COM-ASE-001',
      advisorName: 'Lic. Claudia Navajas (Ejecutiva Senior)',
      saleDate: '2026-08-12',
      memberCode: '1055',
      memberName: 'Carlos Mendoza Vargas',
      membershipCategory: 'Socio Regular Activo (CDP)',
      membershipAmountBs: 41400,
      cuotaIngresoBs: 13800,
      commissionRate: 2.5,
      commissionAmountBs: 1035.00,
      status: 'LIQUIDADO',
      paymentDate: '2026-08-15',
      receiptNumber: 'REC-COM-842'
    },
    {
      id: 'COM-ASE-002',
      code: 'COM-ASE-002',
      advisorName: 'Lic. Claudia Navajas (Ejecutiva Senior)',
      saleDate: '2026-08-18',
      memberCode: '1056',
      memberName: 'Alejandro Gutiérrez Ballivián',
      membershipCategory: 'Socio Regular Activo (CDP)',
      membershipAmountBs: 41400,
      cuotaIngresoBs: 13800,
      commissionRate: 2.5,
      commissionAmountBs: 1035.00,
      status: 'PENDIENTE',
      paymentDate: null,
      receiptNumber: '-'
    },
    {
      id: 'COM-ASE-003',
      code: 'COM-ASE-003',
      advisorName: 'Ing. Mauricio Beltrán (Asesor Comercial)',
      saleDate: '2026-08-05',
      memberCode: '1054',
      memberName: 'Embajada del Japón en Bolivia',
      membershipCategory: 'Socio Diplomático Institucional',
      membershipAmountBs: 55000,
      cuotaIngresoBs: 22000,
      commissionRate: 3.0,
      commissionAmountBs: 1650.00,
      status: 'LIQUIDADO',
      paymentDate: '2026-08-10',
      receiptNumber: 'REC-COM-839'
    }
  ]);

  // Commission records for Field Debt Collectors (Cobranzas a domicilio y en mora)
  const [collectorCommissions, setCollectorCommissions] = useState([
    {
      id: 'COM-COB-001',
      code: 'COM-COB-001',
      collectorName: 'Ubaldo Filen (Cobrador Externo Zona Sur)',
      collectionDate: '2026-08-14',
      memberCode: '1038',
      memberName: 'Patricia Morales de Ortiz',
      serviceType: 'Cuotas Sociales en Mora',
      collectedAmountBs: 5500.00,
      commissionRate: 2.0,
      commissionAmountBs: 110.00,
      status: 'LIQUIDADO',
      receiptNumber: 'REC-COB-104'
    },
    {
      id: 'COM-COB-002',
      code: 'COM-COB-002',
      collectorName: 'Ubaldo Filen (Cobrador Externo Zona Sur)',
      collectionDate: '2026-08-20',
      memberCode: '1012',
      memberName: 'Fernando Zalles Pacheco',
      serviceType: 'Manutención Hípica Boxes',
      collectedAmountBs: 7500.00,
      commissionRate: 1.0,
      commissionAmountBs: 75.00,
      status: 'PENDIENTE',
      receiptNumber: '-'
    },
    {
      id: 'COM-COB-003',
      code: 'COM-COB-003',
      collectorName: 'Mario Siles (Cobrador Centro/Miraflores)',
      collectionDate: '2026-08-10',
      memberCode: '1044',
      memberName: 'Gonzalo Durán Morales',
      serviceType: 'Cuota Social Anualizada',
      collectedAmountBs: 6000.00,
      commissionRate: 2.0,
      commissionAmountBs: 120.00,
      status: 'LIQUIDADO',
      receiptNumber: 'REC-COB-102'
    }
  ]);

  const [selectedRecordForPrint, setSelectedRecordForPrint] = useState<any>(null);

  const totalAdvisorsCommissionBs = advisorCommissions.reduce((sum, item) => sum + item.commissionAmountBs, 0);
  const totalCollectorsCommissionBs = collectorCommissions.reduce((sum, item) => sum + item.commissionAmountBs, 0);

  const handleLiquidate = (record: any, type: 'ASESOR' | 'COBRADOR') => {
    if (type === 'ASESOR') {
      setAdvisorCommissions(advisorCommissions.map(a => a.id === record.id ? { ...a, status: 'LIQUIDADO', paymentDate: new Date().toISOString().split('T')[0], receiptNumber: `REC-COM-${Math.floor(100 + Math.random() * 900)}` } : a));
    } else {
      setCollectorCommissions(collectorCommissions.map(c => c.id === record.id ? { ...c, status: 'LIQUIDADO', receiptNumber: `REC-COB-${Math.floor(100 + Math.random() * 900)}` } : c));
    }
    toast.success(`¡Comisión ${record.code} liquidada y contabilizada exitosamente!`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white serif-brand flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-gold" /> Liquidación de Comisiones a Asesores & Cobradores
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Control de comisiones por venta de membresías CDP y recuperación de cobranzas en mora (Págs 8, 9 y 14 - Guía Socio)
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={dateRange.startDate}
            onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="p-1.5 rounded-lg bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white"
          />
          <span className="text-gray-400">al</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="p-1.5 rounded-lg bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1311] border border-gray-200 dark:border-white/10">
          <span className="text-[10px] text-gray-400 uppercase font-bold">Comisiones Asesores (Ventas CDP)</span>
          <p className="text-xl font-black font-mono text-amber-800 dark:text-brand-gold mt-1">
            Bs {totalAdvisorsCommissionBs.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-gray-500">3 membresías emitidas en el período</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1311] border border-gray-200 dark:border-white/10">
          <span className="text-[10px] text-gray-400 uppercase font-bold">Comisiones Cobradores (Recuperación)</span>
          <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            Bs {totalCollectorsCommissionBs.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-emerald-500">Recaudación de Bs 19,000.00 gestionada</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1311] border border-gray-200 dark:border-white/10">
          <span className="text-[10px] text-gray-400 uppercase font-bold">Total Liquidado a la Fecha</span>
          <p className="text-xl font-black font-mono text-gray-900 dark:text-white mt-1">
            Bs {(totalAdvisorsCommissionBs + totalCollectorsCommissionBs).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-blue-500">Partida de Gasto Comercial 5.1.2.04</span>
        </div>
      </div>

      {/* Sub-tabs Selector */}
      <div className="flex border-b border-gray-200 dark:border-white/10 gap-4">
        <button
          onClick={() => setActiveSubTab('ASESORES')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'ASESORES'
              ? 'border-brand-gold text-amber-800 dark:text-brand-gold'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> Comisiones Asesores Comerciales (Membresías CDP)
        </button>

        <button
          onClick={() => setActiveSubTab('COBRADORES')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'COBRADORES'
              ? 'border-brand-gold text-amber-800 dark:text-brand-gold'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4" /> Comisiones Cobradores (Cuotas & Manutención)
        </button>
      </div>

      {/* Tables depending on Active SubTab */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#0d1311] border border-gray-200 dark:border-white/10 shadow-sm space-y-4">
        
        {activeSubTab === 'ASESORES' ? (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 dark:bg-black/60 text-gray-500 uppercase font-bold text-[10px] border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">Asesor Comercial</th>
                  <th className="p-3">Socio Adjudicado</th>
                  <th className="p-3">Valor Membresía</th>
                  <th className="p-3">% Com.</th>
                  <th className="p-3">Comisión (Bs)</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                {advisorCommissions.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="p-3 font-mono font-bold text-amber-800 dark:text-brand-gold">{a.code}</td>
                    <td className="p-3 font-semibold text-gray-900 dark:text-white">{a.advisorName}</td>
                    <td className="p-3">
                      <span className="font-bold block text-gray-900 dark:text-white">{a.memberName}</span>
                      <span className="text-[10px] text-gray-400 font-mono">#{a.memberCode} • {a.saleDate}</span>
                    </td>
                    <td className="p-3 font-mono font-bold text-gray-800 dark:text-gray-200">
                      Bs {a.membershipAmountBs.toLocaleString()}
                    </td>
                    <td className="p-3 font-bold text-blue-500">{a.commissionRate}%</td>
                    <td className="p-3 font-mono font-black text-amber-800 dark:text-brand-gold">
                      Bs {a.commissionAmountBs.toFixed(2)}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        a.status === 'LIQUIDADO'
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                          : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {a.status === 'PENDIENTE' ? (
                        <button
                          onClick={() => handleLiquidate(a, 'ASESOR')}
                          className="px-3 py-1 rounded-lg bg-brand-gold text-black text-[11px] font-extrabold hover:scale-105 transition-all shadow-sm"
                        >
                          Liquidar
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedRecordForPrint(a)}
                          className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 text-[11px] font-bold"
                        >
                          <Printer className="w-3.5 h-3.5 inline mr-1" /> Recibo
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 dark:bg-black/60 text-gray-500 uppercase font-bold text-[10px] border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">Cobrador</th>
                  <th className="p-3">Socio & Concepto</th>
                  <th className="p-3">Monto Cobrado</th>
                  <th className="p-3">% Com.</th>
                  <th className="p-3">Comisión (Bs)</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                {collectorCommissions.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="p-3 font-mono font-bold text-amber-800 dark:text-brand-gold">{c.code}</td>
                    <td className="p-3 font-semibold text-gray-900 dark:text-white">{c.collectorName}</td>
                    <td className="p-3">
                      <span className="font-bold block text-gray-900 dark:text-white">{c.memberName}</span>
                      <span className="text-[10px] text-gray-400">{c.serviceType} • {c.collectionDate}</span>
                    </td>
                    <td className="p-3 font-mono font-bold text-gray-800 dark:text-gray-200">
                      Bs {c.collectedAmountBs.toLocaleString()}
                    </td>
                    <td className="p-3 font-bold text-blue-500">{c.commissionRate}%</td>
                    <td className="p-3 font-mono font-black text-emerald-600 dark:text-emerald-400">
                      Bs {c.commissionAmountBs.toFixed(2)}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        c.status === 'LIQUIDADO'
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                          : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {c.status === 'PENDIENTE' ? (
                        <button
                          onClick={() => handleLiquidate(c, 'COBRADOR')}
                          className="px-3 py-1 rounded-lg bg-brand-gold text-black text-[11px] font-extrabold hover:scale-105 transition-all shadow-sm"
                        >
                          Liquidar
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedRecordForPrint(c)}
                          className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 text-[11px] font-bold"
                        >
                          <Printer className="w-3.5 h-3.5 inline mr-1" /> Recibo
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Print Receipt Modal */}
      {selectedRecordForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-white dark:bg-[#0d1311] border border-gray-300 dark:border-brand-gold/30 rounded-3xl p-6 shadow-2xl space-y-4 text-gray-900 dark:text-white">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold serif-brand">Recibo de Liquidación de Comisión</h3>
                <p className="text-xs text-gray-400">Nro: {selectedRecordForPrint.receiptNumber}</p>
              </div>
              <button onClick={() => setSelectedRecordForPrint(null)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Beneficiario:</span>
                <span className="font-bold">{selectedRecordForPrint.advisorName || selectedRecordForPrint.collectorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Concepto de Origen:</span>
                <span>{selectedRecordForPrint.memberName} (#{selectedRecordForPrint.memberCode})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Porcentaje Aplicado:</span>
                <span className="font-bold">{selectedRecordForPrint.commissionRate}%</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-white/10 text-sm font-bold">
                <span className="text-gray-900 dark:text-white">Total Líquido Pagado:</span>
                <span className="font-mono text-amber-800 dark:text-brand-gold">Bs {selectedRecordForPrint.commissionAmountBs.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-200 text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Imprimir Comprobante
              </button>
              <button
                onClick={() => setSelectedRecordForPrint(null)}
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
