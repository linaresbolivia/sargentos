import React, { useState } from 'react';
import { api } from '@config/api';
import toast from 'react-hot-toast';
import { User, CreditCard, ArrowRight, ArrowLeft } from 'lucide-react';

interface MassiveMemberFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const MassiveMemberForm: React.FC<MassiveMemberFormProps> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

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
    city: 'La Paz',
    password: '',
    
    // Membership
    membershipNumber: '',
    typeCode: 'TIT',
    status: 'ACTIVA',
    purchaseValue: 0,
    currentValue: 0,
    acquisitionMethod: 'COMPRA DIRECTA',
    isTransferable: true,
    hasShares: false,
    sharesQuantity: 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Type checking for inputs
    let parsedValue: any = value;
    if (type === 'number') parsedValue = Number(value);
    if (type === 'checkbox') parsedValue = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({ ...prev, [name]: parsedValue }));
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

    setLoading(true);
    try {
      const payload = {
        ...formData,
        birthDate: formData.birthDate ? new Date(formData.birthDate).toISOString() : undefined,
      };

      await api.post('/members/massive', payload);
      toast.success('Socio y membresía registrados correctamente');
      onSuccess();
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Error al registrar al socio';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center theme-search-bg backdrop-blur-md p-4">
      <div className="glass-panel border-brand-gold/30 p-0 w-full max-w-4xl animate-scaleIn rounded-2xl shadow-[0_0_40px_rgba(212,175,55,0.15)] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-brand-gold/20 flex justify-between items-center theme-header-bg shrink-0">
          <div>
            <h2 className="text-2xl font-light text-brand-gold tracking-widest serif-brand uppercase">
              Alta de Socios
            </h2>
            <p className="text-brand-gold/50 text-[10px] tracking-widest uppercase mt-1">Alta unificada de Persona y Patrimonio</p>
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
                <div className="md:col-span-2">
                  <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Dirección de Residencia</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full glass-input text-sm" />
                </div>
                <div className="md:col-span-2 bg-brand-gold/5 p-4 rounded-xl border border-brand-gold/10">
                  <label className="block theme-text text-sm tracking-widest mb-2 font-bold">Contraseña de Acceso Web</label>
                  <p className="text-[10px] theme-text-muted uppercase mb-3 tracking-wide">Deje en blanco para usar la contraseña por defecto: CHLS2024!</p>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full md:w-1/2 glass-input text-sm" placeholder="Contraseña personalizada..." />
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                
                <div>
                  <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Valor de Compra ($USD)</label>
                  <input type="number" name="purchaseValue" value={formData.purchaseValue} onChange={handleChange} className="w-full glass-input text-sm" />
                </div>
                <div>
                  <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Valor Actual ($USD)</label>
                  <input type="number" name="currentValue" value={formData.currentValue} onChange={handleChange} className="w-full glass-input text-sm" />
                </div>
                <div>
                  <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Forma de Adquisición</label>
                  <select name="acquisitionMethod" value={formData.acquisitionMethod} onChange={handleChange} className="w-full glass-input text-sm appearance-none">
                    <option value="COMPRA DIRECTA" className="text-black">Compra Directa</option>
                    <option value="TRASPASO" className="text-black">Traspaso</option>
                    <option value="HERENCIA" className="text-black">Herencia</option>
                  </select>
                </div>

                <div className="flex items-center justify-between glass-input text-sm p-4 rounded-xl">
                  <span className="font-semibold text-xs tracking-widest uppercase">¿Tiene Acciones?</span>
                  <input type="checkbox" name="hasShares" checked={formData.hasShares} onChange={handleChange} className="w-5 h-5 accent-brand-gold" />
                </div>

                {formData.hasShares && (
                  <div>
                    <label className="block theme-subtitle text-[10px] uppercase tracking-widest mb-2 font-semibold">Cantidad de Acciones</label>
                    <input type="number" name="sharesQuantity" value={formData.sharesQuantity} onChange={handleChange} className="w-full glass-input text-sm" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-brand-gold/20 flex gap-4 theme-header-bg shrink-0">
          <button 
            onClick={onClose}
            className="flex-1 theme-text hover:text-brand-gold transition-colors py-3 rounded-lg font-semibold uppercase text-xs tracking-widest border border-brand-gold/20 hover:bg-brand-gold/10"
          >
            Cancelar
          </button>
          
          {step === 1 ? (
            <button 
              onClick={handleNext}
              className="flex-1 glass-button-primary py-3 rounded-lg font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2"
            >
              Siguiente <ArrowRight size={16} />
            </button>
          ) : (
            <div className="flex-1 flex gap-2">
              <button 
                onClick={() => setStep(1)}
                className="w-1/3 glass-button-secondary py-3 rounded-lg font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} /> Atrás
              </button>
              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="w-2/3 bg-brand-gold text-black hover:bg-yellow-500 py-3 rounded-lg font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Crear Socio'}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
