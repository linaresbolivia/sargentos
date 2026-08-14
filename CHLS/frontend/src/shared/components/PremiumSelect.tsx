import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface PremiumSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

export const PremiumSelect: React.FC<PremiumSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Seleccione una opción...',
  label,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className="w-full flex flex-col gap-1.5 relative">
      {label && <label className="text-xs md:text-sm font-medium text-gray-300 px-1">{label}</label>}

      {/* Select Toggle Box */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between glass-input text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <span className={selectedOption ? 'text-white' : 'text-gray-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 w-full z-40 glass-panel p-2 flex flex-col gap-1.5 border border-white/10 animate-fade-in shadow-2xl">
          {/* Search Box */}
          <div className="relative flex items-center mb-1">
            <Search size={14} className="absolute left-3 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full glass-input pl-8 py-1.5 text-xs md:text-sm"
              autoFocus
            />
          </div>

          {/* Option List */}
          <div className="max-h-48 overflow-y-auto flex flex-col gap-1 pr-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs md:text-sm text-left rounded-lg transition-all ${
                      isSelected
                        ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/30'
                        : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <span>{option.label}</span>
                    {isSelected && <Check size={14} className="text-indigo-400" />}
                  </button>
                );
              })
            ) : (
              <span className="text-xs text-gray-500 text-center py-2">No se encontraron resultados</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
