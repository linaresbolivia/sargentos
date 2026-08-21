import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, User, ShieldCheck, DollarSign, Download, Eye, CheckCircle2, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';
import { memberAdminApi } from '../services/memberAdminApi';
import * as XLSX from 'xlsx';

interface Props {
  onOpenRegister: () => void;
  onSelectMember: (personId: string) => void;
  onOpenCashier: (personId: string) => void;
}

export const MemberDirectoryView: React.FC<Props> = ({ onOpenRegister, onSelectMember, onOpenCashier }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  useEffect(() => {
    loadMembers();
  }, [searchQuery, selectedCategory, selectedStatus]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const res = await memberAdminApi.searchMembers(searchQuery, selectedCategory, selectedStatus);
      setMembers(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    const exportData = members.map(m => ({
      'Código Alfa': m.alphaCode,
      'Nombres y Apellidos': m.fullName,
      'Documento': `${m.documentId} ${m.docExtension || ''}`,
      'Membresía': m.membership?.number || 'N/A',
      'Categoría': m.membership?.category || 'Sin Categoría',
      'Estado': m.status,
      'Semáforo Acceso': m.financial?.accessStatus,
      'Mora Devengada Real (Bs)': m.financial?.realMoraDevengada || 0,
      'Meses Impagos': m.financial?.unpaidSocialCount || 0,
      'Antigüedad (Años)': m.financial?.seniorityYears || 0,
      'Teléfono': m.phone || m.mobile || 'N/A',
      'Email': m.email || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Padrón_Socios_CHLS');
    XLSX.writeFile(wb, `Padron_Socios_CHLS_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // KPIs
  const totalCount = members.length;
  const verdeCount = members.filter(m => m.financial?.accessStatus === 'VERDE').length;
  const amarilloCount = members.filter(m => m.financial?.accessStatus === 'AMARILLO').length;
  const rojoCount = members.filter(m => m.financial?.accessStatus === 'ROJO').length;

  return (
    <div className="space-y-6">
      
      {/* Top Action Bar & KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 flex items-center gap-3 border-l-4 border-brand-gold bg-white/90 dark:bg-[#0d1311]/90 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-brand-gold/10 flex items-center justify-center text-amber-700 dark:text-brand-gold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Total Registrados</p>
            <p className="text-xl font-black text-gray-900 dark:text-white">{totalCount}</p>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-3 border-l-4 border-emerald-500 bg-white/90 dark:bg-[#0d1311]/90 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-emerald-800 dark:text-gray-400 uppercase font-bold tracking-wider">Al Día (Verde)</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{verdeCount}</p>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-3 border-l-4 border-amber-500 bg-white/90 dark:bg-[#0d1311]/90 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-amber-800 dark:text-gray-400 uppercase font-bold tracking-wider">Gracia (Amarillo)</p>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400">{amarilloCount}</p>
          </div>
        </div>

        <div className="glass-panel p-4 flex items-center gap-3 border-l-4 border-red-500 bg-white/90 dark:bg-[#0d1311]/90 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center text-red-600 dark:text-red-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-red-800 dark:text-gray-400 uppercase font-bold tracking-wider">Bloqueados Mora (Rojo)</p>
            <p className="text-xl font-black text-red-600 dark:text-red-400">{rojoCount}</p>
          </div>
        </div>
      </div>

      {/* Control Filters Bar */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 justify-between items-center bg-white/90 dark:bg-[#0d1311]/90 border border-gray-200 dark:border-white/10 shadow-sm">
        
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-gray-500 dark:text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Buscar por Alfa (DUR-MOR-G), CI, Nombre o Membresía..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 dark:bg-black/60 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs placeholder:text-gray-500 dark:placeholder:text-gray-500 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold outline-none transition-all"
          />
        </div>

        {/* Categories & Actions */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
          <select 
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-black/60 border border-gray-300 dark:border-white/10 text-xs text-gray-800 dark:text-gray-200 outline-none font-medium"
          >
            <option value="ALL">Todas las Categorías</option>
            <option value="FAM">Socio Familiar</option>
            <option value="IND">Socio Individual</option>
            <option value="HON">Socio Honorario</option>
            <option value="PRE">Pre-Asociado</option>
            <option value="TRN">Transitorio Nacional</option>
            <option value="DEP">Socio Deportivo</option>
          </select>

          <button 
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            title="Exportar Padrón a Excel"
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </button>

          <button 
            onClick={onOpenRegister}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-600 text-black font-extrabold text-xs flex items-center gap-1.5 hover:scale-105 shadow-md shadow-brand-gold/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Alta de Socio
          </button>
        </div>

      </div>

      {/* Main Members Table */}
      <div className="glass-panel overflow-hidden border border-gray-200 dark:border-white/10 rounded-2xl bg-white/90 dark:bg-[#0d1311]/90 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100/90 dark:bg-white/5 text-gray-700 dark:text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-200 dark:border-white/10 font-black">
              <tr>
                <th className="p-4">Socio & Código Alfa</th>
                <th className="p-4">Documento / CI</th>
                <th className="p-4">Membresía / Categoría</th>
                <th className="p-4">Familia / Activos</th>
                <th className="p-4">Mora Devengada Real</th>
                <th className="p-4">Semáforo Acceso</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-amber-700 dark:text-brand-gold font-bold animate-pulse">
                    Buscando en padrón de socios...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No se encontraron socios con los filtros actuales.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                    
                    {/* Socio Info */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-200 dark:bg-black/60 border border-gray-300 dark:border-brand-gold/30 shrink-0">
                          {m.photoUrl ? (
                            <img src={m.photoUrl} alt="Socio" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-amber-700 dark:text-brand-gold font-bold">
                              {m.firstName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-brand-gold transition-colors text-sm">
                            {m.fullName}
                          </p>
                          <span className="font-mono text-[10px] font-bold text-amber-800 dark:text-brand-gold bg-amber-50 dark:bg-black/40 px-1.5 py-0.5 rounded border border-amber-300 dark:border-brand-gold/30">
                            {m.alphaCode || 'SIN-CODIGO'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* CI */}
                    <td className="p-4">
                      <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{m.documentId} {m.docExtension}</span>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">{m.profession || 'Sin profesión'}</p>
                    </td>

                    {/* Membresía */}
                    <td className="p-4">
                      <p className="font-bold text-amber-700 dark:text-brand-gold">{m.membership?.number || 'Sin Título'}</p>
                      <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">{m.membership?.category || m.personType}</span>
                    </td>

                    {/* Familia / Activos */}
                    <td className="p-4">
                      <p className="text-gray-800 dark:text-gray-300 font-medium">👥 {m.membership?.beneficiariesCount || 0} familiares</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">🐎 {m.membership?.horsesCount || 0} equinos • 🚗 {m.membership?.vehiclesCount || 0} autos</p>
                    </td>

                    {/* Mora Real */}
                    <td className="p-4">
                      <p className={`font-black ${m.financial?.realMoraDevengada > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        Bs {Number(m.financial?.realMoraDevengada || 0).toFixed(2)}
                      </p>
                      {m.financial?.unpaidSocialCount > 0 && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{m.financial.unpaidSocialCount} cuotas impagas</p>
                      )}
                    </td>

                    {/* Semáforo */}
                    <td className="p-4">
                      {m.financial?.accessStatus === 'VERDE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Al Día
                        </span>
                      ) : m.financial?.accessStatus === 'AMARILLO' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Gracia (1 mes)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-100 dark:bg-red-500/15 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-500/40 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Bloqueo Mora
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          onClick={() => onSelectMember(m.id)}
                          className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-amber-100 dark:hover:bg-brand-gold/20 text-gray-700 dark:text-gray-300 hover:text-amber-800 dark:hover:text-brand-gold transition-colors border border-gray-200 dark:border-white/10 shadow-sm"
                          title="Ver Ficha 360°"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => onOpenCashier(m.id)}
                          className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 transition-colors border border-emerald-200 dark:border-emerald-500/30 shadow-sm"
                          title="Cobrar en Caja"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
