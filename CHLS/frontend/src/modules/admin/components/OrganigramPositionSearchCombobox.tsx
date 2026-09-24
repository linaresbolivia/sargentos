import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  X,
  Check,
  ChevronDown,
  Building2,
  Sparkles,
  User,
  Mail,
  Clock,
  Layers,
  Shield,
  Briefcase,
  UserX,
} from 'lucide-react';
import { WorkflowNode } from '@modules/correspondence/types/correspondence.types';
import { DEFAULT_ORGANIGRAM_NODES } from '@modules/correspondence/utils/organigramWorkflowService';

interface OrganigramPositionSearchComboboxProps {
  nodes?: WorkflowNode[];
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
  baseRole?: string;
  placeholder?: string;
  disabled?: boolean;
}

// Normaliza texto eliminando acentos y caracteres especiales para búsqueda ultra-flexible
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

  const terms = query
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter((t) => t.length > 0);

  if (terms.length === 0) {
    return <span className={className}>{text}</span>;
  }

  try {
    const regex = new RegExp(`(${terms.join('|')})`, 'gi');
    const parts = text.split(regex);

    return (
      <span className={className}>
        {parts.map((part, i) => {
          const isMatch = terms.some((term) => normalizeText(term) === normalizeText(part));
          return isMatch ? (
            <span
              key={i}
              className="text-emerald-300 bg-emerald-500/30 px-1 py-0.5 rounded font-black border border-emerald-500/40"
            >
              {part}
            </span>
          ) : (
            <React.Fragment key={i}>{part}</React.Fragment>
          );
        })}
      </span>
    );
  } catch {
    return <span className={className}>{text}</span>;
  }
};

// Configuración de estilo y badges por tipo de departamento
const getNodeTypeStyle = (type: string) => {
  switch (type) {
    case 'GERENCIA':
    case 'DIRECTORIO':
      return {
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        label: 'Gerencia / MAE',
      };
    case 'FINANZAS':
      return {
        badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        label: 'Finanzas & Tesorería',
      };
    case 'SECRETARIA':
      return {
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        label: 'Secretaría',
      };
    case 'COMPRAS':
      return {
        badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
        label: 'Compras & Contrataciones',
      };
    case 'OPERACIONES':
      return {
        badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
        label: 'Operaciones & Mtto.',
      };
    case 'RECEPCION':
      return {
        badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        label: 'Atención al Socio & Caseta',
      };
    case 'LEGAL':
      return {
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        label: 'Asesoría Jurídica',
      };
    case 'DEPORTES':
      return {
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        label: 'Deportes & Hípica',
      };
    case 'ARCHIVO':
      return {
        badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
        label: 'Archivo Central',
      };
    default:
      return {
        badge: 'bg-slate-600/20 text-slate-300 border-slate-600/40',
        label: type,
      };
  }
};

type DepartmentFilter = 'ALL' | 'GERENCIA' | 'FINANZAS' | 'OPERACIONES' | 'RECEPCION' | 'COMPRAS' | 'DEPORTES' | 'SECRETARIA' | 'LEGAL';

