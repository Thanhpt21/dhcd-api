import { Meeting } from '@prisma/client';

export class MeetingResponseDto {
  id: number;
  meetingCode: string;
  meetingName: string;
  meetingType: string;
  meetingDate: Date;
  meetingLocation?: string;
  meetingAddress?: string;
  description?: string;
  status: string;
  registrationStart?: Date;
  registrationEnd?: Date;
  votingStart?: Date;
  votingEnd?: Date;
  totalShares: number;
  totalShareholders: number;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(meeting: Meeting) {
    this.id = meeting.id;
    this.meetingCode = meeting.meetingCode;
    this.meetingName = meeting.meetingName;
    this.meetingType = meeting.meetingType;
    this.meetingDate = meeting.meetingDate;
    this.meetingLocation = meeting.meetingLocation ?? undefined;
    this.meetingAddress = meeting.meetingAddress ?? undefined;
    this.description = meeting.description ?? undefined;
    this.status = meeting.status;
    this.registrationStart = meeting.registrationStart ?? undefined;
    this.registrationEnd = meeting.registrationEnd ?? undefined;
    this.votingStart = meeting.votingStart ?? undefined;
    this.votingEnd = meeting.votingEnd ?? undefined;
    this.totalShares = meeting.totalShares;
    this.totalShareholders = meeting.totalShareholders;
    this.createdBy = meeting.createdBy;
    this.createdAt = meeting.createdAt;
    this.updatedAt = meeting.updatedAt;
  }
}