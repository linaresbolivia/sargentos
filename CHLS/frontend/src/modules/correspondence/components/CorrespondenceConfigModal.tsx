import React, { useState, useEffect } from 'react';
import { api } from '@config/api';
import {
  X,
  Save,
  Plus,
  Trash2,
  Settings,
  Building2,
  Stamp,
  Sliders,
  Users,
  Check,
  ArrowRight,
  ShieldCheck,
  Mail,
  Send,
  Lock,
  Server,
  Globe,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Hash,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface AreaConfigItem {
  id: string;
  name: string;
  manager: string;
  position: string;
  canReceiveExternal: boolean;
}

interface SmtpSettings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

interface CorrespondenceConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CorrespondenceConfigModal: React.FC<CorrespondenceConfigModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'AREAS' | 'STAMPS' | 'ROUTING' | 'GESTIONES' | 'EMAIL' | 'USERS'>('AREAS');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [areas, setAreas] = useState<AreaConfigItem[]>([]);
  const [stamps, setStamps] = useState<string[]>([]);
  const [routingMode, setRoutingMode] = useState<string>('VIA_SECRETARIA_GERENCIA');
  const [defaultSlaDays, setDefaultSlaDays] = useState<number>(5);
  const [socioSubsanacionDays, setSocioSubsanacionDays] = useState<number>(10);

  // Gestiones & Correlativos de Corte
  const [currentGestion, setCurrentGestion] = useState<number>(new Date().getFullYear());
  const [initialCorrelativeNumber, setInitialCorrelativeNumber] = useState<number>(1);
  const [prefixFormat, setPrefixFormat] = useState<string>('HR');
  const [gestionesConfig, setGestionesConfig] = useState<Record<number, { initialCorrelative: number; label: string }>>({
    2026: { initialCorrelative: 1, label: 'Gestión 2026' },
    2025: { initialCorrelative: 1, label: 'Gestión 2025' },
  });

  // SMTP Settings State
  const [smtp, setSmtp] = useState<SmtpSettings>({
    enabled: false,
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    fromEmail: 'correspondencia@chls.bo',
    fromName: 'Club Hípico Los Sargentos — Correspondencia',
  });

  // Test Email State
  const [testRecipient, setTestRecipient] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  // New Area form states
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaManager, setNewAreaManager] = useState('');
  const [newAreaPosition, setNewAreaPosition] = useState('');

  // New Stamp state
  const [newStampText, setNewStampText] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/correspondence/settings');
      const data = response.data.data;
      if (data) {
        setAreas(data.areas || []);
        setStamps(data.stamps || []);
        setRoutingMode(data.routingMode || 'VIA_SECRETARIA_GERENCIA');
        setDefaultSlaDays(data.defaultSlaDays || 5);
        setSocioSubsanacionDays(data.socioSubsanacionDays || 10);
        if (data.currentGestion) setCurrentGestion(Number(data.currentGestion));
        if (data.initialCorrelativeNumber) setInitialCorrelativeNumber(Number(data.initialCorrelativeNumber));
        if (data.prefixFormat) setPrefixFormat(data.prefixFormat);
        if (data.gestiones) setGestionesConfig(data.gestiones);
        if (data.smtp) {
          setSmtp({
            enabled: !!data.smtp.enabled,
            host: data.smtp.host || 'smtp.gmail.com',
            port: Number(data.smtp.port) || 587,
            secure: !!data.smtp.secure,
            user: data.smtp.user || '',
            pass: data.smtp.pass || '',
            fromEmail: data.smtp.fromEmail || 'correspondencia@chls.bo',
            fromName: data.smtp.fromName || 'Club Hípico Los Sargentos — Correspondencia',
          });
        }
      }
    } catch {
      toast.error('Error al cargar la configuración');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await api.post('/correspondence/settings', {
        areas,
        stamps,
        routingMode,
        defaultSlaDays,
        socioSubsanacionDays,
        currentGestion,
        initialCorrelativeNumber,
        prefixFormat,
        gestiones: {
          ...gestionesConfig,
          [currentGestion]: {
            initialCorrelative: Number(initialCorrelativeNumber),
            label: `Gestión ${currentGestion}`,
          },
        },
        smtp,
      });
      toast.success('¡Parámetros, Gestiones y Servidor de Correo guardados con éxito! ⚙️');
      onClose();
    } catch {
      toast.error('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testRecipient.trim() || !testRecipient.includes('@')) {
      toast.error('Por favor ingresa un correo destinatario válido para la prueba');
      return;
    }
    if (!smtp.user.trim() || !smtp.pass.trim()) {
      toast.error('Debes completar el usuario/correo y contraseña del servidor SMTP');
      return;
    }

    setIsTestingEmail(true);
    const toastId = toast.loading(`Enviando correo de prueba a ${testRecipient}...`);
    try {
      const response = await api.post('/correspondence/settings/email/test', {
        testRecipient: testRecipient.trim(),
        smtpConfig: smtp,
      });

      if (response.data.success) {
        toast.success(`¡Prueba exitosa! Correo enviado a ${testRecipient} 📧✨`, { id: toastId });
      } else {
        toast.error(`Error: ${response.data.message}`, { id: toastId });
      }
    } catch (error: any) {
      toast.error(`Error al conectar con el servidor SMTP: ${error?.response?.data?.message || error.message}`, { id: toastId });
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleApplyPreset = (type: 'GMAIL' | 'OUTLOOK' | 'CUSTOM') => {
    if (type === 'GMAIL') {
      setSmtp((prev) => ({
        ...prev,
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
      }));
      toast.success('Preset de Gmail aplicado (Requiere Contraseña de Aplicación de 16 letras)');
    } else if (type === 'OUTLOOK') {
      setSmtp((prev) => ({
        ...prev,
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
      }));
      toast.success('Preset de Microsoft Outlook / Office 365 aplicado');
    } else {
      setSmtp((prev) => ({
        ...prev,
        host: 'mail.chls.bo',
        port: 465,
        secure: true,
      }));
      toast.success('Preset de Servidor Propio SSL/TLS aplicado');
    }
  };

  const handleAddArea = () => {
    if (!newAreaName.trim()) {
      toast.error('Ingresa el nombre del área');
      return;
    }
    const newArea: AreaConfigItem = {
      id: Date.now().toString(),
      name: newAreaName.trim().toUpperCase(),
      manager: newAreaManager.trim() || 'Por Designar',
      position: newAreaPosition.trim() || 'Responsable',
      canReceiveExternal: false,
    };
    setAreas([...areas, newArea]);
    setNewAreaName('');
    setNewAreaManager('');
    setNewAreaPosition('');
    toast.success(`Área ${newArea.name} agregada`);
  };

  const handleDeleteArea = (id: string) => {
    setAreas(areas.filter((a) => a.id !== id));
  };

  const handleAddStamp = () => {
    if (!newStampText.trim()) {
      toast.error('Ingresa el texto del sello');
      return;
    }
    const cleanStamp = newStampText.trim().toUpperCase();
    if (stamps.includes(cleanStamp)) {
      toast.error('Ese sello ya existe');
      return;
    }
    setStamps([...stamps, cleanStamp]);
    setNewStampText('');
    toast.success('Sello agregado');
  };

  const handleDeleteStamp = (stamp: string) => {
    setStamps(stamps.filter((s) => s !== stamp));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="bg-white dark:bg-[#07110c] border border-slate-200 dark:border-emerald-500/30 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col justify-between max-h-[90vh] animate-fadeIn">
        
        {/* Top Header */}
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-gold/20 text-brand-gold border border-brand-gold/40">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Parametrización & Matriz de Derivación</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/30">
                  ADMINISTRACIÓN
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Configura quién deriva a quién, catálogo de áreas, sellos de 1 toque, servidor de correos y tiempos SLA.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.01] overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('AREAS')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'AREAS'
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Áreas & Responsables ({areas.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('STAMPS')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'STAMPS'
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Stamp className="w-4 h-4" />
            <span>Sellos de 1 Toque ({stamps.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ROUTING')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'ROUTING'
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Matriz & SLA</span>
          </button>

          <button
            onClick={() => setActiveTab('GESTIONES')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'GESTIONES'
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>📅 Gestiones & Punto de Corte</span>
          </button>

          <button
            onClick={() => setActiveTab('EMAIL')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'EMAIL'
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>📧 Notificaciones por Correo</span>
          </button>

          <button
            onClick={() => setActiveTab('USERS')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'USERS'
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Gestión de Usuarios</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 text-sm space-y-6">
          {isLoading ? (
            <div className="text-center py-16 text-slate-400 font-bold">Cargando parámetros...</div>
          ) : (
            <>
              {/* TAB 1: AREAS & RESPONSABLES */}
              {activeTab === 'AREAS' && (
                <div className="space-y-4">
                  {/* Add New Area Input Box */}
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200/80 dark:border-white/5 space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 block">
                      Registrar Nueva Área o Dependencia
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <input
                        type="text"
                        placeholder="Nombre de Área (ej. COMISIÓN DISCIPLINARIA)"
                        value={newAreaName}
                        onChange={(e) => setNewAreaName(e.target.value)}
                        className="sm:col-span-4 bg-white dark:bg-[#070e0a] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none font-bold uppercase"
                      />
                      <input
                        type="text"
                        placeholder="Titular / Responsable (ej. Juan Pérez)"
                        value={newAreaManager}
                        onChange={(e) => setNewAreaManager(e.target.value)}
                        className="sm:col-span-4 bg-white dark:bg-[#070e0a] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Cargo (ej. Presidente de Comisión)"
                        value={newAreaPosition}
                        onChange={(e) => setNewAreaPosition(e.target.value)}
                        className="sm:col-span-3 bg-white dark:bg-[#070e0a] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                      />
                      <div className="sm:col-span-1">
                        <button
                          type="button"
                          onClick={handleAddArea}
                          className="w-full h-full bg-brand-gold hover:bg-yellow-500 text-black font-bold rounded-xl flex items-center justify-center p-2 transition-transform active:scale-95"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Areas Table / List */}
                  <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-black/40 text-slate-500 uppercase font-bold text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Área Institucional</th>
                          <th className="py-3 px-4">Titular / Responsable</th>
                          <th className="py-3 px-4">Cargo Oficial</th>
                          <th className="py-3 px-4 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {areas.map((area) => (
                          <tr key={area.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                              {area.name}
                            </td>
                            <td className="py-3 px-4 text-slate-700 dark:text-gray-300">
                              {area.manager}
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-mono">
                              {area.position}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteArea(area.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: SELLOS DE 1 TOQUE */}
              {activeTab === 'STAMPS' && (
                <div className="space-y-4">
                  {/* Add Stamp */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nuevo sello frecuente (Ej. PARA FIRMA DE CONTRATO)"
                      value={newStampText}
                      onChange={(e) => setNewStampText(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-[#070e0a] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none font-bold uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleAddStamp}
                      className="bg-brand-gold hover:bg-yellow-500 text-black font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar Sello</span>
                    </button>
                  </div>

                  {/* Stamps Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {stamps.map((stamp) => (
                      <div
                        key={stamp}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5"
                      >
                        <span className="text-xs font-bold text-slate-800 dark:text-gray-200 flex items-center gap-2">
                          <Stamp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          {stamp}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteStamp(stamp)}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: MATRIZ DE DERIVACION & REGLAS */}
              {activeTab === 'ROUTING' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 mb-2">
                      Modo de Gobernanza & Circuito de Derivación
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setRoutingMode('VIA_SECRETARIA_GERENCIA')}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          routingMode === 'VIA_SECRETARIA_GERENCIA'
                            ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                            : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            Vía Secretaría de Gerencia (Oficial CHLS)
                          </span>
                          {routingMode === 'VIA_SECRETARIA_GERENCIA' && (
                            <Check className="w-4 h-4 text-emerald-500" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Toda correspondencia externa se radica en Secretaría de Gerencia General antes de ser derivada a las áreas técnicas.
                        </p>
                      </div>

                      <div
                        onClick={() => setRoutingMode('LIBRE')}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          routingMode === 'LIBRE'
                            ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                            : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            Flujo Libre Entre Áreas
                          </span>
                          {routingMode === 'LIBRE' && (
                            <Check className="w-4 h-4 text-emerald-500" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Cualquier área interna puede radicar y derivar directamente a otra área sin requerir paso por Secretaría.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200 dark:border-white/5 space-y-2">
                      <label className="block text-xs font-bold uppercase text-slate-700 dark:text-gray-300">
                        Tiempo Estándar de Respuesta (SLA)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={defaultSlaDays}
                          onChange={(e) => setDefaultSlaDays(parseInt(e.target.value) || 5)}
                          className="w-20 bg-white dark:bg-[#070e0a] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-center font-bold text-slate-900 dark:text-white"
                        />
                        <span className="text-xs text-slate-500">días hábiles por despacho</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200 dark:border-white/5 space-y-2">
                      <label className="block text-xs font-bold uppercase text-slate-700 dark:text-gray-300">
                        Plazo de Subsanación al Socio
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={socioSubsanacionDays}
                          onChange={(e) => setSocioSubsanacionDays(parseInt(e.target.value) || 10)}
                          className="w-20 bg-white dark:bg-[#070e0a] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-center font-bold text-slate-900 dark:text-white"
                        />
                        <span className="text-xs text-slate-500">días calendario</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: GESTIONES & CORRELATIVOS DE CORTE */}
              {activeTab === 'GESTIONES' && (
                <div className="space-y-6">
                  
                  {/* Banner de Punto de Corte Operativo */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-brand-gold/10 to-transparent border-2 border-brand-gold/40 space-y-2">
                    <div className="flex items-center gap-2">
                      <Hash className="w-5 h-5 text-brand-gold" />
                      <span className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                        Punto de Corte de Correlatividad Inicial (Arranque de Sistema)
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed">
                      Permite iniciar la correlatividad digital en el número exacto donde quedó el registro físico anterior (ej. si en papel llegaron hasta la <strong>N° 192</strong>, configure aquí <strong>193</strong>). El sistema continuará la secuencia sin duplicar ni saltar números.
                    </p>
                  </div>

                  {/* Configuración de Gestión y Número Inicial */}
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-brand-gold" />
                      <span>Parámetros de la Gestión Activa</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-300 mb-1">
                          Gestión Anual Oficial
                        </label>
                        <select
                          value={currentGestion}
                          onChange={(e) => setCurrentGestion(Number(e.target.value))}
                          className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-950 dark:text-white font-black cursor-pointer"
                        >
                          <option value={2026}>Gestión 2026 (Activa)</option>
                          <option value={2027}>Gestión 2027</option>
                          <option value={2025}>Gestión 2025 (Histórica)</option>
                          <option value={2024}>Gestión 2024 (Histórica)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-300 mb-1">
                          Número Inicial de Hoja de Ruta (Corte) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={99999}
                          value={initialCorrelativeNumber}
                          onChange={(e) => setInitialCorrelativeNumber(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-white dark:bg-[#070e0a] border-2 border-brand-gold/60 rounded-xl px-3 py-2 text-sm text-slate-950 dark:text-white font-mono font-black focus:ring-2 focus:ring-brand-gold"
                        />
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Ej. 193 o el número correlativo que corresponda
                        </span>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-300 mb-1">
                          Previsualización del Próximo Código
                        </label>
                        <div className="bg-white dark:bg-[#040a06] border border-emerald-500/40 rounded-xl px-3 py-2 text-center">
                          <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 tracking-wider">
                            HR-{currentGestion}-{String(initialCorrelativeNumber).padStart(5, '0')}
                          </span>
                          <span className="block text-[9px] text-slate-400 uppercase font-bold mt-0.5">
                            (Alias: {String(initialCorrelativeNumber).padStart(2, '0')})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabla de Gestiones Registradas */}
                  <div className="space-y-3">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-gray-300 block">
                      Gestiones Habilitadas en el Sistema
                    </span>
                    <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-black/40 text-slate-500 uppercase font-bold text-[10px]">
                          <tr>
                            <th className="py-3 px-4">Gestión Anual</th>
                            <th className="py-3 px-4">Correlativo de Arranque</th>
                            <th className="py-3 px-4">Formato Oficial</th>
                            <th className="py-3 px-4 text-right">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          <tr className="hover:bg-slate-50 dark:hover:bg-white/[0.02] bg-emerald-500/[0.03]">
                            <td className="py-3 px-4 font-black text-slate-900 dark:text-white flex items-center gap-2">
                              <span>Gestión 2026</span>
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-black uppercase">
                                ACTUAL
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-brand-gold">
                              N° {initialCorrelativeNumber}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-400">
                              HR-2026-XXXXX
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-emerald-500 font-bold">✓ En Operación</span>
                            </td>
                          </tr>

                          <tr className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                            <td className="py-3 px-4 font-bold text-slate-700 dark:text-gray-300">
                              Gestión 2025
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-400">
                              N° 1
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-400">
                              HR-2025-XXXXX
                            </td>
                            <td className="py-3 px-4 text-right text-slate-400">
                              Histórico
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 5: SERVIDOR SMTP & NOTIFICACIONES POR CORREO */}
              {activeTab === 'EMAIL' && (
                <div className="space-y-6">
                  
                  {/* Master Switch */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-black text-sm text-slate-900 dark:text-white">
                          Envío Automático de Acuse de Recibo al Socio / Remitente
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-gray-300">
                        Al radicar una Hoja de Ruta, el sistema enviará un correo institucional con el N° de trámite y enlace para seguimiento en línea.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={smtp.enabled}
                        onChange={(e) => setSmtp({ ...smtp, enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {/* Presets Rápidos */}
                  <div>
                    <span className="text-xs font-black uppercase text-slate-700 dark:text-gray-300 mb-2 block">
                      Seleccionar Proveedor de Correo (1 Toque)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleApplyPreset('GMAIL')}
                        className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          smtp.host === 'smtp.gmail.com'
                            ? 'bg-red-500/15 border-red-500/50 text-red-600 dark:text-red-400 shadow-sm'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-red-400'
                        }`}
                      >
                        <span>🔴</span>
                        <span>Google Workspace / Gmail</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyPreset('OUTLOOK')}
                        className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          smtp.host === 'smtp.office365.com'
                            ? 'bg-blue-500/15 border-blue-500/50 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-blue-400'
                        }`}
                      >
                        <span>🔵</span>
                        <span>Outlook / Office 365</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyPreset('CUSTOM')}
                        className={`p-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          smtp.host === 'mail.chls.bo'
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 shadow-sm'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-emerald-400'
                        }`}
                      >
                        <span>🟢</span>
                        <span>Servidor Propio CHLS (cPanel/Zimbra)</span>
                      </button>
                    </div>
                  </div>

                  {/* Configuración del Servidor SMTP */}
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                      <Server className="w-4 h-4 text-emerald-500" />
                      <span>Credenciales del Servidor Emisor (SMTP)</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-8">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-300 mb-1">
                          Servidor Saliente (SMTP Host) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="smtp.gmail.com o mail.chls.bo"
                          value={smtp.host}
                          onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                          className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-950 dark:text-white font-mono font-bold"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-300 mb-1">
                          Puerto (Port) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          placeholder="587 o 465"
                          value={smtp.port}
                          onChange={(e) => setSmtp({ ...smtp, port: Number(e.target.value) || 587 })}
                          className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-950 dark:text-white font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-300 mb-1">
                          Usuario / Correo Emisor <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="ej. correspondencia@chls.bo o tu_correo@gmail.com"
                          value={smtp.user}
                          onChange={(e) => setSmtp({ ...smtp, user: e.target.value, fromEmail: e.target.value })}
                          className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-950 dark:text-white font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-300 mb-1">
                          Contraseña o Token de Aplicación <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••••••••••"
                          value={smtp.pass}
                          onChange={(e) => setSmtp({ ...smtp, pass: e.target.value })}
                          className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-950 dark:text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-300 mb-1">
                          Nombre Visible del Remitente
                        </label>
                        <input
                          type="text"
                          placeholder="Club Hípico Los Sargentos — Correspondencia"
                          value={smtp.fromName}
                          onChange={(e) => setSmtp({ ...smtp, fromName: e.target.value })}
                          className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-950 dark:text-white font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-300 mb-1">
                          Correo de Respuesta (Reply-To)
                        </label>
                        <input
                          type="email"
                          placeholder="secretaria@chls.bo"
                          value={smtp.fromEmail}
                          onChange={(e) => setSmtp({ ...smtp, fromEmail: e.target.value })}
                          className="w-full bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-950 dark:text-white"
                        />
                      </div>
                    </div>

                  </div>

                  {/* Panel de Prueba de Conexión en Vivo */}
                  <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-5 rounded-2xl border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <Send className="w-4 h-4 text-brand-gold" />
                        <span>Probar Conexión & Enviar Correo de Test</span>
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-brand-gold bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        Verificación Inmediata
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="email"
                        placeholder="Ingresa tu correo personal para recibir el test (ej. tu_correo@gmail.com)"
                        value={testRecipient}
                        onChange={(e) => setTestRecipient(e.target.value)}
                        className="flex-1 bg-white dark:bg-[#070e0a] border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-950 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleTestEmail}
                        disabled={isTestingEmail}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isTestingEmail ? 'Probando...' : '🧪 Enviar Test'}</span>
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 5: GESTIÓN DE USUARIOS */}
              {activeTab === 'USERS' && (
                <div className="space-y-4">
                  <div className="p-6 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-2xl text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-gold/20 text-brand-gold flex items-center justify-center mx-auto">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-white">
                      Permisos y Roles de Funcionarios
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400 max-w-md mx-auto">
                      Para crear nuevos usuarios institucionales (Secretarias, Jefes de Área, Guardias) o asignar el rol <strong className="text-emerald-500 font-mono">MODULO_CORRESPONDENCIA</strong>, dirígete al panel central de SuperAdmin.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        navigate('/admin/super');
                      }}
                      className="inline-flex items-center gap-2 bg-slate-900 dark:bg-white/10 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-transform active:scale-95 cursor-pointer"
                    >
                      <span>Ir al Panel de Usuarios SuperAdmin</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02]">
          <span className="text-xs text-slate-400 font-medium">
            Los cambios se aplicarán inmediatamente a toda la institución.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-700 hover:from-emerald-400 hover:to-teal-600 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/25 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4 text-slate-950" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Todos los Cambios'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
export default CorrespondenceConfigModal;
