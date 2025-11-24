export class CandidateResponseDto {
  id: number;
  resolutionId: number;
  candidateCode: string;
  candidateName: string;
  candidateInfo?: string;
  displayOrder: number;
  voteCount: number;
  isElected: boolean;
  createdAt: Date;

  constructor(candidate: any) {
    this.id = candidate.id;
    this.resolutionId = candidate.resolutionId;
    this.candidateCode = candidate.candidateCode;
    this.candidateName = candidate.candidateName;
    this.candidateInfo = candidate.candidateInfo ?? undefined;
    this.displayOrder = candidate.displayOrder;
    this.voteCount = candidate.voteCount;
    this.isElected = candidate.isElected;
    this.createdAt = candidate.createdAt;
  }
}