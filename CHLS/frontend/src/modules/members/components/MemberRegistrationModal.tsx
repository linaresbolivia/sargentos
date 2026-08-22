import React, { useState } from 'react';
import { 
  X, 
  Check, 
  User, 
  Shield, 
  CreditCard, 
  Users, 
  Car, 
  Camera, 
  AlertCircle, 
  FileText, 
  Plus, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  DollarSign, 
  Calendar, 
  Layers, 
  Building, 
  Briefcase, 
  Globe 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { memberAdminApi } from '../services/memberAdminApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenCashier?: (personId: string) => void;
}

export const MemberRegistrationModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  onOpenCashier 
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createdMember, setCreatedMember] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    // 1. Identidad & Estado
    documentId: '',
    docType: 'CI',
    docExtension: 'LP',
    firstName: '',
    secondName: '',
    paternalSurname: '',
    maternalSurname: '',
    marriedSurname: '',
    birthDate: '',
    gender: 'M',
    maritalStatus: 'CASADO',
    nationality: 'BOLIVIANA',
    profession: '',
    occupation: '',
    company: '',
    status: 'ACTIVO',
    customAlphaCode: '',
    isManualAlphaCode: false,
    phone: '',
    mobile: '',
    email: '',
    address: '',
    city: 'LP',
    photoUrl: '',

    // Fiscal
    fiscalNit: '',
    fiscalCompanyName: '',

    // 2. Boleta Bancaria & Fechas de Membresía
    depositVoucherNumber: '',
    depositVoucherDate: new Date().toISOString().split('T')[0],
    depositVoucherAmount: 15000,
    membershipNumber: '',
    membershipTypeCode: 'FAM',
    acquisitionMethod: 'COMPRA_DIRECTA',
    folioNumber: '',
    billingDay: 1,
    credentialDeliveryDate: new Date().toISOString().split('T')[0],
    anniversaryDate: '',
    membershipStatus: 'ACTIVA',
    collectionMethod: 'CAJA_CENTRAL',
    creditLimit: 50000,
    allowsDirectDebit: true,

    // 3. Dependientes (Regla < 25 años solo para hijos)
    beneficiaries: [
      {
        firstName: '',
        secondName: '',
        paternalSurname: '',
        maternalSurname: '',
        documentId: '',
        docExtension: 'LP',
        relationship: 'CONYUGE',
        birthDate: '',
        photoUrl: ''
      }
    ],

    // 4. Activos Múltiples: Caballos y Vehículos
    horses: [
      {
        name: '',
        assignedBox: '',
        status: 'VIVO',
        deceasedReason: ''
      }
    ],
    vehicles: [
      {
        plate: '',
        brand: '',
        model: '',
        color: ''
      }
    ]
  });

  if (!isOpen) return null;

  // Real-time Alpha Code Preview calculation
  const calculatedAlphaCode = () => {
    const p1 = (formData.paternalSurname || 'XXX').substring(0, 3).toUpperCase();
    const p2 = (formData.maternalSurname || 'XXX').substring(0, 3).toUpperCase();
    const p3 = (formData.firstName || 'X').substring(0, 1).toUpperCase();
    const p4 = (formData.secondName || (formData.firstName ? formData.firstName.substring(1, 2) : 'X')).substring(0, 1).toUpperCase();
    return `${p1}-${p2}-${p3}-${p4}`;
  };

  const currentAlphaCode = formData.isManualAlphaCode && formData.customAlphaCode 
    ? formData.customAlphaCode 
    : calculatedAlphaCode();

  // Dependents Handlers
  const addBeneficiary = () => {
    setFormData(prev => ({
      ...prev,
      beneficiaries: [
        ...prev.beneficiaries,
        {
          firstName: '',
          secondName: '',
          paternalSurname: '',
          maternalSurname: '',
          documentId: '',
          docExtension: 'LP',
          relationship: 'HIJO',
          birthDate: '',
          photoUrl: ''
        }
      ]
    }));
  };

  const removeBeneficiary = (index: number) => {
    setFormData(prev => ({
      ...prev,
      beneficiaries: prev.beneficiaries.filter((_, i) => i !== index)
    }));
  };

  const updateBeneficiary = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      beneficiaries: prev.beneficiaries.map((b, i) => i === index ? { ...b, [field]: value } : b)
    }));
  };

  // Horses Handlers
  const addHorse = () => {
    setFormData(prev => ({
      ...prev,
      horses: [
        ...prev.horses,
        {
          name: '',
          assignedBox: '',
          status: 'VIVO',
          deceasedReason: ''
        }
      ]
    }));
  };

  const removeHorse = (index: number) => {
    setFormData(prev => ({
      ...prev,
      horses: prev.horses.filter((_, i) => i !== index)
    }));
  };

  const updateHorse = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      horses: prev.horses.map((h, i) => i === index ? { ...h, [field]: value } : h)
    }));
  };

  // Vehicles Handlers
  const addVehicle = () => {
    setFormData(prev => ({
      ...prev,
      vehicles: [
        ...prev.vehicles,
        {
          plate: '',
          brand: '',
          model: '',
          color: ''
        }
      ]
    }));
  };

  const removeVehicle = (index: number) => {
    setFormData(prev => ({
      ...prev,
      vehicles: prev.vehicles.filter((_, i) => i !== index)
    }));
  };

  const updateVehicle = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      vehicles: prev.vehicles.map((v, i) => i === index ? { ...v, [field]: value } : v)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.documentId || !formData.firstName || !formData.paternalSurname || !formData.membershipNumber) {
      toast.error('Por favor completa los campos obligatorios (*)');
      return;
    }

    if (!formData.depositVoucherNumber || !formData.depositVoucherDate) {
      toast.error('La fecha y número de la Boleta de Depósito Bancario son indispensables');
      return;
    }

    // Validar membresía numérica
    const cleanMembershipNumber = String(formData.membershipNumber).replace(/[^0-9]/g, '');
    if (!cleanMembershipNumber) {
      toast.error('El número de membresía debe contener solo números (ej. 1055)');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...formData,
        customAlphaCode: currentAlphaCode,
        membershipNumber: cleanMembershipNumber,
        beneficiaries: formData.beneficiaries.filter(b => b.firstName && b.paternalSurname),
        horses: formData.horses.filter(h => h.name && h.name.trim()),
        vehicles: formData.vehicles.filter(v => v.plate && v.plate.trim())
      };

      const res = await memberAdminApi.createMember(payload);
      toast.success(`¡Socio registrado exitosamente con código ${currentAlphaCode}!`);
      setCreatedMember(res.data);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al registrar socio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#0d1311] border border-gray-300 dark:border-brand-gold/30 rounded-3xl shadow-2xl overflow-hidden my-8 text-gray-900 dark:text-white">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-brand-gold/20 flex justify-between items-center bg-gradient-to-r from-amber-500/10 via-transparent to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-brand-gold/20 flex items-center justify-center text-amber-800 dark:text-brand-gold border border-amber-300 dark:border-brand-gold/40">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white serif-brand">
                Alta de Socio & Perfil Maestro
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Formulario Único de Personas, Registro Patrimonial y Candado Antifraude (Novus / Cognos)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Post-Creation Success Actions */}
        {createdMember ? (
          <div className="p-8 space-y-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            
            <div>
              <span className="text-xs uppercase tracking-widest font-bold text-brand-gold">Registro Completado</span>
              <h3 className="text-2xl font-bold text-white mt-1">
                {formData.paternalSurname} {formData.maternalSurname} {formData.firstName}
              </h3>
              <p className="text-sm font-mono text-gray-300 mt-1">
                Código Alfa: <strong className="text-brand-gold">{currentAlphaCode}</strong> • Membresía Nro: <strong className="text-white">#{formData.membershipNumber}</strong>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 max-w-lg mx-auto text-left text-xs space-y-2 text-gray-300">
              <div className="flex justify-between">
                <span className="text-gray-400">Estado Inicial:</span>
                <span className="font-bold text-emerald-400">🟢 {formData.status} (Activo)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Boleta de Depósito:</span>
                <span className="font-bold text-white">{formData.depositVoucherNumber} (Bs {formData.depositVoucherAmount.toLocaleString()})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Dependientes Registrados:</span>
                <span className="font-bold text-white">{formData.beneficiaries.filter(b => b.firstName).length} familiar(es)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Activos Registrados:</span>
                <span className="font-bold text-white">{formData.horses.filter(h => h.name).length} caballo(s) • {formData.vehicles.filter(v => v.plate).length} auto(s)</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-4 border-t border-white/10">
              {onOpenCashier && (
                <button
                  onClick={() => {
                    onOpenCashier(createdMember.id || createdMember.person?.id);
                    onClose();
                  }}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-black font-extrabold text-xs flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-emerald-500/25"
                >
                  <DollarSign className="w-4 h-4" /> Cobrar Boleta / Cuotas en Caja
                </button>
              )}

              <button
                onClick={onClose}
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
              >
                Cerrar & Ver en Directorio
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Stepper Progress */}
            <div className="grid grid-cols-4 p-3.5 border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-black/40 text-xs font-semibold text-center">
              <button onClick={() => setStep(1)} className={`py-2 rounded-xl transition-all ${step === 1 ? 'bg-brand-gold text-black font-bold shadow-md' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                1. Identidad & Estado
              </button>
              <button onClick={() => setStep(2)} className={`py-2 rounded-xl transition-all ${step === 2 ? 'bg-brand-gold text-black font-bold shadow-md' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                2. Membresía & Fechas
              </button>
              <button onClick={() => setStep(3)} className={`py-2 rounded-xl transition-all ${step === 3 ? 'bg-brand-gold text-black font-bold shadow-md' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                3. Familia (Hijos &lt;25)
              </button>
              <button onClick={() => setStep(4)} className={`py-2 rounded-xl transition-all ${step === 4 ? 'bg-brand-gold text-black font-bold shadow-md' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                4. Activos & Garita
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6 max-h-[65vh] overflow-y-auto space-y-6">

              {/* STEP 1: IDENTIDAD, ESTADO & PROFESIÓN */}
              {step === 1 && (
                <div className="space-y-4">
                  
                  {/* Top Bar: Código Alfa & Estado Activo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 items-center">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                          Código Alfa del Socio:
                        </span>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, isManualAlphaCode: !formData.isManualAlphaCode })}
                          className="text-[10px] text-brand-gold hover:underline font-bold"
                        >
                          {formData.isManualAlphaCode ? 'Usar Automático' : 'Personalizar / Manual'}
                        </button>
                      </div>
                      {formData.isManualAlphaCode ? (
                        <input
                          type="text"
                          value={formData.customAlphaCode || calculatedAlphaCode()}
                          onChange={e => setFormData({ ...formData, customAlphaCode: e.target.value.toUpperCase() })}
                          placeholder="Ej. MEN-VAR-C-E"
                          className="w-full p-1.5 rounded-lg bg-white dark:bg-black/70 border border-brand-gold text-sm font-mono font-bold text-brand-gold text-center focus:outline-none"
                        />
                      ) : (
                        <div className="text-sm font-black font-mono tracking-widest text-amber-800 dark:text-brand-gold bg-white dark:bg-black/60 px-3 py-1 rounded-lg border border-amber-300 dark:border-brand-gold/40 text-center shadow-sm">
                          {calculatedAlphaCode()} (Automático)
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                        Estado del Socio (8. Activo):
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, status: 'ACTIVO' })}
                          className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            formData.status === 'ACTIVO'
                              ? 'bg-emerald-500 text-black border-emerald-500 shadow-sm'
                              : 'bg-white dark:bg-black/40 border-gray-300 dark:border-white/10 text-gray-400'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" /> Activo (Sí)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, status: 'INACTIVO' })}
                          className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                            formData.status === 'INACTIVO'
                              ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                              : 'bg-white dark:bg-black/40 border-gray-300 dark:border-white/10 text-gray-400'
                          }`}
                        >
                          <X className="w-3.5 h-3.5" /> Inactivo (No)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Documento y Extensión */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Tipo Documento *</label>
                      <select 
                        value={formData.docType}
                        onChange={e => setFormData({ ...formData, docType: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm focus:border-brand-gold outline-none font-medium"
                      >
                        <option value="CI">Cédula de Identidad (CI)</option>
                        <option value="PASAPORTE">Pasaporte Extranjero</option>
                        <option value="DNI">DNI</option>
                        <option value="EXTRANJERO">Documento Extranjero</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Número Documento *</label>
                      <input 
                        type="text" 
                        placeholder="Ej. 4892019"
                        value={formData.documentId}
                        onChange={e => setFormData({ ...formData, documentId: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm font-bold focus:border-brand-gold outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Extensión</label>
                      <select 
                        value={formData.docExtension}
                        onChange={e => setFormData({ ...formData, docExtension: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm focus:border-brand-gold outline-none font-medium"
                      >
                        <option value="LP">La Paz (LP)</option>
                        <option value="CB">Cochabamba (CB)</option>
                        <option value="SC">Santa Cruz (SC)</option>
                        <option value="OR">Oruro (OR)</option>
                        <option value="PT">Potosí (PT)</option>
                        <option value="CH">Chuquisaca (CH)</option>
                        <option value="TJ">Tarija (TJ)</option>
                        <option value="BN">Beni (BN)</option>
                        <option value="PA">Pando (PA)</option>
                        <option value="EXT">Extranjero (EXT)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-brand-gold" /> Nacionalidad *
                      </label>
                      <input 
                        type="text" 
                        placeholder="BOLIVIANA"
                        value={formData.nationality}
                        onChange={e => setFormData({ ...formData, nationality: e.target.value.toUpperCase() })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm font-medium focus:border-brand-gold outline-none"
                      />
                    </div>
                  </div>

                  {/* Nombres y Apellidos */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Primer Nombre *</label>
                      <input 
                        type="text" 
                        placeholder="Carlos"
                        value={formData.firstName}
                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm focus:border-brand-gold outline-none font-medium"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Segundo Nombre</label>
                      <input 
                        type="text" 
                        placeholder="Eduardo"
                        value={formData.secondName}
                        onChange={e => setFormData({ ...formData, secondName: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm focus:border-brand-gold outline-none font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Apellido Paterno *</label>
                      <input 
                        type="text" 
                        placeholder="Mendoza"
                        value={formData.paternalSurname}
                        onChange={e => setFormData({ ...formData, paternalSurname: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm focus:border-brand-gold outline-none font-medium"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Apellido Materno</label>
                      <input 
                        type="text" 
                        placeholder="Vargas"
                        value={formData.maternalSurname}
                        onChange={e => setFormData({ ...formData, maternalSurname: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm focus:border-brand-gold outline-none font-medium"
                      />
                    </div>
                  </div>

                  {/* Nacimiento, Género y Estado Civil */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Apellido de Casada</label>
                      <input 
                        type="text" 
                        placeholder="Opcional"
                        value={formData.marriedSurname}
                        onChange={e => setFormData({ ...formData, marriedSurname: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Fecha Nacimiento</label>
                      <input 
                        type="date" 
                        value={formData.birthDate}
                        onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Género</label>
                      <select 
                        value={formData.gender}
                        onChange={e => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm outline-none font-medium"
                      >
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Estado Civil</label>
                      <select 
                        value={formData.maritalStatus}
                        onChange={e => setFormData({ ...formData, maritalStatus: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm outline-none font-medium"
                      >
                        <option value="CASADO">Casado(a)</option>
                        <option value="SOLTERO">Soltero(a)</option>
                        <option value="DIVORCIADO">Divorciado(a)</option>
                        <option value="VIUDO">Viudo(a)</option>
                      </select>
                    </div>
                  </div>

                  {/* Profesión, Ocupación y Empresa (Cognos / Novus pág 11 y 25) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-black/20 border border-white/5">
                    <div>
                      <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-brand-gold" /> Profesión
                      </label>
                      <input 
                        type="text" 
                        placeholder="Ej. Abogado, Médico, Ing. Comercial"
                        value={formData.profession}
                        onChange={e => setFormData({ ...formData, profession: e.target.value })}
                        className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-brand-gold" /> Ocupación / Cargo
                      </label>
                      <input 
                        type="text" 
                        placeholder="Ej. Gerente General, Director"
                        value={formData.occupation}
                        onChange={e => setFormData({ ...formData, occupation: e.target.value })}
                        className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-brand-gold" /> Empresa / Grupo Empresarial
                      </label>
                      <input 
                        type="text" 
                        placeholder="Ej. Grupo BISA, Minera San Cristóbal"
                        value={formData.company}
                        onChange={e => setFormData({ ...formData, company: e.target.value })}
                        className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                      />
                    </div>
                  </div>

                  {/* Facturación y Contacto */}
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 space-y-4 shadow-sm">
                    <h4 className="text-xs font-bold text-amber-800 dark:text-brand-gold uppercase tracking-wider">
                      Datos de Facturación & Contacto
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">NIT Facturación</label>
                        <input 
                          type="text" 
                          placeholder="NIT o CI (ej. 4892019014)"
                          value={formData.fiscalNit}
                          onChange={e => setFormData({ ...formData, fiscalNit: e.target.value })}
                          className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Razón Social Factura</label>
                        <input 
                          type="text" 
                          placeholder="Nombre fiscal (ej. Carlos Mendoza Vargas)"
                          value={formData.fiscalCompanyName}
                          onChange={e => setFormData({ ...formData, fiscalCompanyName: e.target.value })}
                          className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Celular / WhatsApp</label>
                        <input 
                          type="text" 
                          placeholder="77281920"
                          value={formData.mobile}
                          onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                          className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Email Principal</label>
                        <input 
                          type="email" 
                          placeholder="carlos.mendoza@email.com"
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                          className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Ciudad de Residencia</label>
                        <input 
                          type="text" 
                          placeholder="La Paz (Zona Sur)"
                          value={formData.address}
                          onChange={e => setFormData({ ...formData, address: e.target.value })}
                          className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* STEP 2: MEMBRESÍA, FECHAS & BOLETA BANCARIA */}
              {step === 2 && (
                <div className="space-y-4">
                  
                  {/* Candado Boleta Bancaria */}
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-brand-gold/10 border border-amber-300 dark:border-brand-gold/40 space-y-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-amber-800 dark:text-brand-gold shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-amber-800 dark:text-brand-gold uppercase tracking-wider">
                          Regla Oficial: Boleta de Depósito Bancario Original
                        </h4>
                        <p className="text-[11px] text-gray-600 dark:text-gray-300">
                          La antigüedad estatutaria y fecha de admisión se calculan obligatoriamente a partir de la boleta de depósito bancario del primer pago.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <div>
                        <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Nro. Boleta Depósito *</label>
                        <input 
                          type="text" 
                          placeholder="BNB-8839201"
                          value={formData.depositVoucherNumber}
                          onChange={e => setFormData({ ...formData, depositVoucherNumber: e.target.value })}
                          className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-brand-gold/40 text-gray-900 dark:text-white font-mono text-sm font-bold outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Fecha Boleta (Ingreso) *</label>
                        <input 
                          type="date" 
                          value={formData.depositVoucherDate}
                          onChange={e => setFormData({ ...formData, depositVoucherDate: e.target.value })}
                          className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-brand-gold/40 text-gray-900 dark:text-white text-sm font-bold outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Monto Abonado (Bs)</label>
                        <input 
                          type="number" 
                          value={formData.depositVoucherAmount}
                          onChange={e => setFormData({ ...formData, depositVoucherAmount: parseFloat(e.target.value) || 0 })}
                          className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-brand-gold/40 text-amber-800 dark:text-brand-gold text-sm font-bold outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Nro de Membresía (Solo número) & Tipo */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="flex justify-between items-center">
                        <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Nro. Membresía / Título *</label>
                        <span className="text-[10px] text-amber-400 font-bold">Sin letras, solo número</span>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Ej. 1055"
                        value={formData.membershipNumber}
                        onChange={e => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setFormData({ ...formData, membershipNumber: val });
                        }}
                        className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-amber-800 dark:text-brand-gold font-mono text-sm font-bold outline-none"
                        required
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Ingresa solo los dígitos correlativos.</p>
                    </div>

                    <div>
                      <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Tipo / Categoría Membresía *</label>
                      <select 
                        value={formData.membershipTypeCode}
                        onChange={e => setFormData({ ...formData, membershipTypeCode: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm outline-none font-medium"
                      >
                        <option value="FAM">Titular Familiar Propietario (880 Bs/mes)</option>
                        <option value="IND">Titular Individual (440 Bs/mes)</option>
                        <option value="INST">Socio Institucional (Empresas / Convenios)</option>
                        <option value="DIP">Socio Diplomático</option>
                        <option value="PRE">Pre-Asociado (1+1 año)</option>
                        <option value="DEP">Socio Deportivo (400 Bs/mes)</option>
                        <option value="HON">Socio Honorario</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Modo Adquisición</label>
                      <select 
                        value={formData.acquisitionMethod}
                        onChange={e => setFormData({ ...formData, acquisitionMethod: e.target.value })}
                        className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm outline-none font-medium"
                      >
                        <option value="COMPRA_DIRECTA">Compra Directa del Club</option>
                        <option value="TRANSFERENCIA">Transferencia Particular</option>
                        <option value="HERENCIA">Anticipo Legítima / Herencia</option>
                      </select>
                    </div>
                  </div>

                  {/* Fechas de Cobro, Entrega de Credencial y Estado */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-black/20 border border-white/5">
                    <div>
                      <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Fecha Emisión / Entrega Cred.</label>
                      <input 
                        type="date" 
                        value={formData.credentialDeliveryDate}
                        onChange={e => setFormData({ ...formData, credentialDeliveryDate: e.target.value })}
                        className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Día de Cobro Mensual</label>
                      <select 
                        value={formData.billingDay}
                        onChange={e => setFormData({ ...formData, billingDay: parseInt(e.target.value, 10) || 1 })}
                        className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                      >
                        <option value={1}>Día 1 de cada mes</option>
                        <option value={5}>Día 5 de cada mes</option>
                        <option value={10}>Día 10 de cada mes</option>
                        <option value={15}>Día 15 de cada mes</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Forma de Cobro</label>
                      <select 
                        value={formData.collectionMethod}
                        onChange={e => setFormData({ ...formData, collectionMethod: e.target.value })}
                        className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                      >
                        <option value="CAJA_CENTRAL">Caja Central / En Ventanilla</option>
                        <option value="COBRADOR">Cobrador a Domicilio</option>
                        <option value="DEBITO_AUTOMATICO">Débito Automático Bancario</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Nro. Folio Libro</label>
                      <input 
                        type="text" 
                        placeholder="FOL-2026-112"
                        value={formData.folioNumber}
                        onChange={e => setFormData({ ...formData, folioNumber: e.target.value })}
                        className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                      />
                    </div>
                  </div>

                </div>
              )}

              {/* STEP 3: FAMILIARES & DEPENDIENTES (REGLA <25 AÑOS SOLO PARA HIJOS) */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-amber-800 dark:text-brand-gold uppercase tracking-wider">
                        Familiares & Dependientes con Derecho a Acceso
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        Regla Oficial: <strong className="text-amber-400">Solo los hijos</strong> tienen límite de edad (&lt;25 años). Cónyuges, padres, nanas y choferes no tienen restricción de edad.
                      </p>
                    </div>
                    <button 
                      type="button"
                      onClick={addBeneficiary}
                      className="px-3 py-1.5 rounded-xl bg-brand-gold text-black text-xs font-bold hover:scale-105 transition-all shadow-md shadow-brand-gold/20 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar Familiar
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.beneficiaries.map((b, idx) => {
                      const isChild = ['HIJO', 'PUPILO', 'MENOR_CUSTODIA'].includes(b.relationship);
                      return (
                        <div key={idx} className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 space-y-3 shadow-sm">
                          <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-amber-800 dark:text-brand-gold">Familiar #{idx + 1}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                isChild 
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              }`}>
                                {isChild ? 'Regla < 25 años' : '✓ Sin límite de edad'}
                              </span>
                            </div>
                            {formData.beneficiaries.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => removeBeneficiary(idx)} 
                                className="text-red-500 text-xs flex items-center gap-1 hover:underline"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Eliminar
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                              <label className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold">Parentesco *</label>
                              <select 
                                value={b.relationship}
                                onChange={e => updateBeneficiary(idx, 'relationship', e.target.value)}
                                className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none font-medium"
                              >
                                <option value="CONYUGE">Cónyuge / Esposa(o) (Matrimonio / De Hecho)</option>
                                <option value="HIJO">Hijo(a) (&lt; 25 años)</option>
                                <option value="PUPILO">Pupilo (&lt; 25 años del titular o cónyuge)</option>
                                <option value="PADRE_MADRE">Padres o Suegros (+65 años)</option>
                                <option value="ESTUDIANTE_EXTRANJERO">Estudiante Extranjero</option>
                                <option value="PAREJA_CONTINUA">Pareja Estabilidad Continua (1 año)</option>
                                <option value="HIJO_MAYOR_CONYUGE">Hijo (&gt;25 años) del Cónyuge</option>
                                <option value="INVITADO_DIRECTORIO">Invitado Sin Cargo (Aprobado Directorio - Máx 2)</option>
                                <option value="NANA_CHOFER">Nana / Chofer de Apoyo</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold">Nombres *</label>
                              <input 
                                type="text" 
                                placeholder="Mariana"
                                value={b.firstName}
                                onChange={e => updateBeneficiary(idx, 'firstName', e.target.value)}
                                className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none font-medium"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold">Apellido Paterno *</label>
                              <input 
                                type="text" 
                                placeholder="Mendoza"
                                value={b.paternalSurname}
                                onChange={e => updateBeneficiary(idx, 'paternalSurname', e.target.value)}
                                className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none font-medium"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold">Fecha Nacimiento</label>
                              <input 
                                type="date" 
                                value={b.birthDate}
                                onChange={e => updateBeneficiary(idx, 'birthDate', e.target.value)}
                                className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                              />
                            </div>
                          </div>

                          {/* Foto URL para cada dependiente */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            <div>
                              <label className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold flex items-center gap-1">
                                <Camera className="w-3 h-3 text-brand-gold" /> Foto del Dependiente (URL o Cargar)
                              </label>
                              <input 
                                type="text" 
                                placeholder="https://ejemplo.com/foto-dependiente.jpg"
                                value={b.photoUrl}
                                onChange={e => updateBeneficiary(idx, 'photoUrl', e.target.value)}
                                className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold">Documento / C.I. Dependiente</label>
                              <input 
                                type="text" 
                                placeholder="Ej. 6892014"
                                value={b.documentId}
                                onChange={e => updateBeneficiary(idx, 'documentId', e.target.value)}
                                className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 4: ACTIVOS MÚLTIPLES (CABALLOS, GARITA & FOTO TITULAR) */}
              {step === 4 && (
                <div className="space-y-5">
                  
                  {/* Boxes Hípicos Múltiples */}
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-emerald-500/30 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                          🐎 Boxes Hípicos (Tarifa Mensual 195 Bs/mes por caballo)
                        </h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          Puedes registrar múltiples equinos con su estado activo o fallecido.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addHorse}
                        className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1 hover:bg-emerald-500/30 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Registrar + Caballo
                      </button>
                    </div>

                    <div className="space-y-3">
                      {formData.horses.map((h, hIdx) => (
                        <div key={hIdx} className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-emerald-400">Caballo #{hIdx + 1}</span>
                            {formData.horses.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeHorse(hIdx)}
                                className="text-rose-400 text-xs flex items-center gap-1 hover:underline"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Quitar
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[10px] text-gray-400 font-semibold">Nombre del Equino</label>
                              <input 
                                type="text" 
                                placeholder="Ej. Sultán de la Colina"
                                value={h.name}
                                onChange={e => updateHorse(hIdx, 'name', e.target.value)}
                                className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-400 font-semibold">Nro. de Box Asignado</label>
                              <input 
                                type="text" 
                                placeholder="Ej. Box H-12"
                                value={h.assignedBox}
                                onChange={e => updateHorse(hIdx, 'assignedBox', e.target.value)}
                                className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-400 font-semibold">Estado del Caballo</label>
                              <select 
                                value={h.status}
                                onChange={e => updateHorse(hIdx, 'status', e.target.value)}
                                className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none font-bold"
                              >
                                <option value="VIVO">🟢 Vivo (Activo)</option>
                                <option value="FALLECIDO">🔴 Fallecido / Baja</option>
                              </select>
                            </div>
                          </div>

                          {h.status === 'FALLECIDO' && (
                            <div>
                              <label className="text-[10px] text-rose-400 font-semibold">Motivo de Fallecimiento / Baja *</label>
                              <input 
                                type="text" 
                                placeholder="Ej. Cólico severo, edad avanzada, retiro médico..."
                                value={h.deceasedReason}
                                onChange={e => updateHorse(hIdx, 'deceasedReason', e.target.value)}
                                className="w-full mt-1 p-2 rounded-xl bg-rose-950/20 border border-rose-500/40 text-white text-xs outline-none"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Vehículos Múltiples para Garita */}
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-blue-500/30 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
                          <Car className="w-4 h-4" /> Vehículos Autorizados para Garita de Seguridad
                        </h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          Lectura automática de placas y control de barrera.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={addVehicle}
                        className="px-2.5 py-1 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[11px] font-bold flex items-center gap-1 hover:bg-blue-500/30 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Registrar + Auto
                      </button>
                    </div>

                    <div className="space-y-3">
                      {formData.vehicles.map((v, vIdx) => (
                        <div key={vIdx} className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-blue-400">Vehículo #{vIdx + 1}</span>
                            {formData.vehicles.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeVehicle(vIdx)}
                                className="text-rose-400 text-xs flex items-center gap-1 hover:underline"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Quitar
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div>
                              <label className="text-[10px] text-gray-400 font-semibold">Placa *</label>
                              <input 
                                type="text" 
                                placeholder="Ej. 4820-KPL"
                                value={v.plate}
                                onChange={e => updateVehicle(vIdx, 'plate', e.target.value.toUpperCase())}
                                className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs font-mono font-bold outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-400 font-semibold">Marca</label>
                              <input 
                                type="text" 
                                placeholder="Toyota"
                                value={v.brand}
                                onChange={e => updateVehicle(vIdx, 'brand', e.target.value)}
                                className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-400 font-semibold">Modelo</label>
                              <input 
                                type="text" 
                                placeholder="Land Cruiser Prado"
                                value={v.model}
                                onChange={e => updateVehicle(vIdx, 'model', e.target.value)}
                                className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-400 font-semibold">Color</label>
                              <input 
                                type="text" 
                                placeholder="Blanco Perlado"
                                value={v.color}
                                onChange={e => updateVehicle(vIdx, 'color', e.target.value)}
                                className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fotografía Titular */}
                  <div className="p-4 rounded-2xl bg-black/20 border border-white/5 space-y-2">
                    <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-brand-gold" /> URL Fotografía del Titular (Opcional)
                    </label>
                    <input 
                      type="text" 
                      placeholder="https://images.unsplash.com/... o dejar vacío para avatar automático"
                      value={formData.photoUrl}
                      onChange={e => setFormData({ ...formData, photoUrl: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs outline-none"
                    />
                  </div>

                </div>
              )}

            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-black/40">
              <button 
                type="button"
                disabled={step === 1}
                onClick={() => setStep(s => s - 1)}
                className="px-4 py-2.5 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold disabled:opacity-30"
              >
                Anterior
              </button>

              <div className="flex gap-2">
                {step < 4 ? (
                  <button 
                    type="button"
                    onClick={() => setStep(s => s + 1)}
                    className="px-6 py-2.5 rounded-xl bg-brand-gold text-black text-xs font-bold hover:scale-105 transition-all shadow-md shadow-brand-gold/20"
                  >
                    Siguiente
                  </button>
                ) : (
                  <button 
                    type="button"
                    disabled={loading}
                    onClick={handleSubmit}
                    className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-black text-xs font-black hover:scale-105 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        <span>Guardando en BD...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Finalizar & Crear Socio</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
