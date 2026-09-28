const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
  const email = 'adminpqrs@chls.com';
  
  let user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    const passwordHash = await argon2.hash('123456');
    
    user = await prisma.user.create({
      data: {
        firstName: 'Admin',
        lastName: 'PQRS',
        email: email,
        passwordHash,
        isActive: true,
        roles: {
          connectOrCreate: {
            where: { name: 'ADMIN' },
            create: { name: 'ADMIN', description: 'Administrador general' }
          }
        }
      }
    });
    console.log('User created:', user.email);
  } else {
    console.log('User already exists:', user.email);
  }

  // Transfer all PQRS tickets
  const updateResult = await prisma.pqrsTicket.updateMany({
    data: {
      assignedToId: user.id,
      isRead: false
    }
  });

  console.log(`Transferred ${updateResult.count} PQRS tickets to ${user.firstName} ${user.lastName}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
