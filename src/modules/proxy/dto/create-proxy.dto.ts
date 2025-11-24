import { IsInt, IsNotEmpty, IsNumber, IsString, IsDateString, IsOptional, IsEnum, Min } from 'class-validator';
import { ProxyStatus } from '@prisma/client';

export class CreateProxyDto {
  @IsInt()
  @IsNotEmpty()
  meetingId: number;

  @IsInt()
  @IsNotEmpty()
  shareholderId: number;

  @IsInt()
  @IsNotEmpty()
  proxyPersonId: number;

  @IsNumber()
  @Min(1)
  shares: number;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsEnum(ProxyStatus)
  @IsOptional()
  status?: ProxyStatus;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsOptional()
  documentUrl?: Express.Multer.File;

  @IsInt()
  @IsOptional()
  approvedBy?: number;

  @IsInt()
  @IsOptional()
  createdBy?: number;
}