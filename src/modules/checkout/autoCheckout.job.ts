// src/jobs/autoCheckout.job.ts
import { Cron, CronExpression } from '@nestjs/schedule';
import { Injectable, Logger } from '@nestjs/common';
import { AutoCheckoutService } from './autoCheckout.service';


@Injectable()
export class AutoCheckoutJob {
  private readonly logger = new Logger(AutoCheckoutJob.name);

  // Chạy mỗi 5 phút
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleAutoCheckout() {
    this.logger.log('🔄 Bắt đầu chạy tự động checkout...');
    
    try {
      const result = await AutoCheckoutService.autoCheckoutExpiredAttendances();
      
      // TypeScript giờ đã biết chắc chắn cấu trúc của result
      if (result.success && result.data && result.data.totalCheckedOut > 0) {
        this.logger.log(`✅ Đã tự động checkout ${result.data.totalCheckedOut} người tham dự`);
      } else {
        this.logger.log('ℹ️ Không có người tham dự nào cần tự động checkout');
      }
    } catch (error) {
      this.logger.error('❌ Lỗi khi chạy tự động checkout:', error);
    }
  }

  // Chạy mỗi giờ để log trạng thái
  @Cron(CronExpression.EVERY_HOUR)
  async logAutoCheckoutStatus() {
    this.logger.log('📊 Đang kiểm tra trạng thái tự động checkout...');
  }
}