import { IsInt, IsString, IsOptional, IsBoolean, IsEnum, IsObject } from 'class-validator';

export enum NotificationType {
  REGISTRATION_APPROVED = 'REGISTRATION_APPROVED',
  REGISTRATION_REJECTED = 'REGISTRATION_REJECTED',
  VOTE_REMINDER = 'VOTE_REMINDER',
  MEETING_REMINDER = 'MEETING_REMINDER',
  MEETING_UPDATED = 'MEETING_UPDATED',
  VOTING_RESULT = 'VOTING_RESULT',
  QUESTION_ANSWERED = 'QUESTION_ANSWERED',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT'
}

export class CreateNotificationDto {
  @IsInt()
  @IsOptional()
  userId?: number;

  @IsInt()
  @IsOptional()
  shareholderId?: number; 

  @IsInt()
  @IsOptional()
  meetingId?: number;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isSent?: boolean;
}