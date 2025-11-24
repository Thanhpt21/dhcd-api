import { IsString, IsInt, IsDate, IsOptional, IsEnum, IsBoolean, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateShareholderDto {
  @IsOptional()
  @IsString()
  shareholderCode?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  idNumber?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  idIssueDate?: Date;

  @IsOptional()
  @IsString()
  idIssuePlace?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateOfBirth?: Date;

  @IsOptional()
  @IsString()
  @IsEnum(['MALE', 'FEMALE', 'OTHER'])
  gender?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  taxCode?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsInt()
  totalShares?: number;

  @IsOptional()
  @IsString()
  @IsEnum(['COMMON', 'PREFERRED'])
  shareType?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}