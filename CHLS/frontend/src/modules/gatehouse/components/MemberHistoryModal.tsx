import React, { useState, useEffect } from 'react';
import { api } from '@config/api';
import { Search, X, Loader2, Clock, Car, XCircle, UserPlus } from 'lucide-react';
import { RegisterGuestModal } from './RegisterGuestModal';

interface MemberHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MemberHistoryModal: React.FC<MemberHistoryModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasFiltered, setHasFiltered] = useState(false);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedMember(null);
      setLogs([]);
      setStartDate('');
      setEndDate('');
      setHasFiltered(false);
    }
  }, [isOpen]);

  const fetchGlobalLogs = async (start = startDate, end = endDate) => {
    try {
      setLoadingLogs(true);
      let url = `/access/logs/recent?limit=100`;
      if (start) url += `&startDate=${start}`;
      if (end) url += `&endDate=${end}`;
      const response = await api.get(url);
      if (response.data.success) {
        setLogs(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching global logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.length < 3) {
      setSearchResults([]);
      return;
    }
    try {
      setLoadingSearch(true);
      const response = await api.get(`/access/search?q=${val}`);
      if (response.data.success) {
        setSearchResults(response.data.data);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault();
      fetchLogsForMember(searchResults[0]);
    }
  };

  const fetchLogsForMember = async (member: any, start = startDate, end = endDate) => {
    setSelectedMember(member);
    setSearchQuery(member.fullName);
    setSearchResults([]);
    setLoadingLogs(true);
    try {
      let url = `/access/logs/recent?personId=${member.personId}&limit=50`;
      if (start) url += `&startDate=${start}`;
      if (end) url += `&endDate=${end}`;
      const response = await api.get(url);
      if (response.data.success) {
        setLogs(response.data.data);
        setHasFiltered(true);
      }
    } catch (error) {
      console.error('Error fetching member logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#050806] w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-gray-200 dark:border-brand-gold/20 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-black/20">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reporte de Accesos por Socio</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Control Bar: Filters & Search */}
          <div className="p-6 pb-2 relative z-20">
            <div className="flex flex-col gap-4 bg-gray-50 dark:bg-black/20 p-6 rounded-3xl border border-gray-200 dark:border-brand-gold/20 max-w-3xl mx-auto shadow-sm">
              
              {/* Date Filters Column */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Filtrar por Rango de Fechas</label>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <input 
                    type="date" 
                    className="w-full sm:w-48 bg-white dark:bg-black/40 border border-gray-200 dark:border-brand-gold/20 text-gray-900 dark:text-white text-sm rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand-gold transition-colors text-center dark:[color-scheme:dark]"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <span className="text-gray-400 text-sm font-bold">a</span>
                  <input 
                    type="date" 
                    className="w-full sm:w-48 bg-white dark:bg-black/40 border border-gray-200 dark:border-brand-gold/20 text-gray-900 dark:text-white text-sm rounded-xl px-4 py-3.5 focus:outline-none focus:border-brand-gold transition-colors text-center dark:[color-scheme:dark]"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                  <button 
                    onClick={() => {
                      setHasFiltered(true);
                      if (selectedMember && searchQuery.trim() !== '') {
                        fetchLogsForMember(selectedMember, startDate, endDate);
                      } else {
                        setSelectedMember(null);
                        setSearchQuery('');
                        fetchGlobalLogs(startDate, endDate);
                      }
                    }}
                    className="w-full sm:w-auto bg-brand-gold text-white hover:bg-[#b8860b] shadow-lg shadow-brand-gold/20 transition-all px-8 py-3.5 rounded-xl text-sm font-bold"
                  >
                    Generar
                  </button>
                </div>
              </div>

              {/* Separator */}
              <div className="flex items-center gap-4 py-1">
                <div className="h-px bg-gray-200 dark:bg-brand-gold/20 flex-1"></div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">O</span>
                <div className="h-px bg-gray-200 dark:bg-brand-gold/20 flex-1"></div>
              </div>

              {/* Search Bar Column */}
              <div className="flex flex-col gap-2 relative">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Búsqueda de Socio Específico</label>
                <div className="relative max-w-xl mx-auto w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gold" />
                  <input
                    type="text"
                    placeholder="Buscar socio por nombre, CI o placa..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-brand-gold/20 rounded-xl py-3.5 pl-12 pr-4 text-gray-900 dark:text-white focus:outline-none focus:border-brand-gold transition-colors"
                  />
                  {loadingSearch && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-5 h-5 text-brand-gold animate-spin" />
                    </div>
                  )}
                </div>

                {/* Search Dropdown */}
                {searchResults.length > 0 && !selectedMember && (
                  <div className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-full max-w-xl bg-white dark:bg-[#0d2116] rounded-2xl shadow-[0_10px_30px_rgba(204,161,75,0.1)] border border-gray-200 dark:border-brand-gold/20 overflow-hidden z-50">
                    {searchResults.map(member => (
                      <div 
                        key={member.personId}
                        onClick={() => fetchLogsForMember(member)}
                        className="p-4 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer flex items-center gap-4 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full border border-brand-gold/50 shadow-[0_0_8px_rgba(204,161,75,0.4)] bg-gradient-to-br from-[#dfc285] via-[#cca14b] to-[#b08b26] flex items-center justify-center overflow-hidden shrink-0">
                          {member.photoUrl ? (
                            <img src={member.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[#0a1d13] font-bold drop-shadow-sm">{member.fullName.charAt(0)}</span>
                          )}
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="text-gray-900 dark:text-white font-bold truncate">{member.fullName}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">CI: {member.documentId} | Lote: {member.membershipNumber}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Member Info & Timeline */}
          {selectedMember ? (
            <div className="flex-1 overflow-y-auto p-6 pt-4 flex flex-col lg:flex-row gap-8">
              {/* Profile Card Sidebar */}
              <div className="w-full lg:w-1/3 shrink-0">
                <div className="bg-gray-50 dark:bg-[#0d2116] rounded-2xl p-6 border border-gray-200 dark:border-brand-gold/20 shadow-xl dark:shadow-[0_4px_20px_rgba(204,161,75,0.05)] flex flex-col items-center text-center sticky top-0">
                  <div className="w-24 h-24 rounded-full mb-4 overflow-hidden border-2 border-brand-gold/50 shadow-[0_0_15px_rgba(204,161,75,0.4)] bg-gradient-to-br from-[#dfc285] via-[#cca14b] to-[#b08b26] flex items-center justify-center">
                    {selectedMember.photoUrl ? (
                      <img src={selectedMember.photoUrl} alt="Socio" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-bold text-[#0a1d13] drop-shadow-md">{selectedMember.fullName.charAt(0)}</span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{selectedMember.fullName}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">CI/ID: {selectedMember.documentId}</p>
                  
                  <div className="w-full bg-white dark:bg-black/20 rounded-xl p-4 text-left border border-gray-100 dark:border-white/5">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-1">MEMBRESÍA</p>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedMember.membershipNumber} ({selectedMember.membershipType})</p>
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-1 mt-3">ESTADO</p>
                    <p className={`text-sm font-bold ${selectedMember.status === 'GRANTED' ? 'text-green-600 dark:text-[#cca14b]' : 'text-red-500'}`}>
                      {selectedMember.status === 'GRANTED' ? 'AL DÍA' : 'DENEGADO'}
                    </p>
                  </div>

                  <button 
                    onClick={() => setIsGuestModalOpen(true)}
                    className="w-full mt-4 bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold transition-colors py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-brand-gold/30"
                  >
                    <UserPlus className="w-4 h-4" />
                    Registrar Invitado
                  </button>

                  <button 
                    onClick={() => { setSelectedMember(null); setSearchQuery(''); fetchGlobalLogs(startDate, endDate); }}
                    className="mt-4 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
                  >
                    ← Volver al reporte global
                  </button>
                </div>
              </div>

              {/* Timeline area */}
              <div className="flex-1 relative">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 sticky top-0 bg-white/90 dark:bg-[#050806]/90 backdrop-blur-md py-2 z-10 border-b border-gray-100 dark:border-brand-gold/20">
                  Historial del Socio
                </h3>
                
                {loadingLogs ? (
                  <div className="flex flex-col items-center justify-center py-20 text-brand-gold">
                    <Loader2 className="w-8 h-8 animate-spin mb-4" />
                    <p>Cargando historial...</p>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
                    <Clock className="w-12 h-12 mb-4 opacity-20" />
                    <p>No hay registros recientes para este socio.</p>
                  </div>
                ) : (
                  <div className="relative pl-6 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-[2px] before:bg-gradient-to-b before:from-brand-gold/50 before:to-transparent">
                    {logs.map((log, idx) => (
                      <div key={log.id} className={`relative mb-8 ${idx > 0 ? 'animate-in fade-in slide-in-from-right-4' : ''}`} style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}>
                        {/* Timeline Node */}
                        <div className={`absolute -left-[30px] w-4 h-4 rounded-full border-2 border-white dark:border-[#141816] ${log.actionType === 'ENTRY' ? (log.isGuest ? 'bg-slate-400' : 'bg-brand-gold') : 'bg-orange-500'}`}></div>

                        <div className={`bg-gray-50 dark:bg-[#0d2116] rounded-xl p-4 border border-gray-100 ${log.isGuest ? 'dark:border-slate-500/20 hover:border-slate-500/40' : 'dark:border-brand-gold/20 hover:border-brand-gold/40'} shadow-sm hover:shadow-lg transition-all`}>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                                log.actionType === 'ENTRY' 
                                  ? 'bg-[#133825]/10 text-[#133825] dark:bg-[#cca14b]/20 dark:text-[#cca14b]' 
                                  : 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                              }`}>
                                {log.actionType === 'ENTRY' ? 'INGRESO' : 'SALIDA'}
                              </span>
                              {log.status === 'DENIED' && (
                                <span className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 px-2 py-0.5 rounded text-[10px] font-bold">
                                  DENEGADO
                                </span>
                              )}
                              {log.personType && log.personType !== 'SOCIO' && (
                                <span className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                                  {log.personType === 'GUEST' ? 'INVITADO' : log.personType === 'RECIPROCITY' ? 'SOCIO RECIPROCIDAD' : 'EXTERNO'}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 font-medium bg-white dark:bg-black/30 px-2 py-1 rounded-md">
                              <Clock className="w-3 h-3 text-brand-gold" />
                              {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          
                          {log.isGuest && log.hostName && (
                            <div className="mb-2 text-[11px] text-gray-500 dark:text-gray-400">
                              Invitado de: <span className="font-bold text-gray-700 dark:text-gray-300">{log.hostName}</span>
                            </div>
                          )}

                          {(log.vehiclePlate || log.observation) && (
                            <div className="mt-3 flex flex-wrap gap-3">
                              {log.vehiclePlate && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-white/5 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-white/10">
                                  <Car className="w-3.5 h-3.5 text-brand-gold" />
                                  <span className="font-bold">{log.vehiclePlate}</span>
                                </div>
                              )}
                              {log.observation && (
                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-white/5 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 italic">
                                  {log.observation.includes('Invitado') && <UserPlus className="w-3 h-3 mr-1 text-brand-gold" />}
                                  {log.observation}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {log.status === 'DENIED' && log.reason && (
                            <div className="mt-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg border border-red-100 dark:border-red-500/20 flex items-start gap-2">
                              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>{log.reason}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Global Empty/Logs State when NO member is selected */
            <div className="flex-1 overflow-y-auto p-6 pt-0">
               {loadingLogs ? (
                  <div className="flex flex-col items-center justify-center py-32 text-brand-gold">
                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                    <p className="font-bold">Generando reporte...</p>
                  </div>
                ) : !hasFiltered ? (
                  <div className="flex flex-col items-center justify-center py-32 text-gray-500 dark:text-gray-400 animate-in zoom-in-95 duration-300">
                    <div className="w-24 h-24 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-inner border border-gray-100 dark:border-white/10">
                      <Search className="w-10 h-10 text-brand-gold/60" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Genere un Reporte</h3>
                    <p className="max-w-md text-center text-sm leading-relaxed">
                      Seleccione un rango de fechas y presione <span className="font-bold text-brand-gold">Generar</span> para ver los accesos globales de ese período, o busque directamente a un socio específico.
                    </p>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
                    <Search className="w-16 h-16 mb-4 opacity-20 text-brand-gold" />
                    <h3 className="text-xl font-bold mb-2">No hay accesos</h3>
                    <p className="max-w-md text-center text-sm">
                      No se encontraron registros en este rango de fechas. Pruebe seleccionando un rango diferente o busque un socio en particular.
                    </p>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto mt-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-100 dark:border-brand-gold/20 pb-2">
                      Reporte Global de Accesos
                    </h3>
                    
                    {(() => {
                      const grouped: any[] = [];
                      const pendingExits = new Map<string, any[]>();
                      
                      logs.forEach(log => {
                        const personId = log.personId;
                        if (log.actionType === 'EXIT') {
                          if (!pendingExits.has(personId)) pendingExits.set(personId, []);
                          pendingExits.get(personId)!.push(log);
                        } else if (log.actionType === 'ENTRY') {
                          const exits = pendingExits.get(personId) || [];
                          const exitLog = exits.length > 0 ? exits.shift() : null;
                          grouped.push({
                            id: log.id,
                            personName: log.fullName,
                            photoUrl: log.photoUrl || null,
                            isGuest: log.isGuest,
                            hostName: log.hostName,
                            personType: log.personType,
                            entryLog: log,
                            exitLog: exitLog
                          });
                        }
                      });
                      
                      pendingExits.forEach((exits) => {
                        exits.forEach(exitLog => {
                          grouped.push({
                            id: exitLog.id,
                            personName: exitLog.fullName,
                            photoUrl: exitLog.photoUrl || null,
                            isGuest: exitLog.isGuest,
                            hostName: exitLog.hostName,
                            personType: exitLog.personType,
                            entryLog: null,
                            exitLog: exitLog
                          });
                        });
                      });
                      
                      grouped.sort((a, b) => {
                        const timeA = new Date((a.exitLog || a.entryLog).timestamp).getTime();
                        const timeB = new Date((b.exitLog || b.entryLog).timestamp).getTime();
                        return timeB - timeA;
                      });
                      
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {grouped.map((group) => (
                        <div key={group.id} className={`bg-gray-50 dark:bg-[#0d2116] rounded-xl p-4 border border-gray-100 ${group.isGuest ? 'dark:border-slate-500/20 hover:border-slate-500/40' : 'dark:border-brand-gold/20 hover:border-brand-gold/40'} shadow-sm hover:shadow-lg transition-all flex flex-col gap-3`}>
                          {/* Header: Person Info */}
                          <div className="flex items-center gap-3 border-b border-gray-100 dark:border-white/5 pb-3">
                            <div className="w-10 h-10 rounded-full border border-brand-gold/30 overflow-hidden shrink-0">
                              {group.photoUrl ? (
                                <img src={group.photoUrl} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-brand-gold/20 flex items-center justify-center text-brand-gold font-bold">
                                  {group.personName?.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-gray-900 dark:text-white text-sm">
                                {group.personName}
                                {group.personType && group.personType !== 'SOCIO' && (
                                  <span className="ml-2 bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                    {group.personType === 'GUEST' ? 'INVITADO' : group.personType === 'RECIPROCITY' ? 'SOCIO RECIPROCIDAD' : 'EXTERNO'}
                                  </span>
                                )}
                              </p>
                              {group.isGuest && group.hostName && (
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                  Titular: {group.hostName}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Body: Logs paired */}
                          <div className="flex flex-col gap-2">
                            {group.entryLog ? (
                              <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-brand-gold"></span>
                                  <span className="text-gray-600 dark:text-gray-300 text-xs">INGRESO:</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {new Date(group.entryLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {group.entryLog.vehiclePlate ? (
                                    <span className="text-[10px] bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 px-1.5 py-0.5 rounded text-gray-500 flex items-center gap-1">
                                      <Car className="w-3 h-3" /> {group.entryLog.vehiclePlate}
                                    </span>
                                  ) : (group.entryLog.method?.toUpperCase() === 'TAXI' || group.entryLog.method?.toUpperCase() === 'PEDESTRIAN' || group.entryLog.method === 'Taxi' || group.entryLog.method === 'Peatonal') ? (
                                    <span className="text-[10px] bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 px-1.5 py-0.5 rounded text-gray-500 flex items-center gap-1">
                                      {(group.entryLog.method?.toUpperCase() === 'TAXI' || group.entryLog.method === 'Taxi') ? <Car className="w-3 h-3" /> : null} {group.entryLog.method?.toUpperCase() === 'TAXI' ? 'Taxi' : group.entryLog.method?.toUpperCase() === 'PEDESTRIAN' ? 'Peatonal' : group.entryLog.method}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            ) : (
                               <div className="flex justify-between items-center text-sm opacity-50">
                                 <div className="flex items-center gap-1.5">
                                   <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-700"></span>
                                   <span className="text-gray-500 text-xs">INGRESO:</span>
                                 </div>
                                 <span className="text-xs text-gray-400 italic">No registrado</span>
                               </div>
                            )}

                            {group.exitLog ? (
                              <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                  <span className="text-gray-600 dark:text-gray-300 text-xs">SALIDA:</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {new Date(group.exitLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {group.exitLog.vehiclePlate ? (
                                    <span className="text-[10px] bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 px-1.5 py-0.5 rounded text-gray-500 flex items-center gap-1">
                                      <Car className="w-3 h-3" /> {group.exitLog.vehiclePlate}
                                    </span>
                                  ) : (group.exitLog.method?.toUpperCase() === 'TAXI' || group.exitLog.method?.toUpperCase() === 'PEDESTRIAN' || group.exitLog.method === 'Taxi' || group.exitLog.method === 'Peatonal') ? (
                                    <span className="text-[10px] bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 px-1.5 py-0.5 rounded text-gray-500 flex items-center gap-1">
                                      {(group.exitLog.method?.toUpperCase() === 'TAXI' || group.exitLog.method === 'Taxi') ? <Car className="w-3 h-3" /> : null} {group.exitLog.method?.toUpperCase() === 'TAXI' ? 'Taxi' : group.exitLog.method?.toUpperCase() === 'PEDESTRIAN' ? 'Peatonal' : group.exitLog.method}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            ) : (
                               <div className="flex justify-between items-center text-sm opacity-50">
                                 <div className="flex items-center gap-1.5">
                                   <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-700"></span>
                                   <span className="text-gray-500 text-xs">SALIDA:</span>
                                 </div>
                                 <span className="text-xs text-gray-400 italic">No registrado</span>
                               </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    );
                  })()}
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      <RegisterGuestModal 
        isOpen={isGuestModalOpen} 
        onClose={() => setIsGuestModalOpen(false)} 
        host={selectedMember} 
        onSuccess={() => {
          if (selectedMember) fetchLogsForMember(selectedMember, startDate, endDate);
        }}
      />
    </div>
  );
};
