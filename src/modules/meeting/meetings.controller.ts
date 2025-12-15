import { 
  Controller, Get, Post, Body, Param, Delete, Put, Query, 
  ParseIntPipe, UseGuards, Patch, UseInterceptors, UploadedFile, 
  Res, Response 
} from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  
  @Get(':id/shareholder/all')
  async getAllMeetingShareholders(
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('registrationType') registrationType?: string
  ) {
    return this.meetingsService.getAllMeetingShareholders(
      +id, 
      search || '', 
      status || '',
      registrationType || ''
    );
  }


  @Post()
  async createMeeting(@Body() dto: CreateMeetingDto) {
    return this.meetingsService.createMeeting(dto);
  }

   @Post('auto-update-status')
  async manualUpdateMeetingStatus() {
    await this.meetingsService.manualUpdateMeetingStatus();
    return {
      success: true,
      message: 'Đã chạy cập nhật trạng thái meeting tự động'
    };
  }


  @Get(':id/real-time-status')
  async getMeetingWithRealTimeStatus(@Param('id', ParseIntPipe) id: number) {
    return await this.meetingsService.getMeetingWithRealTimeStatus(id);
  }

  @Get()
  async getMeetings(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search = '',
    @Query('status') status = ''
  ) {
    return this.meetingsService.getMeetings(+page, +limit, search, status);
  }


  @Get('all/list')
  async getAllMeetings(@Query('search') search = '', @Query('status') status = '') {
    return this.meetingsService.getAllMeetings(search, status);
  }

  @Get(':id')
  async getMeetingById(@Param('id', ParseIntPipe) id: number) {
    return this.meetingsService.getMeetingById(id);
  }

  @Put(':id')
  async updateMeeting(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMeetingDto) {
    return this.meetingsService.updateMeeting(id, dto);
  }

  @Patch(':id/status')
  async updateMeetingStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string
  ) {
    return this.meetingsService.updateMeetingStatus(id, status);
  }

  @Delete(':id')
  async deleteMeeting(@Param('id', ParseIntPipe) id: number) {
    return this.meetingsService.deleteMeeting(id);
  }

  @Get(':id/statistics')
  async getMeetingStatistics(@Param('id', ParseIntPipe) id: number) {
    return this.meetingsService.getMeetingStatistics(id);
  }

}