import { PrismaClient } from '@prisma/client';
import { ElectionService } from './modules/elections/application/ElectionService';

const prisma = new PrismaClient();
const service = new ElectionService(prisma);

async function check() {
  const election = await prisma.election.findFirst({
    include: { candidates: { orderBy: { orderIndex: 'asc' } }, ballots: true }
  });

  console.log('Election candidates:');
  for (const c of election!.candidates) {
    console.log(`[${c.orderIndex}] ID: ${c.id} - ${c.fullName}`);
  }

  const stats = await service.getLiveStats(election!.id);
  console.log('Live Stats Summary:');
  console.log('Total ballots:', stats.totalBallots);
  console.log('Valid ballots:', stats.validBallots);
  console.log('Total votes:', stats.totalVotesAccumulated);
  for (const c of stats.candidates) {
    console.log(`Rank #${c.rank}: ${c.fullName} - Votes: ${c.votesCount} (${c.votesPercentage}%)`);
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
