// src/questions/dto/create-question.dto.ts
import { IsInt, IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export class CreateQuestionDto {
  @IsInt()
  meetingId: number;

  @IsString()
  verificationCode: string;

  @IsString()
  questionCode: string;

  @IsString()
  questionText: string;

  @IsOptional()
  @IsString()
  @IsEnum(['GENERAL', 'FINANCIAL', 'OPERATIONAL', 'STRATEGIC', 'OTHER'])
  questionType?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: string;

  @IsOptional()
  @IsBoolean()
  isSelected?: boolean;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}