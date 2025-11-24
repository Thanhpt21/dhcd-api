export class VotingResultResponseDto {
  id: number;
  resolutionId: number;
  candidateId?: number;
  shareholderId: number;
  voteType: string;
  sharesUsed: number;
  votingMethod: string;
  createdAt: Date;

  constructor(result: any) {
    this.id = result.id;
    this.resolutionId = result.resolutionId;
    this.candidateId = result.candidateId ?? undefined;
    this.shareholderId = result.shareholderId;
    this.voteType = result.voteType;
    this.sharesUsed = result.sharesUsed;
    this.votingMethod = result.votingMethod;
    this.createdAt = result.createdAt;
  }
}