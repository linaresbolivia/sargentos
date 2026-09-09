import React, { useState, useEffect } from 'react';
import {
  X,
  Leaf,
  Sparkles,
  Droplet,
  Wind,
  ExternalLink,
  ShieldCheck,
  BookOpen,
  Printer,
  Globe,
  CheckCircle2,
} from 'lucide-react';

export type EcoMetricType = 'sheets' | 'trees' | 'water' | 'co2' | 'all';

interface EcoMetricsNormativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMetric?: EcoMetricType;
  metrics?: {
    totalSheetsSaved?: number;
    treesSaved?: number;
    waterSavedLiters?: number;
    co2SavedKg?: number;
  };
}

export const EcoMetricsNormativeModal: React.FC<EcoMetricsNormativeModalProps> = ({
  isOpen,
  onClose,
  selectedMetric = 'all',
  metrics,
}) => {
  const [activeTab, setActiveTab] = useState<EcoMetricType>(selectedMetric || 'all');

  useEffect(() => {
    if (selectedMetric) {
      setActiveTab(selectedMetric);
    }
  }, [selectedMetric, isOpen]);

  if (!isOpen) return null;

  const sheets = metrics?.totalSheetsSaved ?? 0;
  const trees = typeof metrics?.treesSaved === 'number' ? metrics.treesSaved.toFixed(2) : '0.00';
  const water = metrics?.waterSavedLiters ?? 0;
  const co2 = typeof metrics?.co2SavedKg === 'number' ? metrics.co2SavedKg.toFixed(2) : '0.00';

  const handlePrint = () => {
    window.print();
  };

  // Color config according to active tab
  const getThemeConfig = () => {
    switch (activeTab) {
      case 'sheets':
        return {
          title: 'Hojas Ahorradas (Iniciativa Cero Papel)',
          badge: 'Conteo Real & Cero Papel',
          border: 'border-emerald-500/50',
          accentBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/40',
          shadow: 'shadow-[0_0_50px_rgba(16,185,129,0.3)]',
          icon: <Leaf className="w-8 h-8 text-emerald-400" />,
        };
      case 'trees':
        return {
          title: 'Árboles Protegidos de la Tala',
          badge: 'Estándar US EPA & Conservatree',
          border: 'border-amber-500/50',
          accentBg: 'bg-amber-500/20 text-amber-400 border-amber-400/40',
          shadow: 'shadow-[0_0_50px_rgba(245,158,11,0.3)]',
          icon: <Sparkles className="w-8 h-8 text-brand-gold" />,
        };
      case 'water':
        return {
          title: 'Agua Dulce Preservada',
          badge: 'Norma ISO 14046 / WFN',
          border: 'border-cyan-500/50',
          accentBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-400/40',
          shadow: 'shadow-[0_0_50px_rgba(6,182,212,0.3)]',
          icon: <Droplet className="w-8 h-8 text-cyan-400" />,
        };
      case 'co2':
        return {
          title: 'Emisiones de CO₂ Evitadas',
          badge: 'GHG Protocol / ISO 14064',
          border: 'border-purple-500/50',
          accentBg: 'bg-purple-500/20 text-purple-400 border-purple-400/40',
          shadow: 'shadow-[0_0_50px_rgba(168,85,247,0.3)]',
          icon: <Wind className="w-8 h-8 text-purple-400" />,
        };
      default:
        return {
          title: 'Metodología Oficial de Métricas Ecológicas',
          badge: 'ISO 14040 / EPN v4.0',
          border: 'border-emerald-500/50',
          accentBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/40',
          shadow: 'shadow-[0_0_50px_rgba(16,185,129,0.3)]',
          icon: <Leaf className="w-8 h-8 text-emerald-400" />,
        };
    }
  };

  const currentTheme = getThemeConfig();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div
        className={`relative w-full max-w-3xl bg-white dark:bg-[#07110c] border-2 ${currentTheme.border} rounded-3xl ${currentTheme.shadow} overflow-hidden flex flex-col max-h-[92vh] my-auto transition-all`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="relative p-6 sm:p-7 bg-gradient-to-r from-slate-950 via-[#0a1811] to-[#040e08] border-b border-emerald-500/20 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl ${currentTheme.accentBg} border flex items-center justify-center shrink-0 shadow-sm`}>
              {currentTheme.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-xs">
                  Respaldo Normativo Internacional
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${currentTheme.accentBg}`}>
                  {currentTheme.badge}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
                {currentTheme.title}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-200/80 font-medium">
                Club Hípico Los Sargentos • CLUB INTELIGENTE • Iniciativa Cero Papel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white transition-all cursor-pointer border border-white/10"
              title="Imprimir Ficha Metodológica"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-2.5 rounded-xl bg-white/10 hover:bg-red-500/20 text-gray-400 hover:text-red-300 transition-all cursor-pointer border border-white/10"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex items-center gap-1.5 p-2.5 bg-slate-100 dark:bg-black/50 border-b border-slate-200 dark:border-white/10 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('sheets')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'sheets'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            <Leaf className="w-3.5 h-3.5" />
            <span>Hojas Ahorradas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trees')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'trees'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Árboles Protegidos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('water')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'water'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            <Droplet className="w-3.5 h-3.5" />
            <span>Agua Preservada</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('co2')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'co2'
                ? 'bg-purple-500 text-white shadow-md font-black'
                : 'text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            <span>CO₂ Evitado</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-800 text-white shadow-md font-black border border-white/20'
                : 'text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Ver Todo Consolidado</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-6 text-slate-800 dark:text-gray-200">

          {/* ================= TAB: HOJAS ================= */}
          {(activeTab === 'sheets' || activeTab === 'all') && (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-emerald-500/30 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                    <Leaf className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">
                      Hojas de Papel Ahorradas (Fojas Físicas Evitadas)
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-gray-400">
                      Iniciativa Cero Papel • Cuantificación en Tiempo Real
                    </span>
                  </div>
                </div>

                <div className="p-2.5 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 block">Total Actual</span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{sheets} hojas carta</span>
                </div>
              </div>

              <div className="space-y-2 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-gray-300">
                <p>
                  <strong className="text-slate-900 dark:text-white">¿Cómo se calcula?</strong> El sistema realiza la sumatoria exacta y automatizada de las fojas que componen cada trámite radicado más las páginas reales de cada documento PDF o informe técnico adjuntado en cada derivación o proveído (analizadas mediante librerías de lectura criptográfica de páginas de documento).
                </p>
                
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-emerald-500/30 font-mono text-xs text-emerald-700 dark:text-emerald-300">
                  <strong>Fórmula de Cálculo:</strong><br />
                  Hojas Ahorradas = ∑ (Fojas de Radicación + Fojas de Archivos Adjuntos en Proveídos)<br />
                  Resultado Actual del Club = <span className="font-black text-sm">{sheets} hojas de papel no impresas</span>
                </div>

                <p>
                  <strong className="text-slate-900 dark:text-white">Impacto Institucional:</strong> Al eliminar la impresión de carátulas, cartas originales, duplicados de cargo y copias de archivo, se garantiza una custodia 100% digital, trazable por código QR e inalterable.
                </p>

                <p>
                  <strong className="text-slate-900 dark:text-white">Normativa de Respaldo:</strong> Directriz de Cero Papel de la UNESCO y el PNUMA (Programa de las Naciones Unidas para el Medio Ambiente), alineada a la Gestión Documental Electrónica.
                </p>
              </div>

              <a
                href="https://c.environmentalpaper.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 hover:text-white transition-all group cursor-pointer"
              >
                <div className="text-xs font-bold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>Enlace de Respaldo: Environmental Paper Network (EPN)</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono">
                  <span>c.environmentalpaper.org</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </a>
            </div>
          )}

          {/* ================= TAB: ÁRBOLES ================= */}
          {(activeTab === 'trees' || activeTab === 'all') && (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-amber-500/30 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">
                      Árboles Protegidos de la Tala
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-gray-400">
                      Factor Científico US EPA & Conservatree (LCA)
                    </span>
                  </div>
                </div>

                <div className="p-2.5 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 block">Total Actual</span>
                  <span className="text-xl font-black text-brand-gold font-mono">{trees} árboles</span>
                </div>
              </div>

              <div className="space-y-2 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-gray-300">
                <p>
                  <strong className="text-slate-900 dark:text-white">¿Cómo se calcula?</strong> De acuerdo a los estudios internacionales de la <strong>Agencia de Protección Ambiental de los Estados Unidos (US EPA)</strong>, el <strong>Environmental Paper Network (EPN)</strong> y el centro de investigación <strong>Conservatree</strong>, se requieren en promedio <strong>24 árboles de pulpa maderera virgen</strong> (de 12 metros de altura y 15 a 20 cm de diámetro) para producir 1 tonelada métrica de papel de oficina bond virgen (aproximadamente 200,000 hojas bond tamaño carta de 75-80 g/m²).
                </p>

                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-amber-500/30 font-mono text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  <div><strong>Factor Internacional:</strong> 1 árbol maduro ≈ 8,333 hojas bond tamaño carta (200,000 hojas ÷ 24 árboles)</div>
                  <div><strong>Fórmula Matemática:</strong> Árboles Protegidos = Hojas Ahorradas ÷ 8,333</div>
                  <div className="font-black text-sm pt-1">
                    Cálculo Actual: {sheets} ÷ 8,333 = <span className="text-brand-gold">{trees} árboles salvados de la tala</span>
                  </div>
                </div>

                <p>
                  <strong className="text-slate-900 dark:text-white">Normativa Internacional:</strong> Evaluación de Ciclo de Vida (LCA) conforme a <strong>ISO 14040:2006</strong> e <strong>ISO 14044:2006</strong> (Gestión ambiental — Análisis del ciclo de vida).
                </p>
              </div>

              <a
                href="https://c.environmentalpaper.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-white transition-all group cursor-pointer"
              >
                <div className="text-xs font-bold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-400" />
                  <span>Calculadora Oficial Respaldada: Paper Calculator v4.0 (EPN / US EPA)</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono">
                  <span>c.environmentalpaper.org</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </a>
            </div>
          )}

          {/* ================= TAB: AGUA ================= */}
          {(activeTab === 'water' || activeTab === 'all') && (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-cyan-500/30 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black">
                    <Droplet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">
                      Agua Dulce Preservada (Huella Hídrica)
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-gray-400">
                      Estándar Water Footprint Network & UNESCO-IHE
                    </span>
                  </div>
                </div>

                <div className="p-2.5 px-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 block">Total Actual</span>
                  <span className="text-xl font-black text-cyan-600 dark:text-cyan-400 font-mono">{water.toLocaleString()} Litros</span>
                </div>
              </div>

              <div className="space-y-2 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-gray-300">
                <p>
                  <strong className="text-slate-900 dark:text-white">¿Cómo se calcula?</strong> Según las investigaciones de la <strong>Water Footprint Network (A.Y. Hoekstra et al.)</strong> y el Instituto <strong>UNESCO-IHE</strong>, la fabricación de una sola hoja de papel bond tamaño carta de 80 g/m² consume un promedio de <strong>10 litros de agua dulce</strong> a lo largo de todo su proceso industrial (incluyendo riego, lavado de corteza, despulpado químico y blanqueo).
                </p>

                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-cyan-500/30 font-mono text-xs text-cyan-700 dark:text-cyan-300 space-y-1">
                  <div><strong>Factor Internacional:</strong> 1 hoja de papel bond carta = 10.0 Litros de agua potable limpia</div>
                  <div><strong>Fórmula Matemática:</strong> Agua Preservada = Hojas Ahorradas × 10 Litros</div>
                  <div className="font-black text-sm pt-1">
                    Cálculo Actual: {sheets} × 10 L = <span className="text-cyan-400">{water.toLocaleString()} Litros de agua preservados</span>
                  </div>
                </div>

                <p>
                  <strong className="text-slate-900 dark:text-white">Normativa Internacional:</strong> Norma <strong>ISO 14046:2014</strong> (Gestión ambiental — Huella de agua: Principios, requisitos y directrices).
                </p>
              </div>

              <a
                href="https://www.iso.org/obp/ui#iso:std:iso:14046:ed-1:v1:es"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 hover:text-white transition-all group cursor-pointer"
              >
                <div className="text-xs font-bold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>Portal Oficial: Norma ISO 14046:2014 (Huella de Agua — Plataforma Oficial ISO)</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono">
                  <span>iso.org</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </a>
            </div>
          )}

          {/* ================= TAB: CO2 ================= */}
          {(activeTab === 'co2' || activeTab === 'all') && (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-purple-500/30 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-black">
                    <Wind className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">
                      Emisiones de CO₂ Evitadas (Huella de Carbono)
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-gray-400">
                      Estándar GHG Protocol & ISO 14064 / IPCC
                    </span>
                  </div>
                </div>

                <div className="p-2.5 px-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 block">Total Actual</span>
                  <span className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">{co2} kg CO₂ eq</span>
                </div>
              </div>

              <div className="space-y-2 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-gray-300">
                <p>
                  <strong className="text-slate-900 dark:text-white">¿Cómo se calcula?</strong> El <strong>Greenhouse Gas Protocol (GHG Protocol)</strong> y los balances de carbono del <strong>IPCC</strong> establecen que la producción, transporte y descomposición de 1 tonelada de papel de oficina genera aproximadamente 1,000 kg de CO₂ equivalente (1 kg CO₂e por kg de papel). Como 1 hoja bond tamaño carta estándar pesa aproximadamente 4.7 a 5 gramos (0.005 kg), se evita la emisión de <strong>5.0 gramos de CO₂ eq</strong> por cada hoja digitalizada.
                </p>

                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-purple-500/30 font-mono text-xs text-purple-700 dark:text-purple-300 space-y-1">
                  <div><strong>Factor Internacional:</strong> 1 hoja bond carta = 5.0 gramos de CO₂e (0.005 kg CO₂e)</div>
                  <div><strong>Fórmula Matemática:</strong> CO₂ Evitado = (Hojas Ahorradas × 5 g) ÷ 1,000</div>
                  <div className="font-black text-sm pt-1">
                    Cálculo Actual: ({sheets} × 5 g) ÷ 1,000 = <span className="text-purple-400">{co2} kg de CO₂ equivalente evitados</span>
                  </div>
                </div>

                <p>
                  <strong className="text-slate-900 dark:text-white">Normativa Internacional:</strong> <strong>GHG Protocol Corporate Standard</strong> y <strong>ISO 14064-1</strong> (Cuantificación y reporte de emisiones de gases de efecto invernadero).
                </p>
              </div>

              <a
                href="https://www.iso.org/obp/ui#iso:std:iso:14064:-3:ed-2:v1:es"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 hover:text-white transition-all group cursor-pointer"
              >
                <div className="text-xs font-bold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-purple-400" />
                  <span>Portal Oficial: Norma ISO 14064-3:2019 (Gases de Efecto Invernadero — Plataforma Oficial ISO)</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono">
                  <span>iso.org</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </a>
            </div>
          )}

          {/* Institutional Compliance Seal */}
          <div className="pt-2 text-center text-xs text-slate-500 dark:text-gray-400 border-t border-slate-200 dark:border-white/10 space-y-1">
            <p className="font-bold text-slate-800 dark:text-gray-300">
              CLUB HÍPICO LOS SARGENTOS • GESTIÓN DOCUMENTAL & CORRESPONDENCIA CHLS 360°
            </p>
            <p>
              Valores calculados de acuerdo a coeficientes científicos internacionales auditables.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 dark:bg-black/40 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
          <span className="text-xs font-mono text-slate-500 dark:text-gray-400">
            Normas: ISO 14040 • ISO 14046 • ISO 14064 • EPN v4.0
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-xs hover:scale-105 active:scale-95 transition-all shadow-md shadow-emerald-500/20 border border-emerald-400/50 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
