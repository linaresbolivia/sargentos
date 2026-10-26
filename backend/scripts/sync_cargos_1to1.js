const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncCargos() {
  console.log('--- SINCRONIZACIÓN DE CARGOS 1:1 ORGANIGRAMA CHLS ---');

  // 1. Desactivar cuentas de prueba / placeholders iniciales obsoletos para evitar colisión de cargo
  const obsoleteDummyEmails = [
    'caja@sargentos.com.bo',
    'cobranzas@sargentos.com.bo',
    'rrhh@sargentos.com.bo',
    'secretaria@sargentos.com.bo',
    'legal@sargentos.com.bo',
    'comercial@sargentos.com.bo'
  ];

  await prisma.user.updateMany({
    where: { email: { in: obsoleteDummyEmails } },
    data: { isActive: false }
  });
  console.log(`Desactivadas ${obsoleteDummyEmails.length} cuentas placeholder obsoletas.`);

  // 2. Cargar settings
  const settingsPath = path.join(__dirname, '../data/correspondence_settings.json');
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  const nodes = settings.workflow?.nodes || [];

  // Mapeo unívoco 1:1 de funcionarios reales a su respectivo cargo
  const officialStaffMappings = [
    { email: 'gerencia@sargentos.com.bo', nodeId: 'node-gerencia-general' },
    { email: 'secretaria@chls.bo', nodeId: 'node-secretaria' },
    { email: 'mensajeria@sargentos.com.bo', nodeId: 'node-mensajero' },
    { email: 'legal@chls.bo', nodeId: 'node-asesoria-legal' },
    { email: 'comercial@chls.bo', nodeId: 'node-coordinador-comercial' },
    { email: 'finanzas@chls.bo', nodeId: 'node-subgerencia-financiera' },
    { email: 'archivo@chls.bo', nodeId: 'node-archivo' },
    { email: 'almacen@chls.bo', nodeId: 'node-almacen' },
    { email: 'rrhh@chls.bo', nodeId: 'node-rrhh' },
    { email: 'contrataciones@chls.bo', nodeId: 'node-contrataciones' },
    { email: 'compras@sargentos.com.bo', nodeId: 'node-asistente-contrataciones' },
    { email: 'contabilidad@sargentos.com.bo', nodeId: 'node-contabilidad' },
    { email: 'recaudaciones@chls.bo', nodeId: 'node-recaudaciones' },
    { email: 'caja@chls.bo', nodeId: 'node-cajero' },
    { email: 'apoyocobranzas@sargentos.com.bo', nodeId: 'node-apoyo-cobranzas' },
    { email: 'atencionsocio@chls.bo', nodeId: 'node-subgerencia-socio' },
    { email: 'asistente.ats@chls.bo', nodeId: 'node-asistente-ats' },
    { email: 'recepcionnoemi@sargentos.com.bo', nodeId: 'node-recepcionistas' },
    { email: 'sistemas@chls.bo', nodeId: 'node-encargado-sistemas' },
    { email: 'comunicacion@chls.bo', nodeId: 'node-comunicacion' },
    { email: 'mantenimiento@chls.bo', nodeId: 'node-jefe-mantenimiento' },
    { email: 'recepcion2@sargentos.com.bo', nodeId: 'node-piscinero' }
  ];

  let assignedCount = 0;
  for (const m of officialStaffMappings) {
    const user = await prisma.user.findUnique({
      where: { email: m.email }
    });

    if (user) {
      const node = nodes.find(n => n.id === m.nodeId);
      if (node) {
        node.userId = user.id;
        node.manager = `${user.firstName || ''} ${user.lastName || ''}`.trim() || node.manager;
        node.email = user.email;
        if (user.phone) node.phone = user.phone;
        assignedCount++;
        console.log(`[1:1 ASIGNADO] Nodo: ${node.title} ==> Usuario: ${node.manager} (${user.email})`);
      }
    }
  }

  // Guardar archivo actualizado
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  console.log(`\n¡Sincronización completada! ${assignedCount} cargos vinculados con exclusividad 1:1.`);
  process.exit(0);
}

syncCargos().catch(err => {
  console.error('Error durante la sincronización:', err);
  process.exit(1);
});
