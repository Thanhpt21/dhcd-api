import { 
  Controller, Get, Post, Body, Param, Put, Delete, 
  Query, ParseIntPipe, UseGuards 
} from '@nestjs/common';
import { MeetingMinutesService } from './meeting-minutes.service';
import { CreateMeetingMinuteDto } from './dto/create-meeting-minute.dto';
import { UpdateMeetingMinuteDto } from './dto/update-meeting-minute.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';


@Controller('meeting-minutes')
@UseGuards(JwtAuthGuard)
export class MeetingMinutesController {
  constructor(private readonly meetingMinutesService: MeetingMinutesService) {}

  @Post()
  async createMeetingMinute(@Body() dto: CreateMeetingMinuteDto) {
    return this.meetingMinutesService.createMeetingMinute(dto);
  }

  @Get()
  async getMeetingMinutes(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('meetingId') meetingId = '',
    @Query('status') status = '',
    @Query('createdBy') createdBy = '',
    @Query('search') search = ''
  ) {
    return this.meetingMinutesService.getMeetingMinutes(
      +page, +limit, meetingId, status, createdBy, search
    );
  }

  @Get('meeting/:meetingId')
  async getMeetingMinutesByMeeting(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.meetingMinutesService.getMeetingMinutesByMeeting(meetingId);
  }

  @Get('user/:userId')
  async getMeetingMinutesByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.meetingMinutesService.getMeetingMinutesByUser(userId);
  }

  @Get(':id')
  async getMeetingMinuteById(@Param('id', ParseIntPipe) id: number) {
    return this.meetingMinutesService.getMeetingMinuteById(id);
  }

  @Put(':id')
  async updateMeetingMinute(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMeetingMinuteDto
  ) {
    return this.meetingMinutesService.updateMeetingMinute(id, dto);
  }

  @Delete(':id')
  async deleteMeetingMinute(@Param('id', ParseIntPipe) id: number) {
    return this.meetingMinutesService.deleteMeetingMinute(id);
  }

  @Put(':id/approve')
  async approveMeetingMinute(
    @Param('id', ParseIntPipe) id: number,
    @Body('approvedBy') approvedBy: number
  ) {
    return this.meetingMinutesService.approveMeetingMinute(id, approvedBy);
  }

  @Put(':id/reject')
  async rejectMeetingMinute(@Param('id', ParseIntPipe) id: number) {
    return this.meetingMinutesService.rejectMeetingMinute(id);
  }

  @Put(':id/submit')
  async submitForApproval(@Param('id', ParseIntPipe) id: number) {
    return this.meetingMinutesService.submitForApproval(id);
  }

  @Get('meeting/:meetingId/latest')
  async getLatestMeetingMinute(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.meetingMinutesService.getLatestMeetingMinute(meetingId);
  }

  @Post(':id/version')
  async createNewVersion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMeetingMinuteDto
  ) {
    return this.meetingMinutesService.createNewVersion(id, dto);
  }
}