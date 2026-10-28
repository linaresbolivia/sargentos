const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

const prisma = new PrismaClient();

async function generateMembersExport() {
  console.log('Iniciando extracción completa de socios desde la base de datos...');

  const memberships = await prisma.membership.findMany({
    include: {
      titular: true,
      type: true,
      vehicles: true,
      beneficiaries: {
        include: { person: true }
      }
    },
    orderBy: [
      { membershipNumber: 'asc' }
    ]
  });

  console.log(`Total de membresías recuperadas: ${memberships.length}`);

  // Preparar filas para la Hoja 1: Padrón Completo
  const allRows = [];
  const debtRows = [];
  
  let totalCarteraBs = 0;
  let sinDeudaCount = 0;
  let unMesCount = 0;
  let dosMasMesesCount = 0;

  memberships.forEach((m, idx) => {
    const t = m.titular || {};
    const debtVal = parseFloat(m.totalDebt ? m.totalDebt.toString() : '0') || 0;
    totalCarteraBs += debtVal;

    let debtBreakdownObj = {};
    if (m.debtBreakdown) {
      try {
        debtBreakdownObj = typeof m.debtBreakdown === 'string' ? JSON.parse(m.debtBreakdown) : m.debtBreakdown;
      } catch (e) {}
    }

    // Regla de acceso
    let accesoGarita = 'HABILITADO';
    if (m.debtMonthsCount >= 2 || (m.debtStatus && (m.debtStatus.includes('2') || m.debtStatus.includes('3') || m.debtStatus.includes('6') || m.debtStatus.includes('MAS')))) {
      accesoGarita = 'BLOQUEADO (2+ MESES)';
      dosMasMesesCount++;
    } else if (m.debtMonthsCount === 1 || (m.debtStatus && m.debtStatus.includes('1'))) {
      accesoGarita = 'ADVERTENCIA (1 MES)';
      unMesCount++;
    } else {
      sinDeudaCount++;
    }

    const vehiculosPlacas = (m.vehicles || []).map(v => v.plate).filter(Boolean).join(', ') || 'Sin registro';
    const admDate = m.admissionDate ? new Date(m.admissionDate).toLocaleDateString('es-BO') : '';
    const fullName = `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Sin Nombre';

    const rowData = {
      'N°': idx + 1,
      'N° Membresía / Acción': m.membershipNumber || 'S/N',
      'C.I. / Documento': t.documentId || 'S/D',
      'Tipo Doc': t.docType || 'CI',
      'Nombres': t.firstName || '',
      'Apellidos': t.lastName || '',
      'Nombre Completo': fullName,
      'Email': t.email || '',
      'Teléfono / Celular': t.mobile || t.phone || '',
      'Tipo Membresía': m.type?.name || m.type?.code || 'TITULAR',
      'Estado Membresía': m.status || 'ACTIVA',
      'Tipo Persona': t.personType || 'SOCIO',
      'Fecha Admisión': admDate,
      'Ciudad': t.city || 'La Paz',
      'Dirección': t.address || '',
      'Profesión': t.profession || '',
      'Empresa': t.company || '',
      'Género': t.gender === 'M' ? 'Masculino' : t.gender === 'F' ? 'Femenino' : t.gender || '',
      'Estado Civil': t.maritalStatus || '',
      'Total Deuda (Bs)': debtVal,
      'Estado Mora': m.debtStatus || (debtVal > 0 ? 'CON DEUDA' : 'SIN DEUDA'),
      'Meses Mora': m.debtMonthsCount || 0,
      'Acceso Garita': accesoGarita,
      'Vehículos (Placas)': vehiculosPlacas,
      'Deuda Oct 2026 (Bs)': debtBreakdownObj.oct26 || 0,
      'Deuda Sep 2026 (Bs)': debtBreakdownObj.sept26 || 0,
      'Deuda Ago 2026 (Bs)': debtBreakdownObj.ago26 || 0,
      'Deuda Jul 2026 (Bs)': debtBreakdownObj.jul26 || 0,
      'Deuda Jun 2026 (Bs)': debtBreakdownObj.jun26 || 0,
      'Deuda May 2026 (Bs)': debtBreakdownObj.may26 || 0,
      'Deuda > 6 Meses (Bs)': debtBreakdownObj.mas6meses || 0
    };

    allRows.push(rowData);

    if (debtVal > 0) {
      debtRows.push({
        'N°': debtRows.length + 1,
        'N° Membresía / Acción': m.membershipNumber || 'S/N',
        'C.I.': t.documentId || 'S/D',
        'Socio': fullName,
        'Email': t.email || '',
        'Teléfono': t.mobile || t.phone || '',
        'Tipo': m.type?.name || 'TITULAR',
        'Total Deuda (Bs)': debtVal,
        'Estado Mora': m.debtStatus || 'CON DEUDA',
        'Meses Mora': m.debtMonthsCount || 0,
        'Acceso Garita': accesoGarita,
        'Oct 2026': debtBreakdownObj.oct26 || 0,
        'Sep 2026': debtBreakdownObj.sept26 || 0,
        'Ago 2026': debtBreakdownObj.ago26 || 0,
        'Jul 2026': debtBreakdownObj.jul26 || 0,
        'Jun 2026': debtBreakdownObj.jun26 || 0,
        'May 2026': debtBreakdownObj.may26 || 0,
        'Más de 6 Meses': debtBreakdownObj.mas6meses || 0
      });
    }
  });

  // Hoja 3: Resumen Estadístico
  const summaryRows = [
    { 'Concepto': 'Club Hípico Los Sargentos - Padrón General de Socios', 'Valor': '' },
    { 'Concepto': 'Fecha de Generación', 'Valor': new Date().toLocaleString('es-BO') },
    { 'Concepto': 'Total Socios Registrados', 'Valor': memberships.length },
    { 'Concepto': 'Socios Al Día (Sin Deuda)', 'Valor': sinDeudaCount },
    { 'Concepto': 'Socios con Advertencia (1 Mes de Mora)', 'Valor': unMesCount },
    { 'Concepto': 'Socios Bloqueados en Garita (2+ Meses de Mora)', 'Valor': dosMasMesesCount },
    { 'Concepto': 'Total Cartera por Cobrar (Bs)', 'Valor': totalCarteraBs.toLocaleString('es-BO', { minimumFractionDigits: 2 }) },
    { 'Concepto': 'Total Socios con Saldo Pendiente', 'Valor': debtRows.length }
  ];

  // Crear Workbook con XLSX
  const wb = XLSX.utils.book_new();

  // Hoja 1: Todos los socios
  const wsAll = XLSX.utils.json_to_sheet(allRows);
  // Auto-ajustar anchos
  const colWidthsAll = [
    { wch: 6 },  // N°
    { wch: 14 }, // Membresia
    { wch: 14 }, // CI
    { wch: 8 },  // Tipo Doc
    { wch: 22 }, // Nombres
    { wch: 26 }, // Apellidos
    { wch: 35 }, // Nombre Completo
    { wch: 30 }, // Email
    { wch: 18 }, // Telefono
    { wch: 18 }, // Tipo Membresia
    { wch: 16 }, // Estado Membresia
    { wch: 14 }, // Tipo Persona
    { wch: 14 }, // Fecha Admision
    { wch: 14 }, // Ciudad
    { wch: 30 }, // Direccion
    { wch: 20 }, // Profesion
    { wch: 22 }, // Empresa
    { wch: 12 }, // Genero
    { wch: 14 }, // Estado Civil
    { wch: 18 }, // Total Deuda
    { wch: 18 }, // Estado Mora
    { wch: 12 }, // Meses Mora
    { wch: 22 }, // Acceso Garita
    { wch: 22 }, // Vehiculos
    { wch: 18 }, // Oct
    { wch: 18 }, // Sep
    { wch: 18 }, // Ago
    { wch: 18 }, // Jul
    { wch: 18 }, // Jun
    { wch: 18 }, // May
    { wch: 20 }  // Mas 6 meses
  ];
  wsAll['!cols'] = colWidthsAll;
  XLSX.utils.book_append_sheet(wb, wsAll, 'Padrón Completo (1600)');

  // Hoja 2: Cartera y Deudas
  const wsDebt = XLSX.utils.json_to_sheet(debtRows);
  const colWidthsDebt = [
    { wch: 6 },
    { wch: 14 },
    { wch: 14 },
    { wch: 35 },
    { wch: 30 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 }
  ];
  wsDebt['!cols'] = colWidthsDebt;
  XLSX.utils.book_append_sheet(wb, wsDebt, 'Socios en Mora');

  // Hoja 3: Resumen
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 45 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Ejecutivo');

  // Guardar archivo en la raíz del proyecto y en public
  const rootFilePath = path.join(__dirname, '..', 'CHLS_PADRON_OFICIAL_SOCIOS.xlsx');
  const backendFilePath = path.join(__dirname, 'CHLS_PADRON_OFICIAL_SOCIOS.xlsx');
  
  XLSX.writeFile(wb, rootFilePath);
  XLSX.writeFile(wb, backendFilePath);

  console.log(`Archivo Excel generado exitosamente en: ${rootFilePath}`);
  console.log(`Archivo Excel de respaldo en: ${backendFilePath}`);

  return {
    totalSocios: memberships.length,
    sinDeudaCount,
    unMesCount,
    dosMasMesesCount,
    totalCarteraBs,
    debtSociosCount: debtRows.length,
    filePath: rootFilePath,
    sampleRows: allRows.slice(0, 30)
  };
}

generateMembersExport()
  .then(res => {
    fs.writeFileSync(
      path.join(__dirname, 'export_result.json'),
      JSON.stringify({ ...res, sampleRows: res.sampleRows }, null, 2)
    );
    console.log('Resultados guardados en export_result.json');
  })
  .catch(console.error)
  .finally(() => prisma.$disconnect());
