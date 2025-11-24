import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateVoteDto } from './dto/create-vote.dto';
import { VoteResponseDto } from './dto/vote-response.dto';
import { VotingResultResponseDto } from './dto/voting-result-response.dto';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';

@Injectable()
export class VotesService {
  constructor(private prisma: PrismaService) {}

  async createVote(dto: CreateVoteDto) {
    // Check if resolution exists and is active
    const resolution = await this.prisma.resolution.findUnique({
      where: { id: dto.resolutionId },
      include: {
        meeting: true,
        candidates: true,
        options: true
      }
    });
    
    if (!resolution) throw new BadRequestException('Nghị quyết không tồn tại');
    if (!resolution.isActive) throw new BadRequestException('Nghị quyết không trong thời gian bỏ phiếu');

    // Tìm verification link bằng verificationCode
    const verificationLink = await this.prisma.verificationLink.findFirst({
      where: { 
        verificationCode: dto.verificationCode,
        meetingId: dto.meetingId
      },
      include: {
        shareholder: true
      }
    });

    if (!verificationLink) {
      throw new BadRequestException('Mã xác thực không tồn tại');
    }

    if (!verificationLink.isUsed) {
      throw new BadRequestException('Mã xác thực chưa được sử dụng. Vui lòng điểm danh trước khi bỏ phiếu.');
    }

    if (verificationLink.expiresAt < new Date()) {
      throw new BadRequestException('Mã xác thực đã hết hạn');
    }

    const shareholder = verificationLink.shareholder;
    if (!shareholder) {
      throw new BadRequestException('Không tìm thấy thông tin cổ đông');
    }

    // Check if shareholder has registered and attended the meeting
    const registration = await this.prisma.registration.findFirst({
      where: {
        meetingId: dto.meetingId,
        shareholderId: shareholder.id,
        status: { in: ['APPROVED'] }
      }
    });
    if (!registration) throw new BadRequestException('Cổ đông chưa đăng ký hoặc chưa được duyệt tham dự');

    const attendance = await this.prisma.attendance.findUnique({
      where: {
        meetingId_shareholderId: {
          meetingId: dto.meetingId,
          shareholderId: shareholder.id
        }
      }
    });
    if (!attendance) throw new BadRequestException('Cổ đông chưa điểm danh');

    // Check if already voted for this resolution
    const existingVote = await this.prisma.vote.findUnique({
      where: {
        resolutionId_shareholderId: {
          resolutionId: dto.resolutionId,
          shareholderId: shareholder.id
        }
      }
    });
    if (existingVote) throw new BadRequestException('Cổ đông đã bỏ phiếu cho nghị quyết này');

    // Validate vote based on voting method
    const validatedVote = this.validateVote(dto, resolution);

    // Start transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      // Create vote record
      const vote = await prisma.vote.create({
        data: {
          resolutionId: dto.resolutionId,
          shareholderId: shareholder.id,
          meetingId: dto.meetingId,
          voteValue: validatedVote.voteValue,
          sharesUsed: shareholder.totalShares,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent
        }
      });


      // Update resolution vote counts
      await this.updateResolutionVoteCounts(prisma, dto.resolutionId, validatedVote, shareholder.totalShares);

      // Log verification action
      await prisma.verificationLog.create({
        data: {
          verificationId: verificationLink.id,
          action: 'VOTE_CAST',
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          success: true,
          errorMessage: null
        }
      });

      return vote;
    });

    return {
      success: true,
      message: 'Bỏ phiếu thành công',
      data: {
        ...new VoteResponseDto(result),
      },
    };
  }

