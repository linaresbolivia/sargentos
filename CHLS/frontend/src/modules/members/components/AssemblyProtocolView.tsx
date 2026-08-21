import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, Clock, DollarSign, Printer, Lock, UserCheck, ShieldAlert, Sparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { memberAdminApi } from '../services/memberAdminApi';

export const AssemblyProtocolView: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'TITULAR_PROPIETARIO' | 'INSTITUCIONAL'>('ALL');
  const [searchAttendee, setSearchAttendee] = useState('');
  
  // In-Situ Modal
  const [showInSituModal, setShowInSituModal] = useState(false);
  const [inSituPersonId, setInSituPersonId] = useState('');
  const [membersList, setMembersList] = useState<any[]>([]);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      setLoading(true);
      const res = await memberAdminApi.getAssemblySession();
      setSession(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFreezeCensus = async () => {
    if (!session) return;
    try {
      await memberAdminApi.freezeAssemblyCensus(session.id);
      toast.success('¡Padrón de asamblea congelado oficialmente (Corte 15:00 hrs)!');
      loadSession();
    } catch (err) {
      toast.error('Error al congelar padrón');
    }
  };

  const handleSignIn = async (attendeeId: string) => {
    try {
      await memberAdminApi.signAssemblyAttendance(attendeeId, 'MANUAL');
      toast.success('¡Asistencia y firma registrada! Quórum actualizado.');
      loadSession();
    } catch (err) {
      toast.error('Error al registrar firma');
    }
  };

  const openInSitu = async () => {
    try {
      const res = await memberAdminApi.searchMembers();
      setMembersList(res.data || []);
      setShowInSituModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInSituPayAndRegister = async () => {
    if (!inSituPersonId || !session) {
      toast.error('Selecciona un socio para cobrar e incorporar');
      return;
    }

    try {
      await memberAdminApi.registerAssemblyInSitu({
        sessionId: session.id,
        personId: inSituPersonId
      });
      toast.success('¡Socio regularizado in-situ e incorporado al Libro de Firmas!');
      setShowInSituModal(false);
      setInSituPersonId('');
      loadSession();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al incorporar socio in-situ');
    }
  };

  const attendees = (session?.attendees || []).filter((a: any) => {
    const matchCat = categoryFilter === 'ALL' || a.attendeeCategory === categoryFilter;
    const matchQ = !searchAttendee || a.fullName.toLowerCase().includes(searchAttendee.toLowerCase()) || a.membershipNumber.toLowerCase().includes(searchAttendee.toLowerCase());
    return matchCat && matchQ;
  });

  const totalEligible = (session?.totalEligiblePropietarios || 0) + (session?.totalEligibleInstitucionales || 0);

  return (
    <div className="space-y-6 text-gray-900 dark:text-white">
      
      {/* Header & Quorum Dashboard */}
      <div className="glass-panel p-6 border-l-4 border-brand-gold bg-white/90 dark:bg-[#0d1311]/90 border border-gray-200 dark:border-white/10 shadow-sm space-y-4 rounded-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 dark:bg-brand-gold/20 text-amber-800 dark:text-brand-gold border border-amber-300 dark:border-brand-gold/40">
                Protocolo Oficial
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Corte del Padrón: 15:00 hrs • Tolerancia Máx: 1 mes</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white serif-brand mt-1">
              {session?.title || 'Asamblea General Ordinaria de Socios'}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!session?.isCensusFrozen && (
              <button 
                onClick={handleFreezeCensus}
                className="px-4 py-2 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 text-xs font-bold hover:bg-amber-500 hover:text-black transition-all flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4" /> Congelar Padrón (15:00 hrs)
              </button>
            )}
            <button 
              onClick={openInSitu}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-black text-xs font-extrabold flex items-center gap-1.5 hover:scale-105 transition-all shadow-md shadow-emerald-500/20"
            >
              <DollarSign className="w-4 h-4" /> Habilitación In-Situ (Mesa Entrada)
            </button>
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 text-xs font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition-all flex items-center gap-1.5 border border-gray-300 dark:border-white/10"
            >
              <Printer className="w-4 h-4" /> Imprimir Legajos
            </button>
          </div>
        </div>

        {/* Quorum Metric Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-brand-gold/30 text-center">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Quórum en Tiempo Real</p>
            <p className="text-3xl font-black text-amber-800 dark:text-brand-gold font-mono mt-1">{session?.quorumPercentage || 0}%</p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{session?.quorumPercentage >= 50 ? '✓ Quórum Válido' : '⚠️ Pendiente Quórum'}</span>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-emerald-500/30 text-center">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Presentes y Firmados</p>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">{session?.totalPresent || 0}</p>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Socios en sala</span>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-blue-500/30 text-center">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Padrón Habilitado</p>
            <p className="text-3xl font-black text-blue-600 dark:text-blue-400 font-mono mt-1">{totalEligible}</p>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">{session?.totalEligiblePropietarios} Propietarios • {session?.totalEligibleInstitucionales} Institucionales</span>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-center">
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Estado del Padrón</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white mt-1.5">{session?.isCensusFrozen ? '🔒 Congelado (Oficial)' : '🟡 Abierto'}</p>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">Corte oficial a las 15:00</span>
          </div>
        </div>
      </div>

      {/* Filter and Signature Books */}
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${categoryFilter === 'ALL' ? 'bg-brand-gold text-black shadow-md' : 'bg-gray-100 dark:bg-black/40 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-white/5'}`}
          >
            Libro Completo ({attendees.length})
          </button>
          <button
            onClick={() => setCategoryFilter('TITULAR_PROPIETARIO')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${categoryFilter === 'TITULAR_PROPIETARIO' ? 'bg-brand-gold text-black shadow-md' : 'bg-gray-100 dark:bg-black/40 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-white/5'}`}
          >
            1. Titulares Propietarios ({session?.totalEligiblePropietarios || 0})
          </button>
          <button
            onClick={() => setCategoryFilter('INSTITUCIONAL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${categoryFilter === 'INSTITUCIONAL' ? 'bg-brand-gold text-black shadow-md' : 'bg-gray-100 dark:bg-black/40 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-white/5'}`}
          >
            2. Socios Institucionales ({session?.totalEligibleInstitucionales || 0})
          </button>
        </div>

        <input 
          type="text"
          placeholder="Buscar por Nombre o Membresía..."
          value={searchAttendee}
          onChange={e => setSearchAttendee(e.target.value)}
          className="p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs w-64 outline-none"
        />
      </div>

      {/* Signature Roll Table */}
      <div className="glass-panel overflow-hidden border border-gray-200 dark:border-white/10 rounded-2xl bg-white/90 dark:bg-[#0d1311]/90 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100/90 dark:bg-white/5 text-gray-700 dark:text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-200 dark:border-white/10 font-black">
              <tr>
                <th className="p-4">Nro</th>
                <th className="p-4">Socio Titular</th>
                <th className="p-4">Documento / CI</th>
                <th className="p-4">Membresía</th>
                <th className="p-4">Origen Registro</th>
                <th className="p-4">Estado Firma</th>
                <th className="p-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {attendees.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-500">No hay socios en esta sección del libro.</td></tr>
              ) : (
                attendees.map((a: any, idx: number) => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono font-bold text-gray-500 dark:text-gray-400">#{idx + 1}</td>
                    <td className="p-4 font-bold text-gray-900 dark:text-white text-sm">{a.fullName}</td>
                    <td className="p-4 font-mono text-gray-700 dark:text-gray-300">{a.documentId}</td>
                    <td className="p-4 font-bold text-amber-700 dark:text-brand-gold">{a.membershipNumber}</td>
                    <td className="p-4">
                      {a.registeredInSitu ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30">
                          In-Situ (Puerta)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                          Padrón 15:00
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {a.hasSigned ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 flex items-center gap-1 w-max">
                          <CheckCircle className="w-3.5 h-3.5" /> Presente / Firmado
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-500/30">
                          Pendiente Firma
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {!a.hasSigned && (
                        <button
                          onClick={() => handleSignIn(a.id)}
                          className="px-3 py-1.5 rounded-xl bg-brand-gold text-black text-xs font-bold hover:scale-105 transition-all shadow-md shadow-brand-gold/20"
                        >
                          Firmar Asistencia
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* IN-SITU EXPRESS PAYMENT & REGISTRATION MODAL */}
      {showInSituModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-white dark:bg-[#0d1311] border border-gray-300 dark:border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-gray-900 dark:text-white">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold serif-brand">
                Habilitación Express In-Situ en Mesa de Entrada
              </h3>
              <button onClick={() => setShowInSituModal(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Si un socio moroso llega a la asamblea y liquida su deuda pendiente, se incorpora inmediatamente al pie del Libro de Firmas y suma al quórum.
            </p>

            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 font-semibold">Seleccionar Socio en Puerta</label>
              <select
                value={inSituPersonId}
                onChange={e => setInSituPersonId(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/60 border border-gray-300 dark:border-emerald-500/30 text-gray-900 dark:text-white text-xs outline-none"
              >
                <option value="">-- Seleccionar Socio --</option>
                {membersList.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.membership?.number} - Deuda: Bs {m.financial?.realMoraDevengada || 0})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-white/10">
              <button 
                onClick={() => setShowInSituModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button 
                onClick={handleInSituPayAndRegister}
                className="px-5 py-2 rounded-xl bg-emerald-500 text-black text-xs font-extrabold hover:scale-105 transition-all shadow-md shadow-emerald-500/20"
              >
                Cobrar & Incorporar a Quórum
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
