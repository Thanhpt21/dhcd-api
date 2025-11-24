import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async createNotification(dto: CreateNotificationDto) {
    // Validate user exists if provided
    if (dto.userId) {
      const user = await this.prisma.user.findUnique({ 
        where: { id: dto.userId } 
      });
      if (!user) throw new BadRequestException('Người dùng không tồn tại');
    }

    // ✅ THÊM: Validate shareholder exists if provided
    if (dto.shareholderId) {
      const shareholder = await this.prisma.shareholder.findUnique({ 
        where: { id: dto.shareholderId } 
      });
      if (!shareholder) throw new BadRequestException('Cổ đông không tồn tại');
    }

    // Validate meeting exists if provided
    if (dto.meetingId) {
      const meeting = await this.prisma.meeting.findUnique({ 
        where: { id: dto.meetingId } 
      });
      if (!meeting) throw new BadRequestException('Cuộc họp không tồn tại');
    }

    // ✅ THÊM: Validate either userId or shareholderId is provided
    if (!dto.userId && !dto.shareholderId) {
      throw new BadRequestException('Phải cung cấp userId hoặc shareholderId');
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        shareholderId: dto.shareholderId, // ✅ THÊM
        meetingId: dto.meetingId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data,
        isSent: dto.isSent || false,
        isRead: false
      }
    });

    return {
      success: true,
      message: 'Tạo thông báo thành công',
      data: new NotificationResponseDto(notification),
    };
  }

  async getNotifications(
    page = 1, 
    limit = 10, 
    userId = '', 
    shareholderId = '', // ✅ THÊM
    meetingId = '', 
    type = '', 
    isRead = '', 
    isSent = '', 
    search = ''
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {};
    
    if (userId) {
      where.userId = +userId;
    }

    // ✅ THÊM: Filter by shareholderId
    if (shareholderId) {
      where.shareholderId = +shareholderId;
    }

    if (meetingId) {
      where.meetingId = +meetingId;
    }

    if (type) {
      where.type = {
        equals: type as any
      } as Prisma.EnumNotificationTypeFilter;
    }

    if (isRead !== '') {
      where.isRead = isRead === 'true';
    }

    if (isSent !== '') {
      where.isSent = isSent === 'true';
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { message: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    const [notifications, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          shareholder: { // ✅ THÊM
            select: { id: true, shareholderCode: true, fullName: true, email: true }
          },
          meeting: {
            select: { id: true, meetingCode: true, meetingName: true }
          }
        }
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách thông báo thành công',
      data: {
        data: notifications.map(notification => new NotificationResponseDto(notification)),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getUserNotifications(userId: number, page = 1, limit = 10, unreadOnly = false) {
    const user = await this.prisma.user.findUnique({ 
      where: { id: userId } 
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = { userId };
    
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          meeting: {
            select: { meetingCode: true, meetingName: true }
          }
        }
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } })
    ]);

    return {
      success: true,
      message: 'Lấy thông báo của người dùng thành công',
      data: {
        data: notifications.map(notification => new NotificationResponseDto(notification)),
        total,
        unreadCount,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  // ✅ THÊM: Lấy notifications của shareholder
  async getShareholderNotifications(shareholderId: number, page = 1, limit = 10, unreadOnly = false) {
    const shareholder = await this.prisma.shareholder.findUnique({ 
      where: { id: shareholderId } 
    });
    if (!shareholder) throw new NotFoundException('Cổ đông không tồn tại');

    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = { shareholderId };
    
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          meeting: {
            select: { meetingCode: true, meetingName: true }
          }
        }
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { shareholderId, isRead: false } })
    ]);

    return {
      success: true,
      message: 'Lấy thông báo của cổ đông thành công',
      data: {
        data: notifications.map(notification => new NotificationResponseDto(notification)),
        total,
        unreadCount,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getMeetingNotifications(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id: meetingId } 
    });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const notifications = await this.prisma.notification.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        },
        shareholder: { // ✅ THÊM
          select: { shareholderCode: true, fullName: true, email: true }
        }
      }
    });

    return {
      success: true,
      message: 'Lấy thông báo theo cuộc họp thành công',
      data: notifications.map(notification => new NotificationResponseDto(notification)),
    };
  }

  async getNotificationById(id: number) {
    const notification = await this.prisma.notification.findUnique({ 
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        shareholder: { // ✅ THÊM
          select: { id: true, shareholderCode: true, fullName: true, email: true }
        },
        meeting: {
          select: { id: true, meetingCode: true, meetingName: true }
        }
      }
    });
    
    if (!notification) throw new NotFoundException('Thông báo không tồn tại');
    
    return {
      success: true,
      message: 'Lấy thông tin thông báo thành công',
      data: new NotificationResponseDto(notification),
    };
  }

  async updateNotification(id: number, dto: UpdateNotificationDto) {
    const notification = await this.prisma.notification.findUnique({ 
      where: { id } 
    });
    if (!notification) throw new NotFoundException('Thông báo không tồn tại');

    // Validate user exists if provided
    if (dto.userId) {
      const user = await this.prisma.user.findUnique({ 
        where: { id: dto.userId } 
      });
      if (!user) throw new BadRequestException('Người dùng không tồn tại');
    }

    // ✅ THÊM: Validate shareholder exists if provided
    if (dto.shareholderId) {
      const shareholder = await this.prisma.shareholder.findUnique({ 
        where: { id: dto.shareholderId } 
      });
      if (!shareholder) throw new BadRequestException('Cổ đông không tồn tại');
    }

    // Validate meeting exists if provided
    if (dto.meetingId) {
      const meeting = await this.prisma.meeting.findUnique({ 
        where: { id: dto.meetingId } 
      });
      if (!meeting) throw new BadRequestException('Cuộc họp không tồn tại');
    }

    // Only update provided fields
    const updateData: any = {};
    if (dto.userId !== undefined) updateData.userId = dto.userId;
    if (dto.shareholderId !== undefined) updateData.shareholderId = dto.shareholderId; // ✅ THÊM
    if (dto.meetingId !== undefined) updateData.meetingId = dto.meetingId;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.message !== undefined) updateData.message = dto.message;
    if (dto.data !== undefined) updateData.data = dto.data;
    if (dto.isRead !== undefined) {
      updateData.isRead = dto.isRead;
      updateData.readAt = dto.isRead ? new Date() : null;
    }
    if (dto.isSent !== undefined) {
      updateData.isSent = dto.isSent;
      updateData.sentAt = dto.isSent ? new Date() : null;
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: updateData
    });

    return {
      success: true,
      message: 'Cập nhật thông báo thành công',
      data: new NotificationResponseDto(updated),
    };
  }

  async deleteNotification(id: number) {
    const notification = await this.prisma.notification.findUnique({ 
      where: { id } 
    });
    if (!notification) throw new NotFoundException('Thông báo không tồn tại');

    await this.prisma.notification.delete({ where: { id } });
    
    return {
      success: true,
      message: 'Xóa thông báo thành công',
      data: null,
    };
  }

  async markAsRead(id: number) {
    const notification = await this.prisma.notification.findUnique({ 
      where: { id } 
    });
    if (!notification) throw new NotFoundException('Thông báo không tồn tại');

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { 
        isRead: true,
        readAt: new Date()
      }
    });

    return {
      success: true,
      message: 'Đánh dấu đã đọc thành công',
      data: new NotificationResponseDto(updated),
    };
  }

  async markAsUnread(id: number) {
    const notification = await this.prisma.notification.findUnique({ 
      where: { id } 
    });
    if (!notification) throw new NotFoundException('Thông báo không tồn tại');

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { 
        isRead: false,
        readAt: null
      }
    });

    return {
      success: true,
      message: 'Đánh dấu chưa đọc thành công',
      data: new NotificationResponseDto(updated),
    };
  }

  async markAllAsRead(userId: number) {
    const user = await this.prisma.user.findUnique({ 
      where: { id: userId } 
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const result = await this.prisma.notification.updateMany({
      where: { 
        userId,
        isRead: false
      },
      data: { 
        isRead: true,
        readAt: new Date()
      }
    });

    return {
      success: true,
      message: `Đã đánh dấu ${result.count} thông báo là đã đọc`,
      data: { count: result.count },
    };
  }

  // ✅ THÊM: Đánh dấu tất cả đã đọc cho shareholder
  async markAllAsReadShareholder(shareholderId: number) {
    const shareholder = await this.prisma.shareholder.findUnique({ 
      where: { id: shareholderId } 
    });
    if (!shareholder) throw new NotFoundException('Cổ đông không tồn tại');

    const result = await this.prisma.notification.updateMany({
      where: { 
        shareholderId,
        isRead: false
      },
      data: { 
        isRead: true,
        readAt: new Date()
      }
    });

    return {
      success: true,
      message: `Đã đánh dấu ${result.count} thông báo là đã đọc`,
      data: { count: result.count },
    };
  }

  async markAsSent(id: number) {
    const notification = await this.prisma.notification.findUnique({ 
      where: { id } 
    });
    if (!notification) throw new NotFoundException('Thông báo không tồn tại');

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { 
        isSent: true,
        sentAt: new Date()
      }
    });

    return {
      success: true,
      message: 'Đánh dấu đã gửi thành công',
      data: new NotificationResponseDto(updated),
    };
  }

  async getUnreadCount(userId: number) {
    const user = await this.prisma.user.findUnique({ 
      where: { id: userId } 
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const count = await this.prisma.notification.count({
      where: { 
        userId,
        isRead: false
      }
    });

    return {
      success: true,
      message: 'Lấy số thông báo chưa đọc thành công',
      data: { unreadCount: count },
    };
  }

  // ✅ THÊM: Lấy số notification chưa đọc của shareholder
  async getUnreadCountShareholder(shareholderId: number) {
    const shareholder = await this.prisma.shareholder.findUnique({ 
      where: { id: shareholderId } 
    });
    if (!shareholder) throw new NotFoundException('Cổ đông không tồn tại');

    const count = await this.prisma.notification.count({
      where: { 
        shareholderId,
        isRead: false
      }
    });

    return {
      success: true,
      message: 'Lấy số thông báo chưa đọc thành công',
      data: { unreadCount: count },
    };
  }

  async createBatchNotifications(notifications: CreateNotificationDto[]) {
    const results = {
      total: notifications.length,
      success: 0,
      errors: [] as string[],
      createdNotifications: [] as any[]
    };

    for (const notificationData of notifications) {
      try {
        // Validate user exists if provided
        if (notificationData.userId) {
          const user = await this.prisma.user.findUnique({ 
            where: { id: notificationData.userId } 
          });
          if (!user) {
            results.errors.push(`Người dùng ${notificationData.userId} không tồn tại`);
            continue;
          }
        }

        // ✅ THÊM: Validate shareholder exists if provided
        if (notificationData.shareholderId) {
          const shareholder = await this.prisma.shareholder.findUnique({ 
            where: { id: notificationData.shareholderId } 
          });
          if (!shareholder) {
            results.errors.push(`Cổ đông ${notificationData.shareholderId} không tồn tại`);
            continue;
          }
        }

        // Validate meeting exists if provided
        if (notificationData.meetingId) {
          const meeting = await this.prisma.meeting.findUnique({ 
            where: { id: notificationData.meetingId } 
          });
          if (!meeting) {
            results.errors.push(`Cuộc họp ${notificationData.meetingId} không tồn tại`);
            continue;
          }
        }

        // ✅ THÊM: Validate either userId or shareholderId is provided
        if (!notificationData.userId && !notificationData.shareholderId) {
          results.errors.push(`Thông báo "${notificationData.title}": Phải cung cấp userId hoặc shareholderId`);
          continue;
        }

        const notification = await this.prisma.notification.create({
          data: {
            userId: notificationData.userId,
            shareholderId: notificationData.shareholderId, // ✅ THÊM
            meetingId: notificationData.meetingId,
            type: notificationData.type,
            title: notificationData.title,
            message: notificationData.message,
            data: notificationData.data,
            isSent: notificationData.isSent || false,
            isRead: false
          }
        });

        results.success++;
        results.createdNotifications.push(new NotificationResponseDto(notification));

      } catch (error) {
        results.errors.push(`Thông báo "${notificationData.title}": ${error.message}`);
      }
    }

    return {
      success: true,
      message: `Tạo hàng loạt thành công: ${results.success}/${results.total}`,
      data: results
    };
  }
}