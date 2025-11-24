import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ContactStatus } from '@prisma/client';

export class CreateContactDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;
}
