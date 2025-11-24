export class ResolutionResponseDto {
  id: number;
  meetingId: number;
  resolutionCode: string;
  resolutionNumber: number;
  title: string;
  content: string;
  resolutionType: string;
  votingMethod: string;
  approvalThreshold: number;
  maxChoices: number;
  displayOrder: number;
  isActive: boolean;
  totalVotes: number;
  yesVotes: number;
  noVotes: number;
  abstainVotes: number;
  createdAt: Date;
  updatedAt: Date;
  options: any[];
  candidates: any[];

  constructor(resolution: any) {
    this.id = resolution.id;
    this.meetingId = resolution.meetingId;
    this.resolutionCode = resolution.resolutionCode;
    this.resolutionNumber = resolution.resolutionNumber;
    this.title = resolution.title;
    this.content = resolution.content;
    this.resolutionType = resolution.resolutionType;
    this.votingMethod = resolution.votingMethod;
    this.approvalThreshold = resolution.approvalThreshold;
    this.maxChoices = resolution.maxChoices;
    this.displayOrder = resolution.displayOrder;
    this.isActive = resolution.isActive;
    this.totalVotes = resolution.totalVotes;
    this.yesVotes = resolution.yesVotes;
    this.noVotes = resolution.noVotes;
    this.abstainVotes = resolution.abstainVotes;
    this.createdAt = resolution.createdAt;
    this.updatedAt = resolution.updatedAt;
    this.options = resolution.options || [];
    this.candidates = resolution.candidates || [];
  }
}