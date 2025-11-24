import { IsInt, IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { MinuteStatus } from './create-meeting-minute.dto';

export class UpdateMeetingMinuteDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

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
  @IsOptional()
  approvedBy?: number;
}