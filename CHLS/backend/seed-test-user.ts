import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'pruebas.pqrs@chls.com';
  
  // Check if it already exists
  let user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    console.log('User already exists:', user.email);
    return;
  }

  const passwordHash = await bcrypt.hash('123456', 10);
  
  user = await prisma.user.create({
    data: {
      firstName: 'Usuario Pruebas',
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
