import { Shareholder } from '@prisma/client';

export class ShareholderResponseDto {
  id: number;
  shareholderCode: string;
  fullName: string;
  idNumber: string;
  idIssueDate?: Date;
  idIssuePlace?: string;
  dateOfBirth?: Date;
  gender?: string;
  nationality?: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  taxCode?: string;
  bankAccount?: string;
  bankName?: string;
  totalShares: number;
  shareType: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(shareholder: Shareholder) {
    this.id = shareholder.id;
    this.shareholderCode = shareholder.shareholderCode;
    this.fullName = shareholder.fullName;
    this.idNumber = shareholder.idNumber;
    this.idIssueDate = shareholder.idIssueDate ?? undefined;
    this.idIssuePlace = shareholder.idIssuePlace ?? undefined;
    this.dateOfBirth = shareholder.dateOfBirth ?? undefined;
    this.gender = shareholder.gender ?? undefined;
    this.nationality = shareholder.nationality ?? undefined;
    this.email = shareholder.email;
    this.phoneNumber = shareholder.phoneNumber ?? undefined;
    this.address = shareholder.address ?? undefined;
    this.taxCode = shareholder.taxCode ?? undefined;
    this.bankAccount = shareholder.bankAccount ?? undefined;
    this.bankName = shareholder.bankName ?? undefined;
    this.totalShares = shareholder.totalShares;
    this.shareType = shareholder.shareType;
    this.isActive = shareholder.isActive;
    this.createdAt = shareholder.createdAt;
    this.updatedAt = shareholder.updatedAt;
  }
}