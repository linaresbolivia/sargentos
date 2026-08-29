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
      <div className="px-5 py-4 border-b border-emerald-500/30 dark:border-emerald-500/40 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-[#061c12]/90 backdrop-blur-xl z-10 shadow-[0_0_20px_rgba(16,185,129,0.12)] transition-all">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400 animate-pulse" /> Bitácora en Vivo
        </h3>
        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          EN TIEMPO REAL
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-70">
            <Clock className="w-12 h-12 text-emerald-500/40 mb-4" />
            <p className="text-sm text-center text-slate-500 dark:text-gray-400 font-medium">No hay ingresos registrados hoy.</p>
          </div>
        ) : (
          <div className="relative space-y-6">
            {/* Continuous glowing timeline line */}
            <div className="absolute left-[11px] top-6 bottom-[-20px] w-[2px] bg-gradient-to-b from-emerald-400 via-brand-gold/30 to-transparent z-0 rounded-full"></div>

            {logs.map((log, index) => {
              const isEntry = log.actionType === 'ENTRY';
              const isDenied = log.status === 'DENIED';
              const isGuest = log.isGuest;
              const nodeColor = isDenied 
                ? 'bg-rose-500 text-rose-500 shadow-[0_0_12px_#f43f5e]' 
                : isEntry 
                  ? isGuest ? 'bg-slate-400 text-slate-400 shadow-[0_0_12px_#94a3b8]' : 'bg-emerald-400 text-emerald-400 shadow-[0_0_12px_#34d399]' 
                  : 'bg-amber-500 text-amber-500 shadow-[0_0_12px_#f59e0b]';
                  
              const badgeClasses = isDenied 
                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40'
                : isEntry 
                  ? isGuest
                    ? 'bg-slate-500/20 text-slate-600 dark:text-slate-300 border-slate-500/40'
                    : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40';

              return (
                <div 
                  key={log.id} 
                  className="relative pl-10 animate-in slide-in-from-right-8 fade-in duration-700" 
                  style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
                >
                  {/* Timeline Node */}
                  <div className={`absolute left-[5px] top-5 w-[14px] h-[14px] rounded-full border-2 border-white dark:border-[#071d14] z-10 ${nodeColor}`} />
                  
                  {/* Pulsing effect */}
                  <div className={`absolute left-[5px] top-5 w-[14px] h-[14px] rounded-full animate-ping opacity-60 z-0 ${nodeColor.split(' ')[0]}`} style={{ animationDuration: '3s' }} />

                  {/* Glassmorphism Card */}
                  <div className={`bg-white/90 dark:bg-gradient-to-br dark:from-[#09291b] dark:via-[#051c12] dark:to-[#020e08] rounded-2xl p-4 border-2 ${isGuest ? 'border-slate-300 dark:border-slate-500/30 hover:border-slate-400' : 'border-emerald-500/30 dark:border-emerald-500/40 hover:border-emerald-400'} shadow-[0_0_20px_rgba(16,185,129,0.08)] hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden backdrop-blur-xl`}>
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-transparent via-current to-transparent opacity-40" style={{ color: isDenied ? '#ef4444' : isEntry ? (isGuest ? '#94a3b8' : '#10b981') : '#f59e0b' }}></div>
                    
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className={`font-black text-sm transition-colors leading-tight ${isGuest ? 'text-slate-900 dark:text-slate-200 group-hover:text-slate-400' : 'text-slate-900 dark:text-white group-hover:text-emerald-400'}`}>
                          {log.fullName}
                          {log.personType && log.personType !== 'SOCIO' && (
                            <span className="ml-2 text-[9px] font-black uppercase bg-slate-500/15 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded-full border border-slate-500/30">
                              {log.personType === 'GUEST' ? 'Invitado' : log.personType === 'RECIPROCITY' ? 'Socio Reciprocidad' : 'Externo'}
                            </span>
                          )}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-gray-400 font-mono mt-1 opacity-80">
                          {log.isGuest && log.hostName ? `Titular: ${log.hostName}` : log.documentId}
                        </p>
                      </div>
                      <div className="flex flex-col items-end shrink-0 ml-2">
                        <span className="text-xs font-black font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-xl border border-emerald-500/30 shadow-xs">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className={`text-[9px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider border ${badgeClasses}`}>
                        {isDenied ? 'Denegado' : isEntry ? 'Entrada' : 'Salida'}
                      </span>

                      {log.vehiclePlate ? (
                        <span className="text-[10px] font-bold text-slate-700 dark:text-gray-200 bg-slate-100 dark:bg-black/50 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1.5 backdrop-blur-sm font-mono">
                          <Car className="w-3 h-3 text-emerald-400" /> {log.vehiclePlate}
                        </span>
                      ) : (log.method?.toUpperCase() === 'TAXI' || log.method?.toUpperCase() === 'PEDESTRIAN' || log.method === 'Taxi' || log.method === 'Peatonal') ? (
                        <span className="text-[10px] font-bold text-slate-700 dark:text-gray-200 bg-slate-100 dark:bg-black/50 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1.5 backdrop-blur-sm">
                          {(log.method?.toUpperCase() === 'TAXI' || log.method === 'Taxi') ? <Car className="w-3 h-3 text-emerald-400" /> : null} {log.method?.toUpperCase() === 'TAXI' ? 'Taxi' : log.method?.toUpperCase() === 'PEDESTRIAN' ? 'Peatonal' : log.method}
                        </span>
                      ) : null}
                    </div>

                    {(log.reason || log.observation) && (
                      <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-white/10">
                        {log.reason && isDenied && (
                          <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-start gap-1.5 leading-snug">
                            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" /> {log.reason}
                          </p>
                        )}
                        {log.observation && (
                          <p className="text-[11px] text-slate-600 dark:text-gray-300 italic leading-relaxed mt-1">
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
