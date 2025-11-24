import { ProxyStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, IsString, IsOptional, IsEnum, IsDateString, IsNumber, Min } from 'class-validator';


export class UpdateProxyDto {
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number) // Thêm transform để convert string -> number
  shares?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

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

  @IsString()
  @IsOptional()
  rejectedReason?: string;
}