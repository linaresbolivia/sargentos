const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

let clubLogo = '';
try {
  const logoContent = fs.readFileSync(path.join(__dirname, '../frontend/src/assets/clubLogoBase64.ts'), 'utf8');
  const match = logoContent.match(/export const CLUB_LOGO_SHIELD_BASE64 = '(data:image\/png;base64,[^']+)';/);
  if (match) {
    clubLogo = match[1];
  }
} catch (e) {
  console.log('Logo read error:', e.message);
}

async function generateOnePagePDF() {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Resumen Gerencial - Club Inteligente CHLS 360°</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    
    @page {
      size: letter;
      margin: 8mm 10mm 8mm 10mm;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 7.8pt;
      line-height: 1.35;
    }
    
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    
    .logo-box {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .logo-img {
      height: 44px;
      object-fit: contain;
    }
    
    .title-area h1 {
      font-size: 13pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.3px;
      line-height: 1.1;
    }
    
    .title-area h2 {
      font-size: 8.5pt;
      font-weight: 700;
      color: #b45309;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .badge-vps {
      background: #0f172a;
      color: #d4af37;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 7pt;
      font-weight: 800;
      text-align: right;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 6px;
      margin-bottom: 8px;
    }
    
    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-top: 2.5px solid #0f172a;
      border-radius: 4px;
      padding: 4px 6px;
      text-align: center;
    }
    
    .metric-val {
      font-size: 11pt;
      font-weight: 900;
      color: #0f172a;
      line-height: 1;
    }
    
    .metric-lbl {
      font-size: 6pt;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
      margin-top: 2px;
    }
    
    .section-title {
      font-size: 8.5pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 6px;
      margin-bottom: 4px;
      border-left: 3px solid #d4af37;
      padding-left: 5px;
    }
    
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 6px;
    }
    
    .card-box {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      padding: 6px 8px;
    }
    
    ul.bullet-list {
      list-style: none;
    }
    
    ul.bullet-list li {
      position: relative;
      padding-left: 10px;
      margin-bottom: 3px;
      font-size: 7.2pt;
      color: #334155;
      line-height: 1.35;
    }
    
    ul.bullet-list li::before {
      content: "▪";
      position: absolute;
      left: 0;
      color: #10b981;
      font-size: 8pt;
    }
    
    ul.bullet-list li strong {
      color: #0f172a;
    }
    
    .badge-tag {
      display: inline-block;
      font-size: 6.2pt;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 3px;
      background: #e2e8f0;
      color: #334155;
    }
    
    .badge-tag.green {
      background: #dcfce7;
      color: #15803d;
    }
    
    .badge-tag.gold {
      background: #fef3c7;
      color: #b45309;
    }
    
    .table-mini {
      width: 100%;
      border-collapse: collapse;
      font-size: 6.8pt;
      margin-top: 3px;
    }
    
    .table-mini th {
      background: #0f172a;
      color: #ffffff;
      padding: 3px 5px;
      text-align: left;
      font-size: 6.2pt;
      text-transform: uppercase;
    }
    
    .table-mini td {
      padding: 3px 5px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }
    
    .footer-bar {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 6.5pt;
      color: #64748b;
    }
    
    .signature-row {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      padding: 0 20px;
    }
    
    .sig-box {
      text-align: center;
      width: 170px;
      border-top: 1px solid #94a3b8;
      padding-top: 3px;
      font-size: 6.5pt;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header-bar">
    <div class="logo-box">
      ${clubLogo ? `<img src="${clubLogo}" class="logo-img" alt="Logo CHLS">` : ''}
      <div class="title-area">
        <h1>CLUB HÍPICO LOS SARGENTOS</h1>
        <h2>Resumen Gerencial Ejecutivo • Plataforma "Club Inteligente 360°"</h2>
      </div>
    </div>
    <div class="badge-vps">
      PRODUCCIÓN: HTTPS://SARGENTOS.COM.BO<br>
      <span style="color: #34d399; font-weight: 500;">ESTADO: 100% OPERATIVO EN VPS</span>
    </div>
  </div>

  <!-- KPI METRICS (6 COLUMNS) -->
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-val">1,600</div>
      <div class="metric-lbl">Socios en Padrón</div>
    </div>
    <div class="metric-card">
      <div class="metric-val">1,677</div>
      <div class="metric-lbl">Usuarios & Personal</div>
    </div>
    <div class="metric-card">
      <div class="metric-val">15</div>
      <div class="metric-lbl">Módulos Activos</div>
    </div>
    <div class="metric-card">
      <div class="metric-val">16</div>
      <div class="metric-lbl">Canchas Deportivas</div>
    </div>
    <div class="metric-card">
      <div class="metric-val">54</div>
      <div class="metric-lbl">Docs Cero Papel</div>
    </div>
    <div class="metric-card">
      <div class="metric-val">204</div>
      <div class="metric-lbl">Votos Auditados</div>
    </div>
  </div>

  <!-- BLOQUE 1: PROPUESTA Y ARQUITECTURA -->
  <div class="grid-2">
    <div class="card-box">
      <div class="section-title">1. La Propuesta Estratégica</div>
      <ul class="bullet-list">
        <li><strong>Transformación Institucional:</strong> Unificación de bases de datos dispersas en un único <em>Monolito Modular</em> de alta velocidad y cero burocracia.</li>
        <li><strong>Cero Papel:</strong> Reemplazo total de notas físicas por Hojas de Ruta digitales con proveídos oficiales y Cites correlativos institucionales.</li>
        <li><strong>Blindaje Perimetral:</strong> Validación en tiempo real (< 300 ms) en Casetas con escaneo RFID, QR dinámico anti-fraude y teclado táctil.</li>
        <li><strong>Autogestión del Socio:</strong> Portal digital para carnet QR, semáforo de aforos de piscina/gimnasio, reservas deportivas y estados de cuenta.</li>
      </ul>
    </div>

    <div class="card-box">
      <div class="section-title">2. Arquitectura & Seguridad en VPS</div>
      <ul class="bullet-list">
        <li><strong>Infraestructura:</strong> Alojado en servidor VPS bajo el dominio oficial <code>https://sargentos.com.bo</code> con SSL Let's Encrypt (A+).</li>
        <li><strong>Pila Tecnológica:</strong> React 18 + Vite (Frontend), Node.js 20 LTS gestionado por PM2 (Backend) y PostgreSQL 16 con transacciones ACID.</li>
        <li><strong>Red & Proxy:</strong> Apache 2.4 con mod_ssl y soporte WebSockets (WSS) para telemetría de aforos, chat interno y escrutinio en vivo.</li>
        <li><strong>Criptografía:</strong> Cifrado de claves Argon2id, tokens QR dinámicos con HMAC SHA-256 y firma inmutable de votos electorales.</li>
      </ul>
    </div>
  </div>

  <!-- BLOQUE 2: AVANCES POR MÓDULOS EN PRODUCCIÓN -->
  <div class="section-title">3. Avances Operativos Consolidados (15 Módulos en Producción)</div>
  <table class="table-mini">
    <thead>
      <tr>
        <th style="width: 25%;">Eje Operativo</th>
        <th style="width: 20%;">Ruta en Producción</th>
        <th style="width: 40%;">Capacidades Clave & Avances Reales</th>
        <th style="width: 15%;">Estado</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Padrón Maestro & Familias</strong></td>
        <td><code>/admin/members</code></td>
        <td>1,600 socios activos (Novus/Excel), dependientes (< 25 años), vehículos acreditados y boxes hípicos.</td>
        <td><span class="badge-tag green">100% OPERATIVO</span></td>
      </tr>
      <tr>
        <td><strong>Finanzas, QR & Cartera CDP</strong></td>
        <td><code>/admin/account-statements</code></td>
        <td>División 60% Mantenimiento (Facturado) vs 40% Cuota Participación CDP (Recibo); pasarela QR y conciliación de vouchers.</td>
        <td><span class="badge-tag gold">NUEVO EN LÍNEA</span></td>
      </tr>
      <tr>
        <td><strong>Control Casetas & Portería</strong></td>
        <td><code>/gatehouse</code></td>
        <td>Operación táctil con teclado virtual, lectura RFID/QR, semáforo verde/rojo y detección automática de mora.</td>
        <td><span class="badge-tag green">100% OPERATIVO</span></td>
      </tr>
      <tr>
        <td><strong>Piscina, Gimnasio & Aforos</strong></td>
        <td><code>/access/*</code> | <code>/live-occupancy</code></td>
        <td>Control de casilleros y toallas, telemetría de temperatura (28.5 °C), pH/cloro y semáforo de aforo en vivo para socios.</td>
        <td><span class="badge-tag green">100% OPERATIVO</span></td>
      </tr>
      <tr>
        <td><strong>Gestión de 16 Canchas</strong></td>
        <td><code>/admin/reservations</code> | <code>/member/reservations</code></td>
        <td>Tenis, Pádel, Polifuncional, Frontón, Wally; reserva en línea para socios, cobro a invitados externos y control de no-show.</td>
        <td><span class="badge-tag green">100% OPERATIVO</span></td>
      </tr>
      <tr>
        <td><strong>Correspondencia & Cites</strong></td>
        <td><code>/admin/correspondence</code></td>
        <td>25 Hojas de Ruta, 29 Cites correlativos (GG, MANT, etc.), derivación con sellos rápidos, chat inter-áreas y archivo físico.</td>
        <td><span class="badge-tag green">100% OPERATIVO</span></td>
      </tr>
      <tr>
        <td><strong>WhatsApp 24/7 & Difusión</strong></td>
        <td><code>/admin/whatsapp</code></td>
        <td>Bot automatizado multicanal para consultas de horarios/cuotas y motor de envíos masivos con protección anti-bloqueo.</td>
        <td><span class="badge-tag green">100% OPERATIVO</span></td>
      </tr>
      <tr>
        <td><strong>Suite Electoral & Escrutinio</strong></td>
        <td><code>/elecciones</code></td>
        <td>Padrón depurado al día, escrutinio de 204 boletas en vivo con hash criptográfico, modo pantalla gigante y Acta Notarial.</td>
        <td><span class="badge-tag green">100% OPERATIVO</span></td>
      </tr>
    </tbody>
  </table>

  <!-- BLOQUE 3: DEVOPS, DICTAMEN Y PRÓXIMOS PASOS -->
  <div class="grid-2" style="margin-top: 6px;">
    <div class="card-box">
      <div class="section-title">4. DevOps & Respaldo de Datos</div>
      <ul class="bullet-list">
        <li><strong>Despliegue en 1 Paso (<code>deploy.sh</code>):</strong> Git pull, actualización de librerías, migración no destructiva de PostgreSQL y recarga PM2 en caliente (Zero-Downtime).</li>
        <li><strong>Rutina de Respaldos Dual (<code>create_backup.ps1</code>):</strong> Exportación diaria en formato <code>.sql</code> plano (DDL/DML) y <code>.dump</code> binario comprimido con soporte para <code>pg_restore</code>.</li>
      </ul>
    </div>

    <div class="card-box">
      <div class="section-title">5. Dictamen & Próximos Pasos</div>
      <ul class="bullet-list">
        <li><strong>Dictamen de Calidad:</strong> Sistema <strong>100% certificado</strong>, sin errores de compilación TypeScript y validado con datos reales en el VPS institucional.</li>
        <li><strong>Próximos Pasos:</strong> Campaña institucional de difusión del carnet digital a socios, inducción a guardias de caseta y adopción obligatoria de Hojas de Ruta.</li>
      </ul>
    </div>
  </div>

  <!-- FIRMAS -->
  <div class="signature-row">
    <div class="sig-box">
      <strong>Equipo de Desarrollo & TI</strong><br>
      Ingeniería de Software & Seguridad<br>
      Club Inteligente CHLS
    </div>
    <div class="sig-box">
      <strong>Dirección Ejecutiva & Directorio</strong><br>
      Club Hípico Los Sargentos<br>
      Gestión 2026
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer-bar">
    <span>Documento Oficial Confidencial — Club Hípico Los Sargentos</span>
    <span>Hosting: sargentos.com.bo • Generado: 26 de octubre de 2026</span>
    <span>Hoja Única Ejecutiva</span>
  </div>

</body>
</html>
`;

  console.log('Generando PDF Resumen en 1 hoja con Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const outputPath = path.join(__dirname, '../RESUMEN_EJECUTIVO_CHLS_UNA_HOJA.pdf');

  await page.pdf({
    path: outputPath,
    format: 'Letter',
    printBackground: true,
    margin: {
      top: '6mm',
      bottom: '6mm',
      left: '8mm',
      right: '8mm'
    }
  });

  await browser.close();
  console.log('PDF de 1 hoja generado con éxito en:', outputPath);
}

generateOnePagePDF().catch(console.error);
