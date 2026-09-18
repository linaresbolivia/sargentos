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
  Check,
  Send,
} from 'lucide-react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import CrestLogo from '@shared/components/CrestLogo';

import { useSelector } from 'react-redux';
import { RootState } from '@store/store';
import {
  didUserParticipateInRouteSheet,
  getOrganigramNodeForUser,
  canUserAccess360,
  DEFAULT_ORGANIGRAM_NODES,
  isSameArea,
} from '../utils/organigramWorkflowService';

interface CorrespondenceReportExportModalProps {
  items: RouteSheetItem[];
  isOpen: boolean;
  onClose: () => void;
}

// Formateador de fechas al estilo del libro físico oficial: e.g. "15 SEP 2026"
const formatBookDate = (dateStr?: string | null): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

// Formateador de sello oficial con FECHA Y HORA exacta (e.g. "16/09/26 16:45")
const formatStampDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return format(d, 'dd/MM/yy HH:mm');
};

const formatStampDate = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return format(d, 'dd/MM/yy');
};

export interface UserRouteSheetAudit {
  reception: {
    isRadication: boolean;
    title: string;
    responsible: string;
    area: string;
    dateFormatted: string;
    timeFormatted: string;
    fullDateTime: string;
    isReceived: boolean;
    sourceInfo?: string;
    instruction?: string;
  };
  derivation: {
    hasDerivation: boolean;
    targetPerson: string;
    targetArea: string;
    dateFormatted: string;
    timeFormatted: string;
    fullDateTime: string;
    instruction?: string;
    destinationReceivedAt?: string | null;
    isDestinationReceived: boolean;
    statusLabel: string;
    isCustodyOrConcluded: boolean;
  };
}

