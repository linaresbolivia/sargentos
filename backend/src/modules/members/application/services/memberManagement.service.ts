import { PrismaClient, Prisma } from '@prisma/client';

export class MemberManagementService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Legacy Alpha Code algorithm:
   * 3 letters Ap. Paterno + 3 letters Ap. Materno + 1st letter 1st Name + 1st letter 2nd Name
   * Example: GON-DUR-M-L
   */
  public generateAlphaCode(
    paternal: string = '',
    maternal: string = '',
    firstName: string = '',
    secondName: string = ''
  ): string {
    const clean = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
    
    const p = clean(paternal).padEnd(3, 'X').substring(0, 3);
    const m = clean(maternal).padEnd(3, 'X').substring(0, 3);
    const n1 = clean(firstName).substring(0, 1) || 'X';
    const n2 = clean(secondName).substring(0, 1) || 'X';
    
    return `${p}-${m}-${n1}-${n2}`;
  }

  /**
   * Universal Search (Fuzzy & Multi-criteria)
   * Searches by Alpha Code, CI / Passport (with extension), Names and Membership Number
   */
  public async searchMembers(query: string, categoryFilter?: string, statusFilter?: string) {
    const q = query?.trim() || '';
    
    const whereCondition: Prisma.PersonWhereInput = {
      ...(statusFilter && statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      ...(q ? {
        OR: [
          { alphaCode: { contains: q, mode: 'insensitive' } },
          { documentId: { contains: q, mode: 'insensitive' } },
          { firstName: { contains: q, mode: 'insensitive' } },
          { secondName: { contains: q, mode: 'insensitive' } },
          { paternalSurname: { contains: q, mode: 'insensitive' } },
          { maternalSurname: { contains: q, mode: 'insensitive' } },
          { marriedSurname: { contains: q, mode: 'insensitive' } },
          { fiscalNit: { contains: q, mode: 'insensitive' } },
          {
            titularMemberships: {
              some: {
                membershipNumber: { contains: q, mode: 'insensitive' }
              }
            }
          }
        ]
      } : {})
    };

    const persons = await this.prisma.person.findMany({
      where: whereCondition,
      include: {
        titularMemberships: {
          include: {
            type: true,
            beneficiaries: {
              include: {
                person: true
              }
            },
            horses: true,
            vehicles: true,
            plans: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        },
        socialFeeAccruals: {
          where: { status: { not: 'PAGADO' } }
        },
        extraordinaryCharges: {
          where: { status: { not: 'PAGADO' } }
        },
        membershipPlans: {
          include: {
            installments: {
              where: { status: { not: 'PAGADO' } }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return persons.map(person => {
      const primaryMembership = person.titularMemberships[0];
      
      // Calculate real accrued mora
      const unpaidSocial = person.socialFeeAccruals.reduce((sum, item) => sum + Number(item.residualBalance || item.baseAmount), 0);
      const unpaidCharges = person.extraordinaryCharges.reduce((sum, item) => sum + Number(item.residualBalance || item.amount), 0);
      
      // Accrued overdue CDP installments (only where dueDate <= now)
      const now = new Date();
      let overdueCdp = 0;
      let totalCdpDebt = 0;
      let cdpPaidInstallmentsCount = 0;
      let cdpTotalInstallmentsCount = 60;
      
      if (person.membershipPlans && person.membershipPlans.length > 0) {
        const plan = person.membershipPlans[0];
        totalCdpDebt = Number(plan.financedAmount || 0);
        plan.installments.forEach(inst => {
          if (new Date(inst.dueDate) <= now) {
            overdueCdp += Number(inst.balanceRemaining || inst.totalInstallment);
          }
        });
      }

      const realMoraDevengada = unpaidSocial + unpaidCharges + overdueCdp;
      
      // Access Semaphore:
      // Green = 0 to 1 month debt
      // Yellow = 1 to 2 months debt (Gracia ordinaria)
      // Red = >= 2 months overdue debt (3 months accumulated)
      const unpaidMonthsCount = person.socialFeeAccruals.length;
      let accessStatus: 'VERDE' | 'AMARILLO' | 'ROJO' = 'VERDE';
      if (unpaidMonthsCount >= 2 || realMoraDevengada >= 1760) {
        accessStatus = 'ROJO';
      } else if (unpaidMonthsCount === 1 || (realMoraDevengada > 0 && realMoraDevengada < 1760)) {
        accessStatus = 'AMARILLO';
      }

      // Seniority calculation
      const entryDate = person.depositVoucherDate || person.createdAt;
      const seniorityYears = Math.floor((new Date().getTime() - new Date(entryDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25));

      return {
        id: person.id,
        documentId: person.documentId,
        docType: person.docType,
        docExtension: person.docExtension,
        alphaCode: person.alphaCode,
        fullName: `${person.paternalSurname || ''} ${person.maternalSurname || ''} ${person.firstName} ${person.secondName || ''}`.trim(),
        firstName: person.firstName,
        secondName: person.secondName,
        paternalSurname: person.paternalSurname,
        maternalSurname: person.maternalSurname,
        marriedSurname: person.marriedSurname,
        birthDate: person.birthDate,
        gender: person.gender,
        maritalStatus: person.maritalStatus,
        profession: person.profession,
        occupation: person.occupation,
        phone: person.phone,
        mobile: person.mobile,
        email: person.email,
        photoUrl: person.photoUrl,
        status: person.status,
        personType: person.personType,
        depositVoucherNumber: person.depositVoucherNumber,
        depositVoucherDate: person.depositVoucherDate,
        depositVoucherAmount: person.depositVoucherAmount,
        fiscalNit: person.fiscalNit,
        fiscalCompanyName: person.fiscalCompanyName,
        creditLimit: person.creditLimit,
        allowsDirectDebit: person.allowsDirectDebit,
        membership: primaryMembership ? {
          id: primaryMembership.id,
          number: primaryMembership.membershipNumber,
          category: primaryMembership.type.name,
          categoryCode: primaryMembership.type.code,
          hasCdp: primaryMembership.type.hasCdp,
          votingRights: primaryMembership.type.votingRights,
          status: primaryMembership.status,
          admissionDate: primaryMembership.admissionDate,
          folioNumber: primaryMembership.folioNumber,
          beneficiariesCount: primaryMembership.beneficiaries.length,
          horsesCount: primaryMembership.horses.length,
          vehiclesCount: primaryMembership.vehicles.length
        } : null,
        financial: {
          realMoraDevengada,
          unpaidSocialCount: unpaidMonthsCount,
          unpaidCharges,
          overdueCdp,
          accessStatus,
          seniorityYears
        }
      };
    });
  }

  /**
   * Create Full Member (Single Entry Form with Deposit Voucher Rule)
   */
  public async createFullMember(data: {
    // Identity
    documentId: string;
    docType?: string;
    docExtension?: string;
    firstName: string;
    secondName?: string;
    paternalSurname: string;
    maternalSurname?: string;
    marriedSurname?: string;
    birthDate?: string;
    gender?: string;
    maritalStatus?: string;
    nationality?: string;
    profession?: string;
    occupation?: string;
    address?: string;
    city?: string;
    phone?: string;
    mobile?: string;
    email?: string;
    photoUrl?: string;
    
    // Fiscal
    fiscalNit?: string;
    fiscalCompanyName?: string;
    
    // Deposit Voucher Official Rule
    depositVoucherNumber: string;
    depositVoucherDate: string; // ISO date
    depositVoucherAmount: number;
    
    // Membership
    membershipNumber: string;
    membershipTypeCode: string; // FAM, IND, HON, TRN, PRE, DEP, MEN
    acquisitionMethod?: string; // COMPRA_DIRECTA, TRANSFERENCIA, HERENCIA
    folioNumber?: string;
    
    // Credit & Cta Cte
    creditLimit?: number;
    allowsDirectDebit?: boolean;
    
    // Dependents
    beneficiaries?: Array<{
      firstName: string;
      secondName?: string;
      paternalSurname?: string;
      maternalSurname?: string;
      documentId?: string;
      docExtension?: string;
      relationship: string; // CONYUGE, HIJO, PADRE_MADRE, NANA, CHOFER
      birthDate?: string;
      photoUrl?: string;
    }>;

    // Horses & Vehicles
    horses?: Array<{
      name: string;
      assignedBox?: string;
      feedingDiet?: string;
      veterinarian?: string;
    }>;
    vehicles?: Array<{
      plate: string;
      brand?: string;
      model?: string;
      color?: string;
    }>;
  }) {
    const alphaCode = this.generateAlphaCode(
      data.paternalSurname,
      data.maternalSurname || '',
      data.firstName,
      data.secondName || ''
    );

    const officialEntryDate = data.depositVoucherDate ? new Date(data.depositVoucherDate) : new Date();

    // Find or create MembershipType
    let mType = await this.prisma.membershipType.findUnique({
      where: { code: data.membershipTypeCode }
    });

    if (!mType) {
      mType = await this.prisma.membershipType.create({
        data: {
          code: data.membershipTypeCode,
          name: data.membershipTypeCode === 'FAM' ? 'Socio Familiar' : 
                data.membershipTypeCode === 'IND' ? 'Socio Individual' :
                data.membershipTypeCode === 'HON' ? 'Socio Honorario' :
                data.membershipTypeCode === 'PRE' ? 'Pre-Asociado' :
                data.membershipTypeCode === 'TRN' ? 'Transitorio Nacional' :
                data.membershipTypeCode === 'DEP' ? 'Socio Deportivo' : 'Socio Regular',
          monthlyFee: data.membershipTypeCode === 'HON' ? 0 :
                      data.membershipTypeCode === 'DEP' ? 400 : 880,
          hasCdp: ['FAM', 'IND', 'HON', 'JMA'].includes(data.membershipTypeCode),
          votingRights: ['HON'].includes(data.membershipTypeCode)
        }
      });
    }

    // Create Person Titular
    const finalAlphaCode = (data as any).customAlphaCode?.trim() || alphaCode;
    const memberStatus = (data as any).status || 'ACTIVO';

    const person = await this.prisma.person.create({
      data: {
        documentId: data.documentId,
        docType: data.docType || 'CI',
        docExtension: data.docExtension || 'LP',
        firstName: data.firstName,
        secondName: data.secondName,
        paternalSurname: data.paternalSurname,
        maternalSurname: data.maternalSurname,
        marriedSurname: data.marriedSurname,
        lastName: `${data.paternalSurname || ''} ${data.maternalSurname || ''}`.trim(),
        alphaCode: finalAlphaCode,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        gender: data.gender || 'M',
        maritalStatus: data.maritalStatus || 'SOLTERO',
        nationality: data.nationality || 'BOLIVIANA',
        profession: data.profession,
        occupation: data.occupation,
        company: (data as any).company || null,
        address: data.address,
        city: data.city || 'LP',
        phone: data.phone,
        mobile: data.mobile,
        email: data.email,
        photoUrl: data.photoUrl,
        fiscalNit: data.fiscalNit,
        fiscalCompanyName: data.fiscalCompanyName,
        depositVoucherNumber: data.depositVoucherNumber,
        depositVoucherDate: officialEntryDate,
        depositVoucherAmount: data.depositVoucherAmount || 0,
        creditLimit: data.creditLimit || 0,
        allowsDirectDebit: data.allowsDirectDebit || false,
        status: memberStatus,
        personType: data.membershipTypeCode === 'HON' ? 'HONORARIO' :
                    data.membershipTypeCode === 'PRE' ? 'PRE_ASOCIADO' :
                    data.membershipTypeCode === 'DEP' ? 'DEPORTIVO' : 'SOCIO'
      }
    });

    // Create Membership (membershipNumber must be numeric / clean)
    const cleanMembershipNumber = String(data.membershipNumber).replace(/[^0-9]/g, '') || String(data.membershipNumber).trim();

    const membership = await this.prisma.membership.create({
      data: {
        membershipNumber: cleanMembershipNumber,
        typeId: mType.id,
        titularId: person.id,
        status: memberStatus === 'INACTIVO' ? 'SUSPENDIDA' : 'ACTIVA',
        admissionDate: officialEntryDate,
        folioNumber: data.folioNumber,
        acquisitionMethod: data.acquisitionMethod || 'COMPRA_DIRECTA'
      }
    });

    // Create Beneficiaries (Regla de <25 años SOLO para hijos/pupilos)
    if (data.beneficiaries && data.beneficiaries.length > 0) {
      for (const b of data.beneficiaries) {
        const bBirth = b.birthDate ? new Date(b.birthDate) : null;
        const relUpper = (b.relationship || '').toUpperCase();
        const isChildRelationship = ['HIJO', 'HIJA', 'PUPILO', 'MENOR_CUSTODIA'].includes(relUpper);
        
        let isUnder25 = true;
        if (isChildRelationship && bBirth) {
          const age = Math.floor((new Date().getTime() - bBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
          isUnder25 = age < 25;
        } else {
          // Cónyuges, Padres, Suegros (+65), Estudiantes Extranjeros, Nanas, Choferes, etc. NO tienen límite de 25 años
          isUnder25 = true;
        }

        const bPerson = await this.prisma.person.create({
          data: {
            documentId: b.documentId || `DEP-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            docExtension: b.docExtension || 'LP',
            firstName: b.firstName,
            secondName: b.secondName,
            paternalSurname: b.paternalSurname || data.paternalSurname,
            maternalSurname: b.maternalSurname,
            lastName: `${b.paternalSurname || data.paternalSurname} ${b.maternalSurname || ''}`.trim(),
            birthDate: bBirth,
            photoUrl: b.photoUrl,
            status: isUnder25 ? 'ACTIVO' : 'BLOQUEADO_EDAD',
            personType: 'SOCIO'
          }
        });

        await this.prisma.beneficiary.create({
          data: {
            membershipId: membership.id,
            personId: bPerson.id,
            relationship: b.relationship,
            birthDate: bBirth,
            isUnder25,
            photoUrl: b.photoUrl,
            status: isUnder25 ? 'ACTIVO' : 'BLOQUEADO_EDAD'
          }
        });
      }
    }

    // Create Horses (Multiple Horses with status Vivo/Fallecido and Motivo)
    if (data.horses && data.horses.length > 0) {
      for (const h of data.horses) {
        if (h.name && h.name.trim()) {
          const horseStatus = (h as any).status || 'VIVO';
          const deceasedReason = (h as any).deceasedReason || null;
          const statusInfo = horseStatus === 'FALLECIDO' 
            ? `[FALLECIDO] Motivo: ${deceasedReason || 'No especificado'}` 
            : 'VIVO';

          await this.prisma.horse.create({
            data: {
              membershipId: membership.id,
              name: h.name.trim(),
              assignedBox: h.assignedBox?.trim() || null,
              feedingDiet: statusInfo,
              medicalHistory: deceasedReason || null
            }
          });
        }
      }
    }

    // Create Vehicles (Multiple Vehicles)
    if (data.vehicles && data.vehicles.length > 0) {
      for (const v of data.vehicles) {
        if (v.plate && v.plate.trim()) {
          await this.prisma.vehicle.create({
            data: {
              membershipId: membership.id,
              type: (v as any).type || 'Auto',
              plate: v.plate.trim().toUpperCase(),
              brand: v.brand?.trim() || null,
              model: v.model?.trim() || null,
              color: v.color?.trim() || null
            }
          });
        }
      }
    }

    return this.getMemberDetail(person.id);
  }

  /**
   * Get 360° Comprehensive Member Profile
   */
  public async getMemberDetail(personId: string) {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      include: {
        titularMemberships: {
          include: {
            type: true,
            beneficiaries: {
              include: {
                person: true
              }
            },
            horses: true,
            vehicles: true,
            plans: {
              include: {
                installments: {
                  orderBy: { installmentNumber: 'asc' }
                }
              },
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        socialFeeAccruals: {
          orderBy: { dueDate: 'desc' }
        },
        extraordinaryCharges: {
          include: {
            veterinaryDetails: true
          },
          orderBy: { dueDate: 'desc' }
        },
        paymentTransactions: {
          orderBy: { paymentDate: 'desc' },
          take: 20
        },
        refundRequests: {
          orderBy: { createdAt: 'desc' }
        },
        accessLogs: {
          orderBy: { timestamp: 'desc' },
          take: 15
        }
      }
    });

    return person;
  }
}
