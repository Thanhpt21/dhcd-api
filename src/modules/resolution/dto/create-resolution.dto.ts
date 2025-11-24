import { IsInt, IsString, IsNumber, IsBoolean, IsOptional, IsEnum } from 'class-validator';

export class CreateResolutionDto {
  @IsInt()
  meetingId: number;

  @IsString()
  resolutionCode: string;

  @IsInt()
  resolutionNumber: number;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsString()
  resolutionType: string;

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