import React, { useState } from 'react';
import { 
  Send, 
  Mail, 
  MessageSquare, 
  FileText, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  X,
  Sparkles,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';

export const MemberNotificationsRegistryView: React.FC = () => {
  // Types of Statutory Notifications (Pág 8 - Guía Socio)
  const notificationTypes = [
    {
      code: 'CARNOTI',
      name: 'Notificación de Mora Estatutaria (>90 Días)',
      restrictsAccess: true,
      graceDays: 15,
      channel: 'WHATSAPP_EMAIL',
      description: 'Aviso formal de mora previa a la suspensión temporal de derechos sociales.'
    },
    {
      code: 'CARAMON',
      name: 'Carta de Amonestación Disciplinaria',
      restrictsAccess: false,
      graceDays: 10,
      channel: 'CARTA_DIGITAL',
      description: 'Llamada de atención por infracción al reglamento de instalaciones o etiqueta ecuestre.'
    },
    {
      code: 'CARINT',
      name: 'Carta de Intimación Notarial & Cobranza Coactiva',
      restrictsAccess: true,
      graceDays: 5,
      channel: 'NOTARIAL_FISICO',
      description: 'Último requerimiento previo al pase a asesoría jurídica y remate estatutario.'
    },
    {
      code: 'CITASAM',
      name: 'Citación Oficial a Asamblea General Ordinaria/Extraordinaria',
      restrictsAccess: false,
      graceDays: 30,
      channel: 'WHATSAPP_MASIVO',
      description: 'Convocatoria estatutaria con orden del día, memoria anual y balance auditado.'
    },
    {
      code: 'RECCRED',
      name: 'Recordatorio de Renovación / Emisión de Credencial',
      restrictsAccess: false,
      graceDays: 15,
      channel: 'WHATSAPP_SMS',
      description: 'Aviso de vencimiento de credencial física o pase QR de dependientes.'
    }
  ];

  // Dispatched Notifications History (Pág 23 - Guía Socio)
  const [dispatches, setDispatches] = useState<any[]>([
    {
      id: 'ENV-2026-001',
      code: 'ENV-2026-001',
      notificationTypeCode: 'CARNOTI',
      notificationTypeName: 'Notificación de Mora Estatutaria',
      recipientName: 'Patricia Morales de Ortiz',
      memberCode: '1038',
      alphaCode: 'MOR-ORT-P-A',
      phone: '+591 76543210',
      dispatchDate: '2026-08-14 10:30',
      responsible: 'Lic. Federico Betancourt',
      channel: 'WhatsApp + Correo',
      status: 'ENTREGADO',
      restrictsAccess: true,
      notes: 'Deuda acumulada 4 meses (Bs 2,000.00). Plazo 15 días vence el 29/08.'
    },
    {
      id: 'ENV-2026-002',
      code: 'ENV-2026-002',
      notificationTypeCode: 'CITASAM',
      notificationTypeName: 'Citación Oficial a Asamblea General',
      recipientName: 'Carlos Mendoza Vargas',
      memberCode: '1055',
      alphaCode: 'MEN-VAR-C-E',
      phone: '+591 71234567',
      dispatchDate: '2026-08-10 15:45',
      responsible: 'Secretaría General Directorio',
      channel: 'WhatsApp Masivo',
      status: 'LEIDO',
      restrictsAccess: false,
      notes: 'Convocatoria Asamblea Ordinaria Balance Gestión 2025-2026.'
    },
    {
      id: 'ENV-2026-003',
      code: 'ENV-2026-003',
      notificationTypeCode: 'CARAMON',
      notificationTypeName: 'Carta de Amonestación Disciplinaria',
      recipientName: 'Roberto Paz Soldán',
      memberCode: '1029',
      alphaCode: 'PAZ-SOL-R-T',
      phone: '+591 72098765',
      dispatchDate: '2026-08-02 09:15',
      responsible: 'Comité de Disciplina & Etiqueta',
      channel: 'Carta Firmada + Email',
      status: 'ENTREGADO',
      restrictsAccess: false,
      notes: 'Incumplimiento de horario de uso en cancha de tenis #3.'
    }
  ]);

  // Modal State
  const [showSendModal, setShowSendModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Form State
  const [newNotification, setNewNotification] = useState({
    notificationTypeCode: 'CARNOTI',
    recipientName: '',
    memberCode: '',
    phone: '',
    channel: 'WHATSAPP',
    customMessage: '',
    notes: ''
  });

  const selectedTypeObj = notificationTypes.find(t => t.code === newNotification.notificationTypeCode) || notificationTypes[0];

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotification.recipientName.trim()) {
      toast.error('Ingresa el socio destinatario');
      return;
    }

    const created: any = {
      id: `ENV-2026-00${dispatches.length + 1}`,
      code: `ENV-2026-00${dispatches.length + 1}`,
      notificationTypeCode: selectedTypeObj.code,
      notificationTypeName: selectedTypeObj.name,
      recipientName: newNotification.recipientName,
      memberCode: newNotification.memberCode || '1055',
      alphaCode: 'SOC-NOT-N-A',
      phone: newNotification.phone || '+591 70000000',
      dispatchDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      responsible: 'Administración General',
      channel: newNotification.channel === 'WHATSAPP' ? 'WhatsApp' : 'Correo Electrónico',
      status: 'ENVIADO',
      restrictsAccess: selectedTypeObj.restrictsAccess,
      notes: newNotification.notes || newNotification.customMessage
    };

    setDispatches([created, ...dispatches]);
    toast.success(`¡Notificación ${selectedTypeObj.name} enviada exitosamente a ${newNotification.recipientName}!`);
    setShowSendModal(false);
  };

  const filteredDispatches = dispatches.filter(d => {
    const matchesSearch = 
      d.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.notificationTypeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.memberCode.includes(searchTerm);

    const matchesType = filterType === 'ALL' || d.notificationTypeCode === filterType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white serif-brand flex items-center gap-2">
            <Send className="w-5 h-5 text-brand-gold" /> Registro de Envíos & Notificaciones Estatutarias
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Control de notificaciones de mora, amonestaciones, citaciones y comunicaciones oficiales (Págs 8 y 23 - Guía Socio)
          </p>
        </div>

        <button
          onClick={() => setShowSendModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-600 text-black font-extrabold text-xs flex items-center gap-2 hover:scale-105 shadow-md shadow-brand-gold/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Emitir Nueva Notificación Oficial
        </button>
      </div>

      {/* Catalog of Notification Types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {notificationTypes.map((t) => (
          <div 
            key={t.code}
            className="p-4 rounded-2xl bg-white dark:bg-[#0d1311] border border-gray-200 dark:border-white/10 hover:border-brand-gold/40 shadow-sm space-y-2 flex flex-col justify-between"
          >
            <div className="space-y-1">
              <div className="flex justify-between items-start">
                <span className="font-mono font-bold text-xs text-amber-800 dark:text-brand-gold">{t.code}</span>
                {t.restrictsAccess ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/30">
                    Restringe Garita
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                    Informativo
                  </span>
                )}
              </div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white serif-brand">{t.name}</h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">{t.description}</p>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex justify-between items-center text-[10px] text-gray-500">
              <span>Plazo estatutario: <strong className="text-gray-800 dark:text-gray-200">{t.graceDays} días</strong></span>
              <button
                onClick={() => {
                  setNewNotification(prev => ({ ...prev, notificationTypeCode: t.code }));
                  setShowSendModal(true);
                }}
                className="text-amber-800 dark:text-brand-gold font-bold hover:underline"
              >
                Emitir →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Dispatches Table */}
      <div className="p-4 rounded-3xl bg-white dark:bg-[#0d1311] border border-gray-200 dark:border-white/10 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por socio, tipo de notificación, código..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-xs text-gray-900 dark:text-white outline-none"
            >
              <option value="ALL">Todos los Tipos de Notificación</option>
              <option value="CARNOTI">Notificaciones de Mora (CARNOTI)</option>
              <option value="CARAMON">Cartas de Amonestación (CARAMON)</option>
              <option value="CITASAM">Citaciones a Asamblea (CITASAM)</option>
              <option value="CARINT">Intimación Notarial (CARINT)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100 dark:bg-black/60 text-gray-500 uppercase font-bold text-[10px] border-b border-gray-200 dark:border-white/10">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Socio Destinatario</th>
                <th className="p-3">Tipo de Notificación</th>
                <th className="p-3">Fecha & Canal</th>
                <th className="p-3">Restringe Garita</th>
                <th className="p-3">Estado Envío</th>
                <th className="p-3 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {filteredDispatches.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="p-3 font-mono font-bold text-amber-800 dark:text-brand-gold">{d.code}</td>
                  <td className="p-3">
                    <span className="font-bold text-gray-900 dark:text-white block">{d.recipientName}</span>
                    <span className="text-[10px] text-gray-400 font-mono">#{d.memberCode} • {d.phone}</span>
                  </td>
                  <td className="p-3 font-semibold text-gray-800 dark:text-gray-200">{d.notificationTypeName}</td>
                  <td className="p-3">
                    <span className="text-gray-900 dark:text-white block font-medium">{d.dispatchDate}</span>
                    <span className="text-[10px] text-gray-400">{d.channel}</span>
                  </td>
                  <td className="p-3">
                    {d.restrictsAccess ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/30">
                        Sí (Bloquea Ingreso)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold text-gray-400 bg-gray-100 dark:bg-white/10">
                        No
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                      {d.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => alert(`Detalles del Envío ${d.code}:\n\nDestinatario: ${d.recipientName} (#${d.memberCode})\nTipo: ${d.notificationTypeName}\nNotas: ${d.notes}\nResponsable: ${d.responsible}`)}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 text-[11px] font-bold"
                    >
                      Ver Glosa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL: EMITIR NUEVA NOTIFICACION */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0d1311] border border-gray-300 dark:border-brand-gold/30 rounded-3xl p-6 shadow-2xl space-y-4 my-8 text-gray-900 dark:text-white">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-brand-gold" />
                <h3 className="text-lg font-bold serif-brand">Emitir Notificación Oficial</h3>
              </div>
              <button onClick={() => setShowSendModal(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 uppercase">Tipo de Notificación Estatutaria *</label>
                <select
                  value={newNotification.notificationTypeCode}
                  onChange={e => setNewNotification({ ...newNotification, notificationTypeCode: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 font-bold text-gray-900 dark:text-white outline-none"
                >
                  {notificationTypes.map(t => (
                    <option key={t.code} value={t.code}>
                      {t.code} - {t.name} (Plazo {t.graceDays} días)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-bold text-gray-700 dark:text-gray-300 uppercase">Socio Destinatario *</label>
                  <input
                    type="text"
                    placeholder="Ej. Carlos Mendoza Vargas"
                    value={newNotification.recipientName}
                    onChange={e => setNewNotification({ ...newNotification, recipientName: e.target.value })}
                    className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 font-bold text-gray-900 dark:text-white outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 uppercase">Nro. Membresía</label>
                  <input
                    type="text"
                    placeholder="1055"
                    value={newNotification.memberCode}
                    onChange={e => setNewNotification({ ...newNotification, memberCode: e.target.value })}
                    className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 font-mono font-bold text-amber-800 dark:text-brand-gold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 uppercase">Canal de Envío</label>
                  <select
                    value={newNotification.channel}
                    onChange={e => setNewNotification({ ...newNotification, channel: e.target.value })}
                    className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white outline-none"
                  >
                    <option value="WHATSAPP">WhatsApp Oficial CHLS</option>
                    <option value="EMAIL">Correo Electrónico Institucional</option>
                    <option value="CARTA_FISICA">Carta Física / Courier Notarial</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 uppercase">Teléfono Móvil</label>
                  <input
                    type="text"
                    placeholder="+591 70000000"
                    value={newNotification.phone}
                    onChange={e => setNewNotification({ ...newNotification, phone: e.target.value })}
                    className="w-full mt-1 p-2 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 font-mono text-gray-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 uppercase">Contenido / Glosa de la Notificación</label>
                <textarea
                  rows={3}
                  placeholder="Detalla el motivo, monto adeudado o resolución de directorio..."
                  value={newNotification.notes}
                  onChange={e => setNewNotification({ ...newNotification, notes: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white outline-none"
                ></textarea>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-brand-gold/10 border border-amber-300 dark:border-brand-gold/30 text-xs">
                <span className="font-bold text-gray-900 dark:text-white">Impacto en Control de Acceso:</span>
                <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
                  {selectedTypeObj.restrictsAccess 
                    ? '⚠️ Esta notificación activa bandera de bloqueo automático en garita al cumplirse los días de gracia.'
                    : 'ℹ️ Esta comunicación tiene carácter informativo y no bloquea el ingreso del socio ni de sus dependientes.'}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-brand-gold to-yellow-600 text-black font-black hover:scale-105 transition-all shadow-md shadow-brand-gold/20"
                >
                  Enviar Notificación
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
