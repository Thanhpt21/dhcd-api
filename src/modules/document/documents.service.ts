// src/documents/documents.service.ts
import { Injectable, NotFoundException, BadRequestException, StreamableFile } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentResponseDto } from './dto/document-response.dto';
import { Prisma } from '@prisma/client';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService, private uploadService: UploadService) {}

  private convertFormData<T>(dto: any): T {
    const result: any = {};
    
    for (const key in dto) {
      if (dto[key] !== undefined && dto[key] !== null) {
        const value = dto[key];
        
        if (typeof value === 'string') {
          // KHÔNG convert các trường text sang number
          // Danh sách các trường text cần giữ nguyên là string
          const textFields = ['description', 'title', 'documentCode', 'fileUrl', 'category'];
          
          if (textFields.includes(key)) {
            result[key] = value; // Giữ nguyên string
          } else if (value === 'true') {
            result[key] = true;
          } else if (value === 'false') {
            result[key] = false;
          } else if (!isNaN(Number(value)) && value.trim() !== '') {
            // Chỉ convert các trường numeric
            const numericFields = [
              'meetingId', 'fileSize', 'displayOrder', 'uploadedBy',
              'id', 'page', 'limit', 'userId'
            ];
            
            if (numericFields.includes(key)) {
              result[key] = Number(value);
            } else {
              result[key] = value; // Giữ nguyên string
            }
          } else {
            result[key] = value;
          }
        } else {
          result[key] = value;
        }
      }
    }
    
    return result as T;
  }

  async createDocument(
    dto: CreateDocumentDto, 
    file?: Express.Multer.File,
    userId?: number
  ) {
    // SỬA: Dùng convertFormData thay vì gọi đệ quy
    const convertedDto = this.convertFormData<CreateDocumentDto>(dto);
    
    
    const meetingId = Number(convertedDto.meetingId);
    
    // Check if meeting exists
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id: meetingId } 
    });
    if (!meeting) throw new BadRequestException('Cuộc họp không tồn tại');

    // Check if uploader exists
    if (userId) {
      const uploader = await this.prisma.user.findUnique({ 
        where: { id: userId } 
      });
      if (!uploader) throw new BadRequestException('Người upload không tồn tại');
    }

    // Check if document code already exists
    if (convertedDto.documentCode) {
      const existingCode = await this.prisma.document.findFirst({ 
        where: { documentCode: convertedDto.documentCode } 
      });
      if (existingCode) throw new BadRequestException('Mã tài liệu đã tồn tại');
    }

    // Xử lý upload file nếu có
    let fileUrl: string | undefined;
    let fileType: string | undefined;
    let fileSize: number | undefined;

    if (file) {
      // Upload file lên Supabase
      const uploadResult = await this.uploadService.uploadDocument(
        file,
        'meeting-documents',
        `doc_${Date.now()}_${file.originalname}`
      );
      
      if (uploadResult.success && uploadResult.url) {
        fileUrl = uploadResult.url;
        fileType = file.mimetype;
        fileSize = file.size;
      } else {
        throw new BadRequestException(`Upload file thất bại: ${uploadResult.error}`);
      }
    } else {
      throw new BadRequestException('File tài liệu là bắt buộc');
    }

    if (!userId) {
      throw new BadRequestException('User ID là bắt buộc');
    }

    // ĐẢM BẢO description LUÔN LÀ STRING HOẶC NULL
    const description = convertedDto.description !== undefined && convertedDto.description !== null
      ? String(convertedDto.description) 
      : null;

    // ĐẢM BẢO category có giá trị hợp lệ
    const validCategories = ['FINANCIAL_REPORT', 'RESOLUTION', 'MINUTES', 'PRESENTATION', 'GUIDE', 'OTHER'];
    const category = convertedDto.category && validCategories.includes(convertedDto.category)
      ? convertedDto.category
      : 'OTHER';

    const document = await this.prisma.document.create({ 
      data: {
        meetingId: meetingId,
        documentCode: convertedDto.documentCode || `DOC_${Date.now()}`,
        title: convertedDto.title || 'Untitled Document',
        description: description, // Đã được đảm bảo là string
        fileUrl: fileUrl!,
        fileType: fileType!,
        fileSize: fileSize!,
        category: category,
        isPublic: convertedDto.isPublic !== undefined ? Boolean(convertedDto.isPublic) : false,
        displayOrder: convertedDto.displayOrder ? Number(convertedDto.displayOrder) : 0,
        uploadedBy: userId
      }
    });

    return {
      success: true,
      message: 'Tạo tài liệu thành công',
      data: new DocumentResponseDto(document),
    };
  }

  async getDocuments(page = 1, limit = 10, meetingId = '', category = '', isPublic = '', search = '') {
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentWhereInput = {};
    
    if (meetingId) {
      where.meetingId = +meetingId;
    }

    if (category) {
      where.category = category;
    }

    if (isPublic !== '') {
      where.isPublic = isPublic === 'true';
    }

    if (search) {
      where.OR = [
        { documentCode: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    const [documents, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          meeting: {
            select: { id: true, meetingCode: true, meetingName: true }
          },
          uploadedByUser: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách tài liệu thành công',
      data: {
        data: documents.map((d) => ({
          ...new DocumentResponseDto(d),
          meeting: d.meeting,
          uploadedByUser: d.uploadedByUser
        })),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getPublicDocuments(page = 1, limit = 10, meetingId = '', category = '') {
    const skip = (page - 1) * limit;

    const where: Prisma.DocumentWhereInput = {
      isPublic: true
    };
    
    if (meetingId) {
      where.meetingId = +meetingId;
    }

    if (category) {
      where.category = category;
    }

    const [documents, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          meeting: {
            select: { meetingCode: true, meetingName: true }
          }
        }
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách tài liệu công khai thành công',
      data: {
        data: documents.map((d) => ({
          id: d.id,
          documentCode: d.documentCode,
          title: d.title,
          description: d.description,
          fileType: d.fileType,
          fileSize: d.fileSize,
          category: d.category,
          createdAt: d.createdAt,
          meeting: d.meeting
        })),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getDocumentsByMeeting(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const documents = await this.prisma.document.findMany({
      where: { meetingId },
      include: {
        uploadedByUser: {
          select: { name: true, email: true }
        }
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }]
    });

    return {
      success: true,
      message: 'Lấy danh sách tài liệu theo cuộc họp thành công',
      data: documents.map((d) => ({
        ...new DocumentResponseDto(d),
        uploadedByUser: d.uploadedByUser
      })),
    };
  }

  async getDocumentById(id: number) {
    const document = await this.prisma.document.findUnique({ 
      where: { id },
      include: {
        meeting: true,
        uploadedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    if (!document) throw new NotFoundException('Tài liệu không tồn tại');
    
    return {
      success: true,
      message: 'Lấy thông tin tài liệu thành công',
      data: {
        ...new DocumentResponseDto(document),
        meeting: document.meeting,
        uploadedByUser: document.uploadedByUser
      },
    };
  }

  async downloadDocument(id: number) {
    const document = await this.prisma.document.findUnique({ 
      where: { id } 
    });
    
    if (!document) throw new NotFoundException('Tài liệu không tồn tại');

    if (!document.isPublic) {
      throw new BadRequestException('Tài liệu không được công khai');
    }

    return {
      success: true,
      message: 'Download tài liệu thành công',
      data: {
        downloadUrl: document.fileUrl,
        fileName: `${document.documentCode}_${document.title}.${this.getFileExtension(document.fileType)}`,
        fileSize: document.fileSize,
        fileType: document.fileType,
        instructions: 'Sử dụng URL trên để download tài liệu trực tiếp'
      }
    };
  }

  async updateDocument(
    id: number, 
    dto: UpdateDocumentDto,
    file?: Express.Multer.File
  ) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Tài liệu không tồn tại');

    // Convert các field từ FormData sang đúng kiểu dữ liệu
    const convertedDto = this.convertFormData<UpdateDocumentDto>(dto);

    // Xử lý upload file mới nếu có
    let fileUrl: string | undefined;
    let fileType: string | undefined;
    let fileSize: number | undefined;

    if (file) {
      // Upload file mới lên Supabase
      const uploadResult = await this.uploadService.uploadDocument(
        file,
        'meeting-documents',
        `doc_${Date.now()}_${file.originalname}`
      );
      
      if (uploadResult.success && uploadResult.url) {
        fileUrl = uploadResult.url;
        fileType = file.mimetype;
        fileSize = file.size;
        
        // Xóa file cũ nếu có
        if (document.fileUrl && document.fileUrl.includes('supabase.co')) {
          const deleteResult = await this.uploadService.deleteFile(document.fileUrl);
          if (!deleteResult.success) {
            console.warn(`⚠️ Không thể xóa file cũ: ${deleteResult.error}`);
          }
        }
      } else {
        throw new BadRequestException(`Upload file thất bại: ${uploadResult.error}`);
      }
    }

    // Chỉ update các field được cung cấp
    const updateData: any = {};
    
    if (convertedDto.title !== undefined) updateData.title = convertedDto.title;
    if (convertedDto.description !== undefined) updateData.description = convertedDto.description;
    if (convertedDto.category !== undefined) updateData.category = convertedDto.category;
    if (convertedDto.isPublic !== undefined) updateData.isPublic = convertedDto.isPublic;
    if (convertedDto.displayOrder !== undefined) updateData.displayOrder = convertedDto.displayOrder;
    
    // Update file info nếu có file mới
    if (fileUrl) updateData.fileUrl = fileUrl;
    if (fileType) updateData.fileType = fileType;
    if (fileSize) updateData.fileSize = fileSize;

    const updated = await this.prisma.document.update({ 
      where: { id }, 
      data: updateData
    });

    return {
      success: true,
      message: 'Cập nhật tài liệu thành công',
      data: new DocumentResponseDto(updated),
    };
  }

  async toggleDocumentVisibility(id: number) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Tài liệu không tồn tại');

    const updated = await this.prisma.document.update({ 
      where: { id }, 
      data: { isPublic: !document.isPublic } 
    });

    return {
      success: true,
      message: `Tài liệu đã được ${updated.isPublic ? 'công khai' : 'ẩn'}`,
      data: new DocumentResponseDto(updated),
    };
  }

  async updateDocumentOrder(id: number, displayOrder: number) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Tài liệu không tồn tại');

    if (displayOrder < 0) {
      throw new BadRequestException('Thứ tự hiển thị không thể âm');
    }

    const updated = await this.prisma.document.update({ 
      where: { id }, 
      data: { displayOrder } 
    });

    return {
      success: true,
      message: 'Cập nhật thứ tự hiển thị thành công',
      data: new DocumentResponseDto(updated),
    };
  }

  async deleteDocument(id: number) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Tài liệu không tồn tại');

    // Xóa file vật lý từ Supabase
    if (document.fileUrl && document.fileUrl.includes('supabase.co')) {
      const deleteResult = await this.uploadService.deleteFile(document.fileUrl);
      if (!deleteResult.success) {
        console.warn(`⚠️ Không thể xóa file: ${deleteResult.error}`);
      }
    }

    // Xóa record database
    await this.prisma.document.delete({ where: { id } });
    
    return {
      success: true,
      message: 'Xóa tài liệu thành công',
      data: null,
    };
  }

  async getMeetingDocumentStatistics(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id: meetingId },
      include: {
        documents: true
      }
    });
    
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const statistics = {
      totalDocuments: meeting.documents.length,
      publicDocuments: meeting.documents.filter(d => d.isPublic).length,
      privateDocuments: meeting.documents.filter(d => !d.isPublic).length,
      totalFileSize: meeting.documents.reduce((sum, d) => sum + d.fileSize, 0),
      averageFileSize: meeting.documents.length > 0 
        ? (meeting.documents.reduce((sum, d) => sum + d.fileSize, 0) / meeting.documents.length).toFixed(2)
        : 0,
      byCategory: this.groupBy(meeting.documents, 'category'),
      byFileType: this.groupBy(meeting.documents, 'fileType'),
      largestDocument: meeting.documents.length > 0 
        ? meeting.documents.reduce((max, d) => d.fileSize > max.fileSize ? d : max, meeting.documents[0])
        : null
    };

    return {
      success: true,
      message: 'Lấy thống kê tài liệu thành công',
      data: statistics,
    };
  }

  private groupBy(array: any[], key: string) {
    return array.reduce((groups, item) => {
      const group = item[key] || 'Unknown';
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {});
  }

  private getFileExtension(fileType: string): string {
    const extensions: { [key: string]: string } = {
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-powerpoint': 'ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'image/jpeg': 'jpg',
      'image/png': 'png'
    };
    return extensions[fileType] || 'file';
  }

  private getMimeType(fileType: string): string {
    const mimeTypes: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png'
    };
    return mimeTypes[fileType] || 'application/octet-stream';
  }
}