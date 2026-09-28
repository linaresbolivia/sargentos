import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function migratePhotos() {
  console.log('🚀 Iniciando optimización y compresión de fotos de candidatos...');

  const uploadsDir = path.join(process.cwd(), 'uploads', 'elections');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const candidates = await prisma.electionCandidate.findMany({
    orderBy: { orderIndex: 'asc' }
  });

  console.log(`Encontrados ${candidates.length} candidatos.`);

  let totalOriginalKb = 0;
  let totalOptimizedKb = 0;

  for (const cand of candidates) {
    if (!cand.photoUrl) {
      console.log(`- [${cand.orderIndex}] ${cand.fullName}: Sin foto.`);
      continue;
    }

    if (cand.photoUrl.startsWith('data:image')) {
      const base64Data = cand.photoUrl.split(',')[1];
      const origBuf = Buffer.from(base64Data, 'base64');
      const origKb = Math.round(origBuf.length / 1024);
      totalOriginalKb += origKb;

      const fileName = `cand_${cand.orderIndex}_${cand.id.substring(0, 8)}.webp`;
      const filePath = path.join(uploadsDir, fileName);

      // Comprimir con sharp a 480x480 WebP con alta calidad pero ultra-liviano
      const optimizedBuf = await sharp(origBuf)
        .resize(480, 480, { fit: 'cover', position: 'top' })
        .webp({ quality: 85, effort: 4 })
        .toBuffer();

      fs.writeFileSync(filePath, optimizedBuf);
      const optKb = Math.round(optimizedBuf.length / 1024);
      totalOptimizedKb += optKb;

      const publicUrl = `/uploads/elections/${fileName}`;

      await prisma.electionCandidate.update({
        where: { id: cand.id },
        data: { photoUrl: publicUrl }
      });

      console.log(`✓ [${cand.orderIndex}] ${cand.fullName}: ${origKb} KB ➔ ${optKb} KB (${publicUrl})`);
    } else {
      console.log(`- [${cand.orderIndex}] ${cand.fullName}: Ya es URL estática (${cand.photoUrl})`);
    }
  }

  console.log('====================================================');
  console.log(`Total original: ${totalOriginalKb} KB (~${(totalOriginalKb / 1024).toFixed(2)} MB)`);
  console.log(`Total optimizado: ${totalOptimizedKb} KB (~${(totalOptimizedKb / 1024).toFixed(2)} MB)`);
  if (totalOriginalKb > 0) {
    const reduction = (((totalOriginalKb - totalOptimizedKb) / totalOriginalKb) * 100).toFixed(1);
    console.log(`🎉 Reducción de ancho de banda: ${reduction}% menos de peso`);
  }
}

migratePhotos()
  .catch((e) => console.error('Error:', e))
  .finally(() => prisma.$disconnect());
