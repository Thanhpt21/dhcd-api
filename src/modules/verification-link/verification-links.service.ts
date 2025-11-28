import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateVerificationLinkDto } from './dto/create-verification-link.dto';
import { VerifyLinkDto } from './dto/verify-link.dto';
import { VerificationLinkResponseDto } from './dto/verification-link-response.dto';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { EmailService } from '../email/email.service';
import { AttendancesService } from '../attendance/attendances.service';
import { RegistrationsService } from '../registration/registrations.service';

@Injectable()
export class VerificationLinksService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private attendanceService: AttendancesService, 
    private registrationsService: RegistrationsService
  ) {}

   async createVerificationLink(dto: CreateVerificationLinkDto) {
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

    // Check if verification code already exists
    const existingCode = await this.prisma.verificationLink.findUnique({ 
      where: { verificationCode: dto.verificationCode } 
    });
    if (existingCode) throw new BadRequestException('Mã xác thực đã tồn tại');

    // 🔥 CHỈ TẠO REGISTRATION KHI VERIFICATION TYPE LÀ REGISTRATION
    let registration: any = null;
    if (dto.verificationType === 'REGISTRATION') {
      // Kiểm tra xem đã có registration chưa
      const existingRegistration = await this.prisma.registration.findFirst({
        where: {
          meetingId: dto.meetingId,
          shareholderId: dto.shareholderId
        }
      });

      if (!existingRegistration) {
        // Tạo registration code từ verification code
        const registrationCode = `REG_${dto.verificationCode}`;
        
        registration = await this.prisma.registration.create({ 
          data: {
            meetingId: dto.meetingId,
            shareholderId: dto.shareholderId,
            registrationCode: registrationCode,
            registrationType: 'ONLINE',
            status: 'PENDING',
            sharesRegistered: shareholder.totalShares,
            registrationDate: new Date()
          }
        });
      } else {
        registration = existingRegistration;
      }
    }

    // 🔥 TẠO VERIFICATION URL VỚI FORMAT MỚI
    const verificationUrl = this.generateVerificationUrl(
      dto.verificationCode, 
      dto.verificationType || 'REGISTRATION', 
      dto.meetingId
    );

    const verificationLink = await this.prisma.verificationLink.create({ 
      data: {
        ...dto,
        verificationType: dto.verificationType || 'REGISTRATION',
        verificationUrl: verificationUrl, // 🔥 Sử dụng URL mới
        isUsed: dto.isUsed || false
      }
    });

    // Create verification log
    await this.prisma.verificationLog.create({
      data: {
        verificationId: verificationLink.id,
        action: 'CREATED',
        success: true
      }
    });

    const responseData: any = {
      verification: new VerificationLinkResponseDto(verificationLink),
    };

    // 🔥 CHỈ THÊM registration data khi type là REGISTRATION
    if (registration) {
      responseData.registration = {
        id: registration.id,
        registrationCode: registration.registrationCode,
        status: registration.status,
        registrationType: registration.registrationType,
        sharesRegistered: registration.sharesRegistered
      };
    }

    return {
      success: true,
      message: `Tạo ${this.getVerificationTypeText(dto.verificationType || 'REGISTRATION')} thành công` +
               (registration ? ' và đã đăng ký' : ''),
      data: responseData,
    };
  }

  async verifyLink(dto: VerifyLinkDto) {
    const verificationLink = await this.prisma.verificationLink.findUnique({
      where: { verificationCode: dto.verificationCode },
      include: {
        meeting: true,
        shareholder: true
      }
    });

    if (!verificationLink) {
      // 👈 SỬA: Không tạo log khi không có verificationLink (vì không có verificationId)
      throw new BadRequestException('Mã xác thực không hợp lệ');
    }

    // Log attempt với verification link hợp lệ
    await this.prisma.verificationLog.create({
      data: {
        verificationId: verificationLink.id,
        action: 'VERIFICATION_ATTEMPT',
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        success: true
      }
    });

    if (verificationLink.isUsed) {
      await this.prisma.verificationLog.create({
        data: {
          verificationId: verificationLink.id,
          action: 'VERIFICATION_FAILED',
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          success: false,
          errorMessage: 'Link đã được sử dụng'
        }
      });
      throw new BadRequestException('Link xác thực đã được sử dụng');
    }

    if (new Date() > verificationLink.expiresAt) {
      await this.prisma.verificationLog.create({
        data: {
          verificationId: verificationLink.id,
          action: 'VERIFICATION_FAILED',
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          success: false,
          errorMessage: 'Link đã hết hạn'
        }
      });
      throw new BadRequestException('Link xác thực đã hết hạn');
    }

    let attendanceRecord: any = null;
    let registrationRecord: any = null;

    // 🔥 XỬ LÝ RIÊNG BIỆT THEO TỪNG LOẠI CODE
    if (verificationLink.verificationType === 'ATTENDANCE') {
      // CODE ĐIỂM DANH: Chỉ tạo attendance, không tạo registration
      const existingAttendance = await this.prisma.attendance.findFirst({
        where: {
          meetingId: verificationLink.meetingId,
          shareholderId: verificationLink.shareholderId,
        }
      });

      if (!existingAttendance) {
        attendanceRecord = await this.prisma.attendance.create({
          data: {
            meetingId: verificationLink.meetingId,
            shareholderId: verificationLink.shareholderId,
            checkinTime: new Date(),
            checkinMethod: 'QR_CODE',
            notes: `Điểm danh qua verification code: ${dto.verificationCode}`,
            ipAddress: dto.ipAddress,
            userAgent: dto.userAgent
          },
          include: {
            meeting: { select: { meetingName: true, meetingDate: true, meetingLocation: true } },
            shareholder: { select: { fullName: true, shareholderCode: true, totalShares: true } }
          }
        });
      } else {
        attendanceRecord = existingAttendance;
      }

    } else if (verificationLink.verificationType === 'REGISTRATION') {
      // CODE ĐĂNG KÝ: Chỉ xác nhận registration, không tạo attendance
      registrationRecord = await this.prisma.registration.findFirst({
        where: {
          meetingId: verificationLink.meetingId,
          shareholderId: verificationLink.shareholderId
        }
      });

      if (!registrationRecord) {
        // Tạo registration nếu chưa có
        const registrationCode = `REG_${dto.verificationCode}`;
        registrationRecord = await this.prisma.registration.create({
          data: {
            meetingId: verificationLink.meetingId,
            shareholderId: verificationLink.shareholderId,
            registrationCode: registrationCode,
            registrationType: 'ONLINE',
            status: 'PENDING',
            sharesRegistered: verificationLink.shareholder.totalShares,
            registrationDate: new Date()
          }
        });
      } else if (registrationRecord.status !== 'PENDING') {
        // Update status nếu registration chưa pending
        registrationRecord = await this.prisma.registration.update({
          where: { id: registrationRecord.id },
          data: { status: 'PENDING' }
        });
      }
    }

    // Mark as used and update usage info
    const updatedLink = await this.prisma.verificationLink.update({
      where: { id: verificationLink.id },
      data: {
        isUsed: true,
        usedAt: new Date(),
        usedIp: dto.ipAddress,
        usedDevice: dto.userAgent
      }
    });

    // Create success verification log
    await this.prisma.verificationLog.create({
      data: {
        verificationId: verificationLink.id,
        action: 'VERIFICATION_SUCCESS',
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        success: true
      }
    });

    // Chuẩn bị response data
    const responseData: any = {
      verification: new VerificationLinkResponseDto(updatedLink),
      meeting: verificationLink.meeting,
      shareholder: verificationLink.shareholder,
      redirectUrl: this.getRedirectUrl(verificationLink.verificationType)
    };

    // 🔥 CHỈ THÊM ATTENDANCE DATA KHI LÀ CODE ATTENDANCE
    if (attendanceRecord && verificationLink.verificationType === 'ATTENDANCE') {
      responseData.attendance = {
        id: attendanceRecord.id,
        meetingName: attendanceRecord.meeting.meetingName,
        meetingDate: attendanceRecord.meeting.meetingDate,
        meetingLocation: attendanceRecord.meeting.meetingLocation,
        shareholderName: attendanceRecord.shareholder.fullName,
        shareholderCode: attendanceRecord.shareholder.shareholderCode,
        checkinTime: attendanceRecord.checkinTime,
        checkinMethod: attendanceRecord.checkinMethod,
        totalShares: attendanceRecord.shareholder.totalShares
      };
    }

    // 🔥 CHỈ THÊM REGISTRATION DATA KHI LÀ CODE REGISTRATION
    if (registrationRecord && verificationLink.verificationType === 'REGISTRATION') {
      responseData.registration = {
        id: registrationRecord.id,
        registrationCode: registrationRecord.registrationCode,
        status: registrationRecord.status,
        registrationType: registrationRecord.registrationType,
        sharesRegistered: registrationRecord.sharesRegistered,
        registrationDate: registrationRecord.registrationDate
      };
    }

    // 🔥 MESSAGE RIÊNG BIỆT CHO TỪNG LOẠI
    let successMessage = 'Xác thực thành công';
    if (verificationLink.verificationType === 'ATTENDANCE') {
      successMessage = attendanceRecord ? 'Điểm danh thành công' : 'Xác thực điểm danh thành công';
    } else if (verificationLink.verificationType === 'REGISTRATION') {
      successMessage = registrationRecord ? 'Đăng ký thành công' : 'Xác thực đăng ký thành công';
    }

    return {
      success: true,
      message: successMessage,
      data: responseData
    };
  }

  async verifyLinkWithMeetingId(verificationCode: string, meetingId: number, dto: VerifyLinkDto) {
  // Tìm verification link với điều kiện meetingId
  const verificationLink = await this.prisma.verificationLink.findFirst({
    where: { 
      verificationCode,
      meetingId // Thêm điều kiện meetingId
    },
    include: {
      meeting: true,
      shareholder: true
    }
  });

  if (!verificationLink) {
    throw new BadRequestException('Mã xác thực không tồn tại hoặc không hợp lệ cho cuộc họp này');
  }

  // Gọi hàm verifyLink hiện có - tạo object mới với verificationCode từ parameter
  return this.verifyLink({
    ...dto,
    verificationCode // Đảm bảo sử dụng verificationCode từ parameter
  });
}

  async getVerificationLinkByCodeWithMeeting(verificationCode: string, meetingId: number) {
    const verificationLink = await this.prisma.verificationLink.findFirst({
      where: { 
        verificationCode,
        meetingId // Thêm điều kiện meetingId
      },
      include: {
        meeting: {
          select: {
            id: true,
            meetingCode: true,
            meetingName: true,
            meetingDate: true,
            meetingLocation: true
          }
        },
        shareholder: {
          select: {
            id: true,
            shareholderCode: true,
            fullName: true,
            email: true,
            totalShares: true
          }
        },
        verificationLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!verificationLink) {
      throw new NotFoundException('Mã xác thực không tồn tại hoặc không hợp lệ cho cuộc họp này');
    }

    return {
      success: true,
      message: 'Lấy thông tin link xác thực thành công',
      data: {
        ...new VerificationLinkResponseDto(verificationLink),
        meeting: verificationLink.meeting,
        shareholder: verificationLink.shareholder,
        recentLogs: verificationLink.verificationLogs
      }
    };
  }

  private generateVerificationUrl(verificationCode: string, verificationType: string, meetingId?: number): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    if (verificationType === 'ATTENDANCE' && meetingId) {
      // 🔥 SỬA: Đúng format cho attendance: /verify/{code}/meetings/{meetingId}
      return `${baseUrl}/verify/${verificationCode}/meetings/${meetingId}`;
    } else {
      // REGISTRATION: /verify/{code}
      return `${baseUrl}/verify/${verificationCode}`;
    }
  }


  async generateBatchVerificationLinks(meetingId: number, shareholderIds: number[], verificationType: string, expiresInHours: number = 24) {
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id: meetingId } 
    });
    if (!meeting) throw new BadRequestException('Cuộc họp không tồn tại');

    const results = {
      total: shareholderIds.length,
      success: 0,
      errors: [] as string[],
      links: [] as any[]
    };

    for (const shareholderId of shareholderIds) {
      try {
        const shareholder = await this.prisma.shareholder.findUnique({ 
          where: { id: shareholderId } 
        });
        if (!shareholder) {
          results.errors.push(`Cổ đông ${shareholderId} không tồn tại`);
          continue;
        }

        // Generate unique verification code
        const verificationCode = this.generateVerificationCode();
        const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

        // Generate QR code URL
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${verificationCode}`;
        
        // 🔥 TẠO VERIFICATION URL VỚI FORMAT MỚI
        const verificationUrl = this.generateVerificationUrl(
          verificationCode, 
          verificationType, 
          meetingId
        );

        const verificationLink = await this.prisma.verificationLink.create({ 
          data: {
            meetingId,
            shareholderId,
            verificationCode,
            verificationType,
            qrCodeUrl,
            verificationUrl, // 🔥 Sử dụng URL mới
            expiresAt,
            isUsed: false
          }
        });

        // Create verification log
        await this.prisma.verificationLog.create({
          data: {
            verificationId: verificationLink.id,
            action: 'BATCH_CREATED',
            success: true
          }
        });

        results.success++;
        results.links.push(new VerificationLinkResponseDto(verificationLink));

      } catch (error) {
        results.errors.push(`Cổ đông ${shareholderId}: ${error.message}`);
      }
    }

    return {
      success: true,
      message: `Tạo hàng loạt thành công: ${results.success}/${results.total}`,
      data: results
    };
  }

  async getVerificationLinks(page = 1, limit = 10, meetingId = '', shareholderId = '', verificationType = '', isUsed = '', search = '', emailSent = '') {
    const skip = (page - 1) * limit;

    const where: Prisma.VerificationLinkWhereInput = {};
    
    if (meetingId) {
      where.meetingId = +meetingId;
    }

    if (shareholderId) {
      where.shareholderId = +shareholderId;
    }

    if (verificationType) {
      where.verificationType = verificationType;
    }

    if (isUsed !== '') {
      where.isUsed = isUsed === 'true';
    }

    if (emailSent !== '') {
      where.emailSent = emailSent === 'true';
    }

    if (search) {
      where.OR = [
        { verificationCode: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { shareholder: { fullName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        { shareholder: { shareholderCode: { contains: search, mode: Prisma.QueryMode.insensitive } } },
      ];
    }

    const [links, total] = await this.prisma.$transaction([
      this.prisma.verificationLink.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          meeting: {
            select: { id: true, meetingCode: true, meetingName: true }
          },
          shareholder: {
            select: { id: true, shareholderCode: true, fullName: true, email: true }
          },
          verificationLogs: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      }),
      this.prisma.verificationLink.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách link xác thực thành công',
      data: {
        data: links.map((link) => ({
          ...new VerificationLinkResponseDto(link),
          meeting: link.meeting,
          shareholder: link.shareholder,
          recentLogs: link.verificationLogs
        })),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getVerificationLinksByMeeting(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const links = await this.prisma.verificationLink.findMany({
      where: { meetingId },
      include: {
        shareholder: {
          select: { shareholderCode: true, fullName: true, email: true }
        },
        _count: {
          select: {
            verificationLogs: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      message: 'Lấy danh sách link xác thực theo cuộc họp thành công',
      data: links.map((link) => ({
        ...new VerificationLinkResponseDto(link),
        shareholder: link.shareholder,
        logCount: link._count.verificationLogs
      })),
    };
  }

  async getVerificationLinksByShareholder(shareholderId: number) {
    const shareholder = await this.prisma.shareholder.findUnique({ where: { id: shareholderId } });
    if (!shareholder) throw new NotFoundException('Cổ đông không tồn tại');

    const links = await this.prisma.verificationLink.findMany({
      where: { shareholderId },
      include: {
        meeting: {
          select: { meetingCode: true, meetingName: true, meetingDate: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      message: 'Lấy danh sách link xác thực theo cổ đông thành công',
      data: links.map((link) => ({
        ...new VerificationLinkResponseDto(link),
        meeting: link.meeting
      })),
    };
  }

  async getVerificationLinkByCode(verificationCode: string) {
    const link = await this.prisma.verificationLink.findUnique({ 
      where: { verificationCode },
      include: {
        meeting: true,
        shareholder: true,
        verificationLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
    
    if (!link) throw new NotFoundException('Link xác thực không tồn tại');
    
    return {
      success: true,
      message: 'Lấy thông tin link xác thực thành công',
      data: {
        ...new VerificationLinkResponseDto(link),
        meeting: link.meeting,
        shareholder: link.shareholder,
        logs: link.verificationLogs
      },
    };
  }

  async getVerificationLinkById(id: number) {
    const link = await this.prisma.verificationLink.findUnique({ 
      where: { id },
      include: {
        meeting: true,
        shareholder: true,
        verificationLogs: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!link) throw new NotFoundException('Link xác thực không tồn tại');
    
    return {
      success: true,
      message: 'Lấy thông tin link xác thực thành công',
      data: {
        ...new VerificationLinkResponseDto(link),
        meeting: link.meeting,
        shareholder: link.shareholder,
        logs: link.verificationLogs
      },
    };
  }

  async updateVerificationLink(id: number, dto: CreateVerificationLinkDto) {
    const link = await this.prisma.verificationLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException('Link xác thực không tồn tại');

    if (link.isUsed) {
      throw new BadRequestException('Không thể cập nhật link đã được sử dụng');
    }

    // Check unique code if changing
    if (dto.verificationCode && dto.verificationCode !== link.verificationCode) {
      const existing = await this.prisma.verificationLink.findUnique({ 
        where: { verificationCode: dto.verificationCode } 
      });
      if (existing) throw new BadRequestException('Mã xác thực đã tồn tại');
    }

    const updated = await this.prisma.verificationLink.update({ 
      where: { id }, 
      data: dto
    });

    return {
      success: true,
      message: 'Cập nhật link xác thực thành công',
      data: new VerificationLinkResponseDto(updated),
    };
  }

  async updateVerificationLinkExpiry(id: number, expiresAt: string) {
    const link = await this.prisma.verificationLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException('Link xác thực không tồn tại');

    if (link.isUsed) {
      throw new BadRequestException('Không thể cập nhật link đã được sử dụng');
    }

    const updated = await this.prisma.verificationLink.update({ 
      where: { id }, 
      data: { expiresAt: new Date(expiresAt) } 
    });

    return {
      success: true,
      message: 'Cập nhật thời hạn link thành công',
      data: new VerificationLinkResponseDto(updated),
    };
  }

  async revokeVerificationLink(id: number) {
    const link = await this.prisma.verificationLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException('Link xác thực không tồn tại');

    if (link.isUsed) {
      throw new BadRequestException('Link đã được sử dụng, không thể thu hồi');
    }

    const updated = await this.prisma.verificationLink.update({ 
      where: { id }, 
      data: { 
        expiresAt: new Date(), // Set to past to immediately expire
        isUsed: true
      } 
    });

    return {
      success: true,
      message: 'Thu hồi link xác thực thành công',
      data: new VerificationLinkResponseDto(updated),
    };
  }

  async deleteVerificationLink(id: number) {
    const link = await this.prisma.verificationLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException('Link xác thực không tồn tại');

    await this.prisma.verificationLink.delete({ where: { id } });
    
    return {
      success: true,
      message: 'Xóa link xác thực thành công',
      data: null,
    };
  }

  async getMeetingVerificationStatistics(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id: meetingId },
      include: {
        verificationLinks: {
          include: {
            shareholder: true
          }
        }
      }
    });
    
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const statistics = {
      totalLinks: meeting.verificationLinks.length,
      usedLinks: meeting.verificationLinks.filter(link => link.isUsed).length,
      activeLinks: meeting.verificationLinks.filter(link => !link.isUsed && new Date() < link.expiresAt).length,
      expiredLinks: meeting.verificationLinks.filter(link => !link.isUsed && new Date() > link.expiresAt).length,
      byVerificationType: this.groupBy(meeting.verificationLinks, 'verificationType'),
      usageRate: meeting.verificationLinks.length > 0 
        ? (meeting.verificationLinks.filter(link => link.isUsed).length / meeting.verificationLinks.length * 100).toFixed(2)
        : 0,
      recentActivity: await this.prisma.verificationLog.count({
        where: {
          verificationLink: {
            meetingId: meetingId
          },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })
    };

    return {
      success: true,
      message: 'Lấy thống kê xác thực thành công',
      data: statistics,
    };
  }

  async generateQRCode(verificationCode: string) {
    const link = await this.prisma.verificationLink.findUnique({ 
      where: { verificationCode } 
    });
    
    if (!link) throw new NotFoundException('Link xác thực không tồn tại');

    try {
      // In production, you would generate actual QR code
      // For demo, we'll return a mock QR code URL
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${verificationCode}`;
      
      // Update the link with QR code URL if not already set
      if (!link.qrCodeUrl) {
        await this.prisma.verificationLink.update({
          where: { id: link.id },
          data: { qrCodeUrl }
        });
      }

      return {
        success: true,
        message: 'Tạo QR code thành công',
        data: {
          qrCodeUrl,
          verificationCode: link.verificationCode,
          verificationType: link.verificationType,
          expiresAt: link.expiresAt
        }
      };

    } catch (error) {
      throw new BadRequestException('Lỗi khi tạo QR code: ' + error.message);
    }
  }

  private generateVerificationCode(): string {
    return crypto.randomBytes(6).toString('hex').toUpperCase();
  }

  private getRedirectUrl(verificationType: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    const redirectUrls = {
      REGISTRATION: `${baseUrl}/registration/success`, // Trang thành công đăng ký
      ATTENDANCE: `${baseUrl}/attendance/success`,     // Trang thành công điểm danh
    };

    return redirectUrls[verificationType] || `${baseUrl}/verify/success`;
  }

  private groupBy(array: any[], key: string) {
    return array.reduce((groups, item) => {
      const group = item[key] || 'Unknown';
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {});
  }

  // ==================== CÁC HÀM GỬI EMAIL RIÊNG BIỆT ====================

  /**
   * Gửi email xác thực cho một verification link cụ thể
   */
async sendVerificationEmail(verificationLinkId: number) {
  const verificationLink = await this.prisma.verificationLink.findUnique({
    where: { id: verificationLinkId },
    include: {
      meeting: true,
      shareholder: true
    }
  });

  if (!verificationLink) {
    throw new NotFoundException('Link xác thực không tồn tại');
  }


  if (!verificationLink.shareholder.email) {
    throw new BadRequestException('Cổ đông không có địa chỉ email');
  }

  try {
    // 🔥 SỬA: Gọi hàm mới với đầy đủ thông tin
    const result = await this.emailService.sendEmail({
      to: verificationLink.shareholder.email,
      templateName: verificationLink.verificationType === 'ATTENDANCE' 
        ? 'attendance_verification' 
        : 'registration_confirmation',
      variables: {
        fullName: verificationLink.shareholder.fullName,
        verificationUrl: verificationLink.verificationUrl, // 🔥 QUAN TRỌNG: Dùng URL từ database
        qrCodeUrl: verificationLink.qrCodeUrl,
        meetingName: verificationLink.meeting.meetingName,
        meetingTime: verificationLink.meeting.meetingDate?.toLocaleString('vi-VN'),
        meetingLocation: verificationLink.meeting.meetingLocation || 'Trụ sở chính',
        expiresAt: verificationLink.expiresAt?.toLocaleString('vi-VN')
      },
      shareholderId: verificationLink.shareholderId,
      meetingId: verificationLink.meetingId
    });

    // Update email sent status
    await this.prisma.verificationLink.update({
      where: { id: verificationLinkId },
      data: {
        emailSent: true,
        emailSentAt: new Date()
      }
    });

    // Log hành động gửi email
    await this.prisma.verificationLog.create({
      data: {
        verificationId: verificationLink.id,
        action: 'EMAIL_SENT',
        success: true
      }
    });

    return {
      success: true,
      message: 'Gửi email xác thực thành công',
      data: result
    };
  } catch (error) {
    // Log lỗi
    await this.prisma.verificationLog.create({
      data: {
        verificationId: verificationLink.id,
        action: 'EMAIL_SEND_FAILED',
        success: false,
        errorMessage: error.message
      }
    });

    throw new BadRequestException(`Gửi email thất bại: ${error.message}`);
  }
}

  /**
   * Gửi email xác thực hàng loạt cho nhiều verification links
   */
async sendBatchVerificationEmails(meetingId: number, shareholderIds: number[], verificationType: string) {
  try {
    // Lấy tất cả verification links
    const verificationLinks = await this.prisma.verificationLink.findMany({
      where: {
        meetingId,
        shareholderId: { in: shareholderIds },
        verificationType
      },
      include: {
        meeting: true,
        shareholder: true
      }
    });

    if (verificationLinks.length === 0) {
      throw new BadRequestException('Không tìm thấy verification links phù hợp');
    }

    const results = {
      total: verificationLinks.length,
      success: 0,
      errors: [] as string[]
    };

    // Gửi email cho từng link
    for (const link of verificationLinks) {
      try {
        if (!link.shareholder.email) {
          results.errors.push(`Cổ đông ${link.shareholder.fullName} không có email`);
          continue;
        }

        // 🔥 SỬA: Gửi email với verificationUrl từ database
        await this.emailService.sendEmail({
          to: link.shareholder.email,
          templateName: verificationType === 'ATTENDANCE' 
            ? 'attendance_verification' 
            : 'registration_confirmation',
          variables: {
            fullName: link.shareholder.fullName,
            verificationUrl: link.verificationUrl, // 🔥 QUAN TRỌNG: Dùng URL từ database
            qrCodeUrl: link.qrCodeUrl,
            meetingName: link.meeting.meetingName,
            meetingTime: link.meeting.meetingDate?.toLocaleString('vi-VN'),
            meetingLocation: link.meeting.meetingLocation || 'Trụ sở chính',
            expiresAt: link.expiresAt?.toLocaleString('vi-VN')
          },
          shareholderId: link.shareholderId,
          meetingId: link.meetingId
        });

        // Update email sent status
        await this.prisma.verificationLink.update({
          where: { id: link.id },
          data: {
            emailSent: true,
            emailSentAt: new Date()
          }
        });

        results.success++;
      } catch (error) {
        results.errors.push(`Cổ đông ${link.shareholder.fullName}: ${error.message}`);
      }
    }

    return {
      success: true,
      message: `Gửi email thành công: ${results.success}/${results.total}`,
      data: results
    };
  } catch (error) {
    throw new BadRequestException(`Gửi email xác thực hàng loạt thất bại: ${error.message}`);
  }
}

  /**
   * Gửi lại email xác thực cho một verification link
   */
  async resendVerificationEmail(verificationLinkId: number) {
    const verificationLink = await this.prisma.verificationLink.findUnique({
      where: { id: verificationLinkId },
      include: {
        meeting: true,
        shareholder: true
      }
    });

    if (!verificationLink) {
      throw new NotFoundException('Link xác thực không tồn tại');
    }

    if (!verificationLink.shareholder.email) {
      throw new BadRequestException('Cổ đông không có địa chỉ email');
    }

    try {
      const result = await this.emailService.sendVerificationEmail(
        verificationLink.shareholderId,
        verificationLink.verificationCode,
        verificationLink.meetingId
      );

      // Log hành động gửi lại email
      await this.prisma.verificationLog.create({
        data: {
          verificationId: verificationLink.id,
          action: 'EMAIL_RESENT',
          success: true
        }
      });

      return {
        success: true,
        message: 'Gửi lại email xác thực thành công',
        data: result
      };
    } catch (error) {
      // Log lỗi
      await this.prisma.verificationLog.create({
        data: {
          verificationId: verificationLink.id,
          action: 'EMAIL_RESEND_FAILED',
          success: false,
          errorMessage: error.message
        }
      });

      throw new BadRequestException(`Gửi lại email thất bại: ${error.message}`);
    }
  }

  /**
   * Gửi email xác nhận sau khi verify thành công
   */
  async sendVerificationSuccessEmail(verificationCode: string) {
    const verificationLink = await this.prisma.verificationLink.findUnique({
      where: { verificationCode },
      include: {
        meeting: true,
        shareholder: true
      }
    });

    if (!verificationLink) {
      throw new NotFoundException('Link xác thực không tồn tại');
    }

    if (!verificationLink.isUsed) {
      throw new BadRequestException('Link xác thực chưa được sử dụng');
    }

    if (!verificationLink.shareholder.email) {
      throw new BadRequestException('Cổ đông không có địa chỉ email');
    }

    try {
      const result = await this.emailService.sendEmail({
        to: verificationLink.shareholder.email,
        templateName: 'verification_success',
        variables: {
          fullName: verificationLink.shareholder.fullName,
          verificationType: this.getVerificationTypeText(verificationLink.verificationType),
          verifiedAt: verificationLink.usedAt?.toLocaleString('vi-VN') || new Date().toLocaleString('vi-VN'),
          meetingName: verificationLink.meeting.meetingName
        },
        shareholderId: verificationLink.shareholderId,
        meetingId: verificationLink.meetingId
      });

      return {
        success: true,
        message: 'Gửi email xác nhận thành công',
        data: result
      };
    } catch (error) {
      throw new BadRequestException(`Gửi email xác nhận thất bại: ${error.message}`);
    }
  }

  /**
   * Lấy thống kê email cho một cuộc họp
   */
  async getEmailStatistics(meetingId: number) {
    const emailLogs = await this.prisma.emailLog.findMany({
      where: {
        meetingId,
        templateName: {
          in: ['registration_confirmation', 'attendance_verification']
        }
      },
      select: {
        success: true,
        templateName: true,
        createdAt: true
      }
    });

    const statistics = {
      totalSent: emailLogs.length,
      successful: emailLogs.filter(log => log.success).length,
      failed: emailLogs.filter(log => !log.success).length,
      byTemplate: this.groupBy(emailLogs, 'templateName'),
      successRate: emailLogs.length > 0 
        ? ((emailLogs.filter(log => log.success).length / emailLogs.length) * 100).toFixed(2)
        : 0,
      recentActivity: emailLogs.filter(log => 
        new Date(log.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length
    };

    return {
      success: true,
      message: 'Lấy thống kê email thành công',
      data: statistics
    };
  }

  // ==================== CÁC HÀM HỖ TRỢ ===================

  private getVerificationTypeText(verificationType: string): string {
    const types = {
      REGISTRATION: 'mã đăng ký',
      ATTENDANCE: 'mã điểm danh',
    };
    return types[verificationType] || 'link xác thực';
  }
}