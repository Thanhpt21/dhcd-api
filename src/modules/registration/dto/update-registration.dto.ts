import { IsString, IsInt, IsDate, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRegistrationDto {
  @IsOptional()
  @IsString()
  registrationCode?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['IN_PERSON', 'ONLINE', 'PROXY', 'ABSENT'])
  registrationType?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  registrationDate?: Date;

  @IsOptional()
  @IsString()
  @IsEnum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'])
  status?: string;

  @IsOptional()
  @IsInt()
  sharesRegistered?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  checkinTime?: Date;

  @IsOptional()
  @IsString()
  @IsEnum(['QR_CODE', 'MANUAL', 'FACE_RECOGNITION'])
  checkinMethod?: string;

  @IsOptional()
  @IsString()
  proxyName?: string;

  @IsOptional()
  @IsString()
  proxyIdNumber?: string;

  @IsOptional()
  @IsString()
  proxyRelationship?: string;

  @IsOptional()
  @IsString()
  proxyDocumentUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}