import { IsString, IsOptional, IsInt, IsDateString, IsEnum } from 'class-validator';
import { PromptAIStatus } from '@prisma/client';  // Import enum từ Prisma

export class CreatePromptAIDto {
  @IsString()
  name: string;

  @IsString()
  text: string;

  @IsInt()
  position: number;

  @IsDateString()
  startDate: Date;

  @IsDateString()
  endDate: Date;

  @IsOptional()
  @IsEnum(PromptAIStatus)
  status?: PromptAIStatus; 
}
