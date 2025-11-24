export class FeedbackResponseDto {
  id: number;
  meetingId: number;
  shareholderId: number;
  feedbackCode: string;
  title: string;
  content: string;
  category?: string;
  priority: string;
  status: string;
  isPublic: boolean;
  adminNotes?: string;
  reviewedBy?: number;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(feedback: any) {
    this.id = feedback.id;
    this.meetingId = feedback.meetingId;
    this.shareholderId = feedback.shareholderId;
    this.feedbackCode = feedback.feedbackCode;
    this.title = feedback.title;
    this.content = feedback.content;
    this.category = feedback.category ?? undefined;
    this.priority = feedback.priority;
    this.status = feedback.status;
    this.isPublic = feedback.isPublic;
    this.adminNotes = feedback.adminNotes ?? undefined;
    this.reviewedBy = feedback.reviewedBy ?? undefined;
    this.reviewedAt = feedback.reviewedAt ?? undefined;
    this.createdAt = feedback.createdAt;
    this.updatedAt = feedback.updatedAt;
  }
}