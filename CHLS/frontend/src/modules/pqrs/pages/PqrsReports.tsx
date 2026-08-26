import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@config/api';
import toast from 'react-hot-toast';
import { FileText, Download, Filter } from 'lucide-react';
import { format, isAfter, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoClub from '../../../assets/logo.png';
import CrestLogo from '@shared/components/CrestLogo';
import { BackButton } from '@shared/components/BackButton';

interface PqrsTicket {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  email: string;
  memberCode?: string;
  type: string;
  area: string;
  applicantCondition: string;
  status: string;
  priority: string;
  createdAt: string;
  assignedToId?: string;
  assignedTo?: {
    firstName: string;
    lastName: string;
  };
}

interface StaffUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

export const PqrsReports: React.FC = () => {
  const [tickets, setTickets] = useState<PqrsTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [memberCode, setMemberCode] = useState<string>('');
  const [status, setStatus] = useState<string>('ALL');
  const [type, setType] = useState<string>('ALL');
  const [area, setArea] = useState<string>('ALL');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('ALL');

  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pqrsRes, staffRes] = await Promise.all([
          api.get('/pqrs'),
          api.get('/users/staff')
        ]);
        setTickets(pqrsRes.data.tickets || []);
        setStaffUsers(staffRes.data || []);
      } catch (err) {
        console.error(err);
        toast.error('Error al cargar datos.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      // Date filter
      const tDate = new Date(t.createdAt);
      if (startDate) {
        const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
        const startD = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
        if (startD > tDate) return false;
      }
      if (endDate) {
        const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
        const endD = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
        if (endD < tDate) return false;
      }

      // Other filters
      if (status !== 'ALL' && t.status !== status) return false;
      if (type !== 'ALL' && t.type !== type) return false;
      if (area !== 'ALL' && t.area !== area) return false;

      // Member filter
      if (memberCode && !(t.memberCode?.toLowerCase().includes(memberCode.toLowerCase()) || t.fullName.toLowerCase().includes(memberCode.toLowerCase()))) {
        return false;
      }

      // Assigned To filter
      if (assignedToFilter !== 'ALL' && t.assignedToId !== assignedToFilter) {
        return false;
      }

      return true;
    });
  }, [tickets, startDate, endDate, status, type, area, memberCode, assignedToFilter]);

  const handleExportPDF = () => {
    if (filteredTickets.length === 0) {
      toast.error('No hay datos para exportar con los filtros actuales.');
      return;
    }

    try {
      const doc = new jsPDF('landscape');
      
      const renderPDF = (logoData?: HTMLImageElement | string) => {
        try {
          if (logoData) {
            doc.addImage(logoData, 'PNG', 14, 10, 20, 20);
          }
          
          doc.setFontSize(18);
          doc.setTextColor(20, 50, 30);
          doc.text('Reporte de PQRS', 40, 20);
          
          doc.setFontSize(10);
          doc.setTextColor(100);
          doc.text(`Fecha de generación: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 40, 26);
          
          let filterText = 'Filtros aplicados: ';
          if (startDate || endDate) filterText += `Fecha: ${startDate || 'Inicio'} - ${endDate || 'Fin'} | `;
          if (status !== 'ALL') filterText += `Estado: ${status} | `;
          if (type !== 'ALL') filterText += `Tipo: ${type} | `;
          if (area !== 'ALL') filterText += `Área: ${area} | `;
          if (memberCode) filterText += `Socio: ${memberCode} | `;
          if (assignedToFilter !== 'ALL') {
            const u = staffUsers.find(s => s.id === assignedToFilter);
            if (u) filterText += `Asignado a: ${u.firstName} ${u.lastName} | `;
          }
          
          if (filterText !== 'Filtros aplicados: ') {
            doc.setFontSize(8);
            doc.text(filterText.replace(/ \|\ $/, ''), 14, 35);
          }

          const tableData = filteredTickets.map(t => [
            t.code,
            format(new Date(t.createdAt), 'dd/MM/yyyy HH:mm'),
            t.memberCode || '-',
            t.fullName,
            t.type,
            t.area || 'N/A',
            t.status,
            t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : 'Sin asignar'
          ]);

          autoTable(doc, {
            startY: 40,
            head: [['Código', 'Fecha', 'Cód.Socio', 'Solicitante', 'Tipo', 'Área', 'Estado', 'Asignado A']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [29, 78, 52] }, // brand-green-light (#1d4e34)
            styles: { fontSize: 8 },
          });

          doc.save(`Reporte_PQRS_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
          toast.success('Reporte exportado correctamente');
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
      toast.error('Error al inicializar la exportación.');
    }
  };

  const handleExportExcel = async () => {
    if (filteredTickets.length === 0) {
      toast.error('No hay datos para exportar.');
      return;
    }
    
    try {
      const { utils, writeFile } = await import('xlsx');
      
      const tableData = filteredTickets.map(t => ({
        'Código': t.code,
        'Fecha': format(new Date(t.createdAt), 'dd/MM/yyyy HH:mm'),
        'Cód. Socio': t.memberCode || '-',
        'Solicitante': t.fullName,
        'Tipo': t.type,
        'Área': t.area || 'N/A',
        'Estado': t.status,
        'Prioridad': t.priority,
        'Asignado A': t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : 'Sin asignar'
      }));

      const ws = utils.json_to_sheet(tableData);
      
      // Auto-size columns slightly
      const colWidths = [
        { wch: 15 }, // Código
        { wch: 20 }, // Fecha
        { wch: 12 }, // Cod. Socio
        { wch: 30 }, // Solicitante
        { wch: 15 }, // Tipo
        { wch: 20 }, // Área
        { wch: 15 }, // Estado
        { wch: 12 }, // Prioridad
        { wch: 25 }, // Asignado
      ];
      ws['!cols'] = colWidths;

      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Reporte_PQRS");
      
      writeFile(wb, `Reporte_PQRS_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
      toast.success('Reporte Excel exportado correctamente');
    } catch (err) {
      console.error('Error exportando Excel:', err);
      toast.error('Hubo un problema al generar el archivo Excel.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0f16] relative overflow-hidden font-sans flex flex-col p-6 lg:p-12 text-gray-900 dark:text-white">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-gold/30 via-transparent to-transparent dark:via-[#0a0f16] dark:to-[#0a0f16]"></div>

      <div className="relative z-10 max-w-7xl w-full mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 dark:border-brand-green/20 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <BackButton to="/admin/pqrs" title="Volver a Gestión PQRS" />
            <CrestLogo size="sm" />
            <div>
              <h1 className="text-3xl font-bold text-brand-gold serif-brand">
                Generador de Reportes PQRS
              </h1>
              <p className="theme-text-muted text-sm mt-1">Exporta datos filtrados en formato PDF.</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-sm"
            >
              <Download size={18} /> Excel
            </button>
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-light text-[#0a2014] font-bold py-2.5 px-5 rounded-xl transition-all shadow-[0_0_15px_rgba(234,179,8,0.4)]"
            >
              <FileText size={18} /> PDF
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-black/20 p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
          <h3 className="font-bold mb-4 flex items-center gap-2 border-b border-gray-200 dark:border-white/10 pb-3">
            <Filter size={18} className="text-brand-gold" /> Filtros del Reporte
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Fecha Inicio</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-sm outline-none focus:border-brand-gold text-gray-700 dark:text-gray-300 dark:[color-scheme:dark]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Fecha Fin</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-sm outline-none focus:border-brand-gold text-gray-700 dark:text-gray-300 dark:[color-scheme:dark]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Socio (Cód/Nombre)</label>
              <input 
                type="text" 
                placeholder="Buscar socio..."
                value={memberCode} 
                onChange={e => setMemberCode(e.target.value)}
                className="bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-sm outline-none focus:border-brand-gold text-gray-700 dark:text-gray-300"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Estado</label>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value)}
                className="bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-sm outline-none focus:border-brand-gold text-gray-700 dark:text-gray-300 [&>option]:bg-white dark:[&>option]:bg-[#131c26]"
              >
                <option value="ALL">Todos</option>
                <option value="ABIERTO">Abierto</option>
                <option value="EN_PROGRESO">En Progreso</option>
                <option value="CERRADO">Cerrado</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Tipo</label>
              <select 
                value={type} 
                onChange={e => setType(e.target.value)}
                className="bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-sm outline-none focus:border-brand-gold text-gray-700 dark:text-gray-300 [&>option]:bg-white dark:[&>option]:bg-[#131c26]"
              >
                <option value="ALL">Todos</option>
                <option value="PETICION">Petición</option>
                <option value="QUEJA">Queja</option>
                <option value="RECLAMO">Reclamo</option>
                <option value="SUGERENCIA">Sugerencia</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Área</label>
              <select 
                value={area} 
                onChange={e => setArea(e.target.value)}
                className="bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-sm outline-none focus:border-brand-gold text-gray-700 dark:text-gray-300 [&>option]:bg-white dark:[&>option]:bg-[#131c26]"
              >
                <option value="ALL">Todas</option>
                <option value="Area Humeda">Área Húmeda</option>
                <option value="Gimnasio">Gimnasio</option>
                <option value="Restaurante">Restaurante</option>
                <option value="Cafe Pub">Café Pub</option>
                <option value="Espacio Deportivo">Espacio Deportivo</option>
                <option value="Area Hipica">Área Hípica</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Asignado A</label>
              <select 
                value={assignedToFilter} 
                onChange={e => setAssignedToFilter(e.target.value)}
                className="bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-sm outline-none focus:border-brand-gold text-gray-700 dark:text-gray-300 [&>option]:bg-white dark:[&>option]:bg-[#131c26]"
              >
                <option value="ALL">Todos</option>
                {staffUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-black/20 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-white/5">
            <h3 className="font-bold text-sm">Vista Previa de Datos</h3>
            <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20">
              {filteredTickets.length} resultados
            </span>
          </div>
          
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="flex justify-center items-center h-full text-gray-500">
                No hay datos que coincidan con los filtros.
              </div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 dark:bg-black/40 text-xs uppercase sticky top-0 border-b border-gray-200 dark:border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 tracking-wider">CÓDIGO</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 tracking-wider">FECHA</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 tracking-wider">CÓD. SOCIO</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 tracking-wider">SOLICITANTE</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 tracking-wider">TIPO / ÁREA</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-500 tracking-wider">ESTADO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {filteredTickets.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{t.code}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{format(new Date(t.createdAt), 'dd/MM/yyyy')}</td>
                      <td className="px-4 py-3 text-gray-500">{t.memberCode || '-'}</td>
                      <td className="px-4 py-3 font-medium">{t.fullName}</td>
                      <td className="px-4 py-3">
                        <div>{t.type}</div>
                        <div className="text-xs text-gray-500">{t.area || 'Sin Área'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                          t.status === 'ABIERTO' ? 'bg-amber-500/10 text-amber-500' :
                          t.status === 'EN_PROGRESO' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PqrsReports;