export const OrganigramPositionSearchCombobox: React.FC<OrganigramPositionSearchComboboxProps> = ({
  nodes = DEFAULT_ORGANIGRAM_NODES,
  selectedNodeId,
  onSelectNode,
  baseRole = 'STAFF',
  placeholder = 'Buscar puesto, área o departamento del organigrama...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DepartmentFilter>('ALL');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Nodo actualmente seleccionado
  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId);
  }, [nodes, selectedNodeId]);

  // Filtrado reactivo como motor de búsqueda
  const filteredNodes = useMemo(() => {
    let result = nodes;

    // 1. Filtro por categoría departamental
    if (selectedCategory !== 'ALL') {
      result = result.filter((node) => {
        if (selectedCategory === 'GERENCIA') return node.type === 'GERENCIA' || node.type === 'DIRECTORIO';
        if (selectedCategory === 'OPERACIONES') return node.type === 'OPERACIONES' || node.type === 'ARCHIVO';
        return node.type === selectedCategory;
      });
    }

    // 2. Filtro por texto multitérmino
    const q = normalizeText(searchTerm);
    if (!q) return result;

    const terms = q.split(/\s+/).filter((t) => t.length > 0);

    return result.filter((node) => {
      const fullText = normalizeText(
        `${node.title || ''} ${node.subtitle || ''} ${node.manager || ''} ${node.areaKey || ''} ${node.type || ''} ${node.email || ''}`
      );
      // Cada término de búsqueda debe estar presente en el conjunto de campos del puesto
      return terms.every((term) => fullText.includes(term));
    });
  }, [nodes, selectedCategory, searchTerm]);

  // Categorías con conteos dinámicos
  const categoryChips = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: nodes.length,
      GERENCIA: nodes.filter((n) => n.type === 'GERENCIA' || n.type === 'DIRECTORIO').length,
      FINANZAS: nodes.filter((n) => n.type === 'FINANZAS').length,
      OPERACIONES: nodes.filter((n) => n.type === 'OPERACIONES' || n.type === 'ARCHIVO').length,
      RECEPCION: nodes.filter((n) => n.type === 'RECEPCION').length,
      COMPRAS: nodes.filter((n) => n.type === 'COMPRAS').length,
      DEPORTES: nodes.filter((n) => n.type === 'DEPORTES').length,
      SECRETARIA: nodes.filter((n) => n.type === 'SECRETARIA').length,
      LEGAL: nodes.filter((n) => n.type === 'LEGAL').length,
    };

    return [
      { id: 'ALL' as DepartmentFilter, label: 'Todos', count: counts.ALL },
      { id: 'GERENCIA' as DepartmentFilter, label: 'Gerencia', count: counts.GERENCIA },
      { id: 'FINANZAS' as DepartmentFilter, label: 'Finanzas', count: counts.FINANZAS },
      { id: 'OPERACIONES' as DepartmentFilter, label: 'Operaciones', count: counts.OPERACIONES },
      { id: 'RECEPCION' as DepartmentFilter, label: 'Atención/Caseta', count: counts.RECEPCION },
      { id: 'COMPRAS' as DepartmentFilter, label: 'Compras', count: counts.COMPRAS },
      { id: 'DEPORTES' as DepartmentFilter, label: 'Deportes', count: counts.DEPORTES },
      { id: 'SECRETARIA' as DepartmentFilter, label: 'Secretaría', count: counts.SECRETARIA },
      { id: 'LEGAL' as DepartmentFilter, label: 'Legal', count: counts.LEGAL },
    ].filter((cat) => cat.count > 0);
  }, [nodes]);

  // Reset highlight index al filtrar
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredNodes]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.querySelector('[data-highlighted="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (nodeId: string) => {
    onSelectNode(nodeId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectNode('');
    setSearchTerm('');
    if (isOpen) {
      inputRef.current?.focus();
    }
  };

  const selectedTypeStyle = selectedNode ? getNodeTypeStyle(selectedNode.type) : null;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Botón de control / Input de Búsqueda */}
      <div
        className={`relative flex items-center bg-slate-900 border transition-all rounded-xl cursor-pointer ${
          isOpen
            ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-slate-900 shadow-lg shadow-emerald-950/40'
            : selectedNode
            ? 'border-emerald-500/50 hover:border-emerald-400'
            : 'border-emerald-500/30 hover:border-emerald-500/60'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
      >
        {/* Icono de búsqueda con animación */}
        <div className="pl-3.5 pr-2 py-2.5 flex items-center shrink-0">
          <Search className={`w-4 h-4 transition-colors ${isOpen ? 'text-emerald-400 animate-pulse' : 'text-emerald-500/70'}`} />
        </div>

        {/* Input o Texto Seleccionado */}
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            placeholder={selectedNode ? `Buscando... (Actual: ${selectedNode.title})` : placeholder}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsOpen(false);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIndex((prev) => (prev < filteredNodes.length - 1 ? prev + 1 : 0));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredNodes.length - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredNodes.length > 0) {
                  handleSelect(filteredNodes[highlightedIndex]?.id || filteredNodes[0].id);
                }
              }
            }}
            className="w-full bg-transparent py-2.5 pr-20 text-xs text-white font-bold outline-none placeholder:text-slate-500"
            autoFocus
          />
        ) : (
          <div className="w-full py-2.5 pr-20 flex items-center gap-2 overflow-hidden select-none">
            {selectedNode ? (
              <div className="flex items-center gap-2 truncate">
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${selectedTypeStyle?.badge}`}>
                  {selectedTypeStyle?.label}
                </span>
                <span className="text-xs font-black text-white truncate">
                  {selectedNode.title}
                </span>
                <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                  — ({selectedNode.subtitle || selectedNode.manager})
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 font-medium truncate">
                {baseRole === 'USER'
                  ? '-- Ninguna (Socio Titular Independiente) --'
                  : '-- Seleccionar o buscar puesto del organigrama... --'}
              </span>
            )}
          </div>
        )}

        {/* Acciones en la derecha: Limpiar y Toggle Dropdown */}
        <div className="absolute right-2 flex items-center gap-1">
          {(selectedNode || searchTerm) && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Quitar puesto asignado"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen((prev) => !prev);
              if (!isOpen) setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className="p-1 rounded-md text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Menú Desplegable con Motor de Búsqueda */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-950 border-2 border-emerald-500/50 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[380px] animate-fadeIn backdrop-blur-xl"
        >
          {/* Header del Buscador: Chips de Filtro por Departamento */}
          <div className="p-2.5 border-b border-emerald-500/20 bg-slate-900/90 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-black text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Puestos del Organigrama</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                {filteredNodes.length} {filteredNodes.length === 1 ? 'coincidencia' : 'puestos'}
              </span>
            </div>

            {/* Chips de filtro rápido */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categoryChips.map((chip) => {
                const isActive = selectedCategory === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCategory(chip.id);
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                      isActive
                        ? 'bg-emerald-500 text-slate-950 shadow-sm font-black'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <span>{chip.label}</span>
                    <span className={`text-[9px] px-1 rounded-full ${isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-slate-400'}`}>
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de Puestos Filtrados */}
          <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {/* Opción para Deseleccionar / Dejar Vacío */}
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between gap-3 cursor-pointer ${
                !selectedNodeId
                  ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-200'
                  : 'hover:bg-slate-900 text-slate-400 border border-dashed border-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserX className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="font-bold text-slate-200">
                    -- Ninguna / Sin Área de Organigrama --
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Socio Titular independiente sin funciones operativas asignadas en el organigrama.
                  </p>
                </div>
              </div>
              {!selectedNodeId && <Check className="w-4 h-4 text-emerald-400" />}
            </button>

            {filteredNodes.length > 0 ? (
              filteredNodes.map((node, index) => {
                const isSelected = selectedNodeId === node.id;
                const isHighlighted = index === highlightedIndex;
                const typeStyle = getNodeTypeStyle(node.type);

                return (
                  <button
                    key={node.id}
                    type="button"
                    data-highlighted={isHighlighted}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelect(node.id)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-start justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 border border-emerald-500/50 text-white shadow-md'
                        : isHighlighted
                        ? 'bg-emerald-950/40 border border-emerald-500/30 text-white'
                        : 'hover:bg-slate-900/80 text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      {/* Título & Badge de Área */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${typeStyle.badge}`}>
                          {typeStyle.label}
                        </span>
                        <span className="font-black text-white text-xs sm:text-[13px] tracking-wide">
                          <HighlightedText text={node.title} query={searchTerm} />
                        </span>
                      </div>

                      {/* Subtítulo / Descripción de Funciones */}
                      {node.subtitle && (
                        <p className="text-[11px] text-slate-300 leading-snug">
                          <HighlightedText text={node.subtitle} query={searchTerm} />
                        </p>
                      )}

                      {/* Metadatos: Titular, Correo, SLA */}
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-wrap pt-0.5">
                        {node.manager && (
                          <span className="flex items-center gap-1 text-emerald-400/90 font-medium">
                            <User className="w-3 h-3" />
                            <HighlightedText text={node.manager} query={searchTerm} />
                          </span>
                        )}
                        {node.email && (
                          <span className="flex items-center gap-1 text-blue-400/90">
                            <Mail className="w-3 h-3" />
                            <span>{node.email}</span>
                          </span>
                        )}
                        {node.slaHours && (
                          <span className="flex items-center gap-1 text-amber-400/90">
                            <Clock className="w-3 h-3" />
                            <span>SLA {node.slaHours}h</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Check de Selección */}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center space-y-2">
                <p className="text-xs font-bold text-slate-200">
                  No se encontraron puestos para "{searchTerm}"
                </p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Prueba buscando por cargo (ej. <span className="text-emerald-400 font-semibold">Contabilidad</span>, <span className="text-emerald-400 font-semibold">Mantenimiento</span>), por palabras clave de responsabilidades (ej. <span className="text-emerald-400 font-semibold">balance</span>, <span className="text-emerald-400 font-semibold">tenis</span>, <span className="text-emerald-400 font-semibold">compras</span>) o selecciona una categoría de departamento arriba.
                </p>
              </div>
            )}
          </div>

          {/* Footer Informativo */}
          <div className="p-2 border-t border-emerald-500/20 bg-slate-900/60 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Autocompleta cargo y activa permisos automáticamente</span>
            </span>
            <span className="hidden sm:inline text-slate-500">
              Usa ↑ ↓ para navegar y Enter para elegir
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganigramPositionSearchCombobox;
