import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Check, User, ChevronDown, Building2, Sparkles } from 'lucide-react';
import { WorkflowNode, CorrespondenceWorkflow } from '../types/correspondence.types';
import { DEFAULT_ORGANIGRAM_NODES } from '../utils/organigramWorkflowService';

export interface InternalSenderOption {
  id: string;
  area: string;
  title: string;
  subtitle: string;
  funcionario: string;
  node?: WorkflowNode;
}

interface InternalSenderSearchComboboxProps {
  selectedArea: string;
  selectedOfficial?: string;
  workflow?: CorrespondenceWorkflow | null;
  nodes?: WorkflowNode[];
  onSelect: (area: string, officialName: string, node?: WorkflowNode) => void;
  getResponsibleForArea?: (areaOrCargo: string) => string;
  placeholder?: string;
  disabled?: boolean;
}

// Respaldo de responsables oficiales institucionales del Club Hípico Los Sargentos
const DEFAULT_RESPONSIBLES: Record<string, { title: string; defaultPerson: string }> = {
  'SECRETARÍA GENERAL': { title: 'Secretaría de Gerencia General', defaultPerson: 'María del Pilar Atanacio (Secretaria de Gerencia)' },
  'SECRETARÍA': { title: 'Secretaría de Gerencia General', defaultPerson: 'María del Pilar Atanacio (Secretaria de Gerencia)' },
  'GERENCIA GENERAL': { title: 'Gerencia General / MAE', defaultPerson: 'Gerente General CHLS' },
  'TESORERÍA Y FINANZAS': { title: 'Jefatura de Tesorería y Finanzas', defaultPerson: 'Jefe de Finanzas & Tesorería' },
  'CONTRATACIONES Y ADQUISICIONES': { title: 'Responsable de Compras & Contrataciones', defaultPerson: 'Encargado de Adquisiciones' },
  'COMISIÓN HÍPICA': { title: 'Capitanía Hípica & Área Ecuestre', defaultPerson: 'Capitán de Comisión Hípica' },
  'CAPITANÍA DEPORTES / TENIS': { title: 'Capitanía de Deportes & Tenis', defaultPerson: 'Capitán de Deportes' },
  'ASESORÍA LEGAL': { title: 'Asesoría Jurídica Institucional', defaultPerson: 'Asesor Legal Principal' },
  'MANTENIMIENTO Y OBRAS': { title: 'Jefatura de Infraestructura y Mantenimiento', defaultPerson: 'Jefe de Mantenimiento' },
  'DIRECTORIO / PRESIDENCIA': { title: 'Directorio / Presidencia CHLS', defaultPerson: 'Directorio CHLS' },
  'ALMACÉN': { title: 'Encargado de Almacén & Suministros', defaultPerson: 'Responsable de Almacén' },
  'SISTEMAS E INFORMÁTICA': { title: 'Jefatura de Sistemas & TI', defaultPerson: 'Administrador de Sistemas' },
  'RECURSOS HUMANOS': { title: 'Jefatura de Talento Humano', defaultPerson: 'Responsable de RRHH' },
};

// Normaliza texto eliminando acentos y caracteres diacríticos para búsqueda flexible
const normalizeText = (text: string): string => {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Resalta la coincidencia de texto dentro de una cadena
const HighlightedText: React.FC<{ text: string; query: string; className?: string }> = ({
  text,
  query,
  className = '',
}) => {
  if (!query.trim() || !text) {
    return <span className={className}>{text}</span>;
  }

  const normalizedQuery = normalizeText(query);
  const normalizedText = normalizeText(text);
  const matchIndex = normalizedText.indexOf(normalizedQuery);

  if (matchIndex === -1) {
    return <span className={className}>{text}</span>;
  }

  const before = text.slice(0, matchIndex);
  const match = text.slice(matchIndex, matchIndex + query.length);
  const after = text.slice(matchIndex + query.length);

  return (
    <span className={className}>
      {before}
      <span className="text-emerald-600 dark:text-emerald-400 font-black underline decoration-emerald-500/50 bg-emerald-500/10 px-0.5 rounded">
        {match}
      </span>
      {after}
    </span>
  );
};

export const InternalSenderSearchCombobox: React.FC<InternalSenderSearchComboboxProps> = ({
  selectedArea,
  selectedOfficial = '',
  workflow = null,
  nodes,
  onSelect,
  getResponsibleForArea,
  placeholder = 'Buscar área, departamento o funcionario remitente...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Lista unificada de áreas del organigrama institucional
  const allInternalSenders = useMemo<InternalSenderOption[]>(() => {
    const rawNodes = (nodes && nodes.length > 0)
      ? nodes
      : (workflow?.nodes && workflow.nodes.length > 0)
      ? workflow.nodes
      : DEFAULT_ORGANIGRAM_NODES;

    const list: InternalSenderOption[] = [];
    const addedAreas = new Set<string>();

    const resolveResponsible = (cargoOrArea: string, node?: WorkflowNode): string => {
      if (node?.manager && node.manager.trim()) {
        return node.manager.trim();
      }
      if (getResponsibleForArea) {
        const resp = getResponsibleForArea(cargoOrArea);
        if (resp) return resp;
      }
      const upper = cargoOrArea.toUpperCase().trim();
      if (DEFAULT_RESPONSIBLES[upper]) {
        return DEFAULT_RESPONSIBLES[upper].defaultPerson;
      }
      const foundKey = Object.keys(DEFAULT_RESPONSIBLES).find(
        (k) => upper.includes(k) || k.includes(upper)
      );
      if (foundKey) {
        return DEFAULT_RESPONSIBLES[foundKey].defaultPerson;
      }
      return 'Titular de Despacho';
    };

    // 1. Agregar nodos reales del organigrama
    rawNodes.forEach((node) => {
      const areaTitle = (node.areaKey || node.title || '').trim();
      if (!areaTitle) return;
      const key = areaTitle.toUpperCase();
      if (addedAreas.has(key)) return;

      const funcionario = resolveResponsible(areaTitle, node);

      list.push({
        id: node.id || `node-${key}`,
        area: areaTitle,
        title: node.title || areaTitle,
        subtitle: node.subtitle || 'Despacho Institucional CHLS',
        funcionario,
        node,
      });
      addedAreas.add(key);
    });

    // 2. Complementar con áreas institucionales fijas de respaldo si no estuvieran presentes
    Object.entries(DEFAULT_RESPONSIBLES).forEach(([areaKey, info]) => {
      if (!addedAreas.has(areaKey)) {
        list.push({
          id: `default-${areaKey}`,
          area: areaKey,
          title: areaKey,
          subtitle: info.title,
          funcionario: info.defaultPerson,
        });
        addedAreas.add(areaKey);
      }
    });

    return list;
  }, [nodes, workflow, getResponsibleForArea]);

  // Filtrado reactivo con motor de búsqueda en tiempo real
  const filteredSenders = useMemo(() => {
    const q = normalizeText(searchTerm);
    if (!q) return allInternalSenders;

    return allInternalSenders.filter((item) => {
      const matchTitle = normalizeText(item.title).includes(q);
      const matchArea = normalizeText(item.area).includes(q);
      const matchFuncionario = normalizeText(item.funcionario).includes(q);
      const matchSubtitle = normalizeText(item.subtitle).includes(q);
      return matchTitle || matchArea || matchFuncionario || matchSubtitle;
    });
  }, [allInternalSenders, searchTerm]);

  // Reset highlight index when filter changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredSenders]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.querySelector('[data-highlighted="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectItem = (item: InternalSenderOption) => {
    onSelect(item.area, item.funcionario, item.node);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect('', '');
    setSearchTerm('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  // Texto visible cuando está cerrado
  const displayValue = isOpen
    ? searchTerm
    : selectedArea
    ? `${selectedArea}${selectedOfficial ? ` — ${selectedOfficial}` : ''}`
    : searchTerm;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Campo de búsqueda con estilo institucional CHLS */}
      <div
        className={`relative flex items-center bg-white dark:bg-[#07110c] border-2 rounded-2xl transition-all shadow-sm ${
          isOpen
            ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
            : selectedArea
            ? 'border-emerald-500/50 dark:border-emerald-500/30'
            : 'border-slate-300 dark:border-slate-700'
        } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <div className="pl-3.5 pr-2 py-3 flex items-center shrink-0">
          <Search className={`w-4 h-4 transition-colors ${isOpen ? 'text-emerald-500' : 'text-slate-400'}`} />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => {
            setIsOpen(true);
            setSearchTerm('');
          }}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (!isOpen) {
                setIsOpen(true);
              } else {
                setHighlightedIndex((prev) => (prev < filteredSenders.length - 1 ? prev + 1 : 0));
              }
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (!isOpen) {
                setIsOpen(true);
              } else {
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredSenders.length - 1));
              }
            } else if (e.key === 'Enter') {
              if (isOpen && filteredSenders.length > 0) {
                e.preventDefault();
                handleSelectItem(filteredSenders[highlightedIndex] || filteredSenders[0]);
              }
            }
          }}
          className="w-full bg-transparent py-3 pr-16 text-slate-950 dark:text-white font-bold text-sm placeholder:text-slate-400 dark:placeholder:text-gray-500 outline-none truncate"
        />

        {/* Acciones de búsqueda: Limpiar o Desplegar */}
        <div className="absolute right-2.5 flex items-center gap-1">
          {(selectedArea || searchTerm) && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Limpiar selección"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (!disabled) {
                setIsOpen((prev) => !prev);
                if (!isOpen) inputRef.current?.focus();
              }
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title={isOpen ? 'Ocultar catálogo' : 'Ver todas las áreas'}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Menú desplegable con resultados del motor de búsqueda */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full mt-2 z-50 max-h-72 overflow-y-auto bg-white dark:bg-[#07130E] border-2 border-emerald-500/40 dark:border-emerald-600/40 rounded-2xl shadow-2xl p-2 space-y-1 animate-fadeIn backdrop-blur-md custom-scrollbar"
        >
          {/* Header informativo del motor */}
          <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3 h-3 text-emerald-500" />
              <span>Áreas y Funcionarios del Organigrama ({filteredSenders.length})</span>
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Autocompleta funcionario</span>
            </span>
          </div>

          {filteredSenders.length > 0 ? (
            filteredSenders.map((item, index) => {
              const isSelected = selectedArea && selectedArea.toUpperCase() === item.area.toUpperCase();
              const isHighlighted = index === highlightedIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  data-highlighted={isHighlighted}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => handleSelectItem(item)}
                  className={`w-full text-left p-3 rounded-xl text-xs transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-950 dark:text-emerald-200 font-bold'
                      : isHighlighted
                      ? 'bg-slate-100 dark:bg-emerald-950/40 text-slate-900 dark:text-white border border-transparent'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-900/50 text-slate-800 dark:text-slate-200 border border-transparent'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black uppercase tracking-wide text-xs sm:text-[13px] truncate text-slate-900 dark:text-white">
                        <HighlightedText text={item.title} query={searchTerm} />
                      </span>
                    </div>

                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mt-1 font-semibold truncate">
                      <User className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        <HighlightedText text={item.funcionario} query={searchTerm} />
                      </span>
                    </div>

                    {item.subtitle && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 pl-4">
                        <HighlightedText text={item.subtitle} query={searchTerm} />
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              );
            })
          ) : (
            <div className="p-4 text-center">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No se encontraron áreas o funcionarios para "{searchTerm}"
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Intenta buscar por cargo, apellido, nombre del funcionario o departamento.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InternalSenderSearchCombobox;
