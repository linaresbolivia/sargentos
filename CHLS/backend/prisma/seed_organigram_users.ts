import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Creando/Actualizando usuarios de todas las áreas del organigrama con contraseña "12"...');

  // Hash universal de contraseña "12"
  const passwordHash = await argon2.hash('12');

  // Asegurar roles básicos
  const rolesData = [
    { name: 'SUPER_ADMIN', description: 'Super Administrador Maestro' },
    { name: 'ADMIN', description: 'Administrador de Portería' },
    { name: 'STAFF', description: 'Personal Administrativo' },
    { name: 'USER', description: 'Socio / Usuario Estándar' },
    { name: 'MODULO_SOCIOS', description: 'Gestión de Socios' },
    { name: 'MODULO_RRHH', description: 'Recursos Humanos' },
    { name: 'MODULO_CONTRATACIONES', description: 'Contrataciones' },
    { name: 'MODULO_ALMACENES', description: 'Almacenes' },
    { name: 'MODULO_ACTIVOS_FIJOS', description: 'Activos Fijos' },
    { name: 'MODULO_CORRESPONDENCIA', description: 'Correspondencia' },
    { name: 'MODULO_CONTABILIDAD', description: 'Contabilidad' },
    { name: 'MODULO_FACTURACION', description: 'Facturación' },
    { name: 'MODULO_DIRECTORIO', description: 'Directorio y Gerencia' },
  ];

  const roleMap: Record<string, string> = {};
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: { name: r.name, description: r.description },
    });
    roleMap[r.name] = role.id;
  }

  // Lista oficial de Usuarios por Área según el Organigrama
  const organigramUsers = [
    // --- ACCESO MAESTRO & SUPERADMIN ---
    {
      username: 'superadmin',
      firstName: 'Administrador',
      lastName: 'Maestro CHLS',
      area: 'SISTEMAS_TI',
      roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'admin',
      firstName: 'Administrador',
      lastName: 'General',
      area: 'SISTEMAS_TI',
      roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'MODULO_CORRESPONDENCIA'],
    },

    // --- DESPACHO SUPERIOR & STAFF ---
    {
      username: 'gerencia',
      firstName: 'Ing. Gerente',
      lastName: 'General',
      area: 'GERENCIA_GENERAL',
      roles: ['SUPER_ADMIN', 'MODULO_DIRECTORIO', 'MODULO_CORRESPONDENCIA', 'STAFF'],
    },
    {
      username: 'secretaria',
      firstName: 'Lic. Secretaria',
      lastName: 'de Gerencia',
      area: 'SECRETARIA_GERENCIA',
      roles: ['STAFF', 'MODULO_CORRESPONDENCIA', 'ADMIN'],
    },
    {
      username: 'mensajeria',
      firstName: 'Mensajero',
      lastName: 'Oficial CHLS',
      area: 'MENSAJERIA',
      roles: ['STAFF', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'legal',
      firstName: 'Dr. Asesor',
      lastName: 'Legal',
      area: 'ASESORIA_LEGAL',
      roles: ['STAFF', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'comercial',
      firstName: 'Lic. Coordinador',
      lastName: 'Comercial',
      area: 'COORDINACION_COMERCIAL',
      roles: ['STAFF', 'MODULO_CORRESPONDENCIA'],
    },

    // --- SUBGERENCIA FINANCIERA & RRHH ---
    {
      username: 'finanzas',
      firstName: 'Lic. Subgerente',
      lastName: 'Financiero y RRHH',
      area: 'SUBGERENCIA_FINANCIERA',
      roles: ['STAFF', 'MODULO_CONTABILIDAD', 'MODULO_FACTURACION', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'contabilidad',
      firstName: 'Lic. Encargado',
      lastName: 'de Contabilidad',
      area: 'CONTABILIDAD',
      roles: ['STAFF', 'MODULO_CONTABILIDAD', 'MODULO_FACTURACION', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'caja',
      firstName: 'Cajero',
      lastName: 'Recaudaciones',
      area: 'RECAUDACIONES_CAJA',
      roles: ['STAFF', 'MODULO_FACTURACION', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'cobranzas',
      firstName: 'Apoyo',
      lastName: 'Cobranzas',
      area: 'RECAUDACIONES_CAJA',
      roles: ['STAFF', 'MODULO_FACTURACION', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'contrataciones',
      firstName: 'Lic. Responsable',
      lastName: 'de Contrataciones',
      area: 'CONTRATACIONES_COMPRAS',
      roles: ['STAFF', 'MODULO_CONTRATACIONES', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'compras',
      firstName: 'Asistente',
      lastName: 'de Contrataciones & Compras',
      area: 'CONTRATACIONES_COMPRAS',
      roles: ['STAFF', 'MODULO_CONTRATACIONES', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'rrhh',
      firstName: 'Encargado',
      lastName: 'de Recursos Humanos',
      area: 'RECURSOS_HUMANOS',
      roles: ['STAFF', 'MODULO_RRHH', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'almacen',
      firstName: 'Encargado',
      lastName: 'de Almacén Central',
      area: 'ALMACEN_SUMINISTROS',
      roles: ['STAFF', 'MODULO_ALMACENES', 'MODULO_ACTIVOS_FIJOS', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'archivo',
      firstName: 'Responsable',
      lastName: 'de Archivo Central',
      area: 'ARCHIVO_CENTRAL',
      roles: ['STAFF', 'MODULO_CORRESPONDENCIA'],
    },

    // --- SUBGERENCIA DE ATENCIÓN AL SOCIO ---
    {
      username: 'atencionsocio',
      firstName: 'Lic. Subgerente',
      lastName: 'de Atención al Socio',
      area: 'SUBGERENCIA_SOCIO',
      roles: ['STAFF', 'MODULO_SOCIOS', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'ats',
      firstName: 'Técnico Especialista',
      lastName: 'Módulo ATS',
      area: 'ATENCION_SOCIO_ATS',
      roles: ['STAFF', 'MODULO_SOCIOS', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'recepcion',
      firstName: 'Recepcionista',
      lastName: 'Central CHLS',
      area: 'RECEPCION_CASETA',
      roles: ['ADMIN', 'STAFF', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'caseta',
      firstName: 'Operador',
      lastName: 'Caseta de Ingreso',
      area: 'RECEPCION_CASETA',
      roles: ['ADMIN', 'STAFF', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'porteria',
      firstName: 'Guardia',
      lastName: 'Portería Principal',
      area: 'RECEPCION_CASETA',
      roles: ['ADMIN', 'STAFF', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'toallas',
      firstName: 'Asistente',
      lastName: 'de Toallas',
      area: 'SERVICIOS_TOALLAS',
      roles: ['STAFF', 'MODULO_CORRESPONDENCIA'],
    },

    // --- TECNOLOGÍA & COMUNICACIÓN ---
    {
      username: 'tecnologia',
      firstName: 'Ing. Encargado',
      lastName: 'de Sistemas & TI',
      area: 'SISTEMAS_TI',
      roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'sistemas',
      firstName: 'Ing. Soporte',
      lastName: 'Sistemas CHLS',
      area: 'SISTEMAS_TI',
      roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'comunicacion',
      firstName: 'Lic. Encargado',
      lastName: 'de Comunicación & Prensa',
      area: 'COMUNICACION_PRENSA',
      roles: ['STAFF', 'MODULO_CORRESPONDENCIA'],
    },

    // --- MANTENIMIENTO & INFRAESTRUCTURA ---
    {
      username: 'mantenimiento',
      firstName: 'Ing. Jefe',
      lastName: 'de Mantenimiento',
      area: 'MANTENIMIENTO_OBRAS',
      roles: ['STAFF', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'piscinas',
      firstName: 'Asistente',
      lastName: 'Piscinero',
      area: 'PISCINA_MANT',
      roles: ['STAFF', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'piscinero',
      firstName: 'Técnico',
      lastName: 'Tratamiento de Aguas',
      area: 'PISCINA_MANT',
      roles: ['STAFF', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'tenis',
      firstName: 'Asistente',
      lastName: 'Canchas de Tenis',
      area: 'TENIS_MANT',
      roles: ['STAFF', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'poligono',
      firstName: 'Asistente',
      lastName: 'Polígono de Tiro',
      area: 'POLIGONO_TIRO',
      roles: ['STAFF', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'tiro',
      firstName: 'Instructor',
      lastName: 'Línea de Tiro',
      area: 'POLIGONO_TIRO',
      roles: ['STAFF', 'MODULO_CORRESPONDENCIA'],
    },

    // --- ÁREA HÍPICA & CABALLERIZAS ---
    {
      username: 'hipica',
      firstName: 'Capitán',
      lastName: 'Encargado Área Hípica',
      area: 'COMISION_HIPICA',
      roles: ['STAFF', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'veterinaria',
      firstName: 'Dr. Médico',
      lastName: 'Veterinario Equino',
      area: 'VETERINARIA',
      roles: ['STAFF', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'pistas',
      firstName: 'Pistero',
      lastName: 'Pistas de Salto',
      area: 'PISTAS_SALTO',
      roles: ['STAFF', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'herreria',
      firstName: 'Herrero',
      lastName: 'Oficial CHLS',
      area: 'HERRERIA',
      roles: ['STAFF', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'caballerizas',
      firstName: 'Caballerizo',
      lastName: 'Principal Boxes',
      area: 'CABALLERIZAS_SERENOS',
      roles: ['STAFF', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'serenos',
      firstName: 'Sereno',
      lastName: 'Vigilancia Nocturna',
      area: 'CABALLERIZAS_SERENOS',
      roles: ['STAFF', 'MODULO_CORRESPONDENCIA'],
    },

    // --- DEPORTES & ACTIVIDADES ACUÁTICAS ---
    {
      username: 'gimnasio',
      firstName: 'Supervisor',
      lastName: 'de Gimnasio',
      area: 'GIMNASIO',
      roles: ['STAFF', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'guardavidas',
      firstName: 'Supervisor',
      lastName: 'Piscina & Guardavidas',
      area: 'PISCINA_ACUATICA',
      roles: ['STAFF', 'MODULO_CORRESPONDENCIA'],
    },
    {
      username: 'piscina',
      firstName: 'Guardavidas',
      lastName: 'Piscina Techada',
      area: 'PISCINA_ACUATICA',
      roles: ['STAFF', 'MODULO_CORRESPONDENCIA'],
    },
  ];

  let count = 0;
  for (const u of organigramUsers) {
    const email = `${u.username}@sargentos.com.bo`;
    const connectRoles = u.roles
      .map((rName) => (roleMap[rName] ? { id: roleMap[rName] } : null))
      .filter((r): r is { id: string } => r !== null);

    await prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        isActive: true,
        roles: { set: connectRoles },
      },
      create: {
        email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        isActive: true,
        documentId: `DOC-${u.username.toUpperCase()}`,
        roles: { connect: connectRoles },
      },
    });

    console.log(`✅ Usuario creado/actualizado: [ ${u.username} ] -> Contraseña: "12" (${u.firstName} ${u.lastName})`);
    count++;
  }

  console.log(`\n🎉 Se crearon/actualizaron exitosamente ${count} usuarios de áreas con contraseña "12".`);
}

main()
  .catch((e) => {
    console.error('❌ Error al sembrar usuarios:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
