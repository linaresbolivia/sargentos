import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  X,
  Check,
  FileText,
  Building2,
  User,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { OfficialCiteItem } from '../types/cite.types';
import { citeService } from '../services/citeService';

interface CiteSearchComboboxProps {
  value: string;
  onChange: (val: string) => void;
  selectedCite: OfficialCiteItem | null;
  onSelectCite: (cite: OfficialCiteItem) => void;
  onClearCite: () => void;
  onOpenBrowserModal?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

// Normaliza texto eliminando acentos y caracteres diacríticos para búsqueda flexible
const normalizeText = (text: string): string => {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

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

export const CiteSearchCombobox: React.FC<CiteSearchComboboxProps> = ({
  value,
  onChange,
  selectedCite,
  onSelectCite,
  onClearCite,
  onOpenBrowserModal,
  placeholder = 'Buscar o seleccionar CITE emitido por usuarios...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tabFilter, setTabFilter] = useState<'UNLINKED' | 'ALL'>('UNLINKED');
  const [cites, setCites] = useState<OfficialCiteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Cargar CITEs emitidos por los usuarios en el sistema
  const loadCites = async () => {
    setIsLoading(true);
    try {
      const res = await citeService.listCites({
        limit: 150,
      });
      setCites(res.data || []);
    } catch (err) {
      console.error('Error al cargar lista de CITEs para radicación:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCites();
  }, []);

  // Cierre al hacer clic fuera del combobox
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Total de CITEs disponibles sin Hoja de Ruta asignada
  const unlinkedCount = useMemo(() => {
    return cites.filter((c) => !c.routeSheetId && c.status !== 'ANULADO').length;
  }, [cites]);

  // Filtrado reactivo en memoria
  const filteredCites = useMemo(() => {
    const query = normalizeText(value);

    return cites.filter((c) => {
      // 1. Filtro de pestaña
      if (tabFilter === 'UNLINKED' && (c.routeSheetId || c.status === 'ANULADO')) {
        return false;
      }

      // 2. Si no hay texto de búsqueda, mostrar la lista completa de la pestaña
      if (!query) return true;

      // 3. Si el usuario ya seleccionó este CITE exacto, permitir mostrarlo
      if (selectedCite && selectedCite.id === c.id) return true;

      // 4. Búsqueda por múltiples campos
      const inCode = normalizeText(c.citeCode).includes(query);
      const inSubject = normalizeText(c.subject).includes(query);
      const inSender = normalizeText(c.senderName).includes(query);
      const inSenderRole = normalizeText(c.senderRole).includes(query);
      const inArea = normalizeText(c.areaName).includes(query);
      const inAreaKey = normalizeText(c.areaKey).includes(query);
      const inRecipient = normalizeText(c.recipient).includes(query);

      return inCode || inSubject || inSender || inSenderRole || inArea || inAreaKey || inRecipient;
    });
  }, [cites, tabFilter, value, selectedCite]);

  // Asegurar índice visible al navegar con teclado
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredCites.length, tabFilter]);

  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredCites.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredCites.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCites.length > 0 && highlightedIndex < filteredCites.length) {
        handleSelect(filteredCites[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (citeItem: OfficialCiteItem) => {
    onSelectCite(citeItem);
    setIsOpen(false);
  };

  const handleClear = () => {
    onClearCite();
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input container */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              loadCites();
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full bg-white dark:bg-slate-950/60 border rounded-2xl pl-3.5 pr-20 py-2.5 text-slate-900 dark:text-white font-mono font-bold text-xs sm:text-sm outline-none shadow-xs transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-sans ${
            selectedCite
              ? 'border-emerald-500 dark:border-emerald-500/70 ring-1 ring-emerald-500/30'
              : 'border-slate-300 dark:border-slate-700 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500'
          }`}
        />

        {/* Right side controls */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {selectedCite && (
            <span
              className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-1"
              title="CITE oficial enlazado en la base de datos"
            >
              <Check className="w-2.5 h-2.5" />
              <span>Enlazado</span>
            </span>
          )}

          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              title="Limpiar campo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (!disabled) {
                setIsOpen((prev) => !prev);
                if (!isOpen) loadCites();
              }
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer"
            title="Desplegar lista de CITEs de usuarios"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Floating Dropdown List */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-[#07130E] border-2 border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn max-h-[380px] flex flex-col">
          {/* Header & Tabs */}
          <div className="p-2.5 border-b border-slate-200 dark:border-emerald-800/30 bg-slate-50 dark:bg-[#091A14] flex items-center justify-between gap-2 flex-wrap shrink-0">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTabFilter('UNLINKED')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  tabFilter === 'UNLINKED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span>Disponibles / Sin HR</span>
                {unlinkedCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20 text-white">
                    {unlinkedCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setTabFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  tabFilter === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span>Todos los CITEs</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  {cites.length}
                </span>
              </button>
            </div>

            {onOpenBrowserModal && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenBrowserModal();
                }}
                className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-600 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <BookOpen className="w-3 h-3" />
                <span>Explorar CITEs...</span>
              </button>
            )}
          </div>

          {/* List of CITEs */}
          <div ref={listRef} className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-emerald-950/40 custom-scrollbar">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-emerald-400/60 font-medium">
                Cargando CITEs creados por los usuarios...
              </div>
            ) : filteredCites.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {tabFilter === 'UNLINKED'
                    ? 'No hay CITEs pendientes sin radicar con este criterio.'
                    : 'No se encontraron CITEs registrados con este criterio.'}
                </p>
                {value.trim() && (
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="mt-2 text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                  >
                    Usar CITE manual: "{value.trim()}"
                  </button>
                )}
              </div>
            ) : (
              filteredCites.map((c, index) => {
                const isSelected = selectedCite?.id === c.id;
                const isHighlighted = highlightedIndex === index;
                const isRadicado = Boolean(c.routeSheetId);

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`p-3 text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-500/15 dark:bg-emerald-950/40 border-l-4 border-emerald-500'
                        : isHighlighted
                        ? 'bg-slate-100/80 dark:bg-emerald-900/20'
                        : 'hover:bg-slate-50 dark:hover:bg-emerald-950/20'
                    }`}
                  >
                    {/* Top Row: Code, Badge, Status & Date */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getDocTypeBadge(c.docType)}`}>
                          {c.docType}
                        </span>
                        <span className="font-mono font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                          {c.citeCode}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isRadicado ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1">
                            <span>HR {c.routeSheet?.hrCode || 'Asignada'}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-emerald-500" />
                            <span>Disponible</span>
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(c.officialDate || c.createdAt).toLocaleDateString('es-BO')}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Area & Sender */}
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{c.areaName}</span>
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <User className="w-3 h-3 text-[#C5A059] shrink-0" />
                        <span>{c.senderName}</span>
                        {c.senderRole && (
                          <span className="text-slate-400 text-[10px]">({c.senderRole})</span>
                        )}
                      </span>
                    </div>

                    {/* Bottom Row: Asunto / Referencia */}
                    <div className="text-xs text-slate-700 dark:text-slate-200 font-medium line-clamp-2 bg-slate-50 dark:bg-black/30 p-2 rounded-xl border border-slate-200/60 dark:border-emerald-950">
                      <strong className="text-emerald-700 dark:text-emerald-400 font-bold uppercase text-[10px] mr-1">
                        Referencia:
                      </strong>
                      {c.subject}
                    </div>

                    {/* Footer destination & action helper */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>Destino original: <strong>{c.recipient}</strong></span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                        <span>Click para seleccionar & autocompletar</span>
                        <Check className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer bar */}
          <div className="p-2 border-t border-slate-200 dark:border-emerald-800/30 bg-slate-100 dark:bg-[#07130E] text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between px-3">
            <span>
              Mostrando <strong>{filteredCites.length}</strong> CITEs
            </span>
            <span>Usa ↑ ↓ para navegar, Enter para seleccionar</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CiteSearchCombobox;
