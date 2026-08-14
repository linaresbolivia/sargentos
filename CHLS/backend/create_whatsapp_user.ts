import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  await prisma.role.upsert({
    where: { name: 'MODULO_WHATSAPP' },
    update: {},
    create: {
      name: 'MODULO_WHATSAPP',
      description: 'Personal Administrativo'
    }
  });

  const passwordHash = await argon2.hash('chls2026');
  
  await prisma.user.upsert({
    where: { email: 'adminmasivo@chls.com' },
    update: {
      roles: { connect: [{ name: 'MODULO_WHATSAPP' }] }
    },
    create: {
      firstName: 'Admin',
      lastName: 'Masivo',
      email: 'adminmasivo@chls.com',
      passwordHash: passwordHash,
      roles: { connect: [{ name: 'MODULO_WHATSAPP' }] }
    }
  });

  console.log('User adminmasivo@chls.com created with password "chls2026" and role "MODULO_WHATSAPP"');
}

main().catch(console.error).finally(() => prisma.$disconnect());
