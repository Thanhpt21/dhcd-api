import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateReportTemplateDto {
  @IsString()
  @IsOptional()
  templateName?: string;

  @IsString()
  @IsOptional()
  templateType?: string;

  @IsString()
  @IsOptional()
  templateFile?: string;

  @IsString()
  @IsOptional()
  outputFormat?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}