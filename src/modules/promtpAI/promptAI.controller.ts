import { Controller, Get, Post, Body, Param, Delete, Put, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PromptAIServices } from './promptAI.service';
import { CreatePromptAIDto } from './dto/create-promptAI.dto';
import { UpdatePromptAIDto } from './dto/update-promptAI.dto';

@Controller('prompt-ai')
@UseGuards(JwtAuthGuard)
export class PromptAIController {
  constructor(private readonly promptAIService: PromptAIServices) {}

  @Post()
  async createPromptAI(@Body() dto: CreatePromptAIDto) {
    return this.promptAIService.createPromptAI(dto);
  }

  @Get()
  async getPromptAIs(@Query('page') page = 1, @Query('limit') limit = 10, @Query('search') search = '') {
    return this.promptAIService.getPromptAIs(+page, +limit, search);
  }

  @Get('all/list')
  async getAllPromptAIs(@Query('search') search = '') {
    return this.promptAIService.getAllPromptAIs(search);
  }

  @Get(':id')
  async getPromptAIById(@Param('id', ParseIntPipe) id: number) {
    return this.promptAIService.getPromptAIById(id);
  }

  @Put(':id')
  async updatePromptAI(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePromptAIDto) {
    return this.promptAIService.updatePromptAI(id, dto);
  }

  @Delete(':id')
  async deletePromptAI(@Param('id', ParseIntPipe) id: number) {
    return this.promptAIService.deletePromptAI(id);
  }
}
