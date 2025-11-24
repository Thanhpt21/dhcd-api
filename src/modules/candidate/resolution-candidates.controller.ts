import { 
  Controller, Get, Post, Body, Param, Delete, Put, Query, 
  ParseIntPipe, UseGuards, Patch 
} from '@nestjs/common';
import { ResolutionCandidatesService } from './resolution-candidates.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('resolution-candidates')
@UseGuards(JwtAuthGuard)
export class ResolutionCandidatesController {
  constructor(private readonly candidatesService: ResolutionCandidatesService) {}

  @Post()
  async createCandidate(@Body() dto: CreateCandidateDto) {
    return this.candidatesService.createCandidate(dto);
  }

  @Get()
  async getCandidates(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('resolutionId') resolutionId = '',
    @Query('search') search = ''
  ) {
    return this.candidatesService.getCandidates(+page, +limit, resolutionId, search);
  }

  @Get('resolution/:resolutionId')
  async getCandidatesByResolution(@Param('resolutionId', ParseIntPipe) resolutionId: number) {
    return this.candidatesService.getCandidatesByResolution(resolutionId);
  }

  @Get(':id')
  async getCandidateById(@Param('id', ParseIntPipe) id: number) {
    return this.candidatesService.getCandidateById(id);
  }

  @Put(':id')
  async updateCandidate(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCandidateDto) {
    return this.candidatesService.updateCandidate(id, dto);
  }

  @Put(':id/status')
  async updateCandidateElectionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('isElected') isElected: boolean
  ) {
    return this.candidatesService.updateCandidateElectionStatus(id, isElected);
  }

  @Put(':id/votes')
  async updateCandidateVotes(
    @Param('id', ParseIntPipe) id: number,
    @Body('voteCount') voteCount: number
  ) {
    return this.candidatesService.updateCandidateVotes(id, voteCount);
  }

  @Delete(':id')
  async deleteCandidate(@Param('id', ParseIntPipe) id: number) {
    return this.candidatesService.deleteCandidate(id);
  }

  @Get('resolution/:resolutionId/statistics')
  async getResolutionCandidateStatistics(@Param('resolutionId', ParseIntPipe) resolutionId: number) {
    return this.candidatesService.getResolutionCandidateStatistics(resolutionId);
  }
}