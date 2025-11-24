import { IsInt, IsDate, IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAttendanceDto {
  @IsInt()
  meetingId: number;

  @IsInt()
  shareholderId: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  checkinTime?: Date;

  @IsOptional()
  @IsString()
  @IsEnum(['QR_CODE', 'MANUAL', 'FACE_RECOGNITION'])
  checkinMethod?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}