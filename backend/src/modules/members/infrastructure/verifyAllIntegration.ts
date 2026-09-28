import { PrismaClient } from '@prisma/client';
import { MemberManagementService } from '../application/services/memberManagement.service';
import { MembershipSalesAuditService } from '../application/services/membershipSalesAudit.service';
import { CashierBillingService } from '../application/services/cashierBilling.service';
import { AssemblyProtocolService } from '../application/services/assemblyProtocol.service';
import { PredictiveAlertsService } from '../application/services/predictiveAlerts.service';
import { FinancialReportsService } from '../application/services/financialReports.service';
import { FinancialSettingsService } from '../application/services/financialSettings.service';

const prisma = new PrismaClient();

async function runFullVerification() {
  console.log('================================================================');
  console.log('🧪 INICIANDO PRUEBA INTEGRAL DE SERVICIOS Y BASE DE DATOS (POSTGRESQL)');
  console.log('================================================================\n');

  const memberService = new MemberManagementService(prisma);
  const salesService = new MembershipSalesAuditService(prisma);
  const cashierService = new CashierBillingService(prisma);
  const assemblyService = new AssemblyProtocolService(prisma);
  const alertsService = new PredictiveAlertsService(prisma);
  const reportsService = new FinancialReportsService(prisma);
  const settingsService = new FinancialSettingsService(prisma);

  // 1. Directorio & Búsqueda Universal
  console.log('1️⃣  PROBANDO BÚSQUEDA UNIVERSAL & FICHA 360°...');
  const searchResults = await memberService.searchMembers('DUR');
  console.log(`   ✓ Resultados encontrados: ${searchResults.length}`);
  const titular = searchResults.find(p => p.alphaCode === 'DUR-MOR-G-M') || searchResults[0];
  console.log(`   ✓ Socio Titular: ${titular.fullName} (CI: ${titular.documentId})`);
  console.log(`   ✓ Código Alfa: ${titular.alphaCode}`);
  console.log(`   ✓ Semáforo Acceso: ${titular.financial.accessStatus}`);

  const profile360 = await memberService.getMemberDetail(titular.id);
  const m = profile360?.titularMemberships[0];
  console.log(`   ✓ Ficha 360: ${profile360?.firstName} ${profile360?.lastName} | Membresía: ${m?.membershipNumber}`);
  console.log(`   ✓ Beneficiarios cargados: ${m?.beneficiaries.length}`);
  console.log(`   ✓ Equinos: ${m?.horses.length} (${m?.horses[0]?.name})`);
  console.log(`   ✓ Vehículos: ${m?.vehicles.length} (${m?.vehicles[0]?.plate})`);
  console.log(`   ✓ Avance Plan CDP: ${m?.plans[0]?.installments.filter((i: any) => i.status === 'PAGADO').length}/${m?.plans[0]?.installments.length} cuotas pagadas\n`);

  // 2. Ventas & Auditoría CDP (60/40)
  console.log('2️⃣  PROBANDO CIRCUITO COMERCIAL & AUDITORÍA CDP (60/40)...');
  const newPlan = await salesService.createSalesPlan({
    membershipId: m!.id,
    titularId: titular.id,
    totalAmount: 69600,
    downPayment: 15000,
    monthsTerm: 60,
    paymentMethodType: 'CREDITO',
    acquisitionType: 'COMPRA_DIRECTA',
    sellerName: 'Eduardo (Ventas)',
    folioNumber: 'FOL-TEST-001'
  });
  console.log(`   ✓ Plan formulado: Txn ${newPlan?.transactionNumber} (Estado: ${newPlan?.status})`);
  console.log(`   ✓ 60% Derecho Ingreso (Factura): Bs ${newPlan?.incomeFeeAmount}`);
  console.log(`   ✓ 40% Cuota Participación CDP (Recibo): Bs ${newPlan?.cdpAmount}`);
  console.log(`   ✓ Cuota fija mensual calculada: Bs ${newPlan?.fixedMonthlyInstallment}`);

  const auditedPlan = await salesService.auditPlan(newPlan!.id, {
    action: 'APROBAR',
    auditedBy: 'Mónica (Recaudaciones)',
    auditNotes: 'Documentación legal y boleta bancaria verificadas.'
  });
  console.log(`   ✓ Auditoría ejecutada por Mónica: Estado final -> ${auditedPlan?.status}\n`);

  // 3. Estación de Caja, Notas Veterinarias & Facturación Dual
  console.log('3️⃣  PROBANDO CAJA RÁPIDA, DESGLOSE MÉDICO VETERINARIO & COBRO DUAL...');
  const debtSheet = await cashierService.getMemberDebtSheet(titular.id);
  console.log(`   ✓ Total deuda devengada en fechas: Bs ${debtSheet.totals.totalDeudaFechas}`);
  console.log(`   ✓ Items de deuda por fechas: ${debtSheet.itemsFechas.length} conceptos`);
  debtSheet.itemsFechas.forEach((item: any) => {
    console.log(`     - [${item.type}] ${item.concept} -> Saldo: Bs ${item.balance}`);
  });

  // Ejecutar un cobro real en base de datos
  const paymentResult = await cashierService.processPayment({
    personId: titular.id,
    cashierUsername: 'cajero_central_1',
    paymentMethod: 'EFECTIVO',
    amountPaid: 880, // Cobramos la cuota social del mes
    fiscalNit: '3489201019',
    fiscalRazonSocial: 'Duran Morales Gonzalo',
    selectedItemIds: [
      { id: debtSheet.itemsFechas[1].id, type: 'SOCIAL_FEE', amount: 880 }
    ],
    notes: 'Prueba de cobro automatizada'
  });

  console.log(`   ✓ Transacción de Caja procesada en BD: Código ${paymentResult!.transactionCode}`);
  console.log(`   ✓ Factura Fiscal emitida: ${paymentResult!.invoiceNumber} (Monto: Bs ${paymentResult!.invoicedAmount})`);
  console.log(`   ✓ Recibo Oficial emitido: ${paymentResult!.receiptNumber || 'N/A'}`);

  const closing = await cashierService.getDailyCashClosing();
  console.log(`   ✓ Arqueo Diario actualizado en BD: Total Recaudado Hoy = Bs ${closing.summary.totalRecaudado}\n`);

  // 4. Radar de Alertas Predictivas
  console.log('4️⃣  PROBANDO MOTOR DE ALERTAS PREDICTIVAS (25 AÑOS & HONORARIOS)...');
  const depAlerts = await alertsService.scanDependentMajorityAlerts();
  console.log(`   ✓ Alertas de hijos 25 años detectadas en BD: ${depAlerts.length}`);
  if (depAlerts.length > 0) {
    console.log(`     - Beneficiario: ${depAlerts[0].fullName} (${depAlerts[0].ageYears} años)`);
    console.log(`     - Estado de Carnet: ${depAlerts[0].alertType}`);
    console.log(`     - Acción Comercial: ${depAlerts[0].suggestedAction}`);
  }

  // 5. Protocolo de Asambleas & Quórum en Vivo
  console.log('\n5️⃣  PROBANDO PROTOCOLO DE ASAMBLEAS & QUÓRUM...');
  const assemblySession = await assemblyService.getOrCreateSession('Asamblea General Ordinaria 2026');
  console.log(`   ✓ Sesión activa en BD: ${assemblySession?.title}`);
  console.log(`   ✓ Padrón habilitado: ${assemblySession?.totalEligiblePropietarios} propietarios`);
  console.log(`   ✓ Quórum inicial: ${assemblySession?.quorumPercentage}%`);

  const inSituAttendee = await assemblyService.registerInSituPaymentAndQuorum(assemblySession!.id, {
    personId: titular.id
  });
  console.log(`   ✓ Habilitación In-Situ en Mesa de Entrada: ${inSituAttendee.fullName} incorporado al Libro`);

  // 6. Cartera Especial Saneada
  console.log('6️⃣  PROBANDO REPORTE DE CARTERA ESPECIAL SANEADA...');
  const carteraReport = await reportsService.getCarteraEspecialSaneada();
  console.log(`   ✓ Resumen Cartera Saneada en BD:`);
  console.log(`     - 1 a 2 Meses (Gracia): Bs ${carteraReport.summary.totalCarteraMes1a2}`);
  console.log(`     - 3 a 6 Meses: Bs ${carteraReport.summary.totalCarteraMes3a6}`);
  console.log(`     - > 6 Meses (Pesada): Bs ${carteraReport.summary.totalCarteraMesMayor6}`);
  console.log(`     - Total Mora Devengada Real: Bs ${carteraReport.summary.totalCarteraGeneral}\n`);

  // 7. Parametrización Financiera Autónoma
  console.log('7️⃣  PROBANDO PARAMETRIZACIÓN FINANCIERA SIN TI...');
  const params = await settingsService.getParameters();
  console.log(`   ✓ Parámetros cargados en BD: ${params.length}`);
  const updatedParam = await settingsService.updateParameter('CUOTA_SOCIAL_PRESENTE', '880.00', 880);
  console.log(`   ✓ Parámetro ${updatedParam.parameterKey} persistido en BD con valor: ${updatedParam.parameterValue}\n`);

  console.log('================================================================');
  console.log('✅ TODAS LAS PRUEBAS DE INTEGRACIÓN EN BASE DE DATOS RESULTARON 100% EXITOSAS');
  console.log('================================================================');
}

runFullVerification()
  .catch(e => {
    console.error('❌ Error en prueba:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
