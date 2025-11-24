import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { CandidateResponseDto } from './dto/candidate-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ResolutionCandidatesService {
  constructor(private prisma: PrismaService) {}

  async createCandidate(dto: CreateCandidateDto) {
    // Check if resolution exists
    const resolution = await this.prisma.resolution.findUnique({ 
      where: { id: dto.resolutionId },
      include: { candidates: true }
    });
    if (!resolution) throw new BadRequestException('Nghị quyết không tồn tại');

    // Check if candidate code already exists for this resolution
    const existingCode = await this.prisma.resolutionCandidate.findFirst({ 
      where: { 
        resolutionId: dto.resolutionId,
        candidateCode: dto.candidateCode
      } 
    });
    if (existingCode) throw new BadRequestException('Mã ứng cử viên đã tồn tại trong nghị quyết này');

    // Auto-calculate display order if not provided
    const displayOrder = dto.displayOrder || (resolution.candidates.length + 1);

    const candidate = await this.prisma.resolutionCandidate.create({ 
      data: {
        ...dto,
        displayOrder,
        isElected: dto.isElected || false
      }
    });

    return {
      success: true,
      message: 'Tạo ứng cử viên thành công',
      data: new CandidateResponseDto(candidate),
    };
  }

  async getCandidates(page = 1, limit = 10, resolutionId = '', search = '') {
    const skip = (page - 1) * limit;

    const where: Prisma.ResolutionCandidateWhereInput = {};
    
    if (resolutionId) {
      where.resolutionId = +resolutionId;
    }

    if (search) {
      where.OR = [
        { candidateCode: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { candidateName: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { candidateInfo: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    const [candidates, total] = await this.prisma.$transaction([
      this.prisma.resolutionCandidate.findMany({
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
          },
          _count: {
            select: {
              votingResults: true
            }
          }
        }
      }),
      this.prisma.resolutionCandidate.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách ứng cử viên thành công',
      data: {
        data: candidates.map((c) => ({
          ...new CandidateResponseDto(c),
          resolution: c.resolution,
          votingResultCount: c._count.votingResults
        })),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getCandidatesByResolution(resolutionId: number) {
    const resolution = await this.prisma.resolution.findUnique({ 
      where: { id: resolutionId } 
    });
    if (!resolution) throw new NotFoundException('Nghị quyết không tồn tại');

    const candidates = await this.prisma.resolutionCandidate.findMany({
      where: { resolutionId },
      include: {
        resolution: {
          select: { 
            id: true, 
            resolutionCode: true, 
            title: true,
            maxChoices: true
          }
        },
        _count: {
          select: {
            votingResults: true
          }
        }
      },
      orderBy: { displayOrder: 'asc' }
    });

    return {
      success: true,
      message: 'Lấy danh sách ứng cử viên theo nghị quyết thành công',
      data: candidates.map((c) => ({
        ...new CandidateResponseDto(c),
        resolution: c.resolution,
        votingResultCount: c._count.votingResults
      })),
    };
  }

  async getCandidateById(id: number) {
    const candidate = await this.prisma.resolutionCandidate.findUnique({ 
      where: { id },
      include: {
        resolution: {
          include: {
            meeting: {
              select: { meetingCode: true, meetingName: true }
            }
          }
        },
        votingResults: {
          include: {
            shareholder: {
              select: { shareholderCode: true, fullName: true, totalShares: true }
            }
          }
        }
      }
    });
    
    if (!candidate) throw new NotFoundException('Ứng cử viên không tồn tại');
    
    return {
      success: true,
      message: 'Lấy thông tin ứng cử viên thành công',
      data: {
        ...new CandidateResponseDto(candidate),
        resolution: candidate.resolution,
        votingResults: candidate.votingResults
      },
    };
  }

  async updateCandidate(id: number, dto: UpdateCandidateDto) {
    const candidate = await this.prisma.resolutionCandidate.findUnique({ 
      where: { id },
      include: { resolution: true }
    });
    if (!candidate) throw new NotFoundException('Ứng cử viên không tồn tại');

    // Check unique constraints if updating candidate code
    if (dto.candidateCode && dto.candidateCode !== candidate.candidateCode) {
      const existing = await this.prisma.resolutionCandidate.findFirst({ 
        where: { 
          resolutionId: candidate.resolutionId,
          candidateCode: dto.candidateCode
        } 
      });
      if (existing) throw new BadRequestException('Mã ứng cử viên đã tồn tại trong nghị quyết này');
    }

    const updated = await this.prisma.resolutionCandidate.update({ 
      where: { id }, 
      data: dto 
    });

    return {
      success: true,
      message: 'Cập nhật ứng cử viên thành công',
      data: new CandidateResponseDto(updated),
    };
  }

  async updateCandidateElectionStatus(id: number, isElected: boolean) {
    const candidate = await this.prisma.resolutionCandidate.findUnique({ where: { id } });
    if (!candidate) throw new NotFoundException('Ứng cử viên không tồn tại');

    const updated = await this.prisma.resolutionCandidate.update({ 
      where: { id }, 
      data: { isElected } 
    });

    return {
      success: true,
      message: `Cập nhật trạng thái ứng cử viên thành ${isElected ? 'TRÚNG CỬ' : 'KHÔNG TRÚNG CỬ'}`,
      data: new CandidateResponseDto(updated),
    };
  }

  async updateCandidateVotes(id: number, voteCount: number) {
    const candidate = await this.prisma.resolutionCandidate.findUnique({ where: { id } });
    if (!candidate) throw new NotFoundException('Ứng cử viên không tồn tại');

    if (voteCount < 0) {
      throw new BadRequestException('Số phiếu không thể âm');
    }

    const updated = await this.prisma.resolutionCandidate.update({ 
      where: { id }, 
      data: { voteCount } 
    });

    return {
      success: true,
      message: 'Cập nhật số phiếu thành công',
      data: new CandidateResponseDto(updated),
    };
  }

  async deleteCandidate(id: number) {
    const candidate = await this.prisma.resolutionCandidate.findUnique({ where: { id } });
    if (!candidate) throw new NotFoundException('Ứng cử viên không tồn tại');

    // Check if there are voting results associated
    const votingResultCount = await this.prisma.votingResult.count({
      where: { candidateId: id }
    });

    if (votingResultCount > 0) {
      throw new BadRequestException('Không thể xóa ứng cử viên đã có kết quả bỏ phiếu');
    }

    await this.prisma.resolutionCandidate.delete({ where: { id } });
    
    return {
      success: true,
      message: 'Xóa ứng cử viên thành công',
      data: null,
    };
  }

  async getResolutionCandidateStatistics(resolutionId: number) {
    const resolution = await this.prisma.resolution.findUnique({ 
      where: { id: resolutionId },
      include: {
        candidates: {
          include: {
            _count: {
              select: {
                votingResults: true
              }
            }
          }
        }
      }
    });
    
    if (!resolution) throw new NotFoundException('Nghị quyết không tồn tại');

    const statistics = {
      totalCandidates: resolution.candidates.length,
      electedCandidates: resolution.candidates.filter(c => c.isElected).length,
      totalVotes: resolution.candidates.reduce((sum, c) => sum + c.voteCount, 0),
      averageVotesPerCandidate: resolution.candidates.length > 0 
        ? (resolution.candidates.reduce((sum, c) => sum + c.voteCount, 0) / resolution.candidates.length).toFixed(2)
        : 0,
      topCandidate: resolution.candidates.length > 0 
        ? resolution.candidates.reduce((max, c) => c.voteCount > max.voteCount ? c : max, resolution.candidates[0])
        : null
    };

    return {
      success: true,
      message: 'Lấy thống kê ứng cử viên thành công',
      data: statistics,
    };
  }
}