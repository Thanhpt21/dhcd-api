import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateMeetingSettingDto, DataType } from './dto/create-meeting-setting.dto';
import { UpdateMeetingSettingDto } from './dto/update-meeting-setting.dto';
import { MeetingSettingResponseDto } from './dto/meeting-setting-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MeetingSettingsService {
  constructor(private prisma: PrismaService) {}

  async createMeetingSetting(dto: CreateMeetingSettingDto) {
    // Check if meeting exists
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id: dto.meetingId } 
    });
    if (!meeting) throw new BadRequestException('Cuộc họp không tồn tại');

    // Check if setting key already exists for this meeting
    const existingSetting = await this.prisma.meetingSetting.findUnique({
      where: { 
        meetingId_key: { 
          meetingId: dto.meetingId, 
          key: dto.key 
        } 
      }
    });
    if (existingSetting) throw new BadRequestException('Cài đặt với key này đã tồn tại cho cuộc họp');

    const meetingSetting = await this.prisma.meetingSetting.create({
      data: {
        meetingId: dto.meetingId,
        key: dto.key,
        value: dto.value,
        dataType: dto.dataType || DataType.STRING,
        description: dto.description,
        isActive: dto.isActive ?? true
      }
    });

    return {
      success: true,
      message: 'Tạo cài đặt cuộc họp thành công',
      data: new MeetingSettingResponseDto(meetingSetting),
    };
  }

  async getMeetingSettings(page = 1, limit = 10, meetingId = '', isActive = '', search = '') {
    const skip = (page - 1) * limit;

    const where: Prisma.MeetingSettingWhereInput = {};
    
    if (meetingId) {
      where.meetingId = +meetingId;
    }

    if (isActive !== '') {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { key: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { value: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    const [settings, total] = await this.prisma.$transaction([
      this.prisma.meetingSetting.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          meeting: {
            select: { id: true, meetingCode: true, meetingName: true }
          }
        }
      }),
      this.prisma.meetingSetting.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách cài đặt thành công',
      data: {
        data: settings.map(setting => ({
          ...new MeetingSettingResponseDto(setting),
          meeting: setting.meeting
        })),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getMeetingSettingsByMeeting(meetingId: number) {
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id: meetingId } 
    });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const settings = await this.prisma.meetingSetting.findMany({
      where: { meetingId },
      orderBy: { key: 'asc' }
    });

    return {
      success: true,
      message: 'Lấy danh sách cài đặt theo cuộc họp thành công',
      data: settings.map(setting => new MeetingSettingResponseDto(setting)),
    };
  }

  async getMeetingSettingByKey(meetingId: number, key: string) {
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id: meetingId } 
    });
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const setting = await this.prisma.meetingSetting.findUnique({
      where: { 
        meetingId_key: { 
          meetingId, 
          key 
        } 
      }
    });

    if (!setting) {
      return {
        success: true,
        message: 'Không tìm thấy cài đặt',
        data: null,
      };
    }

    return {
      success: true,
      message: 'Lấy cài đặt thành công',
      data: new MeetingSettingResponseDto(setting),
    };
  }

  async getMeetingSettingById(id: number) {
    const setting = await this.prisma.meetingSetting.findUnique({ 
      where: { id },
      include: {
        meeting: {
          select: { id: true, meetingCode: true, meetingName: true }
        }
      }
    });
    
    if (!setting) throw new NotFoundException('Cài đặt không tồn tại');
    
    return {
      success: true,
      message: 'Lấy thông tin cài đặt thành công',
      data: {
        ...new MeetingSettingResponseDto(setting),
        meeting: setting.meeting
      },
    };
  }

  async updateMeetingSetting(id: number, dto: UpdateMeetingSettingDto) {
    const setting = await this.prisma.meetingSetting.findUnique({ 
      where: { id } 
    });
    if (!setting) throw new NotFoundException('Cài đặt không tồn tại');

    // Check unique key if changing
    if (dto.key && dto.key !== setting.key) {
      const existing = await this.prisma.meetingSetting.findUnique({
        where: { 
          meetingId_key: { 
            meetingId: dto.meetingId || setting.meetingId, 
            key: dto.key 
          } 
        }
      });
      if (existing) throw new BadRequestException('Key cài đặt đã tồn tại');
    }

    const updated = await this.prisma.meetingSetting.update({
      where: { id },
      data: dto
    });

    return {
      success: true,
      message: 'Cập nhật cài đặt thành công',
      data: new MeetingSettingResponseDto(updated),
    };
  }

  async deleteMeetingSetting(id: number) {
    const setting = await this.prisma.meetingSetting.findUnique({ 
      where: { id } 
    });
    if (!setting) throw new NotFoundException('Cài đặt không tồn tại');

    await this.prisma.meetingSetting.delete({ where: { id } });
    
    return {
      success: true,
      message: 'Xóa cài đặt thành công',
      data: null,
    };
  }

  async toggleActive(id: number) {
    const setting = await this.prisma.meetingSetting.findUnique({ 
      where: { id } 
    });
    if (!setting) throw new NotFoundException('Cài đặt không tồn tại');

    const updated = await this.prisma.meetingSetting.update({
      where: { id },
      data: { isActive: !setting.isActive }
    });

    return {
      success: true,
      message: `Cài đặt đã được ${updated.isActive ? 'kích hoạt' : 'vô hiệu hóa'}`,
      data: new MeetingSettingResponseDto(updated),
    };
  }

  async createBatchSettings(meetingId: number, settings: CreateMeetingSettingDto[]) {
    const meeting = await this.prisma.meeting.findUnique({ 
      where: { id: meetingId } 
    });
    if (!meeting) throw new BadRequestException('Cuộc họp không tồn tại');

    const results = {
      total: settings.length,
      success: 0,
      errors: [] as string[],
      createdSettings: [] as any[]
    };

    for (const settingData of settings) {
      try {
        const existing = await this.prisma.meetingSetting.findUnique({
          where: { 
            meetingId_key: { 
              meetingId, 
              key: settingData.key 
            } 
          }
        });

        if (existing) {
          results.errors.push(`Key "${settingData.key}" đã tồn tại`);
          continue;
        }

        const setting = await this.prisma.meetingSetting.create({
          data: {
            meetingId,
            key: settingData.key,
            value: settingData.value,
            dataType: settingData.dataType || DataType.STRING,
            description: settingData.description,
            isActive: settingData.isActive ?? true
          }
        });

        results.success++;
        results.createdSettings.push(new MeetingSettingResponseDto(setting));

      } catch (error) {
        results.errors.push(`Key "${settingData.key}": ${error.message}`);
      }
    }

    return {
      success: true,
      message: `Tạo hàng loạt thành công: ${results.success}/${results.total}`,
      data: results
    };
  }
}