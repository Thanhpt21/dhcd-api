export class MeetingSettingResponseDto {
  id: number;
  meetingId: number;
  key: string;
  value: string;
  dataType: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(setting: any) {
    this.id = setting.id;
    this.meetingId = setting.meetingId;
    this.key = setting.key;
    this.value = setting.value;
    this.dataType = setting.dataType;
    this.description = setting.description ?? undefined;
    this.isActive = setting.isActive;
    this.createdAt = setting.createdAt;
    this.updatedAt = setting.updatedAt;
  }
}