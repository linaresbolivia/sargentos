import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Minus,
  Search, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  QrCode, 
  Share2, 
  FileText, 
  ShieldCheck, 
  Filter,
  Sparkles,
  Phone,
  Mail,
  Lock,
  Eye,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import logoClub from '../../../assets/logo.png';
import { commercialApi, VipPass, CreateVipPassDto, ValidatePassResponse } from '../services/commercialApi';
import { VipPassTicketModal } from './VipPassTicketModal';
import WhatsAppConnectorModal from '../../pqrs/components/WhatsAppConnectorModal';
import toast from 'react-hot-toast';

export const ALL_AVAILABLE_AREAS = [
  { id: 'INGRESO', label: 'Ingreso Principal', desc: 'Control de portería y caseta principal' },
  { id: 'PISCINA', label: 'Piscina Semiolímpica & Spa', desc: 'Piscina 30°C, jacuzzi y saunas' },
  { id: 'GIMNASIO', label: 'Gimnasio & Fitness', desc: 'Zona de musculación y cardiovascular' },
  { id: 'TENIS', label: 'Complejo Tenis & Pádel', desc: 'Canchas de arcilla, pádel y frontón' },
  { id: 'HIPICA', label: 'Picadero & Hípica', desc: 'Pistas de salto, cuadras y picadero cubierto' },
];

export const getLocalDateToday = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatVipDateText = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '';
  const dateStr = (typeof dateInput === 'string' ? dateInput : new Date(dateInput).toISOString()).split('T')[0];
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const localDate = new Date(y, m, d);
    return localDate.toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return new Date(dateInput).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatVipDateShort = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '';
  const dateStr = (typeof dateInput === 'string' ? dateInput : new Date(dateInput).toISOString()).split('T')[0];
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const localDate = new Date(y, m, d);
    return localDate.toLocaleDateString('es-BO');
  }
  return new Date(dateInput).toLocaleDateString('es-BO');
};

