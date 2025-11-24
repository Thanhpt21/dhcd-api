import { IsInt, IsString, IsOptional, IsEnum, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAgendaDto {
  @IsInt()
  meetingId: number;

  @IsString()
  agendaCode: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsString()
  speaker?: string;

  @IsOptional()
  @IsString()
  presentationUrl?: string;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @IsOptional()
  @IsString()
  @IsEnum(['PENDING', 'ONGOING', 'COMPLETED', 'CANCELLED', 'DELAYED'])
  status?: string;
}