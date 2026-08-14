const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.update({
    where: { email: 'adminpqrs@chls.com' },
    data: {
      roles: {
        disconnect: [{ name: 'ADMIN' }],
        connect: [{ name: 'STAFF' }]
      }
    }
  });
  console.log('User roles updated to STAFF:', user.email);
}
main().finally(() => prisma.$disconnect());
