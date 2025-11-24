export class VoteResponseDto {
  id: number;
  resolutionId: number;
  shareholderId: number;
  shareholderCode: string; 
  meetingId: number;
  voteValue: string;
  sharesUsed: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;

  constructor(vote: any, shareholderCode?: string) {
    this.id = vote.id;
    this.resolutionId = vote.resolutionId;
    this.shareholderId = vote.shareholderId;
    this.shareholderCode = shareholderCode || '';
    this.meetingId = vote.meetingId;
    this.voteValue = vote.voteValue;
    this.sharesUsed = vote.sharesUsed;
    this.ipAddress = vote.ipAddress ?? undefined;
    this.userAgent = vote.userAgent ?? undefined;
    this.createdAt = vote.createdAt;
  }
}