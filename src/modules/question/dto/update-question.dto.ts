import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  questionText?: string;

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
  adminNotes?: string;

  @IsOptional()
  @IsString()
  answerText?: string;

  @IsOptional()
  @IsString()
  answeredBy?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['PENDING', 'UNDER_REVIEW', 'ANSWERED', 'REJECTED', 'ARCHIVED'])
  status?: string;
}