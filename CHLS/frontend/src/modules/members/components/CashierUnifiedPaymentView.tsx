import React, { useState, useEffect } from 'react';
import { Search, DollarSign, Receipt, Printer, CheckCircle2, AlertCircle, FileText, Calendar, Shield, Clock, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { memberAdminApi } from '../services/memberAdminApi';

interface Props {
  initialPersonId?: string | null;
}

export const CashierUnifiedPaymentView: React.FC<Props> = ({ initialPersonId }) => {
  const [activeTab, setActiveTab] = useState<'COBRO' | 'ARQUEO'>('COBRO');
  
  // Search & Member state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [debtSheet, setDebtSheet] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Selected Debt Items to Pay
  const [selectedItems, setSelectedItems] = useState<{ [id: string]: { selected: boolean; amount: number; type: 'SOCIAL_FEE' | 'CDP_INSTALLMENT' | 'EXTRAORDINARY_CHARGE' } }>({});

  // Payment Form
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [fiscalNit, setFiscalNit] = useState('');
  const [fiscalRazonSocial, setFiscalRazonSocial] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  // Completed Payment / Receipt Modal
  const [completedPayment, setCompletedPayment] = useState<any>(null);
  const [viewingVetDetails, setViewingVetDetails] = useState<any>(null);
  const [viewingAccountingEntry, setViewingAccountingEntry] = useState<any>(null);

  // Arqueo State
  const [closingData, setClosingData] = useState<any>(null);

  useEffect(() => {
    if (initialPersonId) {
      loadDebt(initialPersonId);
    }
  }, [initialPersonId]);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSearch = async () => {
    try {
      const res = await memberAdminApi.searchMembers(searchQuery);
      setSearchResults(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDebt = async (personId: string) => {
    try {
      setLoading(true);
      const res = await memberAdminApi.getMemberDebtSheet(personId);
      setDebtSheet(res.data);
      setSelectedPerson(res.data.person);
      setFiscalNit(res.data.person.fiscalNit || '');
      setFiscalRazonSocial(res.data.person.fiscalCompanyName || '');

      // Pre-select all items by default
      const initialSelection: any = {};
      res.data.itemsFechas.forEach((f: any) => {
        initialSelection[f.id] = { selected: true, amount: f.balance, type: f.type };
      });
      res.data.itemsCuotas.forEach((c: any) => {
        initialSelection[c.id] = { selected: false, amount: c.balance, type: 'CDP_INSTALLMENT' };
      });
      setSelectedItems(initialSelection);
      setSearchResults([]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al cargar deudas del socio');
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (id: string, fullBalance: number, type: any) => {
    setSelectedItems(prev => {
      const current = prev[id];
      if (current && current.selected) {
        return { ...prev, [id]: { ...current, selected: false } };
      } else {
        return { ...prev, [id]: { selected: true, amount: fullBalance, type } };
      }
    });
  };

  // Calculate totals to pay
  let totalToPay = 0;
  let estimatedInvoiced = 0;
  let estimatedCdp = 0;

  Object.entries(selectedItems).forEach(([id, item]) => {
    if (item.selected) {
      totalToPay += item.amount;
      if (item.type === 'CDP_INSTALLMENT') {
        estimatedInvoiced += Number((item.amount * 0.60).toFixed(2));
        estimatedCdp += Number((item.amount * 0.40).toFixed(2));
      } else {
        estimatedInvoiced += item.amount;
      }
    }
  });

  const handleExecutePayment = async () => {
    if (totalToPay <= 0) {
      toast.error('Selecciona al menos un concepto para cobrar');
      return;
    }

    try {
      setProcessing(true);
      const itemsToPay = Object.entries(selectedItems)
        .filter(([_, item]) => item.selected)
        .map(([id, item]) => ({ id, type: item.type, amount: item.amount }));

      const res = await memberAdminApi.processPayment({
        personId: selectedPerson.id,
        cashierUsername: 'personal_caja_1',
        paymentMethod,
        amountPaid: totalToPay,
        fiscalNit,
        fiscalRazonSocial,
        selectedItemIds: itemsToPay,
        notes: paymentNotes
      });

      toast.success('¡Cobro procesado exitosamente!');
      setCompletedPayment(res.data);
      // Reload debt
      loadDebt(selectedPerson.id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al procesar pago en caja');
    } finally {
      setProcessing(false);
    }
  };

  const loadClosing = async () => {
    try {
      setLoading(true);
      const res = await memberAdminApi.getDailyCashClosing();
      setClosingData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-gray-900 dark:text-white">
      
      {/* Top Mode Selector */}
      <div className="flex justify-between items-center glass-panel p-4 border-l-4 border-emerald-500 bg-white/90 dark:bg-[#0d1311]/90 border border-gray-200 dark:border-white/10 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
              Estación de Trabajo
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Punto de Cobranza Central CHLS</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white serif-brand mt-1">
            Caja Rápida & Facturación Unificada
          </h2>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('COBRO')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'COBRO' ? 'bg-brand-gold text-black shadow-md' : 'bg-gray-100 dark:bg-black/40 text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/5'}`}
          >
            💵 Cobro a Socio
          </button>
          <button
            onClick={() => { setActiveTab('ARQUEO'); loadClosing(); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'ARQUEO' ? 'bg-brand-gold text-black shadow-md' : 'bg-gray-100 dark:bg-black/40 text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/5'}`}
          >
            📊 Arqueo Diario de Caja
          </button>
        </div>
      </div>

      {activeTab === 'COBRO' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Search & Debt Sheet (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Search Box */}
            <div className="glass-panel p-4 relative bg-white/90 dark:bg-[#0d1311]/90 border border-gray-200 dark:border-white/10 shadow-sm">
              <label className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">Localizar Socio en Caja</label>
              <div className="relative mt-1">
                <Search className="w-4 h-4 text-gray-500 dark:text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Escribe Código Alfa (DUR-MOR-G-M), CI, Nombre o Membresía..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-black/60 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm focus:border-brand-gold outline-none"
                />
              </div>

              {/* Search Suggestions Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-4 right-4 top-full mt-2 bg-white dark:bg-[#0a100d] border border-gray-200 dark:border-brand-gold/40 rounded-2xl shadow-2xl z-30 max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
                  {searchResults.map(s => (
                    <div 
                      key={s.id}
                      onClick={() => loadDebt(s.id)}
                      className="p-3 hover:bg-gray-50 dark:hover:bg-white/10 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{s.fullName}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">CI: {s.documentId} • Membresía: {s.membership?.number} ({s.membership?.category})</p>
                      </div>
                      <span className="font-mono text-xs font-bold text-amber-800 dark:text-brand-gold bg-amber-50 dark:bg-black/60 px-2 py-1 rounded border border-amber-300 dark:border-brand-gold/30">
                        {s.alphaCode}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Socio Header Card */}
            {selectedPerson && (
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-brand-gold/30 flex items-center justify-between shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-800 dark:text-brand-gold bg-amber-100 dark:bg-black/60 px-2 py-0.5 rounded border border-amber-300 dark:border-brand-gold/30 font-mono">
                      {selectedPerson.alphaCode}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{selectedPerson.category} • {selectedPerson.membershipNumber}</span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1">{selectedPerson.fullName}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold">Gran Total Deuda</span>
                  <p className="text-xl font-black text-red-600 dark:text-red-400">Bs {Number(debtSheet?.totals?.grandTotal || 0).toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Debt Tables: 1. Deuda por Fechas vs 2. Deuda por Cuotas */}
            {debtSheet && (
              <div className="space-y-4">
                
                {/* 1. Deuda por Fechas */}
                <div className="glass-panel overflow-hidden border border-gray-200 dark:border-white/10 rounded-2xl space-y-2 p-4 bg-white/90 dark:bg-[#0d1311]/90 shadow-sm">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-amber-800 dark:text-brand-gold uppercase tracking-wider flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> 1. Deuda por Fechas (Cuotas Sociales & Servicios Ex)
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Imputación en Cascada (FIFO)</span>
                  </div>

                  {debtSheet.itemsFechas.length === 0 ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 py-2 font-semibold">✓ Al día en cuotas sociales y servicios extraordinarios.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {debtSheet.itemsFechas.map((item: any) => (
                        <div 
                          key={item.id}
                          onClick={() => toggleItem(item.id, item.balance, item.type)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${selectedItems[item.id]?.selected ? 'bg-amber-50 dark:bg-brand-gold/10 border-amber-400 dark:border-brand-gold/50' : 'bg-gray-50 dark:bg-black/40 border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20'}`}
                        >
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox"
                              checked={!!selectedItems[item.id]?.selected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded accent-brand-gold"
                            />
                            <div>
                              <p className="text-xs font-bold text-gray-900 dark:text-white">{item.concept}</p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400">Vence: {new Date(item.dueDate).toLocaleDateString()}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {item.details && item.details.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setViewingVetDetails(item); }}
                                className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 text-[10px] font-bold border border-blue-300 dark:border-blue-500/40 hover:bg-blue-200 dark:hover:bg-blue-500 transition-all"
                              >
                                Ver Nota Clínica ({item.clinicalNoteNumber})
                              </button>
                            )}
                            <p className="text-sm font-black text-gray-900 dark:text-white">Bs {item.balance.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Deuda por Cuotas (CDP) */}
                <div className="glass-panel overflow-hidden border border-gray-200 dark:border-white/10 rounded-2xl space-y-2 p-4 bg-white/90 dark:bg-[#0d1311]/90 shadow-sm">
                  <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4" /> 2. Deuda por Cuota (Cuota de Participación CDP 1/60)
                  </h4>

                  {debtSheet.itemsCuotas.length === 0 ? (
                    <p className="text-xs text-gray-500 py-2">Sin plan de pagos de cuotas CDP pendiente.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {debtSheet.itemsCuotas.map((item: any) => (
                        <div 
                          key={item.id}
                          onClick={() => toggleItem(item.id, item.balance, 'CDP_INSTALLMENT')}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${selectedItems[item.id]?.selected ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-400 dark:border-emerald-500/50' : 'bg-gray-50 dark:bg-black/40 border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20'}`}
                        >
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox"
                              checked={!!selectedItems[item.id]?.selected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded accent-emerald-500"
                            />
                            <div>
                              <p className="text-xs font-bold text-gray-900 dark:text-white">{item.concept}</p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                60% Factura: <span className="text-blue-600 dark:text-blue-400 font-semibold">Bs {item.incomeFeePart.toFixed(2)}</span> • 40% Recibo: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Bs {item.cdpPart.toFixed(2)}</span>
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-black text-gray-900 dark:text-white">Bs {item.balance.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

          {/* Right Column: Checkout & Dual Invoicing (1 col) */}
          <div className="space-y-4">
            
            <div className="glass-panel p-6 border-t-4 border-brand-gold bg-white/90 dark:bg-[#0d1311]/90 border border-gray-200 dark:border-white/10 shadow-sm space-y-4 sticky top-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-white serif-brand">
                Resumen de Cobro & Emisión
              </h3>

              {/* Dual Document Calculation Breakdown */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/60 border border-gray-200 dark:border-brand-gold/30 space-y-2 text-xs">
                <div className="flex justify-between text-blue-700 dark:text-blue-400 font-semibold">
                  <span>Monto Gravado (Factura):</span>
                  <span className="font-bold">Bs {estimatedInvoiced.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                  <span>Monto CDP (Recibo Oficial):</span>
                  <span className="font-bold">Bs {estimatedCdp.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-white/10 flex justify-between text-base font-bold text-gray-900 dark:text-white">
                  <span>Total a Cobrar:</span>
                  <span className="text-amber-800 dark:text-brand-gold font-mono font-black">Bs {totalToPay.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 uppercase font-semibold">Forma de Pago</label>
                <select 
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs outline-none font-medium"
                >
                  <option value="EFECTIVO">Efectivo (Bolivianos)</option>
                  <option value="TARJETA">Tarjeta de Débito / Crédito</option>
                  <option value="TRANSFERENCIA">Transferencia Bancaria QR</option>
                  <option value="DEBITO">Débito Automático Bancario</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              {/* Invoicing Info */}
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] text-gray-600 dark:text-gray-400 font-semibold">NIT / CI Facturación</label>
                  <input 
                    type="text"
                    value={fiscalNit}
                    onChange={e => setFiscalNit(e.target.value)}
                    className="w-full mt-1 p-2 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-600 dark:text-gray-400 font-semibold">Razón Social</label>
                  <input 
                    type="text"
                    value={fiscalRazonSocial}
                    onChange={e => setFiscalRazonSocial(e.target.value)}
                    className="w-full mt-1 p-2 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                  />
                </div>
              </div>

              <button 
                onClick={handleExecutePayment}
                disabled={processing || totalToPay <= 0}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-black font-black text-sm uppercase tracking-wider hover:scale-105 shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? 'Procesando Transacción...' : (
                  <>
                    <Receipt className="w-4 h-4" /> Emitir Factura + Recibo Oficial
                  </>
                )}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ARQUEO DIARIO TAB */}
      {activeTab === 'ARQUEO' && (
        <div className="glass-panel p-6 space-y-6 bg-white/90 dark:bg-[#0d1311]/90 border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white serif-brand">Arqueo Diario de Caja & Cierre de Turno</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Fecha: {new Date().toLocaleDateString()}</p>
            </div>
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 text-xs font-bold flex items-center gap-1.5 hover:bg-gray-200 dark:hover:bg-white/20 transition-all border border-gray-300 dark:border-white/10 shadow-sm"
            >
              <Printer className="w-4 h-4" /> Imprimir Arqueo
            </button>
          </div>

          {closingData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-brand-gold/30">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Total Recaudado Hoy</p>
                  <p className="text-2xl font-black text-amber-800 dark:text-brand-gold mt-1">Bs {Number(closingData.summary.totalRecaudado).toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-blue-500/30">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Total Facturado</p>
                  <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">Bs {Number(closingData.summary.totalFacturado).toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-emerald-500/30">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Total Recibos CDP</p>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">Bs {Number(closingData.summary.totalRecibosCDP).toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Transacciones</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{closingData.summary.count}</p>
                </div>
              </div>

              {/* Transactions Log */}
              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100/90 dark:bg-white/5 text-gray-700 dark:text-gray-400 uppercase text-[10px] font-black">
                    <tr>
                      <th className="p-3">Código Txn</th>
                      <th className="p-3">Socio</th>
                      <th className="p-3">Método</th>
                      <th className="p-3">Factura</th>
                      <th className="p-3">Recibo CDP</th>
                      <th className="p-3">Total (Bs)</th>
                      <th className="p-3 text-right">Asiento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                    {closingData.transactions.map((t: any) => (
                      <tr key={t.id} className="hover:bg-gray-100/60 dark:hover:bg-white/5">
                        <td className="p-3 font-mono font-bold text-amber-800 dark:text-brand-gold">{t.transactionCode}</td>
                        <td className="p-3 font-bold text-gray-900 dark:text-white">{t.person?.firstName} {t.person?.paternalSurname}</td>
                        <td className="p-3 font-semibold text-gray-800 dark:text-gray-200">{t.paymentMethod}</td>
                        <td className="p-3 text-blue-600 dark:text-blue-400 font-mono font-bold">{t.invoiceNumber || '-'}</td>
                        <td className="p-3 text-emerald-600 dark:text-emerald-400 font-mono font-bold">{t.receiptNumber || '-'}</td>
                        <td className="p-3 font-black text-gray-900 dark:text-white">Bs {Number(t.totalAmount).toFixed(2)}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setViewingAccountingEntry(t)}
                            className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[11px] font-bold inline-flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" /> Asiento
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: COMPLETED PAYMENT & DUAL INVOICE DISPLAY */}
      {completedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0d1311] border border-gray-300 dark:border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-center text-gray-900 dark:text-white">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-300 dark:border-emerald-500/40">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold serif-brand">
              ¡Comprobantes Emitidos Exitosamente!
            </h3>

            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/60 border border-gray-200 dark:border-white/10 space-y-3 text-left text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Código de Cobranza:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">{completedPayment.transactionCode}</span>
              </div>
              {completedPayment.invoiceNumber && (
                <div className="flex justify-between text-blue-700 dark:text-blue-400 font-semibold">
                  <span>Factura Computarizada:</span>
                  <span className="font-mono font-bold">{completedPayment.invoiceNumber} (Bs {Number(completedPayment.invoicedAmount).toFixed(2)})</span>
                </div>
              )}
              {completedPayment.receiptNumber && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                  <span>Recibo Oficial CDP:</span>
                  <span className="font-mono font-bold">{completedPayment.receiptNumber} (Bs {Number(completedPayment.cdpReceiptAmount).toFixed(2)})</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-white/10 font-bold text-gray-900 dark:text-white">
                <span>Total Cobrado:</span>
                <span className="text-amber-800 dark:text-brand-gold font-mono font-black">Bs {Number(completedPayment.totalAmount).toFixed(2)} ({completedPayment.paymentMethod})</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <button 
                onClick={() => setViewingAccountingEntry(completedPayment)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-500/20 transition-all"
              >
                <FileText className="w-4 h-4" /> Ver Asiento Contable
              </button>
              <button 
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 text-xs font-bold hover:bg-gray-200 dark:hover:bg-white/20 flex items-center gap-1.5 border border-gray-300 dark:border-white/10"
              >
                <Printer className="w-4 h-4" /> Imprimir Comprobantes
              </button>
              <button 
                onClick={() => setCompletedPayment(null)}
                className="px-5 py-2 rounded-xl bg-emerald-500 text-black text-xs font-extrabold hover:scale-105 transition-all"
              >
                Listo / Siguiente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASIENTO CONTABLE GENERADO (GUIA SOCIO PAG 15) */}
      {viewingAccountingEntry && (() => {
        const total = Number(viewingAccountingEntry.totalAmount || 0);
        const invoiced = Number(viewingAccountingEntry.invoicedAmount || 0);
        const cdp = Number(viewingAccountingEntry.cdpReceiptAmount || 0);

        // Accounting breakdown calculations
        const netRevenue = Number((invoiced * 0.87).toFixed(2));
        const ivaDebit = Number((invoiced * 0.13).toFixed(2));
        const itExpense = Number((invoiced * 0.03).toFixed(2));
        const itPayable = Number((invoiced * 0.03).toFixed(2));

        const totalDebit = Number((total + itExpense).toFixed(2));
        const totalCredit = Number((netRevenue + ivaDebit + cdp + itPayable).toFixed(2));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <div className="relative w-full max-w-2xl bg-white dark:bg-[#0d1311] border border-purple-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-gray-900 dark:text-white max-h-[90vh] overflow-y-auto">
              
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold serif-brand text-gray-900 dark:text-white">
                      Comprobante de Diario (Asiento Contable)
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Club Hípico Los Sargentos • Sistema Integrado de Contabilidad y Facturación
                    </p>
                  </div>
                </div>
                <button onClick={() => setViewingAccountingEntry(null)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Voucher Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px]">Nro. Asiento:</span>
                  <span className="font-mono font-bold text-purple-400">ASI-{viewingAccountingEntry.transactionCode?.replace(/[^0-9]/g, '').substring(0, 6) || '2026-01'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Fecha / Hora:</span>
                  <span className="font-bold text-gray-200">{new Date().toLocaleDateString('es-BO')}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Tipo Asiento:</span>
                  <span className="font-bold text-emerald-400">INGRESO DE CAJA</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Moneda:</span>
                  <span className="font-mono font-bold text-brand-gold">BOB (Bolivianos)</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/5 text-xs">
                <span className="text-gray-400 font-bold block text-[10px] uppercase">Glosa Contable:</span>
                <p className="text-gray-300 mt-0.5">
                  Cobro unificado en ventanilla por cuotas sociales / aportes patrimoniales del socio titular según comprobante {viewingAccountingEntry.transactionCode}.
                </p>
              </div>

              {/* Ledger Table */}
              <div className="border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 dark:bg-black/60 text-gray-500 uppercase font-bold text-[10px] border-b border-gray-200 dark:border-white/10">
                    <tr>
                      <th className="p-3">Código Cuenta</th>
                      <th className="p-3">Nombre de la Cuenta Contable</th>
                      <th className="p-3 text-right">Debe (Bs)</th>
                      <th className="p-3 text-right">Haber (Bs)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/5 font-mono">
                    {/* 1. Caja General */}
                    <tr className="hover:bg-white/5">
                      <td className="p-3 text-purple-400 font-bold">1.1.1.01.01</td>
                      <td className="p-3 font-sans text-gray-200">Caja Central Moneda Nacional</td>
                      <td className="p-3 text-right font-bold text-emerald-400">{total.toFixed(2)}</td>
                      <td className="p-3 text-right text-gray-500">0.00</td>
                    </tr>

                    {/* 2. IT Gasto */}
                    {invoiced > 0 && (
                      <tr className="hover:bg-white/5">
                        <td className="p-3 text-purple-400 font-bold">5.1.1.01.03</td>
                        <td className="p-3 font-sans text-gray-200">Impuesto a las Transacciones (3%)</td>
                        <td className="p-3 text-right font-bold text-emerald-400">{itExpense.toFixed(2)}</td>
                        <td className="p-3 text-right text-gray-500">0.00</td>
                      </tr>
                    )}

                    {/* 3. Ingreso Neto Cuotas */}
                    {invoiced > 0 && (
                      <tr className="hover:bg-white/5">
                        <td className="p-3 text-purple-400 font-bold">4.1.1.01.02</td>
                        <td className="p-3 font-sans text-gray-200">Ingresos Cuotas Sociales (87% Factura)</td>
                        <td className="p-3 text-right text-gray-500">0.00</td>
                        <td className="p-3 text-right font-bold text-blue-400">{netRevenue.toFixed(2)}</td>
                      </tr>
                    )}

                    {/* 4. Debito Fiscal IVA */}
                    {invoiced > 0 && (
                      <tr className="hover:bg-white/5">
                        <td className="p-3 text-purple-400 font-bold">2.1.2.01.01</td>
                        <td className="p-3 font-sans text-gray-200">Débito Fiscal IVA (13%)</td>
                        <td className="p-3 text-right text-gray-500">0.00</td>
                        <td className="p-3 text-right font-bold text-blue-400">{ivaDebit.toFixed(2)}</td>
                      </tr>
                    )}

                    {/* 5. Aportes Patrimoniales CDP */}
                    {cdp > 0 && (
                      <tr className="hover:bg-white/5">
                        <td className="p-3 text-purple-400 font-bold">2.1.1.01.05</td>
                        <td className="p-3 font-sans text-gray-200">Aportes Patrimoniales CDP (Recibo Oficial)</td>
                        <td className="p-3 text-right text-gray-500">0.00</td>
                        <td className="p-3 text-right font-bold text-brand-gold">{cdp.toFixed(2)}</td>
                      </tr>
                    )}

                    {/* 6. IT por Pagar */}
                    {invoiced > 0 && (
                      <tr className="hover:bg-white/5">
                        <td className="p-3 text-purple-400 font-bold">2.1.3.01.02</td>
                        <td className="p-3 font-sans text-gray-200">Impuesto a las Transacciones por Pagar (3%)</td>
                        <td className="p-3 text-right text-gray-500">0.00</td>
                        <td className="p-3 text-right font-bold text-rose-400">{itPayable.toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-100 dark:bg-black/80 font-mono font-bold text-xs border-t-2 border-purple-500/40">
                    <tr>
                      <td colSpan={2} className="p-3 font-sans text-gray-300 uppercase">SUMAS TOTALES BALANCEADAS:</td>
                      <td className="p-3 text-right text-emerald-400 font-black">Bs {totalDebit.toFixed(2)}</td>
                      <td className="p-3 text-right text-emerald-400 font-black">Bs {totalCredit.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-900 dark:text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Imprimir Asiento
                </button>
                <button
                  onClick={() => setViewingAccountingEntry(null)}
                  className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-extrabold hover:bg-purple-700"
                >
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL: VETERINARY CLINICAL NOTE BREAKDOWN */}
      {viewingVetDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0d1311] border border-gray-300 dark:border-blue-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-gray-900 dark:text-white">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold serif-brand">
                Desglose Clínico Médico Veterinario
              </h3>
              <button onClick={() => setViewingVetDetails(null)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Nota Clínica: <span className="font-mono font-bold text-gray-900 dark:text-white">{viewingVetDetails.clinicalNoteNumber}</span>
            </p>

            <div className="space-y-2">
              {viewingVetDetails.details?.map((d: any) => (
                <div key={d.id} className="p-3 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-xs flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{d.itemDescription}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-[10px]">Equino: {d.horseName} ({d.boxNumber}) • Cant: {d.quantity}</p>
                  </div>
                  <p className="font-bold text-amber-800 dark:text-brand-gold">Bs {Number(d.subtotal).toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setViewingVetDetails(null)}
                className="px-4 py-2 rounded-xl bg-brand-gold text-black text-xs font-bold"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
