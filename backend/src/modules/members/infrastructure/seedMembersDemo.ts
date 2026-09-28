import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedMembersDemo() {
  console.log('--- Iniciando Seed del Módulo de Gestión de Socios CHLS ---');

  // 1. Ensure Membership Types
  const categories = [
    { code: 'FAM', name: 'Socio Familiar', monthlyFee: 880, hasCdp: true, votingRights: true },
    { code: 'IND', name: 'Socio Individual', monthlyFee: 880, hasCdp: true, votingRights: true },
    { code: 'HON', name: 'Socio Honorario', monthlyFee: 0, hasCdp: true, votingRights: true },
    { code: 'PRE', name: 'Pre-Asociado', monthlyFee: 880, hasCdp: false, votingRights: false },
    { code: 'JMA', name: 'Socio Junior Mayor', monthlyFee: 880, hasCdp: true, votingRights: true },
    { code: 'TRN', name: 'Transitorio Nacional', monthlyFee: 880, hasCdp: false, votingRights: false },
    { code: 'TRE', name: 'Transitorio Extranjero / Diplomático', monthlyFee: 880, hasCdp: false, votingRights: false },
    { code: 'DEP', name: 'Socio Deportivo', monthlyFee: 400, hasCdp: false, votingRights: false },
    { code: 'MEN', name: 'Menor de Edad (Histórico)', monthlyFee: 103, hasCdp: false, votingRights: false },
    { code: 'INS', name: 'Socio Institucional', monthlyFee: 880, hasCdp: true, votingRights: true }
  ];

  const typeMap = new Map<string, any>();
  for (const cat of categories) {
    const t = await prisma.membershipType.upsert({
      where: { code: cat.code },
      update: cat,
      create: cat
    });
    typeMap.set(cat.code, t);
  }

  // 2. Socio 1: Gonzalo Durán Morales (Socio Familiar con Plan 60 cuotas, Box hípico, Dependientes)
  const p1 = await prisma.person.upsert({
    where: { documentId: '3489201' },
    update: {},
    create: {
      documentId: '3489201',
      docType: 'CI',
      docExtension: 'LP',
      firstName: 'Gonzalo',
      secondName: 'Mauricio',
      paternalSurname: 'Duran',
      maternalSurname: 'Morales',
      lastName: 'Duran Morales',
      alphaCode: 'DUR-MOR-G-M',
      birthDate: new Date('1978-05-14'),
      gender: 'M',
      maritalStatus: 'CASADO',
      nationality: 'BOLIVIANA',
      profession: 'Ingeniero Civil',
      occupation: 'Gerente General Consorcio',
      address: 'Av. Las Palmas #450, Calacoto',
      city: 'LP',
      phone: '2794500',
      mobile: '77219800',
      email: 'gduran@consorcio.bo',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
      status: 'ACTIVO',
      personType: 'SOCIO',
      depositVoucherNumber: 'DEP-BNB-883910',
      depositVoucherDate: new Date('2022-03-10'),
      depositVoucherAmount: 15000,
      fiscalNit: '3489201019',
      fiscalCompanyName: 'Duran Morales Gonzalo',
      creditLimit: 50000,
      allowsDirectDebit: true
    }
  });

  const m1 = await prisma.membership.upsert({
    where: { membershipNumber: 'FAM-1042' },
    update: {},
    create: {
      membershipNumber: 'FAM-1042',
      typeId: typeMap.get('FAM').id,
      titularId: p1.id,
      status: 'ACTIVA',
      admissionDate: new Date('2022-03-10'),
      folioNumber: 'FOL-0982',
      purchaseValue: 69600,
      currentValue: 69600,
      acquisitionMethod: 'COMPRA_DIRECTA'
    }
  });

  // Esposa & Hijo de Gonzalo
  const p1_esposa = await prisma.person.upsert({
    where: { documentId: '4509122' },
    update: {},
    create: {
      documentId: '4509122',
      docType: 'CI',
      docExtension: 'LP',
      firstName: 'Mariana',
      paternalSurname: 'Flores',
      maternalSurname: 'Vargas',
      marriedSurname: 'de Duran',
      lastName: 'Flores de Duran',
      alphaCode: 'FLO-VAR-M-X',
      birthDate: new Date('1982-11-20'),
      gender: 'F',
      maritalStatus: 'CASADO',
      photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300',
      status: 'ACTIVO',
      personType: 'SOCIO'
    }
  });

  await prisma.beneficiary.upsert({
    where: { membershipId_personId: { membershipId: m1.id, personId: p1_esposa.id } },
    update: {},
    create: {
      membershipId: m1.id,
      personId: p1_esposa.id,
      relationship: 'CONYUGE',
      birthDate: new Date('1982-11-20'),
      isUnder25: true,
      photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300',
      status: 'ACTIVO'
    }
  });

  const p1_hijo = await prisma.person.upsert({
    where: { documentId: '7829104' },
    update: {},
    create: {
      documentId: '7829104',
      docType: 'CI',
      docExtension: 'LP',
      firstName: 'Mateo',
      paternalSurname: 'Duran',
      maternalSurname: 'Flores',
      lastName: 'Duran Flores',
      alphaCode: 'DUR-FLO-M-X',
      birthDate: new Date('2008-04-10'), // 18 años
      gender: 'M',
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300',
      status: 'ACTIVO',
      personType: 'SOCIO'
    }
  });

  await prisma.beneficiary.upsert({
    where: { membershipId_personId: { membershipId: m1.id, personId: p1_hijo.id } },
    update: {},
    create: {
      membershipId: m1.id,
      personId: p1_hijo.id,
      relationship: 'HIJO',
      birthDate: new Date('2008-04-10'),
      isUnder25: true,
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300',
      status: 'ACTIVO'
    }
  });

  // Caballo de Gonzalo
  await prisma.horse.create({
    data: {
      membershipId: m1.id,
      name: 'Sultán del Viento',
      assignedBox: 'Box H-12',
      feedingDiet: 'Alfalfa premium y sales minerales 3v/día',
      veterinarian: 'Dr. Fernando Cossío'
    }
  });

  // Vehículo
  await prisma.vehicle.create({
    data: {
      membershipId: m1.id,
      type: 'Auto',
      plate: '4829-KPL',
      brand: 'Toyota',
      model: 'Land Cruiser Prado',
      color: 'Gris Grafito'
    }
  });

  // Plan CDP de Gonzalo (60 cuotas, 42 pagadas, saldo pendiente)
  const plan1 = await prisma.membershipPlan.upsert({
    where: { transactionNumber: 'AME-2022-0042' },
    update: {},
    create: {
      membershipId: m1.id,
      titularId: p1.id,
      transactionNumber: 'AME-2022-0042',
      acquisitionType: 'COMPRA_DIRECTA',
      status: 'APROBADO',
      sellerName: 'Eduardo (Ventas)',
      auditedBy: 'Mónica (Recaudaciones)',
      auditDate: new Date('2022-03-12'),
      totalAmount: 69600,
      incomeFeeAmount: 41760, // 60%
      cdpAmount: 27840,       // 40%
      downPayment: 15000,
      financedAmount: 54600,
      monthsTerm: 60,
      monthlyInterestRate: 0,
      fixedMonthlyInstallment: 910,
      paymentMethodType: 'CREDITO',
      startDate: new Date('2022-03-10'),
      firstDueDate: new Date('2022-04-01'),
      folioNumber: 'FOL-0982'
    }
  });

  // Generar cuotas para Gonzalo (cuotas 1 a 40 pagadas, 41-43 pendientes)
  for (let i = 1; i <= 60; i++) {
    const due = new Date(2022, 3 + (i - 1), 1);
    const isPaid = i <= 40;
    await prisma.membershipInstallment.create({
      data: {
        planId: plan1.id,
        installmentNumber: i,
        dueDate: due,
        incomeFeePart: 546,
        cdpPart: 364,
        capitalAmount: 910,
        totalInstallment: 910,
        amountPaid: isPaid ? 910 : 0,
        balanceRemaining: isPaid ? 0 : 910,
        status: isPaid ? 'PAGADO' : 'PENDIENTE',
        paidAt: isPaid ? due : null,
        receiptNumber: isPaid ? `REC-${2022 + Math.floor(i/12)}-${i.toString().padStart(4, '0')}` : null,
        invoiceNumber: isPaid ? `FACT-${2022 + Math.floor(i/12)}-${i.toString().padStart(4, '0')}` : null
      }
    });
  }

  // Cuota Social del mes actual
  await prisma.socialFeeAccrual.create({
    data: {
      personId: p1.id,
      membershipId: m1.id,
      periodMonth: 8,
      periodYear: 2026,
      periodLabel: 'Agosto 2026',
      feeType: 'PRESENTE',
      baseAmount: 880,
      paidAmount: 880,
      residualBalance: 0,
      dueDate: new Date('2026-08-01'),
      status: 'PAGADO',
      invoiceNumber: 'FACT-2026-8910'
    }
  });

  // Box hípico del mes actual
  await prisma.extraordinaryCharge.create({
    data: {
      personId: p1.id,
      serviceCategory: 'BOX_HIPICO',
      serviceName: 'Mantenimiento Box Caballo Sultán',
      periodMonth: 8,
      periodYear: 2026,
      amount: 195,
      paidAmount: 195,
      residualBalance: 0,
      dueDate: new Date('2026-08-01'),
      status: 'PAGADO',
      invoiceNumber: 'FACT-2026-8911'
    }
  });

  // Nota veterinaria clínica pendiente
  const vetCharge = await prisma.extraordinaryCharge.create({
    data: {
      personId: p1.id,
      serviceCategory: 'VETERINARIA',
      serviceName: 'Tratamiento Cólico y Desparasitación',
      clinicalNoteNumber: 'NOT-VET-2026-084',
      periodMonth: 8,
      periodYear: 2026,
      amount: 480,
      paidAmount: 0,
      residualBalance: 480,
      dueDate: new Date('2026-08-25'),
      status: 'PENDIENTE',
      notes: 'Requiere verificación clínica por el socio antes de cobrar en caja'
    }
  });

  await prisma.veterinaryNoteDetail.createMany({
    data: [
      { chargeId: vetCharge.id, horseName: 'Sultán del Viento', boxNumber: 'H-12', itemDescription: 'Suero Electrolítico 5 Litros', quantity: 2, unitPrice: 120, subtotal: 240 },
      { chargeId: vetCharge.id, horseName: 'Sultán del Viento', boxNumber: 'H-12', itemDescription: 'Analgésico Antiespasmódico Equino', quantity: 1, unitPrice: 140, subtotal: 140 },
      { chargeId: vetCharge.id, horseName: 'Sultán del Viento', boxNumber: 'H-12', itemDescription: 'Honorario Profesional Guardia Veterinaria', quantity: 1, unitPrice: 100, subtotal: 100 }
    ]
  });

  // 3. Socio 2: Walter Zeballos (Candidato a Socio Honorario - 64 años, 22 años de socio, 0 deuda)
  const p2 = await prisma.person.upsert({
    where: { documentId: '1984021' },
    update: {},
    create: {
      documentId: '1984021',
      docType: 'CI',
      docExtension: 'LP',
      firstName: 'Walter',
      secondName: 'Ramiro',
      paternalSurname: 'Zeballos',
      maternalSurname: 'Camacho',
      lastName: 'Zeballos Camacho',
      alphaCode: 'ZEB-CAM-W-R',
      birthDate: new Date('1961-02-18'), // 65 años
      gender: 'M',
      maritalStatus: 'CASADO',
      nationality: 'BOLIVIANA',
      profession: 'Médico Cirujano',
      address: 'Calle 21 de Calacoto #120',
      city: 'LP',
      phone: '2774011',
      email: 'drzeballos@clinica.bo',
      photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300',
      status: 'ACTIVO',
      personType: 'SOCIO',
      depositVoucherNumber: 'DEP-MER-0012',
      depositVoucherDate: new Date('2002-05-15'), // 24 años de antigüedad
      depositVoucherAmount: 40000,
      fiscalNit: '1984021015',
      fiscalCompanyName: 'Zeballos Camacho Walter'
    }
  });

  await prisma.membership.upsert({
    where: { membershipNumber: 'FAM-0410' },
    update: {},
    create: {
      membershipNumber: 'FAM-0410',
      typeId: typeMap.get('FAM').id,
      titularId: p2.id,
      status: 'ACTIVA',
      admissionDate: new Date('2002-05-15'),
      folioNumber: 'FOL-0312',
      purchaseValue: 40000,
      currentValue: 69600,
      acquisitionMethod: 'COMPRA_DIRECTA'
    }
  });

  // 4. Socio 3: Familia Quiroga (Hijo que cumplió 25 años - Alerta de bloqueo y pase a Pre-Asociado)
  const p3 = await prisma.person.upsert({
    where: { documentId: '2987110' },
    update: {},
    create: {
      documentId: '2987110',
      docType: 'CI',
      docExtension: 'CB',
      firstName: 'Alvaro',
      paternalSurname: 'Quiroga',
      maternalSurname: 'Perez',
      lastName: 'Quiroga Perez',
      alphaCode: 'QUI-PER-A-X',
      birthDate: new Date('1972-09-10'),
      gender: 'M',
      maritalStatus: 'CASADO',
      profession: 'Arquitecto',
      city: 'LP',
      photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300',
      status: 'ACTIVO',
      personType: 'SOCIO',
      depositVoucherNumber: 'DEP-BNB-44102',
      depositVoucherDate: new Date('2015-08-20'),
      depositVoucherAmount: 50000
    }
  });

  const m3 = await prisma.membership.upsert({
    where: { membershipNumber: 'FAM-0889' },
    update: {},
    create: {
      membershipNumber: 'FAM-0889',
      typeId: typeMap.get('FAM').id,
      titularId: p3.id,
      status: 'ACTIVA',
      admissionDate: new Date('2015-08-20'),
      folioNumber: 'FOL-0711'
    }
  });

  const p3_hijo25 = await prisma.person.upsert({
    where: { documentId: '6892011' },
    update: {},
    create: {
      documentId: '6892011',
      docType: 'CI',
      docExtension: 'LP',
      firstName: 'Sebastian',
      paternalSurname: 'Quiroga',
      maternalSurname: 'Maldonado',
      lastName: 'Quiroga Maldonado',
      alphaCode: 'QUI-MAL-S-X',
      birthDate: new Date('2001-07-15'), // Cumplió 25 años!
      gender: 'M',
      photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300',
      status: 'BLOQUEADO_EDAD',
      personType: 'SOCIO'
    }
  });

  await prisma.beneficiary.upsert({
    where: { membershipId_personId: { membershipId: m3.id, personId: p3_hijo25.id } },
    update: {},
    create: {
      membershipId: m3.id,
      personId: p3_hijo25.id,
      relationship: 'HIJO',
      birthDate: new Date('2001-07-15'),
      isUnder25: false,
      photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300',
      status: 'BLOQUEADO_EDAD'
    }
  });

  // 5. Socio 4: Carlos Mendoza (Socio con mora acumulada y arrastre de 80 Bs por pagar 800 Bs)
  const p4 = await prisma.person.upsert({
    where: { documentId: '3819022' },
    update: {},
    create: {
      documentId: '3819022',
      docType: 'CI',
      docExtension: 'LP',
      firstName: 'Carlos',
      secondName: 'Eduardo',
      paternalSurname: 'Mendoza',
      maternalSurname: 'Alvarez',
      lastName: 'Mendoza Alvarez',
      alphaCode: 'MEN-ALV-C-E',
      birthDate: new Date('1984-06-25'),
      gender: 'M',
      maritalStatus: 'SOLTERO',
      profession: 'Consultor Financiero',
      photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300',
      status: 'ACTIVO',
      personType: 'SOCIO',
      depositVoucherNumber: 'DEP-BIS-7821',
      depositVoucherDate: new Date('2020-01-15'),
      depositVoucherAmount: 20000
    }
  });

  const m4 = await prisma.membership.upsert({
    where: { membershipNumber: 'IND-0520' },
    update: {},
    create: {
      membershipNumber: 'IND-0520',
      typeId: typeMap.get('IND').id,
      titularId: p4.id,
      status: 'ACTIVA',
      admissionDate: new Date('2020-01-15'),
      folioNumber: 'FOL-0419'
    }
  });

  // Acumulación de arrastre de 80 Bs en meses pasados + meses vencidos
  await prisma.socialFeeAccrual.createMany({
    data: [
      { personId: p4.id, membershipId: m4.id, periodMonth: 5, periodYear: 2026, periodLabel: 'Mayo 2026', feeType: 'PRESENTE', baseAmount: 880, paidAmount: 800, residualBalance: 80, dueDate: new Date('2026-05-01'), status: 'PARCIAL' },
      { personId: p4.id, membershipId: m4.id, periodMonth: 6, periodYear: 2026, periodLabel: 'Junio 2026', feeType: 'PRESENTE', baseAmount: 880, paidAmount: 800, residualBalance: 80, dueDate: new Date('2026-06-01'), status: 'PARCIAL' },
      { personId: p4.id, membershipId: m4.id, periodMonth: 7, periodYear: 2026, periodLabel: 'Julio 2026', feeType: 'PRESENTE', baseAmount: 880, paidAmount: 0, residualBalance: 880, dueDate: new Date('2026-07-01'), status: 'PENDIENTE' },
      { personId: p4.id, membershipId: m4.id, periodMonth: 8, periodYear: 2026, periodLabel: 'Agosto 2026', feeType: 'PRESENTE', baseAmount: 880, paidAmount: 0, residualBalance: 880, dueDate: new Date('2026-08-01'), status: 'PENDIENTE' }
    ]
  });

  // 6. Sesión de Asamblea General 2026
  const sessionDate = new Date();
  const session = await prisma.assemblySession.create({
    data: {
      title: 'Asamblea General Ordinaria de Socios - Gestión 2026',
      sessionDate,
      cutoffTime: new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate(), 15, 0, 0),
      isCensusFrozen: true,
      maxDebtToleranceMonths: 1,
      status: 'EN_CURSO',
      totalEligiblePropietarios: 280,
      totalEligibleInstitucionales: 25,
      totalPresent: 154,
      quorumPercentage: 50.5
    }
  });

  // Registrar asistentes a la asamblea
  await prisma.assemblyAttendee.createMany({
    data: [
      { sessionId: session.id, personId: p1.id, membershipNumber: 'FAM-1042', fullName: 'Gonzalo Duran Morales', documentId: '3489201 LP', attendeeCategory: 'TITULAR_PROPIETARIO', eligibleAtCutoff: true, hasSigned: true, signatureTimestamp: new Date(), signatureType: 'DIGITAL' },
      { sessionId: session.id, personId: p2.id, membershipNumber: 'FAM-0410', fullName: 'Walter Ramiro Zeballos Camacho', documentId: '1984021 LP', attendeeCategory: 'TITULAR_PROPIETARIO', eligibleAtCutoff: true, hasSigned: true, signatureTimestamp: new Date(), signatureType: 'MANUAL' }
    ]
  });

  console.log('--- Seed de Socios completado con éxito! ---');
}

// Execute if run directly
if (require.main === module) {
  seedMembersDemo()
    .catch(e => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
