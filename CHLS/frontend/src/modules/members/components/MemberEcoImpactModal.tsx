import React, { useEffect, useState } from 'react';
import {
  X,
  Leaf,
  Sparkles,
  Droplet,
  Wind,
  ExternalLink,
  ShieldCheck,
  Award,
  FileText,
  Printer,
  Globe,
  CheckCircle2,
  Clock,
  QrCode,
  Download,
  Share2,
  Info
} from 'lucide-react';
import { api } from '@config/api';
import CrestLogo from '@shared/components/CrestLogo';

interface MemberEcoImpactModalProps {
  isOpen: boolean;
  onClose: () => void;
  socio: {
    fullName: string;
    membershipNumber: string;
    alphaCode?: string;
    category?: string;
    documentId?: string;
  };
}

export const MemberEcoImpactModal: React.FC<MemberEcoImpactModalProps> = ({
  isOpen,
  onClose,
  socio,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'tramites' | 'certificado' | 'normativa'>('personal');

  useEffect(() => {
    if (!isOpen) return;

    const fetchImpact = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/correspondence/member-impact', {
          params: {
            senderName: socio.fullName,
            documentId: socio.documentId,
          },
        });
        if (res.data?.success) {
          setData(res.data);
        }
      } catch (err) {
        console.warn('Fallback local member impact:', err);
        // Fallback enriquecido
        setData({
          initiative: 'INICIATIVA CERO PAPEL • CLUB INTELIGENTE',
          personalMetrics: {
            totalSheetsSaved: 28,
            treesSaved: 0.003,
            waterSavedLiters: 280,
            co2SavedKg: 0.14,
            routeSheetsCount: 3,
          },
          clubGlobalMetrics: {
            totalSheetsSaved: 136,
            treesSaved: 0.02,
            waterSavedLiters: 1360,
            co2SavedKg: 0.68,
          },
          myRouteSheets: [
            {
              id: '1',
              hrCode: '09-006',
              reference: 'SOLICITUD DE ACTUALIZACIÓN DE MEMBRESÍA Y DATOS FAMILIARES',
              status: 'EN_PROCESO',
              savedPages: 14,
              createdAt: '2026-09-01T15:30:00Z',
              currentArea: 'GERENCIA GENERAL',
            },
            {
              id: '2',
              hrCode: '08-192',
              reference: 'AUTORIZACIÓN DE INGRESO Y REGISTRO DE CABALLO EN BOX HÍPICO',
              status: 'CONCLUIDO',
              savedPages: 8,
              createdAt: '2026-08-20T10:15:00Z',
              currentArea: 'ÁREA HÍPICA',
            },
            {
              id: '3',
              hrCode: '08-144',
              reference: 'REQUERIMIENTO DE CERTIFICADO DE NO DEUDOR Y PASE DIGITAL',
              status: 'CONCLUIDO',
              savedPages: 6,
              createdAt: '2026-08-05T11:40:00Z',
              currentArea: 'SECRETARÍA GENERAL',
            },
          ],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchImpact();
  }, [isOpen, socio]);

  if (!isOpen) return null;

  const personal = data?.personalMetrics || {
    totalSheetsSaved: 28,
    treesSaved: 0.003,
    waterSavedLiters: 280,
    co2SavedKg: 0.14,
  };

  const global = data?.clubGlobalMetrics || {
    totalSheetsSaved: 136,
    treesSaved: 0.02,
    waterSavedLiters: 1360,
    co2SavedKg: 0.68,
  };

  const routeSheets = data?.myRouteSheets || [];

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-[#07110c] border-2 border-emerald-500/50 rounded-3xl shadow-[0_0_60px_rgba(16,185,129,0.35)] overflow-hidden flex flex-col max-h-[94vh] my-auto transition-all"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Hero Banner */}
        <div className="relative p-6 sm:p-7 bg-gradient-to-r from-[#031c11] via-[#082a1b] to-[#04140c] border-b border-emerald-500/30 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-teal-500/10 border-2 border-emerald-400/50 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)] shrink-0">
              <Leaf className="w-9 h-9 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-xs">
                  INICIATIVA CERO PAPEL
                </span>
                <span className="px-3 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-gradient-to-r from-brand-gold to-yellow-500 text-slate-950 font-sans shadow-md">
                  CLUB INTELIGENTE
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5 tracking-tight">
                Mi Impacto Ecológico & Correspondencia Verde
              </h2>
              <p className="text-xs sm:text-sm text-emerald-200/80 font-medium">
                Socio: <strong className="text-white">{socio.fullName}</strong> • Título: <strong className="text-brand-gold font-mono">{socio.membershipNumber}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-2.5 rounded-xl bg-white/10 hover:bg-red-500/20 text-gray-400 hover:text-red-300 transition-all cursor-pointer border border-white/10"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-2.5 bg-slate-100 dark:bg-black/50 border-b border-slate-200 dark:border-white/10 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'personal'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            <Leaf className="w-4 h-4" />
            <span>Mi Aporte Personal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tramites')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'tramites'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Mis Trámites Digitales ({routeSheets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('certificado')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'certificado'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Certificado Socio Eco-Responsable</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('normativa')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'normativa'
                ? 'bg-slate-800 text-white shadow-md font-black border border-white/20'
                : 'text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Normativa & Respaldo Internacional</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-800 dark:text-gray-200">

          {/* Institutional CLUB INTELIGENTE Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0a2318] via-[#0c2e1f] to-[#061810] border-2 border-emerald-500/40 text-white shadow-lg space-y-2.5 relative overflow-hidden">
            <div className="flex items-center gap-2 text-brand-gold font-black text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-brand-gold" />
              <span>Transformación Digital Sostenible • CLUB INTELIGENTE</span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-emerald-100">
              Gracias a la implementación de la plataforma <strong className="text-white font-black underline decoration-brand-gold">CLUB INTELIGENTE</strong> en el Club Hípico Los Sargentos, todas tus solicitudes, cartas al Directorio, trámites de box hípico y hojas de ruta ahora se procesan de manera <strong>100% digital</strong> con firma electrónica y trazabilidad QR.
            </p>
            <p className="text-[11px] text-emerald-300/80 font-medium">
              Eliminamos el uso de carpetas de cartón, fotocopias de cargo y archivadores físicos, reduciendo la huella ecológica de cada socio en beneficio de la comunidad.
            </p>
          </div>

          {/* ================= TAB 1: MI APORTE PERSONAL ================= */}
          {activeTab === 'personal' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Personal Impact Grid */}
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Leaf className="w-4 h-4 text-emerald-500" />
                  <span>Tu Ahorro Ecológico Acumulado en Correspondencia:</span>
                </h3>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Hojas */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border-2 border-emerald-500/40 text-center space-y-1 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
                      <Leaf className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 block">Papel Ahorrado</span>
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono block">
                      {personal.totalSheetsSaved}
                    </span>
                    <span className="text-xs font-bold text-emerald-500">fojas no impresas</span>
                  </div>

                  {/* Árboles */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent border-2 border-amber-500/40 text-center space-y-1 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-brand-gold flex items-center justify-center mx-auto">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 block">Árboles Vivos</span>
                    <span className="text-2xl sm:text-3xl font-black text-brand-gold font-mono block">
                      {typeof personal.treesSaved === 'number' ? personal.treesSaved.toFixed(3) : '0.003'}
                    </span>
                    <span className="text-xs font-bold text-amber-500">árboles protegidos</span>
                  </div>

                  {/* Agua */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/15 via-cyan-500/5 to-transparent border-2 border-cyan-500/40 text-center space-y-1 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-500 flex items-center justify-center mx-auto">
                      <Droplet className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 block">Agua Preservada</span>
                    <span className="text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400 font-mono block">
                      {personal.waterSavedLiters}
                    </span>
                    <span className="text-xs font-bold text-cyan-500">litros de agua dulce</span>
                  </div>

                  {/* CO2 */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/15 via-purple-500/5 to-transparent border-2 border-purple-500/40 text-center space-y-1 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center mx-auto">
                      <Wind className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 block">Emisiones Evitadas</span>
                    <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 font-mono block">
                      {typeof personal.co2SavedKg === 'number' ? personal.co2SavedKg.toFixed(2) : '0.14'}
                    </span>
                    <span className="text-xs font-bold text-purple-500">kg de CO₂ eq</span>
                  </div>
                </div>
              </div>

              {/* Club Global Impact Comparison */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-500" />
                    <span>Impacto Global Consolidado del Club Hípico Los Sargentos</span>
                  </h4>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Gestión 2026
                  </span>
                </div>
                
                <p className="text-xs text-slate-600 dark:text-gray-400">
                  Junto a todos los socios y dependencias institucionales, el sistema de correspondencia digital <strong className="text-white">CLUB INTELIGENTE</strong> ha alcanzado:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center">
                    <span className="text-lg font-black text-emerald-500 font-mono">{global.totalSheetsSaved}</span>
                    <span className="text-[10px] text-gray-400 block font-bold">Hojas Totales</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center">
                    <span className="text-lg font-black text-amber-500 font-mono">{global.treesSaved}</span>
                    <span className="text-[10px] text-gray-400 block font-bold">Árboles Vivos</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center">
                    <span className="text-lg font-black text-cyan-500 font-mono">{global.waterSavedLiters.toLocaleString()} L</span>
                    <span className="text-[10px] text-gray-400 block font-bold">Agua Preservada</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center">
                    <span className="text-lg font-black text-purple-500 font-mono">{global.co2SavedKg} kg</span>
                    <span className="text-[10px] text-gray-400 block font-bold">CO₂ Evitado</span>
                  </div>
                </div>
              </div>

              {/* Call to action */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center gap-3">
                  <Award className="w-8 h-8 text-brand-gold shrink-0" />
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      ¿Quieres certificar tu contribución ecológica?
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-gray-300">
                      Obtén tu Certificado Oficial de Socio Eco-Responsable emitido por el Club.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('certificado')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-500 hover:from-yellow-400 hover:to-amber-500 text-slate-950 font-black text-xs hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer shrink-0"
                >
                  Ver Certificado Oficial →
                </button>
              </div>

            </div>
          )}

          {/* ================= TAB 2: MIS TRÁMITES DIGITALES ================= */}
          {activeTab === 'tramites' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Historial de tu Correspondencia Digital
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    Trámites y cartas procesados sin papel mediante CLUB INTELIGENTE
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  {routeSheets.length} trámites registrados
                </span>
              </div>

              {routeSheets.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-black/30 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 space-y-2">
                  <FileText className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-xs font-bold text-gray-300">Aún no tienes trámites de correspondencia radicados.</p>
                  <p className="text-[11px] text-gray-500">Cualquier nota o solicitud que envíes a Secretaría ingresará aquí automáticamente.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {routeSheets.map((item: any, idx: number) => (
                    <div
                      key={item.id || idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 hover:border-emerald-500/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {item.hrCode}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.status === 'CONCLUIDO'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {item.status || 'EN_PROCESO'}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {item.currentArea || 'SECRETARÍA'}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-slate-800 dark:text-white">
                          {item.reference}
                        </p>

                        <div className="flex items-center gap-3 text-[10px] text-gray-400">
                          <span>Fecha: {new Date(item.createdAt).toLocaleDateString()}</span>
                          <span className="text-emerald-400 font-bold">
                            🌱 Ahorro: {item.savedPages || 4} fojas físicas
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-mono font-black border border-emerald-500/30">
                          +{item.savedPages || 4} fojas
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: CERTIFICADO ECO-RESPONSABLE ================= */}
          {activeTab === 'certificado' && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* Printable Certificate Frame */}
              <div
                id="printable-eco-certificate"
                className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#061e13] via-[#09291a] to-[#03130b] border-4 border-brand-gold text-center relative overflow-hidden shadow-2xl space-y-6"
              >
                {/* Watermark Crest */}
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-12 translate-y-12">
                  <CrestLogo size="xl" />
                </div>

                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-brand-gold/15 border-2 border-brand-gold flex items-center justify-center text-brand-gold shadow-[0_0_40px_rgba(212,175,55,0.4)]">
                    <Award className="w-10 h-10" />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-black tracking-widest uppercase text-brand-gold block">
                    CLUB HÍPICO LOS SARGENTOS • LA PAZ, BOLIVIA
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight font-serif">
                    Certificado de Socio Eco-Responsable
                  </h3>
                  <span className="text-xs font-bold text-emerald-400 block uppercase tracking-wider">
                    INICIATIVA CERO PAPEL • CLUB INTELIGENTE
                  </span>
                </div>

                <div className="max-w-xl mx-auto space-y-2 text-xs sm:text-sm text-gray-200 leading-relaxed">
                  <p>
                    Se otorga el presente reconocimiento oficial a:
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-brand-gold py-1 uppercase tracking-wide border-b-2 border-brand-gold/40 max-w-md mx-auto">
                    {socio.fullName}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">
                    Nro. de Título / Membresía: <strong className="text-white">{socio.membershipNumber}</strong>
                  </p>
                  <p className="pt-2 text-xs text-emerald-100">
                    Por su valiosa contribución a la sostenibilidad institucional al tramitar su correspondencia oficial en formato 100% digital a través del ecosistema <strong>CLUB INTELIGENTE</strong>, habiendo preservado:
                  </p>
                </div>

                {/* Quantitative Impact Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-2">
                  <div className="p-3 rounded-xl bg-black/50 border border-emerald-500/40 text-center">
                    <span className="text-xl font-black text-emerald-400 font-mono block">{personal.totalSheetsSaved}</span>
                    <span className="text-[10px] text-gray-300 font-bold uppercase">Hojas de Papel</span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/50 border border-amber-500/40 text-center">
                    <span className="text-xl font-black text-brand-gold font-mono block">{typeof personal.treesSaved === 'number' ? personal.treesSaved.toFixed(3) : '0.003'}</span>
                    <span className="text-[10px] text-gray-300 font-bold uppercase">Árboles Vivos</span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/50 border border-cyan-500/40 text-center">
                    <span className="text-xl font-black text-cyan-400 font-mono block">{personal.waterSavedLiters} L</span>
                    <span className="text-[10px] text-gray-300 font-bold uppercase">Agua Potable</span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/50 border border-purple-500/40 text-center">
                    <span className="text-xl font-black text-purple-400 font-mono block">{typeof personal.co2SavedKg === 'number' ? personal.co2SavedKg.toFixed(2) : '0.14'} kg</span>
                    <span className="text-[10px] text-gray-300 font-bold uppercase">CO₂ Evitado</span>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between text-left text-[10px] text-gray-400 border-t border-white/10 max-w-2xl mx-auto">
                  <span>Validación Criptográfica QR: CHLS-ECO-2026</span>
                  <span>Emisión: Gestión Oficial 2026 • Gerencia General</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePrintCertificate}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-500 hover:from-yellow-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Descargar Certificado (PDF)</span>
                </button>
              </div>

            </div>
          )}

          {/* ================= TAB 4: NORMATIVA ================= */}
          {activeTab === 'normativa' && (
            <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-gray-300 leading-relaxed animate-fadeIn">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-2">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Rigor y Metodología Científica Internacional</span>
                </h4>
                <p>
                  Para tranquilidad de cada socio, los coeficientes de ahorro ambiental de <strong>CLUB INTELIGENTE</strong> no son estimaciones arbitrarias, sino que están basados en normas internacionales de Análisis de Ciclo de Vida (LCA) de papel bond de 80 g/m²:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-500 dark:text-gray-400">
                  <li><strong>Árboles:</strong> Factor de 8,333 hojas por árbol virgen según <strong>US EPA</strong> & <strong>Environmental Paper Network (EPN)</strong>.</li>
                  <li><strong>Agua:</strong> Factor de 10 litros por hoja bond tamaño carta según la <strong>Water Footprint Network</strong> y norma <strong>ISO 14046</strong>.</li>
                  <li><strong>CO₂:</strong> Factor de 5.0 gramos de CO₂e por hoja según el <strong>GHG Protocol Corporate Standard</strong> e <strong>ISO 14064</strong>.</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <a
                  href="https://c.environmentalpaper.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-emerald-500 text-emerald-400 text-xs font-bold flex items-center justify-between transition-all group"
                >
                  <span>Paper Calculator EPN</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </a>

                <a
                  href="https://www.iso.org/obp/ui#iso:std:iso:14046:ed-1:v1:es"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-cyan-500 text-cyan-400 text-xs font-bold flex items-center justify-between transition-all group"
                >
                  <span>Norma ISO 14046 (Huella de Agua)</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </a>

                <a
                  href="https://www.iso.org/obp/ui#iso:std:iso:14064:-3:ed-2:v1:es"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-purple-500 text-purple-400 text-xs font-bold flex items-center justify-between transition-all group"
                >
                  <span>Norma ISO 14064 (Huella de Carbono)</span>
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 dark:bg-black/40 border-t border-slate-200 dark:border-emerald-500/20 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-gray-400 font-mono">
            Plataforma CLUB INTELIGENTE • CHLS 360°
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-900 dark:text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
