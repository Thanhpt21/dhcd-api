export class AgendaResponseDto {
  id: number;
  meetingId: number;
  agendaCode: string;
  title: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  speaker?: string;
  presentationUrl?: string;
  displayOrder: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(agenda: any) {
    this.id = agenda.id;
    this.meetingId = agenda.meetingId;
    this.agendaCode = agenda.agendaCode;
    this.title = agenda.title;
    this.description = agenda.description ?? undefined;
    this.startTime = agenda.startTime ?? undefined;
    this.endTime = agenda.endTime ?? undefined;
    this.duration = agenda.duration ?? undefined;
    this.speaker = agenda.speaker ?? undefined;
    this.presentationUrl = agenda.presentationUrl ?? undefined;
    this.displayOrder = agenda.displayOrder;
    this.status = agenda.status;
    this.createdAt = agenda.createdAt;
    this.updatedAt = agenda.updatedAt;
  }
}