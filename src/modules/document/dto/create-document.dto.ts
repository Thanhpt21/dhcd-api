// src/documents/dto/create-document.dto.ts
import { IsInt, IsString, IsOptional, IsEnum, IsBoolean, IsNumber } from 'class-validator';

// Định nghĩa enum riêng
export enum DocumentCategory {
  FINANCIAL_REPORT = 'FINANCIAL_REPORT',
  RESOLUTION = 'RESOLUTION',
  MINUTES = 'MINUTES',
  PRESENTATION = 'PRESENTATION',
  GUIDE = 'GUIDE',
  OTHER = 'OTHER'
}

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
  @IsEnum(DocumentCategory) // Chỉ dùng @IsEnum, không dùng @IsString
  category?: DocumentCategory;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}