export type ElectionStatus = 'CONVOCADA' | 'EN_CURSO' | 'FINALIZADA' | 'PROCLAMADA';

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
  votesCount?: number;
  votesPercentage?: number; // Calculado en base a total de boletas registradas
  votesPercentageValid?: number; // Calculado en base a boletas válidas
  rank?: number;
}

export interface RegisterBallotInput {
  electionId: string;
  ballotType: BallotType;
  selectedCandidateIds: string[];
  notes?: string;
  registeredBy?: string;
}

export interface ElectionStatsDto {
  electionId: string;
  electionTitle: string;
  period: string;
  status: ElectionStatus;
  quorumMinimum: number;
  maxSelectionsPerBallot: number;
  totalBallots: number; // N° total de boletas físicas sacadas del ánfora
  validBallots: number;
  validPercentage: number;
  blankBallots: number;
  blankPercentage: number;
  nullBallots: number;
  nullPercentage: number;
  totalVotesAccumulated: number; // Suma de todos los tiqueos/marcas
  candidates: CandidateDto[];
  winningCandidateId?: string | null;
  lastUpdated: string;
}
