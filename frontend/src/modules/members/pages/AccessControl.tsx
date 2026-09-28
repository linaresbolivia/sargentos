import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@store/store';
import { fetchAccessLogs, checkMemberAccess, MemberProfile } from '@store/membersSlice';
import { Search, ShieldCheck, ShieldAlert, Activity, User, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { logout } from '@store/authSlice';
import CrestLogo from '@shared/components/CrestLogo';
import { BackButton } from '@shared/components/BackButton';

export const AccessControl: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { accessLogs, isLoading } = useSelector((state: RootState) => state.members);
  
  const [membershipNumber, setMembershipNumber] = useState('');
  const [lastCheck, setLastCheck] = useState<{ allowed: boolean; member: MemberProfile } | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    dispatch(fetchAccessLogs());
    // Auto-refresh logs every 10 seconds for real-time feel
    const interval = setInterval(() => {
      dispatch(fetchAccessLogs());
    }, 10000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Sesión cerrada correctamente');
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!membershipNumber.trim()) return;

    setIsChecking(true);
    try {
      const resultAction = await dispatch(checkMemberAccess(membershipNumber)).unwrap();
      setLastCheck({
        allowed: resultAction.allowed,
        member: resultAction.member,
      });
      if (resultAction.allowed) {
        toast.success(`Acceso Autorizado: ${resultAction.member.fullName}`);
      } else {
        toast.error(`Acceso DENEGADO: ${resultAction.member.fullName} mantiene deuda.`);
      }
      setMembershipNumber('');
    } catch (error: any) {
      setLastCheck(null);
      toast.error(error || 'Miembro no encontrado o inválido.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050e09] text-white flex flex-col md:flex-row">
      {/* Sidebar / Left Column (Scanning) */}
      <div className="w-full md:w-1/3 border-r border-[#cca14b]/10 bg-[#06110b] flex flex-col">
        <header className="p-6 border-b border-[#cca14b]/10 flex justify-between items-center bg-[#050e09]/50">
          <div className="flex items-center gap-3.5">
            <BackButton to="/" title="Volver al Menú Principal" />
            <CrestLogo size="sm" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-[#cca14b] to-[#fde08b] bg-clip-text text-transparent serif-brand">
                CHLS Portería
              </h1>
              <p className="text-xs text-[#a68138] uppercase font-bold tracking-widest mt-1">Control de Accesos</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <LogOut className="w-5 h-5 text-gray-400" />
          </button>
        </header>

        <div className="p-6 flex-1 flex flex-col">
          <form onSubmit={handleSearch} className="mb-8">
            <label className="block text-sm font-semibold text-[#cca14b] uppercase tracking-widest mb-3">
              Escanear / N° Membresía
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                autoFocus
                className="w-full bg-[#040a07]/80 border-2 border-[#cca14b]/30 text-white rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:border-[#cca14b] focus:shadow-[0_0_15px_rgba(204,161,75,0.3)] transition-all font-mono text-lg"
                placeholder="Ej. CHLS-2023-..."
                value={membershipNumber}
                onChange={(e) => setMembershipNumber(e.target.value)}
                disabled={isChecking}
              />
            </div>
            <button
              type="submit"
              disabled={isChecking || !membershipNumber.trim()}
              className="glass-button-primary w-full mt-4 py-4 uppercase tracking-widest text-sm"
            >
              {isChecking ? 'Verificando...' : 'Verificar Acceso'}
            </button>
          </form>

          {/* Large Visual Indicator for last check */}
          {lastCheck && (
            <div className={`mt-auto mb-6 p-8 rounded-2xl flex flex-col items-center justify-center text-center transition-all ${
              lastCheck.allowed 
                ? 'bg-emerald-500/10 border-2 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.2)]'
                : 'bg-red-500/10 border-2 border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.2)]'
            }`}>
              {lastCheck.allowed ? (
                <ShieldCheck className="w-24 h-24 text-emerald-400 mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              ) : (
                <ShieldAlert className="w-24 h-24 text-red-500 mb-4 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse" />
              )}
              
              <h2 className={`text-3xl font-bold uppercase tracking-widest mb-2 ${lastCheck.allowed ? 'text-emerald-400' : 'text-red-500'}`}>
                {lastCheck.allowed ? 'ACCESO CONCEDIDO' : 'ACCESO DENEGADO'}
              </h2>
              <p className="text-xl text-white font-bold serif-brand mt-4">{lastCheck.member.fullName}</p>
              <p className="text-sm text-gray-400 font-mono mt-1">{lastCheck.member.membershipNumber}</p>
              
              {!lastCheck.allowed && (
                <div className="mt-4 px-4 py-2 bg-red-500/20 rounded-lg text-red-300 text-sm font-semibold border border-red-500/30">
                  Deuda Pendiente: Bs. {(lastCheck.member.totalDebt || 0).toFixed(2)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main / Right Column (Logs) */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="flex items-center gap-3 mb-8">
          <Activity className="w-6 h-6 text-[#cca14b]" />
          <h2 className="text-xl font-bold text-white serif-brand">Registros de Acceso Recientes</h2>
        </div>

        <div className="space-y-4">
          {isLoading && accessLogs.length === 0 ? (
            <div className="text-center text-gray-500 py-10 flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#cca14b] mb-4"></div>
              Cargando registros...
            </div>
          ) : accessLogs.length === 0 ? (
            <div className="glass-panel p-8 text-center text-gray-400">
              No hay registros de acceso recientes.
            </div>
          ) : (
            accessLogs.map((log) => (
              <div key={log.id} className="glass-panel p-4 flex items-center justify-between hover:bg-white/5">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                    log.status === 'GRANTED' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-500'
                  }`}>
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold serif-brand">{log.memberName}</h4>
                    <p className="text-xs text-[#a68138] font-mono mt-0.5">{log.membershipNumber}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-sm font-bold uppercase tracking-widest ${
                    log.status === 'GRANTED' ? 'text-emerald-400' : 'text-red-500'
                  }`}>
                    {log.status === 'GRANTED' ? 'AUTORIZADO' : 'DENEGADO'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
