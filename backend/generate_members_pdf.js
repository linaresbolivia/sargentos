const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const PDFDocument = require('pdfkit');

const prisma = new PrismaClient();

async function generateMembersPdf() {
  console.log('Generando reporte PDF completo de socios CHLS...');

  const memberships = await prisma.membership.findMany({
    include: {
      titular: true,
      type: true,
      vehicles: true
    },
    orderBy: [
      { membershipNumber: 'asc' }
    ]
  });

  const pdfPath = path.join(__dirname, '..', 'CHLS_PADRON_OFICIAL_SOCIOS.pdf');
  const doc = new PDFDocument({
    size: 'LETTER',
    layout: 'landscape',
    margins: { top: 36, bottom: 36, left: 36, right: 36 },
    bufferPages: true
  });

  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);

  // Totales
  let totalCarteraBs = 0;
  let sinDeudaCount = 0;
  let unMesCount = 0;
  let dosMasMesesCount = 0;

  memberships.forEach(m => {
    const val = parseFloat(m.totalDebt ? m.totalDebt.toString() : '0') || 0;
    totalCarteraBs += val;
    if (m.debtMonthsCount >= 2 || (m.debtStatus && (m.debtStatus.includes('2') || m.debtStatus.includes('3') || m.debtStatus.includes('MAS')))) {
      dosMasMesesCount++;
    } else if (m.debtMonthsCount === 1 || (m.debtStatus && m.debtStatus.includes('1'))) {
      unMesCount++;
    } else {
      sinDeudaCount++;
    }
  });

  // Funciones de dibujo de encabezado
  function printHeader(pageNum) {
    doc.rect(36, 30, doc.page.width - 72, 45).fill('#0f172a');
    doc.fillColor('#fbbf24').fontSize(14).font('Helvetica-Bold')
       .text('CLUB HÍPICO LOS SARGENTOS', 50, 38, { characterSpacing: 1 });
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica')
       .text('PADRÓN GENERAL DE SOCIOS REGISTRADOS Y CARTERA', 50, 54);
    
    doc.fillColor('#94a3b8').fontSize(8)
       .text(`Fecha: ${new Date().toLocaleDateString('es-BO')} | Total: ${memberships.length} socios`, doc.page.width - 240, 38, { align: 'right', width: 190 });
    doc.text(`Cartera Total: Bs. ${totalCarteraBs.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`, doc.page.width - 240, 52, { align: 'right', width: 190 });

    // Table Header
    const yTableHead = 85;
    doc.rect(36, yTableHead, doc.page.width - 72, 18).fill('#1e293b');
    doc.fillColor('#f8fafc').fontSize(7).font('Helvetica-Bold');

    doc.text('N°', 40, yTableHead + 5, { width: 25 });
    doc.text('ACCIÓN', 68, yTableHead + 5, { width: 45 });
    doc.text('C.I.', 115, yTableHead + 5, { width: 55 });
    doc.text('NOMBRE COMPLETO DEL SOCIO', 172, yTableHead + 5, { width: 180 });
    doc.text('EMAIL / CONTACTO', 355, yTableHead + 5, { width: 145 });
    doc.text('TIPO', 502, yTableHead + 5, { width: 55 });
    doc.text('ESTADO', 560, yTableHead + 5, { width: 50 });
    doc.text('DEUDA (Bs)', 612, yTableHead + 5, { width: 60, align: 'right' });
    doc.text('GARITA', 678, yTableHead + 5, { width: 75, align: 'center' });
  }

  printHeader(1);

  let currentY = 105;
  const rowHeight = 15;

  memberships.forEach((m, idx) => {
    if (currentY + rowHeight > doc.page.height - 40) {
      doc.addPage();
      printHeader(doc.bufferedPageRange().count);
      currentY = 105;
    }

    const t = m.titular || {};
    const debtVal = parseFloat(m.totalDebt ? m.totalDebt.toString() : '0') || 0;
    const fullName = `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Sin Nombre';
    const emailOrPhone = t.email || t.mobile || t.phone || '-';

    let garitaLabel = 'HABILITADO';
    let garitaColor = '#15803d'; // green
    if (m.debtMonthsCount >= 2 || (m.debtStatus && (m.debtStatus.includes('2') || m.debtStatus.includes('3') || m.debtStatus.includes('MAS')))) {
      garitaLabel = 'BLOQUEADO';
      garitaColor = '#b91c1c'; // red
    } else if (m.debtMonthsCount === 1 || (m.debtStatus && m.debtStatus.includes('1'))) {
      garitaLabel = 'ADVERTENCIA';
      garitaColor = '#d97706'; // amber
    }

    // Zebra striping
    if (idx % 2 === 0) {
      doc.rect(36, currentY, doc.page.width - 72, rowHeight).fill('#f8fafc');
    }

    doc.fillColor('#334155').fontSize(6.5).font('Helvetica');
    doc.text(String(idx + 1), 40, currentY + 4, { width: 25 });
    doc.font('Helvetica-Bold').text(m.membershipNumber || '-', 68, currentY + 4, { width: 45 });
    doc.font('Helvetica').text(t.documentId || '-', 115, currentY + 4, { width: 55 });
    
    // Truncate long names cleanly
    const safeName = fullName.length > 38 ? fullName.substring(0, 36) + '..' : fullName;
    doc.font('Helvetica-Bold').fillColor('#0f172a').text(safeName, 172, currentY + 4, { width: 180 });
    
    const safeContact = emailOrPhone.length > 32 ? emailOrPhone.substring(0, 30) + '..' : emailOrPhone;
    doc.font('Helvetica').fillColor('#475569').text(safeContact, 355, currentY + 4, { width: 145 });

    doc.text(m.type?.code || 'TIT', 502, currentY + 4, { width: 55 });
    doc.text(m.status || 'ACTIVA', 560, currentY + 4, { width: 50 });

    const debtTxt = debtVal > 0 ? debtVal.toFixed(2) : '0.00';
    doc.fillColor(debtVal > 0 ? '#b91c1c' : '#15803d')
       .text(debtTxt, 612, currentY + 4, { width: 60, align: 'right' });

    doc.fillColor(garitaColor).font('Helvetica-Bold')
       .text(garitaLabel, 678, currentY + 4, { width: 75, align: 'center' });

    currentY += rowHeight;
  });

  // Footer con número de página
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    doc.fillColor('#94a3b8').fontSize(7).font('Helvetica')
       .text(`Club Hípico Los Sargentos - Sistema de Gestión CHLS | Página ${i + 1} de ${totalPages}`, 36, doc.page.height - 25, {
         align: 'center',
         width: doc.page.width - 72
       });
  }

  doc.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      console.log(`PDF generado exitosamente en: ${pdfPath}`);
      resolve(pdfPath);
    });
    writeStream.on('error', reject);
  });
}

generateMembersPdf()
  .then(() => prisma.$disconnect())
  .catch(err => {
    console.error(err);
    prisma.$disconnect();
  });
