import { IsString, IsOptional, IsEnum, IsDateString, IsNumber } from 'class-validator';

export class UpdateAgendaDto {
  @IsOptional()
  @IsString()
  title?: string;

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