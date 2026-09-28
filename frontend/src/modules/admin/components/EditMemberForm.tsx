import React, { useState, useEffect } from 'react';
import { api } from '@config/api';
import toast from 'react-hot-toast';
import { User, CreditCard, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';

interface EditMemberFormProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditMemberForm: React.FC<EditMemberFormProps> = ({ userId, onClose, onSuccess }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // User / Person
    firstName: '',
    lastName: '',
    documentId: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: 'M',
    maritalStatus: 'S',
    nationality: 'Boliviana',
    profession: '',
    company: '',
    address: '',
    personType: 'SOCIO',
    
    // Membership
    membershipId: '',
    membershipNumber: '',
    typeCode: 'TIT',
    status: 'ACTIVA',
  });

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        const response = await api.get(`/members/user/${userId}`);
        if (response.data.success && response.data.data) {
          const profile = response.data.data;
          setFormData({
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            documentId: profile.documentId || '',
            email: profile.email || '',
            phone: profile.phone || profile.mobile || '',
            birthDate: profile.birthDate || '',
            gender: profile.gender || 'M',
            maritalStatus: profile.maritalStatus || 'S',
            nationality: profile.nationality || 'Boliviana',
            profession: profile.profession || '',
            company: profile.company || '',
            address: profile.address || '',
            personType: profile.personType || 'SOCIO',
            membershipId: profile.membershipId || '',
            membershipNumber: profile.membershipNumber || '',
            typeCode: profile.typeCode || 'TIT',
            status: profile.status || 'ACTIVA',
          });
        }
      } catch (error) {
        console.error('Error fetching member details:', error);
        toast.error('No se pudieron cargar los datos del socio');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchMemberData();
    }
  }, [userId, onClose]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (!formData.firstName || !formData.lastName || !formData.documentId || !formData.email) {
      toast.error('Complete los campos obligatorios del Paso 1');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.membershipNumber || !formData.typeCode) {
      toast.error('Complete los campos obligatorios del Paso 2');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        birthDate: formData.birthDate ? new Date(formData.birthDate).toISOString() : undefined,
      };

      await api.put(`/members/user/${userId}`, payload);
      toast.success('Socio actualizado correctamente');
      onSuccess();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Error al actualizar al socio';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center theme-search-bg backdrop-blur-md p-4">
        <div className="glass-panel border-brand-gold/30 p-12 rounded-2xl flex flex-col items-center shadow-[0_0_40px_rgba(212,175,55,0.15)]">
          <Loader2 className="w-10 h-10 animate-spin text-brand-gold mb-4" />
          <p className="text-brand-gold tracking-widest uppercase font-semibold">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center theme-search-bg backdrop-blur-md p-4">
      <div className="glass-panel border-brand-gold/30 p-0 w-full max-w-4xl animate-scaleIn rounded-2xl shadow-[0_0_40px_rgba(212,175,55,0.15)] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-brand-gold/20 flex justify-between items-center theme-header-bg shrink-0">
          <div>
            <h2 className="text-2xl font-light text-brand-gold tracking-widest serif-brand uppercase">
              Edición de Socio
            </h2>
            <p className="text-brand-gold/50 text-[10px] tracking-widest uppercase mt-1">Actualizar Datos Personales y Membresía</p>
          </div>
          <div className="flex gap-2">
            <div className={`w-3 h-3 rounded-full ${step === 1 ? 'bg-brand-gold shadow-[0_0_10px_rgba(212,175,55,0.8)]' : 'bg-gray-600'}`}></div>
            <div className={`w-3 h-3 rounded-full ${step === 2 ? 'bg-brand-gold shadow-[0_0_10px_rgba(212,175,55,0.8)]' : 'bg-gray-600'}`}></div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
          
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-2 mb-4 border-b border-brand-gold/10 pb-2">
                <User className="text-brand-gold w-5 h-5" />
                <h3 className="text-lg font-bold tracking-widest uppercase theme-text">Paso 1: Datos Personales</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Nombres *</label>
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required className="w-full glass-input text-sm" />
                </div>
                <div>
                  <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Apellidos *</label>
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required className="w-full glass-input text-sm" />
                </div>
                <div>
                  <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">CI / Pasaporte *</label>
                  <input type="text" name="documentId" value={formData.documentId} onChange={handleChange} required className="w-full glass-input text-sm" />
                </div>
                <div>
                  <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Fecha Nacimiento</label>
                  <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className="w-full glass-input text-sm" />
                </div>
                <div>
                  <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Email *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full glass-input text-sm" />
                </div>
                <div>
                  <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Teléfono Celular</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full glass-input text-sm" />
                </div>
                <div>
                  <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Nacionalidad</label>
                  <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} className="w-full glass-input text-sm" />
                </div>
                <div>
                  <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Profesión</label>
                  <input type="text" name="profession" value={formData.profession} onChange={handleChange} className="w-full glass-input text-sm" />
                </div>
                <div className="md:col-span-1">
                  <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Dirección de Residencia</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full glass-input text-sm" />
                </div>
                <div className="md:col-span-1">
                  <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Tipo de Acceso / Socio *</label>
                  <div className="flex flex-col gap-3 mt-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="personType" 
                        value="SOCIO" 
                        checked={formData.personType === 'SOCIO'} 
                        onChange={handleChange}
                        className="text-brand-gold focus:ring-brand-gold accent-brand-gold w-4 h-4"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-brand-gold transition-colors">Socio</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="personType" 
                        value="RECIPROCITY" 
                        checked={formData.personType === 'RECIPROCITY'} 
                        onChange={handleChange}
                        className="text-brand-gold focus:ring-brand-gold accent-brand-gold w-4 h-4"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-brand-gold transition-colors">Socio de Reciprocidad</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="personType" 
                        value="EXTERNAL" 
                        checked={formData.personType === 'EXTERNAL'} 
                        onChange={handleChange}
                        className="text-brand-gold focus:ring-brand-gold accent-brand-gold w-4 h-4"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-brand-gold transition-colors">Externo</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-2 mb-4 border-b border-brand-gold/10 pb-2">
                <CreditCard className="text-brand-gold w-5 h-5" />
                <h3 className="text-lg font-bold tracking-widest uppercase theme-text">Paso 2: Datos de Membresía</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Número de Membresía *</label>
                  <input type="text" name="membershipNumber" value={formData.membershipNumber} onChange={handleChange} required className="w-full glass-input text-sm" />
                </div>
                <div>
                  <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Tipo (Código) *</label>
                  <select name="typeCode" value={formData.typeCode} onChange={handleChange} className="w-full glass-input text-sm appearance-none">
                    <option value="TIT" className="text-black">Titular (TIT)</option>
                    <option value="FAM" className="text-black">Familiar (FAM)</option>
                    <option value="VIT" className="text-black">Vitalicio (VIT)</option>
                    <option value="HON" className="text-black">Honorario (HON)</option>
                  </select>
                </div>
                <div>
                  <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Estado Actual</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full glass-input text-sm appearance-none">
                    <option value="ACTIVA" className="text-black">Activa</option>
                    <option value="SUSPENDIDA" className="text-black">Suspendida</option>
                    <option value="BLOQUEADA" className="text-black">Bloqueada</option>
                    <option value="EN VENTA" className="text-black">En Venta</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-8 bg-brand-gold/5 p-4 rounded-xl border border-brand-gold/10">
                <p className="text-[11px] theme-text-muted italic tracking-wide">
                  Nota: La edición de vehículos, beneficiarios y cuotas se realiza desde los módulos correspondientes en la plataforma para mantener un historial ordenado.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-brand-gold/20 flex justify-between theme-header-bg shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-3 text-sm font-bold tracking-widest uppercase theme-text-muted hover:text-white transition-colors"
          >
            Cancelar
          </button>
          
          <div className="flex gap-4">
            {step === 2 && (
              <button 
                type="button" 
                onClick={() => setStep(1)}
                className="glass-button-secondary px-6 py-3 text-sm font-bold tracking-widest uppercase flex items-center gap-2"
              >
                <ArrowLeft size={16} /> Volver
              </button>
            )}
            
            {step === 1 ? (
              <button 
                type="button" 
                onClick={handleNext}
                className="glass-button-primary px-8 py-3 text-sm font-bold tracking-widest uppercase flex items-center gap-2"
              >
                Siguiente <ArrowRight size={16} />
              </button>
            ) : (
              <button 
                type="button" 
                onClick={handleSubmit}
                disabled={saving}
                className="bg-brand-gold text-black hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 text-sm font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] rounded-xl flex items-center gap-2"
              >
                {saving ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</>
                ) : (
                  'Guardar Cambios'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
