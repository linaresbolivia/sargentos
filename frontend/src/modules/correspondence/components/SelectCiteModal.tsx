import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Check,
  Building2,
  User,
  Sparkles,
  BookOpen,
  Filter,
  Calendar,
  FileText,
  ExternalLink,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { OfficialCiteItem, OfficialArea } from '../types/cite.types';
import { citeService } from '../services/citeService';

interface SelectCiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCite: (cite: OfficialCiteItem) => void;
  selectedCiteId?: string | null;
}

const getDocTypeBadge = (type: string) => {
  switch (type) {
    case 'INF':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    case 'CI':
      return 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30';
    case 'INST':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
    case 'MEM':
      return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30';
    case 'NE':
      return 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30';
    default:
      return 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30';
  }
};

export const SelectCiteModal: React.FC<SelectCiteModalProps> = ({
  isOpen,
  onClose,
  onSelectCite,
  selectedCiteId,
}) => {
  const [cites, setCites] = useState<OfficialCiteItem[]>([]);
  const [areas, setAreas] = useState<OfficialArea[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('ALL');
  const [selectedDocType, setSelectedDocType] = useState('ALL');
  const [filterUnlinkedOnly, setFilterUnlinkedOnly] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [meta, listRes] = await Promise.all([
        citeService.getMetadata(),
        citeService.listCites({
          limit: 200,
        }),
      ]);
      setAreas(meta.areas || []);
      setCites(listRes.data || []);
    } catch (err) {
      console.error('Error cargando lista de CITEs para selección:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Filtrado reactivo
  const filteredCites = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return cites.filter((c) => {
      // 1. Filtro de sólo disponibles (sin HR)
      if (filterUnlinkedOnly && (c.routeSheetId || c.status === 'ANULADO')) {
        return false;
      }

      // 2. Filtro de Área
      if (selectedArea !== 'ALL' && c.areaKey !== selectedArea) {
        return false;
      }

      // 3. Filtro de Tipo
      if (selectedDocType !== 'ALL' && c.docType !== selectedDocType) {
        return false;
      }

      // 4. Búsqueda por texto
      if (!q) return true;

      const inCode = c.citeCode.toLowerCase().includes(q);
      const inSubject = c.subject.toLowerCase().includes(q);
      const inSender = c.senderName.toLowerCase().includes(q);
      const inRole = (c.senderRole || '').toLowerCase().includes(q);
      const inArea = c.areaName.toLowerCase().includes(q);
      const inRecipient = c.recipient.toLowerCase().includes(q);

      return inCode || inSubject || inSender || inRole || inArea || inRecipient;
    });
  }, [cites, filterUnlinkedOnly, selectedArea, selectedDocType, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-[#07130E] border-2 border-emerald-500/40 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl my-auto">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-emerald-800/40 flex justify-between items-center bg-slate-50/90 dark:bg-[#091A14]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Seleccionar CITE Emitido por Usuarios
                </h3>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  Radicación 360°
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Selecciona el documento emitido por el despacho origen para radicarlo formalmente en una nueva Hoja de Ruta.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-emerald-800/30 bg-slate-50/50 dark:bg-black/20 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código de CITE, asunto, funcionario o área remitente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#06110D] border border-slate-300 dark:border-emerald-800/40 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Toggle Unlinked */}
            <button
              type="button"
              onClick={() => setFilterUnlinkedOnly((prev) => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                filterUnlinkedOnly
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                  : 'bg-white dark:bg-[#06110D] text-slate-600 dark:text-slate-300 border-slate-300 dark:border-emerald-800/40'
              }`}
            >
              <span>{filterUnlinkedOnly ? '✓ Solo Sin HR' : 'Todos'}</span>
            </button>

            {/* Filter Area */}
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="bg-white dark:bg-[#06110D] border border-slate-300 dark:border-emerald-800/40 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer max-w-[170px]"
            >
              <option value="ALL">Todas las Áreas</option>
              {areas.map((a) => (
                <option key={a.key} value={a.key}>
                  [{a.key}] {a.name}
                </option>
              ))}
            </select>

            {/* Filter DocType */}
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="bg-white dark:bg-[#06110D] border border-slate-300 dark:border-emerald-800/40 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
            >
              <option value="ALL">Todos los Tipos</option>
              <option value="INF">Informes (INF)</option>
              <option value="CI">Com. Internas (CI)</option>
              <option value="INST">Instructivos (INST)</option>
              <option value="MEM">Memorándums (MEM)</option>
              <option value="NE">Cartas Externas (NE)</option>
            </select>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-500 font-medium">
              Cargando catálogo de CITEs...
            </div>
          ) : filteredCites.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No se encontraron CITEs con los filtros seleccionados.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Puedes cambiar el filtro para mostrar todos o buscar otro término.
              </p>
            </div>
          ) : (
            filteredCites.map((c) => {
              const isSelected = selectedCiteId === c.id;
              const hasRouteSheet = Boolean(c.routeSheetId);

              return (
                <div
                  key={c.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/50'
                      : 'bg-white dark:bg-[#06110D] border-slate-200 dark:border-emerald-800/30 hover:border-emerald-500/50'
                  }`}
                >
                  <div className="flex-1 space-y-2">
                    {/* Header line */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getDocTypeBadge(c.docType)}`}>
                        {c.docType}
                      </span>
                      <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                        {c.citeCode}
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        {c.areaName}
                      </span>
                      {hasRouteSheet ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1">
                          <span>Radicado en HR {c.routeSheet?.hrCode || ''}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-emerald-500" />
                          <span>Disponible para radicar</span>
                        </span>
                      )}
                    </div>

                    {/* Referencia / Asunto */}
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] mr-1">
                        Asunto:
                      </span>
                      {c.subject}
                    </div>

                    {/* Remitente y Destino */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>De: <strong>{c.senderName}</strong> ({c.senderRole})</span>
                      </span>
                      <span>•</span>
                      <span>Para: <strong>{c.recipient}</strong></span>
                      <span>•</span>
                      <span>Fecha: {new Date(c.officialDate || c.createdAt).toLocaleDateString('es-BO')}</span>
                    </div>
                  </div>

                  {/* Action button */}
                  <div className="shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCite(c);
                        onClose();
                      }}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-emerald-500/15 hover:bg-emerald-600 text-emerald-800 dark:text-emerald-300 hover:text-white border border-emerald-500/30'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>{isSelected ? 'CITE Seleccionado' : 'Seleccionar este CITE'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-emerald-800/40 bg-slate-50 dark:bg-[#07130E] flex items-center justify-between text-xs text-slate-500">
          <span>
            Mostrando <strong>{filteredCites.length}</strong> CITEs disponibles
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectCiteModal;
