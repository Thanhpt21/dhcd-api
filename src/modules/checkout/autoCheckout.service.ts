// src/services/autoCheckout.service.ts
import { PrismaClient } from '@prisma/client'

import { 
  AutoCheckoutResultDto, 
  AutoCheckoutStatusDto 
} from '../attendance/dto/auto-checkout.dto'
import { BaseResponseDto } from '../attendance/dto/base-response.dto';

const prisma = new PrismaClient()

// Định nghĩa type cho attendance data
interface AttendanceData {
  id: number;
  meetingId: number;
  shareholderId: number;
  checkinTime: Date;
  checkoutTime: Date | null;
  checkinMethod: string;
  notes?: string | null;
  createdAt: Date;
  shareholder: {
    id: number;
    shareholderCode: string;
    fullName: string;
    email: string;
    totalShares: number;
  };
}

export class AutoCheckoutService {
  /**
   * Tự động checkout những người tham dự đã vượt quá thời lượng cuộc họp
   */
  static async autoCheckoutExpiredAttendances(): Promise<BaseResponseDto<AutoCheckoutResultDto>> {
    try {
      const meetingsWithDuration = await prisma.meeting.findMany({
        where: {
          meetingSettings: {
            some: {
              key: 'MEETING_DURATION',
              isActive: true
            }
          },
          attendances: {
            some: {
              checkoutTime: null
            }
          }
        },
        include: {
          meetingSettings: {
            where: {
              key: 'MEETING_DURATION',
              isActive: true
            }
          },
          attendances: {
            where: {
              checkoutTime: null
            },
            include: {
              shareholder: {
                select: {
                  id: true,
                  shareholderCode: true,
                  fullName: true,
                  email: true,
                  totalShares: true
                }
              }
            }
          }
        }
      });

      let totalCheckedOut = 0;
      const checkedOutAttendances: AttendanceData[] = [];

      for (const meeting of meetingsWithDuration) {
        const durationSetting = meeting.meetingSettings.find(setting => 
          setting.key === 'MEETING_DURATION'
        );
        
        if (!durationSetting) continue;

        const meetingDuration = parseInt(durationSetting.value);
        const checkoutThreshold = meetingDuration * 60 * 1000;

        for (const attendance of meeting.attendances) {
          const checkinTime = new Date(attendance.checkinTime).getTime();
          const currentTime = new Date().getTime();
          const timeInMeeting = currentTime - checkinTime;

          if (timeInMeeting > checkoutThreshold) {
            const updatedAttendance = await prisma.attendance.update({
              where: { id: attendance.id },
              data: { 
                checkoutTime: new Date(),
                notes: `Tự động checkout sau ${meetingDuration} phút theo cài đặt cuộc họp` 
              },
              include: {
                shareholder: {
                  select: {
                    id: true,
                    shareholderCode: true,
                    fullName: true,
                    email: true,
                    totalShares: true
                  }
                }
              }
            });
            
            checkedOutAttendances.push(updatedAttendance as AttendanceData);
            totalCheckedOut++;
          }
        }
      }

      const result = new AutoCheckoutResultDto(totalCheckedOut, checkedOutAttendances);
      return BaseResponseDto.success(
        `Đã tự động checkout ${totalCheckedOut} người tham dự`,
        result
      );
    } catch (error) {
      console.error('❌ Lỗi tự động checkout:', error);
      return BaseResponseDto.error<AutoCheckoutResultDto>(
        'Lỗi tự động checkout',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Kiểm tra và tự động checkout cho một cuộc họp cụ thể
   */
  static async autoCheckoutForMeeting(meetingId: number): Promise<BaseResponseDto<AutoCheckoutResultDto>> {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          meetingSettings: {
            where: {
              key: 'MEETING_DURATION',
              isActive: true
            }
          },
          attendances: {
            where: {
              checkoutTime: null
            },
            include: {
              shareholder: {
                select: {
                  id: true,
                  shareholderCode: true,
                  fullName: true,
                  email: true,
                  totalShares: true
                }
              }
            }
          }
        }
      })

      if (!meeting) {
        return BaseResponseDto.error<AutoCheckoutResultDto>('Cuộc họp không tồn tại');
      }

      const durationSetting = meeting.meetingSettings.find(setting => 
        setting.key === 'MEETING_DURATION'
      )
      
      if (!durationSetting) {
        return BaseResponseDto.error<AutoCheckoutResultDto>('Cuộc họp không có cài đặt thời lượng');
      }

      const meetingDuration = parseInt(durationSetting.value)
      const checkoutThreshold = meetingDuration * 60 * 1000
      let totalCheckedOut = 0
      const checkedOutAttendances: AttendanceData[] = []

      for (const attendance of meeting.attendances) {
        const checkinTime = new Date(attendance.checkinTime).getTime()
        const currentTime = new Date().getTime()
        const timeInMeeting = currentTime - checkinTime

        if (timeInMeeting > checkoutThreshold) {
          const updatedAttendance = await prisma.attendance.update({
            where: { id: attendance.id },
            data: { 
              checkoutTime: new Date(),
              notes: `Tự động checkout sau ${meetingDuration} phút theo cài đặt cuộc họp` 
            },
            include: {
              shareholder: {
                select: {
                  id: true,
                  shareholderCode: true,
                  fullName: true,
                  email: true,
                  totalShares: true
                }
              }
            }
          })
          
          checkedOutAttendances.push(updatedAttendance as AttendanceData)
          totalCheckedOut++
        }
      }

      const result = new AutoCheckoutResultDto(totalCheckedOut, checkedOutAttendances);
      return BaseResponseDto.success(
        `Đã tự động checkout ${totalCheckedOut} người tham dự cho cuộc họp ${meeting.meetingName}`,
        result
      );
    } catch (error) {
      console.error('❌ Lỗi tự động checkout cho cuộc họp:', error)
      return BaseResponseDto.error<AutoCheckoutResultDto>(
        'Lỗi tự động checkout',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  /**
   * Lấy danh sách người tham dự sắp hết thời gian
   */
  static async getExpiringAttendances(
    meetingId: number, 
    warningThresholdMinutes = 15
  ): Promise<BaseResponseDto<AutoCheckoutStatusDto>> {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          meetingSettings: {
            where: {
              key: 'MEETING_DURATION',
              isActive: true
            }
          },
          attendances: {
            where: {
              checkoutTime: null
            },
            include: {
              shareholder: {
                select: {
                  id: true,
                  shareholderCode: true,
                  fullName: true,
                  email: true,
                  totalShares: true
                }
              }
            }
          }
        }
      })