private validateVote(dto: CreateVoteDto, resolution: any) {
  const result: any = {
    voteValue: '',
  };

  switch (resolution.votingMethod) {
    case 'YES_NO':
      if (!dto.voteValue || !['YES', 'NO', 'ABSTAIN'].includes(dto.voteValue)) {
        throw new BadRequestException('Giá trị phiếu bầu không hợp lệ cho phương thức YES_NO');
      }
      result.voteValue = dto.voteValue;
      break;

    case 'MULTIPLE_CHOICE':
      try {
        if (!dto.voteValue) {
          throw new BadRequestException('Thiếu dữ liệu bỏ phiếu');
        }

        const selectedOptions = JSON.parse(dto.voteValue);
        
        if (!Array.isArray(selectedOptions)) {
          throw new BadRequestException('Dữ liệu bỏ phiếu không hợp lệ cho MULTIPLE_CHOICE');
        }

        if (selectedOptions.length === 0) {
          throw new BadRequestException('Vui lòng chọn ít nhất một phương án');
        }

        if (selectedOptions.length > resolution.maxChoices) {
          throw new BadRequestException(`Chỉ được chọn tối đa ${resolution.maxChoices} phương án`);
        }

        const validOptionIds = resolution.options ? resolution.options.map(opt => opt.id) : [];
        for (const optionId of selectedOptions) {
          if (!validOptionIds.includes(parseInt(optionId))) {
            throw new BadRequestException(`Phương án bỏ phiếu không hợp lệ: ${optionId}`);
          }
        }

        result.voteValue = dto.voteValue;
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        throw new BadRequestException('Dữ liệu bỏ phiếu MULTIPLE_CHOICE không hợp lệ');
      }
      break;

    case 'RANKING':
      try {
        // ✅ SỬA: Parse từ voteValue thay vì dùng ranking field
        if (!dto.voteValue) {
          throw new BadRequestException('Thiếu dữ liệu xếp hạng');
        }

        const ranking = JSON.parse(dto.voteValue);
        
        if (typeof ranking !== 'object' || ranking === null || Object.keys(ranking).length === 0) {
          throw new BadRequestException('Thứ hạng không hợp lệ hoặc không có dữ liệu');
        }

        const rankedCandidates = Object.keys(ranking);
        if (rankedCandidates.length > resolution.maxChoices) {
          throw new BadRequestException(`Chỉ được xếp hạng tối đa ${resolution.maxChoices} ứng cử viên`);
        }

        // Validate candidate codes and ranks
        const validCandidatesRanking = resolution.candidates.map(c => c.candidateCode);
        const invalidCandidatesRanking = rankedCandidates.filter(code => !validCandidatesRanking.includes(code));
        if (invalidCandidatesRanking.length > 0) {
          throw new BadRequestException(`Mã ứng cử viên không hợp lệ: ${invalidCandidatesRanking.join(', ')}`);
        }

        // Validate rank values (phải là số nguyên dương)
        const invalidRanks = rankedCandidates.filter(code => {
          const rank = ranking[code];
          return !Number.isInteger(rank) || rank < 1 || rank > rankedCandidates.length;
        });
        if (invalidRanks.length > 0) {
          throw new BadRequestException(`Thứ hạng không hợp lệ cho ứng cử viên: ${invalidRanks.join(', ')}`);
        }

        // Validate không có rank trùng
        const rankValues = Object.values(ranking);
        const uniqueRanks = new Set(rankValues);
        if (uniqueRanks.size !== rankValues.length) {
          throw new BadRequestException('Không được có thứ hạng trùng nhau');
        }

        result.voteValue = dto.voteValue; // ✅ Giữ nguyên voteValue gốc
      } catch (error) {
        if (error instanceof BadRequestException) throw error;
        throw new BadRequestException('Dữ liệu xếp hạng không hợp lệ');
      }
      break;

    default:
      throw new BadRequestException('Phương thức bỏ phiếu không được hỗ trợ');
  }

  return result;
}

  private async updateResolutionVoteCounts(prisma: any, resolutionId: number, validatedVote: any, sharesUsed: number) {
    const updateData: any = {
      totalVotes: { increment: 1 }
    };

    if (validatedVote.voteValue === 'YES') {
      updateData.yesVotes = { increment: sharesUsed };
    } else if (validatedVote.voteValue === 'NO') {
      updateData.noVotes = { increment: sharesUsed };
    } else if (validatedVote.voteValue === 'ABSTAIN') {
      updateData.abstainVotes = { increment: sharesUsed };
    }

    await prisma.resolution.update({
      where: { id: resolutionId },
      data: updateData
    });
  }

  private async updateCandidateVoteCounts(prisma: any, validatedVote: any, sharesUsed: number) {
    for (const result of validatedVote.votingResults) {
      await prisma.resolutionCandidate.update({
        where: { id: result.candidateId },
        data: {
          voteCount: { increment: sharesUsed }
        }
      });
    }
  }

  async createBatchVotes(dtos: CreateVoteDto[]) {
    const results = {
      total: dtos.length,
      success: 0,
      errors: [] as string[],
      details: [] as any[]
    };

    // Pre-fetch all verification codes để tránh N+1 query
    const verificationCodes = dtos.map(d => d.verificationCode).filter(Boolean);
    const verificationLinks = await this.prisma.verificationLink.findMany({
      where: {
        verificationCode: { in: verificationCodes }
      },
      include: {
        shareholder: true
      }
    });

    const verificationMap = new Map(
      verificationLinks.map(vl => [vl.verificationCode, vl])
    );

    for (const dto of dtos) {
      try {
        // Validate verification code exists trước khi xử lý
        if (!dto.verificationCode) {
          throw new Error('Thiếu mã xác thực');
        }

        const verificationLink = verificationMap.get(dto.verificationCode);
        if (!verificationLink) {
          throw new Error('Mã xác thực không tồn tại');
        }

        await this.createVote(dto);
        results.success++;
        results.details.push({
          verificationCode: dto.verificationCode,
          status: 'success',
          message: 'Bỏ phiếu thành công'
        });
      } catch (error) {
        results.errors.push(`Mã xác thực ${dto.verificationCode}: ${error.message}`);
        results.details.push({
          verificationCode: dto.verificationCode,
          status: 'error',
          message: error.message
        });
      }
    }

    return {
      success: results.success > 0,
      message: `Xử lý hàng loạt hoàn tất: ${results.success}/${results.total} thành công`,
      data: results
    };
  }

