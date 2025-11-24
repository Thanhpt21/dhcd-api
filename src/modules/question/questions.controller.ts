import { 
  Controller, Get, Post, Body, Param, Delete, Put, Query, 
  ParseIntPipe, UseGuards, Patch 
} from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('questions')
@UseGuards(JwtAuthGuard)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  async createQuestion(@Body() dto: CreateQuestionDto) {
    return this.questionsService.createQuestion(dto);
  }

  @Get('top-upvoted')
  async getTopUpvotedQuestions(
    @Query('meetingId') meetingId?: string,
    @Query('limit') limit = '5'
  ) {
    return this.questionsService.getTopUpvotedQuestions(
      meetingId ? +meetingId : undefined, 
      +limit
    );
  }

  @Get()
  async getQuestions(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('meetingId') meetingId = '',
    @Query('shareholderId') shareholderId = '',
    @Query('status') status = '',
    @Query('questionType') questionType = '',
    @Query('search') search = ''
  ) {
    return this.questionsService.getQuestions(+page, +limit, meetingId, shareholderId, status, questionType, search);
  }

  @Get('meeting/:meetingId')
  async getQuestionsByMeeting(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.questionsService.getQuestionsByMeeting(meetingId);
  }

  @Get('shareholder/:shareholderId')
  async getQuestionsByShareholder(@Param('shareholderId', ParseIntPipe) shareholderId: number) {
    return this.questionsService.getQuestionsByShareholder(shareholderId);
  }

  @Get(':id')
  async getQuestionById(@Param('id', ParseIntPipe) id: number) {
    return this.questionsService.getQuestionById(id);
  }

  @Put(':id')
  async updateQuestion(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateQuestionDto) {
    return this.questionsService.updateQuestion(id, dto);
  }

  @Put(':id/status')
  async updateQuestionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string
  ) {
    return this.questionsService.updateQuestionStatus(id, status);
  }

  @Put(':id/answer')
  async answerQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() answerData: { answerText: string; answeredBy: string }
  ) {
    return this.questionsService.answerQuestion(id, answerData.answerText, answerData.answeredBy);
  }

  @Put(':id/select')
  async toggleQuestionSelection(@Param('id', ParseIntPipe) id: number) {
    return this.questionsService.toggleQuestionSelection(id);
  }

  @Post(':id/upvote')
  async upvoteQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body('shareholderId') shareholderId: number
  ) {
    return this.questionsService.upvoteQuestion(id, shareholderId);
  }

  @Delete(':id')
  async deleteQuestion(@Param('id', ParseIntPipe) id: number) {
    return this.questionsService.deleteQuestion(id);
  }

  @Get('meeting/:meetingId/statistics')
  async getMeetingQuestionStatistics(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.questionsService.getMeetingQuestionStatistics(meetingId);
  }
}