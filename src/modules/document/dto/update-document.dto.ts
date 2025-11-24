// src/documents/dto/update-document.dto.ts
import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber } from 'class-validator';

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  title?: string;

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