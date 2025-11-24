export class NotificationResponseDto {
  id: number;
  userId?: number;
  shareholderId?: number; // ✅ THÊM
  meetingId?: number;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  isSent: boolean;
  sentAt?: Date;
  readAt?: Date;
  createdAt: Date;

  user?: {
    id: number;
    name: string;
    email: string;
  };

  shareholder?: { // ✅ THÊM
    id: number;
    shareholderCode: string;
    fullName: string;
    email: string;
  };

  meeting?: {
    id: number;
    meetingCode: string;
    meetingName: string;
  };

  constructor(notification: any) {
    this.id = notification.id;
    this.userId = notification.userId ?? undefined;
    this.shareholderId = notification.shareholderId ?? undefined; // ✅ THÊM
    this.meetingId = notification.meetingId ?? undefined;
    this.type = notification.type;
    this.title = notification.title;
    this.message = notification.message;
    this.data = notification.data ?? undefined;
    this.isRead = notification.isRead;
    this.isSent = notification.isSent;
    this.sentAt = notification.sentAt ?? undefined;
    this.readAt = notification.readAt ?? undefined;
    this.createdAt = notification.createdAt;

    if (notification.user) {
      this.user = {
        id: notification.user.id,
        name: notification.user.name,
        email: notification.user.email
      };
    }

    if (notification.shareholder) { 
      this.shareholder = {
        id: notification.shareholder.id,
        shareholderCode: notification.shareholder.shareholderCode,
        fullName: notification.shareholder.fullName,
        email: notification.shareholder.email
      };
    }

    if (notification.meeting) {
      this.meeting = {
        id: notification.meeting.id,
        meetingCode: notification.meeting.meetingCode,
        meetingName: notification.meeting.meetingName
      };
    }
  }
}