import { 
  Controller, Get, Post, Body, Param, Put, Delete, 
  Query, ParseIntPipe, UseGuards, HttpStatus 
} from '@nestjs/common';
import { MeetingSettingsService } from './meeting-settings.service';
import { CreateMeetingSettingDto } from './dto/create-meeting-setting.dto';
import { UpdateMeetingSettingDto } from './dto/update-meeting-setting.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';


@Controller('meeting-settings')
@UseGuards(JwtAuthGuard)
export class MeetingSettingsController {
  constructor(private readonly meetingSettingsService: MeetingSettingsService) {}

  @Post()
  async createMeetingSetting(@Body() dto: CreateMeetingSettingDto) {
    return this.meetingSettingsService.createMeetingSetting(dto);
  }

  @Get()
  async getMeetingSettings(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('meetingId') meetingId = '',
    @Query('isActive') isActive = '',
    @Query('search') search = ''
  ) {
    return this.meetingSettingsService.getMeetingSettings(
      +page, 
      +limit, 
      meetingId, 
      isActive, 
      search
    );
  }

  @Get('meeting/:meetingId')
  async getMeetingSettingsByMeeting(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.meetingSettingsService.getMeetingSettingsByMeeting(meetingId);
  }

  @Get('meeting/:meetingId/key/:key')
  async getMeetingSettingByKey(
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Param('key') key: string
  ) {
    return this.meetingSettingsService.getMeetingSettingByKey(meetingId, key);
  }

  @Get(':id')
  async getMeetingSettingById(@Param('id', ParseIntPipe) id: number) {
    return this.meetingSettingsService.getMeetingSettingById(id);
  }

  @Put(':id')
  async updateMeetingSetting(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMeetingSettingDto
  ) {
    return this.meetingSettingsService.updateMeetingSetting(id, dto);
  }

  @Delete(':id')
  async deleteMeetingSetting(@Param('id', ParseIntPipe) id: number) {
    return this.meetingSettingsService.deleteMeetingSetting(id);
  }

  @Put(':id/toggle-active')
  async toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.meetingSettingsService.toggleActive(id);
  }

  @Post('meeting/:meetingId/batch')
  async createBatchSettings(
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Body() settings: CreateMeetingSettingDto[]
  ) {
    return this.meetingSettingsService.createBatchSettings(meetingId, settings);
  }
}