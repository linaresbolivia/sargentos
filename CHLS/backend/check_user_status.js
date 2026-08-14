const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.findUnique({
    where: { email: 'adminpqrs@chls.com' }
  });
  console.log(u);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
