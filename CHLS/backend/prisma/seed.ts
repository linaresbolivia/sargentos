import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la siembra (seeding) de la base de datos de CHLS...');

  // 1. Crear Permisos (Módulos)
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
    console.log(`🔑 Permiso registrado: ${perm.name}`);
  }

  // Helper function para buscar permiso
  const getPerms = (names: string[]) => permissions.filter(p => names.includes(p.name));

  // 2. Crear Roles
  const rolesData = [
    { name: 'SUPER_ADMIN', description: 'Super Administrador Maestro', perms: ['superadmin:access', 'admin:access', 'staff:access', 'module:socios', 'module:rrhh', 'module:contrataciones', 'module:almacenes', 'module:activos_fijos', 'module:correspondencia', 'module:contabilidad', 'module:facturacion', 'module:directorio'] },
    { name: 'ADMIN', description: 'Administrador de Portería', perms: ['admin:access'] },
    { name: 'STAFF', description: 'Personal Administrativo', perms: ['staff:access'] },
    { name: 'USER', description: 'Socio / Usuario Estándar', perms: ['read:profile'] },
    // Roles basados en módulos
    { name: 'MODULO_SOCIOS', description: 'Gestión de Socios', perms: ['module:socios'] },
    { name: 'MODULO_RRHH', description: 'Recursos Humanos', perms: ['module:rrhh'] },
    { name: 'MODULO_CONTRATACIONES', description: 'Contrataciones', perms: ['module:contrataciones'] },
    { name: 'MODULO_ALMACENES', description: 'Almacenes', perms: ['module:almacenes'] },
    { name: 'MODULO_ACTIVOS_FIJOS', description: 'Activos Fijos', perms: ['module:activos_fijos'] },
    { name: 'MODULO_CORRESPONDENCIA', description: 'Correspondencia', perms: ['module:correspondencia'] },
    { name: 'MODULO_CONTABILIDAD', description: 'Contabilidad', perms: ['module:contabilidad'] },
    { name: 'MODULO_FACTURACION', description: 'Facturación', perms: ['module:facturacion'] },
    { name: 'MODULO_DIRECTORIO', description: 'Directorio y Gerencia', perms: ['module:directorio'] },
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
    console.log(`👥 Rol registrado: ${roleDef.name}`);
  }

  // 3. Crear Contraseña Común de Prueba
  const passwordHash = await argon2.hash('password123');
  const adminPasswordHash = await argon2.hash('admin123');

  // 4. Crear Super Administrador de Prueba
  const superAdminUser = await prisma.user.upsert({
    where: { email: 'superadmin@sargentos.com.bo' },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: 'superadmin@sargentos.com.bo',
      passwordHash: adminPasswordHash,
      firstName: 'Administrador',
      lastName: 'Maestro',
      documentId: '0000000',
      roles: { connect: [{ id: roles['SUPER_ADMIN'] }] },
    },
  });
  console.log(`👑 Super Administrador registrado: ${superAdminUser.email}`);

  // 5. Crear Administrador de Portería
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@sargentos.com.bo' },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: 'admin@sargentos.com.bo',
      passwordHash: adminPasswordHash,
      firstName: 'Jefe de',
      lastName: 'Portería',
      documentId: '1111111',
      roles: { connect: [{ id: roles['ADMIN'] }] },
    },
  });
  console.log(`🛡️  Administrador de Portería registrado: ${adminUser.email}`);

  // 5.5 Crear Personal Administrativo
  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@sargentos.com.bo' },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: 'staff@sargentos.com.bo',
      passwordHash: adminPasswordHash,
      firstName: 'Personal',
      lastName: 'Administrativo',
      documentId: '2222222',
      roles: { connect: [{ id: roles['STAFF'] }] },
    },
  });
  console.log(`🏢 Personal Administrativo registrado: ${staffUser.email}`);

  // 6. Crear Socios de Prueba
  const user1 = await prisma.user.upsert({
    where: { email: 'juan.perez@sargentos.com.bo' },
    update: { passwordHash },
    create: {
      email: 'juan.perez@sargentos.com.bo',
      passwordHash,
      firstName: 'Juan',
      lastName: 'Pérez',
      documentId: '3333333',
      roles: { connect: [{ id: roles['USER'] }] },
    },
  });

  await prisma.memberProfile.upsert({
    where: { userId: user1.id },
    update: {
      membershipNumber: '12345',
      category: 'GOLD',
      totalDebt: 0,
    },
    create: {
      userId: user1.id,
      membershipNumber: '12345',
      category: 'GOLD',
      totalDebt: 0,
    },
  });
  console.log('💳 Perfil de Socio registrado: Juan Pérez (No. 12345, Categoría: GOLD, Deuda: $0)');

  const user2 = await prisma.user.upsert({
    where: { email: 'pedro.gomez@sargentos.com.bo' },
    update: { passwordHash },
    create: {
      email: 'pedro.gomez@sargentos.com.bo',
      passwordHash,
      firstName: 'Pedro',
      lastName: 'Gómez',
      documentId: '4444444',
      roles: { connect: [{ id: roles['USER'] }] },
    },
  });

  await prisma.memberProfile.upsert({
    where: { userId: user2.id },
    update: {
      membershipNumber: '67890',
      category: 'SILVER',
      totalDebt: 45000,
    },
    create: {
      userId: user2.id,
      membershipNumber: '67890',
      category: 'SILVER',
      totalDebt: 45000,
    },
  });
  console.log('💳 Perfil de Socio registrado: Pedro Gómez (No. 67890, Categoría: SILVER, Deuda: $45,000)');

  console.log('✅ Base de datos sembrada con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error durante la siembra de la base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
