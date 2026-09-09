import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedScrutinyElections() {
  console.log('🏁 Inicializando Sistema de Cómputo y Escrutinio de Ánfora CHLS...');

  // 1. Limpiar o buscar elección activa
  let election = await prisma.election.findFirst({
    where: { period: '2026-2028' },
  });

  if (!election) {
    election = await prisma.election.create({
      data: {
        title: 'Elecciones Ordinarias de Directorio 2026 - 2028',
        description:
          'Mesa Oficial de Cómputo y Escrutinio en Vivo de papeletas físicas sufragadas en ánfora para la renovación del Directorio del Club Hípico Los Sargentos.',
        period: '2026-2028',
        status: 'EN_CURSO',
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        quorumMinimum: 25,
        maxSelectionsPerBallot: 5, // Por defecto se puede marcar hasta 5 postulantes por boleta
      },
    });
  } else {
    // Asegurar que esté EN_CURSO y con maxSelectionsPerBallot = 5
    election = await prisma.election.update({
      where: { id: election.id },
      data: {
        status: 'EN_CURSO',
        maxSelectionsPerBallot: 5,
      },
    });
  }

  // 2. Limpiar candidatos previos para esta elección e insertar los 10 postulantes oficiales
  await prisma.electionCandidate.deleteMany({
    where: { electionId: election.id },
  });

  const officialCandidates = [
    {
      fullName: 'Karel Adín Rivero Marín',
      position: 'Postulante al Directorio',
      photoUrl: '/elections/karel_rivero.jpg',
      colorHex: '#0b532c',
      orderIndex: 1,
    },
    {
      fullName: 'Álvaro Gustavo Mendoza Zegarra',
      position: 'Postulante al Directorio',
      photoUrl: '/elections/alvaro_mendoza.jpg',
      colorHex: '#0b532c',
      orderIndex: 2,
    },
    {
      fullName: 'Jorge Mauricio Galindo Canedo',
      position: 'Postulante al Directorio',
      photoUrl: '/elections/mauricio_galindo.jpg',
      colorHex: '#0b532c',
      orderIndex: 3,
    },
    {
      fullName: 'Miguel Carlos Chávez Uriona',
      position: 'Postulante al Directorio',
      photoUrl: '/elections/miguel_chavez.jpg',
      colorHex: '#0b532c',
      orderIndex: 4,
    },
    {
      fullName: 'Edwin Marshel Portocarrero Ponce',
      position: 'Postulante al Directorio',
      photoUrl: '/elections/edwin_portocarrero.jpg',
      colorHex: '#0b532c',
      orderIndex: 5,
    },
    {
      fullName: 'Gonzalo Durán Morales',
      position: 'Postulante al Directorio',
      photoUrl: null,
      colorHex: '#0b532c',
      orderIndex: 6,
    },
    {
      fullName: 'Carla Mendoza Baldivieso',
      position: 'Postulante al Directorio',
      photoUrl: null,
      colorHex: '#0b532c',
      orderIndex: 7,
    },
    {
      fullName: 'Alejandro Montaño Zalles',
      position: 'Postulante al Directorio',
      photoUrl: null,
      colorHex: '#0b532c',
      orderIndex: 8,
    },
    {
      fullName: 'Mauricio Torrico Rivera',
      position: 'Postulante al Directorio',
      photoUrl: null,
      colorHex: '#0b532c',
      orderIndex: 9,
    },
    {
      fullName: 'Roberto Vaca Guzmán',
      position: 'Postulante al Directorio',
      photoUrl: null,
      colorHex: '#0b532c',
      orderIndex: 10,
    },
  ];

  for (const cand of officialCandidates) {
    await prisma.electionCandidate.create({
      data: {
        electionId: election.id,
        fullName: cand.fullName,
        position: cand.position,
        photoUrl: cand.photoUrl,
        colorHex: cand.colorHex,
        orderIndex: cand.orderIndex,
        isActive: true,
      },
    });
    console.log(`  ✓ Postulante #${cand.orderIndex} registrado: ${cand.fullName}`);
  }

  console.log(`✅ Elección configurada con ${officialCandidates.length} postulantes (parametrizable hasta 15).`);
}

seedScrutinyElections()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
