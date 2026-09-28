import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateOfficialElections() {
  console.log('--- ACTUALIZANDO ELECCIONES A PAPELETA OFICIAL 2026 ---');

  let election = await prisma.election.findFirst({
    where: { status: 'EN_CURSO' }
  });

  if (!election) {
    const now = new Date();
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    election = await prisma.election.create({
      data: {
        title: 'Elecciones Directorio 2026',
        period: '2026 - 2028',
        status: 'EN_CURSO',
        startDate: now,
        endDate: end,
        quorumMinimum: 100,
        maxSelectionsPerBallot: 9,
      }
    });
  } else {
    election = await prisma.election.update({
      where: { id: election.id },
      data: {
        title: 'Elecciones Directorio 2026',
        period: '2026 - 2028',
        status: 'EN_CURSO',
        maxSelectionsPerBallot: 9,
      }
    });
  }

  const electionId = election.id;

  // 1. LIMPIAR TODOS LOS REGISTROS DE BOLETAS (URNA A CERO)
  const deletedBallots = await prisma.electionBallot.deleteMany({
    where: { electionId }
  });
  console.log(`✓ Registros de boletas limpiados: ${deletedBallots.count} boletas eliminadas. Urna reiniciada a 0.`);

  // 2. Eliminar candidatos antiguos para reinsertar la lista oficial idéntica a la papeleta
  await prisma.electionCandidate.deleteMany({
    where: { electionId }
  });
  console.log('✓ Candidatos anteriores limpiados.');

  // 3. Insertar los 11 postulantes oficiales
  const officialCandidates = [
    // DIRECTORIO (9 candidatos)
    {
      fullName: 'Karel Adín Rivero Marín',
      position: 'DIRECTORIO',
      orderIndex: 1,
      photoUrl: '/elections/karel_rivero.jpg',
      colorHex: '#0b532c',
    },
    {
      fullName: 'Miguel Carlos Chávez Uriona',
      position: 'DIRECTORIO',
      orderIndex: 2,
      photoUrl: '/elections/miguel_chavez.jpg',
      colorHex: '#0b532c',
    },
    {
      fullName: 'Álvaro Gustavo Mendoza Zegarra',
      position: 'DIRECTORIO',
      orderIndex: 3,
      photoUrl: '/elections/alvaro_mendoza.jpg',
      colorHex: '#0b532c',
    },
    {
      fullName: 'Edwin Marshel Portocarrero Ponce',
      position: 'DIRECTORIO',
      orderIndex: 4,
      photoUrl: '/elections/edwin_portocarrero.jpg',
      colorHex: '#0b532c',
    },
    {
      fullName: 'Jorge Mauricio Galindo Canedo',
      position: 'DIRECTORIO',
      orderIndex: 5,
      photoUrl: '/elections/mauricio_galindo.jpg',
      colorHex: '#0b532c',
    },
    {
      fullName: 'José Ramiro Vega Velasco',
      position: 'DIRECTORIO',
      orderIndex: 6,
      photoUrl: '/elections/ramiro_vega.jpg',
      colorHex: '#0b532c',
    },
    {
      fullName: 'Marco Antonio Salinas Iñiguez',
      position: 'DIRECTORIO',
      orderIndex: 7,
      photoUrl: '/elections/marco_salinas.jpg',
      colorHex: '#0b532c',
    },
    {
      fullName: 'Carlos Alberto Poma Ramos',
      position: 'DIRECTORIO',
      orderIndex: 8,
      photoUrl: '/elections/carlos_poma.jpg',
      colorHex: '#0b532c',
    },
    {
      fullName: 'Emilio Barea Medrano',
      position: 'DIRECTORIO',
      orderIndex: 9,
      photoUrl: '/elections/emilio_barea.jpg',
      colorHex: '#0b532c',
    },
    // COMITÉ ELECTORAL
    {
      fullName: 'Guido Colvert Pérez Aguirre',
      position: 'COMITÉ ELECTORAL',
      orderIndex: 10,
      photoUrl: '/elections/guido_perez.jpg',
      colorHex: '#0a4c28',
    },
    // TRIBUNAL DE HONOR
    {
      fullName: 'Santiago Alberto Goitia Málaga',
      position: 'TRIBUNAL DE HONOR',
      orderIndex: 11,
      photoUrl: '/elections/santiago_goitia.jpg',
      colorHex: '#b8860b',
    },
  ];

  for (const c of officialCandidates) {
    const created = await prisma.electionCandidate.create({
      data: {
        electionId,
        fullName: c.fullName,
        position: c.position,
        orderIndex: c.orderIndex,
        photoUrl: c.photoUrl,
        colorHex: c.colorHex,
        isActive: true,
      }
    });
    console.log(`+ Postulante creado: [${created.orderIndex}] ${created.position} - ${created.fullName}`);
  }

  console.log('--- ACTUALIZACIÓN COMPLETADA CON ÉXITO ---');
}

updateOfficialElections()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
