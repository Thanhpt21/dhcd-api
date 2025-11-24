import { IsInt, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateCandidateDto {
  @IsInt()
  resolutionId: number;

  @IsString()
  candidateCode: string;

  @IsString()
  candidateName: string;

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