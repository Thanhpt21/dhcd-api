import { IsInt, IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export enum DataType {
  STRING = 'STRING',
  NUMBER = 'NUMBER', 
  BOOLEAN = 'BOOLEAN',
  JSON = 'JSON',
  DATE = 'DATE'
}

export class CreateMeetingSettingDto {
  @IsInt()
  meetingId: number;

  @IsString()
  key: string;

  @IsString()
  value: string;

  @IsEnum(DataType)
  @IsOptional()
  dataType?: DataType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}