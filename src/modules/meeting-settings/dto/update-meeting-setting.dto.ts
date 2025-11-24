import { IsInt, IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { DataType } from './create-meeting-setting.dto';

export class UpdateMeetingSettingDto {
  @IsInt()
  @IsOptional()
  meetingId?: number;

  @IsString()
  @IsOptional()
  key?: string;

  @IsString()
  @IsOptional()
  value?: string;

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