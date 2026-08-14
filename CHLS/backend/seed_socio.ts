import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding fake socio data...');
  // Find any existing user with role MEMBER or ADMIN
  const user = await prisma.user.findFirst();

  if (!user) {
    console.log('No users found. Run register first.');
    process.exit(1);
  }

  // Create Person and Membership
  const person = await prisma.person.create({
    data: {
      userId: user.id,
      firstName: 'Alberto',
      lastName: 'Montenegro',
      documentId: 'V-12345678',
      dateOfBirth: new Date('1980-05-12'),
      gender: 'MALE',
      nationality: 'Venezolano',
      email: user.email,
      
      titularMemberships: {
        create: {
          membershipNumber: '0058',
          status: 'ACTIVE',
          type: {
            create: {
              name: 'Titular',
              basePrice: 5000,
              monthlyFee: 150,
              transferable: true,
              hasShares: true,
            }
          },
          admissionDate: new Date('2008-03-15'),
          acquisitionMethod: 'PURCHASE',
          transferable: true,
          hasShares: true,
          sharesCount: 1,

          beneficiaries: {
            create: [
              {
                firstName: 'Maria',
                lastName: 'Montenegro',
                relationship: 'WIFE',
                dateOfBirth: new Date('1982-08-22'),
              },
              {
                firstName: 'Luis',
                lastName: 'Montenegro',
                relationship: 'SON',
                dateOfBirth: new Date('2010-11-05'),
              }
            ]
          },
          horses: {
            create: [
              {
                name: 'Relámpago',
                breed: 'Pura Sangre',
                gender: 'MALE',
                birthDate: new Date('2018-04-10'),
                coatColor: 'Alazán',
                status: 'ACTIVE',
                stableLocation: 'Pesebrera 12'
              }
            ]
          },
          vehicles: {
            create: [
              {
                make: 'Toyota',
                model: 'Land Cruiser',
                year: 2022,
                color: 'Blanco',
                licensePlate: 'ABC-123',
                hasSticker: true
              }
            ]
          }
        }
      }
    }
  });

  console.log('Seeded Person and Membership successfully!');
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
