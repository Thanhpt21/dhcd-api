import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { EmailTemplateResponseDto } from './dto/email-template-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class EmailTemplatesService {
  constructor(private prisma: PrismaService) {}

  async createEmailTemplate(dto: CreateEmailTemplateDto) {
    // Check if template name already exists
    const existingTemplate = await this.prisma.emailTemplate.findUnique({
      where: { name: dto.name }
    });
    if (existingTemplate) throw new BadRequestException('Tên template đã tồn tại');

    const emailTemplate = await this.prisma.emailTemplate.create({
      data: {
        name: dto.name,
        subject: dto.subject,
        content: dto.content,
        variables: dto.variables as Prisma.InputJsonValue,
        description: dto.description,
        category: dto.category || 'SYSTEM',
        isActive: dto.isActive ?? true,
        language: dto.language || 'vi'
      }
    });

    return {
      success: true,
      message: 'Tạo email template thành công',
      data: new EmailTemplateResponseDto(emailTemplate),
    };
  }

  async getEmailTemplates(
    page = 1, 
    limit = 10, 
    category = '', 
    isActive = '', 
    language = '', 
    search = ''
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.EmailTemplateWhereInput = {};
    
    if (category) {
      where.category = category;
    }

    if (isActive !== '') {
      where.isActive = isActive === 'true';
    }

    if (language) {
      where.language = language;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { subject: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    const [templates, total] = await this.prisma.$transaction([
      this.prisma.emailTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.emailTemplate.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách email templates thành công',
      data: {
        data: templates.map(template => new EmailTemplateResponseDto(template)),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getActiveTemplates() {
    const templates = await this.prisma.emailTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    return {
      success: true,
      message: 'Lấy danh sách templates đang hoạt động thành công',
      data: templates.map(template => new EmailTemplateResponseDto(template)),
    };
  }

  async getTemplateCategories() {
    const categories = await this.prisma.emailTemplate.groupBy({
      by: ['category'],
      _count: {
        id: true
      },
      where: {
        isActive: true
      }
    });

    return {
      success: true,
      message: 'Lấy danh sách categories thành công',
      data: categories.map(cat => ({
        category: cat.category,
        count: cat._count.id
      })),
    };
  }

  async getEmailTemplateById(id: number) {
    const template = await this.prisma.emailTemplate.findUnique({ 
      where: { id }
    });
    
    if (!template) throw new NotFoundException('Email template không tồn tại');
    
    return {
      success: true,
      message: 'Lấy thông tin email template thành công',
      data: new EmailTemplateResponseDto(template),
    };
  }

  async getEmailTemplateByName(name: string) {
    const template = await this.prisma.emailTemplate.findUnique({ 
      where: { name }
    });
    
    if (!template) {
      return {
        success: true,
        message: 'Không tìm thấy template',
        data: null,
      };
    }
    
    return {
      success: true,
      message: 'Lấy thông tin email template thành công',
      data: new EmailTemplateResponseDto(template),
    };
  }

  async updateEmailTemplate(id: number, dto: UpdateEmailTemplateDto) {
    const template = await this.prisma.emailTemplate.findUnique({ 
      where: { id } 
    });
    if (!template) throw new NotFoundException('Email template không tồn tại');

    // Check unique name if changing
    if (dto.name && dto.name !== template.name) {
      const existing = await this.prisma.emailTemplate.findUnique({
        where: { name: dto.name }
      });
      if (existing) throw new BadRequestException('Tên template đã tồn tại');
    }

    // Only update provided fields
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.subject !== undefined) updateData.subject = dto.subject;
    if (dto.content !== undefined) updateData.content = dto.content;
     if (dto.variables !== undefined) updateData.variables = dto.variables as Prisma.InputJsonValue;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.language !== undefined) updateData.language = dto.language;

    const updated = await this.prisma.emailTemplate.update({
      where: { id },
      data: updateData
    });

    return {
      success: true,
      message: 'Cập nhật email template thành công',
      data: new EmailTemplateResponseDto(updated),
    };
  }

  async deleteEmailTemplate(id: number) {
    const template = await this.prisma.emailTemplate.findUnique({ 
      where: { id } 
    });
    if (!template) throw new NotFoundException('Email template không tồn tại');

    await this.prisma.emailTemplate.delete({ where: { id } });
    
    return {
      success: true,
      message: 'Xóa email template thành công',
      data: null,
    };
  }

  async toggleActive(id: number) {
    const template = await this.prisma.emailTemplate.findUnique({ 
      where: { id } 
    });
    if (!template) throw new NotFoundException('Email template không tồn tại');

    const updated = await this.prisma.emailTemplate.update({
      where: { id },
      data: { isActive: !template.isActive }
    });

    return {
      success: true,
      message: `Template đã được ${updated.isActive ? 'kích hoạt' : 'vô hiệu hóa'}`,
      data: new EmailTemplateResponseDto(updated),
    };
  }

  async duplicateTemplate(id: number) {
    const template = await this.prisma.emailTemplate.findUnique({ 
      where: { id } 
    });
    if (!template) throw new NotFoundException('Email template không tồn tại');

    // Generate new name
    const newName = `${template.name} - Copy ${Date.now()}`;

    const duplicated = await this.prisma.emailTemplate.create({
      data: {
        name: newName,
        subject: template.subject,
        content: template.content,
        variables: template.variables as Prisma.InputJsonValue,
        description: template.description ? `${template.description} (Copy)` : undefined,
        category: template.category,
        isActive: false, // Set inactive by default for duplicated templates
        language: template.language
      }
    });

    return {
      success: true,
      message: 'Nhân bản template thành công',
      data: new EmailTemplateResponseDto(duplicated),
    };
  }

  async previewTemplate(templateId: number, variables: Record<string, any>) {
    const template = await this.prisma.emailTemplate.findUnique({ 
      where: { id: templateId } 
    });
    if (!template) throw new NotFoundException('Email template không tồn tại');

    // Simple template variable replacement
    let previewSubject = template.subject;
    let previewContent = template.content;

    if (variables) {
      Object.keys(variables).forEach(key => {
        const placeholder = `{{${key}}}`;
        const value = variables[key] || '';
        previewSubject = previewSubject.replace(new RegExp(placeholder, 'g'), value);
        previewContent = previewContent.replace(new RegExp(placeholder, 'g'), value);
      });
    }

    return {
      success: true,
      message: 'Preview template thành công',
      data: {
        originalTemplate: new EmailTemplateResponseDto(template),
        preview: {
          subject: previewSubject,
          content: previewContent,
          variablesUsed: variables
        }
      },
    };
  }
}