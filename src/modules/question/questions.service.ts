import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionResponseDto } from './dto/question-response.dto';
import { Prisma } from '@prisma/client';
import { QuestionsGateway } from './questions.gateway';

@Injectable()
export class QuestionsService {
  constructor(
    private prisma: PrismaService, 
    private questionsGateway: QuestionsGateway,
  ) {}

async createQuestion(dto: CreateQuestionDto) {
  // Check if meeting exists
  const meeting = await this.prisma.meeting.findUnique({ 
    where: { id: dto.meetingId } 
  });
  if (!meeting) throw new BadRequestException('Cuộc họp không tồn tại');

  // Tìm verification link bằng verificationCode (giống như vote)
  const verificationLink = await this.prisma.verificationLink.findFirst({
    where: { 
      verificationCode: dto.verificationCode,
      meetingId: dto.meetingId
    },
    include: {
      shareholder: true
    }
  });

  if (!verificationLink) {
    throw new BadRequestException('Mã xác thực không tồn tại');
  }

  if (!verificationLink.isUsed) {
    throw new BadRequestException('Mã xác thực chưa được sử dụng. Vui lòng điểm danh trước khi đặt câu hỏi.');
  }

  if (verificationLink.expiresAt < new Date()) {
    throw new BadRequestException('Mã xác thực đã hết hạn');
  }

  const shareholder = verificationLink.shareholder;
  if (!shareholder) {
    throw new BadRequestException('Không tìm thấy thông tin cổ đông');
  }

  // Check if shareholder has registered and attended the meeting
  const registration = await this.prisma.registration.findFirst({
    where: {
      meetingId: dto.meetingId,
      shareholderId: shareholder.id,
      status: { in: ['APPROVED'] }
    }
  });
  if (!registration) throw new BadRequestException('Cổ đông chưa đăng ký hoặc chưa được duyệt tham dự');

  const attendance = await this.prisma.attendance.findUnique({
    where: {
      meetingId_shareholderId: {
        meetingId: dto.meetingId,
        shareholderId: shareholder.id
      }
    }
  });
  if (!attendance) throw new BadRequestException('Cổ đông chưa điểm danh');

  // Check if question code already exists
  const existingCode = await this.prisma.question.findFirst({ 
    where: { questionCode: dto.questionCode } 
  });
  if (existingCode) throw new BadRequestException('Mã câu hỏi đã tồn tại');

  // Start transaction (giống như vote)
  const result = await this.prisma.$transaction(async (prisma) => {
    // Create question
    const question = await prisma.question.create({ 
      data: {
        meetingId: dto.meetingId,
        shareholderId: shareholder.id, // Lấy từ verification
        questionCode: dto.questionCode,
        questionText: dto.questionText,
        questionType: dto.questionType || 'GENERAL',
        priority: dto.priority || 'LOW',
        status: 'PENDING',
        isSelected: dto.isSelected || false
      }
    });

    // Log verification action
    await prisma.verificationLog.create({
      data: {
        verificationId: verificationLink.id,
        action: 'QUESTION_CREATED',
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        success: true,
        errorMessage: null
      }
    });

    return question;
  });

  // Gửi realtime notification
  this.questionsGateway.notifyNewQuestion(dto.meetingId, result);

  return {
    success: true,
    message: 'Tạo câu hỏi thành công, Vui lòng đợi duyệt để hiển thị',
    data: new QuestionResponseDto(result),
  };
}

