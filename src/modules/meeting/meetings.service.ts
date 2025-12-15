import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { MeetingResponseDto } from './dto/meeting-response.dto';
import { Prisma } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as XLSX from 'xlsx';


@Injectable()
export class MeetingsService {
  constructor(private prisma: PrismaService) {}

  async createMeeting(dto: CreateMeetingDto) {
    // Check if meeting code already exists
    const existing = await this.prisma.meeting.findUnique({ 
      where: { meetingCode: dto.meetingCode } 
    });
    if (existing) throw new BadRequestException('Mã cuộc họp đã tồn tại');

    // Check if createdBy user exists
    const user = await this.prisma.user.findUnique({ where: { id: dto.createdBy } });
    if (!user) throw new BadRequestException('Người tạo không tồn tại');

    const meeting = await this.prisma.meeting.create({ 
      data: {
        ...dto,
        totalShares: dto.totalShares || 0,
        totalShareholders: dto.totalShareholders || 0,
        participantCount: dto.participantCount || 0,
        status: dto.status || 'DRAFT'
      }
    });

    return {
      success: true,
      message: 'Tạo cuộc họp thành công',
      data: new MeetingResponseDto(meeting),
    };
  }

  async getMeetings(page = 1, limit = 10, search = '', status = '') {
    const skip = (page - 1) * limit;

    const where: Prisma.MeetingWhereInput = {};
    
    if (search) {
      where.OR = [
        { meetingCode: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { meetingName: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [meetings, total] = await this.prisma.$transaction([
      this.prisma.meeting.findMany({
        where,
        skip,
        take: limit,
        orderBy: { meetingDate: 'desc' },
        include: {
          createdByUser: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      this.prisma.meeting.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách cuộc họp thành công',
      data: {
        data: meetings.map((m) => ({
          ...new MeetingResponseDto(m),
          createdByUser: m.createdByUser
        })),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getAllMeetings(search = '', status = '') {
    const where: Prisma.MeetingWhereInput = {};
    
    if (search) {
      where.OR = [
        { meetingCode: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { meetingName: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const meetings = await this.prisma.meeting.findMany({
      where,
      orderBy: { meetingDate: 'desc' },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return {
      success: true,
      message: 'Lấy tất cả cuộc họp thành công',
      data: meetings.map((m) => ({
        ...new MeetingResponseDto(m),
        createdByUser: m.createdByUser
      })),
    };
  }

  async getMeetingById(id: number) {
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        },
        resolutions: true,
        registrations: {
          include: {
            shareholder: true
          }
        },
        documents: true,
        agendas: true
      }
    });
    
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');
    
    return {
      success: true,
      message: 'Lấy thông tin cuộc họp thành công',
      data: {
        ...new MeetingResponseDto(meeting),
        createdByUser: meeting.createdByUser,
        resolutions: meeting.resolutions,
        registrations: meeting.registrations,
        documents: meeting.documents,
        agendas: meeting.agendas
      },
    };
  }

  async updateMeeting(id: number, dto: UpdateMeetingDto) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    // Check if meeting code already exists (if updating code)
    if (dto.meetingCode && dto.meetingCode !== meeting.meetingCode) {
      const existing = await this.prisma.meeting.findUnique({ 
        where: { meetingCode: dto.meetingCode } 
      });
      if (existing) throw new BadRequestException('Mã cuộc họp đã tồn tại');
    }

    const updated = await this.prisma.meeting.update({ 
      where: { id }, 
      data: dto 
    });

    return {
      success: true,
      message: 'Cập nhật cuộc họp thành công',
      data: new MeetingResponseDto(updated),
    };
  }

  async updateMeetingStatus(id: number, status: string) {
    const validStatuses = ['DRAFT', 'SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Trạng thái không hợp lệ');
    }

    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const updated = await this.prisma.meeting.update({ 
      where: { id }, 
      data: { status } 
    });

    return {
      success: true,
      message: 'Cập nhật trạng thái cuộc họp thành công',
      data: new MeetingResponseDto(updated),
    };
  }

  async deleteMeeting(id: number) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    await this.prisma.meeting.delete({ where: { id } });
    
    return {
      success: true,
      message: 'Xóa cuộc họp thành công',
      data: null,
    };
  }

  async getMeetingStatistics(id: number) {
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id },
      include: {
        registrations: {
          include: {
            shareholder: true
          }
        },
        resolutions: {
          include: {
            votes: true,
            candidates: true
          }
        },
        attendances: true,
        questions: true,
        feedbacks: true
      }
    });

    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const statistics = {
      totalRegistrations: meeting.registrations.length,
      totalAttendances: meeting.attendances.length,
      totalQuestions: meeting.questions.length,
      totalFeedbacks: meeting.feedbacks.length,
      totalResolutions: meeting.resolutions.length,
      totalVotes: meeting.resolutions.reduce((acc, resolution) => acc + resolution.votes.length, 0),
      attendanceRate: meeting.registrations.length > 0 
        ? (meeting.attendances.length / meeting.registrations.length) * 100 
        : 0
    };

    return {
      success: true,
      message: 'Lấy thống kê cuộc họp thành công',
      data: statistics,
    };
  }

  async getAllMeetingShareholders(
  meetingId: number,
  search = '',
  status = '',
  registrationType = ''
) {
  // Kiểm tra meeting tồn tại
  const meeting = await this.prisma.meeting.findUnique({
    where: { id: meetingId },
    select: {
      id: true,
      meetingCode: true,
      meetingName: true,
      meetingDate: true,
      meetingLocation: true,
      meetingAddress: true,
      status: true,
      totalShares: true,
      totalShareholders: true
    }
  });

  if (!meeting) {
    throw new NotFoundException('Cuộc họp không tồn tại');
  }

  const where: Prisma.RegistrationWhereInput = {
    meetingId: meetingId
  };

  // Tìm kiếm
  if (search) {
    where.OR = [
      { registrationCode: { contains: search, mode: 'insensitive' } },
      {
        shareholder: {
          OR: [
            { shareholderCode: { contains: search, mode: 'insensitive' } },
            { fullName: { contains: search, mode: 'insensitive' } },
            { idNumber: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ]
        }
      }
    ];
  }

  // Lọc theo trạng thái
  if (status) {
    where.status = status;
  }

  // Lọc theo hình thức
  if (registrationType) {
    where.registrationType = registrationType;
  }

  // Lấy tất cả registration kèm thông tin shareholder
  const registrations = await this.prisma.registration.findMany({
    where,
    orderBy: [{ shareholder: { fullName: 'asc' } }, { registrationDate: 'desc' }],
    include: {
      shareholder: {
        select: {
          id: true,
          shareholderCode: true,
          fullName: true,
          idNumber: true,
          email: true,
          phoneNumber: true,
          address: true,
          totalShares: true,
          shareType: true,
          dateOfBirth: true,
          gender: true,
          nationality: true,
          bankAccount: true,
          bankName: true,
          taxCode: true,
          isActive: true,
          idIssueDate: true,
          idIssuePlace: true
        }
      }
    }
  });

  // Format dữ liệu để đảm bảo JSON serializable
  const formatDate = (date: Date | null): string | null => {
    return date ? date.toISOString() : null;
  };

  // Tính thống kê
  const totalSharesRegistered = registrations.reduce((sum, reg) => sum + (reg.sharesRegistered || 0), 0);
  const checkedInCount = registrations.filter(reg => reg.checkinTime).length;

  // Format dữ liệu trả về
  const shareholders = registrations.map(registration => ({
    // Thông tin đăng ký
    registrationId: registration.id,
    registrationCode: registration.registrationCode,
    registrationDate: formatDate(registration.registrationDate),
    registrationType: registration.registrationType,
    registrationStatus: registration.status,
    sharesRegistered: registration.sharesRegistered,
    checkinTime: formatDate(registration.checkinTime),
    checkinMethod: registration.checkinMethod,
    notes: registration.notes,
    hasCheckedIn: !!registration.checkinTime,

    // Thông tin ủy quyền
    proxyName: registration.proxyName,
    proxyIdNumber: registration.proxyIdNumber,
    proxyRelationship: registration.proxyRelationship,
    proxyDocumentUrl: registration.proxyDocumentUrl,

    // Thông tin cổ đông
    shareholder: registration.shareholder ? {
      id: registration.shareholder.id,
      shareholderCode: registration.shareholder.shareholderCode,
      fullName: registration.shareholder.fullName,
      idNumber: registration.shareholder.idNumber,
      email: registration.shareholder.email,
      phoneNumber: registration.shareholder.phoneNumber,
      address: registration.shareholder.address,
      totalShares: registration.shareholder.totalShares,
      shareType: registration.shareholder.shareType,
      isActive: registration.shareholder.isActive,
      dateOfBirth: formatDate(registration.shareholder.dateOfBirth),
      gender: registration.shareholder.gender,
      nationality: registration.shareholder.nationality,
      bankAccount: registration.shareholder.bankAccount,
      bankName: registration.shareholder.bankName,
      taxCode: registration.shareholder.taxCode,
      idIssueDate: formatDate(registration.shareholder.idIssueDate),
      idIssuePlace: registration.shareholder.idIssuePlace
    } : null
  }));

  // Thống kê
  const statistics = {
    totalRegistrations: registrations.length,
    totalSharesRegistered: totalSharesRegistered,
    percentageOfTotalShares: meeting.totalShares > 0
      ? parseFloat(((totalSharesRegistered / meeting.totalShares) * 100).toFixed(2))
      : 0,
    checkedInCount: checkedInCount,
    checkinRate: registrations.length > 0
      ? parseFloat(((checkedInCount / registrations.length) * 100).toFixed(2))
      : 0,

    // Phân bổ theo hình thức tham dự
    byRegistrationType: (() => {
      const result: Record<string, number> = {};
      registrations.forEach(reg => {
        const type = reg.registrationType || 'IN_PERSON';
        result[type] = (result[type] || 0) + 1;
      });
      return result;
    })(),

    // Phân bổ theo trạng thái
    byStatus: (() => {
      const result: Record<string, number> = {};
      registrations.forEach(reg => {
        const status = reg.status || 'PENDING';
        result[status] = (result[status] || 0) + 1;
      });
      return result;
    })()
  };

  return {
    success: true,
    message: 'Lấy tất cả cổ đông của cuộc họp thành công',
    data: {
      meeting: {
        id: meeting.id,
        meetingCode: meeting.meetingCode,
        meetingName: meeting.meetingName,
        meetingDate: formatDate(meeting.meetingDate),
        meetingLocation: meeting.meetingLocation,
        meetingAddress: meeting.meetingAddress,
        status: meeting.status,
        totalShares: meeting.totalShares,
        totalShareholders: meeting.totalShareholders
      },
      shareholders,
      statistics,
      total: registrations.length,
      pagination: {
        total: registrations.length,
        page: 1,
        limit: registrations.length,
        totalPages: 1
      }
    },
  };
}

  /**
   * Tự động cập nhật trạng thái meeting dựa trên thời gian
   * Chạy mỗi phút để kiểm tra
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async autoUpdateMeetingStatus() {
    try {
      const now = new Date();
      
      // Lấy tất cả meetings cần kiểm tra (SCHEDULED và ONGOING)
      const meetings = await this.prisma.meeting.findMany({
        where: {
          status: {
            in: ['SCHEDULED', 'ONGOING']
          }
        },
        include: {
          meetingSettings: {
            where: {
              key: 'MEETING_DURATION',
              isActive: true
            }
          }
        }
      });

      let updatedCount = 0;

      for (const meeting of meetings) {
        const meetingDate = new Date(meeting.meetingDate);
        const durationSetting = meeting.meetingSettings.find(s => s.key === 'MEETING_DURATION');
        const meetingDuration = durationSetting ? parseInt(durationSetting.value) : 0;

        // Tính thời gian kết thúc (meetingDate + duration phút)
        const meetingEndTime = new Date(meetingDate.getTime() + meetingDuration * 60 * 1000);

        if (meeting.status === 'SCHEDULED' && now >= meetingDate && now < meetingEndTime) {
          // Chuyển từ SCHEDULED -> ONGOING (đã tới giờ họp)
          await this.prisma.meeting.update({
            where: { id: meeting.id },
            data: { status: 'ONGOING' }
          });
          updatedCount++;
          console.log(`✅ Chuyển meeting ${meeting.meetingCode} sang ONGOING`);
        }
        else if (meeting.status === 'ONGOING' && now >= meetingEndTime) {
          // Chuyển từ ONGOING -> COMPLETED (đã hết thời gian họp)
          await this.prisma.meeting.update({
            where: { id: meeting.id },
            data: { status: 'COMPLETED' }
          });
          updatedCount++;
          console.log(`✅ Chuyển meeting ${meeting.meetingCode} sang COMPLETED`);
        }
      }

      if (updatedCount > 0) {
        console.log(`🔄 Đã cập nhật ${updatedCount} meeting`);
      }

    } catch (error) {
      console.error('❌ Lỗi khi tự động cập nhật trạng thái meeting:', error);
    }
  }

  /**
   * API manual để chạy cập nhật trạng thái ngay lập tức
   */
  async manualUpdateMeetingStatus() {
    return await this.autoUpdateMeetingStatus();
  }

  /**
   * Lấy thông tin meeting với tính toán trạng thái thời gian thực
   */
  async getMeetingWithRealTimeStatus(id: number) {
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true }
        },
        resolutions: true,
        registrations: {
          include: {
            shareholder: true
          }
        },
        documents: true,
        agendas: true,
        meetingSettings: {
          where: {
            key: 'MEETING_DURATION',
            isActive: true
          }
        }
      }
    });
    
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    // Tính toán trạng thái thời gian thực
    const now = new Date();
    const meetingDate = new Date(meeting.meetingDate);
    const durationSetting = meeting.meetingSettings.find(s => s.key === 'MEETING_DURATION');
    const meetingDuration = durationSetting ? parseInt(durationSetting.value) : 0;
    const meetingEndTime = new Date(meetingDate.getTime() + meetingDuration * 60 * 1000);

    const realTimeStatus = {
      currentTime: now,
      meetingStartTime: meetingDate,
      meetingEndTime: meetingEndTime,
      timeUntilStart: Math.max(0, meetingDate.getTime() - now.getTime()),
      timeUntilEnd: Math.max(0, meetingEndTime.getTime() - now.getTime()),
      isStarted: now >= meetingDate,
      isEnded: now >= meetingEndTime,
      shouldBeStatus: this.calculateShouldBeStatus(now, meetingDate, meetingEndTime, meeting.status)
    };

    return {
      success: true,
      message: 'Lấy thông tin cuộc họp thành công',
      data: {
        ...new MeetingResponseDto(meeting),
        createdByUser: meeting.createdByUser,
        resolutions: meeting.resolutions,
        registrations: meeting.registrations,
        documents: meeting.documents,
        agendas: meeting.agendas,
        realTimeStatus
      },
    };
  }

  /**
   * Tính toán trạng thái meeting nên có dựa trên thời gian
   */
  private calculateShouldBeStatus(now: Date, meetingDate: Date, meetingEndTime: Date, currentStatus: string): string {
    if (now < meetingDate) {
      return 'SCHEDULED';
    } else if (now >= meetingDate && now < meetingEndTime) {
      return 'ONGOING';
    } else if (now >= meetingEndTime) {
      return 'COMPLETED';
    }
    return currentStatus;
  }


}