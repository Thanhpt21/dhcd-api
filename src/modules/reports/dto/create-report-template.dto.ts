import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateReportTemplateDto {
  @IsString()
  templateName: string;

  @IsString()
  templateType: string;

  @IsString()
  @IsOptional()
  templateFile?: string;

  @IsString()
  outputFormat: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}