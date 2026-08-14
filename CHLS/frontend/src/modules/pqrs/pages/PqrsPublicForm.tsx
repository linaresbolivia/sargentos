import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@config/api';
import { Send, CheckCircle2, Globe } from 'lucide-react';
import logoClub from '../../../assets/logo.png';

const translations = {
  es: {
    title: 'Formulario PQRS',
    subtitle: 'Recepción de Peticiones, Quejas, Reclamos y Sugerencias.',
    mandatory: 'Por favor completa todos los campos obligatorios',
    fullName: 'Nombre Completo *',
    fullNamePlaceholder: 'Ej. Juan Pérez',
    phone: 'Teléfono Personal (WhatsApp) *',
    phonePlaceholder: 'Ej. +591 70000000',
    email: 'Correo Electrónico',
    emailPlaceholder: 'ejemplo@correo.com',
    phoneDisclaimer: 'Este número será utilizado únicamente para comunicarle el proceso y la respuesta a la solución de su caso, una vez que la gestión haya sido concluida por el área correspondiente.',
    memberCode: 'Código de Socio',
    memberCodePlaceholder: 'Ej. S-1020',
    type: 'Tipo de Solicitud *',
    condition: 'Condición del Solicitante *',
    area: 'Área de la Solicitud (Opcional)',
    areaSelect: '-- Seleccionar un área --',
    description: 'Descripción de la PQRS *',
    descriptionPlaceholder: 'Detalle aquí su solicitud, queja o sugerencia...',
    submit: 'Enviar',
    submitting: 'Enviando...',
    successTitle: '¡Formulario Enviado!',
    successDesc: 'Hemos recibido tu Petición, Queja, Reclamo o Sugerencia correctamente. Pronto nos pondremos en contacto contigo a través de los medios proporcionados.',
    sendAnother: 'Enviar otra solicitud',
    successToast: 'Tu solicitud ha sido enviada con éxito.',
    errorToast: 'Ocurrió un error al enviar el formulario. Intenta nuevamente.',
    options: {
      PETICION: 'Petición',
      QUEJA: 'Queja',
      RECLAMO: 'Reclamo',
      SUGERENCIA: 'Sugerencia',
      ASOCIADO: 'Asociado (Socio)',
      COLABORADOR: 'Colaborador',
      EMPRESA_TERCERIZADA: 'Empresa Tercerizada',
      areas: {
        'Area Humeda': 'Área húmeda',
        'Gimnasio': 'Gimnasio',
        'Restaurante': 'Restaurante',
        'Cafe Pub': 'Café Pub',
        'Espacio Deportivo': 'Espacio Deportivo',
        'Area Hipica': 'Área Hípica',
        'Otros': 'Otros'
      }
    }
  },
  en: {
    title: 'PQRS Form',
    subtitle: 'Reception of Petitions, Complaints, Claims, and Suggestions.',
    mandatory: 'Please complete all required fields',
    fullName: 'Full Name *',
    fullNamePlaceholder: 'E.g. John Doe',
    phone: 'Personal Phone (WhatsApp) *',
    phonePlaceholder: 'E.g. +1 555 1234567',
    email: 'Email Address',
    emailPlaceholder: 'example@email.com',
    phoneDisclaimer: 'This number will be used solely to communicate the process and the resolution of your case, once the management has been concluded by the corresponding area.',
    memberCode: 'Member Code',
    memberCodePlaceholder: 'E.g. M-1020',
    type: 'Request Type *',
    condition: 'Applicant Condition *',
    area: 'Request Area (Optional)',
    areaSelect: '-- Select an area --',
    description: 'PQRS Description *',
    descriptionPlaceholder: 'Detail your request, complaint, or suggestion here...',
    submit: 'Submit',
    submitting: 'Submitting...',
    successTitle: 'Form Submitted!',
    successDesc: 'We have successfully received your Petition, Complaint, Claim, or Suggestion. We will contact you soon through the provided contact information.',
    sendAnother: 'Submit another request',
    successToast: 'Your request has been successfully submitted.',
    errorToast: 'An error occurred while submitting the form. Please try again.',
    options: {
      PETICION: 'Petition',
      QUEJA: 'Complaint',
      RECLAMO: 'Claim',
      SUGERENCIA: 'Suggestion',
      ASOCIADO: 'Member (Partner)',
      COLABORADOR: 'Collaborator',
      EMPRESA_TERCERIZADA: 'Outsourced Company',
      areas: {
        'Area Humeda': 'Wet Area',
        'Gimnasio': 'Gym',
        'Restaurante': 'Restaurant',
        'Cafe Pub': 'Cafe Pub',
        'Espacio Deportivo': 'Sports Area',
        'Area Hipica': 'Equestrian Area',
        'Otros': 'Others'
      }
    }
  }
};

