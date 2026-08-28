import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Commercial Module data...');

  // Create Sample VIP Passes
  const pass1 = await prisma.vipPass.upsert({
    where: { code: 'VIP-CHLS-7392' },
    update: {},
    create: {
      code: 'VIP-CHLS-7392',
      guestFullName: 'Lic. Marcelo Gutiérrez Arze',
      documentId: '4892011 LP',
      phone: '77219800',
      email: 'mgutierrez@bisa.com.bo',
      hostSellerName: 'Eduardo (Comercial)',
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      maxDays: 3,
      timeStart: '07:00',
      timeEnd: '22:00',
      allowedAreas: 'INGRESO,PISCINA,GIMNASIO,TENIS,HIPICA,RESTAURANTE',
      status: 'ACTIVO',
      usageCount: 1,
      maxUses: 6,
      notes: 'Familia interesada en Escuela de Tenis y Natación para 2 hijos',
    },
  });

  const pass2 = await prisma.vipPass.upsert({
    where: { code: 'VIP-CHLS-8840' },
    update: {},
    create: {
      code: 'VIP-CHLS-8840',
      guestFullName: 'Dr. Alejandro Montesinos',
      documentId: '3341829 LP',
      phone: '71542000',
      email: 'amontesinos@clinica.bo',
      hostSellerName: 'Eduardo (Comercial)',
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      maxDays: 2,
      timeStart: '08:00',
      timeEnd: '20:00',
      allowedAreas: 'INGRESO,HIPICA,RESTAURANTE',
      status: 'ACTIVO',
      usageCount: 0,
      maxUses: 4,
      notes: 'Aficionado ecuestre, consulta disponibilidad de box para caballo',
    },
  });

  // Create Sample CRM Leads
  await prisma.commercialLead.createMany({
    data: [
      {
        fullName: 'Ing. Roberto De La Quintana',
        documentId: '2983012 LP',
        phone: '78832100',
        email: 'rquintana@telecom.bo',
        company: 'Telecel Bolivia S.A.',
        position: 'Vicepresidente de Operaciones',
        categoryInterest: 'FAMILIAR',
        status: 'PROPUESTA_ENVIADA',
        sponsorMember1: 'Gonzalo Durán Morales (Socio Propietario)',
        sponsorMember2: 'Dr. Fernando Campero (Socio Propietario)',
        sellerName: 'Eduardo (Comercial)',
        budgetEstimated: 69600,
        notes: 'Enviada propuesta financiera 60/40 a 60 meses.',
      },
      {
        fullName: 'Lic. Claudia Navajas Baldivieso',
        documentId: '4728190 LP',
        phone: '76290110',
        email: 'cnavajas@banco-mercantil.com',
        company: 'Banco Mercantil Santa Cruz',
        position: 'Gerente Regional Banca Corporativa',
        categoryInterest: 'INDIVIDUAL',
        status: 'VISITA_PROGRAMADA',
        sponsorMember1: 'Arq. Mario Ortiz',
        sellerName: 'Eduardo (Comercial)',
        budgetEstimated: 69600,
        notes: 'Visita agendada para el sábado 11:00 am con Day Pass.',
      },
      {
        fullName: 'Dr. Sergio Valenzuela Pinto',
        documentId: '1893041 LP',
        phone: '70618900',
        company: 'Clínica Los Olivos',
        position: 'Médico Cirujano',
        categoryInterest: 'FAMILIAR',
        status: 'POSTULACION_AVAL',
        sponsorMember1: 'Dr. Alejandro Montesinos',
        sponsorMember2: 'Lic. Gonzalo Durán',
        sellerName: 'Eduardo (Comercial)',
        budgetEstimated: 69600,
        notes: 'Entregadas las 2 cartas de aval de socios garantes para revisión de Directorio.',
      }
    ],
    skipDuplicates: true,
  });

  console.log('Commercial sample data seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
