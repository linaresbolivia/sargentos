import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  X,
  CheckCircle2,
  Layers,
  Calendar,
  Vote,
  ShieldCheck,
  Award,
  Loader2,
  Info,
  ExternalLink,
  Download,
  Printer,
  UserCheck,
  CreditCard,
  Briefcase,
  FileCheck,
  Users
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { CrestLogo } from '@shared/components/CrestLogo';
import { ElectionStatsDto, ElectionSignatory } from '../types/election.types';
import { CLUB_LOGO_SHIELD_BASE64 } from '../../../assets/clubLogoBase64';

const safeFormat = (dateVal: any, pattern: string, fallback = '-'): string => {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallback;
    return format(d, pattern);
  } catch {
    return fallback;
  }
};

/**
 * Descarga archivos de forma robusta en Chromium (Chrome / Edge / Windows)
 * garantizando que el elemento <a> se agregue al DOM para que el atributo 'download'
 * y la extensión (.pdf / .xlsx) nunca sean ignorados.
 */
const triggerDownload = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;
  a.setAttribute('download', fileName);
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }, 4000);
};

export interface ElectionExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  electionId: string;
  stats: ElectionStatsDto | null;
}

export interface DetailedReportData {
  election: {
    id: string;
    title: string;
    period: string;
    status: string;
    createdAt: string;
    quorumMinimum: number;
    closedAt?: string | null;
    closingActUrl?: string | null;
    signers?: ElectionSignatory[];
  };
  stats: ElectionStatsDto;
  ballots: Array<{
    id: string;
    ballotNumber: number;
    ballotType: 'VALID' | 'BLANK' | 'NULL';
    selectedCandidateIds: string[];
    selectedCandidateNames: string[];
    marksCount: number;
    notes?: string | null;
    registeredBy: string;
    voteHash: string;
    castAt?: string;
    createdAt?: string;
  }>;
  candidates: Array<{
    id: string;
    fullName: string;
    orderIndex: number;
    position: string;
    votesCount: number;
    votesPercentage: number;
    votesPercentageValid: number;
    rank: number;
  }>;
  generatedAt: string;
}

