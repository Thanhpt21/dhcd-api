import { IsInt, IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export class CreateFeedbackDto {
  @IsInt()
  meetingId: number;

  @IsInt()
  shareholderId: number;

  @IsString()
  feedbackCode: string;

  @IsString()
  title: string;

  @IsString()
  content: string;

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
}