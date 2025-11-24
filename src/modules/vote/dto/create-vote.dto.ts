import { IsInt, IsString, IsOptional, IsEnum, IsArray, IsObject, ValidateIf, IsNotEmpty } from 'class-validator';

// src/votes/dto/create-vote.dto.ts
export class CreateVoteDto {
  @IsInt()
  resolutionId: number;

  @IsInt()
  meetingId: number;

  @IsString()
  verificationCode: string; // Thêm verificationCode

  // For YES_NO voting
  
  @IsNotEmpty()
  voteValue: string;

  // For MULTIPLE_CHOICE voting
  @ValidateIf(o => !o.voteValue && !o.ranking)
  @IsArray()
  @IsString({ each: true })
  candidateCodes?: string[];

  // For RANKING voting
  @ValidateIf(o => !o.voteValue && !o.candidateCodes)
  @IsObject()
  ranking?: Record<string, number>;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}