export function getUserRouteSheetAudit(
  item: RouteSheetItem,
  currentUser: any,
  userArea: string,
  scopeFilter: 'MY_ACTIONS' | 'ALL_INSTITUTION'
): UserRouteSheetAudit {
  const uId = currentUser?.id || currentUser?.userId;
  const userFullName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim();
  const uArea = (userArea || (currentUser as any)?.area || '').trim();

  // Modo Supervisión 360° Institucional
  if (scopeFilter === 'ALL_INSTITUTION') {
    const mov1 = item.movements && item.movements.length > 0 ? item.movements[0] : null;
    const movLast = item.movements && item.movements.length > 0 ? item.movements[item.movements.length - 1] : null;

    const radDate = item.createdAt ? new Date(item.createdAt) : null;
    const radDateStr = radDate ? formatBookDate(item.createdAt) : '—';
    const radTimeStr = radDate ? format(radDate, 'HH:mm') : '';

    const recDate = mov1?.receivedAt ? new Date(mov1.receivedAt) : null;
    const recFull = recDate
      ? format(recDate, 'dd/MM/yyyy HH:mm')
      : (mov1?.createdAt ? `${format(new Date(mov1.createdAt), 'dd/MM/yyyy HH:mm')} [Enviado]` : '—');

    const lastDerivDate = movLast?.createdAt ? new Date(movLast.createdAt) : null;
    const lastDerivFull = lastDerivDate ? format(lastDerivDate, 'dd/MM/yyyy HH:mm') : '—';
    const lastRecDate = movLast?.receivedAt ? new Date(movLast.receivedAt) : null;
    const isLastReceived = Boolean(lastRecDate);

    return {
      reception: {
        isRadication: true,
        title: 'Radicación Inicial',
        responsible: item.senderName,
        area: item.senderArea || 'Mesa de Entrada',
        dateFormatted: radDateStr,
        timeFormatted: radTimeStr,
        fullDateTime: radDate ? format(radDate, 'dd/MM/yyyy HH:mm') : '—',
        isReceived: true,
        sourceInfo: item.senderName,
        instruction: item.reference,
      },
      derivation: {
        hasDerivation: Boolean(movLast),
        targetPerson: movLast?.targetPersonName || movLast?.targetArea || item.currentArea,
        targetArea: movLast?.targetArea || item.currentArea,
        dateFormatted: lastDerivDate ? formatBookDate(movLast!.createdAt) : '—',
        timeFormatted: lastDerivDate ? format(lastDerivDate, 'HH:mm') : '',
        fullDateTime: lastDerivFull,
        instruction: movLast?.instruction || 'Atención de trámite',
        destinationReceivedAt: movLast?.receivedAt,
        isDestinationReceived: isLastReceived,
        statusLabel: isLastReceived ? 'Recepcionado en destino' : 'Por recepcionar',
        isCustodyOrConcluded: false,
      },
    };
  }

  // Modo Personal ('MY_ACTIONS'): Control de auditoría de este usuario/despacho
  const movements = item.movements || [];

  // A. ¿Fue originado/radicado por este usuario/despacho?
  const isCreator = Boolean(
    (uId && item.createdById === uId) ||
    (uArea && isSameArea(item.senderArea, uArea)) ||
    (userArea.toUpperCase().includes('GERENCIA') && item.createdBy?.email?.toLowerCase().includes('gerencia')) ||
    (uArea && isSameArea(item.currentArea, uArea) && movements.length === 0)
  );

  // B. Movimientos entrantes hacia este usuario/despacho
  const inboundMovs = movements.filter((m) => {
    if (uArea && isSameArea(m.targetArea, uArea)) return true;
    if (m.targetPersonName && userFullName && (
      m.targetPersonName.toLowerCase().includes(userFullName.toLowerCase()) ||
      userFullName.toLowerCase().includes(m.targetPersonName.toLowerCase())
    )) return true;
    return false;
  });

  // C. Movimientos salientes derivados por este usuario/despacho
  const outboundMovs = movements.filter((m) => {
    if (uArea && isSameArea(m.sourceArea, uArea)) return true;
    if (uId && m.sourceUserId === uId) return true;
    return false;
  });

  const latestInbound = inboundMovs.length > 0 ? inboundMovs[inboundMovs.length - 1] : null;
  const latestOutbound = outboundMovs.length > 0 ? outboundMovs[outboundMovs.length - 1] : null;

  // 1. RECEPCIÓN EN EL DESPACHO
  let reception: UserRouteSheetAudit['reception'];
  if (isCreator && !latestInbound) {
    const radDate = item.createdAt ? new Date(item.createdAt) : new Date();
    reception = {
      isRadication: true,
      title: 'Radicado Oficialmente',
      responsible: userFullName || 'Funcionario CHLS',
      area: uArea || 'Despacho Institucional',
      dateFormatted: formatBookDate(item.createdAt),
      timeFormatted: format(radDate, 'HH:mm'),
      fullDateTime: format(radDate, 'dd/MM/yyyy HH:mm'),
      isReceived: true,
      sourceInfo: `${item.senderName} (${item.senderArea || (item.senderType === 'SOCIO' ? 'Socio Titular' : 'Externo')})`,
      instruction: 'Apertura y radicación de Hoja de Ruta en este despacho',
    };
  } else if (latestInbound) {
    const isRec = Boolean(latestInbound.receivedAt);
    const dateObj = isRec ? new Date(latestInbound.receivedAt!) : new Date(latestInbound.createdAt);
    reception = {
      isRadication: false,
      title: isRec ? 'Recepcionado en Despacho' : 'Pendiente de Recepción',
      responsible: latestInbound.targetPersonName || userFullName,
      area: latestInbound.targetArea || uArea,
      dateFormatted: formatBookDate(isRec ? latestInbound.receivedAt : latestInbound.createdAt),
      timeFormatted: format(dateObj, 'HH:mm'),
      fullDateTime: isRec
        ? format(new Date(latestInbound.receivedAt!), 'dd/MM/yyyy HH:mm')
        : `${format(new Date(latestInbound.createdAt), 'dd/MM/yyyy HH:mm')} [Enviado]`,
      isReceived: isRec,
      sourceInfo: latestInbound.sourceArea ? `${latestInbound.sourceArea}` : 'Derivación previa',
      instruction: latestInbound.instruction,
    };
  } else {
    const createdDate = item.createdAt ? new Date(item.createdAt) : new Date();
    reception = {
      isRadication: isCreator,
      title: isSameArea(item.currentArea, uArea) ? 'En Custodia de Despacho' : 'Asignado a Despacho',
      responsible: userFullName,
      area: uArea || item.currentArea,
      dateFormatted: formatBookDate(item.createdAt),
      timeFormatted: format(createdDate, 'HH:mm'),
      fullDateTime: format(createdDate, 'dd/MM/yyyy HH:mm'),
      isReceived: true,
      sourceInfo: item.senderName,
      instruction: item.reference,
    };
  }

  // 2. DERIVACIÓN (DIRIGIDA A)
  let derivation: UserRouteSheetAudit['derivation'];
  if (latestOutbound) {
    const derivDate = latestOutbound.createdAt ? new Date(latestOutbound.createdAt) : new Date();
    const isRec = Boolean(latestOutbound.receivedAt);
    const destRecDate = isRec ? new Date(latestOutbound.receivedAt!) : null;

    derivation = {
      hasDerivation: true,
      targetPerson: latestOutbound.targetPersonName || latestOutbound.targetArea,
      targetArea: latestOutbound.targetArea,
      dateFormatted: formatBookDate(latestOutbound.createdAt),
      timeFormatted: format(derivDate, 'HH:mm'),
      fullDateTime: format(derivDate, 'dd/MM/yyyy HH:mm'),
      instruction: latestOutbound.instruction,
      destinationReceivedAt: latestOutbound.receivedAt,
      isDestinationReceived: isRec,
      statusLabel: isRec
        ? `Recepcionado en destino el ${format(destRecDate!, 'dd/MM/yyyy HH:mm')}`
        : 'Por recepcionar en destino (En tránsito)',
      isCustodyOrConcluded: false,
    };
  } else if (item.status === 'CONCLUIDO' && (item.archivedById === uId || isSameArea(item.currentArea, uArea))) {
    const arcDate = item.archivedAt ? new Date(item.archivedAt) : new Date();
    derivation = {
      hasDerivation: true,
      targetPerson: 'Archivo Institucional',
      targetArea: item.archiveLocation || 'Archivo Central',
      dateFormatted: item.archivedAt ? formatBookDate(item.archivedAt) : 'Concluido',
      timeFormatted: format(arcDate, 'HH:mm'),
      fullDateTime: format(arcDate, 'dd/MM/yyyy HH:mm'),
      instruction: item.archiveNotes || 'Concluido y archivado oficialmente',
      destinationReceivedAt: item.archivedAt,
      isDestinationReceived: true,
      statusLabel: 'Concluido y archivado',
      isCustodyOrConcluded: true,
    };
  } else if (isSameArea(item.currentArea, uArea)) {
    derivation = {
      hasDerivation: false,
      targetPerson: userFullName,
      targetArea: uArea,
      dateFormatted: 'En Proceso',
      timeFormatted: item.status,
      fullDateTime: `En atención en ${uArea}`,
      instruction: 'Trámite activo en custodia de este despacho',
      destinationReceivedAt: null,
      isDestinationReceived: false,
      statusLabel: 'En custodia activa (Sin derivar aún)',
      isCustodyOrConcluded: true,
    };
  } else {
    derivation = {
      hasDerivation: false,
      targetPerson: '—',
      targetArea: '—',
      dateFormatted: '—',
      timeFormatted: '—',
      fullDateTime: '—',
      destinationReceivedAt: null,
      isDestinationReceived: false,
      statusLabel: '—',
      isCustodyOrConcluded: false,
    };
  }

  return { reception, derivation };
}

