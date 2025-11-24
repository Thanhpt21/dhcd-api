export class DocumentResponseDto {
  id: number;
  meetingId: number;
  documentCode: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: string;
  isPublic: boolean;
  displayOrder: number;
  uploadedBy: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(document: any) {
    this.id = document.id;
    this.meetingId = document.meetingId;
    this.documentCode = document.documentCode;
    this.title = document.title;
    this.description = document.description ?? undefined;
    this.fileUrl = document.fileUrl;
    this.fileType = document.fileType;
    this.fileSize = document.fileSize;
    this.category = document.category;
    this.isPublic = document.isPublic;
    this.displayOrder = document.displayOrder;
    this.uploadedBy = document.uploadedBy;
    this.createdAt = document.createdAt;
    this.updatedAt = document.updatedAt;
  }
}