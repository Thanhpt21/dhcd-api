// src/attendance/interfaces/attendance.interface.ts
export interface ShareholderBasic {
  id: number;
  shareholderCode: string;
  fullName: string;
  email: string;
  totalShares: number;
}

export interface AttendanceWithShareholder {
  id: number;
  meetingId: number;
  shareholderId: number;
  checkinTime: Date;
  checkoutTime: Date | null;
  checkinMethod: string;
  notes?: string | null;
  createdAt: Date;
  shareholder: ShareholderBasic;
}

export interface ExpiringAttendance extends AttendanceWithShareholder {
  status: 'WARNING';
  timeRemaining: number;
}

export interface ExpiredAttendance extends AttendanceWithShareholder {
  status: 'EXPIRED';
  timeExceeded: number;
}