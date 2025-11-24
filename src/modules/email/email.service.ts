// src/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from 'prisma/prisma.service';
import { SendEmailDto, SendBulkEmailDto } from './dto/send-email.dto';
import dayjs from 'dayjs';


@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private prisma: PrismaService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }



  async sendEmail(dto: SendEmailDto) {
    try {
      const template = await this.prisma.emailTemplate.findUnique({
        where: { name: dto.templateName, isActive: true }
      });

      if (!template) {
        throw new Error(`Template "${dto.templateName}" không tồn tại hoặc đã bị vô hiệu hóa`);
      }

      let subject = dto.subject || template.subject;
      let content = template.content;

      if (dto.variables) {
        Object.keys(dto.variables).forEach(key => {
          const placeholder = `{{${key}}}`;
          const value = dto.variables?.[key] || '';
          subject = subject.replace(new RegExp(placeholder, 'g'), value);
          content = content.replace(new RegExp(placeholder, 'g'), value);
        });
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: dto.to,
        bcc: dto.bcc,
        subject: subject,
        text: content,
        html: this.convertToHtml(content),
      };

      const result = await this.transporter.sendMail(mailOptions);

      // SỬA: Sử dụng model EmailLog thực tế
      await this.prisma.emailLog.create({
        data: {
          to: dto.to,
          subject: subject,
          templateName: dto.templateName,
          shareholderId: dto.shareholderId,
          meetingId: dto.meetingId,
          messageId: result.messageId,
          success: true,
        }
      });

      this.logger.log(`Email sent successfully to ${dto.to}`);

      return {
        success: true,
        message: 'Gửi email thành công',
        data: {
          messageId: result.messageId,
          to: dto.to,
          subject: subject
        }
      };

    } catch (error) {
      this.logger.error(`Failed to send email to ${dto.to}:`, error);

      // SỬA: Sử dụng model EmailLog thực tế
      await this.prisma.emailLog.create({
        data: {
          to: dto.to,
          subject: dto.subject || 'N/A',
          templateName: dto.templateName,
          shareholderId: dto.shareholderId,
          meetingId: dto.meetingId,
          errorMessage: error.message,
          success: false,
        }
      });

      throw new Error(`Gửi email thất bại: ${error.message}`);
    }
  }

  async sendBulkEmail(dto: SendBulkEmailDto) {
    const results = {
      total: dto.shareholderIds.length,
      success: 0,
      failures: 0,
      errors: [] as string[],
      details: [] as any[]
    };

    // SỬA: Sử dụng Prisma.NullTypes cho điều kiện not null
    const shareholders = await this.prisma.shareholder.findMany({
      where: {
        id: { in: dto.shareholderIds },
        email: { not: null } as any
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        shareholderCode: true
      }
    });

    for (const shareholder of shareholders) {
      try {
        const variables = {
          ...dto.variables,
          fullName: shareholder.fullName,
          shareholderCode: shareholder.shareholderCode,
        };

        const emailResult = await this.sendEmail({
          to: shareholder.email!,
          templateName: dto.templateName,
          variables: variables,
          shareholderId: shareholder.id,
          meetingId: dto.meetingId,
        });

        results.success++;
        results.details.push({
          shareholderId: shareholder.id,
          email: shareholder.email,
          success: true,
          messageId: emailResult.data.messageId
        });

      } catch (error) {
        results.failures++;
        results.errors.push(`Cổ đông ${shareholder.fullName} (${shareholder.email}): ${error.message}`);
        results.details.push({
          shareholderId: shareholder.id,
          email: shareholder.email,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: true,
      message: `Gửi email hàng loạt hoàn tất: ${results.success}/${results.total} thành công`,
      data: results
    };
  }

  // Trong EmailService - sửa phương thức sendVerificationEmail
async sendVerificationEmail(shareholderId: number, verificationCode: string, meetingId: number) {
  try {
    const shareholder = await this.prisma.shareholder.findUnique({
      where: { id: shareholderId },
      include: {
        verificationLinks: {
          where: { verificationCode },
          include: { meeting: true }
        }
      }
    });

    if (!shareholder || !shareholder.email) {
      throw new Error('Cổ đông không tồn tại hoặc không có email');
    }

    const verificationLink = shareholder.verificationLinks[0];
    if (!verificationLink) {
      throw new Error('Link xác thực không tồn tại');
    }

    // Định dạng các biến thời gian
    const expiresAt = new Date(verificationLink.expiresAt);
    const expiresAtFormatted = expiresAt.toLocaleDateString('vi-VN') + ' ' + expiresAt.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const meetingDate = new Date(verificationLink.meeting.meetingDate);
    const meetingTimeFormatted = meetingDate.toLocaleDateString('vi-VN') + ' ' + meetingDate.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

     // URL đầy đủ để verify
    const verificationUrl = `${process.env.FRONTEND_URL}/verify/${verificationCode}`;

    // SỬA: Tạo QR code URL với verificationUrl đầy đủ
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verificationUrl)}`;

    const variables = {
      fullName: shareholder.fullName,
      shareholderCode: shareholder.shareholderCode,
      meetingName: verificationLink.meeting.meetingName,
      meetingDate: verificationLink.meeting.meetingDate.toLocaleDateString('vi-VN'),
      meetingTime: meetingTimeFormatted, // THÊM: Biến meetingTime
      meetingLocation: verificationLink.meeting.meetingAddress || 'Trụ sở chính',
      verificationCode: verificationCode,
      verificationUrl: `${process.env.FRONTEND_URL}/verify/${verificationCode}`,
      registrationType: this.getRegistrationTypeText(verificationLink.verificationType),
      expiresAt: expiresAtFormatted,
      qrCodeUrl: qrCodeUrl
    };

    let templateName = 'registration_confirmation';
    if (verificationLink.verificationType === 'VOTING') {
      templateName = 'vote_reminder';
    } else if (verificationLink.verificationType === 'ATTENDANCE') {
      templateName = 'attendance_verification';
    }

     const result = await this.sendEmail({
      to: shareholder.email,
      templateName: templateName,
      variables: variables,
      shareholderId: shareholderId,
      meetingId: meetingId
    });

    // THÊM: Cập nhật trạng thái đã gửi email
    await this.prisma.verificationLink.update({
      where: { id: verificationLink.id },
      data: {
        emailSent: true,
        emailSentAt: new Date()
      }
    });

    return result;

  } catch (error) {
    this.logger.error(`Failed to send verification email:`, error);
    throw error;
  }
}

  async sendBatchVerificationEmails(meetingId: number, shareholderIds: number[], verificationType: string) {
    const results = {
      total: shareholderIds.length,
      success: 0,
      failures: 0,
      errors: [] as string[],
      details: [] as any[]
    };

    for (const shareholderId of shareholderIds) {
      try {
        const verificationLink = await this.prisma.verificationLink.findFirst({
          where: {
            meetingId,
            shareholderId,
            verificationType
          },
          orderBy: { createdAt: 'desc' }
        });

        if (!verificationLink) {
          throw new Error('Không tìm thấy link xác thực');
        }

        await this.sendVerificationEmail(shareholderId, verificationLink.verificationCode, meetingId);
        results.success++;
        results.details.push({
          shareholderId,
          success: true
        });

      } catch (error) {
        results.failures++;
        results.errors.push(`Cổ đông ${shareholderId}: ${error.message}`);
        results.details.push({
          shareholderId,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: true,
      message: `Gửi email xác thực hoàn tất: ${results.success}/${results.total} thành công`,
      data: results
    };
  }

  // THÊM: Phương thức getEmailLogs
  async getEmailLogs(page = 1, limit = 10, shareholderId?: number, meetingId?: number) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (shareholderId) where.shareholderId = shareholderId;
    if (meetingId) where.meetingId = meetingId;

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.emailLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          shareholder: {
            select: { fullName: true, shareholderCode: true }
          },
          meeting: {
            select: { meetingName: true }
          }
        }
      }),
      this.prisma.emailLog.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy lịch sử email thành công',
      data: {
        data: logs,
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  private convertToHtml(text: string): string {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  private getRegistrationTypeText(verificationType: string): string {
    const types = {
      REGISTRATION: 'Đăng ký tham dự',
      ATTENDANCE: 'Điểm danh',
      VOTING: 'Bỏ phiếu',
      DOCUMENT_ACCESS: 'Truy cập tài liệu',
      LIVESTREAM_ACCESS: 'Tham dự trực tuyến'
    };
    return types[verificationType] || verificationType;
  }
}