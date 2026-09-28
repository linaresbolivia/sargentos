const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { UpdateUserUseCase } = require('./src/modules/users/application/useCases/UpdateUserUseCase');

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'shuanca@chls.com' }});
  const useCase = new UpdateUserUseCase(prisma);
  
  try {
    const res = await useCase.execute(user.id, {
      roles: ['STAFF']
    });
    console.log(res);
  } catch (err) {
    console.error('ERROR:', err);
  }
}
main().finally(() => prisma.$disconnect());
