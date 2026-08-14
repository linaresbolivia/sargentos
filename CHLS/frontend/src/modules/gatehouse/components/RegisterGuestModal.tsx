import React, { useState } from 'react';
import { X, UserPlus, Car, CreditCard, Loader2 } from 'lucide-react';
import { api } from '@config/api';

interface RegisterGuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  host: any; // The member
  personType?: string;
  onSuccess: () => void;
}

export const RegisterGuestModal: React.FC<RegisterGuestModalProps> = ({
  isOpen,
  onClose,
  host,
  personType,
  onSuccess
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !host) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName) {
      setError('El nombre y apellido son obligatorios');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.post('/access/guest', {
        hostId: host.personId || host.id,
        firstName,
        lastName,
        documentId,
        vehiclePlate,
        personType: personType || 'GUEST'
      });
      
      onSuccess();
      setFirstName('');
      setLastName('');
      setDocumentId('');
      setVehiclePlate('');
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Error al registrar invitado');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-white dark:bg-[#0a1d13] w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-white/5 flex flex-col max-h-full">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0a1d13]/80 backdrop-blur-md z-10">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              {personType === 'EXTERNAL' ? 'Nuevo Externo' : 
               personType === 'RECIPROCITY' ? 'Nuevo Socio de Reciprocidad' : 
               personType === 'SOCIO' ? 'Nuevo Socio' :
               'Nuevo Invitado'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">Anfitrión: <span className="text-brand-gold font-bold">{host.fullName}</span></p>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-full transition-colors group"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl text-sm font-medium text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Nombre *</label>
                <div className="relative">
                  <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ej. Carlos"
                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-brand-gold/20 rounded-2xl py-3.5 pl-12 pr-4 text-gray-900 dark:text-white focus:outline-none focus:border-brand-gold transition-colors font-medium placeholder:font-normal"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Apellido *</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ej. Perez"
                  className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-brand-gold/20 rounded-2xl py-3.5 px-4 text-gray-900 dark:text-white focus:outline-none focus:border-brand-gold transition-colors font-medium placeholder:font-normal"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Documento de Identidad <span className="lowercase text-gray-400 font-normal">(opcional)</span></label>
              <div className="relative">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  placeholder="Carnet de Identidad"
                  className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-brand-gold/20 rounded-2xl py-3.5 pl-12 pr-4 text-gray-900 dark:text-white focus:outline-none focus:border-brand-gold transition-colors font-medium placeholder:font-normal"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Vehículo <span className="lowercase text-gray-400 font-normal">(opcional)</span></label>
              <div className="relative">
                <Car className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  placeholder="Placa del vehículo"
                  className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-brand-gold/20 rounded-2xl py-3.5 pl-12 pr-4 text-gray-900 dark:text-white focus:outline-none focus:border-brand-gold transition-colors font-medium placeholder:font-normal uppercase"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-6 border-t border-gray-100 dark:border-white/5">
              <button
                type="submit"
                disabled={isSubmitting || !firstName || !lastName}
                className="w-full bg-brand-gold text-white hover:bg-[#b8860b] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-brand-gold/20 transition-all rounded-2xl py-4 font-bold text-lg flex items-center justify-center gap-2 group"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    Registrar y Dar Acceso
                  </>
                )}
              </button>
              <p className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 mt-4">
                Esta acción creará un registro de acceso de ingreso inmediatamente.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
