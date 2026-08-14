import React, { useEffect, useState } from 'react';
import { api } from '@config/api';
import { Clock, Car, AlertCircle } from 'lucide-react';

export interface AccessLog {
  id: string;
  timestamp: string;
  personId: string;
  fullName: string;
  documentId: string;
  photoUrl: string | null;
  status: 'GRANTED' | 'DENIED';
  gate: string;
  method: string;
  reason: string | null;
  observation: string | null;
  vehiclePlate: string | null;
  actionType: 'ENTRY' | 'EXIT';
  personType?: string;
  isGuest?: boolean;
  hostName?: string | null;
}

export const AccessLogHistory: React.FC = () => {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const response = await api.get('/access/logs/recent?limit=15');
      if (response.data.success) {
        setLogs(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && logs.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-brand-gold animate-pulse text-sm">Cargando bitácora...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-brand-gold/20 flex justify-between items-center sticky top-0 bg-white/80 dark:bg-[#050806]/80 backdrop-blur-md z-10 transition-colors duration-200">
        <h3 className="text-sm theme-text font-bold tracking-wide flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-gold" /> Bitácora
        </h3>
        <span className="text-[10px] text-brand-gold/70">En Vivo</span>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-70">
            <Clock className="w-12 h-12 text-brand-gold/40 mb-4" />
            <p className="text-sm text-center text-gray-500">No hay ingresos registrados hoy.</p>
          </div>
        ) : (
          <div className="relative space-y-6">
            {/* Continuous glowing timeline line */}
            <div className="absolute left-[11px] top-6 bottom-[-20px] w-[2px] bg-gradient-to-b from-brand-gold via-brand-gold/20 to-transparent z-0 rounded-full"></div>

            {logs.map((log, index) => {
              const isEntry = log.actionType === 'ENTRY';
              const isDenied = log.status === 'DENIED';
              const isGuest = log.isGuest;
              const nodeColor = isDenied 
                ? 'bg-red-500 text-red-500' 
                : isEntry 
                  ? isGuest ? 'bg-slate-400 text-slate-400' : 'bg-brand-gold text-brand-gold' 
                  : 'bg-orange-500 text-orange-500';
                  
              const badgeClasses = isDenied 
                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                : isEntry 
                  ? isGuest
                    ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30'
                    : 'bg-[#133825]/10 dark:bg-[#cca14b]/5 text-[#133825] dark:text-[#cca14b] border-[#133825]/30 dark:border-[#cca14b]/30'
                  : 'bg-orange-100 dark:bg-orange-900/10 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-800/30';

              return (
                <div 
                  key={log.id} 
                  className="relative pl-10 animate-in slide-in-from-right-8 fade-in duration-700" 
                  style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
                >
                  {/* Timeline Node */}
                  <div className={`absolute left-[5px] top-5 w-[14px] h-[14px] rounded-full border-[3px] border-white dark:border-[#141816] shadow-[0_0_15px_currentColor] z-10 ${nodeColor}`} />
                  
                  {/* Pulsing effect */}
                  <div className={`absolute left-[5px] top-5 w-[14px] h-[14px] rounded-full animate-ping opacity-60 z-0 ${nodeColor.split(' ')[0]}`} style={{ animationDuration: '3s' }} />

                  {/* Glassmorphism Card */}
                  <div className={`bg-white/70 dark:bg-[#0d2116] rounded-2xl p-4 border border-white/50 ${isGuest ? 'dark:border-slate-500/20 hover:border-slate-500/40' : 'dark:border-brand-gold/20 hover:border-brand-gold/40'} shadow-lg hover:shadow-xl transition-all group hover:-translate-y-1 relative overflow-hidden`}>
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-current to-transparent opacity-20" style={{ color: isDenied ? '#ef4444' : isEntry ? (isGuest ? '#94a3b8' : '#cca14b') : '#f97316' }}></div>
                    
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className={`font-bold text-sm transition-colors leading-tight ${isGuest ? 'text-gray-900 dark:text-slate-200 group-hover:text-slate-400' : 'text-gray-900 dark:text-white group-hover:text-brand-gold'}`}>
                          {log.fullName}
                          {log.personType && log.personType !== 'SOCIO' && (
                            <span className="ml-2 text-[10px] font-normal bg-slate-500/10 text-slate-500 px-2 py-0.5 rounded-full border border-slate-500/20">
                              {log.personType === 'GUEST' ? 'Invitado' : log.personType === 'RECIPROCITY' ? 'Socio Reciprocidad' : 'Externo'}
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono mt-1 opacity-70">
                          {log.isGuest && log.hostName ? `Titular: ${log.hostName}` : log.documentId}
                        </p>
                      </div>
                      <div className="flex flex-col items-end shrink-0 ml-2">
                        <span className="text-xs font-bold text-brand-gold bg-brand-gold/10 px-2.5 py-1 rounded-lg border border-brand-gold/20">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className={`text-[9px] px-2.5 py-1 rounded-md font-bold tracking-wide border ${badgeClasses}`}>
                        {isDenied ? 'Denegado' : isEntry ? 'Entrada' : 'Salida'}
                      </span>

                      {log.vehiclePlate ? (
                        <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100/80 dark:bg-black/40 px-2.5 py-1 rounded-md border border-gray-200 dark:border-brand-gold/10 flex items-center gap-1.5 backdrop-blur-sm">
                          <Car className="w-3 h-3 text-brand-gold" /> {log.vehiclePlate}
                        </span>
                      ) : (log.method?.toUpperCase() === 'TAXI' || log.method?.toUpperCase() === 'PEDESTRIAN' || log.method === 'Taxi' || log.method === 'Peatonal') ? (
                        <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100/80 dark:bg-black/40 px-2.5 py-1 rounded-md border border-gray-200 dark:border-brand-gold/10 flex items-center gap-1.5 backdrop-blur-sm">
                          {(log.method?.toUpperCase() === 'TAXI' || log.method === 'Taxi') ? <Car className="w-3 h-3 text-brand-gold" /> : null} {log.method?.toUpperCase() === 'TAXI' ? 'Taxi' : log.method?.toUpperCase() === 'PEDESTRIAN' ? 'Peatonal' : log.method}
                        </span>
                      ) : null}
                    </div>

                    {(log.reason || log.observation) && (
                      <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-white/5">
                        {log.reason && isDenied && (
                          <p className="text-[10px] text-red-600 dark:text-red-400 font-medium flex items-start gap-1.5 leading-snug">
                            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" /> {log.reason}
                          </p>
                        )}
                        {log.observation && (
                          <p className="text-[11px] text-gray-600 dark:text-gray-400 italic leading-relaxed mt-1">
                            "{log.observation}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