export const VipPassGeneratorView: React.FC = () => {
  const [passes, setPasses] = useState<VipPass[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected pass for ticket modal preview/download
  const [selectedPassForModal, setSelectedPassForModal] = useState<VipPass | null>(null);

  // WhatsApp Comercial Instance State (chls-comercial)
  const [waStatus, setWaStatus] = useState<{ status: string; qr: string | null }>({ status: 'DISCONNECTED', qr: null });
  const [showWaConnectorModal, setShowWaConnectorModal] = useState(false);

  // Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [autoSendWhatsApp, setAutoSendWhatsApp] = useState(true);
  const [formData, setFormData] = useState<CreateVipPassDto>({
    guestFullName: '',
    documentId: '',
    phone: '',
    email: '',
    hostSellerName: 'Eduardo Bejarano',
    validFrom: getLocalDateToday(),
    validUntil: getLocalDateToday(), // Single day pass
    maxDays: 1,
    timeStart: '07:00',
    timeEnd: '22:00',
    allowedAreas: ['INGRESO', 'PISCINA', 'GIMNASIO', 'TENIS', 'HIPICA'],
    maxUses: 6,
    notes: '',
  });

  // Scanner Simulator State
  const [scannerCode, setScannerCode] = useState('');
  const [scannerArea, setScannerArea] = useState('INGRESO');
  const [scannerResult, setScannerResult] = useState<ValidatePassResponse | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const fetchWaStatus = async () => {
    try {
      const res = await commercialApi.getWhatsAppComercialStatus();
      if (res.data) setWaStatus(res.data);
    } catch (e) { }
  };

  useEffect(() => {
    fetchWaStatus();
    const interval = setInterval(fetchWaStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadPasses();
  }, [statusFilter, searchQuery]);

  const loadPasses = async () => {
    try {
      setLoading(true);
      const res = await commercialApi.listPasses(statusFilter, searchQuery);
      setPasses(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar la lista de pases VIP');
    } finally {
      setLoading(false);
    }
  };

  const handleAreaToggle = (areaId: string) => {
    const current = Array.isArray(formData.allowedAreas) ? [...formData.allowedAreas] : [];
    if (current.includes(areaId)) {
      if (current.length === 1) {
        toast.error('Debe seleccionar al menos un área');
        return;
      }
      setFormData({ ...formData, allowedAreas: current.filter((a) => a !== areaId) });
    } else {
      setFormData({ ...formData, allowedAreas: [...current, areaId] });
    }
  };

  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.guestFullName.trim()) {
      toast.error('El nombre del invitado VIP es obligatorio');
      return;
    }

    try {
      setLoading(true);
      const res = await commercialApi.createPass(formData);
      toast.success('¡Pase VIP emitido exitosamente!');
      setShowCreateModal(false);
      
      // Open the ticket modal right away so the user can download or share via WhatsApp
      setSelectedPassForModal(res.data);
      loadPasses();

      // Auto-send via WhatsApp Comercial if enabled and phone exists
      if (autoSendWhatsApp && res.data.phone) {
        toast.loading('Enviando Pase VIP por WhatsApp Comercial...', { id: 'auto-wa' });
        try {
          await commercialApi.sendPassWhatsApp(res.data.id);
          toast.success(`¡Pase VIP enviado automáticamente por WhatsApp Comercial a ${res.data.guestFullName}!`, { id: 'auto-wa' });
        } catch (waErr: any) {
          toast.error(waErr.response?.data?.message || 'Pase creado, pero WhatsApp Comercial no está conectado. Puedes enviarlo manualmente.', { id: 'auto-wa' });
        }
      }

      // Reset form
      setFormData({
        guestFullName: '',
        documentId: '',
        phone: '',
        email: '',
        hostSellerName: 'Eduardo Bejarano',
        validFrom: getLocalDateToday(),
        validUntil: getLocalDateToday(),
        maxDays: 1,
        timeStart: '07:00',
        timeEnd: '22:00',
        allowedAreas: ['INGRESO', 'PISCINA', 'GIMNASIO', 'TENIS', 'HIPICA'],
        maxUses: 6,
        notes: '',
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al emitir pase VIP');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokePass = async (passId: string) => {
    try {
      setLoading(true);
      await commercialApi.revokePass(passId);
      toast.success('Pase VIP revocado');
      loadPasses();
    } catch (err) {
      toast.error('Error al revocar pase VIP');
    } finally {
      setLoading(false);
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    if (passes.length === 0) {
      toast.error('No hay pases VIP disponibles para exportar.');
      return;
    }

    try {
      const dataToExport = passes.map((p) => ({
        'Código / Pase': p.code,
        'Invitado VIP': p.guestFullName,
        'CI / Pasaporte': p.documentId || 'S/D',
        'Celular / WhatsApp': p.phone || 'S/N',
        'Ejecutivo Anfitrión': p.hostSellerName || 'Eduardo Bejarano',
        'Fecha Autorizada': formatVipDateShort(p.validFrom) === formatVipDateShort(p.validUntil) ? formatVipDateShort(p.validFrom) : `Del ${formatVipDateShort(p.validFrom)} al ${formatVipDateShort(p.validUntil)}`,
        'Horario': `${p.timeStart} a ${p.timeEnd} hrs`,
        'Áreas Autorizadas': Array.isArray(p.allowedAreas) ? p.allowedAreas.join(', ') : p.allowedAreas,
        'Acompañantes Autorizados': p.maxUses,
        'Estado': p.status,
        'Fecha de Emisión': formatVipDateShort(p.createdAt)
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Pases VIP');

      worksheet['!cols'] = [
        { wch: 18 },
        { wch: 25 },
        { wch: 14 },
        { wch: 16 },
        { wch: 20 },
        { wch: 18 },
        { wch: 16 },
        { wch: 30 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 }
      ];

      const fileName = `Reporte_Pases_VIP_CHLS_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success('Reporte Excel generado exitosamente.');
    } catch (err: any) {
      console.error('Error al exportar a Excel:', err);
      toast.error('Error al generar archivo Excel');
    }
  };

  // Standardized Official PDF Export
  const handleExportPdf = () => {
    if (passes.length === 0) {
      toast.error('No hay pases VIP disponibles para exportar.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('No se pudo abrir la ventana de impresión');
      return;
    }

    const rowsHtml = passes.map((p, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 9px 8px; font-weight: bold; color: #b45309; text-align: center;">${idx + 1}</td>
        <td style="padding: 9px 8px; font-weight: bold; font-family: monospace; color: #0f172a;">${p.code}</td>
        <td style="padding: 9px 8px;">
          <strong style="color: #0f172a;">${p.guestFullName}</strong><br/>
          <span style="font-size: 10px; color: #64748b;">CI: ${p.documentId || 'S/D'} • Tel: ${p.phone || 'S/N'}</span>
        </td>
        <td style="padding: 9px 8px; color: #334155;">
          ${formatVipDateShort(p.validFrom) === formatVipDateShort(p.validUntil) ? formatVipDateShort(p.validFrom) : `Del ${formatVipDateShort(p.validFrom)} al ${formatVipDateShort(p.validUntil)}`}<br/>
          <span style="font-size: 10px; color: #b45309; font-weight: bold;">${p.timeStart} a ${p.timeEnd} hrs</span>
        </td>
        <td style="padding: 9px 8px; font-size: 10px; color: #475569;">
          ${Array.isArray(p.allowedAreas) ? p.allowedAreas.join(', ') : p.allowedAreas}
        </td>
        <td style="padding: 9px 8px; text-align: center; font-weight: bold; color: #0284c7;">
          👥 ${p.maxUses}
        </td>
        <td style="padding: 9px 8px; text-align: center;">
          <span className="status-badge" style="display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 9.5px; font-weight: 800; text-transform: uppercase;
            ${p.status === 'ACTIVO' ? 'background: #dcfce7; color: #15803d; border: 1px solid #86efac;' : p.status === 'USADO' ? 'background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc;' : 'background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5;'}">
            ${p.status}
          </span>
        </td>
        <td style="padding: 9px 8px; font-size: 10px; color: #475569; text-align: center; font-weight: 600;">
          ${p.hostSellerName || 'Eduardo Bejarano'}
        </td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reporte Oficial Pases VIP - Club Hípico Los Sargentos</title>
          <style>
            @media print {
              @page { size: letter landscape; margin: 10mm; }
              body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 24px; color: #1e293b; background: #ffffff; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 3.5px solid #133825; padding-bottom: 12px; }
            .brand-title { font-size: 22px; font-weight: 900; color: #133825; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.1; }
            .brand-subtitle { font-size: 12px; color: #b48c32; font-weight: 800; margin-top: 3px; letter-spacing: 0.3px; }
            .kpi-container { display: flex; gap: 14px; margin-bottom: 22px; }
            .kpi-box { flex: 1; padding: 12px 16px; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; }
            .kpi-title { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
            .kpi-value { font-size: 20px; font-weight: 900; color: #133825; margin-top: 3px; }
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            table.data-table th { background: #133825; color: #ffffff; padding: 10px 8px; font-size: 10px; font-weight: 800; text-transform: uppercase; text-align: left; letter-spacing: 0.4px; }
            table.data-table td { border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
            table.data-table tr:nth-child(even) { background-color: #f8fafc; }
            .footer-sign { margin-top: 45px; display: flex; justify-content: space-between; padding-top: 15px; page-break-inside: avoid; }
            .sign-line { width: 230px; border-top: 1.5px solid #94a3b8; text-align: center; padding-top: 6px; font-size: 11px; font-weight: 800; color: #334155; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="width: 75px; vertical-align: middle;">
                <img src="${logoClub}" style="height: 65px; width: auto; object-fit: contain;" onError="this.style.display='none'" />
              </td>
              <td style="vertical-align: middle; padding-left: 12px;">
                <div class="brand-title">CLUB HÍPICO LOS SARGENTOS</div>
                <div class="brand-subtitle">MÓDULO COMERCIAL • REPORTE OFICIAL DE PASES E INVITACIONES VIP</div>
              </td>
              <td style="text-align: right; vertical-align: middle; font-size: 10.5px; color: #475569; line-height: 1.4;">
                <strong>Fecha de Emisión:</strong> ${new Date().toLocaleDateString('es-BO')}<br/>
                <strong>Hora de Emisión:</strong> ${new Date().toLocaleTimeString('es-BO')}<br/>
                <strong>Ejecutivo Anfitrión:</strong> Eduardo Bejarano
              </td>
            </tr>
          </table>

          <div class="kpi-container">
            <div class="kpi-box">
              <div class="kpi-title">Total Pases Emitidos</div>
              <div class="kpi-value">${passes.length}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-title">Pases Activos</div>
              <div class="kpi-value" style="color: #16a34a;">${passes.filter(p => p.status === 'ACTIVO').length}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-title">Pases Usados</div>
              <div class="kpi-value" style="color: #0284c7;">${passes.filter(p => p.status === 'USADO').length}</div>
            </div>
            <div class="kpi-box">
              <div class="kpi-title">Acompañantes Autorizados</div>
              <div class="kpi-value" style="color: #b48c32;">${passes.reduce((acc, p) => acc + (p.maxUses || 0), 0)}</div>
            </div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">#</th>
                <th style="width: 120px;">Código VIP</th>
                <th>Invitado VIP / Documento / Celular</th>
                <th style="width: 150px;">Fecha Autorizada & Horario</th>
                <th style="width: 180px;">Áreas Autorizadas</th>
                <th style="width: 100px; text-align: center;">Acompañantes</th>
                <th style="width: 90px; text-align: center;">Estado</th>
                <th style="width: 130px; text-align: center;">Anfitrión</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer-sign">
            <div class="sign-line">
              Ejecutivo Comercial / Anfitrión<br/>
              <span style="font-size: 9px; color: #64748b; font-weight: normal;">Eduardo Bejarano</span>
            </div>
            <div class="sign-line">
              Jefatura de Admisiones & Membresías<br/>
              <span style="font-size: 9px; color: #64748b; font-weight: normal;">Club Hípico Los Sargentos</span>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Test scanner validator
  const handleTestScan = async () => {
    if (!scannerCode.trim()) {
      toast.error('Ingresa o escanea un código de Pase VIP');
      return;
    }
    try {
      setIsScanning(true);
      const res = await commercialApi.validatePass(scannerCode.trim(), scannerArea);
      setScannerResult(res);
      if (res.granted) {
        toast.success(`¡Acceso CONCEDIDO para ${res.guest?.fullName}!`);
      } else {
        toast.error(`Acceso DENEGADO: ${res.reason}`);
      }
      loadPasses();
    } catch (err: any) {
      setScannerResult({
        success: false,
        granted: false,
        reason: err.response?.data?.reason || err.response?.data?.message || 'Error de validación',
      });
      toast.error('Error al validar código');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Action Header with Title & Top-Right WhatsApp Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/90 dark:bg-[#0d1311]/90 p-5 rounded-3xl border border-gray-200 dark:border-white/10 backdrop-blur-md shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-gold/20 text-brand-gold border border-brand-gold/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Pases VIP & Control de Accesos
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white serif-brand mt-1">
            Gestión de Pases e Invitaciones VIP
          </h2>
        </div>

        {/* Top Right: WhatsApp Comercial Status Badge */}
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setShowWaConnectorModal(true)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2.5 border transition-all cursor-pointer shadow-sm ${
              waStatus.status === 'CONNECTED'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
                : waStatus.status === 'QR_READY'
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25 animate-pulse'
                : 'bg-red-500/15 text-red-300 border-red-500/40 hover:bg-red-500/25'
            }`}
            title="Estado del WhatsApp Comercial para envío de pases VIP"
          >
            <span className={`w-2.5 h-2.5 rounded-full ${
              waStatus.status === 'CONNECTED' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : waStatus.status === 'QR_READY' ? 'bg-amber-400 animate-ping' : 'bg-red-400'
            }`}></span>
            <span>
              {waStatus.status === 'CONNECTED'
                ? 'WhatsApp Comercial Conectado'
                : waStatus.status === 'QR_READY'
                ? 'WhatsApp: Escanear QR'
                : 'Conectar WhatsApp Comercial'}
            </span>
            <QrCode className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CENTERED CELESTIAL GOLD VIP BANNER CONTAINER */}
      <div className="flex items-center justify-center my-4">
        <div className="w-full max-w-2xl p-3 sm:p-4 rounded-[2rem] bg-gradient-to-br from-amber-500/10 via-black/50 to-yellow-600/10 border-2 border-brand-gold/40 backdrop-blur-md shadow-[0_0_50px_rgba(212,175,55,0.15)] flex items-center justify-center">
          {/* CELESTIAL GOLD REFLECTIVE BUTTON */}
          <button 
            onClick={() => setShowCreateModal(true)}
            className="w-full group relative overflow-hidden py-4 px-8 rounded-2xl bg-gradient-to-r from-[#ffe58f] via-[#ffd700] to-[#e6a100] text-black font-black text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-3 shadow-[0_0_35px_rgba(255,215,0,0.6)] hover:shadow-[0_0_60px_rgba(255,215,0,0.95)] hover:scale-[1.02] active:scale-98 transition-all cursor-pointer border-2 border-yellow-100 select-none"
          >
            {/* Reflective Light Beam Sweep */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none"></span>
            
            <Sparkles className="w-6 h-6 text-black shrink-0" />
            <span className="drop-shadow-sm font-black">✦ EMITIR PASE DE CORTESÍA VIP ✦</span>
            <Plus className="w-6 h-6 text-black font-black shrink-0" />
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['ALL', 'ACTIVO', 'USADO', 'EXPIRADO', 'REVOCADO'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${statusFilter === st ? 'bg-brand-gold text-black shadow-md' : 'bg-gray-100 dark:bg-black/40 text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/5'}`}
            >
              {st === 'ALL' ? 'Todos los Pases' : st === 'ACTIVO' ? '🟢 Activos' : st === 'USADO' ? '🔵 Usados' : st === 'EXPIRADO' ? '⏳ Expirados' : '🔴 Revocados'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o CI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadPasses()}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-xs outline-none focus:border-brand-gold"
            />
          </div>

          {/* Export Buttons */}
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 text-xs font-extrabold transition-all flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
            title="Exportar listado completo de Pases VIP a Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Excel</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-extrabold transition-all flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
            title="Exportar reporte oficial institucional de Pases VIP en PDF"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Passes Table */}
      <div className="glass-panel overflow-hidden border border-gray-200 dark:border-white/10 rounded-3xl bg-white/90 dark:bg-[#0d1311]/90 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100/90 dark:bg-white/5 text-gray-700 dark:text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-200 dark:border-white/10 font-black">
              <tr>
                <th className="p-4">Código / Pase</th>
                <th className="p-4">Invitado VIP</th>
                <th className="p-4">Vigencia & Horario</th>
                <th className="p-4">Áreas Autorizadas</th>
                <th className="p-4">Acompañantes</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-amber-700 dark:text-brand-gold font-bold animate-pulse">
                    Cargando pases VIP...
                  </td>
                </tr>
              ) : passes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No se encontraron pases en esta categoría.
                  </td>
                </tr>
              ) : (
                passes.map((p) => {
                  const isExp = p.isExpired || p.status === 'EXPIRADO';
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      
                      {/* Code */}
                      <td className="p-4 font-mono">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-brand-gold/15 text-brand-gold border border-brand-gold/30">
                          {p.code}
                        </span>
                        <p className="text-[10px] text-gray-500 mt-1">Anfitrión: {p.hostSellerName}</p>
                      </td>

                      {/* Guest */}
                      <td className="p-4">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">
                          {p.guestFullName}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {p.documentId && <span>CI: {p.documentId}</span>}
                          {p.phone && <span>• Tel: {p.phone}</span>}
                        </div>
                      </td>

                      {/* Date Range */}
                      <td className="p-4">
                        <p className="text-gray-900 dark:text-white font-semibold text-xs">
                          {formatVipDateShort(p.validFrom) === formatVipDateShort(p.validUntil)
                            ? formatVipDateShort(p.validFrom)
                            : `${formatVipDateShort(p.validFrom)} al ${formatVipDateShort(p.validUntil)}`}
                        </p>
                        <span className="text-[10px] text-amber-800 dark:text-brand-gold font-mono">
                          {p.timeStart} a {p.timeEnd} hrs
                        </span>
                      </td>

                      {/* Areas */}
                      <td className="p-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {(p.allowedAreas || '').split(',').slice(0, 3).map((a, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                              {a.trim()}
                            </span>
                          ))}
                          {(p.allowedAreas || '').split(',').length > 3 && (
                            <span className="text-[9px] text-gray-500">
                              +{ (p.allowedAreas || '').split(',').length - 3 } más
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Companions */}
                      <td className="p-4 font-extrabold text-xs">
                        <span className="text-brand-gold bg-brand-gold/10 border border-brand-gold/30 px-2.5 py-1 rounded-full">
                          {p.maxUses} pers.
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${p.status === 'ACTIVO' && !isExp ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30' : p.status === 'USADO' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400 border border-blue-300 dark:border-blue-500/30' : isExp ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30' : 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-500/30'}`}>
                          {isExp ? 'EXPIRADO' : p.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedPassForModal(p)}
                            className="px-3 py-1.5 rounded-xl bg-brand-gold text-black font-extrabold text-xs hover:scale-105 shadow-sm transition-all flex items-center gap-1"
                            title="Ver e Imprimir Tarjeta VIP"
                          >
                            <QrCode className="w-3.5 h-3.5" /> Ver Ticket
                          </button>

                          <button
                            onClick={() => {
                              setScannerCode(p.code);
                              toast.success(`Código ${p.code} cargado en el simulador`);
                            }}
                            className="p-1.5 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-brand-gold hover:text-black text-gray-700 dark:text-gray-300 transition-colors"
                            title="Probar en Simulador"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>

                          {p.status === 'ACTIVO' && !isExp && (
                            <button
                              onClick={() => handleRevokePass(p.id)}
                              className="p-1.5 rounded-xl bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                              title="Revocar Pase"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- CREATE VIP PASS MODAL (TABLET & TOUCH OPTIMIZED) --- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 pt-14 sm:pt-16 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl max-h-[88vh] flex flex-col bg-white dark:bg-[#0d1311] border-2 border-gray-300 dark:border-brand-gold/50 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden text-gray-900 dark:text-white animate-fadeIn my-auto">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-brand-gold/30 flex justify-between items-center bg-gray-50/80 dark:bg-black/60 shrink-0">
              <div>
                <h3 className="text-base sm:text-xl font-black serif-brand text-gray-900 dark:text-brand-gold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand-gold" />
                  Emitir Pase de Cortesía VIP
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-300 mt-0.5">
                  Completa los datos del invitado para generar su tarjeta digital QR
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setShowCreateModal(false)} 
                className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-red-500 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0 font-bold text-base shadow-sm"
                title="Cerrar ventana"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form Content Body */}
            <form onSubmit={handleCreatePass} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm custom-scrollbar">
              
              {/* Guest Full Name */}
              <div>
                <label className="text-gray-800 dark:text-gray-200 font-extrabold uppercase tracking-wider text-xs block mb-1.5">
                  Nombre Completo del Invitado VIP <span className="text-brand-gold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Lic. Carlos Andrés Valverde"
                  value={formData.guestFullName}
                  onChange={(e) => setFormData({ ...formData, guestFullName: e.target.value })}
                  className="w-full p-3.5 rounded-2xl bg-gray-100 dark:bg-black/60 border-2 border-gray-300 dark:border-brand-gold/40 text-gray-900 dark:text-white text-sm font-extrabold outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30 transition-all shadow-inner"
                />
              </div>

              {/* CI & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-gray-700 dark:text-gray-300 font-bold uppercase text-[11px] block mb-1">
                    CI / Pasaporte
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 4892011 LP"
                    value={formData.documentId || ''}
                    onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
                    className="w-full p-3 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs sm:text-sm font-bold outline-none focus:border-brand-gold"
                  />
                </div>

                <div>
                  <label className="text-gray-700 dark:text-gray-300 font-bold uppercase text-[11px] block mb-1">
                    Celular / WhatsApp (Para envío directo)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 77219800"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-3 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs sm:text-sm font-bold outline-none focus:border-brand-gold"
                  />
                </div>
              </div>

              {/* Date & Times Container (Fecha Encima, Horas Abajo) */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 space-y-3">
                <h4 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5 text-xs sm:text-sm">
                  <Calendar className="w-4 h-4 text-brand-gold" /> Fecha Autorizada & Horario de Admisión
                </h4>

                <div className="space-y-3">
                  {/* Fecha Encima (Full Width) */}
                  <div>
                    <label className="text-gray-700 dark:text-gray-300 uppercase font-extrabold text-xs block mb-1">
                      Fecha Autorizada de Visita <span className="text-brand-gold">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.validFrom}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        validFrom: e.target.value,
                        validUntil: e.target.value,
                        maxDays: 1
                      })}
                      className="w-full p-3 rounded-xl bg-white dark:bg-black/60 border-2 border-gray-300 dark:border-brand-gold/40 text-gray-900 dark:text-white text-sm font-extrabold outline-none focus:border-brand-gold"
                    />
                  </div>

                  {/* Horas Abajo (2 Columnas) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-700 dark:text-gray-300 uppercase font-bold text-[11px] block mb-1">
                        Hora Inicio
                      </label>
                      <input
                        type="time"
                        value={formData.timeStart}
                        onChange={(e) => setFormData({ ...formData, timeStart: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-black/60 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs sm:text-sm font-bold outline-none focus:border-brand-gold"
                      />
                    </div>

                    <div>
                      <label className="text-gray-700 dark:text-gray-300 uppercase font-bold text-[11px] block mb-1">
                        Hora Fin
                      </label>
                      <input
                        type="time"
                        value={formData.timeEnd}
                        onChange={(e) => setFormData({ ...formData, timeEnd: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-white dark:bg-black/60 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs sm:text-sm font-bold outline-none focus:border-brand-gold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Allowed Areas Centered Pill Selector */}
              <div>
                <label className="text-gray-800 dark:text-gray-200 font-extrabold uppercase text-xs block mb-2 text-center">
                  Áreas Autorizadas para el Invitado *
                </label>
                <div className="flex flex-wrap justify-center items-center gap-2 max-w-xl mx-auto">
                  {ALL_AVAILABLE_AREAS.map((area) => {
                    const isChecked = Array.isArray(formData.allowedAreas) && formData.allowedAreas.includes(area.id);
                    return (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => handleAreaToggle(area.id)}
                        className={`px-3.5 py-2.5 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 grow shrink-0 min-w-[150px] max-w-[200px] active:scale-95 ${isChecked ? 'bg-amber-500/15 dark:bg-brand-gold/20 border-brand-gold text-brand-gold font-extrabold shadow-sm' : 'bg-gray-50 dark:bg-black/30 border-gray-200 dark:border-white/10 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="accent-brand-gold pointer-events-none shrink-0 w-4 h-4"
                        />
                        <span className="text-xs font-bold truncate">{area.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Host & Max Uses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label className="text-gray-700 dark:text-gray-300 font-bold uppercase text-[11px] block mb-1">
                    Ejecutivo Anfitrión
                  </label>
                  <input
                    type="text"
                    value={formData.hostSellerName}
                    onChange={(e) => setFormData({ ...formData, hostSellerName: e.target.value })}
                    className="w-full p-3 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 text-gray-900 dark:text-white text-xs sm:text-sm font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="text-gray-700 dark:text-gray-300 font-bold uppercase text-[11px] block mb-1">
                    Cantidad de Acompañantes
                  </label>
                  <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-brand-gold/30 rounded-xl p-1 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, maxUses: Math.max(0, (formData.maxUses ?? 1) - 1) })}
                      className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-amber-300 font-black text-base flex items-center justify-center hover:bg-brand-gold hover:text-black transition-all cursor-pointer select-none active:scale-95 border border-white/10 shrink-0"
                      title="Disminuir acompañantes (-1)"
                    >
                      <Minus className="w-5 h-5" />
                    </button>

                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={formData.maxUses}
                      onChange={(e) => setFormData({ ...formData, maxUses: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full text-center bg-transparent text-gray-900 dark:text-white text-base font-black outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, maxUses: Math.min(50, (formData.maxUses ?? 1) + 1) })}
                      className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-amber-300 font-black text-base flex items-center justify-center hover:bg-brand-gold hover:text-black transition-all cursor-pointer select-none active:scale-95 border border-white/10 shrink-0"
                      title="Aumentar acompañantes (+1)"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* WhatsApp Auto-Dispatch Checkbox Toggle */}
              <div 
                onClick={() => setAutoSendWhatsApp(!autoSendWhatsApp)}
                className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-between gap-3 cursor-pointer hover:bg-emerald-500/15 transition-all select-none"
              >
                <div className="flex items-center gap-3">
                  <span className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                    <Phone className="w-5 h-5" />
                  </span>
                  <div>
                    <div className="font-black text-emerald-400 text-xs sm:text-sm">
                      Envío Automático por WhatsApp Comercial
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Despacha la credencial VIP con código QR directamente al celular del invitado.
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoSendWhatsApp}
                  onChange={(e) => setAutoSendWhatsApp(e.target.checked)}
                  className="w-5 h-5 accent-emerald-500 cursor-pointer shrink-0"
                />
              </div>

              {/* Submit Buttons Bar */}
              <div className="pt-4 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-3 rounded-2xl bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-bold hover:bg-gray-300 dark:hover:bg-white/20 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-gold via-yellow-500 to-amber-500 text-black text-xs sm:text-sm font-black hover:scale-105 shadow-xl shadow-brand-gold/30 transition-all cursor-pointer"
                >
                  {loading ? 'Generando...' : 'Emitir Pase VIP & Ver QR'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* --- LUXURY TICKET MODAL --- */}
      <VipPassTicketModal 
        pass={selectedPassForModal}
        isOpen={!!selectedPassForModal}
        onClose={() => setSelectedPassForModal(null)}
      />

      {/* --- WHATSAPP COMERCIAL CONNECTOR MODAL (chls-comercial) --- */}
      {showWaConnectorModal && (
        <WhatsAppConnectorModal
          clientId="chls-comercial"
          moduleName="Módulo Comercial & Admisión VIP"
          channelBadge="Canal 5 • Admisiones & Pases VIP"
          title="Conexión WhatsApp Comercial"
          subtitle="Vincule la línea oficial de WhatsApp Comercial para despachar Pases VIP con QR e invitaciones a futuros socios."
          purposeDescription="Esta línea enviará automáticamente las credenciales con código QR y mensajes de cortesía a los invitados registrados."
          onClose={() => {
            setShowWaConnectorModal(false);
            fetchWaStatus();
          }}
        />
      )}

    </div>
  );
};
export default VipPassGeneratorView;
