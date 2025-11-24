import { 
  Controller, Get, Post, Body, Param, Delete, Query, 
  ParseIntPipe, UseGuards, Res 
} from '@nestjs/common';
import { VotesService } from './votes.service';
import { CreateVoteDto } from './dto/create-vote.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('votes')
@UseGuards(JwtAuthGuard)
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Post()
  async createVote(@Body() dto: CreateVoteDto) {
    return this.votesService.createVote(dto);
  }

  @Post('batch')
  async createBatchVotes(@Body() dtos: CreateVoteDto[]) {
    return this.votesService.createBatchVotes(dtos);
  }

  @Get()
  async getVotes(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('resolutionId') resolutionId = '',
    @Query('meetingId') meetingId = '',
    @Query('shareholderId') shareholderId = ''
  ) {
    return this.votesService.getVotes(+page, +limit, resolutionId, meetingId, shareholderId);
  }

  @Get('resolution/:resolutionId')
  async getVotesByResolution(@Param('resolutionId', ParseIntPipe) resolutionId: number) {
    return this.votesService.getVotesByResolution(resolutionId);
  }

  @Get('shareholder/:shareholderId')
  async getVotesByShareholder(@Param('shareholderId', ParseIntPipe) shareholderId: number) {
    return this.votesService.getVotesByShareholder(shareholderId);
  }

  @Get(':id')
  async getVoteById(@Param('id', ParseIntPipe) id: number) {
    return this.votesService.getVoteById(id);
  }

  @Get('resolution/:resolutionId/results')
  async getVotingResults(@Param('resolutionId', ParseIntPipe) resolutionId: number) {
    return this.votesService.getVotingResults(resolutionId);
  }

  @Get('meeting/:meetingId/statistics')
  async getMeetingVotingStatistics(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.votesService.getMeetingVotingStatistics(meetingId);
  }

  @Get('export/resolution/:resolutionId')
  async exportVotingResults(
    @Param('resolutionId', ParseIntPipe) resolutionId: number,
    @Res() res: any
  ) {
    return this.votesService.exportVotingResults(res, resolutionId);
  }

  @Delete(':id')
  async deleteVote(@Param('id', ParseIntPipe) id: number) {
    return this.votesService.deleteVote(id);
  }
}