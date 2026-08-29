import React, { useState, useEffect } from 'react';
import { api } from '@config/api';
import { X, Save, Plus, Trash2, Settings, Building2, Stamp, Sliders, Users, Check, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface AreaConfigItem {
  id: string;
  name: string;
  manager: string;
  position: string;
  canReceiveExternal: boolean;
}

interface CorrespondenceConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CorrespondenceConfigModal: React.FC<CorrespondenceConfigModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'AREAS' | 'STAMPS' | 'ROUTING' | 'USERS'>('AREAS');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [areas, setAreas] = useState<AreaConfigItem[]>([]);
  const [stamps, setStamps] = useState<string[]>([]);
  const [routingMode, setRoutingMode] = useState<string>('VIA_SECRETARIA_GERENCIA');
  const [defaultSlaDays, setDefaultSlaDays] = useState<number>(5);
  const [socioSubsanacionDays, setSocioSubsanacionDays] = useState<number>(10);

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
      });
      toast.success('¡Parámetros y Matriz de Derivación guardados con éxito! ⚙️');
      onClose();
    } catch {
      toast.error('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
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

  const handleDeleteStamp = (stampToDelete: string) => {
    setStamps(stamps.filter((s) => s !== stampToDelete));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md flex justify-center items-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-white dark:bg-[#0c1410] border border-slate-200 dark:border-brand-gold/20 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-gold/15 text-brand-gold flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Parametrización & Matriz de Derivación</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/30">
                  ADMINISTRACIÓN
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Configura quién deriva a quién, catálogo de áreas, sellos de 1 toque y tiempos SLA.
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
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.01]">
          <button
            onClick={() => setActiveTab('AREAS')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
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
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
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
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'ROUTING'
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Matriz & SLA</span>
          </button>

          <button
            onClick={() => setActiveTab('USERS')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
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
            <div className="text-center py-16 text-slate-400">Cargando parámetros...</div>
          ) : (
            <>
              {/* TAB 1: AREAS & RESPONSABLES */}
              {activeTab === 'AREAS' && (
                <div className="space-y-4">
                  {/* Add New Area Input Box */}
                  <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200/80 dark:border-white/5 space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 block">
                      + Agregar Nueva Área al Club
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <input
                        type="text"
                        placeholder="Nombre del Área (Ej. POLÍGONO DE TIRO)"
                        value={newAreaName}
                        onChange={(e) => setNewAreaName(e.target.value)}
                        className="bg-white dark:bg-[#070e0a] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none font-bold uppercase"
                      />
                      <input
                        type="text"
                        placeholder="Encargado / Titular (Ej. Cap. Valdivia)"
                        value={newAreaManager}
                        onChange={(e) => setNewAreaManager(e.target.value)}
                        className="bg-white dark:bg-[#070e0a] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Cargo (Ej. Responsable de Área)"
                          value={newAreaPosition}
                          onChange={(e) => setNewAreaPosition(e.target.value)}
                          className="flex-1 bg-white dark:bg-[#070e0a] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddArea}
                          className="bg-brand-gold hover:bg-yellow-500 text-black font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 shadow-sm shrink-0"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Agregar</span>
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
                      className="bg-brand-gold hover:bg-yellow-500 text-black font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
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
                          className="p-1 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
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

                  {/* SLA Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                        Tiempo Estándar de SLA (Días Hábiles)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={defaultSlaDays}
                        onChange={(e) => setDefaultSlaDays(parseInt(e.target.value, 10) || 5)}
                        className="w-full bg-white dark:bg-[#070e0a] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Alerta visual en amarillo cuando se aproxime a vencer.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                        Plazo para Subsanación de Socios (Días)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={socioSubsanacionDays}
                        onChange={(e) => setSocioSubsanacionDays(parseInt(e.target.value, 10) || 10)}
                        className="w-full bg-white dark:bg-[#070e0a] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Pausa el cronómetro de SLA mientras el socio subsana.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: GESTION DE USUARIOS */}
              {activeTab === 'USERS' && (
                <div className="space-y-4 bg-slate-50 dark:bg-white/[0.02] p-6 rounded-2xl border border-slate-200 dark:border-white/5 text-center">
                  <ShieldCheck className="w-12 h-12 text-brand-gold mx-auto" />
                  <div className="max-w-md mx-auto">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Gestión Central de Usuarios y Roles
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 leading-relaxed">
                      Para crear nuevos usuarios institucionales (Secretarias, Jefes de Área, Guardias) o asignar el rol <strong className="text-emerald-500 font-mono">MODULO_CORRESPONDENCIA</strong>, dirígete al panel central de SuperAdmin.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/superadmin');
                    }}
                    className="inline-flex items-center gap-2 bg-slate-900 dark:bg-brand-gold text-white dark:text-black font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-transform hover:scale-105 active:scale-95"
                  >
                    <span>Ir a Gestión de Usuarios (/superadmin)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex justify-end items-center gap-3 bg-slate-50/50 dark:bg-black/20">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-gold to-yellow-600 hover:from-yellow-500 hover:to-yellow-600 text-black font-black px-6 py-2.5 rounded-xl text-xs shadow-md shadow-brand-gold/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Parámetros'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
export default CorrespondenceConfigModal;
