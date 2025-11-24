import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma, PromptAIStatus } from '@prisma/client';
import { CreatePromptAIDto } from './dto/create-promptAI.dto';
import { PromptAIResponseDto } from './dto/promptAI-response.dto';
import { UpdatePromptAIDto } from './dto/update-promptAI.dto';

@Injectable()
export class PromptAIServices {
  constructor(private prisma: PrismaService) {}

 async createPromptAI(dto: CreatePromptAIDto) {
    // Kiểm tra xem PromptAI với name đã tồn tại hay chưa
    const existing = await this.prisma.promptAI.findMany({
      where: { name: dto.name },
    });
    
    if (existing.length > 0) {
      throw new BadRequestException('PromptAI với tên này đã tồn tại');
    }

    // Tạo mới PromptAI
    const promptAI = await this.prisma.promptAI.create({
      data: {
        name: dto.name,
        text: dto.text,
        status: dto.status ?? PromptAIStatus.ACTIVE,
        position: dto.position,
        startDate: dto.startDate,
        endDate: dto.endDate,
      },
    });

    return {
      success: true,
      message: 'Tạo PromptAI thành công',
      data: new PromptAIResponseDto(promptAI),
    };
  }

  async getPromptAIs(page = 1, limit = 10, search = '') {
    const skip = (page - 1) * limit;

    const where: Prisma.PromptAIWhereInput = search
      ? { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } }
      : {};

    const [promptAIs, total] = await this.prisma.$transaction([
      this.prisma.promptAI.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.promptAI.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách PromptAI thành công',
      data: {
        data: promptAIs.map((p) => new PromptAIResponseDto(p)),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getAllPromptAIs(search = '') {
    const where: Prisma.PromptAIWhereInput = search
      ? { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } }
      : {};

    const promptAIs = await this.prisma.promptAI.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'Lấy tất cả PromptAI thành công',
      data: promptAIs.map((p) => new PromptAIResponseDto(p)),
    };
  }

  async getPromptAIById(id: number) {
    const promptAI = await this.prisma.promptAI.findUnique({ where: { id } });
    if (!promptAI) throw new NotFoundException('PromptAI không tồn tại');
    return {
      success: true,
      message: 'Lấy PromptAI thành công',
      data: new PromptAIResponseDto(promptAI),
    };
  }

  async updatePromptAI(id: number, dto: UpdatePromptAIDto) {
    const promptAI = await this.prisma.promptAI.findUnique({ where: { id } });
    if (!promptAI) throw new NotFoundException('PromptAI không tồn tại');

    const updated = await this.prisma.promptAI.update({ where: { id }, data: dto });
    return {
      success: true,
      message: 'Cập nhật PromptAI thành công',
      data: new PromptAIResponseDto(updated),
    };
  }

  async deletePromptAI(id: number) {
    const promptAI = await this.prisma.promptAI.findUnique({ where: { id } });
    if (!promptAI) throw new NotFoundException('PromptAI không tồn tại');

    await this.prisma.promptAI.delete({ where: { id } });
    return {
      success: true,
      message: 'Xóa PromptAI thành công',
      data: null,
    };
  }
}