  async getQuestions(page = 1, limit = 10, meetingId = '', shareholderId = '', status = '', questionType = '', search = '') {
    const skip = (page - 1) * limit;

    const where: Prisma.QuestionWhereInput = {};
    
    if (meetingId) {
      where.meetingId = +meetingId;
    }

    if (shareholderId) {
      where.shareholderId = +shareholderId;
    }

    if (status) {
      where.status = status;
    }

    if (questionType) {
      where.questionType = questionType;
    }

    if (search) {
      where.OR = [
        { questionCode: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { questionText: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { shareholder: { fullName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
      ];
    }

    const [questions, total] = await this.prisma.$transaction([
      this.prisma.question.findMany({
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
          upvotes: {
            select: { shareholderId: true }
          },
          _count: {
            select: {
              upvotes: true
            }
          }
        }
      }),
      this.prisma.question.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách câu hỏi thành công',
      data: {
        data: questions.map((q) => ({
          ...new QuestionResponseDto(q),
          meeting: q.meeting,
          shareholder: q.shareholder,
          upvoteCount: q._count.upvotes,
          hasUpvoted: false // Will be set based on user context if needed
        })),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getQuestionsByMeeting(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const questions = await this.prisma.question.findMany({
      where: { meetingId },
      include: {
        shareholder: {
          select: { shareholderCode: true, fullName: true }
        },
        upvotes: true,
        _count: {
          select: {
            upvotes: true
          }
        }
      },
      orderBy: [
        { isSelected: 'desc' },
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    return {
      success: true,
      message: 'Lấy danh sách câu hỏi theo cuộc họp thành công',
      data: questions.map((q) => ({
        ...new QuestionResponseDto(q),
        shareholder: q.shareholder,
        upvoteCount: q._count.upvotes
      })),
    };
  }

  async getQuestionsByShareholder(shareholderId: number) {
    const shareholder = await this.prisma.shareholder.findUnique({ where: { id: shareholderId } });
    if (!shareholder) throw new NotFoundException('Cổ đông không tồn tại');

    const questions = await this.prisma.question.findMany({
      where: { shareholderId },
      include: {
        meeting: {
          select: { meetingCode: true, meetingName: true, meetingDate: true }
        },
        _count: {
          select: {
            upvotes: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      message: 'Lấy danh sách câu hỏi theo cổ đông thành công',
      data: questions.map((q) => ({
        ...new QuestionResponseDto(q),
        meeting: q.meeting,
        upvoteCount: q._count.upvotes
      })),
    };
  }

  async getQuestionById(id: number) {
    const question = await this.prisma.question.findUnique({ 
      where: { id },
      include: {
        meeting: true,
        shareholder: true,
        upvotes: {
          include: {
            shareholder: {
              select: { shareholderCode: true, fullName: true }
            }
          }
        }
      }
    });
    
    if (!question) throw new NotFoundException('Câu hỏi không tồn tại');
    
    return {
      success: true,
      message: 'Lấy thông tin câu hỏi thành công',
      data: {
        ...new QuestionResponseDto(question),
        meeting: question.meeting,
        shareholder: question.shareholder,
        upvotes: question.upvotes,
        upvoteCount: question.upvotes.length
      },
    };
  }

  async updateQuestion(id: number, dto: UpdateQuestionDto) {
      const question = await this.prisma.question.findUnique({ 
      where: { id },
      include: {
        meeting: true,
        shareholder: true,
        _count: {
          select: { upvotes: true }
        }
      }
    });
    if (!question) throw new NotFoundException('Câu hỏi không tồn tại');

    // If answering the question, set answeredAt
    const updateData: any = { ...dto };
    if (dto.answerText && !question.answerText) {
      updateData.answeredAt = new Date();
      updateData.status = 'ANSWERED';
    }

     const updated = await this.prisma.question.update({ 
      where: { id }, 
      data: updateData,
      include: {
        meeting: true,
        shareholder: true,
        _count: {
          select: { upvotes: true }
        }
      }
    });

       // Gửi realtime notification
    this.questionsGateway.notifyQuestionUpdated(question.meetingId, updated);

    return {
      success: true,
      message: 'Cập nhật câu hỏi thành công',
      data: new QuestionResponseDto(updated),
    };
  }


  async updateQuestionStatus(id: number, status: string) {
    const validStatuses = ['PENDING', 'UNDER_REVIEW', 'ANSWERED', 'REJECTED', 'ARCHIVED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Trạng thái không hợp lệ');
    }

    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Câu hỏi không tồn tại');

    const updated = await this.prisma.question.update({ 
      where: { id }, 
      data: { status } 
    });

    return {
      success: true,
      message: 'Cập nhật trạng thái câu hỏi thành công',
      data: new QuestionResponseDto(updated),
    };
  }

  async answerQuestion(id: number, answerText: string, answeredBy: string) {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Câu hỏi không tồn tại');

    const updated = await this.prisma.question.update({ 
      where: { id }, 
      data: { 
        answerText,
        answeredBy,
        answeredAt: new Date(),
        status: 'ANSWERED'
      } 
    });

    return {
      success: true,
      message: 'Trả lời câu hỏi thành công',
      data: new QuestionResponseDto(updated),
    };
  }

  async toggleQuestionSelection(id: number) {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Câu hỏi không tồn tại');

    const updated = await this.prisma.question.update({ 
      where: { id }, 
      data: { isSelected: !question.isSelected } 
    });

    return {
      success: true,
      message: `Câu hỏi đã được ${updated.isSelected ? 'chọn' : 'bỏ chọn'}`,
      data: new QuestionResponseDto(updated),
    };
  }

  async upvoteQuestion(id: number, shareholderId: number) {
    // Kiểm tra câu hỏi tồn tại
    const question = await this.prisma.question.findUnique({ 
      where: { id },
      include: {
        meeting: true
      }
    });
    
    if (!question) throw new NotFoundException('Câu hỏi không tồn tại');

    const shareholder = await this.prisma.shareholder.findUnique({ where: { id: shareholderId } });
    if (!shareholder) throw new BadRequestException('Cổ đông không tồn tại');

    // Check if already upvoted
    const existingUpvote = await this.prisma.questionUpvote.findUnique({
      where: {
        questionId_shareholderId: {
          questionId: id,
          shareholderId: shareholderId
        }
      }
    });

    let upvoted: boolean;

    if (existingUpvote) {
      // Remove upvote
      await this.prisma.questionUpvote.delete({
        where: {
          questionId_shareholderId: {
            questionId: id,
            shareholderId: shareholderId
          }
        }
      });
      
      upvoted = false;
    } else {
      // Add upvote
      await this.prisma.questionUpvote.create({
        data: {
          questionId: id,
          shareholderId: shareholderId
        }
      });
      
      upvoted = true;
    }

    // Get updated count - cách an toàn nhất
    const upvoteCount = await this.prisma.questionUpvote.count({
      where: { questionId: id }
    });

    // Gửi realtime notification
    this.questionsGateway.notifyQuestionUpvoted(question.meetingId, id, upvoteCount);

    return {
      success: true,
      message: upvoted ? 'Đã upvote câu hỏi' : 'Đã bỏ upvote câu hỏi',
      data: { upvoted, upvoteCount }
    };
  }

  async deleteQuestion(id: number) {
     const question = await this.prisma.question.findUnique({ 
      where: { id },
      include: {
        meeting: true
      }
    });
    if (!question) throw new NotFoundException('Câu hỏi không tồn tại');

    const meetingId = question.meetingId;

    await this.prisma.question.delete({ where: { id } });

    // Gửi realtime notification
    this.questionsGateway.notifyQuestionDeleted(meetingId, id);
    
    
    return {
      success: true,
      message: 'Xóa câu hỏi thành công',
      data: null,
    };
  }

  async getMeetingQuestionStatistics(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id: meetingId },
      include: {
        questions: {
          include: {
            _count: {
              select: {
                upvotes: true
              }
            }
          }
        }
      }
    });
    
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const statistics = {
      totalQuestions: meeting.questions.length,
      pendingQuestions: meeting.questions.filter(q => q.status === 'PENDING').length,
      answeredQuestions: meeting.questions.filter(q => q.status === 'ANSWERED').length,
      selectedQuestions: meeting.questions.filter(q => q.isSelected).length,
      totalUpvotes: meeting.questions.reduce((sum, q) => sum + q._count.upvotes, 0),
      byQuestionType: this.groupBy(meeting.questions, 'questionType'),
      byPriority: this.groupBy(meeting.questions, 'priority'),
      topQuestions: meeting.questions
        .sort((a, b) => b._count.upvotes - a._count.upvotes)
        .slice(0, 5)
        .map(q => ({
          id: q.id,
          questionText: q.questionText,
          upvoteCount: q._count.upvotes,
          status: q.status
        }))
    };

    return {
      success: true,
      message: 'Lấy thống kê câu hỏi thành công',
      data: statistics,
    };
  }

  async getTopUpvotedQuestions(meetingId?: number, limit = 5) {
    const where: Prisma.QuestionWhereInput = {};
    
    if (meetingId) {
      where.meetingId = meetingId;
      
      // Verify meeting exists
      const meeting = await this.prisma.meeting.findUnique({
        where: { id: meetingId }
      });
      if (!meeting) {
        throw new NotFoundException('Cuộc họp không tồn tại');
      }
    }

    const questions = await this.prisma.question.findMany({
      where,
      include: {
        meeting: {
          select: { id: true, meetingCode: true, meetingName: true }
        },
        shareholder: {
          select: { id: true, shareholderCode: true, fullName: true, email: true }
        },
        _count: {
          select: {
            upvotes: true
          }
        }
      },
      orderBy: {
        upvotes: {
          _count: 'desc'
        }
      },
      take: limit
    });

    return {
      success: true,
      message: `Lấy top ${limit} câu hỏi được upvote nhiều nhất thành công`,
      data: questions.map((q) => ({
        ...new QuestionResponseDto(q),
        meeting: q.meeting,
        shareholder: q.shareholder,
        upvoteCount: q._count.upvotes
      })),
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