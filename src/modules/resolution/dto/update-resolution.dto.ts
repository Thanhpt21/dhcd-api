import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, IsInt } from 'class-validator';

export class UpdateResolutionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  resolutionType?: string;

@IsOptional()
  @IsString()
  resolutionCode?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['YES_NO', 'MULTIPLE_CHOICE', 'RANKING'])
  votingMethod?: string;

  @IsOptional()
  @IsNumber()
  approvalThreshold?: number;

  @IsOptional()
  @IsInt()
  maxChoices?: number;

  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}