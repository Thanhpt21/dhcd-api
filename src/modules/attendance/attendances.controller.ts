import { 
  Controller, Get, Post, Body, Param, Delete, Put, Query, 
  ParseIntPipe, UseGuards, Patch, 
  Res
} from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('attendances')
@UseGuards(JwtAuthGuard)
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  @Post()
  async createAttendance(@Body() dto: CreateAttendanceDto) {
    return this.attendancesService.createAttendance(dto);
  }

  @Get()
  async getAttendances(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('meetingId') meetingId = '',
    @Query('shareholderId') shareholderId = '',
    @Query('search') search = ''
  ) {
    return this.attendancesService.getAttendances(+page, +limit, meetingId, shareholderId, search);
  }

  @Get('meeting/:meetingId')
  async getAttendancesByMeeting(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.attendancesService.getAttendancesByMeeting(meetingId);
  }

  @Get('shareholder/:shareholderId')
  async getAttendancesByShareholder(@Param('shareholderId', ParseIntPipe) shareholderId: number) {
    return this.attendancesService.getAttendancesByShareholder(shareholderId);
  }

  @Get(':id')
  async getAttendanceById(@Param('id', ParseIntPipe) id: number) {
    return this.attendancesService.getAttendanceById(id);
  }

  @Put(':id')
  async updateAttendance(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAttendanceDto) {
    return this.attendancesService.updateAttendance(id, dto);
  }

  @Put(':id/checkout')
  async checkoutAttendance(@Param('id', ParseIntPipe) id: number) {
    return this.attendancesService.checkoutAttendance(id);
  }

  @Delete(':id')
  async deleteAttendance(@Param('id', ParseIntPipe) id: number) {
    return this.attendancesService.deleteAttendance(id);
  }

  @Get('meeting/:meetingId/statistics')
  async getMeetingAttendanceStatistics(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.attendancesService.getMeetingAttendanceStatistics(meetingId);
  }

  @Get('export/meeting/:meetingId')
  async exportAttendances(@Param('meetingId', ParseIntPipe) meetingId: number, @Res() res: any) {
    return this.attendancesService.exportAttendances(res, meetingId);
  }
}