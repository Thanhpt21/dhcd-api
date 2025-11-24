import { Type } from 'class-transformer';
import { IsString, IsInt, IsOptional, IsEnum, IsObject } from 'class-validator';

export enum ReportType {
  MEETING_SUMMARY = 'MEETING_SUMMARY',
  ATTENDANCE_REPORT = 'ATTENDANCE_REPORT',
  VOTING_RESULTS = 'VOTING_RESULTS',
  REGISTRATION_STATS = 'REGISTRATION_STATS',
  QUESTION_ANALYTICS = 'QUESTION_ANALYTICS',
  SHAREHOLDER_ANALYSIS = 'SHAREHOLDER_ANALYSIS',
  FINAL_SUMMARY = 'FINAL_SUMMARY'
}

export class GenerateReportDto {
  @IsString()
  reportName: string;

   @IsInt()
  @Type(() => Number)
  meetingId: number;

  @IsInt()
  @Type(() => Number)
  templateId: number;

  @IsString()
  reportFormat: string;

  @IsObject()
  @IsOptional()
  filters?: Record<string, any>;
}