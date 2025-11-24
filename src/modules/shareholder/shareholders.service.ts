import { Injectable, NotFoundException, BadRequestException, Res } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateShareholderDto } from './dto/create-shareholder.dto';
import { UpdateShareholderDto } from './dto/update-shareholder.dto';
import { ShareholderResponseDto } from './dto/shareholder-response.dto';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';

@Injectable()
export class ShareholdersService {
  constructor(private prisma: PrismaService) {}

  async createShareholder(dto: CreateShareholderDto) {
    // Check if shareholder code already exists
    const existingCode = await this.prisma.shareholder.findUnique({ 
      where: { shareholderCode: dto.shareholderCode } 
    });
    if (existingCode) throw new BadRequestException('Mã cổ đông đã tồn tại');

    // Check if idNumber already exists - FIX: Use findFirst instead of findUnique for non-unique fields
    const existingId = await this.prisma.shareholder.findFirst({ 
      where: { idNumber: dto.idNumber } 
    });
    if (existingId) throw new BadRequestException('Số CCCD/CMND đã tồn tại');

    // Check if email already exists
    const existingEmail = await this.prisma.shareholder.findFirst({ 
      where: { email: dto.email } 
    });
    if (existingEmail) throw new BadRequestException('Email đã tồn tại');

    const shareholder = await this.prisma.shareholder.create({ 
      data: {
        ...dto,
        totalShares: dto.totalShares || 0,
        shareType: dto.shareType || 'COMMON',
        isActive: dto.isActive ?? true
      }
    });

    // Create initial share history - FIX: Handle undefined totalShares
    const initialShares = dto.totalShares || 0;
    if (initialShares > 0) {
      await this.prisma.shareholderShareHistory.create({
        data: {
          shareholderId: shareholder.id,
          changeDate: new Date(),
          sharesBefore: 0,
          sharesAfter: initialShares,
          changeAmount: initialShares,
          changeType: 'INITIAL',
          description: 'Khởi tạo cổ phần ban đầu'
        }
      });
    }

    return {
      success: true,
      message: 'Tạo cổ đông thành công',
      data: new ShareholderResponseDto(shareholder),
    };
  }

