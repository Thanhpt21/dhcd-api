// src/email/dto/send-email.dto.ts
import { IsString, IsEmail, IsOptional, IsObject, IsArray, IsInt } from 'class-validator';

export class SendEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  templateName: string;

  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsArray()
  @IsOptional()
  bcc?: string[];

  @IsInt()
  @IsOptional()
  shareholderId?: number;

  @IsInt()
  @IsOptional()
  meetingId?: number;
}

export class SendBulkEmailDto {
  @IsArray()
  shareholderIds: number[];

  @IsString()
  templateName: string;

  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;

  @IsInt()
  @IsOptional()
  meetingId?: number;
}