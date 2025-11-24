import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateAgendaDto } from './dto/create-agenda.dto';
import { UpdateAgendaDto } from './dto/update-agenda.dto';
import { AgendaResponseDto } from './dto/agenda-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AgendasService {
  constructor(private prisma: PrismaService) {}

  async createAgenda(dto: CreateAgendaDto) {
    // Check if meeting exists
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id: dto.meetingId } 
    });
    if (!meeting) throw new BadRequestException('Cuộc họp không tồn tại');

    // Check if agenda code already exists
    const existingCode = await this.prisma.agenda.findFirst({ 
      where: { agendaCode: dto.agendaCode } 
    });
    if (existingCode) throw new BadRequestException('Mã chương trình nghị sự đã tồn tại');

    // Calculate duration if startTime and endTime are provided
    let duration = dto.duration;
    if (dto.startTime && dto.endTime) {
      const start = new Date(dto.startTime);
      const end = new Date(dto.endTime);
      duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // minutes
    }

    const agenda = await this.prisma.agenda.create({ 
      data: {
        ...dto,
        duration,
        displayOrder: dto.displayOrder || 0,
        status: dto.status || 'PENDING'
      }
    });

    return {
      success: true,
      message: 'Tạo chương trình nghị sự thành công',
      data: new AgendaResponseDto(agenda),
    };
  }

  async getAgendas(page = 1, limit = 10, meetingId = '', status = '', search = '') {
    const skip = (page - 1) * limit;

    const where: Prisma.AgendaWhereInput = {};
    
    if (meetingId) {
      where.meetingId = +meetingId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { agendaCode: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { speaker: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    const [agendas, total] = await this.prisma.$transaction([
      this.prisma.agenda.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ meetingId: 'asc' }, { displayOrder: 'asc' }, { startTime: 'asc' }],
        include: {
          meeting: {
            select: { id: true, meetingCode: true, meetingName: true, meetingDate: true }
          }
        }
      }),
      this.prisma.agenda.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách chương trình nghị sự thành công',
      data: {
        data: agendas.map((a) => ({
          ...new AgendaResponseDto(a),
          meeting: a.meeting
        })),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getAgendasByMeeting(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const agendas = await this.prisma.agenda.findMany({
      where: { meetingId },
      include: {
        meeting: {
          select: { meetingCode: true, meetingName: true }
        }
      },
      orderBy: [{ displayOrder: 'asc' }, { startTime: 'asc' }]
    });

    return {
      success: true,
      message: 'Lấy danh sách chương trình nghị sự theo cuộc họp thành công',
      data: agendas.map((a) => ({
        ...new AgendaResponseDto(a),
        meeting: a.meeting
      })),
    };
  }

  async getAgendaTimeline(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const agendas = await this.prisma.agenda.findMany({
      where: { 
        meetingId,
        startTime: { not: null },
        endTime: { not: null }
      },
      orderBy: [{ startTime: 'asc' }]
    });

    // Calculate timeline statistics
    const totalDuration = agendas.reduce((sum, agenda) => sum + (agenda.duration || 0), 0);
    const completedDuration = agendas
      .filter(agenda => agenda.status === 'COMPLETED')
      .reduce((sum, agenda) => sum + (agenda.duration || 0), 0);

    const timeline = {
      totalItems: agendas.length,
      totalDuration,
      completedDuration,
      completionRate: totalDuration > 0 ? (completedDuration / totalDuration * 100).toFixed(2) : 0,
      items: agendas.map(agenda => ({
        ...new AgendaResponseDto(agenda),
        progress: this.calculateAgendaProgress(agenda)
      }))
    };

    return {
      success: true,
      message: 'Lấy timeline chương trình nghị sự thành công',
      data: timeline,
    };
  }

  private calculateAgendaProgress(agenda: any): number {
    if (agenda.status === 'COMPLETED') return 100;
    if (agenda.status === 'ONGOING') return 50;
    if (agenda.status === 'PENDING') return 0;
    return 0;
  }

  async getAgendaById(id: number) {
    const agenda = await this.prisma.agenda.findUnique({ 
      where: { id },
      include: {
        meeting: true
      }
    });
    
    if (!agenda) throw new NotFoundException('Chương trình nghị sự không tồn tại');
    
    return {
      success: true,
      message: 'Lấy thông tin chương trình nghị sự thành công',
      data: {
        ...new AgendaResponseDto(agenda),
        meeting: agenda.meeting
      },
    };
  }

  async updateAgenda(id: number, dto: UpdateAgendaDto) {
    const agenda = await this.prisma.agenda.findUnique({ where: { id } });
    if (!agenda) throw new NotFoundException('Chương trình nghị sự không tồn tại');

    // Recalculate duration if times are updated
    let duration = dto.duration;
    if ((dto.startTime || dto.endTime) && !dto.duration) {
      const startTime = dto.startTime ? new Date(dto.startTime) : agenda.startTime;
      const endTime = dto.endTime ? new Date(dto.endTime) : agenda.endTime;
      
      if (startTime && endTime) {
        duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      }
    }

    const updateData: any = { ...dto };
    if (duration !== undefined) {
      updateData.duration = duration;
    }

    const updated = await this.prisma.agenda.update({ 
      where: { id }, 
      data: updateData
    });

    return {
      success: true,
      message: 'Cập nhật chương trình nghị sự thành công',
      data: new AgendaResponseDto(updated),
    };
  }

  async updateAgendaStatus(id: number, status: string) {
    const validStatuses = ['PENDING', 'ONGOING', 'COMPLETED', 'CANCELLED', 'DELAYED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Trạng thái không hợp lệ');
    }

    const agenda = await this.prisma.agenda.findUnique({ where: { id } });
    if (!agenda) throw new NotFoundException('Chương trình nghị sự không tồn tại');

    const updated = await this.prisma.agenda.update({ 
      where: { id }, 
      data: { status } 
    });

    return {
      success: true,
      message: 'Cập nhật trạng thái chương trình nghị sự thành công',
      data: new AgendaResponseDto(updated),
    };
  }

  async updateAgendaTime(id: number, startTime?: string, endTime?: string, duration?: number) {
    const agenda = await this.prisma.agenda.findUnique({ where: { id } });
    if (!agenda) throw new NotFoundException('Chương trình nghị sự không tồn tại');

    let calculatedDuration = duration;
    if (startTime && endTime && !duration) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      calculatedDuration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    }

    const updated = await this.prisma.agenda.update({ 
      where: { id }, 
      data: { 
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        duration: calculatedDuration
      } 
    });

    return {
      success: true,
      message: 'Cập nhật thời gian chương trình nghị sự thành công',
      data: new AgendaResponseDto(updated),
    };
  }

  async updateAgendaOrder(id: number, displayOrder: number) {
    const agenda = await this.prisma.agenda.findUnique({ where: { id } });
    if (!agenda) throw new NotFoundException('Chương trình nghị sự không tồn tại');

    if (displayOrder < 0) {
      throw new BadRequestException('Thứ tự hiển thị không thể âm');
    }

    const updated = await this.prisma.agenda.update({ 
      where: { id }, 
      data: { displayOrder } 
    });

    return {
      success: true,
      message: 'Cập nhật thứ tự hiển thị thành công',
      data: new AgendaResponseDto(updated),
    };
  }

  async deleteAgenda(id: number) {
    const agenda = await this.prisma.agenda.findUnique({ where: { id } });
    if (!agenda) throw new NotFoundException('Chương trình nghị sự không tồn tại');

    await this.prisma.agenda.delete({ where: { id } });
    
    return {
      success: true,
      message: 'Xóa chương trình nghị sự thành công',
      data: null,
    };
  }

  async getMeetingAgendaStatistics(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id: meetingId },
      include: {
        agendas: true
      }
    });
    
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const statistics = {
      totalAgendas: meeting.agendas.length,
      pendingAgendas: meeting.agendas.filter(a => a.status === 'PENDING').length,
      ongoingAgendas: meeting.agendas.filter(a => a.status === 'ONGOING').length,
      completedAgendas: meeting.agendas.filter(a => a.status === 'COMPLETED').length,
      cancelledAgendas: meeting.agendas.filter(a => a.status === 'CANCELLED').length,
      totalDuration: meeting.agendas.reduce((sum, a) => sum + (a.duration || 0), 0),
      completedDuration: meeting.agendas
        .filter(a => a.status === 'COMPLETED')
        .reduce((sum, a) => sum + (a.duration || 0), 0),
      completionRate: meeting.agendas.length > 0 
        ? (meeting.agendas.filter(a => a.status === 'COMPLETED').length / meeting.agendas.length * 100).toFixed(2)
        : 0,
      hasPresentation: meeting.agendas.filter(a => a.presentationUrl).length,
      byStatus: this.groupBy(meeting.agendas, 'status')
    };

    return {
      success: true,
      message: 'Lấy thống kê chương trình nghị sự thành công',
      data: statistics,
    };
  }

  async getCurrentAgenda(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const currentAgenda = await this.prisma.agenda.findFirst({
      where: { 
        meetingId,
        status: 'ONGOING'
      },
      include: {
        meeting: {
          select: { meetingCode: true, meetingName: true }
        }
      }
    });

    if (!currentAgenda) {
      // If no ongoing agenda, get the first pending agenda
      const nextAgenda = await this.prisma.agenda.findFirst({
        where: { 
          meetingId,
          status: 'PENDING'
        },
        orderBy: [{ displayOrder: 'asc' }, { startTime: 'asc' }],
        include: {
          meeting: {
            select: { meetingCode: true, meetingName: true }
          }
        }
      });

      return {
        success: true,
        message: nextAgenda ? 'Chương trình tiếp theo' : 'Không có chương trình nào',
        data: nextAgenda ? {
          ...new AgendaResponseDto(nextAgenda),
          meeting: nextAgenda.meeting,
          isNext: true
        } : null
      };
    }

    return {
      success: true,
      message: 'Chương trình hiện tại',
      data: {
        ...new AgendaResponseDto(currentAgenda),
        meeting: currentAgenda.meeting,
        isCurrent: true
      }
    };
  }

  private groupBy(array: any[], key: string) {
    return array.reduce((groups, item) => {
      const group = item[key] || 'Unknown';
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {});
  }
}