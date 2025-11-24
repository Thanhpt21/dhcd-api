import { 
  Controller, Get, Post, Body, Param, Delete, Put, Query, 
  ParseIntPipe, UseGuards, Patch 
} from '@nestjs/common';
import { ResolutionsService } from './resolutions.service';
import { CreateResolutionDto } from './dto/create-resolution.dto';
import { UpdateResolutionDto } from './dto/update-resolution.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('resolutions')
@UseGuards(JwtAuthGuard)
export class ResolutionsController {
  constructor(private readonly resolutionsService: ResolutionsService) {}

  @Post()
  async createResolution(@Body() dto: CreateResolutionDto) {
    return this.resolutionsService.createResolution(dto);
  }

  @Get()
  async getResolutions(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('meetingId') meetingId = '',
    @Query('search') search = '',
    @Query('isActive') isActive = ''
  ) {
    return this.resolutionsService.getResolutions(+page, +limit, meetingId, search, isActive);
  }

  @Get('meeting/:meetingId')
  async getResolutionsByMeeting(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.resolutionsService.getResolutionsByMeeting(meetingId);
  }

  @Get(':id')
  async getResolutionById(@Param('id', ParseIntPipe) id: number) {
    return this.resolutionsService.getResolutionById(id);
  }

  @Put(':id')
  async updateResolution(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateResolutionDto) {
    return this.resolutionsService.updateResolution(id, dto);
  }

  @Put(':id/status')
  async updateResolutionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean
  ) {
    return this.resolutionsService.updateResolutionStatus(id, isActive);
  }

  @Delete(':id')
  async deleteResolution(@Param('id', ParseIntPipe) id: number) {
    return this.resolutionsService.deleteResolution(id);
  }

  @Get('meeting/:meetingId/statistics')
  async getMeetingResolutionStatistics(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.resolutionsService.getMeetingResolutionStatistics(meetingId);
  }
}