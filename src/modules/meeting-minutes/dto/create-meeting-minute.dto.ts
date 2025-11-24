import { IsInt, IsString, IsOptional, IsEnum, IsObject, IsArray } from 'class-validator';

export enum MinuteStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL', 
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export class CreateMeetingMinuteDto {
  @IsInt()
  meetingId: number;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsObject()
  @IsOptional()
  attachments?: Record<string, any>;

  @IsString()
  @IsOptional()
  version?: string;

  @IsEnum(MinuteStatus)
  @IsOptional()
  status?: MinuteStatus;

  @IsInt()
  createdBy: number;

  @IsInt()
  @IsOptional()
  approvedBy?: number;
}