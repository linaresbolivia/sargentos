import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, ShieldAlert, User, Users, Calendar, DollarSign, Activity, FileText, CheckCircle2, AlertTriangle, Car, QrCode } from 'lucide-react';
import { memberAdminApi } from '../services/memberAdminApi';

interface Props {
  personId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenCashier?: (personId: string) => void;
}

export const MemberProfileDrawer: React.FC<Props> = ({ personId, isOpen, onClose, onOpenCashier }) => {
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'PATRIMONIO' | 'FAMILIA' | 'SERVICIOS' | 'CUENTA' | 'HISTORIAL'>('PATRIMONIO');

  useEffect(() => {
    if (personId && isOpen) {
      loadDetail();
    }
  }, [personId, isOpen]);

  const loadDetail = async () => {
    if (!personId) return;
    try {
      setLoading(true);
      const res = await memberAdminApi.getMemberDetail(personId);
      setMember(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !personId) return null;

  const membership = member?.titularMemberships?.[0];
  const plan = membership?.plans?.[0];
  const installments = plan?.installments || [];
  const paidCount = installments.filter((i: any) => i.status === 'PAGADO').length;
  const totalInstallments = installments.length || 60;
  const progressPercent = totalInstallments > 0 ? Math.round((paidCount / totalInstallments) * 100) : 0;

  // Seniority
  const admission = member?.depositVoucherDate || membership?.admissionDate || member?.createdAt;
  const seniorityYears = admission ? Math.floor((new Date().getTime() - new Date(admission).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0a100d] border-l border-gray-200 dark:border-brand-gold/30 h-full flex flex-col shadow-2xl overflow-hidden animate-slide-in text-gray-900 dark:text-white">
        
        {/* Top Header Profile Card */}
        <div className="p-6 border-b border-gray-200 dark:border-brand-gold/20 bg-gradient-to-br from-amber-500/10 via-white to-gray-50 dark:from-brand-gold/15 dark:via-[#0d1512] dark:to-[#0a100d] relative shadow-sm">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>

          {loading || !member ? (
            <div className="flex items-center justify-center py-8 text-amber-700 dark:text-brand-gold font-bold animate-pulse">Cargando Ficha 360°...</div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-2xl border-2 border-amber-300 dark:border-brand-gold/40 overflow-hidden bg-gray-200 dark:bg-black/60 shadow-md shrink-0">
                {member.photoUrl ? (
                  <img src={member.photoUrl} alt="Socio" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-amber-700 dark:text-brand-gold font-bold text-2xl">
                    {member.firstName?.charAt(0)}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-brand-gold/20 text-amber-800 dark:text-brand-gold border border-amber-300 dark:border-brand-gold/40">
                    {membership?.type?.name || member.personType}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    member.status === 'ACTIVO'
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                      : 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30'
                  }`}>
                    {member.status === 'ACTIVO' ? '🟢 Activo' : '🔴 Inactivo'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-gray-100 dark:bg-black/60 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-white/10">
                    {member.alphaCode}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                    {seniorityYears} años antigüedad
                  </span>
                </div>

                <h2 className="text-xl font-bold text-gray-900 dark:text-white serif-brand mt-1 truncate">
                  {member.paternalSurname} {member.maternalSurname || ''} {member.firstName} {member.secondName || ''}
                </h2>
                
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  CI: <span className="text-gray-900 dark:text-white font-mono font-bold">{member.documentId} {member.docExtension}</span> • Membresía: <span className="text-amber-800 dark:text-brand-gold font-black">#{membership?.membershipNumber}</span>
                </p>

                {(member.company || member.profession || member.occupation) && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    {member.profession && <span>{member.profession}</span>}
                    {member.occupation && <span> • {member.occupation}</span>}
                    {member.company && <span className="text-amber-700 dark:text-brand-gold font-semibold"> • {member.company}</span>}
                  </p>
                )}

                {onOpenCashier && (
                  <div className="mt-3 flex gap-2">
                    <button 
                      onClick={() => onOpenCashier(member.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-600 text-black text-xs font-black hover:scale-105 transition-all shadow-md shadow-brand-gold/20 flex items-center gap-1.5"
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Cobrar en Caja
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-5 p-2 border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-black/40 text-[11px] font-bold text-center">
          <button onClick={() => setActiveTab('PATRIMONIO')} className={`py-2 rounded-xl transition-all ${activeTab === 'PATRIMONIO' ? 'bg-amber-100 dark:bg-brand-gold/20 text-amber-800 dark:text-brand-gold font-bold border border-amber-300 dark:border-brand-gold/30 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
            CDP Título
          </button>
          <button onClick={() => setActiveTab('FAMILIA')} className={`py-2 rounded-xl transition-all ${activeTab === 'FAMILIA' ? 'bg-amber-100 dark:bg-brand-gold/20 text-amber-800 dark:text-brand-gold font-bold border border-amber-300 dark:border-brand-gold/30 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
            Familia ({membership?.beneficiaries?.length || 0})
          </button>
          <button onClick={() => setActiveTab('SERVICIOS')} className={`py-2 rounded-xl transition-all ${activeTab === 'SERVICIOS' ? 'bg-amber-100 dark:bg-brand-gold/20 text-amber-800 dark:text-brand-gold font-bold border border-amber-300 dark:border-brand-gold/30 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
            Boxes / Activos
          </button>
          <button onClick={() => setActiveTab('CUENTA')} className={`py-2 rounded-xl transition-all ${activeTab === 'CUENTA' ? 'bg-amber-100 dark:bg-brand-gold/20 text-amber-800 dark:text-brand-gold font-bold border border-amber-300 dark:border-brand-gold/30 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
            Estado Cuenta
          </button>
          <button onClick={() => setActiveTab('HISTORIAL')} className={`py-2 rounded-xl transition-all ${activeTab === 'HISTORIAL' ? 'bg-amber-100 dark:bg-brand-gold/20 text-amber-800 dark:text-brand-gold font-bold border border-amber-300 dark:border-brand-gold/30 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
            Historial
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          
          {/* TAB 1: PATRIMONIO & PLAN CDP */}
          {activeTab === 'PATRIMONIO' && (
            <div className="space-y-4">
              {plan ? (
                <>
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-brand-gold/30 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 dark:text-gray-400 font-semibold">Progreso de Amortización CDP</span>
                      <span className="text-xs font-bold text-amber-800 dark:text-brand-gold">{paidCount} de {totalInstallments} cuotas ({progressPercent}%)</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-3 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden p-0.5 border border-gray-300 dark:border-white/5">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-yellow-500 via-brand-gold to-emerald-500 transition-all duration-700"
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200 dark:border-white/5 text-center">
                      <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Valor Total</p>
                        <p className="text-sm font-black text-gray-900 dark:text-white">Bs {Number(plan.totalAmount).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">60% Ingreso (Factura)</p>
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">Bs {Number(plan.incomeFeeAmount).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">40% CDP (Recibo)</p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Bs {Number(plan.cdpAmount).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Installments Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-amber-800 dark:text-brand-gold uppercase tracking-wider">Cronograma de Cuotas (Amortización)</h4>
                    <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/40">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-100/90 dark:bg-white/5 text-gray-700 dark:text-gray-400 sticky top-0 font-bold border-b border-gray-200 dark:border-white/10">
                          <tr>
                            <th className="p-2.5">Cuota</th>
                            <th className="p-2.5">Vencimiento</th>
                            <th className="p-2.5">60% Factura</th>
                            <th className="p-2.5">40% Recibo</th>
                            <th className="p-2.5">Total</th>
                            <th className="p-2.5">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                          {installments.slice(0, 20).map((inst: any) => (
                            <tr key={inst.id} className="hover:bg-gray-100/60 dark:hover:bg-white/5">
                              <td className="p-2.5 font-bold text-gray-900 dark:text-white">#{inst.installmentNumber}</td>
                              <td className="p-2.5 text-gray-500 dark:text-gray-400">{new Date(inst.dueDate).toLocaleDateString()}</td>
                              <td className="p-2.5 text-blue-600 dark:text-blue-400 font-semibold">Bs {Number(inst.incomeFeePart).toFixed(2)}</td>
                              <td className="p-2.5 text-emerald-600 dark:text-emerald-400 font-semibold">Bs {Number(inst.cdpPart).toFixed(2)}</td>
                              <td className="p-2.5 font-bold text-gray-900 dark:text-white">Bs {Number(inst.totalInstallment).toFixed(2)}</td>
                              <td className="p-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${inst.status === 'PAGADO' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30' : 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-500/30'}`}>
                                  {inst.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-gray-500 text-xs">No hay un plan de pagos formulado aún.</div>
              )}
            </div>
          )}

          {/* TAB 2: FAMILIA */}
          {activeTab === 'FAMILIA' && (
            <div className="space-y-3">
              {membership?.beneficiaries?.map((b: any) => {
                const bPerson = b.person;
                const birth = b.birthDate ? new Date(b.birthDate) : null;
                const age = birth ? Math.floor((new Date().getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null;

                return (
                  <div key={b.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 flex items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 dark:bg-black/60 border border-gray-300 dark:border-brand-gold/30 shrink-0">
                        {b.photoUrl || bPerson.photoUrl ? (
                          <img src={b.photoUrl || bPerson.photoUrl} alt="Familiar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 m-3 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          {bPerson.firstName} {bPerson.paternalSurname} {bPerson.marriedSurname || ''}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {b.relationship} • {age !== null ? `${age} años` : 'Sin fecha'}
                        </p>
                      </div>
                    </div>

                    <div>
                      {b.status === 'BLOQUEADO_EDAD' || (age && age >= 25) ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-500/30">
                          Bloqueado (&gt;25 años)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                          Habilitado
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: SERVICIOS & ACTIVOS */}
          {activeTab === 'SERVICIOS' && (
            <div className="space-y-4">
              {/* Horses */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-emerald-500/30 space-y-3 shadow-sm">
                <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Boxes Hípicos Asignados (195 Bs/mes)
                </h4>
                {membership?.horses?.length > 0 ? (
                  membership.horses.map((h: any) => (
                    <div key={h.id} className="p-3 rounded-xl bg-white dark:bg-black/60 border border-gray-200 dark:border-white/5 text-xs space-y-1 shadow-sm">
                      <div className="flex justify-between font-bold text-gray-900 dark:text-white">
                        <span>🐎 {h.name}</span>
                        <span className="text-amber-800 dark:text-brand-gold">{h.assignedBox || 'Sin box asignado'}</span>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400">Veterinario: <span className="text-gray-800 dark:text-gray-200">{h.veterinarian || 'N/A'}</span></p>
                      <p className="text-gray-500 dark:text-gray-400">Dieta: <span className="text-gray-800 dark:text-gray-200">{h.feedingDiet || 'Estándar'}</span></p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500">Sin caballos registrados.</p>
                )}
              </div>

              {/* Vehicles */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-blue-500/30 space-y-3 shadow-sm">
                <h4 className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <Car className="w-4 h-4" /> Vehículos Autorizados para Garita
                </h4>
                {membership?.vehicles?.map((v: any) => (
                  <div key={v.id} className="p-3 rounded-xl bg-white dark:bg-black/60 border border-gray-200 dark:border-white/5 text-xs flex justify-between shadow-sm">
                    <span className="font-mono font-bold text-gray-900 dark:text-white">{v.plate}</span>
                    <span className="text-gray-600 dark:text-gray-400">{v.brand} {v.model} ({v.color})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: ESTADO DE CUENTA & CTA CTE */}
          {activeTab === 'CUENTA' && (
            <div className="space-y-4">
              {/* Cuenta Corriente Config (Pág 12 - Guía Socio) */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-brand-gold/30 text-xs space-y-2">
                <h5 className="font-bold text-amber-800 dark:text-brand-gold uppercase tracking-wider">
                  Cuenta Corriente & Crédito (Cta Cte)
                </h5>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Límite de Crédito:</span>
                    <p className="font-mono font-black text-gray-900 dark:text-white">Bs 35,000.00 ($us 5,000)</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Débito Automático Bancario:</span>
                    <p className="font-bold text-emerald-700 dark:text-emerald-400">✓ Habilitado (Banco BISA)</p>
                  </div>
                </div>
              </div>

              {/* Restricted Services Box (Pág 12 - Guía Socio) */}
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-xs space-y-1.5">
                <h5 className="font-bold text-red-700 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" /> Servicios Restringidos / Vetados
                </h5>
                <p className="text-[11px] text-gray-600 dark:text-gray-400">
                  El socio y sus dependientes no tienen restricciones activas. Acceso habilitado a todos los servicios e instalaciones.
                </p>
              </div>

              <h4 className="text-xs font-bold text-amber-800 dark:text-brand-gold uppercase tracking-wider">Deudas Pendientes por Fechas</h4>
              <div className="space-y-2">
                {member?.socialFeeAccruals?.map((acc: any) => (
                  <div key={acc.id} className="p-3 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 flex justify-between items-center text-xs shadow-sm">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">Cuota Social - {acc.periodLabel}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-[11px]">Vence: {new Date(acc.dueDate).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-gray-900 dark:text-white">Bs {Number(acc.residualBalance || acc.baseAmount).toFixed(2)}</p>
                      <span className={`text-[9px] font-black uppercase ${acc.status === 'PAGADO' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>{acc.status}</span>
                    </div>
                  </div>
                ))}

                {member?.extraordinaryCharges?.map((chg: any) => (
                  <div key={chg.id} className="p-3 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 flex justify-between items-center text-xs shadow-sm">
                    <div>
                      <p className="font-bold text-emerald-700 dark:text-emerald-400">{chg.serviceName}</p>
                      {chg.clinicalNoteNumber && <p className="text-gray-500 dark:text-gray-400 text-[11px]">Nota Clínica: {chg.clinicalNoteNumber}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-black text-gray-900 dark:text-white">Bs {Number(chg.residualBalance || chg.amount).toFixed(2)}</p>
                      <span className={`text-[9px] font-black uppercase ${chg.status === 'PAGADO' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>{chg.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: HISTORIAL */}
          {activeTab === 'HISTORIAL' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-amber-800 dark:text-brand-gold uppercase tracking-wider">Últimos Accesos al Club</h4>
              {member?.accessLogs?.map((log: any) => (
                <div key={log.id} className="p-3 rounded-xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-xs flex justify-between items-center shadow-sm">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{log.gate} ({log.method})</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${log.status === 'GRANTED' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30' : 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-500/30'}`}>
                    {log.status === 'GRANTED' ? 'Permitido' : 'Denegado'}
                  </span>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
