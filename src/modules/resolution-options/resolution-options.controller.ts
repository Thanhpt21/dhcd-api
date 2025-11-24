// src/resolution-options/resolution-options.controller.ts
import { 
  Controller, Get, Post, Body, Param, Delete, Put, Query, 
  ParseIntPipe, UseGuards 
} from '@nestjs/common';
import { ResolutionOptionsService } from './resolution-options.service';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('resolution-options')
@UseGuards(JwtAuthGuard)
export class ResolutionOptionsController {
  constructor(private readonly optionsService: ResolutionOptionsService) {}

  @Post()
  async createOption(@Body() dto: CreateOptionDto) {
    return this.optionsService.createOption(dto);
  }

  @Get()
  async getOptions(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('resolutionId') resolutionId = '',
    @Query('search') search = ''
  ) {
    return this.optionsService.getOptions(+page, +limit, resolutionId, search);
  }

  @Get('resolution/:resolutionId')
  async getOptionsByResolution(@Param('resolutionId', ParseIntPipe) resolutionId: number) {
    return this.optionsService.getOptionsByResolution(resolutionId);
  }

  @Get(':id')
  async getOptionById(@Param('id', ParseIntPipe) id: number) {
    return this.optionsService.getOptionById(id);
  }

  @Put(':id')
  async updateOption(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOptionDto) {
    return this.optionsService.updateOption(id, dto);
  }

  @Put(':id/votes')
  async updateOptionVotes(
    @Param('id', ParseIntPipe) id: number,
    @Body('voteCount') voteCount: number
  ) {
    return this.optionsService.updateOptionVotes(id, voteCount);
  }

  @Delete(':id')
  async deleteOption(@Param('id', ParseIntPipe) id: number) {
    return this.optionsService.deleteOption(id);
  }

  @Get('resolution/:resolutionId/statistics')
  async getResolutionOptionStatistics(@Param('resolutionId', ParseIntPipe) resolutionId: number) {
    return this.optionsService.getResolutionOptionStatistics(resolutionId);
  }
}