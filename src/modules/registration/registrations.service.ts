import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import { RegistrationResponseDto } from './dto/registration-response.dto';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';

@Injectable()
export class RegistrationsService {
  constructor(private prisma: PrismaService) {}

  async createRegistration(dto: CreateRegistrationDto) {
    // Check if registration code already exists
    const existingCode = await this.prisma.registration.findUnique({ 
      where: { registrationCode: dto.registrationCode } 
    });
    if (existingCode) throw new BadRequestException('Mã đăng ký đã tồn tại');

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

    // Check if already registered for this meeting
    const existingRegistration = await this.prisma.registration.findFirst({
      where: {
        meetingId: dto.meetingId,
        shareholderId: dto.shareholderId
      }
    });
    if (existingRegistration) throw new BadRequestException('Cổ đông đã đăng ký cho cuộc họp này');

    const registration = await this.prisma.registration.create({ 
      data: {
        ...dto,
        registrationType: dto.registrationType || 'IN_PERSON',
        status: dto.status || 'PENDING',
        registrationDate: dto.registrationDate || new Date()
      }
    });

    return {
      success: true,
      message: 'Tạo đăng ký thành công',
      data: new RegistrationResponseDto(registration),
    };
  }

  async getRegistrations(page = 1, limit = 10, search = '', status = '', meetingId = '', shareholderId = '') {
    const skip = (page - 1) * limit;

    const where: Prisma.RegistrationWhereInput = {};
    
    if (search) {
      where.OR = [
        { registrationCode: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { shareholder: { fullName: { contains: search, mode: 'insensitive' as Prisma.QueryMode } } },
        { shareholder: { shareholderCode: { contains: search, mode: 'insensitive' as Prisma.QueryMode } } },
        { meeting: { meetingName: { contains: search, mode: 'insensitive' as Prisma.QueryMode } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (meetingId) {
      where.meetingId = +meetingId;
    }

    if (shareholderId) {
      where.shareholderId = +shareholderId;
    }

    const [registrations, total] = await this.prisma.$transaction([
      this.prisma.registration.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          meeting: {
            select: { id: true, meetingCode: true, meetingName: true, meetingDate: true }
          },
          shareholder: {
            select: { id: true, shareholderCode: true, fullName: true, email: true, totalShares: true, idNumber: true, isActive: true }
          }
        }
      }),
      this.prisma.registration.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách đăng ký thành công',
      data: {
        data: registrations.map((r) => ({
          ...new RegistrationResponseDto(r),
          meeting: r.meeting,
          shareholder: r.shareholder
        })),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getAllRegistrations(search = '', status = '', meetingId = '', shareholderId = '') {
    const where: Prisma.RegistrationWhereInput = {};
    
    if (search) {
      where.OR = [
        { registrationCode: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { shareholder: { fullName: { contains: search, mode: 'insensitive' as Prisma.QueryMode } } },
        { shareholder: { shareholderCode: { contains: search, mode: 'insensitive' as Prisma.QueryMode } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (meetingId) {
      where.meetingId = +meetingId;
    }

    if (shareholderId) {
      where.shareholderId = +shareholderId;
    }

    const registrations = await this.prisma.registration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        meeting: {
          select: { id: true, meetingCode: true, meetingName: true }
        },
        shareholder: {
          select: { id: true, shareholderCode: true, fullName: true }
        }
      }
    });

    return {
      success: true,
      message: 'Lấy tất cả đăng ký thành công',
      data: registrations.map((r) => ({
        ...new RegistrationResponseDto(r),
        meeting: r.meeting,
        shareholder: r.shareholder
      })),
    };
  }

  async getRegistrationById(id: number) {
    const registration = await this.prisma.registration.findUnique({ 
      where: { id },
      include: {
        meeting: true,
        shareholder: true
      }
    });
    
    if (!registration) throw new NotFoundException('Đăng ký không tồn tại');
    
    return {
      success: true,
      message: 'Lấy thông tin đăng ký thành công',
      data: {
        ...new RegistrationResponseDto(registration),
        meeting: registration.meeting,
        shareholder: registration.shareholder
      },
    };
  }

  async getRegistrationsByMeeting(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const registrations = await this.prisma.registration.findMany({
      where: { meetingId },
      include: {
        shareholder: true,
        meeting: {
          select: { id: true, meetingCode: true, meetingName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      message: 'Lấy danh sách đăng ký theo cuộc họp thành công',
      data: registrations.map((r) => ({
        ...new RegistrationResponseDto(r),
        shareholder: r.shareholder,
        meeting: r.meeting
      })),
    };
  }

  async getRegistrationsByShareholder(shareholderId: number) {
    const shareholder = await this.prisma.shareholder.findUnique({ where: { id: shareholderId } });
    if (!shareholder) throw new NotFoundException('Cổ đông không tồn tại');

    const registrations = await this.prisma.registration.findMany({
      where: { shareholderId },
      include: {
        meeting: true,
        shareholder: {
          select: { id: true, shareholderCode: true, fullName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      message: 'Lấy danh sách đăng ký theo cổ đông thành công',
      data: registrations.map((r) => ({
        ...new RegistrationResponseDto(r),
        meeting: r.meeting,
        shareholder: r.shareholder
      })),
    };
  }

  async updateRegistration(id: number, dto: UpdateRegistrationDto) {
    const registration = await this.prisma.registration.findUnique({ where: { id } });
    if (!registration) throw new NotFoundException('Đăng ký không tồn tại');

    // Check unique constraints if updating
    if (dto.registrationCode && dto.registrationCode !== registration.registrationCode) {
      const existing = await this.prisma.registration.findUnique({ 
        where: { registrationCode: dto.registrationCode } 
      });
      if (existing) throw new BadRequestException('Mã đăng ký đã tồn tại');
    }

    const updated = await this.prisma.registration.update({ 
      where: { id }, 
      data: dto 
    });

    return {
      success: true,
      message: 'Cập nhật đăng ký thành công',
      data: new RegistrationResponseDto(updated),
    };
  }

  async updateRegistrationStatus(id: number, status: string) {
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Trạng thái không hợp lệ');
    }

    const registration = await this.prisma.registration.findUnique({ where: { id } });
    if (!registration) throw new NotFoundException('Đăng ký không tồn tại');

    const updated = await this.prisma.registration.update({ 
      where: { id }, 
      data: { status } 
    });

    return {
      success: true,
      message: 'Cập nhật trạng thái đăng ký thành công',
      data: new RegistrationResponseDto(updated),
    };
  }


  async cancelRegistration(id: number) {
    const registration = await this.prisma.registration.findUnique({ where: { id } });
    if (!registration) throw new NotFoundException('Đăng ký không tồn tại');

    if (registration.status === 'APPROVED') {
      throw new BadRequestException('Không thể hủy đăng ký đã duyệt');
    }

    const updated = await this.prisma.registration.update({ 
      where: { id }, 
      data: { status: 'CANCELLED' } 
    });

    return {
      success: true,
      message: 'Hủy đăng ký thành công',
      data: new RegistrationResponseDto(updated),
    };
  }

  async deleteRegistration(id: number) {
    const registration = await this.prisma.registration.findUnique({ where: { id } });
    if (!registration) throw new NotFoundException('Đăng ký không tồn tại');

    await this.prisma.registration.delete({ where: { id } });
    
    return {
      success: true,
      message: 'Xóa đăng ký thành công',
      data: null,
    };
  }

  async getMeetingRegistrationStatistics(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const registrations = await this.prisma.registration.findMany({
      where: { meetingId },
      include: {
        shareholder: true
      }
    });

    const statistics = {
      totalRegistrations: registrations.length,
      pending: registrations.filter(r => r.status === 'PENDING').length,
      approved: registrations.filter(r => r.status === 'APPROVED').length,
      rejected: registrations.filter(r => r.status === 'REJECTED').length,
      cancelled: registrations.filter(r => r.status === 'CANCELLED').length,
      totalShares: registrations.reduce((sum, r) => sum + r.sharesRegistered, 0),
      inPerson: registrations.filter(r => r.registrationType === 'IN_PERSON').length,
      online: registrations.filter(r => r.registrationType === 'ONLINE').length,
      proxy: registrations.filter(r => r.registrationType === 'PROXY').length,
      absent: registrations.filter(r => r.registrationType === 'ABSENT').length
    };

    return {
      success: true,
      message: 'Lấy thống kê đăng ký cuộc họp thành công',
      data: statistics,
    };
  }

  async getShareholderRegistrationStatistics(shareholderId: number) {
    const shareholder = await this.prisma.shareholder.findUnique({ where: { id: shareholderId } });
    if (!shareholder) throw new NotFoundException('Cổ đông không tồn tại');

    const registrations = await this.prisma.registration.findMany({
      where: { shareholderId },
      include: {
        meeting: true
      }
    });

    const statistics = {
      totalRegistrations: registrations.length,
      pending: registrations.filter(r => r.status === 'PENDING').length,
      approved: registrations.filter(r => r.status === 'APPROVED').length,
      rejected: registrations.filter(r => r.status === 'REJECTED').length,
      cancelled: registrations.filter(r => r.status === 'CANCELLED').length,
      upcomingMeetings: registrations.filter(r => 
        r.status === 'APPROVED' && new Date(r.meeting.meetingDate) > new Date()
      ).length,
    };

    return {
      success: true,
      message: 'Lấy thống kê đăng ký cổ đông thành công',
      data: statistics,
    };
  }

  async importRegistrations(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File không được tìm thấy');
    }

    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const results = {
        total: data.length,
        success: 0,
        errors: [] as string[],
        details: [] as any[]
      };

      for (const [index, row] of data.entries()) {
        try {
          const rowData = row as Record<string, any>;
          
          // Map Excel columns to registration data
          const registrationData: CreateRegistrationDto = {
            meetingId: parseInt(rowData['Mã cuộc họp']) || 0,
            shareholderId: parseInt(rowData['Mã cổ đông']) || 0,
            registrationCode: String(rowData['Mã đăng ký'] || '').trim(),
            registrationType: (rowData['Loại đăng ký'] || 'IN_PERSON').trim(),
            status: (rowData['Trạng thái'] || 'PENDING').trim(),
            sharesRegistered: parseInt(rowData['Số cổ phần đăng ký']) || 0,
            registrationDate: rowData['Ngày đăng ký'] ? new Date(rowData['Ngày đăng ký']) : new Date()
          };

          // Validate required fields
          if (!registrationData.registrationCode) {
            throw new Error('Mã đăng ký là bắt buộc');
          }
          if (!registrationData.meetingId) {
            throw new Error('Mã cuộc họp là bắt buộc');
          }
          if (!registrationData.shareholderId) {
            throw new Error('Mã cổ đông là bắt buộc');
          }

          // Create registration
          const createdRegistration = await this.createRegistration(registrationData);
          
          results.success++;
          results.details.push({
            row: index + 2,
            registrationCode: registrationData.registrationCode,
            status: 'SUCCESS',
            message: 'Thành công'
          });

        } catch (error) {
          const rowNumber = index + 2;
          const errorMessage = `Dòng ${rowNumber}: ${error.message}`;
          
          results.errors.push(errorMessage);
          results.details.push({
            row: rowNumber,
            registrationCode: String((row as any)?.['Mã đăng ký'] || 'N/A'),
            status: 'ERROR',
            message: error.message
          });
        }
      }

      return {
        success: true,
        message: `Import hoàn tất: ${results.success}/${results.total} bản ghi thành công`,
        data: results
      };

    } catch (error) {
      throw new BadRequestException('Lỗi khi xử lý file Excel: ' + error.message);
    }
  }

  async exportRegistrations(res: any, meetingId?: number) {
    try {
      const where: Prisma.RegistrationWhereInput = {};
      
      if (meetingId) {
        where.meetingId = meetingId;
      }

      // Lấy tất cả đăng ký từ database
      const registrations = await this.prisma.registration.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          meeting: {
            select: { meetingCode: true, meetingName: true, meetingDate: true }
          },
          shareholder: {
            select: { shareholderCode: true, fullName: true, email: true, totalShares: true }
          }
        }
      });

      // Format data để export
      const exportData = registrations.map(registration => ({
        'Mã đăng ký': registration.registrationCode,
        'Mã cuộc họp': registration.meeting.meetingCode,
        'Tên cuộc họp': registration.meeting.meetingName,
        'Mã cổ đông': registration.shareholder.shareholderCode,
        'Tên cổ đông': registration.shareholder.fullName,
        'Email': registration.shareholder.email,
        'Loại đăng ký': registration.registrationType,
        'Trạng thái': registration.status,
        'Số cổ phần đăng ký': registration.sharesRegistered,
        'Ngày đăng ký': this.formatDate(registration.registrationDate),
        'Thời gian check-in': registration.checkinTime ? this.formatDate(registration.checkinTime) : '',
        'Phương thức check-in': registration.checkinMethod || '',
        'Người được ủy quyền': registration.proxyName || '',
        'CCCD người ủy quyền': registration.proxyIdNumber || '',
        'Quan hệ': registration.proxyRelationship || '',
        'Ghi chú': registration.notes || '',
        'Ngày tạo': this.formatDate(registration.createdAt)
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      const fileName = meetingId 
        ? `registrations_meeting_${meetingId}_${new Date().toISOString().split('T')[0]}.xlsx`
        : `registrations_${new Date().toISOString().split('T')[0]}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
      
      return res.send(buffer);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi export danh sách đăng ký',
        error: error.message
      });
    }
  }

  // Helper method để format date
  private formatDate(date: Date): string {
    if (!date) return '';
    return date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  }
}