export const CorrespondenceReportExportModal: React.FC<CorrespondenceReportExportModalProps> = ({
  items,
  isOpen,
  onClose,
}) => {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const workflow = useSelector((state: RootState) => state.correspondence.workflow);
  const userNode = useMemo(() => getOrganigramNodeForUser(currentUser, workflow), [currentUser, workflow]);
  const userArea = userNode?.title || (currentUser as any)?.area || '';
  const userFullName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'Funcionario CHLS';
  const canAccess360 = useMemo(() => canUserAccess360(currentUser, userNode), [currentUser, userNode]);

  // REGLA CRUCIAL CHLS: Por defecto el Libro de Registro muestra SOLO las hojas de ruta que pasaron,
  // enviaron o tuvieron alguna acción con el usuario logueado ('MY_ACTIONS').
  const [scopeFilter, setScopeFilter] = useState<'MY_ACTIONS' | 'ALL_INSTITUTION'>('MY_ACTIONS');

  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchFilter, setSearchFilter] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Gestión / Año detectado
  const selectedGestionYear = useMemo(() => {
    if (items.length > 0 && items[0].year) {
      return items[0].year;
    }
    return currentYear;
  }, [items, currentYear]);

  // Presets de Fecha
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

  // Conjunto de datos filtrados
  const filteredData = useMemo(() => {
    return items.filter((item) => {
      // 0. Filtro de Alcance de Usuario (Obligatorio por defecto: Solo trámites que pasaron, enviaron o tuvieron alguna acción con el usuario logueado)
      if (scopeFilter === 'MY_ACTIONS') {
        if (!didUserParticipateInRouteSheet(item, currentUser, userArea)) {
          return false;
        }
      }

      // 1. Filtro de Rango de Fechas
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

      // 2. Filtro de Búsqueda Libre
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim();
        const matchCode = item.hrCode?.toLowerCase().includes(q);
        const matchRef = item.reference?.toLowerCase().includes(q);
        const matchSender = item.senderName?.toLowerCase().includes(q);
        const matchCite = item.cite?.toLowerCase().includes(q);
        const matchArea = item.currentArea?.toLowerCase().includes(q) || item.senderArea?.toLowerCase().includes(q);
        const matchMovements = item.movements?.some(
          (m) =>
            m.sourceArea?.toLowerCase().includes(q) ||
            m.targetArea?.toLowerCase().includes(q) ||
            m.targetPersonName?.toLowerCase().includes(q)
        );

        if (!matchCode && !matchRef && !matchSender && !matchCite && !matchArea && !matchMovements) {
          return false;
        }
      }

      return true;
    });
  }, [items, scopeFilter, currentUser, userArea, startDate, endDate, searchFilter]);

  if (!isOpen) return null;

  // 1. Exportación a Excel (.xlsx) con las 7 Columnas Exactas del Libro Físico
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      toast.error('No hay trámites para exportar en el Libro de Registro');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading('Generando Libro de Registro oficial en Excel...');
    try {
      const rows = filteredData.map((item) => {
        const audit = getUserRouteSheetAudit(item, currentUser, userArea, scopeFilter);

        const remiteFull = item.senderArea
          ? `${item.senderName} (${item.senderArea})`
          : item.senderName;

        let recepcionExcel = '';
        if (audit.reception.isRadication) {
          recepcionExcel = `RADICADO EN DESPACHO [${audit.reception.fullDateTime}]`;
        } else if (audit.reception.isReceived) {
          recepcionExcel = `RECEPCIONADO: ${audit.reception.area} de ${audit.reception.sourceInfo || 'Origen'} [${audit.reception.fullDateTime}]`;
        } else {
          recepcionExcel = `POR RECEPCIONAR: En ${audit.reception.area} [Enviado: ${audit.reception.fullDateTime}]`;
        }

        let derivacionExcel = '';
        if (audit.derivation.hasDerivation) {
          const recText = audit.derivation.isDestinationReceived
            ? `Recepcionado: ${audit.derivation.destinationReceivedAt ? format(new Date(audit.derivation.destinationReceivedAt), 'dd/MM/yyyy HH:mm') : 'Sí'}`
            : 'Por recepcionar en destino';
          derivacionExcel = `${audit.derivation.targetPerson} (${audit.derivation.targetArea}) [Derivado: ${audit.derivation.fullDateTime} | ${recText}]`;
        } else if (audit.derivation.isCustodyOrConcluded) {
          derivacionExcel = `${audit.derivation.statusLabel} [${audit.derivation.fullDateTime}]`;
        } else {
          derivacionExcel = '—';
        }

        return {
          'N° HOJA DE RUTA': item.hrCode,
          'FECHA': formatBookDate(item.createdAt),
          'CITE': item.cite || 'S/N',
          'REMITE': remiteFull,
          'REFERENCIA': item.reference,
          'RECEPCIÓN EN DESPACHO (FECHA Y HORA)': recepcionExcel,
          'DIRIGIDA A: DERIVACIÓN (FECHA Y HORA)': derivacionExcel,
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);

      // Anchos de columna óptimos
      ws['!cols'] = [
        { wch: 18 }, // N° HOJA DE RUTA
        { wch: 15 }, // FECHA
        { wch: 22 }, // CITE
        { wch: 30 }, // REMITE
        { wch: 55 }, // REFERENCIA
        { wch: 45 }, // RECEPCIÓN EN DESPACHO (FECHA Y HORA)
        { wch: 45 }, // DIRIGIDA A: DERIVACIÓN (FECHA Y HORA)
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Registro_${selectedGestionYear}`);

      const authorTag = scopeFilter === 'MY_ACTIONS' ? `Personal_${currentUser?.firstName || 'Usuario'}` : 'Institucional_360';
      const fileName = `Libro_Registro_Correspondencia_${selectedGestionYear}_${authorTag}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success('¡Libro de Registro exportado a Excel exitosamente!', { id: toastId });
    } catch (err: any) {
      toast.error('Error al generar Excel: ' + (err.message || 'Error desconocido'), { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Exportación a PDF (.pdf) en Formato Carta Horizontal Idéntico al Cuaderno Físico
  const handleExportPDF = () => {
    if (filteredData.length === 0) {
      toast.error('No hay trámites para exportar en el Libro de Registro');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading('Generando Libro de Registro en formato físico oficial (PDF)...');
    try {
      // Tamaño Carta Horizontal: 279.4 mm x 215.9 mm
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });

      // Encabezado Centrado Idéntico al Cuaderno de Registro
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // Gris oscuro institucional
      doc.setFont('helvetica', 'bold');
      doc.text('REGISTRO DE CORRESPONDENCIA', 139.7, 13, { align: 'center' });

      doc.setFontSize(11);
      doc.text(`GESTIÓN ${selectedGestionYear}`, 139.7, 19, { align: 'center' });

      // Subtítulo del Despacho y Funcionario
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      const subInfo = scopeFilter === 'MY_ACTIONS'
        ? `Despacho: ${userArea ? userArea.toUpperCase() : 'PERSONAL'}  |  Funcionario: ${userFullName.toUpperCase()}  |  Período: ${startDate} al ${endDate}  |  Registros: ${filteredData.length}`
        : `Auditoría Institucional CHLS 360°  |  Período: ${startDate} al ${endDate}  |  Total Registros: ${filteredData.length}`;
      doc.text(subInfo, 139.7, 24, { align: 'center' });

      // Preparar Filas
      const tableData = filteredData.map((item) => {
        const audit = getUserRouteSheetAudit(item, currentUser, userArea, scopeFilter);

        const remiteLines = [
          item.senderName,
          item.senderArea || (item.senderType === 'SOCIO' ? 'Socio Titular' : 'Externo'),
        ].filter(Boolean).join('\n');

        let recPdf = '';
        if (audit.reception.isRadication) {
          recPdf = `RADICADO EN DESPACHO\n${audit.reception.area}\n[✓ ${audit.reception.fullDateTime}]`;
        } else if (audit.reception.isReceived) {
          recPdf = `RECEPCIONADO\n${audit.reception.area}\nDe: ${audit.reception.sourceInfo || 'Origen'}\n[✓ ${audit.reception.fullDateTime}]`;
        } else {
          recPdf = `POR RECEPCIONAR\n${audit.reception.area}\n[Enviado: ${audit.reception.fullDateTime}]`;
        }

        let derivPdf = '';
        if (audit.derivation.hasDerivation) {
          const recText = audit.derivation.isDestinationReceived
            ? `[✓ Rec: ${audit.derivation.destinationReceivedAt ? format(new Date(audit.derivation.destinationReceivedAt), 'dd/MM/yy HH:mm') : 'Sí'}]`
            : '[⏰ Por recepcionar]';
          derivPdf = `${audit.derivation.targetPerson}\n${audit.derivation.targetArea}\nDerivado: ${audit.derivation.fullDateTime}\n${recText}`;
        } else if (audit.derivation.isCustodyOrConcluded) {
          derivPdf = `${audit.derivation.statusLabel}\n${audit.derivation.fullDateTime}`;
        } else {
          derivPdf = '—';
        }

        return [
          item.hrCode,
          formatBookDate(item.createdAt),
          item.cite || 'S/N',
          remiteLines,
          item.reference,
          recPdf,
          derivPdf,
        ];
      });

      autoTable(doc, {
        startY: 28,
        head: [
          [
            'N°HOJA DE RUTA',
            'Fecha',
            'Cite',
            'Remite',
            'Referencia',
            'Recepción Despacho\n(Fecha y Hora)',
            'Dirigida a: (Derivación)\n(Fecha y Hora Destino)',
          ],
        ],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [248, 250, 252],
          textColor: [15, 23, 42],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
          lineColor: [51, 65, 85],
          lineWidth: 0.3,
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [15, 23, 42],
          lineColor: [100, 116, 139],
          lineWidth: 0.2,
          valign: 'middle',
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255],
        },
        columnStyles: {
          0: { cellWidth: 26, fontStyle: 'bold', textColor: [21, 128, 61], halign: 'center' }, // Color verde idéntico al sello
          1: { cellWidth: 22, halign: 'center', fontSize: 7 },
          2: { cellWidth: 27, fontSize: 7 },
          3: { cellWidth: 38 },
          4: { cellWidth: 68 },
          5: { cellWidth: 45, fontSize: 6.8 },
          6: { cellWidth: 45, fontSize: 6.8 },
        },
        styles: {
          overflow: 'linebreak',
          cellPadding: 2,
        },
        didDrawPage: (data) => {
          doc.setFontSize(7);
          doc.setTextColor(140, 140, 140);
          const pageStr = `Página ${data.pageNumber} de ${(doc as any).internal.getNumberOfPages()}`;
          doc.text(pageStr, 14, 208);
          doc.text('Club Hípico Los Sargentos — Sistema Oficial de Correspondencia & Archivo Digital (SICAD)', 80, 208);
          doc.text(`Emisión: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 235, 208);
        },
      });

      const pdfFileName = `Libro_Registro_Correspondencia_${selectedGestionYear}_${scopeFilter === 'MY_ACTIONS' ? `Personal_${currentUser?.firstName || 'Usuario'}` : 'CHLS_360'}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
      doc.save(pdfFileName);

      toast.success('¡Libro de Registro oficial descargado en PDF exitosamente!', { id: toastId });
    } catch (err: any) {
      toast.error('Error al generar PDF: ' + (err.message || 'Error desconocido'), { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Impresión Fiduciaria Directa (Letter Landscape)
  const handlePrintBook = () => {
    const printElement = document.getElementById('printable-official-ledger');
    if (!printElement) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((node) => node.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>REGISTRO DE CORRESPONDENCIA - GESTIÓN ${selectedGestionYear}</title>
          ${styleTags}
          <style>
            @page {
              size: letter landscape;
              margin: 7mm;
            }
            body {
              background: white !important;
              color: black !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            thead {
              display: table-header-group;
            }
          </style>
        </head>
        <body>
          <div style="padding: 10px;">
            ${printElement.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-emerald-500/30 w-full max-w-[1700px] h-[95vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white">
        
        {/* Modal Top Command Header */}
        <div className="px-6 py-3.5 border-b border-emerald-500/20 bg-slate-950/90 flex items-center justify-between gap-4 shrink-0 flex-wrap">
          <div className="flex items-center gap-3">
            <CrestLogo size="sm" className="w-9 h-9 shrink-0 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Libro Oficial de Registro de Correspondencia
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  GESTIÓN {selectedGestionYear}
                </span>
                {scopeFilter === 'MY_ACTIONS' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Mis Hojas de Ruta ({userArea || 'Mi Despacho'})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-gold/15 text-brand-gold border border-brand-gold/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Auditoría Institucional 360°
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-400/70 font-medium">
                Club Hípico Los Sargentos — Cuaderno Oficial de Actas, Radicación & Derivaciones
              </p>
            </div>
          </div>

          {/* Quick Actions & Close */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Imprimir Físico */}
            <button
              type="button"
              onClick={handlePrintBook}
              disabled={filteredData.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 hover:border-emerald-500/50 shadow-xs transition-all cursor-pointer"
              title="Imprimir formato físico idéntico al cuaderno en Papel Carta Horizontal"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Imprimir Libro Físico</span>
            </button>

            {/* Descargar PDF */}
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExporting || filteredData.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-md shadow-amber-950/40 transition-all cursor-pointer"
              title="Descargar archivo PDF oficial tamaño carta horizontal"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Descargar PDF</span>
            </button>

            {/* Exportar Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting || filteredData.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
              title="Exportar registros a hoja de cálculo Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar Excel</span>
            </button>

            {/* Cerrar */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
              title="Cerrar libro"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters & Control Ribbon */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-emerald-500/20 flex items-center justify-between gap-3 shrink-0 flex-wrap text-xs">
          
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap flex-1">
            {/* Scope Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold text-[11px] hidden sm:inline">Alcance:</span>
              <select
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value as any)}
                disabled={!canAccess360}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold rounded-lg px-2.5 py-1 outline-none cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                <option value="MY_ACTIONS">
                  👤 Mis Hojas de Ruta (Pasaron por mí / Envié / En custodia)
                </option>
                {canAccess360 && (
                  <option value="ALL_INSTITUTION">
                    🌐 Toda la Institución (Supervisión 360°)
                  </option>
                )}
              </select>
            </div>

            {/* Date Presets */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDatePreset('YEAR')}
                className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10.5px] border border-emerald-500/30 hover:bg-emerald-500/30 cursor-pointer"
              >
                Gestión {currentYear}
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('MONTH')}
                className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium text-[10.5px] border border-slate-700 hover:bg-slate-700 cursor-pointer"
              >
                Este Mes
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('TODAY')}
                className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium text-[10.5px] border border-slate-700 hover:bg-slate-700 cursor-pointer"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setDatePreset('ALL')}
                className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium text-[10.5px] border border-slate-700 hover:bg-slate-700 cursor-pointer"
              >
                Todo
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 max-w-[340px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar en el libro (código, remitente, CITE...)"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-slate-800/90 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11.5px] text-slate-300 font-medium">
              Total en el libro: <strong className="text-emerald-400 font-mono font-bold">{filteredData.length}</strong> expedientes
            </span>
          </div>
        </div>

        {/* Notebook Physical Sheet Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950/40">
          
          <div className="max-w-[1550px] mx-auto">
            {/* The Authentic Physical Book Paper Container */}
            <div
              id="printable-official-ledger"
              className="bg-white text-slate-900 border-2 border-slate-400 shadow-2xl rounded-xl p-5 sm:p-8 overflow-x-auto select-text font-sans"
            >
              
              {/* Top Centered Header Matching The Physical Photo */}
              <div className="text-center pb-4 mb-4 border-b border-slate-300">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-wide uppercase">
                  REGISTRO DE CORRESPONDENCIA
                </h1>
                <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-wider uppercase mt-0.5">
                  GESTIÓN {selectedGestionYear}
                </h2>
                <div className="text-[11px] text-slate-600 mt-1 flex items-center justify-center gap-3 flex-wrap">
                  <span><strong>DESPACHO:</strong> {userArea ? userArea.toUpperCase() : 'TODOS LOS DESPACHOS'}</span>
                  <span>•</span>
                  <span><strong>FUNCIONARIO:</strong> {userFullName.toUpperCase()}</span>
                  <span>•</span>
                  <span><strong>PERÍODO:</strong> {startDate} AL {endDate}</span>
                </div>
              </div>

              {/* The Official 7-Column Table from Physical Notebook */}
              <table className="w-full border-collapse border-2 border-slate-900 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-black text-[11px] uppercase tracking-wider">
                    <th className="border-2 border-slate-900 py-2.5 px-3 text-center w-[120px]">
                      N°HOJA DE RUTA
                    </th>
                    <th className="border-2 border-slate-900 py-2.5 px-3 text-center w-[105px]">
                      Fecha
                    </th>
                    <th className="border-2 border-slate-900 py-2.5 px-3 text-center w-[130px]">
                      Cite
                    </th>
                    <th className="border-2 border-slate-900 py-2.5 px-3 text-center w-[180px]">
                      Remite
                    </th>
                    <th className="border-2 border-slate-900 py-2.5 px-3 text-center min-w-[220px]">
                      Referencia
                    </th>
                    <th className="border-2 border-slate-900 py-2.5 px-3 text-center w-[230px]">
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span>RECEPCIONADO EN DESPACHO</span>
                        <span className="text-[9.5px] font-bold text-blue-700 normal-case">(Fecha y Hora de Entrada)</span>
                      </div>
                    </th>
                    <th className="border-2 border-slate-900 py-2.5 px-3 text-center w-[230px]">
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span>DIRIGIDA A:</span>
                        <span className="text-[9.5px] font-bold text-emerald-700 normal-case">(Derivación, Fecha y Hora)</span>
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800 text-slate-900">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border-2 border-slate-900 p-12 text-center text-slate-500">
                        <FolderArchive className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-600" />
                        <p className="font-bold text-sm text-slate-800">
                          {scopeFilter === 'MY_ACTIONS'
                            ? `No existen Hojas de Ruta registradas para el despacho o usuario ${userFullName}.`
                            : 'No se encontraron expedientes con los filtros seleccionados.'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          El libro de registro refleja exclusivamente las hojas de ruta que pasaron, fueron enviadas o radicadas por su cuenta.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item) => {
                      const audit = getUserRouteSheetAudit(item, currentUser, userArea, scopeFilter);

                      return (
                        <tr key={item.id} className="hover:bg-emerald-50/20 transition-colors">
                          
                          {/* 1. N° HOJA DE RUTA (Sello Verde Idéntico al Cuaderno Físico) */}
                          <td className="border-2 border-slate-900 p-3 text-center whitespace-nowrap bg-emerald-50/10">
                            <span className="font-mono font-black text-sm text-emerald-700 tracking-widest block">
                              {item.hrCode}
                            </span>
                          </td>

                          {/* 2. Fecha (Formato Físico ej. 15 SEP 2026) */}
                          <td className="border-2 border-slate-900 p-3 text-center font-mono font-semibold text-slate-800 text-[11px] whitespace-nowrap">
                            {formatBookDate(item.createdAt)}
                          </td>

                          {/* 3. Cite */}
                          <td className="border-2 border-slate-900 p-3 font-mono font-bold text-slate-900 text-[11px] break-words">
                            {item.cite || 'S/N'}
                          </td>

                          {/* 4. Remite (Nombre + Despacho/Socio) */}
                          <td className="border-2 border-slate-900 p-3 text-[11.5px] leading-tight">
                            <div className="font-bold text-slate-950">
                              {item.senderName}
                            </div>
                            <div className="text-[10.5px] text-slate-600 font-medium mt-0.5">
                              {item.senderArea || (item.senderType === 'SOCIO' ? `Socio ${item.person?.alphaCode || item.senderDoc || ''}`.trim() : 'Externo')}
                            </div>
                          </td>

                          {/* 5. Referencia */}
                          <td className="border-2 border-slate-900 p-3 text-slate-900 text-xs leading-relaxed font-normal">
                            {item.reference}
                          </td>

                          {/* 6. RECEPCIONADO EN DESPACHO (FECHA Y HORA) */}
                          <td className="border-2 border-slate-900 p-2.5 text-xs align-top">
                            {audit.reception.isReceived ? (
                              <div className="border border-blue-600/70 bg-blue-50/70 p-2 rounded text-[10px] text-blue-950 font-sans leading-tight shadow-xs select-none space-y-1">
                                <div className="flex items-center justify-between gap-1 border-b border-blue-400/40 pb-0.5">
                                  <span className="font-black uppercase text-[8.5px] text-blue-900 tracking-wider">
                                    {audit.reception.isRadication ? '🏛️ RADICACIÓN' : '📥 RECEPCIONADO'}
                                  </span>
                                  <span className="font-mono font-bold text-blue-800 text-[9px] bg-blue-200/60 px-1 py-0.2 rounded">
                                    {audit.reception.timeFormatted}
                                  </span>
                                </div>
                                <div className="font-bold uppercase text-[10.5px] text-blue-950 truncate" title={audit.reception.responsible}>
                                  {audit.reception.responsible}
                                </div>
                                <div className="text-[9px] uppercase font-semibold text-blue-800 truncate" title={audit.reception.area}>
                                  {audit.reception.area}
                                </div>
                                <div className="text-[8px] font-black uppercase text-blue-900/80 tracking-wider">
                                  CLUB HÍPICO LOS SARGENTOS
                                </div>
                                {!audit.reception.isRadication && audit.reception.sourceInfo && (
                                  <div className="text-[8.5px] text-slate-600 truncate" title={`De: ${audit.reception.sourceInfo}`}>
                                    De: {audit.reception.sourceInfo}
                                  </div>
                                )}
                                <div className="text-[9px] font-mono font-bold text-right text-blue-900 pt-1 border-t border-blue-400/40 flex items-center justify-between">
                                  <span className="text-[8px] text-blue-700 font-sans font-medium">FECHA/HORA:</span>
                                  <span>✓ {audit.reception.fullDateTime}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="border border-dashed border-red-500/70 bg-red-50/70 p-2 rounded text-[10px] text-red-950 font-sans leading-tight space-y-1">
                                <div className="flex items-center justify-between gap-1 border-b border-red-300 pb-0.5">
                                  <span className="font-black uppercase text-[8.5px] text-red-700 tracking-wider flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5 text-red-600" />
                                    <span>POR RECEPCIONAR</span>
                                  </span>
                                  <span className="font-mono font-bold text-red-700 text-[9px]">
                                    {audit.reception.timeFormatted}
                                  </span>
                                </div>
                                <div className="font-bold uppercase text-[10px] text-red-900 truncate">
                                  {audit.reception.area}
                                </div>
                                <div className="text-[8.5px] text-slate-600 truncate">
                                  Enviado por: {audit.reception.sourceInfo}
                                </div>
                                <div className="text-[9px] font-mono font-bold text-red-700 pt-1 border-t border-red-300 text-right">
                                  {audit.reception.fullDateTime}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* 7. DIRIGIDA A: (DERIVACIÓN DE ESTE DESPACHO - FECHA Y HORA) */}
                          <td className="border-2 border-slate-900 p-2.5 text-xs align-top">
                            {audit.derivation.hasDerivation ? (
                              <div className="space-y-1.5">
                                <div className="bg-slate-50 border border-slate-300 p-1.5 rounded text-[10px] text-slate-900 leading-tight">
                                  <div className="flex items-center justify-between gap-1 text-[8.5px] font-bold text-slate-600 border-b border-slate-200 pb-0.5 mb-1">
                                    <span className="uppercase tracking-wider">📤 Derivado a:</span>
                                    <span className="font-mono font-bold text-slate-800">{audit.derivation.timeFormatted}</span>
                                  </div>
                                  <div className="font-bold text-[10.5px] text-slate-950 truncate" title={audit.derivation.targetPerson}>
                                    {audit.derivation.targetPerson}
                                  </div>
                                  <div className="text-[9px] text-slate-600 font-medium truncate" title={audit.derivation.targetArea}>
                                    {audit.derivation.targetArea}
                                  </div>
                                  <div className="text-[8.5px] font-mono text-slate-500 mt-0.5">
                                    Envío: {audit.derivation.fullDateTime}
                                  </div>
                                </div>

                                {audit.derivation.isDestinationReceived ? (
                                  <div className="border border-blue-600/70 bg-blue-50/70 p-1.5 rounded text-[9.5px] text-blue-950 font-sans leading-tight shadow-xs select-none">
                                    <div className="font-bold uppercase tracking-tight text-[10px] text-blue-950 truncate">
                                      {audit.derivation.targetPerson}
                                    </div>
                                    <div className="text-[8.5px] uppercase font-semibold text-blue-800 truncate">
                                      {audit.derivation.targetArea}
                                    </div>
                                    <div className="text-[8px] font-black uppercase text-blue-900 tracking-wider">
                                      CLUB HÍPICO LOS SARGENTOS
                                    </div>
                                    <div className="text-[9px] font-mono font-bold text-right text-blue-900 mt-0.5 border-t border-blue-400/40 pt-0.5 flex items-center justify-between">
                                      <span className="text-[8px] text-blue-700 font-sans font-medium">RECEPCIÓN:</span>
                                      <span>✓ {formatStampDateTime(audit.derivation.destinationReceivedAt)}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="border border-dashed border-red-500/60 bg-red-50/60 p-1.5 rounded text-[9.5px] text-red-900 font-medium leading-tight">
                                    <div className="text-[9px] text-slate-600 truncate">{audit.derivation.targetArea}</div>
                                    <div className="font-bold text-red-600 flex items-center justify-between gap-1 mt-0.5 border-t border-red-200 pt-0.5">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-2.5 h-2.5" />
                                        <span>Por recepcionar en destino</span>
                                      </span>
                                      <span className="text-[8.5px] font-mono font-bold text-red-500">En tránsito</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : audit.derivation.isCustodyOrConcluded ? (
                              <div className="border border-emerald-600/60 bg-emerald-50/70 p-2 rounded text-[10px] text-emerald-950 font-sans leading-tight shadow-xs">
                                <span className="font-black text-emerald-900 block text-[9.5px] uppercase">
                                  📁 En Custodia Activa
                                </span>
                                <span className="text-[9px] text-emerald-800 font-semibold block mt-0.5 truncate">
                                  {userArea || 'Este Despacho'}
                                </span>
                                <span className="text-[8.5px] text-slate-600 block mt-1">
                                  Trámite en proceso de atención interna (Sin derivar aún)
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300 font-mono text-center block text-xs py-4">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Bottom Book Verification Note */}
              <div className="mt-5 pt-3 border-t border-slate-300 flex items-center justify-between text-[10.5px] text-slate-500 font-medium flex-wrap gap-2">
                <span>
                  Libro Oficial de Registro y Radicación • Certificación Metodológica EPN / ISO 14040
                </span>
                <span>
                  Secretaría de Gerencia General — Club Hípico Los Sargentos
                </span>
              </div>

            </div>
          </div>

        </div>

        {/* Modal Bottom Status Bar */}
        <div className="px-6 py-3 border-t border-emerald-500/20 bg-slate-950/90 flex items-center justify-between gap-3 text-xs shrink-0 flex-wrap">
          <div className="text-slate-400 font-medium">
            Formato oficial: <strong>Cuaderno de Actas y Entregas (Papel Carta Horizontal)</strong> con 7 columnas físicas reglamentarias.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
          >
            Cerrar Libro
          </button>
        </div>

      </div>
    </div>
  );
};

export default CorrespondenceReportExportModal;
