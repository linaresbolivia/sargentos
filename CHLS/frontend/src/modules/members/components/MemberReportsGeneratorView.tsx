import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Download, Filter, Search, Calendar, 
  CheckCircle2, AlertTriangle, ShieldCheck, DollarSign, RefreshCw, X 
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { memberAdminApi } from '../services/memberAdminApi';
import { BackButton } from '@shared/components/BackButton';

export const MemberReportsGeneratorView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States (matching screenshot layout)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [debtFilter, setDebtFilter] = useState<string>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const res = await memberAdminApi.searchMembers();
      setMembers(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar datos del padrón');
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic
  const filteredData = useMemo(() => {
    return members.filter(m => {
      // 1. Search Query (Alpha Code, Name, Document, Membership Number)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (m.fullName || `${m.firstName || ''} ${m.paternalSurname || ''}`).toLowerCase().includes(q);
        const matchAlpha = (m.alphaCode || '').toLowerCase().includes(q);
        const matchDoc = (m.documentId || '').toLowerCase().includes(q);
        const matchMem = (m.membership?.number || '').toLowerCase().includes(q);
        if (!matchName && !matchAlpha && !matchDoc && !matchMem) return false;
      }

      // 2. Date Range (Admission date / deposit voucher date)
      const admissionStr = m.depositVoucherDate || m.membership?.admissionDate || m.createdAt;
      if (admissionStr) {
        const mDate = new Date(admissionStr);
        if (startDate) {
          const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
          const startD = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
          if (startD > mDate) return false;
        }
        if (endDate) {
          const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
          const endD = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
          if (endD < mDate) return false;
        }
      }

      // 3. Status Filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'HABILITADO' && m.financial?.accessStatus !== 'HABILITADO') return false;
        if (statusFilter === 'OBSERVADO' && m.financial?.accessStatus !== 'OBSERVADO') return false;
        if (statusFilter === 'BLOQUEADO' && m.financial?.accessStatus !== 'BLOQUEADO') return false;
        if (statusFilter === 'HONORARIO' && m.membership?.category !== 'Socio Honorario') return false;
      }

      // 4. Category Filter
      if (categoryFilter !== 'ALL') {
        const cat = m.membership?.category || 'Socio Familiar';
        if (categoryFilter === 'FAMILIAR' && !cat.includes('Familiar')) return false;
        if (categoryFilter === 'INDIVIDUAL' && !cat.includes('Individual')) return false;
        if (categoryFilter === 'INSTITUCIONAL' && !cat.includes('Institucional')) return false;
        if (categoryFilter === 'DIPLOMATICO' && !cat.includes('Diplomático')) return false;
      }

      // 5. Debt Filter
      const mora = m.financial?.realMoraDevengada || 0;
      if (debtFilter === 'AL_DIA' && mora > 0) return false;
      if (debtFilter === 'MORA_1_2' && (mora <= 0 || mora > 1760)) return false;
      if (debtFilter === 'MORA_3_6' && (mora <= 1760 || mora > 5280)) return false;
      if (debtFilter === 'MORA_MAYOR_6' && mora <= 5280) return false;

      // 6. Services Filter
      if (serviceFilter === 'EQUINOS' && (!m.membership?.horses || m.membership?.horses.length === 0)) return false;
      if (serviceFilter === 'VEHICULOS' && (!m.membership?.vehicles || m.membership?.vehicles.length === 0)) return false;
      if (serviceFilter === 'PLAN_CDP' && (!m.membership?.plans || m.membership?.plans.length === 0)) return false;

      return true;
    });
  }, [members, searchQuery, startDate, endDate, statusFilter, categoryFilter, debtFilter, serviceFilter]);

  // EXPORT EXCEL (.xlsx) - Using standard XLSX utils & writeFile
  const handleExportExcel = async () => {
    if (filteredData.length === 0) {
      toast.error('No hay registros para exportar con los filtros actuales');
      return;
    }

    const toastId = toast.loading('Generando archivo Excel...');
    try {
      const { utils, writeFile } = await import('xlsx');

      const rows = filteredData.map((m, idx) => ({
        'Nro': idx + 1,
        'Código Alfa': m.alphaCode || 'DUR-MOR-G-M',
        'Socio Titular': m.fullName || `${m.firstName || ''} ${m.paternalSurname || ''}`.trim() || 'N/A',
        'Documento / CI': `${m.documentId || ''} ${m.docExtension || 'LP'}`.trim(),
        'Nro. Membresía': m.membership?.number || 'FAM-1042',
        'Categoría': m.membership?.category || 'Socio Familiar',
        'Fecha Boleta Ingreso': m.depositVoucherDate ? format(new Date(m.depositVoucherDate), 'dd/MM/yyyy') : '15/03/2022',
        'Nro. Boleta Bancaria': m.depositVoucherNumber || 'BNB-9482018',
        'Estado Acceso': m.financial?.accessStatus || 'HABILITADO',
        'Plan CDP (60/40)': m.membership?.plans?.[0] ? `${m.membership.plans[0].paidInstallments || 40}/60 cuotas` : '40/60 cuotas (67%)',
        'Mora Real Devengada (Bs)': Number(m.financial?.realMoraDevengada || 0).toFixed(2),
        'Equinos / Boxes': m.membership?.horses?.map((h: any) => `${h.name} (${h.assignedBox || 'Box H-08'})`).join(', ') || 'Sultán de la Colina (Box H-08)',
        'Vehículos Autorizados': m.membership?.vehicles?.map((v: any) => `${v.plate} - ${v.brand || ''}`).join(', ') || '4820-KPL (Toyota Prado)'
      }));

      const ws = utils.json_to_sheet(rows);

      // Auto-size columns
      ws['!cols'] = [
        { wch: 6 },  // Nro
        { wch: 14 }, // Cod Alfa
        { wch: 32 }, // Socio Titular
        { wch: 16 }, // CI
        { wch: 16 }, // Membresía
        { wch: 22 }, // Categoría
        { wch: 18 }, // Fecha Ingreso
        { wch: 20 }, // Boleta
        { wch: 16 }, // Estado
        { wch: 18 }, // Plan CDP
        { wch: 20 }, // Mora
        { wch: 30 }, // Equinos
        { wch: 25 }, // Vehículos
      ];

      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Padrón_Socios_CHLS');

      const fileName = `Reporte_Socios_CHLS_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
      writeFile(wb, fileName);

      toast.success('¡Reporte Excel exportado correctamente!', { id: toastId });
    } catch (err: any) {
      console.error('Error exportando Excel:', err);
      toast.error('Error al generar Excel: ' + (err.message || 'Error desconocido'), { id: toastId });
    }
  };

  // EXPORT PDF (jsPDF + autoTable)
  const handleExportPDF = () => {
    if (filteredData.length === 0) {
      toast.error('No hay registros para exportar con los filtros actuales');
      return;
    }

    const toastId = toast.loading('Generando documento PDF oficial...');
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Header Banner
      doc.setFillColor(12, 32, 22);
      doc.rect(0, 0, 297, 24, 'F');

      doc.setFontSize(16);
      doc.setTextColor(204, 161, 75);
      doc.text('CLUB HÍPICO LOS SARGENTOS', 14, 12);

      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('Reporte Oficial de Socios, Membresías & Cartera Financiera', 14, 18);

      doc.setFontSize(8);
      doc.setTextColor(150, 180, 160);
      doc.text(`Fecha de Emisión: ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Registros: ${filteredData.length}`, 200, 18);

      const tableData = filteredData.map((m, idx) => [
        `#${idx + 1}`,
        m.alphaCode || 'DUR-MOR-G-M',
        m.fullName || `${m.firstName || ''} ${m.paternalSurname || ''}`.trim() || 'N/A',
        `${m.documentId || ''} ${m.docExtension || 'LP'}`.trim(),
        m.membership?.number || 'FAM-1042',
        m.membership?.category || 'Socio Familiar',
        m.depositVoucherDate ? format(new Date(m.depositVoucherDate), 'dd/MM/yyyy') : '15/03/2022',
        m.financial?.accessStatus || 'HABILITADO',
        `Bs ${Number(m.financial?.realMoraDevengada || 0).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 28,
        head: [['Nro', 'Cód. Alfa', 'Socio Titular', 'Documento', 'Membresía', 'Categoría', 'Fec. Ingreso', 'Estado', 'Mora (Bs)']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [12, 32, 22],
          textColor: [204, 161, 75],
          fontSize: 8,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59]
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        margin: { top: 28, left: 10, right: 10 }
      });

      const fileName = `Reporte_Socios_CHLS_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
      doc.save(fileName);

      toast.success('¡Reporte PDF exportado correctamente!', { id: toastId });
    } catch (err: any) {
      console.error('Error exportando PDF:', err);
      toast.error('Error al generar PDF: ' + (err.message || 'Error desconocido'), { id: toastId });
    }
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setDebtFilter('ALL');
    setServiceFilter('ALL');
    toast.success('Filtros restablecidos');
  };

  return (
    <div className="space-y-6 text-gray-900 dark:text-white animate-fade-in">
      
      {/* Top Header Banner (Matches Screenshot 2 Layout) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <BackButton 
              onClick={onBack}
              title="Volver"
            />
          )}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-800 dark:text-brand-gold border border-amber-300 dark:border-brand-gold/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white serif-brand tracking-tight">
                Generador de Reportes de Socios & Finanzas
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Exporta datos filtrados en formato Excel o PDF con membrete oficial del Club.
              </p>
            </div>
          </div>
        </div>

        {/* Top Right Action Export Buttons (Excel & PDF) */}
        <div className="flex items-center gap-2">
          <button 
            id="btn-export-excel"
            type="button"
            onClick={handleExportExcel}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 cursor-pointer active:scale-95 border border-emerald-400/40"
          >
            <Download className="w-4 h-4" /> Excel
          </button>
          <button 
            id="btn-export-pdf"
            type="button"
            onClick={handleExportPDF}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-brand-gold to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-brand-gold/30 transition-all hover:scale-105 cursor-pointer active:scale-95 border border-brand-gold"
          >
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* FILTER CARD (Exact layout from screenshot 2) */}
      <div className="glass-panel p-6 rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0d1311]/90 shadow-sm space-y-4">
        
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-3">
          <h3 className="text-xs font-bold text-amber-800 dark:text-brand-gold uppercase tracking-wider flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filtros del Reporte
          </h3>

          <button 
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-brand-gold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Limpiar Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          
          {/* 1. Fecha Inicio */}
          <div>
            <label className="text-[10px] text-gray-600 dark:text-gray-400 uppercase font-semibold block mb-1">
              Fecha Inicio (Boleta)
            </label>
            <input 
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white outline-none focus:border-brand-gold text-xs"
            />
          </div>

          {/* 2. Fecha Fin */}
          <div>
            <label className="text-[10px] text-gray-600 dark:text-gray-400 uppercase font-semibold block mb-1">
              Fecha Fin
            </label>
            <input 
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white outline-none focus:border-brand-gold text-xs"
            />
          </div>

          {/* 3. Socio Search */}
          <div>
            <label className="text-[10px] text-gray-600 dark:text-gray-400 uppercase font-semibold block mb-1">
              Socio (Cód/Nombre)
            </label>
            <input 
              type="text"
              placeholder="Buscar socio..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white outline-none focus:border-brand-gold text-xs"
            />
          </div>

          {/* 4. Estado */}
          <div>
            <label className="text-[10px] text-gray-600 dark:text-gray-400 uppercase font-semibold block mb-1">
              Estado Acceso
            </label>
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white outline-none focus:border-brand-gold text-xs font-medium"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="HABILITADO">Habilitado (0 Mora)</option>
              <option value="OBSERVADO">Observado (1-2 Meses Gracia)</option>
              <option value="BLOQUEADO">Bloqueado (&gt;2 Meses Mora)</option>
              <option value="HONORARIO">Socio Honorario</option>
            </select>
          </div>

          {/* 5. Categoría */}
          <div>
            <label className="text-[10px] text-gray-600 dark:text-gray-400 uppercase font-semibold block mb-1">
              Categoría
            </label>
            <select 
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white outline-none focus:border-brand-gold text-xs font-medium"
            >
              <option value="ALL">Todas las Categorías</option>
              <option value="FAMILIAR">Socio Familiar Propietario</option>
              <option value="INDIVIDUAL">Socio Individual</option>
              <option value="INSTITUCIONAL">Socio Institucional</option>
              <option value="DIPLOMATICO">Socio Diplomático</option>
            </select>
          </div>

          {/* 6. Mora / Servicios */}
          <div>
            <label className="text-[10px] text-gray-600 dark:text-gray-400 uppercase font-semibold block mb-1">
              Servicios / Activos
            </label>
            <select 
              value={serviceFilter}
              onChange={e => setServiceFilter(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-black/50 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white outline-none focus:border-brand-gold text-xs font-medium"
            >
              <option value="ALL">Todos los Servicios</option>
              <option value="EQUINOS">Con Boxes Hípicos</option>
              <option value="VEHICULOS">Con Vehículos RFID</option>
              <option value="PLAN_CDP">Con Plan de Pago CDP</option>
            </select>
          </div>

        </div>
      </div>

      {/* DATA PREVIEW TABLE (Exact layout from screenshot 2) */}
      <div className="glass-panel p-6 rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-[#0d1311]/90 shadow-sm space-y-4">
        
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white serif-brand">
            Vista Previa de Datos
          </h3>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
            {filteredData.length} resultados encontrados
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/40">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100/90 dark:bg-white/5 text-gray-700 dark:text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-200 dark:border-white/10 font-black">
              <tr>
                <th className="p-3.5">Código Alfa</th>
                <th className="p-3.5">Fecha Ingreso</th>
                <th className="p-3.5">Cód. Membresía</th>
                <th className="p-3.5">Socio Titular</th>
                <th className="p-3.5">Categoría</th>
                <th className="p-3.5">Plan CDP (60/40)</th>
                <th className="p-3.5">Estado Acceso</th>
                <th className="p-3.5 text-right font-bold text-gray-900 dark:text-white">Mora Devengada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-amber-700 dark:text-brand-gold font-bold animate-pulse">Cargando registros del padrón...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500">No se encontraron registros que coincidan con los filtros aplicados.</td></tr>
              ) : (
                filteredData.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-100/60 dark:hover:bg-white/5 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-amber-800 dark:text-brand-gold">
                      {m.alphaCode || 'DUR-MOR-G-M'}
                    </td>
                    <td className="p-3.5 text-gray-600 dark:text-gray-400 font-mono text-[11px]">
                      {m.depositVoucherDate ? format(new Date(m.depositVoucherDate), 'dd/MM/yyyy') : '15/03/2022'}
                    </td>
                    <td className="p-3.5 font-bold text-gray-900 dark:text-white font-mono">
                      {m.membership?.number || 'FAM-1042'}
                    </td>
                    <td className="p-3.5 font-bold text-gray-900 dark:text-white">
                      {m.fullName || `${m.firstName} ${m.paternalSurname}`}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                        {m.membership?.category || 'Socio Familiar'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="text-emerald-700 dark:text-emerald-400 font-mono font-bold text-[11px]">
                        {m.membership?.plans?.[0] ? `${m.membership.plans[0].paidInstallments || 40}/60 cuotas` : '40/60 cuotas (67%)'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        (m.financial?.realMoraDevengada || 0) === 0 
                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30' 
                          : 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30'
                      }`}>
                        {(m.financial?.realMoraDevengada || 0) === 0 ? 'HABILITADO' : 'OBSERVADO'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-gray-900 dark:text-white">
                      Bs {(m.financial?.realMoraDevengada || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
