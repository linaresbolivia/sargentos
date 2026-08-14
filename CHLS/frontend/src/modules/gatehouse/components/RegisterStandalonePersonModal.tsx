import React, { useState, useRef, useEffect } from 'react';
import { api } from '@config/api';
import toast from 'react-hot-toast';
import { X, UserPlus, Save } from 'lucide-react';
import { AccessSearchResult } from '../../../../../backend/src/modules/accessControl/application/useCases/SearchMemberForAccessUseCase';

interface RegisterStandalonePersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  personType: 'RECIPROCITY' | 'EXTERNAL';
  initialDocumentId: string;
  onSuccess: (person: AccessSearchResult) => void;
}

export const RegisterStandalonePersonModal: React.FC<RegisterStandalonePersonModalProps> = ({
  isOpen,
  onClose,
  personType,
  initialDocumentId,
  onSuccess
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [documentId, setDocumentId] = useState(initialDocumentId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDocumentId(initialDocumentId);
      setFirstName('');
      setLastName('');
      setTimeout(() => {
        firstNameRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialDocumentId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !documentId) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/access/standalone-person', {
        firstName,
        lastName,
        documentId,
        personType
      });

      if (response.data.success) {
        toast.success(`${personType === 'RECIPROCITY' ? 'Socio de reciprocidad' : 'Externo'} registrado correctamente`);
        // Transform the result to match AccessSearchResult
        const p = response.data.data;
        const mappedResult: AccessSearchResult = {
          personId: p.id,
          fullName: `${p.firstName} ${p.lastName}`,
          documentId: p.documentId,
          photoUrl: p.photoUrl || null,
          membershipNumber: 'N/A',
          membershipType: 'N/A',
          status: 'GRANTED',
          reason: null,
          totalDebt: 0,
          lastPaymentDate: null,
          vehicles: [],
          currentLocation: 'OUTSIDE',
          personType: p.personType
        };
        onSuccess(mappedResult);
        onClose();
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Error al registrar persona');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0d2116] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-brand-gold/20 flex flex-col">
        <div className="bg-gradient-to-r from-[#133825] to-[#1a4a31] dark:from-[#0a100d] dark:to-[#133825] px-6 py-4 flex items-center justify-between shrink-0 border-b border-brand-gold/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-gold/20 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-brand-gold" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Registrar {personType === 'RECIPROCITY' ? 'Socio de Reciprocidad' : 'Externo'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Nombres *
            </label>
            <input
              ref={firstNameRef}
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#141816] border-2 border-gray-200 dark:border-white/5 rounded-xl focus:border-brand-gold focus:ring-0 text-gray-900 dark:text-white transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Apellidos *
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#141816] border-2 border-gray-200 dark:border-white/5 rounded-xl focus:border-brand-gold focus:ring-0 text-gray-900 dark:text-white transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Documento / CI *
            </label>
            <input
              type="text"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#141816] border-2 border-gray-200 dark:border-white/5 rounded-xl focus:border-brand-gold focus:ring-0 text-gray-900 dark:text-white transition-colors"
              required
            />
          </div>

          <div className="flex gap-4 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-brand-gold text-[#0a2014] rounded-xl hover:bg-brand-gold/90 transition-colors font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-brand-gold/20"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-[#0a2014] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Registrar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
