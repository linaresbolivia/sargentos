import { PrismaClient } from '@prisma/client';
import { UpdateUserUseCase } from './src/modules/users/application/useCases/UpdateUserUseCase';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'shuanca@chls.com' } });
  const useCase = new UpdateUserUseCase(prisma);
  
  try {
    const res = await useCase.execute(user!.id, {
      email: 'shuanca@chls.com',
      firstName: 'Severo',
      lastName: 'Huanca',
      documentId: '',
      phone: '',
      roles: ['STAFF'],
      isActive: true
    });
    console.log('Success:', res.email);
  } catch (err) {
    console.error('ERROR:', err);
  }
}
main().finally(() => prisma.$disconnect());
