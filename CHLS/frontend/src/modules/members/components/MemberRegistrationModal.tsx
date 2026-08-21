import React, { useState } from 'react';
import { X, Check, User, Shield, CreditCard, Users, Car, HeartHandshake, Camera, AlertCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { memberAdminApi } from '../services/memberAdminApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const MemberRegistrationModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Identidad
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
    phone: '',
    mobile: '',
    email: '',
    address: '',
    city: 'LP',
    photoUrl: '',

    // Fiscal
    fiscalNit: '',
    fiscalCompanyName: '',

    // Boleta Bancaria (Regla Oficial de Ingreso)
    depositVoucherNumber: '',
    depositVoucherDate: new Date().toISOString().split('T')[0],
    depositVoucherAmount: 15000,

    // Membresía
    membershipNumber: '',
    membershipTypeCode: 'FAM',
    acquisitionMethod: 'COMPRA_DIRECTA',
    folioNumber: '',
    creditLimit: 50000,
    allowsDirectDebit: true,

    // Dependientes
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

    // Activos
    horseName: '',
    assignedBox: '',
    vehiclePlate: '',
    vehicleBrand: '',
    vehicleModel: '',
    sportsInterest: 'Tenis, Frontón, Equitación'
  });

  if (!isOpen) return null;

  // Real-time Alpha Code Preview calculation
  const generateAlphaCode = () => {
    const p1 = (formData.paternalSurname || 'XXX').substring(0, 3).toUpperCase();
    const p2 = (formData.maternalSurname || 'XXX').substring(0, 3).toUpperCase();
    const p3 = (formData.firstName || 'X').substring(0, 1).toUpperCase();
    const p4 = (formData.secondName || (formData.firstName ? formData.firstName.substring(1, 2) : 'X')).substring(0, 1).toUpperCase();
    return `${p1}-${p2}-${p3}-${p4}`;
  };

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

  const handleSubmit = async () => {
    if (!formData.documentId || !formData.firstName || !formData.paternalSurname || !formData.membershipNumber) {
      toast.error('Por favor completa los campos obligatorios (*)');
      return;
    }

    if (!formData.depositVoucherNumber || !formData.depositVoucherDate) {
      toast.error('La fecha y número de la Boleta de Depósito Bancario son indispensables');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...formData,
        beneficiaries: formData.beneficiaries.filter(b => b.firstName && b.paternalSurname),
        horses: formData.horseName ? [{ name: formData.horseName, assignedBox: formData.assignedBox }] : [],
        vehicles: formData.vehiclePlate ? [{ plate: formData.vehiclePlate, brand: formData.vehicleBrand, model: formData.vehicleModel }] : []
      };

      await memberAdminApi.createMember(payload);
      toast.success('¡Socio registrado exitosamente con código ' + generateAlphaCode() + '!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al registrar socio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
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
                Formulario Único de Personas, Registro Patrimonial y Candado Antifraude
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="grid grid-cols-4 p-4 border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-black/40 text-xs font-semibold text-center">
          <button onClick={() => setStep(1)} className={`py-2 rounded-xl transition-all ${step === 1 ? 'bg-brand-gold text-black font-bold shadow-md' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
            1. Identidad & Fiscal
          </button>
          <button onClick={() => setStep(2)} className={`py-2 rounded-xl transition-all ${step === 2 ? 'bg-brand-gold text-black font-bold shadow-md' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
            2. Membresía & Boleta
          </button>
          <button onClick={() => setStep(3)} className={`py-2 rounded-xl transition-all ${step === 3 ? 'bg-brand-gold text-black font-bold shadow-md' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
            3. Familia (<span className="text-emerald-600 dark:text-emerald-400">&lt;25 años</span>)
          </button>
          <button onClick={() => setStep(4)} className={`py-2 rounded-xl transition-all ${step === 4 ? 'bg-brand-gold text-black font-bold shadow-md' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
            4. Activos & Foto
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-6">

          {/* STEP 1: IDENTIDAD Y FISCAL */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 flex items-center justify-between text-xs text-blue-900 dark:text-blue-300">
                <span>Código Alfa Predictivo Autogenerado:</span>
                <span className="text-sm font-black font-mono tracking-widest text-amber-800 dark:text-brand-gold bg-white dark:bg-black/60 px-3 py-1 rounded-lg border border-amber-300 dark:border-brand-gold/40 shadow-sm">
                  {generateAlphaCode()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Número Documento *</label>
                  <input 
                    type="text" 
                    placeholder="Ej. 3489201"
                    value={formData.documentId}
                    onChange={e => setFormData({ ...formData, documentId: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm font-bold focus:border-brand-gold outline-none"
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Primer Nombre *</label>
                  <input 
                    type="text" 
                    placeholder="Gonzalo"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm focus:border-brand-gold outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Segundo Nombre</label>
                  <input 
                    type="text" 
                    placeholder="Mauricio"
                    value={formData.secondName}
                    onChange={e => setFormData({ ...formData, secondName: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm focus:border-brand-gold outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Apellido Paterno *</label>
                  <input 
                    type="text" 
                    placeholder="Durán"
                    value={formData.paternalSurname}
                    onChange={e => setFormData({ ...formData, paternalSurname: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm focus:border-brand-gold outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Apellido Materno</label>
                  <input 
                    type="text" 
                    placeholder="Morales"
                    value={formData.maternalSurname}
                    onChange={e => setFormData({ ...formData, maternalSurname: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm focus:border-brand-gold outline-none font-medium"
                  />
                </div>
              </div>

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

              {/* Fiscal & Contact */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 space-y-4 shadow-sm">
                <h4 className="text-xs font-bold text-amber-800 dark:text-brand-gold uppercase tracking-wider">
                  Datos de Facturación & Contacto
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">NIT Facturación</label>
                    <input 
                      type="text" 
                      placeholder="NIT o CI"
                      value={formData.fiscalNit}
                      onChange={e => setFormData({ ...formData, fiscalNit: e.target.value })}
                      className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Razón Social Factura</label>
                    <input 
                      type="text" 
                      placeholder="Nombre o Empresa"
                      value={formData.fiscalCompanyName}
                      onChange={e => setFormData({ ...formData, fiscalCompanyName: e.target.value })}
                      className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Celular</label>
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
                      placeholder="correo@ejemplo.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Profesión</label>
                    <input 
                      type="text" 
                      placeholder="Ingeniero Civil"
                      value={formData.profession}
                      onChange={e => setFormData({ ...formData, profession: e.target.value })}
                      className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* STEP 2: MEMBRESÍA & BOLETA BANCARIA (REGLA FUNDAMENTAL) */}
          {step === 2 && (
            <div className="space-y-4">
              
              {/* Candado Boleta Bancaria */}
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-brand-gold/10 border border-amber-300 dark:border-brand-gold/40 space-y-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-800 dark:text-brand-gold shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-800 dark:text-brand-gold uppercase tracking-wider">
                      Regla Estatutaria: Boleta de Depósito Bancario Original
                    </h4>
                    <p className="text-[11px] text-gray-600 dark:text-gray-300">
                      La fecha de ingreso y antigüedad del socio se computa <strong>estrictamente por la fecha de la boleta bancaria</strong> original del primer pago.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Nro. Boleta Depósito *</label>
                    <input 
                      type="text" 
                      placeholder="BNB-9482018"
                      value={formData.depositVoucherNumber}
                      onChange={e => setFormData({ ...formData, depositVoucherNumber: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-brand-gold/40 text-gray-900 dark:text-white font-mono text-sm font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Fecha Boleta (Ingreso) *</label>
                    <input 
                      type="date" 
                      value={formData.depositVoucherDate}
                      onChange={e => setFormData({ ...formData, depositVoucherDate: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-brand-gold/40 text-gray-900 dark:text-white text-sm font-bold outline-none"
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

              {/* Membership Data */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Nro. Membresía / Título *</label>
                  <input 
                    type="text" 
                    placeholder="FAM-1042"
                    value={formData.membershipNumber}
                    onChange={e => setFormData({ ...formData, membershipNumber: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-amber-800 dark:text-brand-gold font-mono text-sm font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Tipo Membresía *</label>
                  <select 
                    value={formData.membershipTypeCode}
                    onChange={e => setFormData({ ...formData, membershipTypeCode: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm outline-none font-medium"
                  >
                    <option value="FAM">Titular Familiar Propietario (880 Bs/mes)</option>
                    <option value="IND">Titular Individual (440 Bs/mes)</option>
                    <option value="INST">Socio Institucional</option>
                    <option value="DIP">Socio Diplomático</option>
                    <option value="PRE">Pre-Asociado (1+1 año)</option>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Nro. Folio Libro de Registro</label>
                  <input 
                    type="text" 
                    placeholder="FOL-2026-088"
                    value={formData.folioNumber}
                    onChange={e => setFormData({ ...formData, folioNumber: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-sm outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input 
                    type="checkbox"
                    checked={formData.allowsDirectDebit}
                    onChange={e => setFormData({ ...formData, allowsDirectDebit: e.target.checked })}
                    className="w-5 h-5 rounded accent-brand-gold"
                  />
                  <label className="text-xs text-gray-700 dark:text-gray-300 font-semibold">Habilitar Débito Automático Bancario</label>
                </div>
              </div>

            </div>
          )}

          {/* STEP 3: FAMILIA Y DEPENDIENTES */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold text-amber-800 dark:text-brand-gold uppercase tracking-wider">
                    Familiares & Dependientes con Derecho a Acceso
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Regla de Negocio: Hijos mayores de 25 años tienen carnet bloqueado automáticamente.
                  </p>
                </div>
                <button 
                  onClick={addBeneficiary}
                  className="px-3 py-1.5 rounded-xl bg-brand-gold text-black text-xs font-bold hover:scale-105 transition-all shadow-md shadow-brand-gold/20"
                >
                  + Agregar Familiar
                </button>
              </div>

              <div className="space-y-3">
                {formData.beneficiaries.map((b, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-2">
                      <span className="text-xs font-bold text-amber-800 dark:text-brand-gold">Familiar #{idx + 1}</span>
                      {formData.beneficiaries.length > 1 && (
                        <button onClick={() => removeBeneficiary(idx)} className="text-red-600 dark:text-red-400 text-xs hover:underline">
                          Eliminar
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold">Parentesco</label>
                        <select 
                          value={b.relationship}
                          onChange={e => updateBeneficiary(idx, 'relationship', e.target.value)}
                          className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none font-medium"
                        >
                          <option value="CONYUGE">Cónyuge / Esposo(a)</option>
                          <option value="HIJO">Hijo(a)</option>
                          <option value="PADRE">Padre / Madre</option>
                          <option value="NANA">Nana / Chofer de Apoyo</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold">Nombres</label>
                        <input 
                          type="text" 
                          placeholder="Mariana"
                          value={b.firstName}
                          onChange={e => updateBeneficiary(idx, 'firstName', e.target.value)}
                          className="w-full mt-1 p-2 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none font-medium"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-600 dark:text-gray-400 font-semibold">Apellido Paterno</label>
                        <input 
                          type="text" 
                          placeholder="Suárez"
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: ACTIVOS, BOXES HÍPICOS & VEHÍCULOS */}
          {step === 4 && (
            <div className="space-y-4">
              
              {/* Box Hípico */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-emerald-500/30 space-y-3 shadow-sm">
                <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  🐎 Box Hípico (Tarifa Automática 195 Bs/mes)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-700 dark:text-gray-400 font-semibold">Nombre del Equino</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Sultán de la Colina"
                      value={formData.horseName}
                      onChange={e => setFormData({ ...formData, horseName: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-emerald-500/30 text-gray-900 dark:text-white text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-700 dark:text-gray-400 font-semibold">Nro. de Box Asignado</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Box H-08"
                      value={formData.assignedBox}
                      onChange={e => setFormData({ ...formData, assignedBox: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-emerald-500/30 text-gray-900 dark:text-white text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Vehículo para Garita */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-blue-500/30 space-y-3 shadow-sm">
                <h4 className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <Car className="w-4 h-4" /> Vehículo Autorizado para Garita
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-700 dark:text-gray-400 font-semibold">Placa Vehículo</label>
                    <input 
                      type="text" 
                      placeholder="Ej. 4820-KPL"
                      value={formData.vehiclePlate}
                      onChange={e => setFormData({ ...formData, vehiclePlate: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-blue-500/30 text-gray-900 dark:text-white text-xs font-mono font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-700 dark:text-gray-400 font-semibold">Marca</label>
                    <input 
                      type="text" 
                      placeholder="Toyota"
                      value={formData.vehicleBrand}
                      onChange={e => setFormData({ ...formData, vehicleBrand: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-blue-500/30 text-gray-900 dark:text-white text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-700 dark:text-gray-400 font-semibold">Modelo</label>
                    <input 
                      type="text" 
                      placeholder="Land Cruiser Prado"
                      value={formData.vehicleModel}
                      onChange={e => setFormData({ ...formData, vehicleModel: e.target.value })}
                      className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-black/50 border border-gray-300 dark:border-blue-500/30 text-gray-900 dark:text-white text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Photo & Sports */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">URL Fotografía Titular</label>
                  <input 
                    type="text" 
                    placeholder="https://images.unsplash.com/..."
                    value={formData.photoUrl}
                    onChange={e => setFormData({ ...formData, photoUrl: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-700 dark:text-gray-400 uppercase font-semibold">Disciplinas Deportivas</label>
                  <input 
                    type="text" 
                    placeholder="Tenis, Frontón, Hípica, Golf..."
                    value={formData.sportsInterest}
                    onChange={e => setFormData({ ...formData, sportsInterest: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs outline-none"
                  />
                </div>
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
                className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-black text-xs font-black hover:scale-105 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {loading ? 'Guardando en BD...' : 'Finalizar & Crear Socio'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
