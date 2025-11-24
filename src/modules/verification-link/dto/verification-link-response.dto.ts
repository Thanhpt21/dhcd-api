export class VerificationLinkResponseDto {
  id: number;
  meetingId: number;
  shareholderId: number;
  verificationCode: string;
  qrCodeUrl?: string;
  verificationType: string;
  verificationUrl?: string;
  expiresAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  usedIp?: string;
  usedDevice?: string;
  emailSent: boolean; // THÊM
  emailSentAt?: Date; // THÊM
  createdAt: Date;

  constructor(link: any) {
    this.id = link.id;
    this.meetingId = link.meetingId;
    this.shareholderId = link.shareholderId;
    this.verificationCode = link.verificationCode;
    this.qrCodeUrl = link.qrCodeUrl ?? undefined;
    this.verificationType = link.verificationType;
    this.verificationUrl = link.verificationUrl ?? undefined;
    this.expiresAt = link.expiresAt;
    this.isUsed = link.isUsed;
    this.usedAt = link.usedAt ?? undefined;
    this.usedIp = link.usedIp ?? undefined;
    this.usedDevice = link.usedDevice ?? undefined;
    this.emailSent = link.emailSent ?? false; // THÊM
    this.emailSentAt = link.emailSentAt ?? undefined; // THÊM
    this.createdAt = link.createdAt;
  }
}