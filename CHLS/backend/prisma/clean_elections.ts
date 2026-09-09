import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function run() {
  await p.$executeRawUnsafe('TRUNCATE TABLE election_candidates, election_ballots, election_slates, election_voters, election_audit_logs, elections CASCADE;');
  console.log('✅ Election tables truncated');
  await p.$disconnect();
}
run();
