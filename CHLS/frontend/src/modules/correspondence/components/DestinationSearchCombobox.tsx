import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Check, User, ChevronDown } from 'lucide-react';
import { WorkflowNode, CorrespondenceWorkflow } from '../types/correspondence.types';
import { getOrganigramDestinations, isSameArea } from '../utils/organigramWorkflowService';

export interface DestinationOption {
  id: string;
  cargo: string;
  funcionario: string;
  node?: WorkflowNode;
}

interface DestinationSearchComboboxProps {
  currentArea?: string;
  selectedCargo: string;
  selectedPersonName?: string;
  workflow?: CorrespondenceWorkflow | null;
  allowExtraordinary?: boolean;
  onToggleExtraordinary?: (allow: boolean) => void;
  onSelect: (cargo: string, personName: string, node?: WorkflowNode) => void;
  getResponsibleForCargo: (cargoOrArea: string) => string;
  accentColor?: 'emerald' | 'gold';
  placeholder?: string;
  disabled?: boolean;
}

// Normaliza texto eliminando acentos y espacios adicionales
const normalizeText = (text: string): string => {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Resalta la coincidencia en el texto
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
      <span className="text-emerald-500 dark:text-emerald-400 font-black underline decoration-emerald-500/50">
        {match}
      </span>
      {after}
    </span>
  );
};

export const DestinationSearchCombobox: React.FC<DestinationSearchComboboxProps> = ({
  currentArea = '',
  selectedCargo,
  selectedPersonName,
  workflow = null,
  onSelect,
  getResponsibleForCargo,
  accentColor = 'emerald',
  placeholder = 'Buscar por cargo o funcionario...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Obtener destinos del organigrama
  const organigramInfo = useMemo(() => {
    return getOrganigramDestinations(currentArea, workflow);
  }, [currentArea, workflow]);

  // Lista unificada y limpia de todos los cargos y funcionarios disponibles
  const allDestinations = useMemo<DestinationOption[]>(() => {
    const list: DestinationOption[] = [];
    const addedCargos = new Set<string>();

    const addCargo = (cargo: string, explicitManager?: string, node?: WorkflowNode) => {
      const trimmedCargo = cargo.trim();
      if (!trimmedCargo || addedCargos.has(trimmedCargo.toUpperCase())) return;
      // Omitir derivar a la misma área actual si existe
      if (currentArea && isSameArea(trimmedCargo, currentArea)) return;

      const funcionario = explicitManager || getResponsibleForCargo(trimmedCargo);
      list.push({
        id: node?.id || trimmedCargo,
        cargo: trimmedCargo,
        funcionario: funcionario || 'Titular de Despacho',
        node,
      });
      addedCargos.add(trimmedCargo.toUpperCase());
    };

    // 1. Nodos recomendados/conectados del organigrama primero
    (organigramInfo.recommendedNodes || []).forEach(({ node }) => {
      addCargo(node.title, node.manager, node);
    });

    // 2. Todos los demás nodos del organigrama para búsqueda universal
    (organigramInfo.allNodes || []).forEach((node) => {
      addCargo(node.title, node.manager, node);
    });

    return list;
  }, [organigramInfo, currentArea, getResponsibleForCargo]);

  // Filtrado minimalista y rápido
  const filteredDestinations = useMemo(() => {
    const q = normalizeText(searchTerm);
    if (!q) return allDestinations;

    return allDestinations.filter((item) => {
      const matchCargo = normalizeText(item.cargo).includes(q);
      const matchFuncionario = normalizeText(item.funcionario).includes(q);
      return matchCargo || matchFuncionario;
    });
  }, [allDestinations, searchTerm]);

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

  const handleSelectItem = (item: DestinationOption) => {
    onSelect(item.cargo, item.funcionario, item.node);
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

  // Texto visible del campo
  const currentOfficial = selectedPersonName || (selectedCargo ? getResponsibleForCargo(selectedCargo) : '');
  const displayValue = isOpen
    ? searchTerm
    : selectedCargo
    ? `${selectedCargo} — ${currentOfficial}`
    : searchTerm;

  const isEmerald = accentColor === 'emerald';

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Campo de búsqueda limpio y minimalista */}
      <div
        className={`relative flex items-center bg-white dark:bg-[#07130E] border rounded-xl transition-all shadow-sm ${
          isOpen
            ? isEmerald
              ? 'border-emerald-500 ring-2 ring-emerald-500/20'
              : 'border-[#C5A059] ring-2 ring-[#C5A059]/20'
            : 'border-slate-300 dark:border-emerald-800/50'
        } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <Search className={`w-4 h-4 ml-3.5 mr-2 shrink-0 ${isOpen ? (isEmerald ? 'text-emerald-500' : 'text-[#C5A059]') : 'text-slate-400'}`} />

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
            if (e.key === 'Escape') setIsOpen(false);
            if (e.key === 'Enter' && filteredDestinations.length > 0) {
              e.preventDefault();
              handleSelectItem(filteredDestinations[0]);
            }
          }}
          className="w-full bg-transparent py-2.5 pr-14 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none truncate"
        />

        {/* Acciones: Limpiar o desplegar */}
        <div className="absolute right-2.5 flex items-center gap-1">
          {(selectedCargo || searchTerm) && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                if (!isOpen) inputRef.current?.focus();
              }
            }}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Lista desplegable limpia de resultados */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto bg-white dark:bg-[#07130E] border border-slate-200 dark:border-emerald-800/60 rounded-xl shadow-xl p-1.5 space-y-0.5 animate-fadeIn backdrop-blur-md">
          {filteredDestinations.length > 0 ? (
            filteredDestinations.map((item) => {
              const isSelected = selectedCargo && selectedCargo.toUpperCase() === item.cargo.toUpperCase();

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectItem(item)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-emerald-950/50 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold uppercase truncate">
                      <HighlightedText text={item.cargo} query={searchTerm} />
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                      <User className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span className="truncate">
                        <HighlightedText text={item.funcionario} query={searchTerm} />
                      </span>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                </button>
              );
            })
          ) : (
            <div className="p-3 text-center text-xs text-slate-400 dark:text-slate-500">
              No se encontraron resultados para "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DestinationSearchCombobox;
