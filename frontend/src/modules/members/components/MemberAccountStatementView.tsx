import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ShieldCheck, 
  Clock, 
  Download, 
  RefreshCw, 
  Receipt, 
  FileText, 
  Sparkles, 
  ExternalLink,
  ChevronRight,
  Info,
  Calendar,
  Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SocioAccountStatementResponse, memberPortalApi } from '../services/memberPortalApi';
import { MemberQrPaymentModal } from './MemberQrPaymentModal';

interface MemberAccountStatementViewProps {
  onBack?: () => void;
}

export const MemberAccountStatementView: React.FC<MemberAccountStatementViewProps> = ({ onBack }) => {
  const [statement, setStatement] = useState<SocioAccountStatementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedDueAmount, setSelectedDueAmount] = useState<number | undefined>(undefined);

  const fetchStatement = async () => {
    try {
      setLoading(true);
      const data = await memberPortalApi.getMyAccountStatement();
      setStatement(data);
    } catch (err: any) {
      console.error('Error fetching statement:', err);
      toast.error(err.response?.data?.message || 'Error al cargar tu estado de cuenta');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatement();
  }, []);

  const handleOpenPay = (amount?: number) => {
    setSelectedDueAmount(amount);
    setShowPayModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center space-y-4">
        <RefreshCw className="w-10 h-10 animate-spin text-brand-gold" />
        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
          Consultando tu Estado de Cuentas en tiempo real con Tesorería...
        </p>
      </div>
    );
  }

  if (!statement) {
    return (
      <div className="glass-panel p-8 rounded-3xl text-center space-y-4 max-w-xl mx-auto my-8 border border-white/10 text-white">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h3 className="text-lg font-bold">No se encontró información de membresía activa</h3>
        <p className="text-xs text-gray-400">
          Tu cuenta de usuario no tiene asignado un título de socio titular o los datos aún no están sincronizados.
        </p>
        <button
          onClick={fetchStatement}
          className="px-5 py-2.5 rounded-xl bg-brand-gold text-black font-bold text-xs"
        >
          Reintentar Consulta
        </button>
      </div>
    );
  }

  const { socio, financialSummary, pendingDues, recentPayments, submittedVouchers } = statement;

  return (
    <div className="space-y-6 text-gray-900 dark:text-white">
      
      {/* ========================================================================= */}
      {/* 1. VIP EXECUTIVE BANNER & ACCESS REGULATION BADGE                         */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#15251d] via-[#0d1813] to-[#070c09] border-2 border-brand-gold/40 p-6 sm:p-7 shadow-2xl text-white">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 relative z-10">
          
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-gold/20 text-brand-gold border border-brand-gold/40">
                {socio.category}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/60 text-emerald-400 border border-emerald-500/30">
                Acción #{socio.membershipNumber}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold serif-brand text-white">
              {socio.fullName}
            </h2>

            <p className="text-xs text-gray-400">
              Estado de Membresía: <strong className="text-emerald-400 font-bold">{socio.membershipStatus}</strong> • Club Hípico Los Sargentos
            </p>
          </div>

          {/* Quick Pay CTA Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => handleOpenPay(financialSummary.totalDebt > 0 ? financialSummary.totalDebt : undefined)}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-brand-gold via-yellow-500 to-amber-600 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-105 shadow-xl shadow-brand-gold/30 transition-all border border-brand-gold"
            >
              <QrCode className="w-5 h-5" /> Pagar con QR Simple Bancario
            </button>
          </div>

        </div>

        {/* Gatehouse & Torniquetes Access Status Indicator */}
        <div className="mt-5 pt-4 border-t border-brand-gold/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-3.5 h-3.5 rounded-full ${
              financialSummary.accessStatus === 'GRANTED' ? 'bg-emerald-400 animate-pulse' :
              financialSummary.accessStatus === 'WARNING' ? 'bg-amber-400 animate-pulse' :
              'bg-red-500'
            }`}></div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                Regla de Acceso en Molinetes & Garita:
                <span className={`font-black uppercase tracking-wider ${
                  financialSummary.accessStatus === 'GRANTED' ? 'text-emerald-400' :
                  financialSummary.accessStatus === 'WARNING' ? 'text-amber-400' :
                  'text-red-400'
                }`}>
                  {financialSummary.accessMessage}
                </span>
              </p>
              <p className="text-[11px] text-gray-400">
                Política CHLS: Hasta 1 mes de mora se otorga pase de cortesía amarillo. Más de 1 mes bloquea torniquetes automáticos.
              </p>
            </div>
          </div>

          <button
            onClick={fetchStatement}
            className="text-[11px] text-brand-gold hover:underline flex items-center gap-1 self-end sm:self-auto"
          >
            <RefreshCw className="w-3 h-3" /> Actualizar Estado
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. METRICS CARDS GRID                                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Saldo */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0c1410]/90 shadow-md space-y-1.5">
          <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 text-xs font-semibold">
            <span>Saldo Total Adeudado</span>
            <DollarSign className="w-4 h-4 text-brand-gold" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white font-mono">
            Bs {financialSummary.totalDebt.toFixed(2)}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {financialSummary.totalDebt === 0 ? '✓ Estás 100% al día' : 'Pendiente de cancelación'}
          </p>
        </div>

        {/* Estado Mora */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0c1410]/90 shadow-md space-y-1.5">
          <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 text-xs font-semibold">
            <span>Antigüedad de Mora</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
              financialSummary.debtStatus === 'SIN_DEUDA' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
              financialSummary.debtStatus === '1_MES' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
              'bg-red-500/20 text-red-600 dark:text-red-400'
            }`}>
              {financialSummary.debtStatus === 'SIN_DEUDA' ? 'Sin Deuda (0 Meses)' :
               financialSummary.debtStatus === '1_MES' ? '1 Mes de Gracia' :
               `${financialSummary.debtMonthsCount} Meses en Mora`}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Última conciliación bancaria: {financialSummary.lastDebtSync ? new Date(financialSummary.lastDebtSync).toLocaleDateString() : 'Hoy'}
          </p>
        </div>

        {/* Próximo Vencimiento */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0c1410]/90 shadow-md space-y-1.5">
          <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 text-xs font-semibold">
            <span>Próximo Vencimiento</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-base font-bold text-gray-900 dark:text-white">
            {financialSummary.nextDueDate}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Cuota Social mensual ordinaria
          </p>
        </div>

        {/* Pagos Realizados */}
        <div className="glass-panel p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0c1410]/90 shadow-md space-y-1.5">
          <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 text-xs font-semibold">
            <span>Comprobantes Reportados</span>
            <Receipt className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white font-mono">
            {submittedVouchers.length}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Envíos vía QR / Transferencia
          </p>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. DETALLE DE CUOTAS Y SERVICIOS PENDIENTES                                */}
      {/* ========================================================================= */}
      <div className="glass-panel p-6 rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0c1410]/90 shadow-xl space-y-4">
        
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-gold" /> Desglose de Cuotas & Cargos Pendientes
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Detalle de obligaciones vigentes que componen tu estado de cuenta.
            </p>
          </div>

          {financialSummary.totalDebt > 0 && (
            <button
              onClick={() => handleOpenPay(financialSummary.totalDebt)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-black text-xs font-black uppercase tracking-wider hover:scale-105 transition-all shadow-md flex items-center gap-1.5"
            >
              <QrCode className="w-4 h-4" /> Pagar Todo (Bs {financialSummary.totalDebt.toFixed(2)})
            </button>
          )}
        </div>

        {pendingDues.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 dark:bg-black/30 rounded-2xl border border-gray-200 dark:border-white/5 space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h4 className="text-base font-bold text-gray-900 dark:text-white">¡No tienes cargos pendientes!</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Tu membresía #{socio.membershipNumber} se encuentra al día con todas sus cuotas sociales y servicios. Tu acceso a todas las instalaciones del Club está completamente garantizado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 dark:bg-black/40 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                <tr>
                  <th className="p-3">Concepto</th>
                  <th className="p-3">Periodo</th>
                  <th className="p-3">Fecha Límite</th>
                  <th className="p-3">Monto (Bs)</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Opción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                {pendingDues.map(due => (
                  <tr key={due.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-3 font-bold text-gray-900 dark:text-white">{due.concept}</td>
                    <td className="p-3 font-mono text-brand-gold font-semibold">{due.period}</td>
                    <td className="p-3 text-gray-500 dark:text-gray-400">{due.dueDate}</td>
                    <td className="p-3 font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      Bs {due.amount.toFixed(2)}
                    </td>
                    <td className="p-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30">
                        {due.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleOpenPay(due.amount)}
                        className="px-3 py-1.5 rounded-xl bg-brand-gold text-black text-xs font-bold hover:scale-105 transition-all shadow-sm"
                      >
                        Pagar Este Cargo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 4. HISTORIAL DE PAGOS ACREDITADOS & FACTURAS / RECIBOS                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Official Payments */}
        <div className="glass-panel p-6 rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0c1410]/90 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-3">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-500" /> Pagos Oficiales Acreditados
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">Facturas & Recibos</span>
          </div>

          {recentPayments.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No hay registros de pagos recientes en el sistema.</p>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {recentPayments.map(p => (
                <div key={p.id} className="p-3 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white">Transacción {p.code}</span>
                      <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">{new Date(p.paymentDate).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Método: <strong className="text-brand-gold">{p.method}</strong> • {p.invoiceNumber ? `Factura #${p.invoiceNumber}` : `Recibo #${p.receiptNumber || 'Oficial'}`}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      Bs {p.amount.toFixed(2)}
                    </span>
                    <span className="block text-[9px] font-bold text-emerald-500 uppercase">
                      ✓ Acreditado
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submitted Vouchers Tracking */}
        <div className="glass-panel p-6 rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0c1410]/90 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-3">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-gold" /> Seguimiento de Comprobantes QR
            </h3>
            <span className="text-[10px] text-gray-400">Enviados por ti</span>
          </div>

          {submittedVouchers.length === 0 ? (
            <div className="p-6 text-center text-gray-400 space-y-1">
              <p className="text-xs">No has enviado comprobantes recientemente.</p>
              <p className="text-[11px] text-gray-500">Cuando realices una transferencia bancaria o pago QR, adjúntalo aquí para su validación inmediata.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {submittedVouchers.map(v => (
                <div key={v.id} className="p-3 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white font-mono">Ref: {v.referenceNumber}</span>
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">Bs {v.amount.toFixed(2)}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {v.concept} • {new Date(v.createdAt).toLocaleDateString()}
                    </p>
                    {v.reviewNotes && (
                      <p className="text-[10px] text-amber-500 mt-0.5 italic">{v.reviewNotes}</p>
                    )}
                  </div>

                  <div>
                    {v.status === 'APROBADO' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        Aprobado
                      </span>
                    ) : v.status === 'RECHAZADO' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30">
                        Observado
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> En Revisión
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 5. MODAL DE PAGO QR Y SUBIDA DE COMPROBANTE                               */}
      {/* ========================================================================= */}
      <MemberQrPaymentModal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        statement={statement}
        onVoucherSubmitted={() => {
          fetchStatement();
        }}
        selectedAmount={selectedDueAmount}
      />

    </div>
  );
};
