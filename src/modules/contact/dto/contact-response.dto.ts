import { ContactStatus } from '@prisma/client';

export class ContactResponseDto {
  id: number;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: ContactStatus;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ContactResponseDto>) {
    Object.assign(this, partial);
  }
}
