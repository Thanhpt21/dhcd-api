// src/email/email.controller.ts
import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  Query, 
  UseGuards,
  ParseIntPipe 
} from '@nestjs/common';
import { EmailService } from './email.service';
import { SendEmailDto, SendBulkEmailDto } from './dto/send-email.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('email')
@UseGuards(JwtAuthGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  async sendEmail(@Body() dto: SendEmailDto) {
    return this.emailService.sendEmail(dto);
  }

  @Post('send-bulk')
  async sendBulkEmail(@Body() dto: SendBulkEmailDto) {
    return this.emailService.sendBulkEmail(dto);
  }

  @Post('send-verification')
  async sendVerificationEmail(
    @Body() data: { shareholderId: number; verificationCode: string; meetingId: number }
  ) {
    return this.emailService.sendVerificationEmail(
      data.shareholderId, 
      data.verificationCode, 
      data.meetingId
    );
  }

  @Post('send-batch-verifications')
  async sendBatchVerificationEmails(
    @Body() data: { meetingId: number; shareholderIds: number[]; verificationType: string }
  ) {
    return this.emailService.sendBatchVerificationEmails(
      data.meetingId,
      data.shareholderIds,
      data.verificationType
    );
  }

  @Get('logs')
  async getEmailLogs(
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('shareholderId') shareholderId?: number,
    @Query('meetingId') meetingId?: number
  ) {
    return this.emailService.getEmailLogs(page, limit, shareholderId, meetingId);
  }
}