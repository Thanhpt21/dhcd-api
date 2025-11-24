// src/documents/dto/create-document.dto.ts
import { IsInt, IsString, IsOptional, IsEnum, IsBoolean, IsNumber } from 'class-validator';

export class CreateDocumentDto {
  @IsInt()
  meetingId: number;

  @IsString()
  documentCode: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['FINANCIAL_REPORT', 'RESOLUTION', 'MINUTES', 'PRESENTATION', 'GUIDE', 'OTHER'])
  category?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;

}