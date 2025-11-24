import { 
  Controller, Get, Post, Body, Param, Delete, Put, Query, 
  ParseIntPipe, UseGuards, Patch 
} from '@nestjs/common';
import { VerificationLinksService } from './verification-links.service';
import { CreateVerificationLinkDto } from './dto/create-verification-link.dto';
import { VerifyLinkDto } from './dto/verify-link.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('verification-links')
@UseGuards(JwtAuthGuard)
export class VerificationLinksController {
  constructor(private readonly verificationLinksService: VerificationLinksService) {}

  @Post()
  async createVerificationLink(@Body() dto: CreateVerificationLinkDto) {
    return this.verificationLinksService.createVerificationLink(dto);
  }

  @Post('generate/batch')
  async generateBatchVerificationLinks(
    @Body() data: { meetingId: number; shareholderIds: number[]; verificationType: string; expiresInHours: number }
  ) {
    return this.verificationLinksService.generateBatchVerificationLinks(
      data.meetingId,
      data.shareholderIds,
      data.verificationType,
      data.expiresInHours
    );
  }

  @Post('verify')
  async verifyLink(@Body() dto: VerifyLinkDto) {
    return this.verificationLinksService.verifyLink(dto);
  }

  @Post('verify/:code/meetings/:meetingId')
  async verifyLinkWithMeetingId(
    @Param('code') code: string,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Body() dto: VerifyLinkDto
  ) {
    return this.verificationLinksService.verifyLinkWithMeetingId(code, meetingId, dto);
  }

  @Get('code/:code/meetings/:meetingId')
  async getVerificationLinkByCodeWithMeeting(
    @Param('code') code: string,
    @Param('meetingId', ParseIntPipe) meetingId: number
  ) {
    return this.verificationLinksService.getVerificationLinkByCodeWithMeeting(code, meetingId);
  }

  @Get()
  async getVerificationLinks(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('meetingId') meetingId = '',
    @Query('shareholderId') shareholderId = '',
    @Query('verificationType') verificationType = '',
    @Query('isUsed') isUsed = '',
    @Query('search') search = '',
     @Query('emailSent') emailSent = '',
  ) {
    return this.verificationLinksService.getVerificationLinks(+page, +limit, meetingId, shareholderId, verificationType, isUsed, search, emailSent);
  }

  @Get('meeting/:meetingId')
  async getVerificationLinksByMeeting(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.verificationLinksService.getVerificationLinksByMeeting(meetingId);
  }

  @Get('shareholder/:shareholderId')
  async getVerificationLinksByShareholder(@Param('shareholderId', ParseIntPipe) shareholderId: number) {
    return this.verificationLinksService.getVerificationLinksByShareholder(shareholderId);
  }

  @Get('code/:verificationCode')
  async getVerificationLinkByCode(@Param('verificationCode') verificationCode: string) {
    return this.verificationLinksService.getVerificationLinkByCode(verificationCode);
  }

  @Get(':id')
  async getVerificationLinkById(@Param('id', ParseIntPipe) id: number) {
    return this.verificationLinksService.getVerificationLinkById(id);
  }

  @Put(':id')
  async updateVerificationLink(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateVerificationLinkDto) {
    return this.verificationLinksService.updateVerificationLink(id, dto);
  }

  @Put(':id/expiry')
  async updateVerificationLinkExpiry(
    @Param('id', ParseIntPipe) id: number,
    @Body('expiresAt') expiresAt: string
  ) {
    return this.verificationLinksService.updateVerificationLinkExpiry(id, expiresAt);
  }

  @Put(':id/revoke')
  async revokeVerificationLink(@Param('id', ParseIntPipe) id: number) {
    return this.verificationLinksService.revokeVerificationLink(id);
  }

  @Delete(':id')
  async deleteVerificationLink(@Param('id', ParseIntPipe) id: number) {
    return this.verificationLinksService.deleteVerificationLink(id);
  }

  @Get('meeting/:meetingId/statistics')
  async getMeetingVerificationStatistics(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.verificationLinksService.getMeetingVerificationStatistics(meetingId);
  }

  @Get('qr/generate/:verificationCode')
  async generateQRCode(@Param('verificationCode') verificationCode: string) {
    return this.verificationLinksService.generateQRCode(verificationCode);
  }

  @Post(':id/send-email')
  @UseGuards(JwtAuthGuard)
  async sendVerificationEmail(@Param('id', ParseIntPipe) id: number) {
    return this.verificationLinksService.sendVerificationEmail(id);
  }

  @Post('send-batch-emails')
  @UseGuards(JwtAuthGuard)
  async sendBatchVerificationEmails(
    @Body() data: { 
      meetingId: number; 
      shareholderIds: number[]; 
      verificationType: string;
    }
  ) {
    return this.verificationLinksService.sendBatchVerificationEmails(
      data.meetingId,
      data.shareholderIds,
      data.verificationType
    );
  }

  @Post(':id/resend-email')
  @UseGuards(JwtAuthGuard)
  async resendVerificationEmail(@Param('id', ParseIntPipe) id: number) {
    return this.verificationLinksService.resendVerificationEmail(id);
  }

  @Post('send-verification-success')
  @UseGuards(JwtAuthGuard)
  async sendVerificationSuccessEmail(@Body() data: { verificationCode: string }) {
    return this.verificationLinksService.sendVerificationSuccessEmail(data.verificationCode);
  }

  @Get('email-statistics/:meetingId')
  @UseGuards(JwtAuthGuard)
  async getEmailStatistics(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.verificationLinksService.getEmailStatistics(meetingId);
  }
}