import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  User, 
  Building, 
  Phone, 
  Mail, 
  DollarSign, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Calendar, 
  FileText, 
  CheckCircle, 
  Trash2, 
  Edit3,
  Award,
  ShieldCheck,
  Calculator,
  QrCode
} from 'lucide-react';
import { commercialApi, CommercialLead } from '../services/commercialApi';
import { QuoteSimulatorModal } from './QuoteSimulatorModal';
import toast from 'react-hot-toast';

export const PIPELINE_STAGES = [
  { id: 'NUEVO_LEAD', label: '1. Prospecto Calificado', color: 'border-blue-500/40 bg-blue-500/10 text-blue-400' },
  { id: 'VISITA_PROGRAMADA', label: '2. Visita & Day Pass', color: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
  { id: 'PROPUESTA_ENVIADA', label: '3. Propuesta 60/40', color: 'border-purple-500/40 bg-purple-500/10 text-purple-400' },
  { id: 'POSTULACION_AVAL', label: '4. Cartas de Aval (2 Socios)', color: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400' },
  { id: 'APROBADO_DIRECTORIO', label: '5. Aprobado Directorio', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
  { id: 'CERRADO_GANADO', label: '6. Cierre & Traspaso CDP', color: 'border-brand-gold bg-brand-gold/20 text-brand-gold' },
];

export const CommercialLeadKanban: React.FC = () => {
  const [leads, setLeads] = useState<CommercialLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLeadForQuote, setSelectedLeadForQuote] = useState<CommercialLead | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    documentId: '',
    phone: '',
    email: '',
    company: '',
    position: '',
    categoryInterest: 'FAMILIAR',
    sponsorMember1: '',
    sponsorMember2: '',
    sellerName: 'Eduardo (Comercial)',
    budgetEstimated: 69600,
    notes: '',
  });

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const res = await commercialApi.listLeads();
      setLeads(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar prospectos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      toast.error('El nombre del prospecto es obligatorio');
      return;
    }

    try {
      await commercialApi.createLead(formData);
      toast.success('¡Prospecto agregado al Pipeline de Admisión!');
      setShowCreateModal(false);
      loadLeads();
      setFormData({
        fullName: '',
        documentId: '',
        phone: '',
        email: '',
        company: '',
        position: '',
        categoryInterest: 'FAMILIAR',
        sponsorMember1: '',
        sponsorMember2: '',
        sellerName: 'Eduardo (Comercial)',
        budgetEstimated: 69600,
        notes: '',
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al registrar prospecto');
    }
  };

  const handleStageMove = async (leadId: string, currentStatus: string, direction: 'next' | 'prev') => {
    const stageIds = PIPELINE_STAGES.map((s) => s.id);
    const currentIndex = stageIds.indexOf(currentStatus);
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex < 0 || nextIndex >= stageIds.length) return;

    const nextStatus = stageIds[nextIndex];
    try {
      await commercialApi.updateLead(leadId, { status: nextStatus });
      toast.success(`Prospecto avanzado a: ${PIPELINE_STAGES[nextIndex].label}`);
      loadLeads();
    } catch (err) {
      toast.error('Error al mover prospecto');
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm('¿Desea eliminar este prospecto?')) return;
    try {
      await commercialApi.deleteLead(leadId);
      toast.success('Prospecto eliminado');
      loadLeads();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="glass-panel p-6 border-l-4 border-brand-gold bg-white/90 dark:bg-[#0d1311]/90 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-gray-200 dark:border-white/10 rounded-3xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-500/30 flex items-center gap-1">
              <Award className="w-3 h-3" /> Embudo de Admisión
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Circuito estatutario de postulación para socios selectos
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white serif-brand mt-1">
            Pipeline Comercial & Comité de Admisiones
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Monitorea el progreso desde el contacto inicial hasta las cartas de aval de socios y la aprobación de directorio.
          </p>
        </div>

        <button 
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-600 text-black font-extrabold text-xs flex items-center gap-2 hover:scale-105 shadow-lg shadow-brand-gold/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" /> Registrar Nuevo Prospecto
        </button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.status === stage.id);
          return (
            <div 
              key={stage.id}
              className="flex flex-col rounded-3xl bg-gray-50/80 dark:bg-black/40 border border-gray-200 dark:border-white/10 p-3 min-w-[260px] xl:min-w-0 min-h-[480px]"
            >
              {/* Column Header */}
              <div className="flex justify-between items-center px-2 py-2 border-b border-gray-200 dark:border-white/10 mb-3">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${stage.color}`}>
                  {stage.label}
                </span>
                <span className="text-xs font-mono font-bold text-gray-500">
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards list */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {stageLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-[#0d1311] border border-gray-200 dark:border-brand-gold/20 shadow-sm hover:border-brand-gold transition-all space-y-2.5 text-xs group"
                  >
                    <div>
                      <span className="text-[9px] font-black uppercase text-brand-gold block">
                        {lead.categoryInterest}
                      </span>
                      <h4 className="font-extrabold text-sm text-gray-900 dark:text-white leading-tight mt-0.5">
                        {lead.fullName}
                      </h4>
                      {lead.company && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 shrink-0" />
                          <span className="truncate">{lead.position ? `${lead.position} • ` : ''}{lead.company}</span>
                        </p>
                      )}
                    </div>

                    {/* Contact details */}
                    <div className="space-y-1 text-[10px] text-gray-500 dark:text-gray-400">
                      {lead.phone && (
                        <p className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-400" /> {lead.phone}
                        </p>
                      )}
                      {lead.sponsorMember1 && (
                        <p className="text-amber-800 dark:text-brand-gold/90 font-medium">
                          Aval 1: {lead.sponsorMember1}
                        </p>
                      )}
                    </div>

                    {/* Budget */}
                    {lead.budgetEstimated && (
                      <div className="flex justify-between items-center text-[10px] pt-2 border-t border-gray-100 dark:border-white/5">
                        <span className="text-gray-500">Monto Estimado:</span>
                        <strong className="text-gray-900 dark:text-white font-mono">
                          Bs {Number(lead.budgetEstimated).toLocaleString()}
                        </strong>
                      </div>
                    )}

                    {/* Actions bar */}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-white/5">
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedLeadForQuote(lead)}
                          className="p-1 rounded-lg bg-amber-500/10 hover:bg-brand-gold hover:text-black text-brand-gold transition-colors"
                          title="Formular Cotización 60/40 en PDF"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteLead(lead.id)}
                          className="p-1 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                          title="Eliminar Prospecto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStageMove(lead.id, lead.status, 'prev')}
                          disabled={stage.id === PIPELINE_STAGES[0].id}
                          className="p-1 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-white/20 text-gray-400 disabled:opacity-20"
                          title="Retroceder Etapa"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleStageMove(lead.id, lead.status, 'next')}
                          disabled={stage.id === PIPELINE_STAGES[PIPELINE_STAGES.length - 1].id}
                          className="p-1 rounded-lg bg-brand-gold/20 hover:bg-brand-gold hover:text-black text-brand-gold disabled:opacity-20 transition-colors"
                          title="Avanzar Etapa"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- CREATE LEAD MODAL --- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white dark:bg-[#0d1311] border border-gray-300 dark:border-brand-gold/40 rounded-3xl p-6 shadow-2xl space-y-4 text-gray-900 dark:text-white my-8">
            
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold serif-brand text-gray-900 dark:text-white">
                  Registrar Prospecto a Socio Selecto
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Ingresa los datos para seguimiento comercial y proceso de admisión
                </p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
              
              <div>
                <label className="text-gray-600 dark:text-gray-400 uppercase font-semibold">
                  Nombre Completo del Postulante *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Lic. Gonzalo Durán Morales"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 dark:text-gray-400 uppercase font-semibold">CI / Pasaporte</label>
                  <input
                    type="text"
                    placeholder="Ej: 3489201 LP"
                    value={formData.documentId}
                    onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-600 dark:text-gray-400 uppercase font-semibold">Celular / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ej: 77219800"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 dark:text-gray-400 uppercase font-semibold">Empresa / Institución</label>
                  <input
                    type="text"
                    placeholder="Ej: Consorcio Andino S.A."
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-600 dark:text-gray-400 uppercase font-semibold">Cargo / Profesión</label>
                  <input
                    type="text"
                    placeholder="Ej: Gerente General"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 dark:text-gray-400 uppercase font-semibold">Categoría de Interés</label>
                  <select
                    value={formData.categoryInterest}
                    onChange={(e) => setFormData({ ...formData, categoryInterest: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs outline-none"
                  >
                    <option value="FAMILIAR">Socio Familiar (FAM)</option>
                    <option value="INDIVIDUAL">Socio Individual (IND)</option>
                    <option value="JUNIOR_MAYOR">Socio Junior Mayor (JMA)</option>
                    <option value="DEPORTIVO">Socio Deportivo (DEP)</option>
                    <option value="PRE_ASOCIADO">Pre-Asociado (PRE)</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-600 dark:text-gray-400 uppercase font-semibold">Presupuesto Estimado (Bs)</label>
                  <input
                    type="number"
                    value={formData.budgetEstimated}
                    onChange={(e) => setFormData({ ...formData, budgetEstimated: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs outline-none font-bold"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 space-y-2">
                <p className="text-[10px] text-brand-gold uppercase font-bold">Socios Propietarios Patrocinadores (Avales de Estatuto)</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Socio Garante 1 (Ej. Dr. Mario Ortiz)"
                    value={formData.sponsorMember1}
                    onChange={(e) => setFormData({ ...formData, sponsorMember1: e.target.value })}
                    className="p-2 rounded-xl bg-white dark:bg-black/60 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Socio Garante 2 (Ej. Arq. Jorge Vaca)"
                    value={formData.sponsorMember2}
                    onChange={(e) => setFormData({ ...formData, sponsorMember2: e.target.value })}
                    className="p-2 rounded-xl bg-white dark:bg-black/60 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-600 dark:text-gray-400 uppercase font-semibold">Notas de Seguimiento</label>
                <textarea
                  rows={2}
                  placeholder="Intereses deportivos, hijos, observaciones..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-brand-gold text-black font-bold text-xs hover:scale-105 transition-all shadow-md"
                >
                  Guardar en Pipeline
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Quote Simulator Modal */}
      {selectedLeadForQuote && (
        <QuoteSimulatorModal
          isOpen={!!selectedLeadForQuote}
          onClose={() => setSelectedLeadForQuote(null)}
          initialLeadName={selectedLeadForQuote.fullName}
        />
      )}

    </div>
  );
};
export default CommercialLeadKanban;
