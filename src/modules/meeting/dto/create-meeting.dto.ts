import { IsString, IsInt, IsDate, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMeetingDto {
  @IsString()
  meetingCode: string;

  @IsString()
  meetingName: string;

  @IsString()
  meetingType: string;

  @IsDate()
  @Type(() => Date)
  meetingDate: Date;

  @IsOptional()
  @IsString()
  meetingLocation?: string;

  @IsOptional()
  @IsString()
  meetingAddress?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['DRAFT', 'SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'])
  status?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  registrationStart?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  registrationEnd?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  votingStart?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  votingEnd?: Date;

  @IsOptional()
  @IsNumber()
  totalShares?: number;

  @IsOptional()
  @IsInt()
  totalShareholders?: number;

  @IsInt()
  createdBy: number;
}