async getVotes(page = 1, limit = 10, resolutionId = '', meetingId = '', shareholderId = '') {
  const skip = (page - 1) * limit;

  const where: Prisma.VoteWhereInput = {};
  
  if (resolutionId) {
    where.resolutionId = +resolutionId;
  }

  if (meetingId) {
    where.meetingId = +meetingId;
  }

  if (shareholderId) {
    where.shareholderId = +shareholderId;
  }

  const [votes, total] = await this.prisma.$transaction([
    this.prisma.vote.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        resolution: {
          select: { 
            id: true, 
            resolutionCode: true, 
            title: true,
            votingMethod: true,
            options: { // ✅ Cho MULTIPLE_CHOICE và YES_NO
              select: {
                id: true,
                optionText: true,
                optionValue: true
              }
            },
            candidates: { // ✅ Cho RANKING
              select: {
                id: true,
                candidateCode: true,
                candidateName: true
              }
            }
          }
        },
        shareholder: {
          select: { 
            id: true, 
            shareholderCode: true, 
            fullName: true,
            totalShares: true
          }
        },
        meeting: {
          select: { 
            id: true, 
            meetingCode: true, 
            meetingName: true 
          }
        }
      }
    }),
    this.prisma.vote.count({ where }),
  ]);

  // Map voteValue sang tên phương án
  const mappedVotes = votes.map(vote => {
    let displayValue = vote.voteValue;
    
    switch (vote.resolution.votingMethod) {
      case 'MULTIPLE_CHOICE':
        try {
          const selectedIds = JSON.parse(vote.voteValue);
          if (Array.isArray(selectedIds)) {
            const selectedOptions = selectedIds.map(id => {
              const option = vote.resolution.options.find(opt => opt.id === parseInt(id));
              return option ? option.optionText : `Không xác định (${id})`;
            });
            displayValue = selectedOptions.join(', ');
          }
        } catch (error) {
          displayValue = `Lỗi định dạng: ${vote.voteValue}`;
        }
        break;

      case 'YES_NO':
        if (vote.voteValue === 'YES') {
          displayValue = '✅ Đồng ý';
        } else if (vote.voteValue === 'NO') {
          displayValue = '❌ Không đồng ý';
        } else if (vote.voteValue === 'ABSTAIN') {
          displayValue = '⚪ Trắng/Bỏ phiếu';
        } else {
          // Tìm optionText từ resolution options
          const option = vote.resolution.options?.find(opt => opt.optionValue === vote.voteValue);
          displayValue = option ? option.optionText : vote.voteValue;
        }
        break;

      case 'RANKING':
        try {
          const ranking = JSON.parse(vote.voteValue);
          if (typeof ranking === 'object' && ranking !== null) {
            const rankedCandidates = Object.entries(ranking)
              .sort(([, rankA], [, rankB]) => (rankA as number) - (rankB as number))
              .map(([candidateCode, rank]) => {
                const candidate = vote.resolution.candidates.find(c => c.candidateCode === candidateCode);
                const candidateName = candidate ? candidate.candidateName : `Không xác định (${candidateCode})`;
                return `${rank}. ${candidateName}`;
              });
            displayValue = rankedCandidates.join(' → ');
          }
        } catch (error) {
          displayValue = `Lỗi định dạng: ${vote.voteValue}`;
        }
        break;

      default:
        // Giữ nguyên voteValue cho các phương thức khác
        break;
    }

    return {
      ...new VoteResponseDto(vote),
      resolution: vote.resolution,
      shareholder: vote.shareholder,
      meeting: vote.meeting,
      displayValue: displayValue // ✅ Field mới với giá trị đã map
    };
  });

  return {
    success: true,
    message: 'Lấy danh sách phiếu bầu thành công',
    data: {
      data: mappedVotes,
      total,
      page,
      pageCount: Math.ceil(total / limit),
    },
  };
}

  async getVotesByResolution(resolutionId: number) {
    const resolution = await this.prisma.resolution.findUnique({ 
      where: { id: resolutionId } 
    });
    if (!resolution) throw new NotFoundException('Nghị quyết không tồn tại');

    const votes = await this.prisma.vote.findMany({
      where: { resolutionId },
      include: {
        shareholder: {
          select: { 
            shareholderCode: true, 
            fullName: true,
            totalShares: true
          }
        },
        meeting: {
          select: { 
            meetingCode: true, 
            meetingName: true 
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      message: 'Lấy danh sách phiếu bầu theo nghị quyết thành công',
      data: votes.map((v) => ({
        ...new VoteResponseDto(v),
        shareholder: v.shareholder,
        meeting: v.meeting
      })),
    };
  }

  async getVotesByShareholder(shareholderId: number) {
    const shareholder = await this.prisma.shareholder.findUnique({ 
      where: { id: shareholderId } 
    });
    if (!shareholder) throw new NotFoundException('Cổ đông không tồn tại');

    const votes = await this.prisma.vote.findMany({
      where: { shareholderId },
      include: {
        resolution: {
          select: { 
            resolutionCode: true, 
            title: true,
            votingMethod: true
          }
        },
        meeting: {
          select: { 
            meetingCode: true, 
            meetingName: true 
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      message: 'Lấy danh sách phiếu bầu theo cổ đông thành công',
      data: votes.map((v) => ({
        ...new VoteResponseDto(v),
        resolution: v.resolution,
        meeting: v.meeting
      })),
    };
  }

async getVoteById(id: number) {
  const vote = await this.prisma.vote.findUnique({ 
    where: { id },
    include: {
      resolution: {
        include: { // ✅ THÊM include để lấy options và candidates
          options: {
            select: {
              id: true,
              optionText: true,
              optionValue: true
            }
          },
          candidates: {
            select: {
              id: true,
              candidateCode: true,
              candidateName: true
            }
          }
        }
      },
      shareholder: true,
      meeting: true
    }
  });
  
  if (!vote) throw new NotFoundException('Phiếu bầu không tồn tại');

  // Map voteValue sang displayValue giống như getVotes
  let displayValue = vote.voteValue;
  
  switch (vote.resolution.votingMethod) {
    case 'MULTIPLE_CHOICE':
      try {
        const selectedIds = JSON.parse(vote.voteValue);
        if (Array.isArray(selectedIds)) {
          const selectedOptions = selectedIds.map(id => {
            const option = vote.resolution.options.find(opt => opt.id === parseInt(id));
            return option ? option.optionText : `Không xác định (${id})`;
          });
          displayValue = selectedOptions.join(', ');
        }
      } catch (error) {
        displayValue = `Lỗi định dạng: ${vote.voteValue}`;
      }
      break;

    case 'YES_NO':
      if (vote.voteValue === 'YES') {
        displayValue = '✅ Đồng ý';
      } else if (vote.voteValue === 'NO') {
        displayValue = '❌ Không đồng ý';
      } else if (vote.voteValue === 'ABSTAIN') {
        displayValue = '⚪ Trắng/Bỏ phiếu';
      } else {
        const option = vote.resolution.options?.find(opt => opt.optionValue === vote.voteValue);
        displayValue = option ? option.optionText : vote.voteValue;
      }
      break;

    case 'RANKING':
      try {
        const ranking = JSON.parse(vote.voteValue);
        if (typeof ranking === 'object' && ranking !== null) {
          const rankedCandidates = Object.entries(ranking)
            .sort(([, rankA], [, rankB]) => (rankA as number) - (rankB as number))
            .map(([candidateCode, rank]) => {
              const candidate = vote.resolution.candidates.find(c => c.candidateCode === candidateCode);
              const candidateName = candidate ? candidate.candidateName : `Không xác định (${candidateCode})`;
              return `${rank}. ${candidateName}`;
            });
          displayValue = rankedCandidates.join(' → ');
        }
      } catch (error) {
        displayValue = `Lỗi định dạng: ${vote.voteValue}`;
      }
      break;

    default:
      break;
  }
  
  return {
    success: true,
    message: 'Lấy thông tin phiếu bầu thành công',
    data: {
      ...new VoteResponseDto(vote),
      resolution: vote.resolution,
      shareholder: vote.shareholder,
      meeting: vote.meeting,
      displayValue: displayValue, // ✅ Thêm displayValue
      rawVoteValue: vote.voteValue // ✅ Giữ nguyên giá trị gốc
    },
  };
}

  async getVotingResults(resolutionId: number) {
    const resolution = await this.prisma.resolution.findUnique({
      where: { id: resolutionId },
      include: {
        candidates: {
          orderBy: { voteCount: 'desc' }
        },
        meeting: true
      }
    });
    
    if (!resolution) throw new NotFoundException('Nghị quyết không tồn tại');

    const votes = await this.prisma.vote.findMany({
      where: { resolutionId },
      include: {
        shareholder: {
          select: { fullName: true, totalShares: true }
        }
      }
    });

    const votingResults = await this.prisma.votingResult.findMany({
      where: { resolutionId },
      include: {
        candidate: true,
        shareholder: {
          select: { fullName: true }
        }
      }
    });

    // Calculate results based on voting method
    let results: any = {};
    
    switch (resolution.votingMethod) {
      case 'YES_NO':
        results = {
          totalSharesVoted: resolution.totalVotes,
          yesShares: resolution.yesVotes,
          noShares: resolution.noVotes,
          abstainShares: resolution.abstainVotes,
          approvalRate: resolution.totalVotes > 0 ? (resolution.yesVotes / resolution.totalVotes * 100).toFixed(2) : 0,
          isApproved: resolution.yesVotes >= (resolution.totalVotes * resolution.approvalThreshold / 100)
        };
        break;

      case 'MULTIPLE_CHOICE':
        results = {
          totalSharesVoted: resolution.totalVotes,
          candidates: resolution.candidates.map(candidate => ({
            ...candidate,
            votePercentage: resolution.totalVotes > 0 ? (candidate.voteCount / resolution.totalVotes * 100).toFixed(2) : 0,
            isElected: candidate.voteCount >= (resolution.totalVotes * resolution.approvalThreshold / 100)
          }))
        };
        break;

      case 'RANKING':
        // Complex ranking calculation
        results = {
          totalSharesVoted: resolution.totalVotes,
          candidates: resolution.candidates.map(candidate => ({
            ...candidate,
            averageRank: this.calculateAverageRank(candidate.id, votingResults),
            rankDistribution: this.calculateRankDistribution(candidate.id, votingResults)
          })).sort((a, b) => a.averageRank - b.averageRank)
        };
        break;
    }

    return {
      success: true,
      message: 'Lấy kết quả bỏ phiếu thành công',
      data: {
        resolution,
        summary: results,
        detailedResults: votingResults.map(vr => new VotingResultResponseDto(vr))
      },
    };
  }

  private calculateAverageRank(candidateId: number, votingResults: any[]): number {
    const candidateResults = votingResults.filter(vr => vr.candidateId === candidateId);
    if (candidateResults.length === 0) return 0;
    
    const totalRank = candidateResults.reduce((sum, vr) => {
      const rank = parseInt(vr.voteType.replace('RANK_', ''));
      return sum + rank;
    }, 0);
    
    return totalRank / candidateResults.length;
  }

  private calculateRankDistribution(candidateId: number, votingResults: any[]): any {
    const distribution: any = {};
    const candidateResults = votingResults.filter(vr => vr.candidateId === candidateId);
    
    candidateResults.forEach(vr => {
      const rank = vr.voteType.replace('RANK_', '');
      distribution[rank] = (distribution[rank] || 0) + 1;
    });
    
    return distribution;
  }

  async getMeetingVotingStatistics(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id: meetingId },
      include: {
        resolutions: {
          include: {
            _count: {
              select: {
                votes: true
              }
            },
            candidates: true
          }
        }
      }
    });
    
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const totalVotes = await this.prisma.vote.count({
      where: { meetingId }
    });

    const totalShareholders = await this.prisma.registration.count({
      where: { 
        meetingId,
        status: { in: ['APPROVED'] }
      }
    });

    const statistics = {
      totalResolutions: meeting.resolutions.length,
      totalVotes,
      totalShareholders,
      participationRate: totalShareholders > 0 ? (totalVotes / totalShareholders * 100).toFixed(2) : 0,
      resolutions: meeting.resolutions.map(resolution => ({
        id: resolution.id,
        title: resolution.title,
        totalVotes: resolution._count.votes,
        votingMethod: resolution.votingMethod,
        approvalStatus: this.calculateApprovalStatus(resolution)
      }))
    };

    return {
      success: true,
      message: 'Lấy thống kê bỏ phiếu thành công',
      data: statistics,
    };
  }

  private calculateApprovalStatus(resolution: any): string {
    if (resolution.totalVotes === 0) return 'NO_VOTES';
    
    const approvalThreshold = resolution.approvalThreshold || 50;
    const approvalRate = (resolution.yesVotes / resolution.totalVotes) * 100;
    
    return approvalRate >= approvalThreshold ? 'APPROVED' : 'REJECTED';
  }

  async exportVotingResults(res: any, resolutionId: number) {
    try {
      const resolution = await this.prisma.resolution.findUnique({
        where: { id: resolutionId },
        include: {
          meeting: true,
          candidates: true
        }
      });
      
      if (!resolution) throw new NotFoundException('Nghị quyết không tồn tại');

      const votes = await this.prisma.vote.findMany({
        where: { resolutionId },
        include: {
          shareholder: {
            select: { shareholderCode: true, fullName: true, totalShares: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      const exportData = votes.map(vote => ({
        'Mã cổ đông': vote.shareholder.shareholderCode,
        'Tên cổ đông': vote.shareholder.fullName,
        'Số cổ phần': vote.shareholder.totalShares,
        'Giá trị bỏ phiếu': vote.voteValue,
        'Số cổ phần sử dụng': vote.sharesUsed,
        'Thời gian bỏ phiếu': this.formatDateTime(vote.createdAt),
        'Địa chỉ IP': vote.ipAddress || '',
        'Thiết bị': vote.userAgent || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Voting_Results');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const fileName = `voting_results_${resolution.resolutionCode}_${new Date().toISOString().split('T')[0]}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      
      return res.send(buffer);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi export kết quả bỏ phiếu',
        error: error.message
      });
    }
  }

  async deleteVote(id: number) {
    const vote = await this.prisma.vote.findUnique({ 
      where: { id },
      include: { resolution: true }
    });
    
    if (!vote) throw new NotFoundException('Phiếu bầu không tồn tại');

    // Start transaction to revert all changes
    await this.prisma.$transaction(async (prisma) => {
      // Revert resolution vote counts
      const updateData: any = {
        totalVotes: { decrement: 1 }
      };

      if (vote.voteValue === 'YES') {
        updateData.yesVotes = { decrement: vote.sharesUsed };
      } else if (vote.voteValue === 'NO') {
        updateData.noVotes = { decrement: vote.sharesUsed };
      } else if (vote.voteValue === 'ABSTAIN') {
        updateData.abstainVotes = { decrement: vote.sharesUsed };
      }

      await prisma.resolution.update({
        where: { id: vote.resolutionId },
        data: updateData
      });

      // Revert candidate vote counts if applicable
      if (vote.resolution.votingMethod === 'MULTIPLE_CHOICE' || vote.resolution.votingMethod === 'RANKING') {
        const votingResults = await prisma.votingResult.findMany({
          where: { 
            resolutionId: vote.resolutionId,
            shareholderId: vote.shareholderId
          }
        });

        for (const result of votingResults) {
          await prisma.resolutionCandidate.update({
            where: { id: result.candidateId! },
            data: {
              voteCount: { decrement: vote.sharesUsed }
            }
          });
        }

        // Delete voting results
        await prisma.votingResult.deleteMany({
          where: { 
            resolutionId: vote.resolutionId,
            shareholderId: vote.shareholderId
          }
        });
      }

      // Delete the vote
      await prisma.vote.delete({ where: { id } });
    });

    return {
      success: true,
      message: 'Xóa phiếu bầu thành công',
      data: null,
    };
  }

  private formatDateTime(date: Date): string {
    if (!date) return '';
    return date.toLocaleString('vi-VN');
  }
}