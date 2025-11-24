import { IsInt, IsString, IsOptional, IsBoolean, IsEnum, IsObject } from 'class-validator';
import { NotificationType } from './create-notification.dto';

export class UpdateNotificationDto {
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
  @IsOptional()
  type?: NotificationType;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @IsBoolean()
  @IsOptional()
  isSent?: boolean;
}