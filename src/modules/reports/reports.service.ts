import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { CreateReportTemplateDto } from './dto/create-report-template.dto';
import { UpdateReportTemplateDto } from './dto/update-report-template.dto';
import { GeneratedReportResponseDto } from './dto/generated-report-response.dto';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

async generateReport(dto: GenerateReportDto) {
  // Convert to numbers
  const meetingId = Number(dto.meetingId);
  const templateId = Number(dto.templateId);

  const meeting = await this.prisma.meeting.findUnique({ 
    where: { id: meetingId } 
  });
  if (!meeting) throw new BadRequestException('Cuộc họp không tồn tại');

  const template = await this.prisma.reportTemplate.findUnique({ 
    where: { id: templateId } 
  });
  if (!template) throw new BadRequestException('Template báo cáo không tồn tại');

  // Sửa: truyền meetingId đã convert
  const reportData = await this.generateReportData(meetingId, template.templateType, dto.filters);

  const generatedReport = await this.prisma.generatedReport.create({
    data: {
      meetingId: meetingId, // Sử dụng biến đã convert
      templateId: templateId, // Sử dụng biến đã convert
      reportName: dto.reportName,
      reportUrl: this.generateReportUrl(),
      reportFormat: dto.reportFormat,
      generatedBy: 1
    }
  });

  return {
    success: true,
    message: 'Tạo báo cáo thành công',
    data: new GeneratedReportResponseDto(generatedReport),
  };
}

  async getGeneratedReports(page = 1, limit = 10, meetingId = '', templateId = '', search = '') {
    const skip = (page - 1) * limit;

    const where: Prisma.GeneratedReportWhereInput = {};
    
    if (meetingId) {
      where.meetingId = +meetingId;
    }

    if (templateId) {
      where.templateId = +templateId;
    }

    if (search) {
      where.OR = [
        { reportName: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { meeting: { meetingName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        { template: { templateName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
      ];
    }

    const [reports, total] = await this.prisma.$transaction([
      this.prisma.generatedReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          meeting: {
            select: { id: true, meetingCode: true, meetingName: true }
          },
          template: {
            select: { id: true, templateName: true, templateType: true }
          },
          generatedByUser: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      this.prisma.generatedReport.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách báo cáo thành công',
      data: {
        data: reports.map(report => new GeneratedReportResponseDto(report)),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getMeetingReports(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const reports = await this.prisma.generatedReport.findMany({
      where: { meetingId },
      include: {
        template: {
          select: { templateName: true, templateType: true }
        },
        generatedByUser: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      message: 'Lấy danh sách báo cáo theo cuộc họp thành công',
      data: reports.map(report => new GeneratedReportResponseDto(report)),
    };
  }

  async getGeneratedReport(id: number) {
    const report = await this.prisma.generatedReport.findUnique({ 
      where: { id },
      include: {
        meeting: true,
        template: true,
        generatedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    if (!report) throw new NotFoundException('Báo cáo không tồn tại');
    
    return {
      success: true,
      message: 'Lấy thông tin báo cáo thành công',
      data: new GeneratedReportResponseDto(report),
    };
  }

  async deleteGeneratedReport(id: number) {
    const report = await this.prisma.generatedReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Báo cáo không tồn tại');

    await this.prisma.generatedReport.delete({ where: { id } });
    
    return {
      success: true,
      message: 'Xóa báo cáo thành công',
      data: null,
    };
  }

  // Report Templates Management
  async createReportTemplate(dto: CreateReportTemplateDto) {
    const existingTemplate = await this.prisma.reportTemplate.findFirst({ 
      where: { templateName: dto.templateName } 
    });
    if (existingTemplate) throw new BadRequestException('Tên template đã tồn tại');

    const template = await this.prisma.reportTemplate.create({
      data: {
        templateName: dto.templateName,
        templateType: dto.templateType,
        templateFile: dto.templateFile,
        outputFormat: dto.outputFormat,
        isActive: dto.isActive ?? true
      }
    });

    return {
      success: true,
      message: 'Tạo template báo cáo thành công',
      data: template,
    };
  }

  async getAllReportTemplates() {
    const templates = await this.prisma.reportTemplate.findMany({
      where: { isActive: true },
      orderBy: { templateName: 'asc' }
    });

    return {
      success: true,
      message: 'Lấy danh sách template thành công',
      data: templates,
    };
  }

  async getReportTemplates(page = 1, limit = 10, type = '', search = '') {
    const skip = (page - 1) * limit;

    const where: Prisma.ReportTemplateWhereInput = {};
    
    if (type) {
      where.templateType = type;
    }

    if (search) {
      where.templateName = { contains: search, mode: Prisma.QueryMode.insensitive };
    }

    const [templates, total] = await this.prisma.$transaction([
      this.prisma.reportTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.reportTemplate.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách template thành công',
      data: {
        data: templates,
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getReportTemplate(id: number) {
    const template = await this.prisma.reportTemplate.findUnique({ 
      where: { id }
    });
    
    if (!template) throw new NotFoundException('Template không tồn tại');
    
    return {
      success: true,
      message: 'Lấy thông tin template thành công',
      data: template,
    };
  }

  async updateReportTemplate(id: number, dto: UpdateReportTemplateDto) {
    const template = await this.prisma.reportTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template không tồn tại');

    if (dto.templateName && dto.templateName !== template.templateName) {
      const existing = await this.prisma.reportTemplate.findFirst({ 
        where: { templateName: dto.templateName } 
      });
      if (existing) throw new BadRequestException('Tên template đã tồn tại');
    }

    const updated = await this.prisma.reportTemplate.update({ 
      where: { id }, 
      data: dto
    });

    return {
      success: true,
      message: 'Cập nhật template thành công',
      data: updated,
    };
  }

  async deleteReportTemplate(id: number) {
    const template = await this.prisma.reportTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Template không tồn tại');

    // Check if template is used in any reports
    const usedInReports = await this.prisma.generatedReport.count({
      where: { templateId: id }
    });

    if (usedInReports > 0) {
      throw new BadRequestException('Không thể xóa template đã được sử dụng trong báo cáo');
    }

    await this.prisma.reportTemplate.delete({ where: { id } });
    
    return {
      success: true,
      message: 'Xóa template thành công',
      data: null,
    };
  }

  // Quick Report Generation
  async generateMeetingSummary(meetingId: number) {
    const meetingIdNum = Number(meetingId);
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingIdNum },
      include: {
        registrations: true,
        attendances: true,
        resolutions: {
          include: {
            votes: true,
            candidates: true
          }
        },
        questions: true,
        feedbacks: true
      }
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const totalRegistrations = meeting.registrations.length;
    const totalAttendances = meeting.attendances.length;
    const attendanceRate = totalRegistrations > 0 
      ? (totalAttendances / totalRegistrations * 100).toFixed(2)
      : 0;

    const resolutionStats = meeting.resolutions.map(resolution => ({
      id: resolution.id,
      title: resolution.title,
      totalVotes: resolution.totalVotes,
      yesVotes: resolution.yesVotes,
      noVotes: resolution.noVotes,
      approvalRate: resolution.totalVotes > 0 
        ? (resolution.yesVotes / resolution.totalVotes * 100).toFixed(2)
        : 0
    }));

    const summaryData = {
      meeting: {
        id: meeting.id,
        meetingCode: meeting.meetingCode,
        meetingName: meeting.meetingName,
        meetingDate: meeting.meetingDate
      },
      statistics: {
        totalRegistrations,
        totalAttendances,
        attendanceRate: `${attendanceRate}%`,
        totalQuestions: meeting.questions.length,
        totalFeedbacks: meeting.feedbacks.length,
        totalResolutions: meeting.resolutions.length
      },
      resolutionStats,
      generatedAt: new Date()
    };

    return {
      success: true,
      message: 'Tạo báo cáo tổng quan thành công',
      data: summaryData,
    };
  }

  async generateAttendanceReport(meetingId: number) {
     const meetingIdNum = Number(meetingId);
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingIdNum },
      include: {
        registrations: {
          include: {
            shareholder: {
              select: {
                shareholderCode: true,
                fullName: true,
                totalShares: true
              }
            }
          }
        },
        attendances: {
          include: {
            shareholder: {
              select: {
                shareholderCode: true,
                fullName: true
              }
            }
          }
        }
      }
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const attendanceData = meeting.registrations.map(registration => {
      const attendance = meeting.attendances.find(
        a => a.shareholderId === registration.shareholderId
      );

      return {
        shareholderCode: registration.shareholder.shareholderCode,
        fullName: registration.shareholder.fullName,
        shares: registration.sharesRegistered,
        registered: true,
        attended: !!attendance,
        checkinTime: attendance?.checkinTime,
        checkinMethod: attendance?.checkinMethod
      };
    });

    const reportData = {
      meeting: {
        id: meeting.id,
        meetingCode: meeting.meetingCode,
        meetingName: meeting.meetingName
      },
      attendanceData,
      summary: {
        totalRegistered: meeting.registrations.length,
        totalAttended: meeting.attendances.length,
        attendanceRate: meeting.registrations.length > 0 
          ? (meeting.attendances.length / meeting.registrations.length * 100).toFixed(2)
          : 0
      }
    };

    return {
      success: true,
      message: 'Tạo báo cáo điểm danh thành công',
      data: reportData,
    };
  }

  async generateVotingReport(meetingId: number) {
     const meetingIdNum = Number(meetingId);
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingIdNum  },
      include: {
        resolutions: {
          include: {
            votes: {
              include: {
                shareholder: {
                  select: {
                    shareholderCode: true,
                    fullName: true,
                    totalShares: true
                  }
                }
              }
            },
            candidates: true
          }
        }
      }
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const votingResults = meeting.resolutions.map(resolution => {
      const candidateResults = resolution.candidates.map(candidate => ({
        candidateCode: candidate.candidateCode,
        candidateName: candidate.candidateName,
        voteCount: candidate.voteCount,
        votePercentage: resolution.totalVotes > 0 
          ? (candidate.voteCount / resolution.totalVotes * 100).toFixed(2)
          : 0
      }));

      return {
        resolutionCode: resolution.resolutionCode,
        title: resolution.title,
        totalVotes: resolution.totalVotes,
        yesVotes: resolution.yesVotes,
        noVotes: resolution.noVotes,
        abstainVotes: resolution.abstainVotes,
        approvalRate: resolution.totalVotes > 0 
          ? (resolution.yesVotes / resolution.totalVotes * 100).toFixed(2)
          : 0,
        candidateResults
      };
    });

    const reportData = {
      meeting: {
        id: meeting.id,
        meetingCode: meeting.meetingCode,
        meetingName: meeting.meetingName
      },
      votingResults,
      generatedAt: new Date()
    };

    return {
      success: true,
      message: 'Tạo báo cáo kết quả bỏ phiếu thành công',
      data: reportData,
    };
  }

  async generateRegistrationReport(meetingId: number) {
    const meetingIdNum = Number(meetingId);
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingIdNum },
      include: {
        registrations: {
          include: {
            shareholder: {
              select: {
                shareholderCode: true,
                fullName: true,
                totalShares: true,
                email: true,
                phoneNumber: true
              }
            }
          }
        }
      }
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    const registrationData = meeting.registrations.map(registration => ({
      shareholderCode: registration.shareholder.shareholderCode,
      fullName: registration.shareholder.fullName,
      email: registration.shareholder.email,
      phoneNumber: registration.shareholder.phoneNumber,
      shares: registration.sharesRegistered,
      registrationType: registration.registrationType,
      status: registration.status,
      registrationDate: registration.registrationDate
    }));

    const reportData = {
      meeting: {
        id: meeting.id,
        meetingCode: meeting.meetingCode,
        meetingName: meeting.meetingName
      },
      registrationData,
      summary: {
        totalRegistrations: meeting.registrations.length,
        byType: this.groupBy(meeting.registrations, 'registrationType'),
        byStatus: this.groupBy(meeting.registrations, 'status')
      }
    };

    return {
      success: true,
      message: 'Tạo báo cáo đăng ký thành công',
      data: reportData,
    };
  }

  // Helper methods
  async generateReportData(meetingId: number, templateType: string, filters?: any) {
  // Convert meetingId to number để đảm bảo
  const meetingIdNum = Number(meetingId);
  
  switch (templateType) {
    case 'MEETING_SUMMARY':
      return this.generateMeetingSummary(meetingIdNum);
    case 'ATTENDANCE_REPORT':
      return this.generateAttendanceReport(meetingIdNum);
    case 'VOTING_RESULTS':
      return this.generateVotingReport(meetingIdNum);
    case 'REGISTRATION_STATS':
      return this.generateRegistrationReport(meetingIdNum);
    default:
      return {};
  }
}

  private generateReportUrl(): string {
    // Mock URL - in production, this would be the actual report file URL
    return `/reports/${Date.now()}.pdf`;
  }

  private groupBy(array: any[], key: string) {
    return array.reduce((groups, item) => {
      const group = item[key] || 'Unknown';
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {});
  }



async exportReportData(type: string, filters: any) {
  try {
    let exportData: any[] = [];
    let fileName = '';
    let sheetName = '';

    switch (type.toUpperCase()) {
      case 'SHAREHOLDERS':
        const shareholders = await this.prisma.shareholder.findMany({
          orderBy: { createdAt: 'desc' }
        });
        
        exportData = shareholders.map(shareholder => ({
          'Mã cổ đông': shareholder.shareholderCode,
          'Họ và tên': shareholder.fullName,
          'Số CCCD/CMND': shareholder.idNumber,
          'Ngày cấp': shareholder.idIssueDate ? this.formatDate(shareholder.idIssueDate) : '',
          'Nơi cấp': shareholder.idIssuePlace || '',
          'Ngày sinh': shareholder.dateOfBirth ? this.formatDate(shareholder.dateOfBirth) : '',
          'Giới tính': shareholder.gender || '',
          'Quốc tịch': shareholder.nationality || '',
          'Email': shareholder.email,
          'Số điện thoại': shareholder.phoneNumber || '',
          'Địa chỉ': shareholder.address || '',
          'Mã số thuế': shareholder.taxCode || '',
          'Số tài khoản': shareholder.bankAccount || '',
          'Tên ngân hàng': shareholder.bankName || '',
          'Số cổ phần': shareholder.totalShares,
          'Loại cổ phần': shareholder.shareType,
          'Trạng thái': shareholder.isActive ? 'ACTIVE' : 'INACTIVE',
          'Ngày tạo': this.formatDate(shareholder.createdAt)
        }));
        fileName = `shareholders_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        sheetName = 'Shareholders';
        break;

      case 'REGISTRATIONS':
        const whereReg: any = {};
        if (filters?.meetingId) {
          whereReg.meetingId = parseInt(filters.meetingId);
        }

        const registrations = await this.prisma.registration.findMany({
          where: whereReg,
          orderBy: { createdAt: 'desc' },
          include: {
            meeting: { select: { meetingCode: true, meetingName: true, meetingDate: true } },
            shareholder: { select: { shareholderCode: true, fullName: true, email: true, totalShares: true } }
          }
        });

        exportData = registrations.map(registration => ({
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
          'Thời gian check-in': registration.checkinTime ? this.formatDateTime(registration.checkinTime) : '',
          'Phương thức check-in': registration.checkinMethod || '',
          'Người được ủy quyền': registration.proxyName || '',
          'CCCD người ủy quyền': registration.proxyIdNumber || '',
          'Quan hệ': registration.proxyRelationship || '',
          'Ghi chú': registration.notes || '',
          'Ngày tạo': this.formatDate(registration.createdAt)
        }));
        fileName = filters?.meetingId 
          ? `registrations_meeting_${filters.meetingId}_${new Date().toISOString().split('T')[0]}.xlsx`
          : `registrations_${new Date().toISOString().split('T')[0]}.xlsx`;
        sheetName = 'Registrations';
        break;

      case 'VOTING_RESULTS':
        if (!filters?.resolutionId && !filters?.meetingId) {
          throw new BadRequestException('Thiếu resolutionId hoặc meetingId');
        }

        let votes;
        if (filters?.resolutionId) {
          const resolution = await this.prisma.resolution.findUnique({
            where: { id: parseInt(filters.resolutionId) },
            include: { meeting: true }
          });
          
          if (!resolution) throw new NotFoundException('Nghị quyết không tồn tại');

          votes = await this.prisma.vote.findMany({
            where: { resolutionId: parseInt(filters.resolutionId) },
            include: {
              shareholder: { select: { shareholderCode: true, fullName: true, totalShares: true } }
            },
            orderBy: { createdAt: 'asc' }
          });

          fileName = `voting_results_${resolution.resolutionCode}_${new Date().toISOString().split('T')[0]}.xlsx`;
        } else {
          // Lấy tất cả votes của meeting
          votes = await this.prisma.vote.findMany({
            where: { 
              resolution: { meetingId: parseInt(filters.meetingId) }
            },
            include: {
              shareholder: { select: { shareholderCode: true, fullName: true, totalShares: true } },
              resolution: { select: { resolutionCode: true, title: true } }
            },
            orderBy: { createdAt: 'asc' }
          });

          const meeting = await this.prisma.meeting.findUnique({
            where: { id: parseInt(filters.meetingId) }
          });
          fileName = `voting_results_${meeting?.meetingCode}_${new Date().toISOString().split('T')[0]}.xlsx`;
        }

        exportData = votes.map(vote => ({
          'Mã cổ đông': vote.shareholder.shareholderCode,
          'Tên cổ đông': vote.shareholder.fullName,
          'Số cổ phần': vote.shareholder.totalShares,
          'Giá trị bỏ phiếu': vote.voteValue,
          'Số cổ phần sử dụng': vote.sharesUsed,
          'Nghị quyết': (vote as any).resolution?.title || 'N/A',
          'Mã nghị quyết': (vote as any).resolution?.resolutionCode || 'N/A',
          'Thời gian bỏ phiếu': this.formatDateTime(vote.createdAt),
          'Địa chỉ IP': vote.ipAddress || '',
          'Thiết bị': vote.userAgent || ''
        }));
        sheetName = 'Voting_Results';
        break;

      case 'ATTENDANCES':
        if (!filters?.meetingId) {
          throw new BadRequestException('Thiếu meetingId');
        }

        const meeting = await this.prisma.meeting.findUnique({ 
          where: { id: parseInt(filters.meetingId) } 
        });
        if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

        const attendances = await this.prisma.attendance.findMany({
          where: { meetingId: parseInt(filters.meetingId) },
          orderBy: { checkinTime: 'desc' },
          include: {
            meeting: { select: { meetingCode: true, meetingName: true, meetingDate: true } },
            shareholder: { select: { shareholderCode: true, fullName: true, email: true, totalShares: true } }
          }
        });

        exportData = attendances.map(attendance => ({
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
        fileName = `attendances_${meeting.meetingCode}_${new Date().toISOString().split('T')[0]}.xlsx`;
        sheetName = 'Attendances';
        break;

      default:
        throw new BadRequestException('Loại export không hợp lệ');
    }

    // Tạo file Excel
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return {
      success: true,
      message: `Export ${type.toLowerCase()} thành công`,
      data: {
        buffer: buffer.toString('base64'),
        fileName: fileName
      }
    };

  } catch (error) {
    throw new BadRequestException(`Lỗi khi export ${type.toLowerCase()}: ${error.message}`);
  }
}

private formatDateTime(date: Date): string {
  if (!date) return '';
  return new Date(date).toLocaleString('vi-VN');
}

// Helper methods
private formatDate(date: Date): string {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}


}