export const PqrsPublicForm: React.FC = () => {
  const [lang, setLang] = useState<'es' | 'en'>('es');
  const t = translations[lang];

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    memberCode: '',
    type: 'PETICION',
    area: '',
    applicantCondition: 'ASOCIADO',
    description: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedCode, setSubmittedCode] = useState('');
  const [viewMode, setViewMode] = useState<'form' | 'track'>('form');
  const [trackingCodeInput, setTrackingCodeInput] = useState('');
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [isTracking, setIsTracking] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingCodeInput.trim()) return;
    setIsTracking(true);
    try {
      const res = await api.get(`/pqrs/track/${trackingCodeInput}`);
      setTrackingResult(res.data.ticket);
    } catch (error) {
      toast.error(lang === 'es' ? 'Código no encontrado.' : 'Code not found.');
      setTrackingResult(null);
    } finally {
      setIsTracking(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'applicantCondition' && value !== 'ASOCIADO') {
        updated.memberCode = '';
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post('/pqrs', formData);
      if (res.data && res.data.ticket && res.data.ticket.trackingCode) {
        setSubmittedCode(res.data.ticket.trackingCode);
      }
      setSubmitted(true);
      toast.success(t.successToast);
    } catch (error) {
      console.error(error);
      toast.error(t.errorToast);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLang = () => {
    setLang(prev => prev === 'es' ? 'en' : 'es');
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#050e09] flex items-center justify-center p-4 relative overflow-hidden text-white font-sans">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/10 rounded-full blur-[120px]" />
        </div>

        {/* Language Toggle in Success View */}
        <div className="absolute top-6 right-6 z-50">
          <button 
            onClick={toggleLang}
            className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-brand-gold/30 rounded-full text-brand-gold hover:bg-black/60 transition-all font-bold text-sm tracking-wider"
          >
            <Globe size={16} />
            {lang === 'es' ? 'EN' : 'ES'}
          </button>
        </div>

        <div className="bg-[#0a150e]/80 backdrop-blur-2xl border border-emerald-500/30 p-10 max-w-lg w-full text-center relative z-10 flex flex-col items-center rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.15)]">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
            <CheckCircle2 size={48} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-brand-gold mb-4 serif-brand">{t.successTitle}</h2>
          <p className="text-gray-300 mb-6 leading-relaxed">
            {t.successDesc}
          </p>
          {submittedCode && (
            <div className="bg-black/40 border border-brand-gold/30 rounded-xl p-4 mb-8 w-full">
              <p className="text-xs text-brand-gold uppercase tracking-widest mb-1">Tu Código de Seguimiento</p>
              <p className="text-2xl font-bold text-white tracking-widest select-all">{submittedCode}</p>
              <p className="text-xs text-gray-400 mt-2">Guarda este código para consultar el estado de tu ticket.</p>
            </div>
          )}
          <button 
            onClick={() => {
              setSubmitted(false);
              setFormData({
                fullName: '', phone: '', email: '', memberCode: '', type: 'PETICION', area: '', applicantCondition: 'ASOCIADO', description: ''
              });
            }}
            className="w-full bg-gradient-to-r from-emerald-500 to-brand-green hover:from-emerald-400 hover:to-emerald-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] tracking-wide uppercase text-sm"
          >
            {t.sendAnother}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050e09] flex flex-col relative overflow-x-hidden text-white font-sans selection:bg-brand-gold selection:text-[#050e09]">
      {/* Background Decorative Elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] right-[-20%] w-[50%] h-[50%] bg-brand-gold/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-emerald-900/20 rounded-full blur-[150px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-emerald-500/20 px-6 py-4 flex flex-col justify-center items-center gap-2 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] bg-[#050e09]/80 transition-all duration-300 relative">
        <img src={logoClub} alt="Club Logo" className="w-14 h-14 object-contain drop-shadow-[0_0_15px_rgba(204,161,75,0.5)] transition-transform duration-300 hover:scale-105" />
        
        {/* Language Toggle and Track Toggle */}
        <div className="flex flex-col gap-3 items-center mt-2">
          <button 
            onClick={toggleLang}
            className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-brand-gold/30 rounded-full text-brand-gold hover:bg-black/60 transition-all font-bold text-xs tracking-wider"
          >
            <Globe size={14} />
            {lang === 'es' ? 'EN' : 'ES'}
          </button>
          <button 
            onClick={() => setViewMode(viewMode === 'form' ? 'track' : 'form')}
            className="flex items-center gap-2 px-4 py-1.5 bg-brand-gold text-[#050e09] border border-brand-gold/30 rounded-full hover:bg-brand-gold-light transition-all font-bold text-xs tracking-wider shadow-[0_0_15px_rgba(204,161,75,0.4)]"
          >
            {viewMode === 'form' ? (lang === 'es' ? 'CONSULTAR ESTADO' : 'TRACK TICKET') : (lang === 'es' ? 'NUEVO TICKET' : 'NEW TICKET')}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-10 relative z-10 my-8">
        
        {viewMode === 'track' ? (
          <div className="bg-[#0a150e]/80 border border-brand-gold/30 p-8 md:p-14 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden backdrop-blur-2xl rounded-3xl">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-brand-gold/10 rounded-full blur-[80px] pointer-events-none"></div>
            
            <div className="mb-8 text-center md:text-left border-b border-brand-gold/20 pb-6 relative z-10">
              <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-brand-gold to-yellow-300 bg-clip-text text-transparent serif-brand">
                {lang === 'es' ? 'Consultar Estado' : 'Track Status'}
              </h2>
              <p className="text-gray-300 text-sm">
                {lang === 'es' ? 'Ingresa tu código de seguimiento para ver el estado de tu PQRS.' : 'Enter your tracking code to view the status of your PQRS.'}
              </p>
            </div>

            <form onSubmit={handleTrack} className="flex gap-4 relative z-10 mb-8">
              <input
                type="text"
                value={trackingCodeInput}
                onChange={(e) => setTrackingCodeInput(e.target.value.toUpperCase())}
                placeholder={lang === 'es' ? 'Código (Ej: YZ8B9K)' : 'Code (Ex: YZ8B9K)'}
                className="flex-1 bg-black/40 border-2 border-brand-gold/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold transition-all"
                required
              />
              <button 
                disabled={isTracking}
                className="bg-brand-gold text-black font-bold px-6 py-3 rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50"
              >
                {isTracking ? '...' : (lang === 'es' ? 'Buscar' : 'Search')}
              </button>
            </form>

            {trackingResult && (
              <div className="relative z-10 bg-black/50 border border-white/10 rounded-2xl p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-brand-gold font-bold text-xl">{trackingResult.code}</div>
                    <div className="text-sm text-gray-400 mt-1">{trackingResult.type}</div>
                  </div>
                  <div className="px-3 py-1 rounded-full text-xs font-bold border" style={{
                    backgroundColor: trackingResult.status === 'CERRADO' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                    color: trackingResult.status === 'CERRADO' ? '#34d399' : '#fbbf24',
                    borderColor: trackingResult.status === 'CERRADO' ? 'rgba(16,185,129,0.5)' : 'rgba(245,158,11,0.5)'
                  }}>
                    {trackingResult.status}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-white font-bold border-b border-white/10 pb-2">Historial</h3>
                  {trackingResult.history?.map((h: any, idx: number) => (
                    <div key={idx} className="flex gap-4 items-start">
                      <div className="mt-1 w-2 h-2 rounded-full bg-brand-gold shadow-[0_0_5px_rgba(204,161,75,0.8)]"></div>
                      <div>
                        <p className="text-sm font-semibold text-gray-200">{h.action}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{h.description}</p>
                        <p className="text-[10px] text-brand-gold mt-1">
                          {new Date(h.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!trackingResult.history || trackingResult.history.length === 0) && (
                    <p className="text-sm text-gray-500 italic">No hay historial registrado.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#0a150e]/80 border border-emerald-500/30 p-8 md:p-14 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden backdrop-blur-2xl rounded-3xl">
          {/* Decorative Corner Glow */}
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-brand-gold/10 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="mb-12 text-center md:text-left border-b border-emerald-500/20 pb-8 relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-brand-gold via-yellow-200 to-brand-gold bg-clip-text text-transparent serif-brand drop-shadow-md">{t.title}</h2>
            <p className="text-emerald-100/70 text-sm tracking-wide leading-relaxed max-w-2xl">
              {t.subtitle} <br className="hidden md:block"/>
              {t.mandatory} (<span className="text-brand-gold">*</span>).
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              {/* Nombre Completo */}
              <div className="group">
                <label className="block text-xs font-bold text-brand-gold uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-gold-light">{t.fullName}</label>
                <input
                  type="text"
                  name="fullName"
                  required
                  pattern="[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+"
                  title="Solo se permiten letras y espacios."
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full bg-black/40 border-2 border-emerald-900/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 transition-all shadow-inner"
                  placeholder={t.fullNamePlaceholder}
                />
              </div>

              {/* Teléfono */}
              <div className="group">
                <label className="block text-xs font-bold text-brand-gold uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-gold-light">{t.phone}</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  inputMode="tel"
                  pattern="[\+\s0-9]+"
                  title="Solo se permiten números, espacios y el signo +"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full bg-black/40 border-2 border-emerald-900/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 transition-all shadow-inner"
                  placeholder={t.phonePlaceholder}
                />
                <p className="text-gray-400 text-xs mt-2 leading-tight">
                  {t.phoneDisclaimer}
                </p>
              </div>

              {/* Correo Electrónico */}
              <div className="group">
                <label className="block text-xs font-bold text-brand-gold uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-gold-light">{t.email}</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-black/40 border-2 border-emerald-900/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 transition-all shadow-inner"
                  placeholder={t.emailPlaceholder}
                />
              </div>

              {/* Condición Solicitante */}
              <div className="group">
                <label className="block text-xs font-bold text-brand-gold uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-gold-light">{t.condition}</label>
                <select
                  name="applicantCondition"
                  required
                  value={formData.applicantCondition}
                  onChange={handleChange}
                  className="w-full bg-black/40 border-2 border-emerald-900/50 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 transition-all shadow-inner appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23cca14b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                >
                  <option value="ASOCIADO" className="bg-[#0a150e] text-white">{t.options.ASOCIADO}</option>
                  <option value="COLABORADOR" className="bg-[#0a150e] text-white">{t.options.COLABORADOR}</option>
                  <option value="EMPRESA_TERCERIZADA" className="bg-[#0a150e] text-white">{t.options.EMPRESA_TERCERIZADA}</option>
                </select>
              </div>

              {/* Código de Socio */}
              {formData.applicantCondition === 'ASOCIADO' && (
                <div className="group">
                  <label className="block text-xs font-bold text-brand-gold uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-gold-light">
                    {t.memberCode} *
                  </label>
                  <input
                    type="text"
                    name="memberCode"
                    inputMode="numeric"
                    pattern="[A-Za-z0-9\-]+"
                    title="Código alfanumérico."
                    required
                    value={formData.memberCode}
                    onChange={handleChange}
                    className="w-full bg-black/40 border-2 border-emerald-900/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 transition-all shadow-inner"
                    placeholder={t.memberCodePlaceholder}
                  />
                </div>
              )}

              {/* Tipo de Solicitud */}
              <div className="group">
                <label className="block text-xs font-bold text-brand-gold uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-gold-light">{t.type}</label>
                <select
                  name="type"
                  required
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full bg-black/40 border-2 border-emerald-900/50 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 transition-all shadow-inner appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23cca14b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                >
                  <option value="PETICION" className="bg-[#0a150e] text-white">{t.options.PETICION}</option>
                  <option value="QUEJA" className="bg-[#0a150e] text-white">{t.options.QUEJA}</option>
                  <option value="RECLAMO" className="bg-[#0a150e] text-white">{t.options.RECLAMO}</option>
                  <option value="SUGERENCIA" className="bg-[#0a150e] text-white">{t.options.SUGERENCIA}</option>
                </select>
              </div>
            </div>

            {/* Área del Pedido */}
            <div className="group relative z-10">
              <label className="block text-xs font-bold text-brand-gold uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-gold-light">{t.area}</label>
              <select
                name="area"
                value={formData.area}
                onChange={handleChange}
                className="w-full bg-black/40 border-2 border-emerald-900/50 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 transition-all shadow-inner appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23cca14b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
              >
                <option value="" className="bg-[#0a150e] text-white">{t.areaSelect}</option>
                <option value="Area Humeda" className="bg-[#0a150e] text-white">{t.options.areas['Area Humeda']}</option>
                <option value="Gimnasio" className="bg-[#0a150e] text-white">{t.options.areas['Gimnasio']}</option>
                <option value="Restaurante" className="bg-[#0a150e] text-white">{t.options.areas['Restaurante']}</option>
                <option value="Cafe Pub" className="bg-[#0a150e] text-white">{t.options.areas['Cafe Pub']}</option>
                <option value="Espacio Deportivo" className="bg-[#0a150e] text-white">{t.options.areas['Espacio Deportivo']}</option>
                <option value="Area Hipica" className="bg-[#0a150e] text-white">{t.options.areas['Area Hipica']}</option>
                <option value="Otros" className="bg-[#0a150e] text-white">{t.options.areas['Otros']}</option>
              </select>
            </div>

            {/* Descripción */}
            <div className="group relative z-10">
              <label className="block text-xs font-bold text-brand-gold uppercase tracking-widest mb-2 transition-colors group-focus-within:text-brand-gold-light">{t.description}</label>
              <textarea
                name="description"
                required
                value={formData.description}
                onChange={handleChange}
                rows={5}
                className="w-full bg-black/40 border-2 border-emerald-900/50 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 transition-all resize-none shadow-inner"
                placeholder={t.descriptionPlaceholder}
              />
            </div>

            <div className="pt-8 relative z-10">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold tracking-widest uppercase transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-r from-emerald-500 to-brand-green hover:from-emerald-400 hover:to-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] disabled:opacity-70 disabled:hover:translate-y-0 text-lg border border-emerald-400/30"
              >
                {isSubmitting ? t.submitting : (
                  <>
                    <Send size={22} className="mr-1" /> {t.submit}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        )}
      </main>
    </div>
  );
};

export default PqrsPublicForm;
