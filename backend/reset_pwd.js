const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const prisma = new PrismaClient();

async function main() {
  const hash = await argon2.hash('123456');
  await prisma.user.update({
    where: { email: 'jabuday@gmail.com' },
    data: { passwordHash: hash }
  });
  console.log('Password for jabuday@gmail.com updated to 123456');
}


main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
