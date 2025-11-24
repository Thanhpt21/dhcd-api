import { 
  Controller, Get, Post, Body, Param, Delete, Put, Query, 
  ParseIntPipe, UseGuards, Patch 
} from '@nestjs/common';
import { FeedbacksService } from './feedbacks.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('feedbacks')
@UseGuards(JwtAuthGuard)
export class FeedbacksController {
  constructor(private readonly feedbacksService: FeedbacksService) {}

  @Post()
  async createFeedback(@Body() dto: CreateFeedbackDto) {
    return this.feedbacksService.createFeedback(dto);
  }

  @Get()
  async getFeedbacks(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('meetingId') meetingId = '',
    @Query('shareholderId') shareholderId = '',
    @Query('status') status = '',
    @Query('category') category = '',
    @Query('isPublic') isPublic = '',
    @Query('search') search = ''
  ) {
    return this.feedbacksService.getFeedbacks(+page, +limit, meetingId, shareholderId, status, category, isPublic, search);
  }

  @Get('public')
  async getPublicFeedbacks(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('meetingId') meetingId = ''
  ) {
    return this.feedbacksService.getPublicFeedbacks(+page, +limit, meetingId);
  }

  @Get('meeting/:meetingId')
  async getFeedbacksByMeeting(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.feedbacksService.getFeedbacksByMeeting(meetingId);
  }

  @Get('shareholder/:shareholderId')
  async getFeedbacksByShareholder(@Param('shareholderId', ParseIntPipe) shareholderId: number) {
    return this.feedbacksService.getFeedbacksByShareholder(shareholderId);
  }

  @Get(':id')
  async getFeedbackById(@Param('id', ParseIntPipe) id: number) {
    return this.feedbacksService.getFeedbackById(id);
  }

  @Put(':id')
  async updateFeedback(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFeedbackDto) {
    return this.feedbacksService.updateFeedback(id, dto);
  }

  @Put(':id/status')
  async updateFeedbackStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
    @Body('adminNotes') adminNotes?: string
  ) {
    return this.feedbacksService.updateFeedbackStatus(id, status, adminNotes);
  }

  @Put(':id/review')
  async reviewFeedback(
    @Param('id', ParseIntPipe) id: number,
    @Body('reviewedBy') reviewedBy: number,
    @Body('adminNotes') adminNotes?: string
  ) {
    return this.feedbacksService.reviewFeedback(id, reviewedBy, adminNotes);
  }

  @Put(':id/visibility')
  async toggleFeedbackVisibility(@Param('id', ParseIntPipe) id: number) {
    return this.feedbacksService.toggleFeedbackVisibility(id);
  }

  @Delete(':id')
  async deleteFeedback(@Param('id', ParseIntPipe) id: number) {
    return this.feedbacksService.deleteFeedback(id);
  }

  @Get('meeting/:meetingId/statistics')
  async getMeetingFeedbackStatistics(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.feedbacksService.getMeetingFeedbackStatistics(meetingId);
  }
}