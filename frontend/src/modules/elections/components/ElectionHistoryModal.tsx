import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Archive,
  Calendar,
  Vote,
  CheckCircle2,
  Lock,
  Unlock,
  Eye,
  FileDown,
  PlusCircle,
  X,
  Search,
  RefreshCw,
  Award,
  Clock,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { ElectionHistoryItem, ElectionStatsDto } from '../types/election.types';
import { CrestLogo } from '@shared/components/CrestLogo';

export interface ElectionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentElectionId: string;
  onSelectElection: (electionId: string) => void;
  onOpenNewElection: () => void;
  onExportElection: (electionId: string) => void;
  onCloseElection: (electionId: string) => void;
  onElectionUpdated?: () => void;
}

export const ElectionHistoryModal: React.FC<ElectionHistoryModalProps> = ({
  isOpen,
  onClose,
  currentElectionId,
  onSelectElection,
  onOpenNewElection,
  onExportElection,
  onCloseElection,
  onElectionUpdated,
}) => {
  const [history, setHistory] = useState<ElectionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'EN_CURSO' | 'FINALIZADA'>('ALL');

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('/api/elections/history');
      if (res.data.success && Array.isArray(res.data.data)) {
        setHistory(res.data.data);
      }
    } catch (err: any) {
      toast.error('Error al cargar el historial de votaciones.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleReopen = async (eId: string) => {
    if (!window.confirm('¿Deseas reabrir esta votación para permitir continuar registrando boletas?')) {
      return;
    }

    try {
      const res = await axios.post('/api/elections/reopen', {
        electionId: eId,
        performedBy: 'Comité Electoral',
      });
      if (res.data.success) {
        toast.success('¡Votación reabierta con éxito!');
        fetchHistory();
        if (onElectionUpdated) onElectionUpdated();
      }
    } catch (err: any) {
      toast.error('Error al reabrir la votación: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (eId: string, title: string) => {
    if (
      !window.confirm(
        `¿Estás seguro de eliminar definitivamente la votación "${title}"?\n\nEsta acción eliminará todas sus boletas, registros y postulantes asociados.`
      )
    ) {
      return;
    }

    try {
      const res = await axios.delete(`/api/elections/${eId}`);
      if (res.data.success) {
        toast.success(`Votación "${title}" eliminada con éxito.`);
        fetchHistory();
        if (onElectionUpdated) onElectionUpdated();
        if (currentElectionId === eId) {
          window.location.reload();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar la votación.');
    }
  };

  const formatDateLabel = (dateStr?: string) => {
    if (!dateStr) return 'Sin fecha';
    try {
      const d = new Date(dateStr);
      return format(d, "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.period.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.votingDate && item.votingDate.includes(searchTerm));
    const matchesStatus =
      statusFilter === 'ALL' ? true : item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-[#081525] via-[#050f1b] to-[#02070e] border-2 border-brand-gold/40 rounded-3xl p-4 sm:p-6 max-w-4xl w-full text-white shadow-[0_25px_90px_rgba(212,175,55,0.25)] relative flex flex-col max-h-[92vh]">
        
        {/* Header del Modal */}
        <div className="flex items-center justify-between border-b border-brand-gold/30 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center text-brand-gold shrink-0">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-black tracking-wider uppercase bg-gradient-to-r from-amber-200 via-brand-gold to-yellow-400 bg-clip-text text-transparent font-sans">
                Historial de Votaciones y Escrutinios
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Registro cronológico oficial por fecha de votación del Club Hípico Los Sargentos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenNewElection();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black uppercase tracking-wider shadow-md hover:scale-105 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva Votación</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="py-3 flex items-center gap-3 flex-wrap shrink-0 border-b border-white/10">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por fecha, título o gestión..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold transition-all"
            />
          </div>

          <div className="flex items-center p-0.5 bg-black/60 rounded-xl border border-white/15 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-brand-gold text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              Todas ({history.length})
            </button>
            <button
              onClick={() => setStatusFilter('EN_CURSO')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'EN_CURSO'
                  ? 'bg-emerald-500 text-black shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              En Curso
            </button>
            <button
              onClick={() => setStatusFilter('FINALIZADA')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'FINALIZADA'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Cerradas
            </button>
          </div>

          <button
            onClick={fetchHistory}
            title="Recargar historial"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Lista de Votaciones Históricas */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin text-brand-gold" />
              <span className="text-xs uppercase font-bold tracking-wider">Cargando Historial...</span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-400 space-y-2">
              <Archive className="w-12 h-12 mx-auto text-gray-600 stroke-1" />
              <p className="text-sm font-bold">No se encontraron votaciones en este filtro.</p>
              <p className="text-xs text-gray-500">Puedes crear una nueva votación con el botón superior.</p>
            </div>
          ) : (
            filteredHistory.map((item) => {
              const isSelected = item.id === currentElectionId;
              const isClosed = item.status === 'FINALIZADA' || item.status === 'PROCLAMADA';

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl p-4 sm:p-5 border transition-all relative overflow-hidden ${
                    isSelected
                      ? 'bg-[#0a2038]/80 border-brand-gold shadow-[0_0_25px_rgba(212,175,55,0.2)]'
                      : 'bg-black/50 border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Subtle top indicator if currently selected in Hub */}
                  {isSelected && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-brand-gold to-yellow-300" />
                  )}

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Columna Izquierda: Datos Principales */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Fecha de Votación */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-xs font-mono text-gray-200">
                          <Calendar className="w-3.5 h-3.5 text-brand-gold" />
                          <span className="font-bold">{formatDateLabel(item.votingDate || item.startDate)}</span>
                        </div>

                        {/* Status Badge */}
                        {isClosed ? (
                          <span className="flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            <Lock className="w-3 h-3" />
                            <span>Cerrada / Guardada</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            <span>En Curso (Activa)</span>
                          </span>
                        )}

                        {isSelected && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/40">
                            En Pantalla
                          </span>
                        )}
                      </div>

                      {/* Título & Gestión */}
                      <div>
                        <h4 className="text-base sm:text-lg font-black text-white font-sans">
                          {item.title}
                        </h4>
                        <p className="text-xs text-gray-400">
                          Gestión: <strong className="text-gray-200">{item.period}</strong> • {item.candidatesCount} Postulantes
                        </p>
                      </div>

                      {/* Ganador o Líder */}
                      {item.winningCandidate && item.totalBallots > 0 && (
                        <div className="flex items-center gap-2.5 bg-black/40 p-2 rounded-xl border border-brand-gold/20 text-xs">
                          <Award className="w-4 h-4 text-brand-gold shrink-0" />
                          <span className="text-gray-300 text-[11px]">Mayoría:</span>
                          <span className="font-bold text-amber-200 truncate">
                            {item.winningCandidate.fullName}
                          </span>
                          <span className="text-brand-gold font-mono font-bold text-[11px] ml-auto">
                            {item.winningCandidate.votesCount} votos ({item.winningCandidate.votesPercentage}%)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Columna Central: Métricas Clave */}
                    <div className="grid grid-cols-4 gap-2 text-center shrink-0 min-w-[280px]">
                      <div className="bg-black/60 p-2 rounded-xl border border-white/10">
                        <span className="text-[10px] text-gray-400 block font-bold">Ánfora</span>
                        <span className="text-base font-black font-mono text-brand-gold">{item.totalBallots}</span>
                        <span className="text-[8px] text-gray-500 block">Boletas</span>
                      </div>
                      <div className="bg-black/60 p-2 rounded-xl border border-white/10">
                        <span className="text-[10px] text-emerald-400 block font-bold">Válidos</span>
                        <span className="text-base font-black font-mono text-emerald-400">{item.validBallots}</span>
                        <span className="text-[8px] text-gray-500 block">{item.validPercentage}%</span>
                      </div>
                      <div className="bg-black/60 p-2 rounded-xl border border-white/10">
                        <span className="text-[10px] text-slate-300 block font-bold">Blancos</span>
                        <span className="text-base font-black font-mono text-slate-300">{item.blankBallots}</span>
                        <span className="text-[8px] text-gray-500 block">{item.blankPercentage}%</span>
                      </div>
                      <div className="bg-black/60 p-2 rounded-xl border border-white/10">
                        <span className="text-[10px] text-rose-400 block font-bold">Nulos</span>
                        <span className="text-base font-black font-mono text-rose-400">{item.nullBallots}</span>
                        <span className="text-[8px] text-gray-500 block">{item.nullPercentage}%</span>
                      </div>
                    </div>

                    {/* Columna Derecha: Acciones Rápidas */}
                    <div className="flex sm:flex-col items-center justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/10">
                      {/* Cargar en Hub */}
                      <button
                        type="button"
                        onClick={() => {
                          onSelectElection(item.id);
                          onClose();
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer border border-white/15 hover:border-brand-gold/50"
                        title="Ver escrutinio de esta votación en la pantalla principal"
                      >
                        <Eye className="w-3.5 h-3.5 text-brand-gold" />
                        <span>Ver en Pantalla</span>
                      </button>

                      {/* Exportar Reporte */}
                      <button
                        type="button"
                        onClick={() => {
                          onExportElection(item.id);
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 text-xs font-bold transition-all cursor-pointer border border-emerald-500/40"
                        title="Exportar acta y reporte oficial en PDF o Excel"
                      >
                        <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Exportar Acta</span>
                      </button>

                      {/* Cerrar / Reabrir */}
                      {isClosed ? (
                        <button
                          type="button"
                          onClick={() => handleReopen(item.id)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-xs font-bold transition-all cursor-pointer border border-amber-500/40"
                          title="Reabrir esta votación para registrar más votos"
                        >
                          <Unlock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Reabrir</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onCloseElection(item.id);
                            onClose();
                          }}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 text-xs font-bold transition-all cursor-pointer border border-rose-500/40"
                          title="Cerrar y archivar esta votación oficialmente"
                        >
                          <Lock className="w-3.5 h-3.5 text-rose-400" />
                          <span>Cerrar</span>
                        </button>
                      )}

                      {/* Eliminar Votación */}
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.title)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-bold transition-all cursor-pointer border border-rose-500/30 hover:border-rose-500/60"
                        title="Eliminar permanentemente esta votación del sistema"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer del Modal */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-gold" />
            <span>Las votaciones archivadas se conservan íntegramente con sus boletas y actas.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
