import { IsInt, IsString, IsOptional, IsEnum, IsBoolean, IsDateString } from 'class-validator';

export class CreateVerificationLinkDto {
  @IsInt()
  meetingId: number;

  @IsInt()
  shareholderId: number;

  @IsString()
  verificationCode: string;

  @IsOptional()
  @IsString()
  @IsEnum(['REGISTRATION', 'ATTENDANCE'])
  verificationType?: string;

  @IsOptional()
  @IsString()
  qrCodeUrl?: string;

  @IsOptional()
  @IsString()
  verificationUrl?: string;

  @IsDateString()
  expiresAt: string;

  @IsOptional()
  @IsBoolean()
  isUsed?: boolean;
}