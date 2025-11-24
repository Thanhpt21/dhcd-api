import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateMeetingMinuteDto, MinuteStatus } from './dto/create-meeting-minute.dto';
import { UpdateMeetingMinuteDto } from './dto/update-meeting-minute.dto';
import { MeetingMinuteResponseDto } from './dto/meeting-minute-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MeetingMinutesService {
  constructor(private prisma: PrismaService) {}

  async createMeetingMinute(dto: CreateMeetingMinuteDto) {
    // Validate meeting exists
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id: dto.meetingId } 
    });
    if (!meeting) throw new BadRequestException('Cuộc họp không tồn tại');

    // Validate createdBy user exists
    const createdByUser = await this.prisma.user.findUnique({ 
      where: { id: dto.createdBy } 
    });
    if (!createdByUser) throw new BadRequestException('Người tạo không tồn tại');

    // Validate approvedBy user exists if provided
    if (dto.approvedBy) {
      const approvedByUser = await this.prisma.user.findUnique({ 
        where: { id: dto.approvedBy } 
      });
      if (!approvedByUser) throw new BadRequestException('Người phê duyệt không tồn tại');
    }

    const meetingMinute = await this.prisma.meetingMinute.create({
      data: {
        meetingId: dto.meetingId,
        title: dto.title,
        content: dto.content,
        attachments: dto.attachments as Prisma.InputJsonValue,
        version: dto.version || '1.0',
        status: dto.status || MinuteStatus.DRAFT,
        createdBy: dto.createdBy,
        approvedBy: dto.approvedBy,
        approvedAt: dto.approvedBy ? new Date() : undefined
      }
    });

    return {
      success: true,
      message: 'Tạo biên bản cuộc họp thành công',
      data: new MeetingMinuteResponseDto(meetingMinute),
    };
  }

  async getMeetingMinutes(
    page = 1, 
    limit = 10, 
    meetingId = '', 
    status = '', 
    createdBy = '', 
    search = ''
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.MeetingMinuteWhereInput = {};
    
    if (meetingId) {
      where.meetingId = +meetingId;
    }

    if (status) {
        where.status = {
        equals: status as any
        } as Prisma.EnumMinuteStatusFilter;
    }

    if (createdBy) {
      where.createdBy = +createdBy;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { content: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    const [minutes, total] = await this.prisma.$transaction([
      this.prisma.meetingMinute.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          meeting: {
            select: { id: true, meetingCode: true, meetingName: true }
          },
          createdByUser: {
            select: { id: true, name: true, email: true }
          },
          approvedByUser: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      this.prisma.meetingMinute.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách biên bản thành công',
      data: {
        data: minutes.map(minute => new MeetingMinuteResponseDto(minute)),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getMeetingMinutesByMeeting(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id: meetingId } 
    });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const minutes = await this.prisma.meetingMinute.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdByUser: {
          select: { name: true, email: true }
        },
        approvedByUser: {
          select: { name: true, email: true }
        }
      }
    });

    return {
      success: true,
      message: 'Lấy biên bản theo cuộc họp thành công',
      data: minutes.map(minute => new MeetingMinuteResponseDto(minute)),
    };
  }

  async getMeetingMinutesByUser(userId: number) {
    const user = await this.prisma.user.findUnique({ 
      where: { id: userId } 
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const minutes = await this.prisma.meetingMinute.findMany({
      where: { createdBy: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        meeting: {
          select: { meetingCode: true, meetingName: true }
        }
      }
    });

    return {
      success: true,
      message: 'Lấy biên bản theo người tạo thành công',
      data: minutes.map(minute => new MeetingMinuteResponseDto(minute)),
    };
  }

  async getMeetingMinuteById(id: number) {
    const minute = await this.prisma.meetingMinute.findUnique({ 
      where: { id },
      include: {
        meeting: {
          select: { id: true, meetingCode: true, meetingName: true }
        },
        createdByUser: {
          select: { id: true, name: true, email: true }
        },
        approvedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    if (!minute) throw new NotFoundException('Biên bản không tồn tại');
    
    return {
      success: true,
      message: 'Lấy thông tin biên bản thành công',
      data: new MeetingMinuteResponseDto(minute),
    };
  }

  async updateMeetingMinute(id: number, dto: UpdateMeetingMinuteDto) {
    const minute = await this.prisma.meetingMinute.findUnique({ 
      where: { id } 
    });
    if (!minute) throw new NotFoundException('Biên bản không tồn tại');

    // Validate approvedBy user exists if provided
    if (dto.approvedBy) {
      const approvedByUser = await this.prisma.user.findUnique({ 
        where: { id: dto.approvedBy } 
      });
      if (!approvedByUser) throw new BadRequestException('Người phê duyệt không tồn tại');
    }

    // Only update provided fields
    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.attachments !== undefined) updateData.attachments = dto.attachments as Prisma.InputJsonValue;
    if (dto.version !== undefined) updateData.version = dto.version;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.approvedBy !== undefined) {
      updateData.approvedBy = dto.approvedBy;
      updateData.approvedAt = dto.approvedBy ? new Date() : null;
    }

    const updated = await this.prisma.meetingMinute.update({
      where: { id },
      data: updateData
    });

    return {
      success: true,
      message: 'Cập nhật biên bản thành công',
      data: new MeetingMinuteResponseDto(updated),
    };
  }

  async deleteMeetingMinute(id: number) {
    const minute = await this.prisma.meetingMinute.findUnique({ 
      where: { id } 
    });
    if (!minute) throw new NotFoundException('Biên bản không tồn tại');

    await this.prisma.meetingMinute.delete({ where: { id } });
    
    return {
      success: true,
      message: 'Xóa biên bản thành công',
      data: null,
    };
  }

  async approveMeetingMinute(id: number, approvedBy: number) {
    const minute = await this.prisma.meetingMinute.findUnique({ 
      where: { id } 
    });
    if (!minute) throw new NotFoundException('Biên bản không tồn tại');

    // Validate approvedBy user exists
    const approvedByUser = await this.prisma.user.findUnique({ 
      where: { id: approvedBy } 
    });
    if (!approvedByUser) throw new BadRequestException('Người phê duyệt không tồn tại');

    const updated = await this.prisma.meetingMinute.update({
      where: { id },
      data: { 
        status: MinuteStatus.APPROVED,
        approvedBy: approvedBy,
        approvedAt: new Date()
      }
    });

    return {
      success: true,
      message: 'Phê duyệt biên bản thành công',
      data: new MeetingMinuteResponseDto(updated),
    };
  }

  async rejectMeetingMinute(id: number) {
    const minute = await this.prisma.meetingMinute.findUnique({ 
      where: { id } 
    });
    if (!minute) throw new NotFoundException('Biên bản không tồn tại');

    const updated = await this.prisma.meetingMinute.update({
      where: { id },
      data: { 
        status: MinuteStatus.REJECTED,
        approvedBy: null,
        approvedAt: null
      }
    });

    return {
      success: true,
      message: 'Từ chối biên bản thành công',
      data: new MeetingMinuteResponseDto(updated),
    };
  }

  async submitForApproval(id: number) {
    const minute = await this.prisma.meetingMinute.findUnique({ 
      where: { id } 
    });
    if (!minute) throw new NotFoundException('Biên bản không tồn tại');

    const updated = await this.prisma.meetingMinute.update({
      where: { id },
      data: { 
        status: MinuteStatus.PENDING_APPROVAL
      }
    });

    return {
      success: true,
      message: 'Gửi phê duyệt biên bản thành công',
      data: new MeetingMinuteResponseDto(updated),
    };
  }

  async getLatestMeetingMinute(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id: meetingId } 
    });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const latestMinute = await this.prisma.meetingMinute.findFirst({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdByUser: {
          select: { name: true, email: true }
        },
        approvedByUser: {
          select: { name: true, email: true }
        }
      }
    });

    if (!latestMinute) {
      return {
        success: true,
        message: 'Chưa có biên bản nào cho cuộc họp này',
        data: null,
      };
    }

    return {
      success: true,
      message: 'Lấy biên bản mới nhất thành công',
      data: new MeetingMinuteResponseDto(latestMinute),
    };
  }

  async createNewVersion(originalId: number, dto: CreateMeetingMinuteDto) {
    const originalMinute = await this.prisma.meetingMinute.findUnique({ 
      where: { id: originalId } 
    });
    if (!originalMinute) throw new NotFoundException('Biên bản gốc không tồn tại');

    // Calculate next version
    const currentVersion = parseFloat(originalMinute.version);
    const nextVersion = (currentVersion + 0.1).toFixed(1);

    const newMinute = await this.prisma.meetingMinute.create({
      data: {
        meetingId: dto.meetingId,
        title: dto.title,
        content: dto.content,
        attachments: dto.attachments as Prisma.InputJsonValue,
        version: nextVersion,
        status: MinuteStatus.DRAFT,
        createdBy: dto.createdBy
      }
    });

    return {
      success: true,
      message: 'Tạo phiên bản mới thành công',
      data: new MeetingMinuteResponseDto(newMinute),
    };
  }
}