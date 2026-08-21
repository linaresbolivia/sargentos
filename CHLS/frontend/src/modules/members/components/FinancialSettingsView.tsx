import React, { useState, useEffect } from 'react';
import { Settings, Save, Check, Shield, DollarSign, Award, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { memberAdminApi } from '../services/memberAdminApi';

export const FinancialSettingsView: React.FC = () => {
  const [params, setParams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await memberAdminApi.getSettings();
      setParams(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (key: string, value: string) => {
    try {
      setSavingKey(key);
      await memberAdminApi.updateSetting(key, value, parseFloat(value) || undefined);
      toast.success(`Parámetro ${key} actualizado con éxito`);
      loadSettings();
    } catch (err) {
      toast.error('Error al actualizar parámetro');
    } finally {
      setSavingKey(null);
    }
  };

  const handleLocalChange = (key: string, val: string) => {
    setParams(prev => prev.map(p => p.parameterKey === key ? { ...p, parameterValue: val } : p));
  };

  return (
    <div className="space-y-6 text-gray-900 dark:text-white">
      
      {/* Header */}
      <div className="glass-panel p-6 border-l-4 border-brand-gold bg-white/90 dark:bg-[#0d1311]/90 border border-gray-200 dark:border-white/10 shadow-sm rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 dark:bg-brand-gold/20 text-amber-800 dark:text-brand-gold border border-amber-300 dark:border-brand-gold/40">
            Administración Autónoma
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Sin Dependencia de TI</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white serif-brand mt-1">
          Panel de Parametrización Financiera & Tarifas
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Modifica tarifas de cuotas sociales, boxes hípicos, escuelas deportivas, porcentajes 60/40 y reglas de edad estatutarias.
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {params.map(p => (
          <div key={p.id} className="glass-panel p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0d1311]/90 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 dark:bg-brand-gold/10 text-amber-800 dark:text-brand-gold border border-amber-300 dark:border-brand-gold/30">
                  {p.category}
                </span>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white font-mono mt-1">{p.parameterKey}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input 
                type="text"
                value={p.parameterValue}
                onChange={e => handleLocalChange(p.parameterKey, e.target.value)}
                className="flex-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/60 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white font-mono text-sm font-bold outline-none"
              />
              <button 
                onClick={() => handleUpdate(p.parameterKey, p.parameterValue)}
                disabled={savingKey === p.parameterKey}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-600 text-black text-xs font-black hover:scale-105 transition-all shadow-md shadow-brand-gold/20 flex items-center gap-1"
              >
                {savingKey === p.parameterKey ? 'Guardando...' : <><Save className="w-3.5 h-3.5" /> Guardar</>}
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
