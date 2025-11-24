// src/controllers/autoCheckout.controller.ts
import { Controller, Post, Get, Param, ParseIntPipe } from '@nestjs/common'
import { AutoCheckoutService } from './autoCheckout.service'
import { BaseResponseDto } from '../attendance/dto/base-response.dto'

@Controller('auto-checkout')
export class AutoCheckoutController {
  
  @Post('run')
  async runAutoCheckout(): Promise<BaseResponseDto<any>> {
    return await AutoCheckoutService.autoCheckoutExpiredAttendances()
  }

  @Post('meeting/:meetingId')
  async runAutoCheckoutForMeeting(
    @Param('meetingId', ParseIntPipe) meetingId: number
  ): Promise<BaseResponseDto<any>> {
    return await AutoCheckoutService.autoCheckoutForMeeting(meetingId)
  }

  @Get('expiring/:meetingId')
  async getExpiringAttendances(
    @Param('meetingId', ParseIntPipe) meetingId: number
  ): Promise<BaseResponseDto<any>> {
    return await AutoCheckoutService.getExpiringAttendances(meetingId)
  }

  @Get('status/:meetingId')
  async getAutoCheckoutStatus(
    @Param('meetingId', ParseIntPipe) meetingId: number
  ): Promise<BaseResponseDto<any>> {
    const result = await AutoCheckoutService.getExpiringAttendances(meetingId)
    
    if (!result.success) {
      return result
    }

    // ✅ FIX: Kiểm tra result.data tồn tại trước khi destructure
    if (!result.data) {
      return BaseResponseDto.success('Không có dữ liệu điểm danh', {
        meetingDuration: 0,
        warnings: {
          expiringCount: 0,
          expiredCount: 0,
          expiringAttendances: [],
          expiredAttendances: []
        }
      })
    }

    const { expiringAttendances, expiredAttendances, meetingDuration } = result.data

    return BaseResponseDto.success('Trạng thái tự động checkout', {
      meetingDuration,
      warnings: {
        expiringCount: expiringAttendances?.length || 0,
        expiredCount: expiredAttendances?.length || 0,
        expiringAttendances: expiringAttendances?.map((a: any) => ({
          id: a.id,
          shareholderName: a.shareholder?.fullName || 'N/A',
          timeRemaining: a.timeRemaining,
          checkinTime: a.checkinTime
        })) || [],
        expiredAttendances: expiredAttendances?.map((a: any) => ({
          id: a.id,
          shareholderName: a.shareholder?.fullName || 'N/A', 
          timeExceeded: a.timeExceeded,
          checkinTime: a.checkinTime
        })) || []
      }
    })
  }
}