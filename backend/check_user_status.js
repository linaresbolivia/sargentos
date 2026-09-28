const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.findUnique({
    where: { email: 'adminmasivo@chls.com' },
    include: { roles: true }
  });
  console.log('User and roles:', JSON.stringify(u, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
