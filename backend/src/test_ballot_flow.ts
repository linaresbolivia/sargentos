import { PrismaClient } from '@prisma/client';
import { ElectionService } from './modules/elections/application/ElectionService';

const prisma = new PrismaClient();
const service = new ElectionService(prisma);

async function testFlow() {
  const election = await prisma.election.findFirst({
    where: { status: 'EN_CURSO' },
    include: { candidates: { orderBy: { orderIndex: 'asc' } } }
  });

  if (!election) throw new Error('No active election found');

  console.log(`Active Election: ${election.title} (${election.id})`);
  console.log(`Total Candidates: ${election.candidates.length}`);

  // Pick Karel (1), Miguel (2), and Guido (10)
  const c1 = election.candidates[0];
  const c2 = election.candidates[1];
  const c10 = election.candidates[9];

  console.log(`Voting for: ${c1.fullName}, ${c2.fullName}, ${c10.fullName}`);

  const res = await service.registerBallot({
    electionId: election.id,
    ballotType: 'VALID',
    selectedCandidateIds: [c1.id, c2.id, c10.id],
    registeredBy: 'TEST_AGENT'
  });

  console.log('Ballot Registered Result:', res.success, 'Ballot #', res.ballot.ballotNumber);
  console.log('Total Ballots in Ánfora:', res.stats.totalBallots);
  console.log('Valid Ballots:', res.stats.validBallots);

  for (const c of res.stats.candidates.slice(0, 5)) {
    console.log(`- ${c.fullName} [${c.position}]: ${c.votesCount} votos (${c.votesPercentage}%)`);
  }

  // Now clean it back to 0 as requested by the user ("LIMPIA LOS REGISTROS")
  await prisma.electionBallot.deleteMany({ where: { electionId: election.id } });
  console.log('✓ Test ballot cleaned. Ánfora reset back to 0 ballots for fresh user start.');
}

testFlow()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
