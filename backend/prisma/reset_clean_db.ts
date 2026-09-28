import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function cleanAndSeedDatabase() {
  console.log('🧹 [1/4] Vaciando todas las tablas mediante TRUNCATE CASCADE...');

  const tableNames = [
    'corr_chat_messages',
    'corr_documents',
    'corr_movements',
    'corr_route_sheets',
    'pqrs_history',
    'pqrs_tickets',
    'court_reservations',
    'access_logs',
    'guests',
    'vip_passes',
    'beneficiaries',
    'membership_history',
    'membership_plans',
    'vehicles',
    'horses',
    'pets',
    'membership_refund_requests',
    'memberships',
    'persons',
    'users',
  ];

  for (const table of tableNames) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
      console.log(`  ✓ Tabla "${table}" truncada limpiamente.`);
    } catch (e: any) {
      console.log(`  - Info "${table}": ${e.message.split('\n')[0]}`);
    }
  }

  console.log('🔑 [2/4] Sembrando Permisos y Roles Institucionales...');

  const permissionsData = [
    { name: 'read:profile', description: 'Ver perfil propio' },
    { name: 'write:profile', description: 'Editar perfil propio' },
    { name: 'admin:access', description: 'Acceso de administrador de portería' },
    { name: 'staff:access', description: 'Acceso para el personal administrativo interno' },
    { name: 'module:socios', description: 'Acceso al módulo de Gestión de Socios' },
    { name: 'module:rrhh', description: 'Acceso al módulo de Recursos Humanos' },
    { name: 'module:contrataciones', description: 'Acceso al módulo de Contrataciones' },
    { name: 'module:almacenes', description: 'Acceso al módulo de Almacenes' },
    { name: 'module:activos_fijos', description: 'Acceso al módulo de Activos Fijos' },
    { name: 'module:correspondencia', description: 'Acceso al módulo de Correspondencia' },
    { name: 'module:contabilidad', description: 'Acceso al módulo de Contabilidad' },
    { name: 'module:facturacion', description: 'Acceso al módulo de Facturación' },
    { name: 'module:directorio', description: 'Acceso al módulo de Directorio y Gerencia' },
    { name: 'superadmin:access', description: 'Acceso total y gestión de usuarios (Super Admin)' },
  ];

  const permissions: { id: string; name: string }[] = [];
  for (const perm of permissionsData) {
    const createdPerm = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: perm,
    });
    permissions.push(createdPerm);
  }

  const getPerms = (names: string[]) => permissions.filter(p => names.includes(p.name));

  const rolesData = [
    { name: 'SUPER_ADMIN', description: 'Super Administrador Maestro', perms: ['superadmin:access', 'admin:access', 'staff:access', 'module:socios', 'module:rrhh', 'module:contrataciones', 'module:almacenes', 'module:activos_fijos', 'module:correspondencia', 'module:contabilidad', 'module:facturacion', 'module:directorio'] },
    { name: 'ADMIN', description: 'Administrador General', perms: ['admin:access', 'staff:access'] },
    { name: 'STAFF', description: 'Personal Administrativo', perms: ['staff:access'] },
    { name: 'USER', description: 'Socio / Usuario Estándar', perms: ['read:profile'] },
    { name: 'MODULO_SOCIOS', description: 'Gestión de Socios', perms: ['module:socios'] },
    { name: 'MODULO_CORRESPONDENCIA', description: 'Correspondencia', perms: ['module:correspondencia'] },
    { name: 'MODULO_WHATSAPP', description: 'Mensajería WhatsApp', perms: ['staff:access'] },
    { name: 'MODULO_RESERVAS', description: 'Canchas y Deportes', perms: ['staff:access'] },
    { name: 'MODULO_PORTERIA', description: 'Caseta de Guardia y Portería', perms: ['admin:access'] },
  ];

  const roles: Record<string, string> = {};
  for (const roleDef of rolesData) {
    const createdRole = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: {
        description: roleDef.description,
        permissions: { set: getPerms(roleDef.perms).map(p => ({ id: p.id })) },
      },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        permissions: { connect: getPerms(roleDef.perms).map(p => ({ id: p.id })) },
      },
    });
    roles[createdRole.name] = createdRole.id;
  }
  console.log('  ✓ Roles y Permisos sincronizados.');

  console.log('👑 [3/4] Creando Usuario Maestro SuperAdmin Limpio...');

  const adminPasswordHash = await argon2.hash('admin123');

  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@sargentos.com.bo',
      passwordHash: adminPasswordHash,
      firstName: 'Super',
      lastName: 'Admin',
      documentId: '10000001',
      phone: '77700000',
      isActive: true,
      roles: {
        connect: [{ id: roles['SUPER_ADMIN'] }],
      },
    },
  });
  console.log(`  ✓ SuperAdmin registrado: ${superAdmin.email} (Clave: admin123)`);

  console.log('⚙️ [4/4] Inicializando Parámetros y Catálogos de Correspondencia...');

  const defaultCorrSettings = {
    areas: [
      { id: '1', name: 'SECRETARÍA GENERAL', manager: 'María del Pilar Atanacio', position: 'Secretaria de Gerencia General', canReceiveExternal: true },
      { id: '2', name: 'GERENCIA GENERAL', manager: 'Gerente General', position: 'Máxima Autoridad Ejecutiva (MAE)', canReceiveExternal: true },
      { id: '3', name: 'TESORERÍA Y FINANZAS', manager: 'Jefe de Finanzas & Tesorería', position: 'Jefe de Departamento', canReceiveExternal: false },
      { id: '4', name: 'CONTRATACIONES Y ADQUISICIONES', manager: 'Encargado de Compras', position: 'Responsable de Adquisiciones', canReceiveExternal: false },
      { id: '5', name: 'COMISIÓN HÍPICA', manager: 'Capitán de Hípica', position: 'Capitán Ecuestre', canReceiveExternal: false },
      { id: '6', name: 'CAPITANÍA DEPORTES / TENIS', manager: 'Capitán de Deportes', position: 'Capitán de Complejo', canReceiveExternal: false },
      { id: '7', name: 'ASESORÍA LEGAL', manager: 'Asesor Legal Principal', position: 'Asesor Jurídico', canReceiveExternal: false },
      { id: '8', name: 'MANTENIMIENTO Y OBRAS', manager: 'Jefe de Mantenimiento', position: 'Jefe de Infraestructura', canReceiveExternal: false },
      { id: '9', name: 'CASETA DE ENTRADA', manager: 'Jefe de Guardia', position: 'Control de Puerta', canReceiveExternal: true },
    ],
    stamps: [
      'FAVOR SU ATENCIÓN',
      'FAVOR REALIZAR EL PAGO',
      'PARA INFORME TÉCNICO / LEGAL',
      'PARA SU CONOCIMIENTO Y FINES',
      'PARA VISTO BUENO Y FIRMA',
      'OBSERVADO / SOLICITAR SUBSANACIÓN',
      'TRÁMITE CONCLUIDO / ARCHIVAR',
    ],
    routingMode: 'VIA_SECRETARIA_GERENCIA',
    defaultSlaDays: 5,
    socioSubsanacionDays: 10,
    gestiones: {
      '2026': { initialCorrelative: 1 }
    },
    smtp: {
      enabled: false,
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      user: '',
      pass: '',
      fromEmail: 'correspondencia@chls.bo',
      fromName: 'Club Hípico Los Sargentos — Correspondencia',
    },
  };

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(path.join(dataDir, 'correspondence_settings.json'), JSON.stringify(defaultCorrSettings, null, 2), 'utf8');
  console.log('  ✓ Archivo data/correspondence_settings.json inicializado con éxito.');

  console.log('\n🎉 ¡Base de datos completamente limpia y lista para pruebas!');
}

cleanAndSeedDatabase()
  .catch((e) => {
    console.error('❌ Error limpiando BD:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