      if (!meeting) {
        return BaseResponseDto.error<AutoCheckoutStatusDto>('Cuộc họp không tồn tại');
      }

      const durationSetting = meeting.meetingSettings.find(setting => 
        setting.key === 'MEETING_DURATION'
      )
      
      if (!durationSetting) {
        return BaseResponseDto.error<AutoCheckoutStatusDto>('Cuộc họp không có cài đặt thời lượng');
      }

      const meetingDuration = parseInt(durationSetting.value)
      const warningThreshold = warningThresholdMinutes * 60 * 1000
      const checkoutThreshold = meetingDuration * 60 * 1000

      const expiringAttendances: any[] = []
      const expiredAttendances: any[] = []

      for (const attendance of meeting.attendances) {
        const checkinTime = new Date(attendance.checkinTime).getTime()
        const currentTime = new Date().getTime()
        const timeInMeeting = currentTime - checkinTime
        const timeRemaining = checkoutThreshold - timeInMeeting

        if (timeInMeeting > checkoutThreshold) {
          expiredAttendances.push({
            ...attendance,
            status: 'EXPIRED',
            timeExceeded: Math.floor((timeInMeeting - checkoutThreshold) / 60000)
          })
        } else if (timeRemaining <= warningThreshold) {
          expiringAttendances.push({
            ...attendance,
            status: 'WARNING',
            timeRemaining: Math.floor(timeRemaining / 60000)
          })
        }
      }

      const result = new AutoCheckoutStatusDto(
        meetingDuration,
        expiringAttendances,
        expiredAttendances
      );

      return BaseResponseDto.success('Lấy danh sách thành công', result);
    } catch (error) {
      console.error('❌ Lỗi lấy danh sách người tham dự sắp hết hạn:', error)
      return BaseResponseDto.error<AutoCheckoutStatusDto>(
        'Lỗi lấy danh sách',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }
}