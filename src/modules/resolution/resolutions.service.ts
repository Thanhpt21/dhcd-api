import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateResolutionDto } from './dto/create-resolution.dto';
import { UpdateResolutionDto } from './dto/update-resolution.dto';
import { ResolutionResponseDto } from './dto/resolution-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ResolutionsService {
  constructor(private prisma: PrismaService) {}

  async createResolution(dto: CreateResolutionDto) {
    // Check if meeting exists
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id: dto.meetingId } 
    });
    if (!meeting) throw new BadRequestException('Cuộc họp không tồn tại');

    // Check if resolution code already exists
    const existingCode = await this.prisma.resolution.findFirst({ 
      where: { resolutionCode: dto.resolutionCode } 
    });
    if (existingCode) throw new BadRequestException('Mã nghị quyết đã tồn tại');

    // Check if resolution number is unique for this meeting
    const existingNumber = await this.prisma.resolution.findFirst({
      where: {
        meetingId: dto.meetingId,
        resolutionNumber: dto.resolutionNumber
      }
    });
    if (existingNumber) throw new BadRequestException('Số nghị quyết đã tồn tại trong cuộc họp này');

    const resolution = await this.prisma.resolution.create({ 
      data: {
        ...dto,
        votingMethod: dto.votingMethod || 'YES_NO',
        approvalThreshold: dto.approvalThreshold || 50.00,
        maxChoices: dto.maxChoices || 1,
        displayOrder: dto.displayOrder || 0,
        isActive: dto.isActive !== undefined ? dto.isActive : true
      }
    });

    return {
      success: true,
      message: 'Tạo nghị quyết thành công',
      data: new ResolutionResponseDto(resolution),
    };
  }

  async getResolutions(page = 1, limit = 10, meetingId = '', search = '', isActive = '') {
    const skip = (page - 1) * limit;

    const where: Prisma.ResolutionWhereInput = {};
    
    if (meetingId) {
      where.meetingId = +meetingId;
    }

    if (search) {
      where.OR = [
        { resolutionCode: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { content: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    if (isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const [resolutions, total] = await this.prisma.$transaction([
      this.prisma.resolution.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ meetingId: 'asc' }, { displayOrder: 'asc' }, { resolutionNumber: 'asc' }],
        include: {
          meeting: {
            select: { id: true, meetingCode: true, meetingName: true, meetingDate: true }
          },
          options: {
            orderBy: {
              displayOrder: 'asc'
            }
          },
          candidates: {
            orderBy: { displayOrder: 'asc' }
          },
          _count: {
            select: {
              votes: true,
              votingResults: true
            }
          }
        }
      }),
      this.prisma.resolution.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách nghị quyết thành công',
      data: {
        data: resolutions.map((r) => ({
          ...new ResolutionResponseDto(r),
          meeting: r.meeting,
          candidates: r.candidates,
          voteCount: r._count.votes,
          votingResultCount: r._count.votingResults
        })),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getResolutionsByMeeting(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const resolutions = await this.prisma.resolution.findMany({
      where: { meetingId },
      include: {
        meeting: {
          select: { id: true, meetingCode: true, meetingName: true }
        },
         options: {
            orderBy: {
              displayOrder: 'asc'
            }
          },
        candidates: {
          orderBy: { displayOrder: 'asc' }
        },
        _count: {
          select: {
            votes: true
          }
        }
      },
      orderBy: [{ displayOrder: 'asc' }, { resolutionNumber: 'asc' }]
    });

    return {
      success: true,
      message: 'Lấy danh sách nghị quyết theo cuộc họp thành công',
      data: resolutions.map((r) => ({
        ...new ResolutionResponseDto(r),
        meeting: r.meeting,
        candidates: r.candidates,
        voteCount: r._count.votes
      })),
    };
  }

  async getResolutionById(id: number) {
    const resolution = await this.prisma.resolution.findUnique({ 
      where: { id },
      include: {
        meeting: true,
        candidates: {
          orderBy: { displayOrder: 'asc' }
        },
         options: {
            orderBy: {
              displayOrder: 'asc'
            }
          },
        votes: {
          include: {
            shareholder: {
              select: { shareholderCode: true, fullName: true, totalShares: true }
            }
          }
        },
        votingResults: {
          include: {
            shareholder: {
              select: { shareholderCode: true, fullName: true }
            },
            candidate: true
          }
        }
      }
    });
    
    if (!resolution) throw new NotFoundException('Nghị quyết không tồn tại');
    
    return {
      success: true,
      message: 'Lấy thông tin nghị quyết thành công',
      data: {
        ...new ResolutionResponseDto(resolution),
        meeting: resolution.meeting,
        candidates: resolution.candidates,
        votes: resolution.votes,
        votingResults: resolution.votingResults
      },
    };
  }

  async updateResolution(id: number, dto: UpdateResolutionDto) {
    const resolution = await this.prisma.resolution.findUnique({ where: { id } });
    if (!resolution) throw new NotFoundException('Nghị quyết không tồn tại');

    // Check unique constraints if updating
    if (dto.resolutionCode && dto.resolutionCode !== resolution.resolutionCode) {
      const existing = await this.prisma.resolution.findFirst({ 
        where: { resolutionCode: dto.resolutionCode } 
      });
      if (existing) throw new BadRequestException('Mã nghị quyết đã tồn tại');
    }

    const updated = await this.prisma.resolution.update({ 
      where: { id }, 
      data: dto 
    });

    return {
      success: true,
      message: 'Cập nhật nghị quyết thành công',
      data: new ResolutionResponseDto(updated),
    };
  }

  async updateResolutionStatus(id: number, isActive: boolean) {
    const resolution = await this.prisma.resolution.findUnique({ where: { id } });
    if (!resolution) throw new NotFoundException('Nghị quyết không tồn tại');

    const updated = await this.prisma.resolution.update({ 
      where: { id }, 
      data: { isActive } 
    });

    return {
      success: true,
      message: `Cập nhật trạng thái nghị quyết thành ${isActive ? 'ACTIVE' : 'INACTIVE'}`,
      data: new ResolutionResponseDto(updated),
    };
  }

  async deleteResolution(id: number) {
    const resolution = await this.prisma.resolution.findUnique({ where: { id } });
    if (!resolution) throw new NotFoundException('Nghị quyết không tồn tại');

    // Check if there are votes associated
    const voteCount = await this.prisma.vote.count({
      where: { resolutionId: id }
    });

    if (voteCount > 0) {
      throw new BadRequestException('Không thể xóa nghị quyết đã có phiếu bầu');
    }

    await this.prisma.resolution.delete({ where: { id } });
    
    return {
      success: true,
      message: 'Xóa nghị quyết thành công',
      data: null,
    };
  }

  async getMeetingResolutionStatistics(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const resolutions = await this.prisma.resolution.findMany({
      where: { meetingId },
      include: {
        _count: {
          select: {
            votes: true,
            candidates: true,
            options: true
          }
        }
      }
    });

    const statistics = {
      totalResolutions: resolutions.length,
      activeResolutions: resolutions.filter(r => r.isActive).length,
      inactiveResolutions: resolutions.filter(r => !r.isActive).length,
      yesNoResolutions: resolutions.filter(r => r.votingMethod === 'YES_NO').length,
      multipleChoiceResolutions: resolutions.filter(r => r.votingMethod === 'MULTIPLE_CHOICE').length,
      rankingResolutions: resolutions.filter(r => r.votingMethod === 'RANKING').length,
      totalVotes: resolutions.reduce((sum, r) => sum + r._count.votes, 0),
      totalCandidates: resolutions.reduce((sum, r) => sum + r._count.candidates, 0),
      averageApprovalThreshold: resolutions.length > 0 
        ? (resolutions.reduce((sum, r) => sum + r.approvalThreshold, 0) / resolutions.length).toFixed(2)
        : 0
    };

    return {
      success: true,
      message: 'Lấy thống kê nghị quyết thành công',
      data: statistics,
    };
  }
}