import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceResponseDto } from './dto/attendance-response.dto';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';

@Injectable()
export class AttendancesService {
  constructor(private prisma: PrismaService) {}

  async createAttendance(dto: CreateAttendanceDto) {
    // Check if meeting exists
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id: dto.meetingId } 
    });
    if (!meeting) throw new BadRequestException('Cuộc họp không tồn tại');

    // Check if shareholder exists
    const shareholder = await this.prisma.shareholder.findUnique({ 
      where: { id: dto.shareholderId } 
    });
    if (!shareholder) throw new BadRequestException('Cổ đông không tồn tại');

    // Check if already checked in for this meeting
    const existingAttendance = await this.prisma.attendance.findUnique({
      where: {
        meetingId_shareholderId: {
          meetingId: dto.meetingId,
          shareholderId: dto.shareholderId
        }
      }
    });
    if (existingAttendance) throw new BadRequestException('Cổ đông đã điểm danh cho cuộc họp này');

    const attendance = await this.prisma.attendance.create({ 
      data: {
        ...dto,
        checkinTime: dto.checkinTime || new Date(),
        checkinMethod: dto.checkinMethod || 'MANUAL'
      }
    });

    return {
      success: true,
      message: 'Tạo điểm danh thành công',
      data: new AttendanceResponseDto(attendance),
    };
  }

  async getAttendances(page = 1, limit = 10, meetingId = '', shareholderId = '', search = '') {
    const skip = (page - 1) * limit;

    const where: Prisma.AttendanceWhereInput = {};
    
    if (meetingId) {
      where.meetingId = +meetingId;
    }

    if (shareholderId) {
      where.shareholderId = +shareholderId;
    }

    if (search) {
      where.OR = [
        { shareholder: { fullName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        { shareholder: { shareholderCode: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        { meeting: { meetingName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
      ];
    }

    const [attendances, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { checkinTime: 'desc' },
        include: {
          meeting: {
            select: { id: true, meetingCode: true, meetingName: true, meetingDate: true }
          },
          shareholder: {
            select: { id: true, shareholderCode: true, fullName: true, email: true, totalShares: true }
          }
        }
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách điểm danh thành công',
      data: {
        data: attendances.map((a) => ({
          ...new AttendanceResponseDto(a),
          meeting: a.meeting,
          shareholder: a.shareholder
        })),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getAttendancesByMeeting(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const attendances = await this.prisma.attendance.findMany({
      where: { meetingId },
      include: {
        shareholder: true,
        meeting: {
          select: { id: true, meetingCode: true, meetingName: true }
        }
      },
      orderBy: { checkinTime: 'desc' }
    });

    return {
      success: true,
      message: 'Lấy danh sách điểm danh theo cuộc họp thành công',
      data: attendances.map((a) => ({
        ...new AttendanceResponseDto(a),
        shareholder: a.shareholder,
        meeting: a.meeting
      })),
    };
  }

  async getAttendancesByShareholder(shareholderId: number) {
    const shareholder = await this.prisma.shareholder.findUnique({ where: { id: shareholderId } });
    if (!shareholder) throw new NotFoundException('Cổ đông không tồn tại');

    const attendances = await this.prisma.attendance.findMany({
      where: { shareholderId },
      include: {
        meeting: true,
        shareholder: {
          select: { id: true, shareholderCode: true, fullName: true }
        }
      },
      orderBy: { checkinTime: 'desc' }
    });

    return {
      success: true,
      message: 'Lấy danh sách điểm danh theo cổ đông thành công',
      data: attendances.map((a) => ({
        ...new AttendanceResponseDto(a),
        meeting: a.meeting,
        shareholder: a.shareholder
      })),
    };
  }

  async getAttendanceById(id: number) {
    const attendance = await this.prisma.attendance.findUnique({ 
      where: { id },
      include: {
        meeting: true,
        shareholder: true
      }
    });
    
    if (!attendance) throw new NotFoundException('Điểm danh không tồn tại');
    
    return {
      success: true,
      message: 'Lấy thông tin điểm danh thành công',
      data: {
        ...new AttendanceResponseDto(attendance),
        meeting: attendance.meeting,
        shareholder: attendance.shareholder
      },
    };
  }

  async updateAttendance(id: number, dto: UpdateAttendanceDto) {
    const attendance = await this.prisma.attendance.findUnique({ where: { id } });
    if (!attendance) throw new NotFoundException('Điểm danh không tồn tại');

    const updated = await this.prisma.attendance.update({ 
      where: { id }, 
      data: dto 
    });

    return {
      success: true,
      message: 'Cập nhật điểm danh thành công',
      data: new AttendanceResponseDto(updated),
    };
  }

  async checkoutAttendance(id: number) {
    const attendance = await this.prisma.attendance.findUnique({ where: { id } });
    if (!attendance) throw new NotFoundException('Điểm danh không tồn tại');

    if (attendance.checkoutTime) {
      throw new BadRequestException('Cổ đông đã checkout');
    }

    const updated = await this.prisma.attendance.update({ 
      where: { id }, 
      data: { checkoutTime: new Date() } 
    });

    return {
      success: true,
      message: 'Checkout thành công',
      data: new AttendanceResponseDto(updated),
    };
  }

  async deleteAttendance(id: number) {
    const attendance = await this.prisma.attendance.findUnique({ where: { id } });
    if (!attendance) throw new NotFoundException('Điểm danh không tồn tại');

    await this.prisma.attendance.delete({ where: { id } });
    
    return {
      success: true,
      message: 'Xóa điểm danh thành công',
      data: null,
    };
  }

  async getMeetingAttendanceStatistics(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const [attendances, totalRegistrations] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { meetingId },
        include: {
          shareholder: true
        }
      }),
      this.prisma.registration.count({
        where: { 
          meetingId,
          status: { in: ['APPROVED'] }
        }
      })
    ]);

    const statistics = {
      totalAttendances: attendances.length,
      totalRegistrations: totalRegistrations,
      attendanceRate: totalRegistrations > 0 ? (attendances.length / totalRegistrations * 100).toFixed(2) : '0.00',
      qrCodeCheckins: attendances.filter(a => a.checkinMethod === 'QR_CODE').length,
      manualCheckins: attendances.filter(a => a.checkinMethod === 'MANUAL').length,
      faceRecognitionCheckins: attendances.filter(a => a.checkinMethod === 'FACE_RECOGNITION').length,
      checkedOut: attendances.filter(a => a.checkoutTime !== null).length,
      stillPresent: attendances.filter(a => a.checkoutTime === null).length,
      totalSharesPresent: attendances.reduce((sum, a) => sum + a.shareholder.totalShares, 0)
    };

    return {
      success: true,
      message: 'Lấy thống kê điểm danh thành công',
      data: statistics,
    };
  }

  async exportAttendances(res: any, meetingId: number) {
    try {
      const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
      if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

      const attendances = await this.prisma.attendance.findMany({
        where: { meetingId },
        orderBy: { checkinTime: 'desc' },
        include: {
          meeting: {
            select: { meetingCode: true, meetingName: true, meetingDate: true }
          },
          shareholder: {
            select: { shareholderCode: true, fullName: true, email: true, totalShares: true }
          }
        }
      });

      const exportData = attendances.map(attendance => ({
        'Mã cổ đông': attendance.shareholder.shareholderCode,
        'Tên cổ đông': attendance.shareholder.fullName,
        'Email': attendance.shareholder.email,
        'Số cổ phần': attendance.shareholder.totalShares,
        'Thời gian check-in': this.formatDateTime(attendance.checkinTime),
        'Thời gian check-out': attendance.checkoutTime ? this.formatDateTime(attendance.checkoutTime) : '',
        'Phương thức check-in': attendance.checkinMethod,
        'Địa chỉ IP': attendance.ipAddress || '',
        'Thiết bị': attendance.userAgent || '',
        'Ghi chú': attendance.notes || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendances');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const fileName = `attendances_${meeting.meetingCode}_${new Date().toISOString().split('T')[0]}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      
      return res.send(buffer);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi export danh sách điểm danh',
        error: error.message
      });
    }
  }

  private formatDateTime(date: Date): string {
    if (!date) return '';
    return date.toLocaleString('vi-VN');
  }
}