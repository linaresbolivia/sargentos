import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Check, User, ChevronDown, Building2, Copy, Plus } from 'lucide-react';
import { WorkflowNode, CorrespondenceWorkflow } from '../types/correspondence.types';
import { DEFAULT_ORGANIGRAM_NODES } from '../utils/organigramWorkflowService';

export interface CcOption {
  id: string;
  area: string;
  funcionario: string;
  node?: WorkflowNode;
}

interface CcSearchComboboxProps {
  selectedAreas: string[];
  onToggleArea: (area: string) => void;
  onRemoveArea: (area: string) => void;
  onClearAll?: () => void;
  allNodes?: WorkflowNode[];
  workflow?: CorrespondenceWorkflow | null;
  currentArea?: string;
  destinationArea?: string;
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
      <span className="text-[#C5A059] dark:text-[#E2C785] font-black underline decoration-[#C5A059]/50 bg-amber-500/10 px-0.5 rounded">
        {match}
      </span>
      {after}
    </span>
  );
};

export const CcSearchCombobox: React.FC<CcSearchComboboxProps> = ({
  selectedAreas,
  onToggleArea,
  onRemoveArea,
  onClearAll,
  allNodes = [],
  workflow = null,
  currentArea = '',
  destinationArea = '',
  getResponsibleForArea,
  placeholder = 'Buscar área, funcionario o entidad externa para C.C....',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lista unificada de todas las áreas disponibles para C.C.
  const allCcOptions = useMemo<CcOption[]>(() => {
    const rawNodes = (allNodes && allNodes.length > 0)
      ? allNodes
      : (workflow?.nodes && workflow.nodes.length > 0)
      ? workflow.nodes
      : DEFAULT_ORGANIGRAM_NODES;

    const list: CcOption[] = [];
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

    rawNodes.forEach((node) => {
      const areaTitle = (node.areaKey || node.title || '').trim();
      if (!areaTitle) return;
      const key = areaTitle.toUpperCase();
      if (addedAreas.has(key)) return;
      
      // Omitir si es el destino principal actual
      if (destinationArea && destinationArea.toUpperCase() === key) return;

      const funcionario = resolveResponsible(areaTitle, node);

      list.push({
        id: node.id || `node-${key}`,
        area: areaTitle,
        funcionario,
        node,
      });
      addedAreas.add(key);
    });

    return list;
  }, [allNodes, workflow, destinationArea, getResponsibleForArea]);

  // Filtrado reactivo e inteligente
  const filteredOptions = useMemo(() => {
    const q = normalizeText(searchTerm);
    if (!q) return allCcOptions;

    return allCcOptions.filter((item) => {
      const matchArea = normalizeText(item.area).includes(q);
      const matchFuncionario = normalizeText(item.funcionario).includes(q);
      return matchArea || matchFuncionario;
    });
  }, [allCcOptions, searchTerm]);

  // Cerrar al hacer clic fuera del contenedor
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (area: string) => {
    onToggleArea(area);
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const handleAddCustom = (customText: string) => {
    const trimmed = customText.trim();
    if (!trimmed) return;
    onToggleArea(trimmed);
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} className="space-y-2 w-full">
      {/* Chips de Áreas seleccionadas en C.C. */}
      {selectedAreas.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white/80 dark:bg-slate-900/60 rounded-xl border border-amber-200/80 dark:border-amber-800/40">
          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mr-1">
            <Copy className="w-3 h-3 text-[#C5A059]" />
            <span>({selectedAreas.length})</span>
          </div>

          {selectedAreas.map((areaTitle) => (
            <span
              key={areaTitle}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-[#C5A059] text-slate-950 shadow-xs group animate-fadeIn"
            >
              <Building2 className="w-3 h-3 text-slate-950/70 shrink-0" />
              <span className="truncate max-w-[180px]">{areaTitle}</span>
              <button
                type="button"
                onClick={() => onRemoveArea(areaTitle)}
                className="w-4 h-4 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-[10px] cursor-pointer transition-colors"
                title={`Quitar ${areaTitle} de C.C.`}
              >
                ✕
              </button>
            </span>
          ))}

          {selectedAreas.length > 1 && onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[10px] font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:underline ml-auto cursor-pointer"
            >
              Limpiar todas
            </button>
          )}
        </div>
      )}

      {/* Input con Motor de Búsqueda */}
      <div className="relative">
        <div
          className={`relative flex items-center bg-white dark:bg-[#07130E] border rounded-xl transition-all shadow-xs ${
            isOpen
              ? 'border-[#C5A059] ring-2 ring-[#C5A059]/20'
              : 'border-slate-300 dark:border-amber-800/40'
          } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <Search className={`w-4 h-4 ml-3 mr-2 shrink-0 ${isOpen ? 'text-[#C5A059]' : 'text-slate-400'}`} />

          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            placeholder={placeholder}
            disabled={disabled}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsOpen(false);
              if (e.key === 'Enter') {
                e.preventDefault();
                const trimmed = searchTerm.trim();
                if (!trimmed) return;
                const exactMatch = filteredOptions.find(
                  (o) => normalizeText(o.area) === normalizeText(trimmed)
                );
                if (exactMatch) {
                  handleToggle(exactMatch.area);
                } else if (filteredOptions.length === 1) {
                  handleToggle(filteredOptions[0].area);
                } else {
                  handleAddCustom(trimmed);
                }
              }
            }}
            className="w-full bg-transparent py-2.5 pr-14 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
          />

          {/* Botones de acción derecha */}
          <div className="absolute right-2 flex items-center gap-1">
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Limpiar búsqueda"
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
              className="p-1 rounded-md text-slate-400 hover:text-[#C5A059] transition-colors cursor-pointer"
              title={isOpen ? 'Cerrar opciones' : 'Desplegar áreas disponibles'}
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#C5A059]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Dropdown flotante con lista de resultados y motor de búsqueda */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-64 overflow-y-auto bg-white dark:bg-[#07130E] border border-slate-200 dark:border-amber-800/60 rounded-xl shadow-2xl p-1.5 space-y-1 animate-fadeIn backdrop-blur-md">
            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 dark:border-slate-800 mb-1">
              <span>Áreas y Funcionarios para Copia (C.C.)</span>
              <span className="text-amber-600 dark:text-amber-400">Clic para alternar</span>
            </div>

            {filteredOptions.length > 0 ? (
              <>
                {filteredOptions.map((item) => {
                  const isSelected = selectedAreas.some(
                    (a) => a.toUpperCase() === item.area.toUpperCase()
                  );

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleToggle(item.area)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/15 text-amber-900 dark:text-amber-200 font-bold border border-amber-500/30'
                          : 'hover:bg-slate-100 dark:hover:bg-amber-950/30 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold uppercase truncate flex items-center gap-1.5">
                          <Building2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#C5A059]' : 'text-slate-400'}`} />
                          <HighlightedText text={item.area} query={searchTerm} />
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate pl-5">
                          <User className="w-3 h-3 text-[#C5A059] shrink-0" />
                          <span className="truncate">
                            <HighlightedText text={item.funcionario} query={searchTerm} />
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-md bg-[#C5A059] text-slate-950 flex items-center justify-center shadow-xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border border-slate-300 dark:border-slate-700 hover:border-[#C5A059] flex items-center justify-center text-slate-400 text-xs">
                            <Plus className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                {searchTerm.trim() &&
                  !allCcOptions.some((o) => normalizeText(o.area) === normalizeText(searchTerm.trim())) && (
                    <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleAddCustom(searchTerm)}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>
                          Agregar "<strong>{searchTerm.trim()}</strong>" como entidad o copia externa
                        </span>
                      </button>
                    </div>
                  )}
              </>
            ) : (
              <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">
                <span>No se encontró área interna coincidente con "<strong>{searchTerm}</strong>".</span>
                {searchTerm.trim() && (
                  <button
                    type="button"
                    onClick={() => handleAddCustom(searchTerm)}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-bold border border-amber-500/30 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar "{searchTerm.trim()}" a C.C.</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CcSearchCombobox;
