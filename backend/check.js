const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const m = await prisma.membership.findFirst({
    where: { totalDebt: { gt: 0 } },
    include: { titular: { include: { user: true } } }
  });
  console.log('MEMBER WITH USER:', {
    number: m?.membershipNumber,
    debt: m?.totalDebt,
    email: m?.titular?.user?.email,
    name: `${m?.titular?.firstName} ${m?.titular?.lastName}`
  });

}

main().finally(() => prisma.$disconnect());

