import React, { useState, useEffect } from 'react';
import { api } from '@config/api';
import { Search, X, Loader2, Edit2, Check, AlertCircle } from 'lucide-react';

interface EditAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditAccessModal: React.FC<EditAccessModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasFiltered, setHasFiltered] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    actionType: '',
    method: '',
    vehiclePlate: '',
    observation: ''
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => setNow(Date.now()), 10000); // Update time every 10s
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedMember(null);
      setLogs([]);
      setStartDate('');
      setEndDate('');
      setHasFiltered(false);
      setEditingLogId(null);
      setErrorMsg('');
    }
  }, [isOpen]);

  const fetchLogs = async (start = startDate, end = endDate, personId = selectedMember?.id) => {
    try {
      setLoadingLogs(true);
      setErrorMsg('');
      let url = `/access/logs/recent?limit=100`;
      if (start) url += `&startDate=${start}`;
      if (end) url += `&endDate=${end}`;
      if (personId) url += `&personId=${personId}`;
      const response = await api.get(url);
      if (response.data.success) {
        setLogs(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
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
      console.error('Error in search:', error);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSelectMember = (member: any) => {
    setSelectedMember(member);
    setSearchQuery('');
    setSearchResults([]);
    setHasFiltered(true);
    fetchLogs(startDate, endDate, member.id);
  };

  const handleClearMember = () => {
    setSelectedMember(null);
    setLogs([]);
  };

  const handleFilter = () => {
    setHasFiltered(true);
    fetchLogs();
  };

  const isEditable = (timestamp: string) => {
    const logTime = new Date(timestamp).getTime();
    return (now - logTime) <= 900000; // 15 minutes
  };

  const handleEditClick = (log: any) => {
    setEditingLogId(log.id);
    setEditForm({
      actionType: log.actionType,
      method: log.method,
      vehiclePlate: log.vehiclePlate || '',
      observation: log.observation || ''
    });
    setErrorMsg('');
  };

  const handleSave = async (logId: string) => {
    try {
      setSavingId(logId);
      setErrorMsg('');
      const response = await api.put(`/access/log/${logId}`, editForm);
      if (response.data.success) {
        setEditingLogId(null);
        fetchLogs();
      }
    } catch (error: any) {
      console.error('Error saving log:', error);
      setErrorMsg(error.response?.data?.message || 'Error al guardar. Puede que el tiempo de edición haya expirado.');
    } finally {
      setSavingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-[#0a2014] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col border border-gray-200 dark:border-brand-gold/30">
        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-black/20 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Edit2 className="w-6 h-6 text-brand-gold" />
            Editar Accesos Recientes
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500 dark:text-white/70 hover:text-gray-900 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-200">
              <AlertCircle className="w-5 h-5" />
              <span>{errorMsg}</span>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="relative lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">Buscar Socio / Invitado</label>
              {!selectedMember ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-white/40" />
                    <input
                      type="text"
                      placeholder="Nombre, ID o documento..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-gold focus:border-transparent outline-none transition-all"
                    />
                    {loadingSearch && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gold animate-spin" />
                    )}
                  </div>
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-2 bg-white dark:bg-[#1a4a32] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                      {searchResults.map((result) => (
                        <div
                          key={result.id}
                          onClick={() => handleSelectMember(result)}
                          className="p-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer border-b border-gray-100 dark:border-white/5 last:border-0 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{result.name}</div>
                            <div className="text-sm text-gray-500 dark:text-white/50">{result.documentId || 'Sin documento'}</div>
                          </div>
                          <span className="text-xs px-2 py-1 bg-brand-gold/20 text-brand-gold rounded-full">
                            {result.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{selectedMember.name}</div>
                    <div className="text-sm text-brand-gold">{selectedMember.type}</div>
                  </div>
                  <button onClick={handleClearMember} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500 dark:text-white/70">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">Fecha Inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-gold outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-2">Fecha Fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-gold outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end mb-6 gap-4">
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                if(!selectedMember) setHasFiltered(false);
                fetchLogs('', '', selectedMember?.id);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl font-medium transition-colors"
            >
              Limpiar Fechas
            </button>
            <button
              onClick={handleFilter}
              className="px-6 py-2 bg-brand-gold hover:bg-brand-gold/90 text-[#0a2014] rounded-xl font-bold transition-colors"
            >
              Buscar Accesos
            </button>
          </div>

          {hasFiltered && (
            <div className="space-y-4">
              {loadingLogs ? (
                <div className="flex flex-col items-center justify-center py-12 text-brand-gold">
                  <Loader2 className="w-8 h-8 animate-spin mb-4" />
                  <p>Cargando registros...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/5">
                  <p className="text-gray-500 dark:text-white/50">No se encontraron registros con los filtros seleccionados.</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                    {editingLogId === log.id ? (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-brand-gold/5">
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-white/50 mb-2">Tipo de Acceso</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name="actionType" 
                                value="ENTRY" 
                                checked={editForm.actionType === 'ENTRY'}
                                onChange={(e) => setEditForm({...editForm, actionType: e.target.value})}
                                className="text-brand-gold focus:ring-brand-gold accent-brand-gold w-4 h-4"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Ingreso</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name="actionType" 
                                value="EXIT" 
                                checked={editForm.actionType === 'EXIT'}
                                onChange={(e) => setEditForm({...editForm, actionType: e.target.value})}
                                className="text-brand-gold focus:ring-brand-gold accent-brand-gold w-4 h-4"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Salida</span>
                            </label>
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs text-gray-500 dark:text-white/50 mb-2">Método de Acceso</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name="method" 
                                value="VEHICLE" 
                                checked={editForm.method === 'VEHICLE'}
                                onChange={(e) => setEditForm({...editForm, method: e.target.value})}
                                className="text-brand-gold focus:ring-brand-gold accent-brand-gold w-4 h-4"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Vehicular</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name="method" 
                                value="TAXI" 
                                checked={editForm.method === 'TAXI'}
                                onChange={(e) => setEditForm({...editForm, method: e.target.value})}
                                className="text-brand-gold focus:ring-brand-gold accent-brand-gold w-4 h-4"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Taxi</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name="method" 
                                value="PEDESTRIAN" 
                                checked={editForm.method === 'PEDESTRIAN'}
                                onChange={(e) => setEditForm({...editForm, method: e.target.value})}
                                className="text-brand-gold focus:ring-brand-gold accent-brand-gold w-4 h-4"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Peatonal</span>
                            </label>
                          </div>
                        </div>
                        {editForm.method === 'VEHICLE' && (
                          <div className="md:col-span-2">
                            <label className="block text-xs text-gray-500 dark:text-white/50 mb-1">Placa del Vehículo</label>
                            <input 
                              type="text" 
                              value={editForm.vehiclePlate}
                              onChange={(e) => setEditForm({...editForm, vehiclePlate: e.target.value})}
                              className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg py-2 px-3 text-gray-900 dark:text-white uppercase"
                              placeholder="Ej. ABC-1234"
                            />
                          </div>
                        )}
                        <div className="md:col-span-2">
                          <label className="block text-xs text-gray-500 dark:text-white/50 mb-1">Observaciones</label>
                          <input 
                            type="text" 
                            value={editForm.observation}
                            onChange={(e) => setEditForm({...editForm, observation: e.target.value})}
                            className="w-full bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg py-2 px-3 text-gray-900 dark:text-white"
                            placeholder="Corrección de ingreso..."
                          />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                          <button 
                            onClick={() => setEditingLogId(null)}
                            className="px-4 py-2 border border-gray-300 dark:border-white/20 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-700 dark:text-white text-sm"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={() => handleSave(log.id)}
                            disabled={savingId === log.id}
                            className="px-4 py-2 bg-brand-gold hover:bg-brand-gold/90 text-[#0a2014] font-bold rounded-lg text-sm flex items-center gap-2"
                          >
                            {savingId === log.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                              log.actionType === 'ENTRY' ? 'bg-[#133825] text-brand-gold dark:bg-[#133825]/80 dark:text-brand-gold' : 'bg-brand-gold/20 text-[#b58c2a] dark:bg-brand-gold/20 dark:text-brand-gold'
                            }`}>
                              {log.actionType === 'ENTRY' ? 'INGRESO' : 'SALIDA'}
                            </span>
                            <span className="text-gray-900 dark:text-white font-medium">{log.person?.firstName} {log.person?.lastName} {log.guest?.firstName} {log.guest?.lastName}</span>
                            <span className="text-gray-500 dark:text-white/50 text-sm">{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-white/70 flex gap-4">
                            <span>Método: {log.method === 'VEHICLE' ? 'Vehicular' : log.method === 'TAXI' ? 'Taxi' : log.method === 'PEDESTRIAN' ? 'Peatonal' : log.method}</span>
                            {log.vehiclePlate && <span>Placa: {log.vehiclePlate}</span>}
                            <span>Puerta: {log.gate}</span>
                          </div>
                          {log.observation && (
                            <div className="text-xs text-gray-500 dark:text-white/50 mt-1 italic">Obs: {log.observation}</div>
                          )}
                        </div>
                        
                        <div>
                          {isEditable(log.timestamp) ? (
                            <button
                              onClick={() => handleEditClick(log)}
                              className="px-4 py-2 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 dark:hover:bg-blue-500/30 border border-blue-500/30 dark:border-blue-500/50 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
                            >
                              <Edit2 className="w-4 h-4" /> Editar
                            </button>
                          ) : (
                            <div className="px-4 py-2 bg-gray-100 dark:bg-black/40 text-gray-400 dark:text-white/30 border border-gray-200 dark:border-white/5 rounded-lg flex items-center gap-2 text-sm font-medium cursor-not-allowed" title="Tiempo de edición (15 min) expirado">
                              <Edit2 className="w-4 h-4 opacity-50" /> Expirado
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
