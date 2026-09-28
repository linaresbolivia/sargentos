const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settingsPath = path.join(__dirname, '../data/correspondence_settings.json');
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  const workflow = settings.workflow;
  const users = await prisma.user.findMany({
    select: { id: true, email: true, firstName: true, lastName: true }
  });

  console.log('=== MAPEO DE USUARIOS A NODOS DEL ORGANIGRAMA ===\n');
  users.forEach(u => {
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
    
    // Normalizar
    const norm = s => (s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const uName = norm(fullName);
    const uEmail = (u.email || '').toLowerCase().trim();
    const uDept = norm(u.department);

    let matched = workflow.nodes.find(n => (n.email || '').toLowerCase().trim() === uEmail);

    if (!matched) {
      matched = workflow.nodes.find(n => {
        const m = norm(n.manager);
        const t = norm(n.title);
        return (m && (m === uName || m.includes(uName) || uName.includes(m))) ||
               (t && (t === uName || t === uDept || (uDept && t.includes(uDept))));
      });
    }

    console.log(`Usuario: ${fullName} | Email: ${u.email} | Dept: ${u.department || 'Sin Dept'}`);
    console.log(`  ==> NODO: ${matched ? `[${matched.id}] ${matched.title} (Titular: ${matched.manager})` : 'NO MAPEADO'}`);
  });
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
