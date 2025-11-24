import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ContactStatus } from '@prisma/client';

export class UpdateContactDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;
}
