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

export interface ElectionHistoryItem {
  id: string;
  title: string;
  description?: string;
  period: string;
  status: 'CONVOCADA' | 'EN_CURSO' | 'FINALIZADA' | 'PROCLAMADA';
  startDate: string;
  endDate: string;
  votingDate: string;
  quorumMinimum: number;
  maxSelectionsPerBallot: number;
  totalBallots: number;
  validBallots: number;
  blankBallots: number;
  nullBallots: number;
  validPercentage: number;
  blankPercentage: number;
  nullPercentage: number;
  totalVotesAccumulated: number;
  candidatesCount: number;
  winningCandidate?: {
    id: string;
    fullName: string;
    photoUrl?: string;
    votesCount: number;
    votesPercentage: number;
  } | null;
  topCandidates: Array<{
    id: string;
    fullName: string;
    votesCount: number;
    votesPercentage: number;
    photoUrl?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  isCurrent?: boolean;
}

export interface ElectionSignatory {
  name: string;
  ci: string;
  role: string;
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

export const CANDIDATE_PHOTO_MAP: Record<number, string> = {
  1: '/elections/karel_rivero.jpg',
  2: '/elections/miguel_chavez.jpg',
  3: '/elections/alvaro_mendoza.jpg',
  4: '/elections/edwin_portocarrero.jpg',
  5: '/elections/mauricio_galindo.jpg',
  6: '/elections/ramiro_vega.jpg',
  7: '/elections/marco_salinas.jpg',
  8: '/elections/carlos_poma.jpg',
  9: '/elections/emilio_barea.jpg',
  10: '/elections/guido_perez.jpg',
  11: '/elections/santiago_goitia.jpg',
};

export function isSpecialOrganCandidate(c: CandidateDto): boolean {
  const pos = (c.position || '').toUpperCase();
  return (
    pos.includes('COMIT') ||
    pos.includes('TRIBUNAL') ||
    pos.includes('HONOR') ||
    c.orderIndex >= 10
  );
}

export function isDirectorioCandidate(c: CandidateDto): boolean {
  return !isSpecialOrganCandidate(c);
}

