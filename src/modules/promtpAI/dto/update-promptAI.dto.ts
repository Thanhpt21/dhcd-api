import { PromptAIStatus } from '@prisma/client';
import { IsString, IsOptional, IsInt, IsDateString, IsEnum } from 'class-validator';

export class UpdatePromptAIDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsInt()
  position?: number;

  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @IsOptional()
  @IsDateString()
  endDate?: Date;

   @IsOptional()
   @IsEnum(PromptAIStatus)
   status?: PromptAIStatus; 
}
