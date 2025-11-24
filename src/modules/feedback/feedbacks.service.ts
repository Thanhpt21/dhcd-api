import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { FeedbackResponseDto } from './dto/feedback-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FeedbacksService {
  constructor(private prisma: PrismaService) {}

  async createFeedback(dto: CreateFeedbackDto) {
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

    // Check if feedback code already exists
    const existingCode = await this.prisma.feedback.findFirst({ 
      where: { feedbackCode: dto.feedbackCode } 
    });
    if (existingCode) throw new BadRequestException('Mã phản hồi đã tồn tại');

    const feedback = await this.prisma.feedback.create({ 
      data: {
        ...dto,
        category: dto.category || 'GENERAL',
        priority: dto.priority || 'MEDIUM',
        status: 'PENDING',
        isPublic: dto.isPublic || false
      }
    });

    return {
      success: true,
      message: 'Tạo phản hồi thành công',
      data: new FeedbackResponseDto(feedback),
    };
  }

  async getFeedbacks(page = 1, limit = 10, meetingId = '', shareholderId = '', status = '', category = '', isPublic = '', search = '') {
    const skip = (page - 1) * limit;

    const where: Prisma.FeedbackWhereInput = {};
    
    if (meetingId) {
      where.meetingId = +meetingId;
    }

    if (shareholderId) {
      where.shareholderId = +shareholderId;
    }

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    if (isPublic !== '') {
      where.isPublic = isPublic === 'true';
    }

    if (search) {
      where.OR = [
        { feedbackCode: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { content: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { shareholder: { fullName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
      ];
    }

    const [feedbacks, total] = await this.prisma.$transaction([
      this.prisma.feedback.findMany({
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
          reviewedByUser: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      this.prisma.feedback.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách phản hồi thành công',
      data: {
        data: feedbacks.map((f) => ({
          ...new FeedbackResponseDto(f),
          meeting: f.meeting,
          shareholder: f.shareholder,
          reviewedByUser: f.reviewedByUser
        })),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getPublicFeedbacks(page = 1, limit = 10, meetingId = '') {
    const skip = (page - 1) * limit;

    const where: Prisma.FeedbackWhereInput = {
      isPublic: true,
      status: { in: ['RESOLVED', 'PROCESSING'] } // Only show resolved or processing public feedbacks
    };
    
    if (meetingId) {
      where.meetingId = +meetingId;
    }

    const [feedbacks, total] = await this.prisma.$transaction([
      this.prisma.feedback.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          meeting: {
            select: { id: true, meetingCode: true, meetingName: true }
          },
          shareholder: {
            select: { 
              shareholderCode: true, 
              fullName: true 
            } // Limited info for public
          }
        }
      }),
      this.prisma.feedback.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách phản hồi công khai thành công',
      data: {
        data: feedbacks.map((f) => ({
          id: f.id,
          title: f.title,
          content: f.content,
          category: f.category,
          status: f.status,
          createdAt: f.createdAt,
          meeting: f.meeting,
          shareholder: f.shareholder
          // Hide sensitive info for public
        })),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getFeedbacksByMeeting(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const feedbacks = await this.prisma.feedback.findMany({
      where: { meetingId },
      include: {
        shareholder: {
          select: { shareholderCode: true, fullName: true }
        },
        reviewedByUser: {
          select: { name: true, email: true }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return {
      success: true,
      message: 'Lấy danh sách phản hồi theo cuộc họp thành công',
      data: feedbacks.map((f) => ({
        ...new FeedbackResponseDto(f),
        shareholder: f.shareholder,
        reviewedByUser: f.reviewedByUser
      })),
    };
  }

  async getFeedbacksByShareholder(shareholderId: number) {
    const shareholder = await this.prisma.shareholder.findUnique({ where: { id: shareholderId } });
    if (!shareholder) throw new NotFoundException('Cổ đông không tồn tại');

    const feedbacks = await this.prisma.feedback.findMany({
      where: { shareholderId },
      include: {
        meeting: {
          select: { meetingCode: true, meetingName: true, meetingDate: true }
        },
        reviewedByUser: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      message: 'Lấy danh sách phản hồi theo cổ đông thành công',
      data: feedbacks.map((f) => ({
        ...new FeedbackResponseDto(f),
        meeting: f.meeting,
        reviewedByUser: f.reviewedByUser
      })),
    };
  }

  async getFeedbackById(id: number) {
    const feedback = await this.prisma.feedback.findUnique({ 
      where: { id },
      include: {
        meeting: true,
        shareholder: true,
        reviewedByUser: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    if (!feedback) throw new NotFoundException('Phản hồi không tồn tại');
    
    return {
      success: true,
      message: 'Lấy thông tin phản hồi thành công',
      data: {
        ...new FeedbackResponseDto(feedback),
        meeting: feedback.meeting,
        shareholder: feedback.shareholder,
        reviewedByUser: feedback.reviewedByUser
      },
    };
  }

  async updateFeedback(id: number, dto: UpdateFeedbackDto) {
    const feedback = await this.prisma.feedback.findUnique({ where: { id } });
    if (!feedback) throw new NotFoundException('Phản hồi không tồn tại');

    const updated = await this.prisma.feedback.update({ 
      where: { id }, 
      data: dto
    });

    return {
      success: true,
      message: 'Cập nhật phản hồi thành công',
      data: new FeedbackResponseDto(updated),
    };
  }

  async updateFeedbackStatus(id: number, status: string, adminNotes?: string) {
    const validStatuses = ['PENDING', 'UNDER_REVIEW', 'PROCESSING', 'RESOLVED', 'REJECTED', 'ARCHIVED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Trạng thái không hợp lệ');
    }

    const feedback = await this.prisma.feedback.findUnique({ where: { id } });
    if (!feedback) throw new NotFoundException('Phản hồi không tồn tại');

    const updateData: any = { status };
    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    const updated = await this.prisma.feedback.update({ 
      where: { id }, 
      data: updateData
    });

    return {
      success: true,
      message: 'Cập nhật trạng thái phản hồi thành công',
      data: new FeedbackResponseDto(updated),
    };
  }

  async reviewFeedback(id: number, reviewedBy: number, adminNotes?: string) {
    const feedback = await this.prisma.feedback.findUnique({ where: { id } });
    if (!feedback) throw new NotFoundException('Phản hồi không tồn tại');

    // Check if reviewer exists
    const reviewer = await this.prisma.user.findUnique({ where: { id: reviewedBy } });
    if (!reviewer) throw new BadRequestException('Người đánh giá không tồn tại');

    const updated = await this.prisma.feedback.update({ 
      where: { id }, 
      data: { 
        reviewedBy,
        reviewedAt: new Date(),
        status: 'UNDER_REVIEW',
        adminNotes: adminNotes || feedback.adminNotes
      } 
    });

    return {
      success: true,
      message: 'Đánh giá phản hồi thành công',
      data: new FeedbackResponseDto(updated),
    };
  }

  async toggleFeedbackVisibility(id: number) {
    const feedback = await this.prisma.feedback.findUnique({ where: { id } });
    if (!feedback) throw new NotFoundException('Phản hồi không tồn tại');

    const updated = await this.prisma.feedback.update({ 
      where: { id }, 
      data: { isPublic: !feedback.isPublic } 
    });

    return {
      success: true,
      message: `Phản hồi đã được ${updated.isPublic ? 'công khai' : 'ẩn'}`,
      data: new FeedbackResponseDto(updated),
    };
  }

  async deleteFeedback(id: number) {
    const feedback = await this.prisma.feedback.findUnique({ where: { id } });
    if (!feedback) throw new NotFoundException('Phản hồi không tồn tại');

    await this.prisma.feedback.delete({ where: { id } });
    
    return {
      success: true,
      message: 'Xóa phản hồi thành công',
      data: null,
    };
  }

  async getMeetingFeedbackStatistics(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id: meetingId },
      include: {
        feedbacks: true
      }
    });
    
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const statistics = {
      totalFeedbacks: meeting.feedbacks.length,
      pendingFeedbacks: meeting.feedbacks.filter(f => f.status === 'PENDING').length,
      underReviewFeedbacks: meeting.feedbacks.filter(f => f.status === 'UNDER_REVIEW').length,
      processingFeedbacks: meeting.feedbacks.filter(f => f.status === 'PROCESSING').length,
      resolvedFeedbacks: meeting.feedbacks.filter(f => f.status === 'RESOLVED').length,
      rejectedFeedbacks: meeting.feedbacks.filter(f => f.status === 'REJECTED').length,
      publicFeedbacks: meeting.feedbacks.filter(f => f.isPublic).length,
      byCategory: this.groupBy(meeting.feedbacks, 'category'),
      byPriority: this.groupBy(meeting.feedbacks, 'priority'),
      resolutionRate: meeting.feedbacks.length > 0 
        ? ((meeting.feedbacks.filter(f => f.status === 'RESOLVED').length / meeting.feedbacks.length) * 100).toFixed(2)
        : 0
    };

    return {
      success: true,
      message: 'Lấy thống kê phản hồi thành công',
      data: statistics,
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