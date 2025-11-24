export class QuestionResponseDto {
  id: number;
  meetingId: number;
  shareholderId: number;
  questionCode: string;
  questionText: string;
  questionType: string;
  priority: string;
  status: string;
  isSelected: boolean;
  adminNotes?: string;
  answerText?: string;
  answeredBy?: string;
  answeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(question: any) {
    this.id = question.id;
    this.meetingId = question.meetingId;
    this.shareholderId = question.shareholderId;
    this.questionCode = question.questionCode;
    this.questionText = question.questionText;
    this.questionType = question.questionType;
    this.priority = question.priority;
    this.status = question.status;
    this.isSelected = question.isSelected;
    this.adminNotes = question.adminNotes ?? undefined;
    this.answerText = question.answerText ?? undefined;
    this.answeredBy = question.answeredBy ?? undefined;
    this.answeredAt = question.answeredAt ?? undefined;
    this.createdAt = question.createdAt;
    this.updatedAt = question.updatedAt;
  }
}