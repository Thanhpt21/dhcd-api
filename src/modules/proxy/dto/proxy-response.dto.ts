export class ProxyResponseDto {
  id: number;
  meetingId: number;
  shareholderId: number;
  proxyPersonId: number;
  shares: number;
  startDate: Date;
  endDate: Date;
  status: string;
  reason?: string;
  documentUrl?: string;
  approvedBy?: number;
  approvedAt?: Date;
  rejectedReason?: string;
  createdAt: Date;
  updatedAt: Date;

  meeting?: {
    id: number;
    meetingCode: string;
    meetingName: string;
  };

  shareholder?: {
    id: number;
    shareholderCode: string;
    fullName: string;
    email: string;
  };

  proxyPerson?: {
    id: number;
    shareholderCode: string;
    fullName: string;
    email: string;
    idNumber: string;
  };

  approvedByUser?: {
    id: number;
    name: string;
    email: string;
  };

  constructor(proxy: any) {
    this.id = proxy.id;
    this.meetingId = proxy.meetingId;
    this.shareholderId = proxy.shareholderId;
    this.proxyPersonId = proxy.proxyPersonId;
    this.shares = proxy.shares;
    this.startDate = proxy.startDate;
    this.endDate = proxy.endDate;
    this.status = proxy.status;
    this.reason = proxy.reason ?? undefined;
    this.documentUrl = proxy.documentUrl ?? undefined;
    this.approvedBy = proxy.approvedBy ?? undefined;
    this.approvedAt = proxy.approvedAt ?? undefined;
    this.rejectedReason = proxy.rejectedReason ?? undefined;
    this.createdAt = proxy.createdAt;
    this.updatedAt = proxy.updatedAt;

    if (proxy.meeting) {
      this.meeting = {
        id: proxy.meeting.id,
        meetingCode: proxy.meeting.meetingCode,
        meetingName: proxy.meeting.meetingName
      };
    }

    if (proxy.shareholder) {
      this.shareholder = {
        id: proxy.shareholder.id,
        shareholderCode: proxy.shareholder.shareholderCode,
        fullName: proxy.shareholder.fullName,
        email: proxy.shareholder.email
      };
    }

    if (proxy.proxyPerson) {
      this.proxyPerson = {
        id: proxy.proxyPerson.id,
        shareholderCode: proxy.proxyPerson.shareholderCode,
        fullName: proxy.proxyPerson.fullName,
        email: proxy.proxyPerson.email,
        idNumber: proxy.proxyPerson.idNumber
      };
    }

    if (proxy.approvedByUser) {
      this.approvedByUser = {
        id: proxy.approvedByUser.id,
        name: proxy.approvedByUser.name,
        email: proxy.approvedByUser.email
      };
    }
  }
}