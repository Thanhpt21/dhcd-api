// src/resolution-options/dto/update-option.dto.ts
import { IsString, IsOptional, IsInt } from 'class-validator';

export class UpdateOptionDto {
  @IsOptional()
  @IsString()
  optionCode?: string;

  @IsOptional()
  @IsString()
  optionText?: string;

  @IsOptional()
  @IsString()
  optionValue?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  displayOrder?: number;
}