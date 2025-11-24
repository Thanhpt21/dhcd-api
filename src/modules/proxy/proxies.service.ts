import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateProxyDto } from './dto/create-proxy.dto';
import { UpdateProxyDto } from './dto/update-proxy.dto';
import { ProxyResponseDto } from './dto/proxy-response.dto';
import { Prisma, ProxyStatus } from '@prisma/client';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class ProxiesService {
  constructor(private prisma: PrismaService, private readonly uploadService: UploadService) {}

  async createProxy(dto: CreateProxyDto, documentUrl) {
  // VALIDATE VÀ CHUYỂN ĐỔI KIỂU DỮ LIỆU
  const meetingId = parseInt(dto.meetingId.toString());
  const shareholderId = parseInt(dto.shareholderId.toString());
  const proxyPersonId = parseInt(dto.proxyPersonId.toString());

  // Validate meeting exists
  const meeting = await this.prisma.meeting.findUnique({ 
    where: { id: meetingId } 
  });
  if (!meeting) throw new BadRequestException('Cuộc họp không tồn tại');
  
  // Validate shareholder exists
  const shareholder = await this.prisma.shareholder.findUnique({ 
    where: { id: shareholderId } 
  });
  if (!shareholder) throw new BadRequestException('Cổ đông không tồn tại');

  // Validate proxy person exists
  const proxyPerson = await this.prisma.shareholder.findUnique({ 
    where: { id: proxyPersonId } 
  });
  if (!proxyPerson) throw new BadRequestException('Người được ủy quyền không tồn tại');

  // Check if shareholder already has a proxy for this meeting
  const existingProxy = await this.prisma.proxy.findUnique({
    where: { 
      meetingId_shareholderId: { 
        meetingId: meetingId, 
        shareholderId: shareholderId 
      } 
    }
  });
  if (existingProxy) throw new BadRequestException('Cổ đông đã có ủy quyền cho cuộc họp này');

  // Validate approvedBy user exists if provided
  if (dto.approvedBy) {
    const approvedBy = parseInt(dto.approvedBy.toString());
    const approvedByUser = await this.prisma.user.findUnique({ 
      where: { id: approvedBy } 
    });
    if (!approvedByUser) throw new BadRequestException('Người phê duyệt không tồn tại');
  }

  // Validate shares don't exceed shareholder's total shares
  const sharesValue = parseInt(dto.shares.toString());
  if (sharesValue > shareholder.totalShares) {
    throw new BadRequestException('Số cổ phần ủy quyền vượt quá tổng số cổ phần của cổ đông');
  }

  let documentUrlString: string | undefined;
  
  if (documentUrl) {
    const result = await this.uploadService.uploadDocument(
      documentUrl,
      'proxy-documents',
      `proxy_${Date.now()}_${documentUrl.originalname}`
    );
    
    if (result.success && result.url) {
      documentUrlString = result.url;
    } else {
      throw new Error(`Upload document failed: ${result.error}`);
    }
  }

  // TẠO PROXY VỚI DỮ LIỆU ĐÃ CHUYỂN ĐỔI
  const proxy = await this.prisma.proxy.create({
    data: {
      meetingId: meetingId,
      shareholderId: shareholderId,
      proxyPersonId: proxyPersonId,
      shares: sharesValue,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      status: dto.status || ProxyStatus.PENDING,
      reason: dto.reason,
      documentUrl: documentUrlString,
      approvedBy: dto.approvedBy ? parseInt(dto.approvedBy.toString()) : undefined,
      approvedAt: dto.approvedBy ? new Date() : undefined
    }
  });

  return {
    success: true,
    message: 'Tạo ủy quyền thành công',
    data: new ProxyResponseDto(proxy),
  };
}

  async getProxies(
    page = 1, 
    limit = 10, 
    meetingId = '', 
    shareholderId = '', 
    proxyPersonId = '', 
    status = '', 
    search = ''
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.ProxyWhereInput = {};
    
    if (meetingId) {
      where.meetingId = +meetingId;
    }

    if (shareholderId) {
      where.shareholderId = +shareholderId;
    }

    if (proxyPersonId) {
      where.proxyPersonId = +proxyPersonId;
    }

    // ✅ FIX: Sử dụng Prisma enum filter
    if (status) {
      where.status = {
        equals: status as any
      } as Prisma.EnumProxyStatusFilter;
    }

    if (search) {
      where.OR = [
        { shareholder: { fullName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        { shareholder: { shareholderCode: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        { proxyPerson: { fullName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        { proxyPerson: { shareholderCode: { contains: search, mode: Prisma.QueryMode.insensitive } } },
        { reason: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    const [proxies, total] = await this.prisma.$transaction([
      this.prisma.proxy.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          meeting: {
            select: { id: true, meetingCode: true, meetingName: true }
          },
          shareholder: {
            select: { id: true, shareholderCode: true, fullName: true, email: true, totalShares: true }
          },
          proxyPerson: {
            select: { id: true, shareholderCode: true, fullName: true, email: true }
          },
          approvedByUser: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      this.prisma.proxy.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách ủy quyền thành công',
      data: {
        data: proxies.map(proxy => new ProxyResponseDto(proxy)),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getProxiesByMeeting(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id: meetingId } 
    });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const proxies = await this.prisma.proxy.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
      include: {
        shareholder: {
          select: { shareholderCode: true, fullName: true, email: true, totalShares: true }
        },
        proxyPerson: {
          select: { shareholderCode: true, fullName: true, email: true }
        },
        approvedByUser: {
          select: { name: true, email: true }
        }
      }
    });

    return {
      success: true,
      message: 'Lấy ủy quyền theo cuộc họp thành công',
      data: proxies.map(proxy => new ProxyResponseDto(proxy)),
    };
  }

  async getProxiesByShareholder(shareholderId: number) {
    const shareholder = await this.prisma.shareholder.findUnique({ 
      where: { id: shareholderId } 
    });
    if (!shareholder) throw new NotFoundException('Cổ đông không tồn tại');

    const proxies = await this.prisma.proxy.findMany({
      where: { shareholderId },
      orderBy: { createdAt: 'desc' },
      include: {
        meeting: {
          select: { meetingCode: true, meetingName: true, meetingDate: true }
        },
        proxyPerson: {
          select: { shareholderCode: true, fullName: true, email: true, idNumber: true }
        }
      }
    });

    return {
      success: true,
      message: 'Lấy ủy quyền theo cổ đông thành công',
      data: proxies.map(proxy => new ProxyResponseDto(proxy)),
    };
  }

  async getProxiesByProxyPerson(proxyPersonId: number) {
    const proxyPerson = await this.prisma.shareholder.findUnique({ 
      where: { id: proxyPersonId } 
    });
    if (!proxyPerson) throw new NotFoundException('Người được ủy quyền không tồn tại');

    const proxies = await this.prisma.proxy.findMany({
      where: { proxyPersonId },
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

    return {
      success: true,
      message: 'Lấy ủy quyền theo người được ủy quyền thành công',
      data: proxies.map(proxy => new ProxyResponseDto(proxy)),
    };
  }

  async getProxyById(id: number) {
    const proxy = await this.prisma.proxy.findUnique({ 
      where: { id },
      include: {
        meeting: {
          select: { id: true, meetingCode: true, meetingName: true }
        },
        shareholder: {
          select: { id: true, shareholderCode: true, fullName: true, email: true, totalShares: true }
        },
        proxyPerson: {
          select: { id: true, shareholderCode: true, fullName: true, email: true }
        },
        approvedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    if (!proxy) throw new NotFoundException('Ủy quyền không tồn tại');
    
    return {
      success: true,
      message: 'Lấy thông tin ủy quyền thành công',
      data: new ProxyResponseDto(proxy),
    };
  }

async updateProxy(
  id: number, 
  dto: UpdateProxyDto, 
  documentUrl?: Express.Multer.File
) {
  const proxy = await this.prisma.proxy.findUnique({ 
    where: { id } 
  });
  if (!proxy) throw new NotFoundException('Ủy quyền không tồn tại');

  // Validate approvedBy user exists if provided
  if (dto.approvedBy) {
    const approvedByUser = await this.prisma.user.findUnique({ 
      where: { id: dto.approvedBy } 
    });
    if (!approvedByUser) throw new BadRequestException('Người phê duyệt không tồn tại');
  }

  // Validate shares don't exceed shareholder's total shares
  if (dto.shares) {
    const shareholder = await this.prisma.shareholder.findUnique({ 
      where: { id: proxy.shareholderId } 
    });
    
    if (!shareholder) {
      throw new BadRequestException('Không tìm thấy thông tin cổ đông');
    }
    
    // Convert shares to number nếu là string
    const sharesValue = typeof dto.shares === 'string' ? parseInt(dto.shares) : dto.shares;
    
    if (sharesValue > shareholder.totalShares) {
      throw new BadRequestException('Số cổ phần ủy quyền vượt quá tổng số cổ phần của cổ đông');
    }
  }

  // Xử lý upload file nếu có
  let documentUrlString: string | undefined | null;

  if (documentUrl) {
    // Upload file mới
    const result = await this.uploadService.uploadDocument(
      documentUrl,
      'proxy-documents',
      `proxy_${Date.now()}_${documentUrl.originalname}`
    );
    
    if (result.success && result.url) {
      documentUrlString = result.url;
      
      // Xóa file cũ nếu có
      if (proxy.documentUrl && proxy.documentUrl.includes('supabase.co')) {
        const deleteResult = await this.uploadService.deleteFile(proxy.documentUrl);
        if (!deleteResult.success) {
          console.warn(`⚠️ Không thể xóa file cũ: ${deleteResult.error}`);
        }
      }
    } else {
      throw new Error(`Upload document failed: ${result.error}`);
    }
  } else {
    // Kiểm tra nếu client muốn xóa file hiện tại
    // Vì dto.documentUrl có thể là File (từ FormData) hoặc string (từ JSON)
    const shouldDeleteDocument = 
      // Trường hợp 1: documentUrl là empty string (từ FormData)
      (typeof dto.documentUrl === 'string' && dto.documentUrl === '') ||
      // Trường hợp 2: documentUrl là null (từ JSON)
      dto.documentUrl === null;
    
    if (shouldDeleteDocument) {
      if (proxy.documentUrl && proxy.documentUrl.includes('supabase.co')) {
        const deleteResult = await this.uploadService.deleteFile(proxy.documentUrl);
        if (!deleteResult.success) {
          console.warn(`⚠️ Không thể xóa file cũ: ${deleteResult.error}`);
        }
      }
      documentUrlString = null;
    }
  }

  // Only update provided fields - CONVERT DATA TYPES
  const updateData: any = {};
  
  if (dto.shares !== undefined) {
    // Convert shares to number
    updateData.shares = typeof dto.shares === 'string' ? parseInt(dto.shares) : dto.shares;
  }
  
  if (dto.startDate !== undefined) updateData.startDate = new Date(dto.startDate);
  if (dto.endDate !== undefined) updateData.endDate = new Date(dto.endDate);
  if (dto.status !== undefined) updateData.status = dto.status;
  if (dto.reason !== undefined) updateData.reason = dto.reason;
  
  // Xử lý documentUrl
  if (documentUrlString !== undefined) {
    updateData.documentUrl = documentUrlString;
  } else if (dto.documentUrl !== undefined && 
             typeof dto.documentUrl === 'string' && 
             dto.documentUrl !== '') {
    // Chỉ update nếu là string và không phải empty string
    updateData.documentUrl = dto.documentUrl;
  }
  
  if (dto.approvedBy !== undefined) {
    updateData.approvedBy = dto.approvedBy;
    updateData.approvedAt = dto.approvedBy ? new Date() : null;
  }
  if (dto.rejectedReason !== undefined) updateData.rejectedReason = dto.rejectedReason;

  const updated = await this.prisma.proxy.update({
    where: { id },
    data: updateData
  });

  return {
    success: true,
    message: 'Cập nhật ủy quyền thành công',
    data: new ProxyResponseDto(updated),
  };
}

  async deleteProxy(id: number) {
    const proxy = await this.prisma.proxy.findUnique({ 
      where: { id } 
    });
    if (!proxy) throw new NotFoundException('Ủy quyền không tồn tại');

    await this.prisma.proxy.delete({ where: { id } });
    
    return {
      success: true,
      message: 'Xóa ủy quyền thành công',
      data: null,
    };
  }

  async approveProxy(id: number, approvedBy: number) {
    const proxy = await this.prisma.proxy.findUnique({ 
      where: { id } 
    });
    if (!proxy) throw new NotFoundException('Ủy quyền không tồn tại');

    // Validate approvedBy user exists
    const approvedByUser = await this.prisma.user.findUnique({ 
      where: { id: approvedBy } 
    });
    if (!approvedByUser) throw new BadRequestException('Người phê duyệt không tồn tại');

    const updated = await this.prisma.proxy.update({
      where: { id },
      data: { 
        status: ProxyStatus.APPROVED,
        approvedBy: approvedBy,
        approvedAt: new Date(),
        rejectedReason: null
      }
    });

    return {
      success: true,
      message: 'Phê duyệt ủy quyền thành công',
      data: new ProxyResponseDto(updated),
    };
  }

  async rejectProxy(id: number, rejectedReason: string) {
    const proxy = await this.prisma.proxy.findUnique({ 
      where: { id } 
    });
    if (!proxy) throw new NotFoundException('Ủy quyền không tồn tại');

    const updated = await this.prisma.proxy.update({
      where: { id },
      data: { 
        status: ProxyStatus.REJECTED,
        approvedBy: null,
        approvedAt: null,
        rejectedReason: rejectedReason
      }
    });

    return {
      success: true,
      message: 'Từ chối ủy quyền thành công',
      data: new ProxyResponseDto(updated),
    };
  }

  async revokeProxy(id: number) {
    const proxy = await this.prisma.proxy.findUnique({ 
      where: { id } 
    });
    if (!proxy) throw new NotFoundException('Ủy quyền không tồn tại');

    const updated = await this.prisma.proxy.update({
      where: { id },
      data: { 
        status: ProxyStatus.REVOKED,
        approvedBy: null,
        approvedAt: null
      }
    });

    return {
      success: true,
      message: 'Thu hồi ủy quyền thành công',
      data: new ProxyResponseDto(updated),
    };
  }

  async getProxyStatistics(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id: meetingId } 
    });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const proxies = await this.prisma.proxy.findMany({
      where: { meetingId },
      include: {
        shareholder: {
          select: { totalShares: true }
        }
      }
    });

    const statistics = {
      totalProxies: proxies.length,
      approvedProxies: proxies.filter(p => p.status === ProxyStatus.APPROVED).length,
      pendingProxies: proxies.filter(p => p.status === ProxyStatus.PENDING).length,
      rejectedProxies: proxies.filter(p => p.status === ProxyStatus.REJECTED).length,
      revokedProxies: proxies.filter(p => p.status === ProxyStatus.REVOKED).length,
      expiredProxies: proxies.filter(p => p.status === ProxyStatus.EXPIRED).length,
      totalShares: proxies.reduce((sum, proxy) => sum + proxy.shares, 0),
      byStatus: proxies.reduce((acc, proxy) => {
        acc[proxy.status] = (acc[proxy.status] || 0) + 1;
        return acc;
      }, {})
    };

    return {
      success: true,
      message: 'Lấy thống kê ủy quyền thành công',
      data: statistics,
    };
  }

  async getActiveProxyForShareholder(shareholderId: number) {
    const shareholder = await this.prisma.shareholder.findUnique({ 
      where: { id: shareholderId } 
    });
    if (!shareholder) throw new NotFoundException('Cổ đông không tồn tại');

    const now = new Date();
    const activeProxy = await this.prisma.proxy.findFirst({
      where: { 
        shareholderId,
        status: ProxyStatus.APPROVED,
        startDate: { lte: now },
        endDate: { gte: now }
      },
      include: {
        meeting: {
          select: { meetingCode: true, meetingName: true, meetingDate: true }
        },
        proxyPerson: {
          select: { shareholderCode: true, fullName: true, email: true }
        }
      }
    });

    if (!activeProxy) {
      return {
        success: true,
        message: 'Không có ủy quyền đang hoạt động',
        data: null,
      };
    }

    return {
      success: true,
      message: 'Lấy ủy quyền đang hoạt động thành công',
      data: new ProxyResponseDto(activeProxy),
    };
  }

  async validateProxy(meetingId: number, shareholderId: number) {
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id: meetingId } 
    });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const shareholder = await this.prisma.shareholder.findUnique({ 
      where: { id: shareholderId } 
    });
    if (!shareholder) throw new NotFoundException('Cổ đông không tồn tại');

    const now = new Date();
    const validProxy = await this.prisma.proxy.findFirst({
      where: { 
        meetingId,
        shareholderId,
        status: ProxyStatus.APPROVED,
        startDate: { lte: now },
        endDate: { gte: now }
      },
      include: {
        proxyPerson: {
          select: { shareholderCode: true, fullName: true, email: true }
        }
      }
    });

    return {
      success: true,
      message: 'Kiểm tra ủy quyền thành công',
      data: {
        isValid: !!validProxy,
        proxy: validProxy ? new ProxyResponseDto(validProxy) : null
      },
    };
  }
}