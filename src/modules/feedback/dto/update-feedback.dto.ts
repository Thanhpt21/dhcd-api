import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export class UpdateFeedbackDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['GENERAL', 'ORGANIZATION', 'PROCESS', 'FACILITY', 'SERVICE', 'OTHER'])
  category?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  adminNotes?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['PENDING', 'UNDER_REVIEW', 'PROCESSING', 'RESOLVED', 'REJECTED', 'ARCHIVED'])
  status?: string;
}