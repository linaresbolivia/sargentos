import React, { useState, useMemo } from 'react';
import { RouteSheetItem } from '../types/correspondence.types';
import {
  X,
  FileSpreadsheet,
  FileText,
  Printer,
  Calendar,
  Filter,
  Building2,
  User,
  Search,
  CheckCircle2,
  FolderArchive,
  Download,
  Clock,
  Sparkles,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import CrestLogo from '@shared/components/CrestLogo';

interface CorrespondenceReportExportModalProps {
  items: RouteSheetItem[];
  isOpen: boolean;
  onClose: () => void;
}

const DEPARTMENTS = [
  { id: 'ALL', label: 'Todas las Áreas CHLS' },
  { id: 'SECRETARIA_GENERAL', label: 'Secretaría de Gerencia' },
  { id: 'GERENCIA_GENERAL', label: 'Gerencia General' },
  { id: 'TESORERÍA Y FINANZAS', label: 'Tesorería & Finanzas' },
  { id: 'CONTRATACIONES Y ADQUISICIONES', label: 'Compras & Contrataciones' },
  { id: 'COMISIÓN HÍPICA', label: 'Comisión Hípica' },
  { id: 'CAPITANÍA DEPORTES / TENIS', label: 'Capitanía de Deportes' },
  { id: 'ASESORÍA LEGAL', label: 'Asesoría Legal' },
  { id: 'MANTENIMIENTO Y OBRAS', label: 'Mantenimiento & Obras' },
  { id: 'CASETA_ENTRADA', label: 'Caseta de Ingreso' },
  { id: 'ARCHIVO_CENTRAL', label: 'Archivo Central & Custodia' },
];

export const CorrespondenceReportExportModal: React.FC<CorrespondenceReportExportModalProps> = ({
  items,
  isOpen,
  onClose,
}) => {
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [senderTypeFilter, setSenderTypeFilter] = useState('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Quick Date Range Presets
  const setDatePreset = (preset: 'TODAY' | 'MONTH' | 'YEAR' | 'ALL') => {
    const now = new Date();
    if (preset === 'TODAY') {
      const dStr = format(now, 'yyyy-MM-dd');
      setStartDate(dStr);
      setEndDate(dStr);
    } else if (preset === 'MONTH') {
      const monthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
      const monthEnd = format(now, 'yyyy-MM-dd');
      setStartDate(monthStart);
      setEndDate(monthEnd);
    } else if (preset === 'YEAR') {
      setStartDate(`${now.getFullYear()}-01-01`);
      setEndDate(format(now, 'yyyy-MM-dd'));
    } else if (preset === 'ALL') {
      setStartDate('2020-01-01');
      setEndDate(format(now, 'yyyy-MM-dd'));
    }
  };

  // Filtered dataset
  const filteredData = useMemo(() => {
    return items.filter((item) => {
      // 1. Date Range Filter
      if (item.createdAt) {
        const itemDate = new Date(item.createdAt);
        if (startDate) {
          const [sY, sM, sD] = startDate.split('-').map(Number);
          const start = new Date(sY, sM - 1, sD, 0, 0, 0, 0);
          if (itemDate < start) return false;
        }
        if (endDate) {
          const [eY, eM, eD] = endDate.split('-').map(Number);
          const end = new Date(eY, eM - 1, eD, 23, 59, 59, 999);
          if (itemDate > end) return false;
        }
      }

      // 2. Status Filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }

      // 3. Priority Filter
      if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) {
        return false;
      }

      // 4. Area / Custody Filter
      if (areaFilter !== 'ALL' && item.currentArea !== areaFilter) {
        return false;
      }

      // 5. Sender Type Filter
      if (senderTypeFilter !== 'ALL' && item.senderType !== senderTypeFilter) {
        return false;
      }

      // 6. Search Filter
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchCode = item.hrCode?.toLowerCase().includes(q);
        const matchRef = item.reference?.toLowerCase().includes(q);
        const matchSender = item.senderName?.toLowerCase().includes(q);
        const matchCite = item.cite?.toLowerCase().includes(q);
        const matchArea = item.currentArea?.toLowerCase().includes(q) || item.senderArea?.toLowerCase().includes(q);
        const matchArchive = item.archiveLocation?.toLowerCase().includes(q) || item.archiveBox?.toLowerCase().includes(q);
        if (!matchCode && !matchRef && !matchSender && !matchCite && !matchArea && !matchArchive) {
          return false;
        }
      }

      return true;
    });
  }, [items, startDate, endDate, statusFilter, priorityFilter, areaFilter, senderTypeFilter, searchFilter]);

  // Aggregate Metrics
  const totalFojas = useMemo(() => {
    return filteredData.reduce((acc, curr) => acc + (curr.pageCount || 1), 0);
  }, [filteredData]);

  const totalConcluidos = useMemo(() => {
    return filteredData.filter((i) => i.status === 'CONCLUIDO').length;
  }, [filteredData]);

  if (!isOpen) return null;

  // 1. Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      toast.error('No hay trámites para exportar con los filtros seleccionados');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading('Generando Libro de Registro en Excel...');
    try {
      const rows = filteredData.map((item, idx) => {
        const lastMovement = item.movements && item.movements.length > 0
          ? item.movements[item.movements.length - 1]
          : null;

        return {
          'N°': idx + 1,
          'CÓDIGO HR': item.hrCode,
          'FECHA RADICACIÓN': item.createdAt ? format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm') : '',
          'TIPO REMITENTE': item.senderType,
          'REMITENTE': item.senderName,
          'ÁREA / PROCEDENCIA': item.senderArea || (item.senderType === 'SOCIO' ? 'Socio Titular CHLS' : 'Externo'),
          'CITE': item.cite || 'S/N',
          'FOJAS': item.pageCount || 1,
          'REFERENCIA / ASUNTO': item.reference,
          'PRIORIDAD': item.priority,
          'ESTADO': item.status,
          'CUSTODIA / ÁREA ACTUAL': item.currentArea,
          'CANT. PROVEÍDOS': item.movements?.length || 0,
          'ÚLTIMA INSTRUCCIÓN': lastMovement ? `${lastMovement.quickStamp ? `[${lastMovement.quickStamp}] ` : ''}${lastMovement.instruction}` : 'Sin derivaciones',
          'UBICACIÓN ARCHIVO CENTRAL': item.archiveLocation ? `${item.archiveLocation}${item.archiveBox ? ` - ${item.archiveBox}` : ''}` : 'En Circulación',
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);

      // Auto-fit column widths
      const colWidths = [
        { wch: 5 },  // N°
        { wch: 16 }, // Código
        { wch: 18 }, // Fecha
        { wch: 15 }, // Tipo
        { wch: 28 }, // Remitente
        { wch: 22 }, // Área
        { wch: 16 }, // Cite
        { wch: 8 },  // Fojas
        { wch: 45 }, // Referencia
        { wch: 12 }, // Prioridad
        { wch: 14 }, // Estado
        { wch: 25 }, // Custodia
        { wch: 12 }, // Cant. Proveídos
        { wch: 40 }, // Última instrucción
        { wch: 35 }, // Ubicación archivo
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Libro_Correspondencia_CHLS');

      const fileName = `Libro_Registro_Correspondencia_CHLS_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success('¡Libro de Registro exportado a Excel exitosamente!', { id: toastId });
    } catch (err: any) {
      toast.error('Error al generar Excel: ' + (err.message || 'Error desconocido'), { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Export to PDF (.pdf)
  const handleExportPDF = () => {
    if (filteredData.length === 0) {
      toast.error('No hay trámites para exportar con los filtros seleccionados');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading('Generando documento PDF oficial...');
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });

      // Header Banner (Emerald & Gold Institutional Style - Letter Landscape 279.4mm x 215.9mm)
      doc.setFillColor(7, 24, 16);
      doc.rect(0, 0, 279.4, 26, 'F');

      doc.setFontSize(15);
      doc.setTextColor(204, 161, 75); // Brand Gold
      doc.setFont('helvetica', 'bold');
      doc.text('CLUB HÍPICO LOS SARGENTOS', 14, 11);

      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.text('LIBRO OFICIAL DE REGISTRO DE CORRESPONDENCIA Y HOJAS DE RUTA (CHLS 360°)', 14, 17);

      doc.setFontSize(8);
      doc.setTextColor(167, 243, 208); // Emerald Light
      doc.text(
        `Período: ${startDate} al ${endDate} | Filtro Área: ${areaFilter} | Total Registros: ${filteredData.length} (${totalFojas} fojas) | Papel Bond Carta`,
        14,
        22
      );

      doc.setFontSize(8);
      doc.setTextColor(204, 161, 75);
      doc.text(`Emisión: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 225, 22);

      // Table rows
      const tableData = filteredData.map((item, idx) => [
        `#${idx + 1}`,
        item.hrCode,
        item.createdAt ? format(new Date(item.createdAt), 'dd/MM/yy HH:mm') : '',
        item.senderName,
        item.senderArea || (item.senderType === 'SOCIO' ? 'Socio' : 'Externo'),
        item.cite || 'S/N',
        item.pageCount || 1,
        item.reference,
        item.priority,
        item.status,
        item.currentArea,
        item.archiveLocation || 'En Circulación',
      ]);

      autoTable(doc, {
        startY: 30,
        head: [
          [
            'N°',
            'Código HR',
            'Fecha',
            'Remitente',
            'Procedencia',
            'CITE',
            'Fojas',
            'Referencia / Asunto',
            'Prioridad',
            'Estado',
            'Custodia Actual',
            'Archivo Central',
          ],
        ],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [7, 24, 16],
          textColor: [204, 161, 75],
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 7,
          textColor: [30, 41, 59],
        },
        alternateRowStyles: {
          fillColor: [240, 253, 244],
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 22, fontStyle: 'bold' },
          2: { cellWidth: 20 },
          3: { cellWidth: 32 },
          4: { cellWidth: 24 },
          5: { cellWidth: 18 },
          6: { cellWidth: 10, halign: 'center' },
          7: { cellWidth: 55 },
          8: { cellWidth: 16, halign: 'center' },
          9: { cellWidth: 20, halign: 'center' },
          10: { cellWidth: 24 },
          11: { cellWidth: 20 },
        },
        styles: {
          overflow: 'linebreak',
          cellPadding: 1.5,
        },
        didDrawPage: (data) => {
          // Footer oficial para Papel Bond Tamaño Carta
          doc.setFontSize(7);
          doc.setTextColor(120, 120, 120);
          const pageStr = `Página ${data.pageNumber} de ${(doc as any).internal.getNumberOfPages()}`;
          doc.text(pageStr, 14, 206);
          doc.text('Secretaría de Gerencia General — Club Hípico Los Sargentos — Auditoría Oficial (Papel Bond Tamaño Carta)', 75, 206);
        },
      });

      const fileName = `Libro_Correspondencia_CHLS_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
      doc.save(fileName);

      toast.success('¡Documento PDF oficial descargado exitosamente!', { id: toastId });
    } catch (err: any) {
      toast.error('Error al generar PDF: ' + (err.message || 'Error desconocido'), { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-[#07110c] border-2 border-emerald-500/50 rounded-3xl w-full max-w-6xl overflow-hidden shadow-[0_0_90px_rgba(16,185,129,0.35)] my-6 flex flex-col max-h-[94vh]">
        
        {/* Modal Top Header */}
        <div className="px-6 py-5 border-b border-emerald-500/30 flex justify-between items-center bg-slate-50/90 dark:bg-[#091810] shrink-0 flex-wrap gap-3">
          <div className="flex items-center gap-3.5">
            <CrestLogo size="sm" className="w-11 h-11 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  Libro Oficial de Registro de Correspondencia
                </h2>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold border border-brand-gold/40">
                  Exportador 360°
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Generador de reportes anuales, libros de actas de correspondencia y auditoría oficial (Excel & PDF)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          
          {/* Filters Matrix Panel */}
          <div className="p-5 rounded-3xl bg-slate-50/90 dark:bg-[#0c1a13] border-2 border-emerald-500/30 space-y-4">
            
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-emerald-500/20">
              <span className="font-black text-xs text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                <Filter className="w-4 h-4 text-brand-gold" />
                <span>Parámetros & Criterios de Filtrado:</span>
              </span>

              {/* Quick Date Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-400 mr-1">Rango Rápido:</span>
                <button
                  type="button"
                  onClick={() => setDatePreset('TODAY')}
                  className="px-2.5 py-1 text-[10.5px] font-bold rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-emerald-500 text-slate-700 dark:text-gray-300 transition-colors cursor-pointer"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset('MONTH')}
                  className="px-2.5 py-1 text-[10.5px] font-bold rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-emerald-500 text-slate-700 dark:text-gray-300 transition-colors cursor-pointer"
                >
                  Este Mes
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset('YEAR')}
                  className="px-2.5 py-1 text-[10.5px] font-bold rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 transition-colors cursor-pointer"
                >
                  Gestión {currentYear}
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset('ALL')}
                  className="px-2.5 py-1 text-[10.5px] font-bold rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-emerald-500 text-slate-700 dark:text-gray-300 transition-colors cursor-pointer"
                >
                  Histórico Todo
                </button>
              </div>
            </div>

            {/* Grid of Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              
              {/* Date From */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-gray-300 block">
                  Fecha Inicial (Desde):
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white dark:bg-black/40 border border-slate-300 dark:border-emerald-500/30 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Date To */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-gray-300 block">
                  Fecha Final (Hasta):
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white dark:bg-black/40 border border-slate-300 dark:border-emerald-500/30 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Area Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-gray-300 block">
                  Área / Custodia:
                </label>
                <select
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  className="w-full bg-white dark:bg-black/40 border border-slate-300 dark:border-emerald-500/30 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-gray-300 block">
                  Estado del Trámite:
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-white dark:bg-black/40 border border-slate-300 dark:border-emerald-500/30 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="ALL">Todos los Estados</option>
                  <option value="RECIBIDO">Recibido (Mesa de Entrada)</option>
                  <option value="DERIVADO">Derivado / En Tránsito</option>
                  <option value="EN_PROCESO">En Proceso</option>
                  <option value="OBSERVADO">Observado</option>
                  <option value="CONCLUIDO">Concluido / Archivado</option>
                  <option value="ANULADO">Anulado</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-gray-300 block">
                  Prioridad:
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full bg-white dark:bg-black/40 border border-slate-300 dark:border-emerald-500/30 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="ALL">Todas las Prioridades</option>
                  <option value="BAJA">Baja</option>
                  <option value="NORMAL">Normal</option>
                  <option value="ALTA">Alta</option>
                  <option value="URGENTE">Urgente</option>
                </select>
              </div>

              {/* Sender Type */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-gray-300 block">
                  Tipo de Remitente:
                </label>
                <select
                  value={senderTypeFilter}
                  onChange={(e) => setSenderTypeFilter(e.target.value)}
                  className="w-full bg-white dark:bg-black/40 border border-slate-300 dark:border-emerald-500/30 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="ALL">Todos los Remitentes</option>
                  <option value="SOCIO">Socio Titular CHLS</option>
                  <option value="AREA_INTERNA">Área Interna CHLS</option>
                  <option value="EXTERNO">Externo / Proveedor / Empresa</option>
                </select>
              </div>

              {/* Free Text Search */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-gray-300 block">
                  Búsqueda por Texto (CITE, Asunto, Remitente, Archivo):
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filtrar por palabra clave..."
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-black/40 border border-slate-300 dark:border-emerald-500/30 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

            </div>

          </div>

          {/* Results Summary Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">
                Total Registros
              </span>
              <span className="text-lg font-black text-slate-950 dark:text-white font-mono">
                {filteredData.length} <span className="text-xs font-bold text-emerald-600">trámites</span>
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">
                Total Fojas Oficiales
              </span>
              <span className="text-lg font-black text-slate-950 dark:text-white font-mono">
                {totalFojas} <span className="text-xs font-bold text-brand-gold">fojas</span>
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30">
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">
                Trámites Concluidos
              </span>
              <span className="text-lg font-black text-slate-950 dark:text-white font-mono">
                {totalConcluidos} <span className="text-xs font-bold text-blue-600">cerrados</span>
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30">
              <span className="text-[10.5px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block">
                En Trámite Activo
              </span>
              <span className="text-lg font-black text-slate-950 dark:text-white font-mono">
                {filteredData.length - totalConcluidos} <span className="text-xs font-bold text-purple-600">activos</span>
              </span>
            </div>
          </div>

          {/* Live Table Preview */}
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-gray-400 block">
              Vista Previa de Registros a Exportar ({Math.min(5, filteredData.length)} de {filteredData.length}):
            </span>
            <div className="border border-slate-200 dark:border-emerald-500/30 rounded-2xl overflow-hidden overflow-x-auto shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-[#0c1a13] text-slate-700 dark:text-emerald-300 font-black border-b border-slate-200 dark:border-emerald-500/30">
                  <tr>
                    <th className="p-3">Código</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Remitente</th>
                    <th className="p-3">CITE / Fojas</th>
                    <th className="p-3">Asunto</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Custodia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-emerald-500/15 text-slate-800 dark:text-gray-200 font-medium">
                  {filteredData.slice(0, 5).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/5">
                      <td className="p-3 font-mono font-black text-emerald-700 dark:text-brand-gold">
                        {item.hrCode}
                      </td>
                      <td className="p-3 text-[11px] whitespace-nowrap">
                        {item.createdAt ? format(new Date(item.createdAt), 'dd/MM/yyyy') : ''}
                      </td>
                      <td className="p-3 font-bold truncate max-w-[150px]">
                        {item.senderName}
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        {item.cite || 'S/N'} ({item.pageCount || 1} f.)
                      </td>
                      <td className="p-3 truncate max-w-[220px]">
                        {item.reference}
                      </td>
                      <td className="p-3 font-black text-[11px]">
                        {item.status}
                      </td>
                      <td className="p-3 font-bold text-emerald-800 dark:text-emerald-300 truncate max-w-[140px]">
                        {item.currentArea}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-emerald-500/30 flex items-center justify-between bg-slate-50/90 dark:bg-[#091810] shrink-0 flex-wrap gap-3">
          <div className="text-xs text-slate-500 dark:text-gray-400 font-medium">
            Formato oficial: <strong>Papel Bond Tamaño Carta (Horizontal)</strong> con validez fiduciaria y de auditoría interna
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Cerrar
            </button>

            {/* Export to Excel */}
            <button
              type="button"
              disabled={isExporting || filteredData.length === 0}
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-md shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 text-xs sm:text-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-white" />
              <span>Exportar Excel (.xlsx)</span>
            </button>

            {/* Export to PDF */}
            <button
              type="button"
              disabled={isExporting || filteredData.length === 0}
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-brand-gold to-yellow-600 hover:from-yellow-500 hover:to-yellow-600 text-black font-black shadow-lg shadow-brand-gold/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 text-xs sm:text-sm cursor-pointer"
            >
              <FileText className="w-4 h-4 text-black" />
              <span>Generar PDF Carta (.pdf)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
export default CorrespondenceReportExportModal;
