import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '@config/api';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  Filter, 
  Calendar, 
  Users, 
  Key, 
  Layers, 
  Clock, 
  Search, 
  RefreshCw, 
  Waves, 
  Dumbbell, 
  CheckCircle2, 
  LogOut,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import logoClub from '../../../assets/logo.png';

interface AreaLog {
  id: string;
  area: string;
  entryTime: string;
  exitTime?: string | null;
  memberCode?: string | null;
  personName: string;
  documentId?: string | null;
  dependency: string;
  gender: string;
  lockerKey?: string | null;
  towelNumber?: string | null;
  towelQty: number;
  towelSize?: string | null;
  observations?: string | null;
  status: string;
  person?: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl?: string;
    documentId?: string;
  } | null;
}

interface AreaReportsProps {
  defaultArea?: 'ALL' | 'PISCINA' | 'GIMNASIO';
}

export const AreaReports: React.FC<AreaReportsProps> = ({ defaultArea = 'ALL' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Detect area from query string or prop if provided
  const queryParams = new URLSearchParams(location.search);
  const initialArea = (queryParams.get('area')?.toUpperCase() as any) || defaultArea || 'ALL';

  const [logs, setLogs] = useState<AreaLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [areaFilter, setAreaFilter] = useState<'ALL' | 'PISCINA' | 'GIMNASIO'>(initialArea);
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-01')); // Start of current month
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));   // Today
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [genderFilter, setGenderFilter] = useState<string>('ALL');
  const [dependencyFilter, setDependencyFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Fetch Data from Backend
  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {
        area: areaFilter,
        status: statusFilter,
        gender: genderFilter,
        dependency: dependencyFilter,
        search: searchTerm,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 5000
      };

      const res = await api.get('/access/area-logs', { params });
      if (res.data?.success) {
        setLogs(res.data.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching area reports:', err);
      toast.error('Error al cargar datos del reporte');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [areaFilter, startDate, endDate, statusFilter, genderFilter, dependencyFilter]);

  // Quick Date Range Presets
  const handleQuickDate = (type: 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_30_DAYS') => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    if (type === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === 'YESTERDAY') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yStr = format(y, 'yyyy-MM-dd');
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (type === 'THIS_WEEK') {
      const first = new Date(today);
      const day = first.getDay() || 7; // get current day of week (1=Mon, 7=Sun)
      first.setDate(first.getDate() - day + 1);
      setStartDate(format(first, 'yyyy-MM-dd'));
      setEndDate(todayStr);
    } else if (type === 'THIS_MONTH') {
      setStartDate(format(today, 'yyyy-MM-01'));
      setEndDate(todayStr);
    } else if (type === 'LAST_30_DAYS') {
      const thirty = new Date(today);
      thirty.setDate(thirty.getDate() - 30);
      setStartDate(format(thirty, 'yyyy-MM-dd'));
      setEndDate(todayStr);
    }
  };

  // Client-side quick filter on search
  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return logs;
    const term = searchTerm.toLowerCase().trim();
    return logs.filter(l => 
      l.personName.toLowerCase().includes(term) ||
      (l.memberCode && l.memberCode.toLowerCase().includes(term)) ||
      (l.documentId && l.documentId.toLowerCase().includes(term)) ||
      (l.lockerKey && l.lockerKey.toLowerCase().includes(term)) ||
      (l.towelNumber && l.towelNumber.toLowerCase().includes(term)) ||
      (l.observations && l.observations.toLowerCase().includes(term))
    );
  }, [logs, searchTerm]);

  // Statistics KPI calculations
  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const currentlyInside = filteredLogs.filter(l => l.status === 'DENTRO').length;
    const exited = filteredLogs.filter(l => l.status === 'SALIO').length;
    const lockersLoaned = filteredLogs.filter(l => Boolean(l.lockerKey)).length;
    const towelsLoaned = filteredLogs.filter(l => Boolean(l.towelNumber) || (l.towelQty && l.towelQty > 0)).length;
    const males = filteredLogs.filter(l => l.gender === 'VARON').length;
    const females = filteredLogs.filter(l => l.gender === 'MUJER').length;
    const piscinaCount = filteredLogs.filter(l => l.area === 'PISCINA').length;
    const gimnasioCount = filteredLogs.filter(l => l.area === 'GIMNASIO').length;

    // Average duration in minutes for completed visits
    const durations = filteredLogs
      .filter(l => l.exitTime)
      .map(l => differenceInMinutes(new Date(l.exitTime!), new Date(l.entryTime)))
      .filter(d => d >= 0 && d < 1440); // ignore anomalous stays > 24h

    const avgMinutes = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const avgHoursFormatted = avgMinutes > 0 ? `${Math.floor(avgMinutes / 60)}h ${avgMinutes % 60}m` : '-';

    return {
      total,
      currentlyInside,
      exited,
      lockersLoaned,
      towelsLoaned,
      males,
      females,
      piscinaCount,
      gimnasioCount,
      avgHoursFormatted
    };
  }, [filteredLogs]);

  // Export to Excel with PQRS-grade formatting
  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      toast.error('No hay datos para exportar con los filtros seleccionados');
      return;
    }

    try {
      const dataToExport = filteredLogs.map((l, index) => {
        let permanencia = '-';
        if (l.exitTime) {
          const mins = differenceInMinutes(new Date(l.exitTime), new Date(l.entryTime));
          permanencia = `${Math.floor(mins / 60)}h ${mins % 60}m`;
        } else if (l.status === 'DENTRO') {
          const mins = differenceInMinutes(new Date(), new Date(l.entryTime));
          permanencia = `En curso (${Math.floor(mins / 60)}h ${mins % 60}m)`;
        }

        return {
          'N°': index + 1,
          'Área': l.area,
          'Fecha': format(new Date(l.entryTime), 'dd/MM/yyyy'),
          'Hora Ingreso': format(new Date(l.entryTime), 'HH:mm'),
          'Hora Salida': l.exitTime ? format(new Date(l.exitTime), 'HH:mm') : 'EN ÁREA',
          'Permanencia': permanencia,
          'Cód. Socio': l.memberCode || '-',
          'Concurrente': l.personName,
          'CI / Documento': l.documentId || '-',
          'Dependencia': l.dependency,
          'Género': l.gender === 'VARON' ? 'Varón' : 'Mujer',
          'N° Llave / Locker': l.lockerKey ? `#${l.lockerKey}` : '-',
          'N° Toalla': (l.towelNumber || l.towelQty > 0) ? `Toalla #${l.towelNumber || l.towelQty} (${l.towelSize || 'Grande'})` : '-',
          'Estado': l.status === 'DENTRO' ? 'EN ÁREA' : 'SALIÓ',
          'Observaciones': l.observations || '-'
        };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      
      // Auto column widths
      const colWidths = [
        { wch: 6 },  // N°
        { wch: 12 }, // Área
        { wch: 12 }, // Fecha
        { wch: 14 }, // Hora Ingreso
        { wch: 14 }, // Hora Salida
        { wch: 16 }, // Permanencia
        { wch: 14 }, // Cód. Socio
        { wch: 30 }, // Concurrente
        { wch: 15 }, // CI
        { wch: 16 }, // Dependencia
        { wch: 10 }, // Género
        { wch: 18 }, // N° Llave
        { wch: 22 }, // N° Toalla
        { wch: 12 }, // Estado
        { wch: 30 }, // Observaciones
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      const sheetName = areaFilter === 'ALL' ? 'Accesos_Club' : `Accesos_${areaFilter}`;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      const fileName = `Reporte_Control_Acceso_${areaFilter}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success('Reporte Excel generado exitosamente');
    } catch (err) {
      console.error('Error exportando Excel:', err);
      toast.error('Hubo un problema al generar el archivo Excel');
    }
  };

  // Export to PDF with Official Club Styling
  const handleExportPDF = () => {
    if (filteredLogs.length === 0) {
      toast.error('No hay datos para exportar con los filtros seleccionados');
      return;
    }

    try {
      const doc = new jsPDF('landscape');
      
      const renderPDF = (logoData?: HTMLImageElement | string) => {
        try {
          // Header Logo
          if (logoData) {
            doc.addImage(logoData, 'PNG', 14, 8, 20, 20);
          }
          
          // Header Title
          doc.setFontSize(16);
          doc.setTextColor(19, 56, 37); // Brand deep green
          doc.text('CLUB HÍPICO LOS SARGENTOS', 38, 16);
          
          doc.setFontSize(13);
          doc.setTextColor(180, 140, 50); // Brand Gold
          doc.text(`Reporte de Control de Acceso • ${areaFilter === 'ALL' ? 'Piscina y Gimnasio' : (areaFilter === 'PISCINA' ? 'Área de Piscina' : 'Área de Gimnasio')}`, 38, 22);

          doc.setFontSize(8.5);
          doc.setTextColor(100);
          doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Rango: ${startDate || 'Inicio'} al ${endDate || 'Fin'} | Total Concurrencias: ${filteredLogs.length}`, 38, 27);

          // Filter details string
          let filterSummary = 'Filtros: ';
          if (areaFilter !== 'ALL') filterSummary += `Área: ${areaFilter} | `;
          if (statusFilter !== 'ALL') filterSummary += `Estado: ${statusFilter} | `;
          if (genderFilter !== 'ALL') filterSummary += `Género: ${genderFilter} | `;
          if (dependencyFilter !== 'ALL') filterSummary += `Dependencia: ${dependencyFilter} | `;
          if (searchTerm) filterSummary += `Búsqueda: "${searchTerm}" | `;
          filterSummary += `Llaves: ${stats.lockersLoaned} • Toallas: ${stats.towelsLoaned} • Varones: ${stats.males} • Mujeres: ${stats.females}`;

          doc.setFontSize(7.5);
          doc.setTextColor(80);
          doc.text(filterSummary, 14, 34);

          // Table Data
          const tableData = filteredLogs.map((l, index) => {
            let permanencia = '-';
            if (l.exitTime) {
              const mins = differenceInMinutes(new Date(l.exitTime), new Date(l.entryTime));
              permanencia = `${Math.floor(mins / 60)}h ${mins % 60}m`;
            } else if (l.status === 'DENTRO') {
              permanencia = 'En curso';
            }

            const insumos = [
              l.lockerKey ? `Llave #${l.lockerKey}` : '',
              (l.towelNumber || l.towelQty > 0) ? `Toalla #${l.towelNumber || l.towelQty}` : ''
            ].filter(Boolean).join(' • ') || '-';

            return [
              index + 1,
              l.area,
              format(new Date(l.entryTime), 'dd/MM/yy HH:mm'),
              l.exitTime ? format(new Date(l.exitTime), 'HH:mm') : 'DENTRO',
              permanencia,
              l.memberCode || '-',
              l.personName,
              l.dependency,
              l.gender === 'VARON' ? 'V' : 'M',
              insumos,
              l.status,
              l.observations || '-'
            ];
          });

          autoTable(doc, {
            startY: 37,
            head: [['N°', 'Área', 'Ingreso', 'Salida', 'Tiempo', 'Cód.', 'Socio / Concurrente', 'Dep.', 'Gén', 'Llave / Toalla', 'Estado', 'Obs.']],
            body: tableData,
            theme: 'grid',
            headStyles: { 
              fillColor: [19, 56, 37], // Brand deep green
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 7.5
            },
            styles: { 
              fontSize: 7,
              cellPadding: 1.5,
              valign: 'middle'
            },
            columnStyles: {
              0: { cellWidth: 8, halign: 'center' },
              1: { cellWidth: 16, fontStyle: 'bold' },
              2: { cellWidth: 22 },
              3: { cellWidth: 14, halign: 'center' },
              4: { cellWidth: 15, halign: 'center' },
              5: { cellWidth: 14 },
              6: { cellWidth: 50, fontStyle: 'bold' },
              7: { cellWidth: 20 },
              8: { cellWidth: 10, halign: 'center' },
              9: { cellWidth: 35 },
              10: { cellWidth: 16, halign: 'center' },
              11: { cellWidth: 'auto' },
            },
            alternateRowStyles: {
              fillColor: [248, 250, 248]
            }
          });

          const fileName = `Reporte_Control_Acceso_${areaFilter}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
          doc.save(fileName);
          toast.success('Reporte PDF exportado correctamente');
        } catch (err) {
          console.error('Error rendering PDF:', err);
          toast.error('Hubo un problema al generar el PDF.');
        }
      };

      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = logoClub;
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/png');
            renderPDF(dataURL);
          } else {
            renderPDF(img);
          }
        } catch (e) {
          renderPDF(img);
        }
      };
      
      img.onerror = () => renderPDF();
    } catch (err) {
      console.error('Error init PDF:', err);
      toast.error('Error al inicializar la exportación PDF');
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setAreaFilter(defaultArea || 'ALL');
    setStartDate(format(new Date(), 'yyyy-MM-01'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
    setStatusFilter('ALL');
    setGenderFilter('ALL');
    setDependencyFilter('ALL');
    setSearchTerm('');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#060a08] relative overflow-hidden font-sans flex flex-col p-4 sm:p-6 lg:p-10 text-gray-900 dark:text-white transition-colors">
      
      {/* Background ambient glow */}
      <div className="absolute inset-0 z-0 opacity-25 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-gold/20 via-transparent to-transparent"></div>

      <div className="relative z-10 max-w-7xl w-full mx-auto space-y-6">
        
        {/* TOP HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-gray-200 dark:border-brand-gold/20 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                if (areaFilter === 'PISCINA') navigate('/access/piscina');
                else if (areaFilter === 'GIMNASIO') navigate('/access/gimnasio');
                else navigate('/access-selection');
              }}
              className="p-2.5 bg-white dark:bg-[#0c1410] hover:bg-gray-100 dark:hover:bg-black/60 border border-gray-200 dark:border-brand-gold/30 rounded-2xl text-brand-gold shadow-md transition-all hover:scale-105 active:scale-95"
              title="Volver"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
                  <FileText className="text-brand-gold w-8 h-8" />
                  Generador de Reportes de Acceso
                </h1>
                <span className="px-3 py-1 rounded-full bg-brand-gold/15 text-brand-gold font-bold text-xs border border-brand-gold/30 uppercase tracking-wider">
                  {areaFilter === 'ALL' ? 'Piscina & Gimnasio' : areaFilter}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                Historial analítico y exportación oficial en formatos Excel y PDF con rango de fechas.
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={fetchData}
              disabled={loading}
              className="p-3 bg-white dark:bg-black/40 hover:bg-gray-100 dark:hover:bg-black/60 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-600 dark:text-gray-300 transition-all shadow-sm"
              title="Actualizar datos"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin text-brand-gold' : ''} />
            </button>

            <button 
              onClick={handleExportExcel}
              disabled={loading || filteredLogs.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-5 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm uppercase tracking-wide"
            >
              <Download size={18} /> Excel
            </button>

            <button 
              onClick={handleExportPDF}
              disabled={loading || filteredLogs.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-brand-gold via-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-extrabold py-3 px-6 rounded-2xl transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.02] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm uppercase tracking-wide"
            >
              <FileText size={18} /> Exportar PDF
            </button>
          </div>
        </div>

        {/* FILTERS PANEL */}
        <div className="bg-white dark:bg-[#0a120e] p-5 sm:p-6 rounded-3xl border border-gray-200 dark:border-brand-gold/20 shadow-xl space-y-5">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 dark:border-white/10 pb-4">
            <h3 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Filter size={18} className="text-brand-gold" /> Filtros del Reporte
            </h3>
            
            {/* Quick date presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-gray-400 font-bold uppercase mr-1">Rango Rápido:</span>
              <button 
                onClick={() => handleQuickDate('TODAY')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/5 dark:bg-white/5 hover:bg-brand-gold/20 hover:text-brand-gold border border-gray-200 dark:border-white/10 transition-all"
              >
                Hoy
              </button>
              <button 
                onClick={() => handleQuickDate('YESTERDAY')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/5 dark:bg-white/5 hover:bg-brand-gold/20 hover:text-brand-gold border border-gray-200 dark:border-white/10 transition-all"
              >
                Ayer
              </button>
              <button 
                onClick={() => handleQuickDate('THIS_WEEK')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/5 dark:bg-white/5 hover:bg-brand-gold/20 hover:text-brand-gold border border-gray-200 dark:border-white/10 transition-all"
              >
                Esta Semana
              </button>
              <button 
                onClick={() => handleQuickDate('THIS_MONTH')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/5 dark:bg-white/5 hover:bg-brand-gold/20 hover:text-brand-gold border border-gray-200 dark:border-white/10 transition-all"
              >
                Este Mes
              </button>
              <button 
                onClick={() => handleQuickDate('LAST_30_DAYS')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/5 dark:bg-white/5 hover:bg-brand-gold/20 hover:text-brand-gold border border-gray-200 dark:border-white/10 transition-all"
              >
                Últimos 30 Días
              </button>
              <button 
                onClick={handleResetFilters}
                className="p-1.5 rounded-lg text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all ml-1"
                title="Limpiar Filtros"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            
            {/* Area */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Área</label>
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value as any)}
                className="w-full bg-gray-50 dark:bg-[#050806] border border-gray-300 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-gray-900 dark:text-white font-bold focus:outline-none focus:border-brand-gold transition-colors"
              >
                <option value="ALL">🌐 Ambas Áreas</option>
                <option value="PISCINA">🏊 Piscina</option>
                <option value="GIMNASIO">🏋️ Gimnasio</option>
              </select>
            </div>

            {/* Fecha Inicio */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Fecha Inicio</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#050806] border border-gray-300 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand-gold transition-colors"
              />
            </div>

            {/* Fecha Fin */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Fecha Fin</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#050806] border border-gray-300 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand-gold transition-colors"
              />
            </div>

            {/* Estado */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#050806] border border-gray-300 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand-gold transition-colors"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="DENTRO">🟢 En Área (Dentro)</option>
                <option value="SALIO">🚪 Salida Registrada</option>
              </select>
            </div>

            {/* Género */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Género</label>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#050806] border border-gray-300 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand-gold transition-colors"
              >
                <option value="ALL">Todos</option>
                <option value="VARON">Varones</option>
                <option value="MUJER">Mujeres</option>
              </select>
            </div>

            {/* Dependencia */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Dependencia</label>
              <select
                value={dependencyFilter}
                onChange={(e) => setDependencyFilter(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#050806] border border-gray-300 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-gray-900 dark:text-white font-medium focus:outline-none focus:border-brand-gold transition-colors"
              >
                <option value="ALL">Todas las dependencias</option>
                <option value="TITULAR">Titular</option>
                <option value="ESPOSA">Esposa / Cónyuge</option>
                <option value="HIJO">Hijo / Hija</option>
                <option value="PADRE_MADRE">Padre / Madre</option>
                <option value="NIETO">Nieto / Nieta</option>
                <option value="INVITADO">Invitado</option>
                <option value="PROFESOR">Profesor / Instructor</option>
                <option value="EXTERNO">Externo</option>
                <option value="CONVENIO">Convenio</option>
                <option value="HUESPED">Huésped</option>
              </select>
            </div>

          </div>

          {/* Quick text search bar */}
          <div className="pt-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Buscar por Nombre del Socio, CI, Código, N° Llave (#14) o N° Toalla (#45)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#050806] border border-gray-300 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-brand-gold transition-colors"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

        </div>

        {/* KPI SUMMARY CARDS (ESTILO PQRS) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0a120e] border border-gray-200 dark:border-brand-gold/20 shadow-md">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Accesos</span>
              <Users className="w-4 h-4 text-brand-gold" />
            </div>
            <div className="text-2xl font-black text-gray-900 dark:text-white">{stats.total}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">En el periodo seleccionado</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0a120e] border border-gray-200 dark:border-brand-gold/20 shadow-md">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">En Área Ahora</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <div className="text-2xl font-black text-emerald-500 dark:text-emerald-400">{stats.currentlyInside}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Socios concurrentes activos</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0a120e] border border-gray-200 dark:border-brand-gold/20 shadow-md">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Lockers Prestados</span>
              <Key className="w-4 h-4 text-brand-gold" />
            </div>
            <div className="text-2xl font-black text-brand-gold">{stats.lockersLoaned}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">{Math.round((stats.lockersLoaned / (stats.total || 1)) * 100)}% de concurrentes</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0a120e] border border-gray-200 dark:border-brand-gold/20 shadow-md">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Toallas Prestadas</span>
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-blue-500 dark:text-blue-400">{stats.towelsLoaned}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Toallas entregadas</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0a120e] border border-gray-200 dark:border-brand-gold/20 shadow-md">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Varones / Mujeres</span>
              <span className="text-[10px] font-bold text-gray-400">Gén</span>
            </div>
            <div className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-cyan-400">{stats.males}👨</span>
              <span className="text-gray-400">/</span>
              <span className="text-pink-400">{stats.females}👩</span>
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">{Math.round((stats.males / (stats.total || 1)) * 100)}% Hombres</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0a120e] border border-gray-200 dark:border-brand-gold/20 shadow-md">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Tiempo Promedio</span>
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-400">{stats.avgHoursFormatted}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Por permanencia en el área</div>
          </div>

        </div>

        {/* RESULTS TABLE */}
        <div className="bg-white dark:bg-[#0a120e] rounded-3xl border border-gray-200 dark:border-brand-gold/20 shadow-xl overflow-hidden flex flex-col">
          
          <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-black/30">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                Registros Filtrados ({filteredLogs.length})
              </span>
              {loading && <span className="text-xs text-brand-gold animate-pulse">Cargando datos...</span>}
            </div>

            <div className="text-xs text-gray-400 font-semibold">
              Mostrando {filteredLogs.length} resultados
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 uppercase text-[9px] tracking-wider bg-gray-100/50 dark:bg-black/40">
                  <th className="py-3.5 px-4 font-bold">N°</th>
                  <th className="py-3.5 px-4 font-bold">Área</th>
                  <th className="py-3.5 px-4 font-bold">Fecha / Hora</th>
                  <th className="py-3.5 px-4 font-bold">Permanencia</th>
                  <th className="py-3.5 px-4 font-bold">Socio / Concurrente</th>
                  <th className="py-3.5 px-4 font-bold">Dependencia</th>
                  <th className="py-3.5 px-4 font-bold">Género</th>
                  <th className="py-3.5 px-4 font-bold">Insumos Prestados</th>
                  <th className="py-3.5 px-4 font-bold text-center">Estado</th>
                  <th className="py-3.5 px-4 font-bold">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-gray-400">
                      <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-brand-gold" />
                      Cargando historial de accesos...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-gray-400">
                      <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-3 text-gray-400">
                        <Filter className="w-6 h-6 opacity-30" />
                      </div>
                      <p className="text-sm font-semibold">No se encontraron registros con los filtros seleccionados.</p>
                      <button 
                        onClick={handleResetFilters}
                        className="mt-3 px-4 py-1.5 rounded-xl bg-brand-gold/15 text-brand-gold text-xs font-bold border border-brand-gold/30 hover:bg-brand-gold/25 transition-colors"
                      >
                        Restablecer Filtros
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, index) => {
                    let permanencia = '-';
                    if (log.exitTime) {
                      const mins = differenceInMinutes(new Date(log.exitTime), new Date(log.entryTime));
                      permanencia = `${Math.floor(mins / 60)}h ${mins % 60}m`;
                    } else if (log.status === 'DENTRO') {
                      const mins = differenceInMinutes(new Date(), new Date(log.entryTime));
                      permanencia = `En curso (${Math.floor(mins / 60)}h ${mins % 60}m)`;
                    }

                    return (
                      <tr key={log.id} className="hover:bg-black/5 dark:hover:bg-white/[0.02] transition-colors">
                        
                        {/* Index */}
                        <td className="py-3 px-4 text-gray-400 font-mono text-[11px]">
                          {index + 1}
                        </td>

                        {/* Area */}
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${
                            log.area === 'PISCINA' 
                              ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' 
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          }`}>
                            {log.area === 'PISCINA' ? <Waves className="w-3 h-3" /> : <Dumbbell className="w-3 h-3" />}
                            {log.area}
                          </span>
                        </td>

                        {/* Timestamp */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {format(new Date(log.entryTime), 'dd/MM/yyyy')}
                          </div>
                          <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-brand-gold/80" />
                            <span>{format(new Date(log.entryTime), 'HH:mm')}</span>
                            <span>➔</span>
                            <span>{log.exitTime ? format(new Date(log.exitTime), 'HH:mm') : 'En área'}</span>
                          </div>
                        </td>

                        {/* Duration */}
                        <td className="py-3 px-4 font-mono text-[11px] text-gray-700 dark:text-gray-300">
                          {permanencia}
                        </td>

                        {/* Person Name & Code */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900 dark:text-white text-xs">
                            {log.personName}
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                            {log.memberCode && <span className="font-semibold text-brand-gold">Cód: #{log.memberCode}</span>}
                            {log.documentId && <span>CI: {log.documentId}</span>}
                          </div>
                        </td>

                        {/* Dependency */}
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/10 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                            {log.dependency}
                          </span>
                        </td>

                        {/* Gender */}
                        <td className="py-3 px-4">
                          <span className={`text-[11px] font-bold ${log.gender === 'VARON' ? 'text-cyan-400' : 'text-pink-400'}`}>
                            {log.gender === 'VARON' ? 'Varón' : 'Mujer'}
                          </span>
                        </td>

                        {/* Loans: Key & Towel */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {log.lockerKey && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-gold/15 text-brand-gold text-[10px] font-bold border border-brand-gold/30">
                                <Key className="w-2.5 h-2.5" /> #{log.lockerKey}
                              </span>
                            )}
                            {(log.towelNumber || log.towelQty > 0) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 text-[10px] font-bold border border-blue-500/30">
                                <Layers className="w-2.5 h-2.5" /> Toalla #{log.towelNumber || log.towelQty} {log.towelSize !== 'NINGUNA' ? `(${log.towelSize})` : ''}
                              </span>
                            )}
                            {!log.lockerKey && !log.towelNumber && (!log.towelQty || log.towelQty === 0) && (
                              <span className="text-gray-400 text-[11px]">-</span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            log.status === 'DENTRO'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                              : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          }`}>
                            {log.status === 'DENTRO' ? '🟢 En Área' : '🚪 Salió'}
                          </span>
                        </td>

                        {/* Observations */}
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-[11px] max-w-[200px] truncate" title={log.observations || ''}>
                          {log.observations || '-'}
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

    </div>
  );
};
