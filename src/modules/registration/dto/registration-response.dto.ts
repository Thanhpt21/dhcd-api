import { Registration } from '@prisma/client';

export class RegistrationResponseDto {
  id: number;
  meetingId: number;
  shareholderId: number;
  registrationCode: string;
  registrationType: string;
  registrationDate: Date;
  status: string;
  sharesRegistered: number;
  checkinTime?: Date;
  checkinMethod?: string;
  proxyName?: string;
  proxyIdNumber?: string;
  proxyRelationship?: string;
  proxyDocumentUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(registration: Registration) {
    this.id = registration.id;
    this.meetingId = registration.meetingId;
    this.shareholderId = registration.shareholderId;
    this.registrationCode = registration.registrationCode;
    this.registrationType = registration.registrationType;
    this.registrationDate = registration.registrationDate;
    this.status = registration.status;
    this.sharesRegistered = registration.sharesRegistered;
    this.checkinTime = registration.checkinTime ?? undefined;
    this.checkinMethod = registration.checkinMethod ?? undefined;
    this.proxyName = registration.proxyName ?? undefined;
    this.proxyIdNumber = registration.proxyIdNumber ?? undefined;
    this.proxyRelationship = registration.proxyRelationship ?? undefined;
    this.proxyDocumentUrl = registration.proxyDocumentUrl ?? undefined;
    this.notes = registration.notes ?? undefined;
    this.createdAt = registration.createdAt;
    this.updatedAt = registration.updatedAt;
  }
}