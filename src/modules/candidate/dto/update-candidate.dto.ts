import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class UpdateCandidateDto {
  @IsOptional()
  @IsString()
  candidateCode?: string;

  @IsOptional()
  @IsString()
  candidateName?: string;

  @IsOptional()
  @IsString()
  candidateInfo?: string;

  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isElected?: boolean;
}