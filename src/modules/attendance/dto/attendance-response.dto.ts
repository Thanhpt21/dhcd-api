export class AttendanceResponseDto {
  id: number;
  meetingId: number;
  shareholderId: number;
  checkinTime: Date;
  checkoutTime?: Date;
  checkinMethod: string;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
  createdAt: Date;

  constructor(attendance: any) {
    this.id = attendance.id;
    this.meetingId = attendance.meetingId;
    this.shareholderId = attendance.shareholderId;
    this.checkinTime = attendance.checkinTime;
    this.checkoutTime = attendance.checkoutTime ?? undefined;
    this.checkinMethod = attendance.checkinMethod;
    this.ipAddress = attendance.ipAddress ?? undefined;
    this.userAgent = attendance.userAgent ?? undefined;
    this.notes = attendance.notes ?? undefined;
    this.createdAt = attendance.createdAt;
  }
}