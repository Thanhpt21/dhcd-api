// src/resolution-options/dto/create-option.dto.ts
import { IsInt, IsString, IsOptional } from 'class-validator';

export class CreateOptionDto {
  @IsInt()
  resolutionId: number;

  @IsString()
  optionCode: string;

  @IsString()
  optionText: string;

  @IsString()
  optionValue: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  displayOrder?: number;
}