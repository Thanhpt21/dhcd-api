// src/resolution-options/resolution-options.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { OptionResponseDto } from './dto/option-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ResolutionOptionsService {
  constructor(private prisma: PrismaService) {}

  async createOption(dto: CreateOptionDto) {
    // Check if resolution exists
    const resolution = await this.prisma.resolution.findUnique({ 
      where: { id: dto.resolutionId },
      include: { options: true }
    });
    if (!resolution) throw new BadRequestException('Nghị quyết không tồn tại');

    // Check if option code already exists for this resolution
    const existingCode = await this.prisma.resolutionOption.findFirst({ 
      where: { 
        resolutionId: dto.resolutionId,
        optionCode: dto.optionCode
      } 
    });
    if (existingCode) throw new BadRequestException('Mã phương án đã tồn tại trong nghị quyết này');

    // Check if option value already exists for this resolution
    const existingValue = await this.prisma.resolutionOption.findFirst({ 
      where: { 
        resolutionId: dto.resolutionId,
        optionValue: dto.optionValue
      } 
    });
    if (existingValue) throw new BadRequestException('Giá trị phương án đã tồn tại trong nghị quyết này');

    // Auto-calculate display order if not provided
    const displayOrder = dto.displayOrder || (resolution.options.length + 1);

    const option = await this.prisma.resolutionOption.create({ 
      data: {
        ...dto,
        displayOrder,
      }
    });

    return {
      success: true,
      message: 'Tạo phương án bỏ phiếu thành công',
      data: new OptionResponseDto(option),
    };
  }

  async getOptions(page = 1, limit = 10, resolutionId = '', search = '') {
    const skip = (page - 1) * limit;

    const where: Prisma.ResolutionOptionWhereInput = {};
    
    if (resolutionId) {
      where.resolutionId = +resolutionId;
    }

    if (search) {
      where.OR = [
        { optionCode: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { optionText: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { optionValue: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    const [options, total] = await this.prisma.$transaction([
      this.prisma.resolutionOption.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ resolutionId: 'asc' }, { displayOrder: 'asc' }],
        include: {
          resolution: {
            select: { 
              id: true, 
              resolutionCode: true, 
              title: true,
              votingMethod: true
            }
          }
        }
      }),
      this.prisma.resolutionOption.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách phương án bỏ phiếu thành công',
      data: {
        data: options.map((o) => ({
          ...new OptionResponseDto(o),
          resolution: o.resolution,
        })),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getOptionsByResolution(resolutionId: number) {
    const resolution = await this.prisma.resolution.findUnique({ 
      where: { id: resolutionId } 
    });
    if (!resolution) throw new NotFoundException('Nghị quyết không tồn tại');

    const options = await this.prisma.resolutionOption.findMany({
      where: { resolutionId },
      include: {
        resolution: {
          select: { 
            id: true, 
            resolutionCode: true, 
            title: true,
            votingMethod: true,
            maxChoices: true
          }
        }
      },
      orderBy: { displayOrder: 'asc' }
    });

    return {
      success: true,
      message: 'Lấy danh sách phương án bỏ phiếu theo nghị quyết thành công',
      data: options.map((o) => ({
        ...new OptionResponseDto(o),
        resolution: o.resolution,
      })),
    };
  }

  async getOptionById(id: number) {
    const option = await this.prisma.resolutionOption.findUnique({ 
      where: { id },
      include: {
        resolution: {
          include: {
            meeting: {
              select: { meetingCode: true, meetingName: true }
            }
          }
        }
      }
    });
    
    if (!option) throw new NotFoundException('Phương án bỏ phiếu không tồn tại');
    
    return {
      success: true,
      message: 'Lấy thông tin phương án bỏ phiếu thành công',
      data: {
        ...new OptionResponseDto(option),
        resolution: option.resolution,
      },
    };
  }

  async updateOption(id: number, dto: UpdateOptionDto) {
    const option = await this.prisma.resolutionOption.findUnique({ 
      where: { id },
      include: { resolution: true }
    });
    if (!option) throw new NotFoundException('Phương án bỏ phiếu không tồn tại');

    // Check unique constraints if updating option code
    if (dto.optionCode && dto.optionCode !== option.optionCode) {
      const existing = await this.prisma.resolutionOption.findFirst({ 
        where: { 
          resolutionId: option.resolutionId,
          optionCode: dto.optionCode
        } 
      });
      if (existing) throw new BadRequestException('Mã phương án đã tồn tại trong nghị quyết này');
    }

    // Check unique constraints if updating option value
    if (dto.optionValue && dto.optionValue !== option.optionValue) {
      const existing = await this.prisma.resolutionOption.findFirst({ 
        where: { 
          resolutionId: option.resolutionId,
          optionValue: dto.optionValue
        } 
      });
      if (existing) throw new BadRequestException('Giá trị phương án đã tồn tại trong nghị quyết này');
    }

    const updated = await this.prisma.resolutionOption.update({ 
      where: { id }, 
      data: dto 
    });

    return {
      success: true,
      message: 'Cập nhật phương án bỏ phiếu thành công',
      data: new OptionResponseDto(updated),
    };
  }

  async updateOptionVotes(id: number, voteCount: number) {
    const option = await this.prisma.resolutionOption.findUnique({ where: { id } });
    if (!option) throw new NotFoundException('Phương án bỏ phiếu không tồn tại');

    if (voteCount < 0) {
      throw new BadRequestException('Số phiếu không thể âm');
    }

    const updated = await this.prisma.resolutionOption.update({ 
      where: { id }, 
      data: { voteCount } 
    });

    return {
      success: true,
      message: 'Cập nhật số phiếu thành công',
      data: new OptionResponseDto(updated),
    };
  }

  async deleteOption(id: number) {
    const option = await this.prisma.resolutionOption.findUnique({ where: { id } });
    if (!option) throw new NotFoundException('Phương án bỏ phiếu không tồn tại');

    // Check if this option is being used in votes
    const voteCount = await this.prisma.vote.count({
      where: { 
        resolutionId: option.resolutionId,
        voteValue: { contains: option.optionValue }
      }
    });

    if (voteCount > 0) {
      throw new BadRequestException('Không thể xóa phương án đã có người bỏ phiếu');
    }

    await this.prisma.resolutionOption.delete({ where: { id } });
    
    return {
      success: true,
      message: 'Xóa phương án bỏ phiếu thành công',
      data: null,
    };
  }

  async getResolutionOptionStatistics(resolutionId: number) {
    const resolution = await this.prisma.resolution.findUnique({ 
      where: { id: resolutionId },
      include: {
        options: true
      }
    });
    
    if (!resolution) throw new NotFoundException('Nghị quyết không tồn tại');

    const statistics = {
      totalOptions: resolution.options.length,
      totalVotes: resolution.options.reduce((sum, o) => sum + o.voteCount, 0),
      averageVotesPerOption: resolution.options.length > 0 
        ? (resolution.options.reduce((sum, o) => sum + o.voteCount, 0) / resolution.options.length).toFixed(2)
        : 0,
      topOption: resolution.options.length > 0 
        ? resolution.options.reduce((max, o) => o.voteCount > max.voteCount ? o : max, resolution.options[0])
        : null
    };

    return {
      success: true,
      message: 'Lấy thống kê phương án bỏ phiếu thành công',
      data: statistics,
    };
  }
}