export const ElectionExportModal: React.FC<ElectionExportModalProps> = ({
  isOpen,
  onClose,
  electionId,
  stats,
}) => {
  const [reportData, setReportData] = useState<DetailedReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [includeBallotLedger, setIncludeBallotLedger] = useState(true);

  // 3 Autoridades para el Acta Oficial (Nombre, CI, Cargo)
  const [signers, setSigners] = useState<ElectionSignatory[]>([
    { name: '', ci: '', role: 'Presidente Comité Electoral' },
    { name: '', ci: '', role: 'Secretario Comité Electoral' },
    { name: '', ci: '', role: 'Vocal Comité Electoral' },
  ]);

  useEffect(() => {
    if (isOpen && electionId) {
      loadDetailedReport();
    }
  }, [isOpen, electionId]);

  const loadDetailedReport = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/elections/report?electionId=${electionId}`);
      if (res.data.success && res.data.data) {
        setReportData(res.data.data);
        if (
          res.data.data.election?.signers &&
          Array.isArray(res.data.data.election.signers) &&
          res.data.data.election.signers.length > 0
        ) {
          const loaded = [...res.data.data.election.signers];
          while (loaded.length < 3) {
            loaded.push({
              name: '',
              ci: '',
              role: loaded.length === 1 ? 'Secretario Comité Electoral' : 'Vocal Comité Electoral',
            });
          }
          setSigners(loaded.slice(0, 3));
        }
      }
    } catch (err: any) {
      toast.error('Error al obtener datos detallados para exportación');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSigner = (index: number, field: keyof ElectionSignatory, value: string) => {
    setSigners((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  if (!isOpen) return null;

  const currentStats = reportData?.stats || stats;
  const totalBallots = currentStats?.totalBallots || 0;
  const validBallots = currentStats?.validBallots || 0;
  const blankBallots = currentStats?.blankBallots || 0;
  const nullBallots = currentStats?.nullBallots || 0;
  const totalVotes = currentStats?.totalVotesAccumulated || 0;

  // 1. Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (!reportData) {
      toast.error('Datos del reporte no disponibles aún.');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading('Generando planilla Excel detallada...');

    try {
      const wb = XLSX.utils.book_new();
      const dateStr = format(new Date(), 'yyyyMMdd_HHmm');

      // --- HOJA 1: RESUMEN Y RESULTADOS DE CANDIDATOS ---
      const summaryRows = [
        ['CLUB HÍPICO LOS SARGENTOS - LA PAZ, BOLIVIA'],
        ['COMITÉ ELECTORAL Y TRIBUNAL DE HONOR'],
        ['ACTA OFICIAL DE ESCRUTINIO Y CÓMPUTO GENERAL DE VOTACIONES'],
        [''],
        ['PROCESO ELECTORAL:', reportData.election.title],
        ['GESTIÓN / PERÍODO:', reportData.election.period],
        ['ESTADO DEL PROCESO:', reportData.election.status],
        ['FECHA Y HORA DE EMISIÓN:', format(new Date(), 'dd/MM/yyyy HH:mm:ss')],
        [''],
        ['--- RESUMEN GENERAL DEL ÁNFORA ---'],
        ['TOTAL BOLETAS EN ÁNFORA:', totalBallots, '100%'],
        ['BOLETAS VÁLIDAS:', validBallots, `${currentStats?.validPercentage || 0}%`],
        ['BOLETAS EN BLANCO:', blankBallots, `${currentStats?.blankPercentage || 0}%`],
        ['BOLETAS NULAS:', nullBallots, `${currentStats?.nullPercentage || 0}%`],
        ['TOTAL VOTOS ACUMULADOS:', totalVotes, 'Votos efectivos emitidos'],
        [''],
        ['--- RESULTADOS POR POSTULANTE ---'],
        [
          'POS.',
          'N° PAPELETA',
          'ÓRGANO / CARGO',
          'POSTULANTE',
          'VOTOS OBTENIDOS',
          '% SOBRE ÁNFORA',
          '% SOBRE VÁLIDOS',
          'CONDICIÓN',
        ],
      ];

      // Ordenar candidatos: primero Directorio por ranking, luego Comité y Tribunal
      const sortedCandidates = [...reportData.candidates].sort((a, b) => {
        if (a.position === b.position) return (b.votesCount || 0) - (a.votesCount || 0);
        if (a.position === 'DIRECTORIO') return -1;
        if (b.position === 'DIRECTORIO') return 1;
        return a.orderIndex - b.orderIndex;
      });

      sortedCandidates.forEach((c) => {
        let condicion = 'Postulante';
        if (c.position === 'DIRECTORIO') {
          condicion = c.rank && c.rank <= 9 ? `Directorio Electo (#${c.rank})` : 'Postulante';
        } else if (c.position === 'COMITÉ ELECTORAL') {
          condicion = 'Comité Electoral Electo';
        } else if (c.position === 'TRIBUNAL DE HONOR') {
          condicion = 'Tribunal de Honor Electo';
        }

        summaryRows.push([
          c.rank ? `#${c.rank}` : '-',
          `#${c.orderIndex}`,
          c.position,
          c.fullName,
          c.votesCount || 0,
          `${c.votesPercentage || 0}%`,
          `${c.votesPercentageValid || 0}%`,
          condicion,
        ]);
      });

      // Firmas oficiales de conformidad del Comité Electoral
      summaryRows.push(['']);
      summaryRows.push(['--- FIRMAS DE CONFORMIDAD DEL COMITÉ ELECTORAL ---']);
      summaryRows.push(['CARGO OFICIAL', 'NOMBRE Y APELLIDOS', 'C.I. / DOCUMENTO', 'FIRMA Y CONSTANCIA']);
      signers.forEach((s) => {
        summaryRows.push([
          s.role || 'Autoridad Electoral',
          s.name ? s.name.toUpperCase() : '(Por firmar)',
          s.ci ? `C.I. ${s.ci}` : '-',
          '__________________________________',
        ]);
      });

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      wsSummary['!cols'] = [
        { wch: 8 },  // Pos
        { wch: 14 }, // N° Papeleta
        { wch: 22 }, // Órgano
        { wch: 38 }, // Postulante
        { wch: 18 }, // Votos
        { wch: 18 }, // % Ánfora
        { wch: 18 }, // % Válidos
        { wch: 28 }, // Condición
      ];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen_Electoral');

      // --- HOJA 2: LIBRO DETALLADO DE BOLETAS ESCRUTADAS ---
      if (includeBallotLedger && reportData.ballots.length > 0) {
        const ballotRows = reportData.ballots.map((b) => ({
          'N° BOLETA': b.ballotNumber,
          'TIPO DE VOTO': b.ballotType === 'VALID' ? 'VÁLIDO' : b.ballotType === 'BLANK' ? 'EN BLANCO' : 'NULO',
          'CANT. MARCAS': b.marksCount,
          'POSTULANTES SELECCIONADOS': b.selectedCandidateNames.length > 0 ? b.selectedCandidateNames.join('; ') : '(Sin marcas / Boleta en blanco o nula)',
          'FECHA Y HORA': safeFormat(b.castAt || b.createdAt, 'dd/MM/yyyy HH:mm:ss'),
          'REGISTRADO POR': b.registeredBy || 'MESA_CENTRAL',
          'HASH DE INTEGRIDAD (SHA-256)': b.voteHash,
        }));

        const wsBallots = XLSX.utils.json_to_sheet(ballotRows);
        wsBallots['!cols'] = [
          { wch: 12 }, // N° Boleta
          { wch: 16 }, // Tipo
          { wch: 14 }, // Marcas
          { wch: 75 }, // Postulantes
          { wch: 22 }, // Fecha
          { wch: 18 }, // Registrado por
          { wch: 66 }, // Hash
        ];
        XLSX.utils.book_append_sheet(wb, wsBallots, 'Libro_Boletas_Escrutadas');
      }

      const fileName = `Resultados_Elecciones_CHLS_${dateStr}.xlsx`;
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const excelBlob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
      });
      triggerDownload(excelBlob, fileName);
      toast.success('Planilla Excel descargada con éxito.', { id: toastId });
    } catch (err: any) {
      toast.error('Error al generar Excel: ' + (err.message || 'Error desconocido'), { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // Generador del documento jsPDF
  const generatePdfDoc = (): jsPDF => {
    if (!reportData) {
      throw new Error('Datos del reporte no disponibles aún.');
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const dateStr = format(new Date(), 'dd/MM/yyyy HH:mm');

    // --- CABECERA INSTITUCIONAL OFICIAL ---
    doc.setFillColor(7, 24, 16); // Verde muy oscuro institucional
    doc.rect(0, 0, 215.9, 28, 'F');

    // Línea dorada divisoria
    doc.setFillColor(204, 161, 75); // Brand Gold
    doc.rect(0, 28, 215.9, 1.5, 'F');

    // Escudo Oficial del Club Hípico Los Sargentos
    try {
      doc.addImage(CLUB_LOGO_SHIELD_BASE64, 'PNG', 14, 3.5, 16.7, 21);
    } catch (e) {
      console.warn('No se pudo incrustar el logotipo en el PDF:', e);
    }

    doc.setFontSize(14);
    doc.setTextColor(204, 161, 75);
    doc.setFont('helvetica', 'bold');
    doc.text('CLUB HÍPICO LOS SARGENTOS', 34, 11);

    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.text('COMITÉ ELECTORAL • ACTA OFICIAL DE ESCRUTINIO Y CÓMPUTO DE VOTACIONES', 34, 17);

    doc.setFontSize(7.5);
    doc.setTextColor(167, 243, 208); // Verde claro
    doc.text(
      `Proceso: ${reportData.election.title} | Gestión: ${reportData.election.period} | Emisión: ${dateStr}`,
      34,
      23
    );

    // --- RECUADRO DE ESTADÍSTICAS DEL ÁNFORA ---
    const statsBoxY = 33;
    doc.setFillColor(245, 247, 246);
    doc.roundedRect(14, statsBoxY, 187.9, 20, 2, 2, 'F');
    doc.setDrawColor(204, 161, 75);
    doc.roundedRect(14, statsBoxY, 187.9, 20, 2, 2, 'S');

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('BOLETAS EN ÁNFORA', 20, statsBoxY + 6);
    doc.text('VOTOS VÁLIDOS', 65, statsBoxY + 6);
    doc.text('EN BLANCO', 110, statsBoxY + 6);
    doc.text('VOTOS NULOS', 145, statsBoxY + 6);
    doc.text('VOTOS EMITIDOS', 175, statsBoxY + 6);

    doc.setFontSize(13);
    doc.setTextColor(11, 83, 44); // Verde oscuro
    doc.text(`${totalBallots}`, 20, statsBoxY + 14);

    doc.setTextColor(16, 185, 129); // Esmeralda
    doc.text(`${validBallots} (${currentStats?.validPercentage || 0}%)`, 65, statsBoxY + 14);

    doc.setTextColor(71, 85, 105); // Gris
    doc.text(`${blankBallots} (${currentStats?.blankPercentage || 0}%)`, 110, statsBoxY + 14);

    doc.setTextColor(225, 29, 72); // Rojo
    doc.text(`${nullBallots} (${currentStats?.nullPercentage || 0}%)`, 145, statsBoxY + 14);

    doc.setTextColor(204, 161, 75); // Dorado
    doc.text(`${totalVotes}`, 175, statsBoxY + 14);

    // --- TABLA DE RESULTADOS POR POSTULANTE ---
    const sortedCandidates = [...reportData.candidates].sort((a, b) => {
      if (a.position === b.position) return (b.votesCount || 0) - (a.votesCount || 0);
      if (a.position === 'DIRECTORIO') return -1;
      if (b.position === 'DIRECTORIO') return 1;
      return a.orderIndex - b.orderIndex;
    });

    const tableData = sortedCandidates.map((c) => {
      let condicion = 'Postulante';
      if (c.position === 'DIRECTORIO') {
        condicion = c.rank && c.rank <= 9 ? `ELECTO #${c.rank}` : 'Postulante';
      } else if (c.position === 'COMITÉ ELECTORAL') {
        condicion = 'COMITÉ ELECTO';
      } else if (c.position === 'TRIBUNAL DE HONOR') {
        condicion = 'TRIBUNAL ELECTO';
      }

      return [
        c.rank ? `#${c.rank}` : '-',
        `#${c.orderIndex}`,
        c.position,
        c.fullName,
        String(c.votesCount || 0),
        `${c.votesPercentage || 0}%`,
        `${c.votesPercentageValid || 0}%`,
        condicion,
      ];
    });

    autoTable(doc, {
      startY: statsBoxY + 23,
      head: [
        [
          'Pos.',
          'N° Boleta',
          'Órgano',
          'Postulante',
          'Votos',
          '% Ánfora',
          '% Válidos',
          'Condición',
        ],
      ],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [7, 24, 16],
        textColor: [204, 161, 75],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [30, 41, 59],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { halign: 'center', cellWidth: 16 },
        2: { cellWidth: 32, fontStyle: 'bold' },
        3: { cellWidth: 50, fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
        5: { halign: 'center', cellWidth: 18 },
        6: { halign: 'center', cellWidth: 18 },
        7: { halign: 'center', cellWidth: 26, fontStyle: 'bold' },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    // --- FIRMAS DE CONFORMIDAD DEL COMITÉ ELECTORAL (3 AUTORIDADES CON NOMBRE, CI Y CARGO) ---
    const tableBottomY = (doc as any).lastAutoTable.finalY || 165;

    // Espacio vertical amplio y cómodo para firmas y sellos físicos (30 mm de altura libre)
    let sectionTitleY = tableBottomY + 12;
    let sigLineY = sectionTitleY + 30; // 30 mm libre entre el encabezado y la línea de firma

    // Si la tabla ocupó casi toda la hoja, pasar a una página limpia dedicada
    if (sigLineY + 22 > 260) {
      doc.addPage('letter', 'portrait');
      doc.setFillColor(7, 24, 16);
      doc.rect(0, 0, 215.9, 20, 'F');
      doc.setFillColor(204, 161, 75);
      doc.rect(0, 20, 215.9, 1.2, 'F');

      try {
        doc.addImage(CLUB_LOGO_SHIELD_BASE64, 'PNG', 14, 2.5, 11.9, 15);
      } catch (e) {
        // fallback
      }

      doc.setFontSize(10.5);
      doc.setTextColor(204, 161, 75);
      doc.setFont('helvetica', 'bold');
      doc.text('ACTA OFICIAL DE CONFORMIDAD Y FIRMAS ELECTORALES', 29, 13);
      sectionTitleY = 40;
      sigLineY = 74; // 34 mm libre en hoja nueva
    }

    // Título de la sección de firmas
    doc.setFontSize(8.5);
    doc.setTextColor(11, 83, 44);
    doc.setFont('helvetica', 'bold');
    doc.text('CONFORMIDAD Y HOMOLOGACIÓN DEL COMITÉ ELECTORAL:', 14, sectionTitleY);

    // 3 Columnas amplias y simétricas (56 mm de ancho por línea de firma)
    const positions = [
      { startX: 14, endX: 70, centerX: 42 },
      { startX: 80, endX: 136, centerX: 108 },
      { startX: 146, endX: 202, centerX: 174 },
    ];

    signers.forEach((s, idx) => {
      const pos = positions[idx] || positions[0];
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.4);
      doc.line(pos.startX, sigLineY, pos.endX, sigLineY);

      // Nombre en negrita
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42); // slate-900
      const displayName = s.name ? s.name.toUpperCase() : '(Por firmar)';
      doc.text(displayName, pos.centerX, sigLineY + 5, { align: 'center' });

      // C.I.
      let nextY = sigLineY + 9.5;
      if (s.ci) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105); // slate-600
        doc.text(`C.I. ${s.ci}`, pos.centerX, nextY, { align: 'center' });
        nextY += 4.5;
      }

      // Cargo
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(11, 83, 44); // brand green
      doc.text(s.role || 'Autoridad Electoral', pos.centerX, nextY, { align: 'center' });

      // Institución
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('Club Hípico Los Sargentos', pos.centerX, nextY + 4, { align: 'center' });
    });

    // --- HOJA 2+: LIBRO DETALLADO DE BOLETAS ESCRUTADAS (SI ESTÁ HABILITADO) ---
    if (includeBallotLedger && reportData.ballots.length > 0) {
      doc.addPage('letter', 'portrait');

      // Header Anexo
      doc.setFillColor(7, 24, 16);
      doc.rect(0, 0, 215.9, 20, 'F');
      doc.setFillColor(204, 161, 75);
      doc.rect(0, 20, 215.9, 1, 'F');

      try {
        doc.addImage(CLUB_LOGO_SHIELD_BASE64, 'PNG', 14, 2.5, 11.9, 15);
      } catch (e) {
        // fallback
      }

      doc.setFontSize(10.5);
      doc.setTextColor(204, 161, 75);
      doc.setFont('helvetica', 'bold');
      doc.text('ANEXO: LIBRO OFICIAL DE BOLETAS ESCRUTADAS EN ÁNFORA', 29, 9);

      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Total de Boletas: ${reportData.ballots.length} registros | Cómputo correlativo oficial con trazabilidad criptográfica`,
        29,
        15
      );

      const ballotTableData = reportData.ballots.map((b) => [
        `#${b.ballotNumber}`,
        b.ballotType === 'VALID' ? 'VÁLIDO' : b.ballotType === 'BLANK' ? 'BLANCO' : 'NULO',
        String(b.marksCount),
        b.selectedCandidateNames.length > 0
          ? b.selectedCandidateNames.join(', ')
          : '(Sin marcas)',
        safeFormat(b.castAt || b.createdAt, 'dd/MM/yy HH:mm:ss'),
        b.voteHash && b.voteHash.length >= 64
          ? `${b.voteHash.substring(0, 32)}\n${b.voteHash.substring(32)}`
          : b.voteHash || '-',
      ]);

      autoTable(doc, {
        startY: 25,
        head: [
          [
            'N°',
            'Tipo',
            'Marcas',
            'Postulantes Seleccionados',
            'Fecha y Hora',
            'Hash de Integridad (SHA-256 Oficial)',
          ],
        ],
        body: ballotTableData,
        theme: 'striped',
        headStyles: {
          fillColor: [7, 24, 16],
          textColor: [204, 161, 75],
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 6.5,
          textColor: [30, 41, 59],
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 12 },
          3: { cellWidth: 62 },
          4: { halign: 'center', cellWidth: 25 },
          5: { halign: 'center', cellWidth: 60.9, font: 'courier', fontStyle: 'bold', fontSize: 5.5 },
        },
      });
    }

    // Numeración de páginas
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Acta Oficial CLUB INTELIGENTE • Página ${i} de ${pageCount} • Sistema de Escrutinio Club Hípico Los Sargentos`,
        14,
        273
      );
    }

    return doc;
  };

  // 2. Export to PDF (.pdf) - Descarga directa del archivo
  const handleExportPDF = () => {
    if (!reportData) {
      toast.error('Datos del reporte no disponibles aún.');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading('Generando y descargando Acta en PDF...');

    try {
      const doc = generatePdfDoc();
      const pdfBlob = doc.output('blob');
      const fileDateStr = format(new Date(), 'yyyyMMdd_HHmm');
      const fileName = `Acta_Resultados_Elecciones_CHLS_${fileDateStr}.pdf`;
      triggerDownload(pdfBlob, fileName);
      toast.success('Acta oficial descargada (.pdf).', { id: toastId });
    } catch (err: any) {
      toast.error('Error al generar PDF: ' + (err.message || 'Error desconocido'), { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Previsualizar / Abrir PDF directamente en el navegador (para ver o imprimir de inmediato)
  const handlePreviewPDF = () => {
    if (!reportData) {
      toast.error('Datos del reporte no disponibles aún.');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading('Abriendo Acta Oficial en el navegador...');

    try {
      const doc = generatePdfDoc();
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const newWin = window.open(blobUrl, '_blank');
      if (!newWin) {
        const fileDateStr = format(new Date(), 'yyyyMMdd_HHmm');
        const fileName = `Acta_Resultados_Elecciones_CHLS_${fileDateStr}.pdf`;
        triggerDownload(pdfBlob, fileName);
        toast.success('Ventana bloqueada: descargando .pdf directamente.', { id: toastId });
      } else {
        toast.success('Acta Oficial abierta en nueva pestaña para ver/imprimir.', { id: toastId });
      }
    } catch (err: any) {
      toast.error('Error al previsualizar PDF: ' + (err.message || 'Error desconocido'), { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-[#071a11] via-[#05140d] to-[#020a06] border-2 border-brand-gold/60 rounded-3xl p-5 sm:p-7 max-w-2xl w-full text-white shadow-[0_25px_70px_rgba(0,0,0,0.9)] relative space-y-5">
        
        {/* Header del Modal */}
        <div className="flex items-center justify-between border-b border-brand-gold/30 pb-4">
          <div className="flex items-center gap-3">
            <CrestLogo size="sm" className="w-9 h-11 drop-shadow-md" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-wider uppercase bg-gradient-to-r from-amber-200 via-brand-gold to-yellow-400 bg-clip-text text-transparent font-sans">
                  Exportar Resultados Oficiales
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  PDF / Excel
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-0.5">
                Genera el Acta Oficial de Cómputo y la Planilla Completa de Escrutinio
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen en Vivo del Ánfora */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-black/60 rounded-xl p-3 border border-white/10 flex flex-col items-center text-center">
            <span className="text-[10px] text-gray-400 uppercase font-bold">Total Ánfora</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-brand-gold">{totalBallots}</span>
            <span className="text-[9px] text-gray-400">Boletas Escrutadas</span>
          </div>

          <div className="bg-black/60 rounded-xl p-3 border border-emerald-500/30 flex flex-col items-center text-center">
            <span className="text-[10px] text-emerald-400 uppercase font-bold">Válidos</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">{validBallots}</span>
            <span className="text-[9px] text-emerald-400/80">{currentStats?.validPercentage || 0}% del ánfora</span>
          </div>

          <div className="bg-black/60 rounded-xl p-3 border border-slate-600/30 flex flex-col items-center text-center">
            <span className="text-[10px] text-slate-300 uppercase font-bold">Blancos</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-slate-200">{blankBallots}</span>
            <span className="text-[9px] text-slate-400">{currentStats?.blankPercentage || 0}% del ánfora</span>
          </div>

          <div className="bg-black/60 rounded-xl p-3 border border-rose-500/30 flex flex-col items-center text-center">
            <span className="text-[10px] text-rose-400 uppercase font-bold">Nulos</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-rose-400">{nullBallots}</span>
            <span className="text-[9px] text-rose-400/80">{currentStats?.nullPercentage || 0}% del ánfora</span>
          </div>
        </div>

        {/* Autoridades y Firmantes del Acta (3 Nombres con C.I. y Cargo) */}
        <div className="bg-black/50 rounded-2xl p-3.5 border border-brand-gold/40 shadow-inner space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-gold" />
              <span className="text-xs font-black uppercase tracking-wider text-brand-gold">
                Firmas Oficiales del Acta (3 Autoridades)
              </span>
            </div>
            <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
              Nombre, C.I. y Cargo para PDF y Excel
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {signers.map((signer, idx) => (
              <div
                key={idx}
                className="bg-black/70 rounded-xl p-2.5 border border-white/10 hover:border-brand-gold/40 focus-within:border-brand-gold/60 transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-black text-amber-300 uppercase tracking-wide">
                    {idx === 0 ? '1. Presidente' : idx === 1 ? '2. Secretario' : '3. Vocal / Veedor'}
                  </span>
                  <input
                    type="text"
                    value={signer.role}
                    onChange={(e) => updateSigner(idx, 'role', e.target.value)}
                    placeholder="Cargo oficial"
                    className="text-[9px] font-semibold text-right bg-transparent text-gray-300 border-none focus:outline-none focus:text-white w-28 truncate"
                    title="Cargo que aparecerá en el acta"
                  />
                </div>

                <div className="space-y-1">
                  <div className="relative">
                    <input
                      type="text"
                      value={signer.name}
                      onChange={(e) => updateSigner(idx, 'name', e.target.value)}
                      placeholder="Nombre y Apellidos..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/60"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={signer.ci}
                      onChange={(e) => updateSigner(idx, 'ci', e.target.value)}
                      placeholder="N° C.I. (ej: 4892019 LP)"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-amber-200/90 font-mono placeholder-gray-500 focus:outline-none focus:border-brand-gold/60"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Opciones de Exportación */}
        <div className="bg-black/40 rounded-2xl p-3.5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeBallotLedger}
                onChange={(e) => setIncludeBallotLedger(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 text-emerald-600 focus:ring-emerald-500 bg-black/70 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm font-bold text-white">
                  Incluir Libro de Boletas Escrutadas (Auditoría Voto por Voto)
                </span>
                <span className="text-[11px] text-gray-400">
                  Exporta el listado correlativo con las {reportData?.ballots?.length || totalBallots} boletas físicas, marcas individuales y hash de integridad.
                </span>
              </div>
            </label>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-amber-300/90 bg-amber-950/30 px-3 py-2 rounded-xl border border-amber-500/30">
            <Info className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              Tanto el PDF como el Excel generados incluyen firmas de conformidad oficiales del Comité Electoral y el desglose completo de los 11 postulantes.
            </span>
          </div>
        </div>

        {/* Botones de Descarga y Visualización */}
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tarjeta PDF */}
            <div className="bg-gradient-to-br from-red-950/70 via-[#1f090e] to-black p-3.5 rounded-2xl border border-rose-500/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-rose-400" />
                  <span className="text-xs font-black text-rose-200 uppercase tracking-wider">
                    Acta Oficial de Cómputo
                  </span>
                </div>
                <span className="text-[10px] font-mono text-rose-300/80 bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-500/30">
                  .PDF
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportPDF}
                  disabled={isExporting || isLoading}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-red-800 to-rose-700 hover:from-red-700 hover:to-rose-600 text-white font-bold text-xs uppercase border border-rose-400/50 shadow-lg hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  title="Descargar archivo .pdf a su equipo"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar .PDF</span>
                </button>

                <button
                  onClick={handlePreviewPDF}
                  disabled={isExporting || isLoading}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-rose-100 font-bold text-xs uppercase border border-rose-300/30 shadow hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  title="Abre el PDF en una pestaña nueva para visualizarlo o imprimirlo de inmediato"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir / Ver PDF</span>
                </button>
              </div>
            </div>

            {/* Tarjeta Excel */}
            <div className="bg-gradient-to-br from-emerald-950/70 via-[#071d15] to-black p-3.5 rounded-2xl border border-emerald-500/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-black text-emerald-200 uppercase tracking-wider">
                    Planilla de Auditoría
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-300/80 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  .XLSX
                </span>
              </div>

              <button
                onClick={handleExportExcel}
                disabled={isExporting || isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs uppercase border border-emerald-400/50 shadow-lg hover:scale-[1.02] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar Excel con Fórmulas</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-1">
          <span className="text-[10px] text-gray-500 font-mono">
            CLUB INTELIGENTE • Escrutinio Auditado y Avalado por el Comité Electoral
          </span>
        </div>
      </div>
    </div>
  );
};
