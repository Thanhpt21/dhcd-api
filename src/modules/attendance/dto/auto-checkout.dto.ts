// src/attendance/dto/auto-checkout.dto.ts

// Định nghĩa interface cho dữ liệu thô từ Prisma
interface RawAttendanceData {
  id: number;
  meetingId: number;
  shareholderId: number;
  checkinTime: Date;
  checkoutTime: Date | null;
  checkinMethod: string;
  notes?: string | null;
  createdAt: Date;
  shareholder: {
    id: number;
    shareholderCode: string;
    fullName: string;
    email: string;
    totalShares: number;
  };
}

export class CheckedOutAttendanceDto {
  id: number;
  meetingId: number;
  shareholderId: number;
  checkinTime: Date;
  checkoutTime: Date;
  checkinMethod: string;
  notes?: string;
  createdAt: Date;
  shareholder: {
    id: number;
    shareholderCode: string;
    fullName: string;
    email: string;
    totalShares: number;
  };

  constructor(attendance: RawAttendanceData) {
    this.id = attendance.id;
    this.meetingId = attendance.meetingId;
    this.shareholderId = attendance.shareholderId;
    this.checkinTime = attendance.checkinTime;
    this.checkoutTime = attendance.checkoutTime as Date; // Ép kiểu vì chắc chắn có checkoutTime
    this.checkinMethod = attendance.checkinMethod;
    this.notes = attendance.notes ?? undefined;
    this.createdAt = attendance.createdAt;
    this.shareholder = {
      id: attendance.shareholder.id,
      shareholderCode: attendance.shareholder.shareholderCode,
      fullName: attendance.shareholder.fullName,
      email: attendance.shareholder.email,
      totalShares: attendance.shareholder.totalShares
    };
  }
}

export class AutoCheckoutResultDto {
  totalCheckedOut: number;
  checkedOutAttendances?: CheckedOutAttendanceDto[];

  constructor(totalCheckedOut: number, checkedOutAttendances?: RawAttendanceData[]) {
    this.totalCheckedOut = totalCheckedOut;
    this.checkedOutAttendances = checkedOutAttendances?.map(
      attendance => new CheckedOutAttendanceDto(attendance)
    );
  }
}

export class AutoCheckoutStatusDto {
  meetingDuration: number;
  expiringAttendances: any[];
  expiredAttendances: any[];
  totalExpiring: number;
  totalExpired: number;

  constructor(
    meetingDuration: number,
    expiringAttendances: any[],
    expiredAttendances: any[]
  ) {
    this.meetingDuration = meetingDuration;
    this.expiringAttendances = expiringAttendances;
    this.expiredAttendances = expiredAttendances;
    this.totalExpiring = expiringAttendances.length;
    this.totalExpired = expiredAttendances.length;
  }
}