import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedElections() {
  console.log('🏁 Iniciando seed para el Módulo de Elecciones de Directorio...');

  // 1. Asegurar tipos de membresía
  const titularType = await prisma.membershipType.upsert({
    where: { code: 'TIT' },
    update: { votingRights: true },
    create: {
      code: 'TIT',
      name: 'SOCIO TITULAR ACTIVO',
      monthlyFee: 450,
      votingRights: true,
      hasCdp: true,
      benefits: 'Acceso total y derecho pleno de sufragio estatutario',
    },
  });

  const familiarType = await prisma.membershipType.upsert({
    where: { code: 'FAM' },
    update: { votingRights: false },
    create: {
      code: 'FAM',
      name: 'FAMILIAR BENEFICIARIO',
      monthlyFee: 150,
      votingRights: false,
      hasCdp: false,
      benefits: 'Acceso a canchas y piscina',
    },
  });

  // 2. Crear socios modelo si no existen
  const samplePersonsData = [
    {
      documentId: '2345678',
      firstName: 'Gonzalo',
      paternalSurname: 'Durán',
      lastName: 'Morales',
      email: 'gonzalo.duran@sargentos.bo',
      phone: '71520101',
      membershipNumber: 'TIT-1042',
      typeId: titularType.id,
      totalDebt: 0,
    },
    {
      documentId: '3456789',
      firstName: 'Carla',
      paternalSurname: 'Mendoza',
      lastName: 'Baldivieso',
      email: 'carla.mendoza@sargentos.bo',
      phone: '72030202',
      membershipNumber: 'TIT-0892',
      typeId: titularType.id,
      totalDebt: 0,
    },
    {
      documentId: '4567890',
      firstName: 'Alejandro',
      paternalSurname: 'Montaño',
      lastName: 'Zalles',
      email: 'alejandro.montano@sargentos.bo',
      phone: '73040303',
      membershipNumber: 'TIT-1088',
      typeId: titularType.id,
      totalDebt: 0,
    },
    {
      documentId: '5678901',
      firstName: 'Mauricio',
      paternalSurname: 'Torrico',
      lastName: 'Rivera',
      email: 'mauricio.torrico@sargentos.bo',
      phone: '74050404',
      membershipNumber: 'TIT-0644',
      typeId: titularType.id,
      totalDebt: 0,
    },
    {
      documentId: '6789012',
      firstName: 'Roberto',
      paternalSurname: 'Vaca',
      lastName: 'Guzmán',
      email: 'roberto.vaca@sargentos.bo',
      phone: '75060505',
      membershipNumber: 'TIT-0511',
      typeId: titularType.id,
      totalDebt: 0,
    },
    {
      documentId: '7890123',
      firstName: 'Rodrigo',
      paternalSurname: 'Salinas',
      lastName: 'Arce',
      email: 'rodrigo.salinas@sargentos.bo',
      phone: '76070606',
      membershipNumber: 'TIT-0831',
      typeId: titularType.id,
      totalDebt: 1450, // Con deuda para probar inhabilitación
    },
    {
      documentId: '8901234',
      firstName: 'Andrea',
      paternalSurname: 'Siles',
      lastName: 'Baldivieso',
      email: 'andrea.siles@sargentos.bo',
      phone: '77080707',
      membershipNumber: 'FAM-0892-B',
      typeId: familiarType.id, // Sin derecho a voto
      totalDebt: 0,
    },
  ];

  for (const item of samplePersonsData) {
    let person = await prisma.person.findUnique({
      where: { documentId: item.documentId },
    });

    if (!person) {
      person = await prisma.person.create({
        data: {
          documentId: item.documentId,
          firstName: item.firstName,
          paternalSurname: item.paternalSurname,
          lastName: item.lastName,
          email: item.email,
          phone: item.phone,
          status: 'ACTIVO',
          titularMemberships: {
            create: {
              membershipNumber: item.membershipNumber,
              typeId: item.typeId,
              status: 'ACTIVA',
              totalDebt: item.totalDebt,
            },
          },
        },
      });
      console.log(`  ✓ Socio registrado: ${person.firstName} ${person.paternalSurname} (CI: ${person.documentId}, ${item.membershipNumber})`);
    }
  }

  // 3. Limpiar elecciones previas de prueba con periodo 2026-2028
  const existing = await prisma.election.findFirst({
    where: { period: '2026-2028' },
  });

  if (existing) {
    console.log(`ℹ️ Actualizando elección existente "${existing.title}"...`);
    await prisma.election.delete({ where: { id: existing.id } });
  }

  const now = new Date();
  const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Iniciada ayer
  const endDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // Concluye en 2 días

  // 4. Crear Elección Principal
  const election = await prisma.election.create({
    data: {
      title: 'Elecciones Ordinarias de Directorio 2026 - 2028',
      description:
        'Convocatoria oficial para la elección democrática del Directorio del Club Hípico Los Sargentos para el periodo bienal 2026 - 2028, conforme a los Estatutos y Reglamento Electoral institucional.',
      period: '2026-2028',
      status: 'EN_CURSO',
      startDate,
      endDate,
      quorumMinimum: 25,
      rulesHtml: `
        <div class="space-y-3 text-sm">
          <p><strong>Art. 1 (Del Sufragio):</strong> El voto es un derecho estatutario exclusivo de los socios titulares activos que se encuentren con sus cuotas sociales devengadas al día al momento de la apertura de mesas.</p>
          <p><strong>Art. 2 (Del Secreto del Voto):</strong> La plataforma digital CLUB INTELIGENTE garantiza el secreto absoluto del voto mediante disociación criptográfica SHA-256 e irreversibilidad de la boleta digital.</p>
          <p><strong>Art. 3 (Certificado Oficial):</strong> Tras emitir su sufragio, el socio recibirá su Certificado Digital de Sufragio con código QR único de verificación notarial.</p>
        </div>
      `,
      slates: {
        create: [
          // FÓRMULA 1
          {
            name: 'Renovación y Tradición Hípica',
            code: 'F1',
            slogan: 'Compromiso con el socio, modernización deportiva y excelencia ecuestre.',
            colorHex: '#10b981', // Verde Esmeralda institucional
            orderIndex: 1,
            candidates: {
              create: [
                {
                  position: 'Presidente',
                  fullName: 'Ing. Gonzalo Durán Morales',
                  membershipNumber: 'TIT-1042',
                  bio: 'Socio titular con 24 años de trayectoria, expresidente del Comité de Saltos y promotor de la remodelación de pistas.',
                  orderIndex: 1,
                },
                {
                  position: 'Vicepresidente',
                  fullName: 'Dra. Carla Mendoza Baldivieso',
                  membershipNumber: 'TIT-0892',
                  bio: 'Socia titular, especialista en derecho corporativo y gestora de alianzas deportivas internacionales.',
                  orderIndex: 2,
                },
                {
                  position: 'Secretario General',
                  fullName: 'Lic. Fernando Ortiz Claure',
                  membershipNumber: 'TIT-1120',
                  bio: 'Economista y docente universitario, impulsor de la gobernanza digital y modernización de estatutos.',
                  orderIndex: 3,
                },
                {
                  position: 'Tesorera',
                  fullName: 'Lic. Marcela Siles Peñaranda',
                  membershipNumber: 'TIT-0765',
                  bio: 'Auditora financiera con amplia experiencia en gestión presupuestaria y optimización de clubes privados.',
                  orderIndex: 4,
                },
                {
                  position: 'Vocal Hípico & Pesebreras',
                  fullName: 'Cap. Roberto Vaca Guzmán',
                  membershipNumber: 'TIT-0511',
                  bio: 'Jinete laureado nacional e internacional, dedicado al bienestar equino y modernización de cuadras.',
                  orderIndex: 5,
                },
                {
                  position: 'Vocal Tenis & Raqueta',
                  fullName: 'Ing. Sergio Albarracín',
                  membershipNumber: 'TIT-1310',
                  bio: 'Capitán de torneos interclubes y promotor de las nuevas canchas techadas de Pádel.',
                  orderIndex: 6,
                },
                {
                  position: 'Vocal Social & Cultura',
                  fullName: 'Arq. Valeria Quiroga',
                  membershipNumber: 'TIT-0940',
                  bio: 'Arquitecta y paisajista, impulsora de eventos familiares y remodelación de áreas verdes.',
                  orderIndex: 7,
                },
              ],
            },
          },

          // FÓRMULA 2
          {
            name: 'Fuerza Sargentos 360°',
            code: 'F2',
            slogan: 'Innovación tecnológica, transparencia financiera y futuro sustentable para nuestras familias.',
            colorHex: '#d97706', // Oro / Ámbar de gala
            orderIndex: 2,
            candidates: {
              create: [
                {
                  position: 'Presidente',
                  fullName: 'Lic. Alejandro Montaño Zalles',
                  membershipNumber: 'TIT-1088',
                  bio: 'Empresario de tecnología y telecomunicaciones, con 18 años de aporte constante al club.',
                  orderIndex: 1,
                },
                {
                  position: 'Vicepresidenta',
                  fullName: 'Ing. Patricia Del Carpio',
                  membershipNumber: 'TIT-1205',
                  bio: 'Ingeniera civil con maestría en gestión de infraestructura deportiva de alto rendimiento.',
                  orderIndex: 2,
                },
                {
                  position: 'Secretario General',
                  fullName: 'Dr. Mauricio Torrico Rivera',
                  membershipNumber: 'TIT-0644',
                  bio: 'Abogado constitucionalista, miembro del Tribunal de Honor y redactor del código de ética del socio.',
                  orderIndex: 3,
                },
                {
                  position: 'Tesorero',
                  fullName: 'Lic. Rodrigo Salinas Arce',
                  membershipNumber: 'TIT-0831',
                  bio: 'Banquero de inversión con experiencia en estructuración de fondos de reserva y auditoría continua.',
                  orderIndex: 4,
                },
                {
                  position: 'Vocal Hípico & Pesebreras',
                  fullName: 'Dr. Javier Monje Hurtado',
                  membershipNumber: 'TIT-0477',
                  bio: 'Médico veterinario equino y juez oficial de adiestramiento de la federación ecuestre.',
                  orderIndex: 5,
                },
                {
                  position: 'Vocal Tenis & Raqueta',
                  fullName: 'Lic. Claudia Beltrán Paz',
                  membershipNumber: 'TIT-1450',
                  bio: 'Extenista profesional, entrenadora y coordinadora del circuito juvenil de ráquetbol.',
                  orderIndex: 6,
                },
                {
                  position: 'Vocal Social & Cultura',
                  fullName: 'Lic. Pamela Barrientos',
                  membershipNumber: 'TIT-1190',
                  bio: 'Gestora cultural, organizadora de las galas anuales y escuelas vacacionales de verano.',
                  orderIndex: 7,
                },
              ],
            },
          },
        ],
      },
      auditLogs: {
        create: [
          {
            action: 'APERTURA_URNAS',
            details:
              'Apertura solemne de urnas electrónicas autorizada por el Comité Electoral. Estado de mesas: EN_CURSO.',
            performedBy: 'Comité Electoral CHLS',
          },
        ],
      },
    },
  });

  console.log(`✅ Elección creada con éxito: "${election.title}" [ID: ${election.id}]`);

  // 5. Poblar Padrón Electoral a partir de las personas existentes en la base de datos
  const persons = await prisma.person.findMany({
    include: {
      titularMemberships: {
        include: { type: true },
      },
    },
  });

  console.log(`📋 Sincronizando padrón electoral con ${persons.length} personas registradas...`);

  let eligibleCount = 0;
  let ineligibleCount = 0;

  for (const p of persons) {
    const primaryMembership = p.titularMemberships[0];
    const fullName = `${p.firstName} ${p.paternalSurname || p.lastName || ''}`.trim();

    let isEligible = true;
    let ineligibilityReason: string | null = null;

    if (!primaryMembership) {
      isEligible = false;
      ineligibilityReason = 'No es titular de ninguna membresía.';
    } else if (!primaryMembership.type?.votingRights) {
      isEligible = false;
      ineligibilityReason = `La categoría de membresía (${primaryMembership.type?.name || 'Beneficiario'}) no cuenta con derecho a voto estatutario.`;
    } else if (Number(primaryMembership.totalDebt || 0) > 0 && !p.allowsMoraGrace) {
      isEligible = false;
      ineligibilityReason = `Membresía con cuotas pendientes (Deuda: Bs. ${Number(primaryMembership.totalDebt).toFixed(2)}).`;
    } else if (primaryMembership.status !== 'ACTIVA') {
      isEligible = false;
      ineligibilityReason = `Membresía en estado ${primaryMembership.status}.`;
    }

    await prisma.electionVoter.create({
      data: {
        electionId: election.id,
        personId: p.id,
        membershipNumber: primaryMembership?.membershipNumber || 'S/N',
        documentId: p.documentId,
        fullName,
        isEligible,
        ineligibilityReason,
        hasVoted: false,
      },
    });

    if (isEligible) eligibleCount++;
    else ineligibleCount++;
  }

  console.log(
    `🗳️ Padrón Electoral conformado: ${eligibleCount} socios habilitados, ${ineligibleCount} socios inhabilitados por cuotas/categoría.`
  );
}

seedElections()
  .catch((e) => {
    console.error('❌ Error en seed de elecciones:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
