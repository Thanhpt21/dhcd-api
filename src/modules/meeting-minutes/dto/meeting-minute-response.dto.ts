export class MeetingMinuteResponseDto {
  id: number;
  meetingId: number;
  title: string;
  content: string;
  attachments?: Record<string, any>;
  version: string;
  status: string;
  createdBy: number;
  approvedBy?: number;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  meeting?: {
    id: number;
    meetingCode: string;
    meetingName: string;
  };

  createdByUser?: {
    id: number;
    name: string;
    email: string;
  };

  approvedByUser?: {
    id: number;
    name: string;
    email: string;
  };

  constructor(minute: any) {
    this.id = minute.id;
    this.meetingId = minute.meetingId;
    this.title = minute.title;
    this.content = minute.content;
    this.attachments = minute.attachments ?? undefined;
    this.version = minute.version;
    this.status = minute.status;
    this.createdBy = minute.createdBy;
    this.approvedBy = minute.approvedBy ?? undefined;
    this.approvedAt = minute.approvedAt ?? undefined;
    this.createdAt = minute.createdAt;
    this.updatedAt = minute.updatedAt;

    if (minute.meeting) {
      this.meeting = {
        id: minute.meeting.id,
        meetingCode: minute.meeting.meetingCode,
        meetingName: minute.meeting.meetingName
      };
    }

    if (minute.createdByUser) {
      this.createdByUser = {
        id: minute.createdByUser.id,
        name: minute.createdByUser.name,
        email: minute.createdByUser.email
      };
    }

    if (minute.approvedByUser) {
      this.approvedByUser = {
        id: minute.approvedByUser.id,
        name: minute.approvedByUser.name,
        email: minute.approvedByUser.email
      };
    }
  }
}