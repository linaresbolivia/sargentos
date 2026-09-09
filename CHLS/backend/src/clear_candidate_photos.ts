import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearPhotos() {
  const result = await prisma.electionCandidate.updateMany({
    data: {
      photoUrl: null
    }
  });
  console.log(`✓ Fotos eliminadas para ${result.count} candidatos. Listo para que el usuario suba sus fotos.`);
}

clearPhotos()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
