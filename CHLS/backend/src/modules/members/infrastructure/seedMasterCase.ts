import { PrismaClient } from '@prisma/client';
import { FinancialSettingsService } from '../application/services/financialSettings.service';

const prisma = new PrismaClient();

export async function seedMasterCase() {
  console.log('--- Limpiando registros anteriores de socios ---');

  // 1. Clean in correct foreign key order
  await prisma.paymentAllocation.deleteMany();
  await prisma.memberPaymentTransaction.deleteMany();
  await prisma.veterinaryNoteDetail.deleteMany();
  await prisma.extraordinaryCharge.deleteMany();
  await prisma.socialFeeAccrual.deleteMany();
  await prisma.membershipInstallment.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.assemblyAttendee.deleteMany();
  await prisma.assemblySession.deleteMany();
  await prisma.membershipRefundRequest.deleteMany();
  await prisma.beneficiary.deleteMany();
  await prisma.horse.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.pet.deleteMany();
  await prisma.membershipHistory.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.credential.deleteMany();
  await prisma.guest.deleteMany();
  
  // Clean persons that have no User link or were created as test members
  await prisma.person.deleteMany();

  console.log('--- Tablas limpiadas exitosamente ---');

  // 2. Initialize System Financial Parameters
  const settingsService = new FinancialSettingsService(prisma);
  await settingsService.getParameters();

  // 3. Ensure Membership Types
  const categories = [
    { code: 'FAM', name: 'Socio Familiar', monthlyFee: 880, hasCdp: true, votingRights: true },
    { code: 'IND', name: 'Socio Individual', monthlyFee: 880, hasCdp: true, votingRights: true },
    { code: 'HON', name: 'Socio Honorario', monthlyFee: 0, hasCdp: true, votingRights: true },
    { code: 'PRE', name: 'Pre-Asociado', monthlyFee: 880, hasCdp: false, votingRights: false },
    { code: 'JMA', name: 'Socio Junior Mayor', monthlyFee: 880, hasCdp: true, votingRights: true },
    { code: 'TRN', name: 'Transitorio Nacional', monthlyFee: 880, hasCdp: false, votingRights: false },
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

  console.log('--- Creando Caso Maestro Integral CHLS ---');

  // 4. SOCIO TITULAR MAESTRO: Gonzalo Mauricio Durán Morales
  // Código Alfa: DUR-MOR-G-M
  const titular = await prisma.person.create({
    data: {
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
      occupation: 'Gerente General Consorcio Andino',
      address: 'Av. Las Palmas #450, Calacoto',
      city: 'LP',
      phone: '2794500',
      mobile: '77219800',
      email: 'gduran@consorcio.bo',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      status: 'ACTIVO',
      personType: 'SOCIO',
      depositVoucherNumber: 'DEP-BNB-883910',
      depositVoucherDate: new Date('2022-03-10'), // Fecha Oficial de Ingreso
      depositVoucherAmount: 15000,
      fiscalNit: '3489201019',
      fiscalCompanyName: 'Duran Morales Gonzalo',
      creditLimit: 50000,
      allowsDirectDebit: true
    }
  });

  // Membresía Titular
  const membership = await prisma.membership.create({
    data: {
      membershipNumber: 'FAM-1042',
      typeId: typeMap.get('FAM').id,
      titularId: titular.id,
      status: 'ACTIVA',
      admissionDate: new Date('2022-03-10'),
      folioNumber: 'FOL-0982',
      purchaseValue: 69600,
      currentValue: 69600,
      acquisitionMethod: 'COMPRA_DIRECTA'
    }
  });

  // 5. GRUPO FAMILIAR & DEPENDIENTES
  // A) Esposa: Mariana Flores Vargas de Durán
  const esposa = await prisma.person.create({
    data: {
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
      profession: 'Diseñadora de Interiores',
      photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
      status: 'ACTIVO',
      personType: 'SOCIO'
    }
  });

  await prisma.beneficiary.create({
    data: {
      membershipId: membership.id,
      personId: esposa.id,
      relationship: 'CONYUGE',
      birthDate: new Date('1982-11-20'),
      isUnder25: true,
      photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
      status: 'ACTIVO'
    }
  });

  // B) Hijo Menor de 25 años: Mateo Durán Flores (17 años - Habilitado)
  const hijoMenor = await prisma.person.create({
    data: {
      documentId: '7829104',
      docType: 'CI',
      docExtension: 'LP',
      firstName: 'Mateo',
      paternalSurname: 'Duran',
      maternalSurname: 'Flores',
      lastName: 'Duran Flores',
      alphaCode: 'DUR-FLO-M-X',
      birthDate: new Date('2009-04-10'), // 17 años
      gender: 'M',
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
      status: 'ACTIVO',
      personType: 'SOCIO'
    }
  });

  await prisma.beneficiary.create({
    data: {
      membershipId: membership.id,
      personId: hijoMenor.id,
      relationship: 'HIJO',
      birthDate: new Date('2009-04-10'),
      isUnder25: true,
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
      status: 'ACTIVO'
    }
  });

  // C) Hijo que cumplió 25 años: Sebastian Durán Flores (25 años - Bloqueado con Alerta)
  const hijoMayor25 = await prisma.person.create({
    data: {
      documentId: '6892011',
      docType: 'CI',
      docExtension: 'LP',
      firstName: 'Sebastian',
      paternalSurname: 'Duran',
      maternalSurname: 'Flores',
      lastName: 'Duran Flores',
      alphaCode: 'DUR-FLO-S-X',
      birthDate: new Date('2001-08-01'), // Cumplió 25 años!
      gender: 'M',
      profession: 'Economista',
      photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
      status: 'BLOQUEADO_EDAD',
      personType: 'SOCIO'
    }
  });

  await prisma.beneficiary.create({
    data: {
      membershipId: membership.id,
      personId: hijoMayor25.id,
      relationship: 'HIJO',
      birthDate: new Date('2001-08-01'),
      isUnder25: false,
      photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
      status: 'BLOQUEADO_EDAD',
      specialRelationshipNote: 'Alerta comercial: Ofrecer Pre-Asociado o título propio Junior Mayor'
    }
  });

  // D) Personal de apoyo (NANA)
  const nana = await prisma.person.create({
    data: {
      documentId: '5540192',
      docType: 'CI',
      docExtension: 'LP',
      firstName: 'Juana',
      paternalSurname: 'Mamani',
      maternalSurname: 'Quispe',
      lastName: 'Mamani Quispe',
      alphaCode: 'MAM-QUI-J-X',
      birthDate: new Date('1990-03-12'),
      gender: 'F',
      status: 'ACTIVO',
      personType: 'EXTERNAL'
    }
  });

  await prisma.beneficiary.create({
    data: {
      membershipId: membership.id,
      personId: nana.id,
      relationship: 'NANA',
      status: 'ACTIVO',
      specialRelationshipNote: 'Acompañante de hijos menores a instalaciones y piscina'
    }
  });

  // 6. ACTIVOS VINCULADOS
  // Caballo en Box Hípico (195 Bs/mes)
  await prisma.horse.create({
    data: {
      membershipId: membership.id,
      name: 'Sultán de la Colina',
      assignedBox: 'Box H-08',
      feedingDiet: 'Alfalfa premium y concentrado balanceado 3v/día',
      veterinarian: 'Dr. Fernando Cossío'
    }
  });

  // Vehículo con Tag de Garita
  await prisma.vehicle.create({
    data: {
      membershipId: membership.id,
      type: 'Auto',
      plate: '4820-KPL',
      brand: 'Toyota',
      model: 'Land Cruiser Prado TXL',
      color: 'Gris Grafito Metalizado'
    }
  });

  // 7. ADQUISICIÓN Y PLAN DE AMORTIZACIÓN CDP (60/40)
  // Monto Total: 69,600 Bs | Cuota Inicial: 15,000 Bs | Saldo Financiado: 54,600 Bs en 60 cuotas fijas de 910 Bs
  const plan = await prisma.membershipPlan.create({
    data: {
      membershipId: membership.id,
      titularId: titular.id,
      transactionNumber: 'AME-2022-0042',
      acquisitionType: 'COMPRA_DIRECTA',
      status: 'APROBADO',
      sellerName: 'Eduardo (Ventas)',
      auditedBy: 'Mónica (Recaudaciones)',
      auditDate: new Date('2022-03-12'),
      totalAmount: 69600,
      incomeFeeAmount: 41760, // 60% Facturado
      cdpAmount: 27840,       // 40% Recibo Oficial
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

  // Generar 60 cuotas correlativas (Cuotas 1 a 40 PAGADAS -> 67% avance; 41 a 60 PENDIENTES)
  for (let i = 1; i <= 60; i++) {
    const due = new Date(2022, 3 + (i - 1), 1);
    const isPaid = i <= 40;
    await prisma.membershipInstallment.create({
      data: {
        planId: plan.id,
        installmentNumber: i,
        dueDate: due,
        incomeFeePart: 546,  // 60%
        cdpPart: 364,        // 40%
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

  // 8. DEUDA POR FECHAS PARA CAJA Y COBRANZAS
  // A) Cuota Social mes anterior con arrastre de 80 Bs (pagó 800 Bs desconociendo el aumento a 880 Bs)
  await prisma.socialFeeAccrual.create({
    data: {
      personId: titular.id,
      membershipId: membership.id,
      periodMonth: 7,
      periodYear: 2026,
      periodLabel: 'Julio 2026',
      feeType: 'PRESENTE',
      baseAmount: 880,
      paidAmount: 800,
      residualBalance: 80, // Arrastre de 80 Bs
      dueDate: new Date('2026-07-01'),
      status: 'PARCIAL'
    }
  });

  // B) Cuota Social mes actual (880 Bs pendiente)
  await prisma.socialFeeAccrual.create({
    data: {
      personId: titular.id,
      membershipId: membership.id,
      periodMonth: 8,
      periodYear: 2026,
      periodLabel: 'Agosto 2026',
      feeType: 'PRESENTE',
      baseAmount: 880,
      paidAmount: 0,
      residualBalance: 880,
      dueDate: new Date('2026-08-01'),
      status: 'PENDIENTE'
    }
  });

  // C) Cargo recurrente Box Hípico (195 Bs pendiente)
  await prisma.extraordinaryCharge.create({
    data: {
      personId: titular.id,
      serviceCategory: 'BOX_HIPICO',
      serviceName: 'Mantenimiento Box Caballo Sultán (Box H-08)',
      periodMonth: 8,
      periodYear: 2026,
      amount: 195,
      paidAmount: 0,
      residualBalance: 195,
      dueDate: new Date('2026-08-01'),
      status: 'PENDIENTE'
    }
  });

  // D) Escuela deportiva de Tenis para hijo (230 Bs)
  await prisma.extraordinaryCharge.create({
    data: {
      personId: titular.id,
      serviceCategory: 'ESCUELA_DEPORTIVA',
      serviceName: 'Escuela de Tenis Avanzado - Mateo Durán',
      periodMonth: 8,
      periodYear: 2026,
      amount: 230,
      paidAmount: 0,
      residualBalance: 230,
      dueDate: new Date('2026-08-10'),
      status: 'PENDIENTE'
    }
  });

  // E) Atención Clínica Veterinaria con Desglose Médico (480 Bs)
  const vetCharge = await prisma.extraordinaryCharge.create({
    data: {
      personId: titular.id,
      serviceCategory: 'VETERINARIA',
      serviceName: 'Tratamiento Cólico y Desparasitación Masiva',
      clinicalNoteNumber: 'NOT-VET-2026-084',
      periodMonth: 8,
      periodYear: 2026,
      amount: 480,
      paidAmount: 0,
      residualBalance: 480,
      dueDate: new Date('2026-08-25'),
      status: 'PENDIENTE',
      notes: 'Requiere verificación clínica por el socio en caja antes de pagar'
    }
  });

  await prisma.veterinaryNoteDetail.createMany({
    data: [
      { chargeId: vetCharge.id, horseName: 'Sultán de la Colina', boxNumber: 'H-08', itemDescription: 'Suero Electrolítico Rehidratante 5 Litros', quantity: 2, unitPrice: 120, subtotal: 240 },
      { chargeId: vetCharge.id, horseName: 'Sultán de la Colina', boxNumber: 'H-08', itemDescription: 'Analgésico Antiespasmódico Equino IV', quantity: 1, unitPrice: 140, subtotal: 140 },
      { chargeId: vetCharge.id, horseName: 'Sultán de la Colina', boxNumber: 'H-08', itemDescription: 'Honorario Médico de Guardia Veterinaria', quantity: 1, unitPrice: 100, subtotal: 100 }
    ]
  });

  // 9. ASAMBLEA GENERAL ORDINARIA 2026
  const sessionDate = new Date();
  const session = await prisma.assemblySession.create({
    data: {
      title: 'Asamblea General Ordinaria de Socios - Gestión 2026',
      sessionDate,
      cutoffTime: new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate(), 15, 0, 0),
      isCensusFrozen: true,
      maxDebtToleranceMonths: 1,
      status: 'EN_CURSO',
      totalEligiblePropietarios: 150,
      totalEligibleInstitucionales: 12,
      totalPresent: 82,
      quorumPercentage: 50.6
    }
  });

  await prisma.assemblyAttendee.create({
    data: {
      sessionId: session.id,
      personId: titular.id,
      membershipNumber: 'FAM-1042',
      fullName: 'Gonzalo Mauricio Duran Morales',
      documentId: '3489201 LP',
      attendeeCategory: 'TITULAR_PROPIETARIO',
      eligibleAtCutoff: true,
      hasSigned: true,
      signatureTimestamp: new Date(),
      signatureType: 'DIGITAL'
    }
  });

  console.log('=====================================================');
  console.log('✓ CASO MAESTRO INTEGRAL CREADO CON ÉXITO:');
  console.log('  - Socio Titular: Gonzalo Durán Morales (CI: 3489201 LP)');
  console.log('  - Código Alfa: DUR-MOR-G-M');
  console.log('  - Membresía: FAM-1042 (Socio Familiar)');
  console.log('  - Boleta Depósito Original: DEP-BNB-883910 (10/03/2022)');
  console.log('  - Familia: Esposa (Mariana), Hijo menor (Mateo), Hijo >25 (Sebastian), Nana (Juana)');
  console.log('  - Activos: Caballo "Sultán de la Colina" (Box H-08), Auto 4820-KPL');
  console.log('  - Plan CDP 60/40: 69,600 Bs (Cuotas 1-40 pagadas, 41-60 pendientes)');
  console.log('  - Deudas en Caja: Cuota Social 880 + Arrastre 80 + Box 195 + Tenis 230 + Nota Vet 480');
  console.log('=====================================================');
}

// Execute if run directly
if (require.main === module) {
  seedMasterCase()
    .catch(e => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
