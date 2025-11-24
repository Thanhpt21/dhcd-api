import { 
  Controller, Get, Post, Body, Param, Put, Delete, 
  Query, ParseIntPipe, UseGuards 
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';


@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  async createNotification(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.createNotification(dto);
  }

  @Get()
  async getNotifications(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('userId') userId = '',
    @Query('shareholderId') shareholderId = '', // ✅ THÊM
    @Query('meetingId') meetingId = '',
    @Query('type') type = '',
    @Query('isRead') isRead = '',
    @Query('isSent') isSent = '',
    @Query('search') search = ''
  ) {
    return this.notificationsService.getNotifications(
      +page, +limit, userId, shareholderId, meetingId, type, isRead, isSent, search
    );
  }

  @Get('user/:userId')
  async getUserNotifications(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('unreadOnly') unreadOnly = 'false'
  ) {
    return this.notificationsService.getUserNotifications(
      userId, +page, +limit, unreadOnly === 'true'
    );
  }

  // ✅ THÊM: Lấy notifications của shareholder
  @Get('shareholder/:shareholderId')
  async getShareholderNotifications(
    @Param('shareholderId', ParseIntPipe) shareholderId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('unreadOnly') unreadOnly = 'false'
  ) {
    return this.notificationsService.getShareholderNotifications(
      shareholderId, +page, +limit, unreadOnly === 'true'
    );
  }

  @Get('meeting/:meetingId')
  async getMeetingNotifications(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.notificationsService.getMeetingNotifications(meetingId);
  }

  @Get(':id')
  async getNotificationById(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.getNotificationById(id);
  }

  @Put(':id')
  async updateNotification(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNotificationDto
  ) {
    return this.notificationsService.updateNotification(id, dto);
  }

  @Delete(':id')
  async deleteNotification(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.deleteNotification(id);
  }

  @Put(':id/read')
  async markAsRead(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.markAsRead(id);
  }

  @Put(':id/unread')
  async markAsUnread(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.markAsUnread(id);
  }

  @Put('user/:userId/read-all')
  async markAllAsRead(@Param('userId', ParseIntPipe) userId: number) {
    return this.notificationsService.markAllAsRead(userId);
  }

  // ✅ THÊM: Đánh dấu tất cả đã đọc cho shareholder
  @Put('shareholder/:shareholderId/read-all')
  async markAllAsReadShareholder(@Param('shareholderId', ParseIntPipe) shareholderId: number) {
    return this.notificationsService.markAllAsReadShareholder(shareholderId);
  }

  @Put(':id/send')
  async markAsSent(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.markAsSent(id);
  }

  @Get('user/:userId/unread-count')
  async getUnreadCount(@Param('userId', ParseIntPipe) userId: number) {
    return this.notificationsService.getUnreadCount(userId);
  }

  // ✅ THÊM: Lấy số notification chưa đọc của shareholder
  @Get('shareholder/:shareholderId/unread-count')
  async getUnreadCountShareholder(@Param('shareholderId', ParseIntPipe) shareholderId: number) {
    return this.notificationsService.getUnreadCountShareholder(shareholderId);
  }

  @Post('batch')
  async createBatchNotifications(@Body() notifications: CreateNotificationDto[]) {
    return this.notificationsService.createBatchNotifications(notifications);
  }
}