import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

async function generateManualPdf() {
  console.log('📄 Generando Manual Oficial CHLS en formato PDF...');

  const htmlPath = path.resolve(__dirname, '../../manual_usuario_chls_360.html');
  const outputPdfPath = path.resolve(__dirname, '../../MANUAL_USUARIO_CORRESPONDENCIA_CHLS_360.pdf');
  const artifactPdfPath = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\98b56ddc-8fee-41a1-baa9-bebdb99bcf54\\MANUAL_USUARIO_CORRESPONDENCIA_CHLS_360.pdf';

  if (!fs.existsSync(htmlPath)) {
    throw new Error(`No se encontró el archivo HTML en: ${htmlPath}`);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

  // Generate high quality PDF with print CSS
  await page.pdf({
    path: outputPdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '15mm',
      bottom: '15mm',
      left: '12mm',
      right: '12mm',
    },
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-size: 8px; color: #94a3b8; font-family: sans-serif; width: 100%; text-align: right; padding-right: 15mm;">
        CLUB HÍPICO LOS SARGENTOS • MANUAL OFICIAL CHLS 360°
      </div>
    `,
    footerTemplate: `
      <div style="font-size: 8px; color: #94a3b8; font-family: sans-serif; width: 100%; display: flex; justify-content: space-between; padding: 0 15mm;">
        <span>Sistema de Correspondencia & Hojas de Ruta</span>
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
      </div>
    `,
  });

  await browser.close();

  // Copy to artifacts
  fs.copyFileSync(outputPdfPath, artifactPdfPath);

  const stats = fs.statSync(outputPdfPath);
  console.log(`✅ ¡PDF generado con éxito! (${(stats.size / 1024).toFixed(1)} KB)`);
  console.log(`📍 Guardado en: ${outputPdfPath}`);
  console.log(`📍 Copiado a Artefactos: ${artifactPdfPath}`);
}

generateManualPdf().catch((err) => {
  console.error('❌ Error al generar PDF:', err);
  process.exit(1);
});
