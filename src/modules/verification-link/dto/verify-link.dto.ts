import { IsString, IsOptional, IsIP, IsEmail } from 'class-validator';

export class VerifyLinkDto {
  @IsString()
  verificationCode: string;

  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}