  async getShareholders(page = 1, limit = 10, search = '', isActive = '') {
    const skip = (page - 1) * limit;

    const where: Prisma.ShareholderWhereInput = {};
    
    if (search) {
      where.OR = [
        { shareholderCode: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { fullName: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { idNumber: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { email: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
      ];
    }

    if (isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const [shareholders, total] = await this.prisma.$transaction([
      this.prisma.shareholder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          shareHistories: {
            orderBy: { changeDate: 'desc' },
            take: 1
          }
        }
      }),
      this.prisma.shareholder.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách cổ đông thành công',
      data: {
        data: shareholders.map((s) => new ShareholderResponseDto(s)),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getAllShareholders(search = '', isActive = '') {
    const where: Prisma.ShareholderWhereInput = {};
    
    if (search) {
      where.OR = [
        { shareholderCode: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { fullName: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { idNumber: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        { email: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
      ];
    }

    if (isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const shareholders = await this.prisma.shareholder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'Lấy tất cả cổ đông thành công',
      data: shareholders.map((s) => new ShareholderResponseDto(s)),
    };
  }

  async getShareholderById(id: number) {
    const shareholder = await this.prisma.shareholder.findUnique({ 
      where: { id },
      include: {
        shareHistories: {
          orderBy: { changeDate: 'desc' }
        },
        registrations: {
          include: {
            meeting: true
          }
        }
      }
    });
    
    if (!shareholder) throw new NotFoundException('Cổ đông không tồn tại');
    
    return {
      success: true,
      message: 'Lấy thông tin cổ đông thành công',
      data: {
        ...new ShareholderResponseDto(shareholder),
        shareHistories: shareholder.shareHistories,
        registrations: shareholder.registrations
      },
    };
  }

  async updateShareholder(id: number, dto: UpdateShareholderDto) {
    const shareholder = await this.prisma.shareholder.findUnique({ where: { id } });
    if (!shareholder) throw new NotFoundException('Cổ đông không tồn tại');

    // Check unique constraints if updating
    if (dto.shareholderCode && dto.shareholderCode !== shareholder.shareholderCode) {
        const existing = await this.prisma.shareholder.findUnique({ 
        where: { shareholderCode: dto.shareholderCode } 
        });
        if (existing) throw new BadRequestException('Mã cổ đông đã tồn tại');
    }

    if (dto.idNumber && dto.idNumber !== shareholder.idNumber) {
        const existing = await this.prisma.shareholder.findFirst({ 
        where: { idNumber: dto.idNumber } 
        });
        if (existing) throw new BadRequestException('Số CCCD/CMND đã tồn tại');
    }

    if (dto.email && dto.email !== shareholder.email) {
        const existing = await this.prisma.shareholder.findFirst({ 
        where: { email: dto.email } 
        });
        if (existing) throw new BadRequestException('Email đã tồn tại');
    }

    // FIX: Define proper type for shareHistoryData
    let shareHistoryData: {
        shareholderId: number;
        changeDate: Date;
        sharesBefore: number;
        sharesAfter: number;
        changeAmount: number;
        changeType: string;
        description: string;
    } | null = null;

    if (dto.totalShares !== undefined && dto.totalShares !== shareholder.totalShares) {
        const newTotalShares = dto.totalShares;
        const changeAmount = newTotalShares - shareholder.totalShares;
        
        shareHistoryData = {
        shareholderId: id,
        changeDate: new Date(),
        sharesBefore: shareholder.totalShares,
        sharesAfter: newTotalShares,
        changeAmount: changeAmount,
        changeType: changeAmount > 0 ? 'INCREASE' : 'DECREASE',
        description: `Cập nhật số cổ phần từ ${shareholder.totalShares} thành ${newTotalShares}`
        };
    }

    const updateOperations: any[] = [
        this.prisma.shareholder.update({ 
        where: { id }, 
        data: dto 
        })
    ];

    if (shareHistoryData) {
        updateOperations.push(
        this.prisma.shareholderShareHistory.create({ data: shareHistoryData })
        );
    }

    const [updated] = await this.prisma.$transaction(updateOperations);

    return {
        success: true,
        message: 'Cập nhật cổ đông thành công',
        data: new ShareholderResponseDto(updated),
    };
    }

  async updateShareholderStatus(id: number, isActive: boolean) {
    const shareholder = await this.prisma.shareholder.findUnique({ where: { id } });
    if (!shareholder) throw new NotFoundException('Cổ đông không tồn tại');

    const updated = await this.prisma.shareholder.update({ 
      where: { id }, 
      data: { isActive } 
    });

    return {
      success: true,
      message: `Cập nhật trạng thái cổ đông thành ${isActive ? 'kích hoạt' : 'vô hiệu hóa'}`,
      data: new ShareholderResponseDto(updated),
    };
  }

  async deleteShareholder(id: number) {
    const shareholder = await this.prisma.shareholder.findUnique({ where: { id } });
    if (!shareholder) throw new NotFoundException('Cổ đông không tồn tại');

    // Check if shareholder has related records
    const relatedRecords = await this.prisma.registration.count({
      where: { shareholderId: id }
    });

    if (relatedRecords > 0) {
      throw new BadRequestException('Không thể xóa cổ đông đã có lịch sử đăng ký');
    }

    await this.prisma.$transaction([
      this.prisma.shareholderShareHistory.deleteMany({ where: { shareholderId: id } }),
      this.prisma.shareholder.delete({ where: { id } })
    ]);
    
    return {
      success: true,
      message: 'Xóa cổ đông thành công',
      data: null,
    };
  }

  async getShareholderHistory(id: number) {
    const shareholder = await this.prisma.shareholder.findUnique({ where: { id } });
    if (!shareholder) throw new NotFoundException('Cổ đông không tồn tại');

    const histories = await this.prisma.shareholderShareHistory.findMany({
      where: { shareholderId: id },
      orderBy: { changeDate: 'desc' }
    });

    return {
      success: true,
      message: 'Lấy lịch sử cổ phần thành công',
      data: {
        shareholder: new ShareholderResponseDto(shareholder),
        histories
      },
    };
  }

  async getShareholderStatistics(id: number) {
    const shareholder = await this.prisma.shareholder.findUnique({ 
      where: { id },
      include: {
        registrations: {
          include: {
            meeting: true
          }
        },
        votes: true,
        attendances: true,
        questions: true,
        feedbacks: true
      }
    });

    if (!shareholder) throw new NotFoundException('Cổ đông không tồn tại');

    const statistics = {
      totalMeetingsRegistered: shareholder.registrations.length,
      totalMeetingsAttended: shareholder.attendances.length,
      totalVotes: shareholder.votes.length,
      totalQuestions: shareholder.questions.length,
      totalFeedbacks: shareholder.feedbacks.length,
      attendanceRate: shareholder.registrations.length > 0 
        ? (shareholder.attendances.length / shareholder.registrations.length) * 100 
        : 0
    };

    return {
      success: true,
      message: 'Lấy thống kê cổ đông thành công',
      data: statistics,
    };
  }

async importShareholders(file: Express.Multer.File) {
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
        
        // Map Excel columns to shareholder data
        const shareholderData: CreateShareholderDto = {
          shareholderCode: String(rowData['Mã cổ đông'] || '').trim(),
          fullName: String(rowData['Họ và tên'] || '').trim(),
          idNumber: String(rowData['Số CCCD/CMND'] || '').trim(),
          idIssueDate: this.parseDate(rowData['Ngày cấp']),
          idIssuePlace: rowData['Nơi cấp'] ? String(rowData['Nơi cấp']).trim() : undefined,
          dateOfBirth: this.parseDate(rowData['Ngày sinh']),
          gender: rowData['Giới tính'] ? String(rowData['Giới tính']).trim() : undefined,
          nationality: rowData['Quốc tịch'] ? String(rowData['Quốc tịch']).trim() : undefined,
          email: String(rowData['Email'] || '').trim(),
          phoneNumber: rowData['Số điện thoại'] ? String(rowData['Số điện thoại']).trim() : undefined,
          address: rowData['Địa chỉ'] ? String(rowData['Địa chỉ']).trim() : undefined,
          taxCode: rowData['Mã số thuế'] ? String(rowData['Mã số thuế']).trim() : undefined,
          bankAccount: rowData['Số tài khoản'] ? String(rowData['Số tài khoản']).trim() : undefined,
          bankName: rowData['Tên ngân hàng'] ? String(rowData['Tên ngân hàng']).trim() : undefined,
          totalShares: parseInt(rowData['Số cổ phần']) || 0,
          shareType: (rowData['Loại cổ phần'] || 'COMMON').trim(),
          isActive: true
        };

        // Validate required fields
        if (!shareholderData.shareholderCode) {
          throw new Error('Mã cổ đông là bắt buộc');
        }
        if (!shareholderData.fullName) {
          throw new Error('Họ và tên là bắt buộc');
        }
        if (!shareholderData.idNumber) {
          throw new Error('Số CCCD/CMND là bắt buộc');
        }
        if (!shareholderData.email) {
          throw new Error('Email là bắt buộc');
        }

        // Create shareholder
        const createdShareholder = await this.createShareholder(shareholderData);
        
        results.success++;
        results.details.push({
          row: index + 2,
          shareholderCode: shareholderData.shareholderCode,
          status: 'SUCCESS',
          message: 'Thành công'
        });

      } catch (error) {
        const rowNumber = index + 2;
        const errorMessage = `Dòng ${rowNumber}: ${error.message}`;
        
        results.errors.push(errorMessage);
        results.details.push({
          row: rowNumber,
          shareholderCode: String((row as any)?.['Mã cổ đông'] || 'N/A'),
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

private parseDate(dateValue: any): Date | undefined {
  if (!dateValue) return undefined;
  
  try {
    let jsDate: Date | undefined;
    
    // Nếu là object có property D (Excel serial)
    if (typeof dateValue === 'object' && dateValue.D !== undefined) {
      // Sử dụng XLSX utility để parse date
      const excelSerial = dateValue.D;
      const parsed = XLSX.SSF.parse_date_code(excelSerial);
      if (parsed) {
        jsDate = new Date(parsed.y, parsed.m - 1, parsed.d);
      }
    }
    // Nếu là number (Excel serial)
    else if (typeof dateValue === 'number') {
      const parsed = XLSX.SSF.parse_date_code(dateValue);
      if (parsed) {
        jsDate = new Date(parsed.y, parsed.m - 1, parsed.d);
      }
    }
    // Nếu là string
    else if (typeof dateValue === 'string') {
      jsDate = new Date(dateValue);
    }
    
    // Validate date
    return jsDate && !isNaN(jsDate.getTime()) ? jsDate : undefined;
    
  } catch (error) {
    console.error('Date parsing error:', error);
    return undefined;
  }
}

async exportShareholders() {
  try {
    // Lấy tất cả cổ đông từ database
    const shareholders = await this.prisma.shareholder.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Format data để export
    const exportData = shareholders.map(shareholder => ({
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

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Shareholders');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    return {
      success: true,
      message: 'Export danh sách cổ đông thành công',
      data: {
        buffer: buffer.toString('base64'),
        fileName: `shareholders_export_${new Date().toISOString().split('T')[0]}.xlsx`
      }
    };
  } catch (error) {
    throw new BadRequestException('Lỗi khi export danh sách cổ đông: ' + error.message);
  }
}

// Helper method để format date
private formatDate(date: Date): string {
  if (!date) return '';
  return date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
}

async exportTemplate() {
  try {
    const templateData = [
      {
        'Mã cổ đông': 'CPD001',
        'Họ và tên': 'Nguyễn Văn A',
        'Số CCCD/CMND': '012345678901',
        'Ngày cấp': '2020-01-15',
        'Nơi cấp': 'CA TP Hà Nội',
        'Ngày sinh': '1985-05-20',
        'Giới tính': 'MALE',
        'Quốc tịch': 'Việt Nam',
        'Email': 'nguyenvana@email.com',
        'Số điện thoại': '0912345678',
        'Địa chỉ': '123 Nguyễn Huệ, Q1, TP.HCM',
        'Mã số thuế': '0123456789',
        'Số tài khoản': '123456789',
        'Tên ngân hàng': 'Vietcombank',
        'Số cổ phần': '10000',
        'Loại cổ phần': 'COMMON'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    return {
      success: true,
      message: 'Export template thành công',
      data: {
        buffer: buffer.toString('base64'),
        fileName: 'shareholder_import_template.xlsx'
      }
    };
  } catch (error) {
    throw new BadRequestException('Lỗi khi tạo template: ' + error.message);
  }
}
}