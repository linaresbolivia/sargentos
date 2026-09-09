export type BallotType = 'VALID' | 'BLANK' | 'NULL';

export interface CandidateDto {
  id: string;
  fullName: string;
  position?: string;
  membershipNumber?: string;
  photoUrl?: string;
  bio?: string;
  colorHex?: string;
  orderIndex: number;
  isActive: boolean;
  votesCount: number;
  votesPercentage: number; // Porcentaje calculado en base a total de boletas
  votesPercentageValid?: number;
  rank?: number;
}

export interface ElectionStatsDto {
  electionId: string;
  electionTitle: string;
  period: string;
  status: 'CONVOCADA' | 'EN_CURSO' | 'FINALIZADA' | 'PROCLAMADA';
  quorumMinimum: number;
  maxSelectionsPerBallot: number;
  totalBallots: number; // Total boletas sacadas del ánfora
  validBallots: number;
  validPercentage: number;
  blankBallots: number;
  blankPercentage: number;
  nullBallots: number;
  nullPercentage: number;
  totalVotesAccumulated: number;
  candidates: CandidateDto[];
  winningCandidateId?: string | null;
  lastUpdated: string;
}

export type ResultsFormat = 'PILLARS_3D' | 'UNITEL_TV';

export function formatNameInTwoLines(name: string): { line1: string; line2: string } {
  if (!name) return { line1: '', line2: '' };
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) {
    return { line1: parts[0] || '', line2: '' };
  }
  if (parts.length === 2) {
    return { line1: parts[0], line2: parts[1] };
  }
  if (parts.length === 3) {
    return { line1: parts[0], line2: parts.slice(1).join(' ') };
  }
  // For 4 or more words (e.g. 2 first names + 2 surnames)
  const mid = Math.ceil(parts.length / 2);
  return { line1: parts.slice(0, mid).join(' '), line2: parts.slice(mid).join(' ') };
}
