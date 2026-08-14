import React, { useState, useEffect } from 'react';
import { api } from '@config/api';
import toast from 'react-hot-toast';
import { Calendar, CheckCircle, XCircle, Clock, CalendarDays, Activity, List as ListIcon, Grid } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AdminReservationCalendar } from '../components/AdminReservationCalendar';
import CrestLogo from '@shared/components/CrestLogo';

interface Court {
  id: string;
  name: string;
  sport: string;
}

interface Reservation {
  id: string;
  courtId: string;
  court: Court;
  date: string;
  startTime: string;
  endTime: string;
  memberCode: string;
  memberName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
}

export const CourtAdminDashboard: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reservations');
      setReservations(res.data);
    } catch (err) {
      toast.error('Error cargando reservas');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/reservations/${id}/status`, { status });
      toast.success(`Reserva ${status === 'APPROVED' ? 'Aprobada' : 'Rechazada'}`);
      fetchReservations();
    } catch (err) {
      toast.error('Error al actualizar la reserva');
    }
  };

  const filtered = filterStatus === 'ALL' 
    ? reservations 
    : reservations.filter(r => r.status === filterStatus);

  const finalFiltered = selectedCalendarDate 
    ? filtered.filter(r => r.date === format(selectedCalendarDate, 'yyyy-MM-dd'))
    : filtered;

  const pendingCount = reservations.filter(r => r.status === 'PENDING').length;
  const approvedCount = reservations.filter(r => r.status === 'APPROVED').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <CrestLogo size="sm" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white serif-brand tracking-tight">Gestión de <span className="text-brand-gold">Canchas</span></h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Administra las reservas de los socios.</p>
          </div>
        </div>
        <button onClick={fetchReservations} className="glass-button-primary px-4 py-2 text-xs">
          Actualizar Datos
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 border-l-4 border-brand-gold relative overflow-hidden">
           <div className="absolute -right-4 -bottom-4 text-brand-gold/20 dark:text-brand-gold/10">
            <CalendarDays size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-widest font-bold mb-1">Total Reservas</p>
            <h3 className="text-4xl font-bold theme-text">{reservations.length}</h3>
          </div>
        </div>
        
        <div className="glass-panel p-6 border-l-4 border-emerald-500 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 text-emerald-500/20 dark:text-emerald-500/10">
            <CheckCircle size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-sm text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-bold mb-1">Aprobadas</p>
            <h3 className="text-4xl font-bold theme-text">{approvedCount}</h3>
          </div>
        </div>

        <div className="glass-panel p-6 border-l-4 border-amber-500 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 text-amber-500/20 dark:text-amber-500/10">
            <Clock size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-sm text-amber-600 dark:text-amber-400 uppercase tracking-widest font-bold mb-1">Pendientes</p>
            <h3 className="text-4xl font-bold theme-text">{pendingCount}</h3>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-brand-gold uppercase tracking-widest">
              {viewMode === 'LIST' ? 'Lista de Reservas' : 'Calendario de Reservas'}
            </h2>
            
            <div className="flex bg-gray-100 dark:bg-black/40 rounded-xl p-1 border border-gray-200 dark:border-white/10">
              <button 
                onClick={() => setViewMode('LIST')}
                className={`p-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${viewMode === 'LIST' ? 'bg-brand-gold text-black' : 'text-gray-500 dark:text-gray-400 hover:text-brand-green dark:hover:text-white'}`}
              >
                <ListIcon size={16} /> Lista
              </button>
              <button 
                onClick={() => setViewMode('CALENDAR')}
                className={`p-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all ${viewMode === 'CALENDAR' ? 'bg-brand-gold text-black' : 'text-gray-500 dark:text-gray-400 hover:text-brand-green dark:hover:text-white'}`}
              >
                <Grid size={16} /> Calendario
              </button>
            </div>
          </div>
          
          <div className="flex gap-4 items-center">
            {selectedCalendarDate && viewMode === 'LIST' && (
              <div className="text-sm text-brand-gold font-bold bg-brand-gold/10 px-3 py-1.5 rounded-lg border border-brand-gold/20">
                Día: {format(selectedCalendarDate, 'dd/MM/yyyy')}
                <button onClick={() => setSelectedCalendarDate(null)} className="ml-2 text-gray-500 hover:text-red-500 dark:text-white dark:hover:text-red-400">×</button>
              </div>
            )}
            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 theme-text focus:outline-none focus:border-brand-green dark:focus:border-brand-gold text-sm"
            >
            <option value="ALL">Todos los Estados</option>
            <option value="PENDING">Pendientes</option>
            <option value="APPROVED">Aprobadas</option>
            <option value="REJECTED">Rechazadas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
          </div>
        </div>

        {viewMode === 'CALENDAR' ? (
          <div className="mb-8">
            <AdminReservationCalendar 
              reservations={reservations} 
              selectedDate={selectedCalendarDate}
              onSelectDate={(date) => {
                setSelectedCalendarDate(date);
                if (date) {
                  setViewMode('LIST'); // auto switch to list to see the day's details
                }
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/10 text-xs uppercase tracking-widest text-gray-500">
                <th className="py-4 px-4 font-bold">Fecha / Hora</th>
                <th className="py-4 px-4 font-bold">Cancha</th>
                <th className="py-4 px-4 font-bold">Socio</th>
                <th className="py-4 px-4 font-bold">Estado</th>
                <th className="py-4 px-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="py-8 text-center text-gray-500">Cargando...</td></tr>
              ) : finalFiltered.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-gray-500">No hay reservas encontradas.</td></tr>
              ) : (
                finalFiltered.map(res => (
                  <tr key={res.id} className="hover:bg-brand-green/5 dark:hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold theme-text">{format(parseISO(res.date), 'dd/MM/yyyy')}</div>
                      <div className="text-xs text-brand-gold">{res.startTime} - {res.endTime}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-gray-700 dark:text-gray-300">{res.court.name}</div>
                      <div className="text-xs text-gray-500">{res.court.sport}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold theme-text uppercase">{res.memberName}</div>
                      <div className="text-xs text-gray-500">{res.memberCode}</div>
                    </td>
                    <td className="py-4 px-4">
                      {res.status === 'PENDING' && <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-bold tracking-wider">Pendiente</span>}
                      {res.status === 'APPROVED' && <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold tracking-wider">Aprobado</span>}
                      {res.status === 'REJECTED' && <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold tracking-wider">Rechazado</span>}
                      {res.status === 'CANCELLED' && <span className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs font-bold tracking-wider">Cancelado</span>}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {res.status === 'PENDING' && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleUpdateStatus(res.id, 'APPROVED')} className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors" title="Aprobar">
                            <CheckCircle size={20} />
                          </button>
                          <button onClick={() => handleUpdateStatus(res.id, 'REJECTED')} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors" title="Rechazar">
                            <XCircle size={20} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
};
