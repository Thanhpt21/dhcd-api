import { 
  Controller, Get, Post, Body, Param, Delete, Put, Query, 
  ParseIntPipe, UseGuards, Patch 
} from '@nestjs/common';
import { AgendasService } from './agendas.service';
import { CreateAgendaDto } from './dto/create-agenda.dto';
import { UpdateAgendaDto } from './dto/update-agenda.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('agendas')
@UseGuards(JwtAuthGuard)
export class AgendasController {
  constructor(private readonly agendasService: AgendasService) {}

  @Post()
  async createAgenda(@Body() dto: CreateAgendaDto) {
    return this.agendasService.createAgenda(dto);
  }

  @Get()
  async getAgendas(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('meetingId') meetingId = '',
    @Query('status') status = '',
    @Query('search') search = ''
  ) {
    return this.agendasService.getAgendas(+page, +limit, meetingId, status, search);
  }

  @Get('meeting/:meetingId')
  async getAgendasByMeeting(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.agendasService.getAgendasByMeeting(meetingId);
  }

  @Get('meeting/:meetingId/timeline')
  async getAgendaTimeline(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.agendasService.getAgendaTimeline(meetingId);
  }

  @Get(':id')
  async getAgendaById(@Param('id', ParseIntPipe) id: number) {
    return this.agendasService.getAgendaById(id);
  }

  @Put(':id')
  async updateAgenda(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAgendaDto) {
    return this.agendasService.updateAgenda(id, dto);
  }

  @Put(':id/status')
  async updateAgendaStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string
  ) {
    return this.agendasService.updateAgendaStatus(id, status);
  }

  @Put(':id/time')
  async updateAgendaTime(
    @Param('id', ParseIntPipe) id: number,
    @Body() timeData: { startTime?: string; endTime?: string; duration?: number }
  ) {
    return this.agendasService.updateAgendaTime(id, timeData.startTime, timeData.endTime, timeData.duration);
  }

  @Put(':id/order')
  async updateAgendaOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body('displayOrder') displayOrder: number
  ) {
    return this.agendasService.updateAgendaOrder(id, displayOrder);
  }

  @Delete(':id')
  async deleteAgenda(@Param('id', ParseIntPipe) id: number) {
    return this.agendasService.deleteAgenda(id);
  }

  @Get('meeting/:meetingId/statistics')
  async getMeetingAgendaStatistics(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.agendasService.getMeetingAgendaStatistics(meetingId);
  }

  @Get('meeting/:meetingId/current')
  async getCurrentAgenda(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.agendasService.getCurrentAgenda(meetingId);
  }
}