const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
  const email = 'shuanca@chls.com';
  
  let user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    console.log('User already exists:', user.email);
    return;
  }

  const passwordHash = await argon2.hash('123456');
  
  user = await prisma.user.create({
    data: {
      firstName: 'Severo',
      lastName: 'Huanca',
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

  console.log('Test user created successfully:', user.email);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
