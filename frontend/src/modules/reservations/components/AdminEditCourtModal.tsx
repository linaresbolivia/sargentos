import React, { useState, useEffect } from 'react';
import { api } from '@config/api';
import toast from 'react-hot-toast';
import { 
  X, 
  MapPin, 
  Dumbbell, 
  FileText, 
  DollarSign, 
  Check, 
  Sparkles, 
  Power,
  Layers,
  Clock,
  Plus
} from 'lucide-react';

interface Court {
  id: string;
  name: string;
  sport: string;
  description?: string | null;
  hourlyRate?: number;
  guestRate?: number;
  isActive?: boolean;
  openingTime?: string;
  closingTime?: string;
}

interface AdminEditCourtModalProps {
  isOpen: boolean;
  onClose: () => void;
  courts: Court[];
  onSuccess: () => void;
  selectedCourtForEdit?: Court | null;
}

const AVAILABLE_SPORTS = [
  'Tenis',
  'Pádel',
  'Frontón',
  'Raquet / Wally',
  'Polifuncional',
  'Ping Pong',
  'Gimnasio',
  'Otro'
];

export const AdminEditCourtModal: React.FC<AdminEditCourtModalProps> = ({
  isOpen,
  onClose,
  courts,
  onSuccess,
  selectedCourtForEdit
}) => {
  const [selectedCourtId, setSelectedCourtId] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [sport, setSport] = useState('Tenis');
  const [description, setDescription] = useState('');
  const [guestRate, setGuestRate] = useState<number>(50);
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [openingTime, setOpeningTime] = useState<string>('06:00');
  const [closingTime, setClosingTime] = useState<string>('22:00');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (selectedCourtForEdit) {
      setIsCreatingNew(false);
      setSelectedCourtId(selectedCourtForEdit.id);
      loadCourtData(selectedCourtForEdit);
    } else if (courts.length > 0) {
      setIsCreatingNew(false);
      setSelectedCourtId(courts[0].id);
      loadCourtData(courts[0]);
    } else {
      handleStartNewCourt();
    }
  }, [selectedCourtForEdit, courts, isOpen]);

  const loadCourtData = (court: Court) => {
    setName(court.name || '');
    setSport(court.sport || 'Tenis');
    setDescription(court.description || '');
    setGuestRate(court.guestRate !== undefined ? court.guestRate : 50);
    setHourlyRate(court.hourlyRate !== undefined ? court.hourlyRate : 0);
    setIsActive(court.isActive !== undefined ? court.isActive : true);
    setOpeningTime(court.openingTime || '06:00');
    setClosingTime(court.closingTime || '22:00');
  };

  const handleSelectCourtChange = (courtId: string) => {
    if (courtId === 'NEW') {
      handleStartNewCourt();
      return;
    }
    setIsCreatingNew(false);
    setSelectedCourtId(courtId);
    const found = courts.find(c => c.id === courtId);
    if (found) loadCourtData(found);
  };

  const handleStartNewCourt = () => {
    setIsCreatingNew(true);
    setSelectedCourtId('NEW');
    setName('');
    setSport('Tenis');
    setDescription('');
    setGuestRate(50);
    setHourlyRate(0);
    setIsActive(true);
    setOpeningTime('06:00');
    setClosingTime('22:00');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sport.trim()) {
      toast.error('El nombre y la disciplina son obligatorios');
      return;
    }

    setIsSaving(true);
    try {
      if (isCreatingNew) {
        await api.post('/reservations/courts', {
          name: name.trim(),
          sport: sport.trim(),
          description: description.trim() || null,
          guestRate: Number(guestRate) || 0,
          hourlyRate: Number(hourlyRate) || 0,
          isActive,
          openingTime,
          closingTime
        });
        toast.success('¡Cancha / Espacio creado exitosamente!');
      } else {
        await api.put(`/reservations/courts/${selectedCourtId}`, {
          name: name.trim(),
          sport: sport.trim(),
          description: description.trim() || null,
          guestRate: Number(guestRate) || 0,
          hourlyRate: Number(hourlyRate) || 0,
          isActive,
          openingTime,
          closingTime
        });
        toast.success('¡Datos de la cancha actualizados!');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving court:', err);
      toast.error(err.response?.data?.error || 'Error al guardar datos de la cancha');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0b1812] border-2 border-brand-gold/50 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-brand-gold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold block">
                Gestión de Instalaciones
              </span>
              <h3 className="text-lg font-bold text-white">
                {isCreatingNew ? 'Registrar Nueva Cancha / Espacio' : 'Editar Cancha / Espacio Deportivo'}
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-xl text-gray-400 hover:text-white hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* Court Selector & New Button */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
              Selecciona Cancha a Modificar:
            </label>
            <select
              value={isCreatingNew ? 'NEW' : selectedCourtId}
              onChange={e => handleSelectCourtChange(e.target.value)}
              className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-brand-gold"
            >
              {courts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.sport}) - {c.isActive ? '🟢 Activa' : '🔴 Inactiva'}
                </option>
              ))}
              <option value="NEW">+ [Registrar Nueva Cancha]</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleStartNewCourt}
            className="mt-5 px-3 py-2 rounded-xl bg-brand-gold/15 hover:bg-brand-gold/25 border border-brand-gold/30 text-brand-gold text-xs font-bold flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva</span>
          </button>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Name */}
          <div>
            <label className="block text-[11px] font-bold text-brand-gold uppercase tracking-wider mb-1">
              Nombre de la Cancha / Espacio *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej. Cancha Tenis 1, Espacio Frontón 2, Cancha Pádel 1"
              className="w-full bg-black/60 border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold text-sm font-semibold"
            />
          </div>

          {/* Sport & Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                Disciplina / Deporte *
              </label>
              <select
                value={sport}
                onChange={e => setSport(e.target.value)}
                className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2.5 text-white text-xs font-semibold focus:outline-none focus:border-brand-gold"
              >
                {AVAILABLE_SPORTS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                Estado Operativo
              </label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`w-full py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  isActive 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{isActive ? '🟢 Habilitada para Reservas' : '🔴 Inactiva / Mantenimiento'}</span>
              </button>
            </div>
          </div>

          {/* Rates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-black/40 rounded-2xl border border-white/10">
            <div>
              <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                Arancel Invitado Adulto (Bs.)
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={guestRate}
                onChange={e => setGuestRate(Number(e.target.value))}
                placeholder="50"
                className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-brand-gold font-mono font-bold text-sm focus:outline-none focus:border-brand-gold"
              />
              <span className="text-[10px] text-gray-400 mt-0.5 block">Arancel cobrado por invitado externo</span>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                Tarifa Cancha / Hora (Bs.)
              </label>
              <input
                type="number"
                min="0"
                step="10"
                value={hourlyRate}
                onChange={e => setHourlyRate(Number(e.target.value))}
                placeholder="0"
                className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-brand-gold"
              />
              <span className="text-[10px] text-emerald-400 mt-0.5 block">0 Bs. para socios del club</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1">
              Descripción / Características de la Cancha
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ej. Tierra batida / Arcilla con iluminación LED reglamentaria para torneos"
              className="w-full bg-black/60 border border-white/20 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold text-xs leading-relaxed"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-3 border-t border-white/10">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-brand-gold via-yellow-500 to-brand-gold hover:from-yellow-400 hover:to-brand-gold text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isCreatingNew ? 'Crear Cancha' : 'Guardar Cambios'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs"
            >
              Cancelar
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
