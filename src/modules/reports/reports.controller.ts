import { 
  Controller, Get, Post, Body, Param, Delete, Put, Query, 
  ParseIntPipe, UseGuards, DefaultValuePipe, Res, HttpStatus,
  NotFoundException,
  HttpCode
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { CreateReportTemplateDto } from './dto/create-report-template.dto';
import { UpdateReportTemplateDto } from './dto/update-report-template.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate')
  async generateReport(@Body() dto: GenerateReportDto) {
    return this.reportsService.generateReport(dto);
  }

  @Get('templates')
  async getReportTemplates(
    @Query('page') page?: any,
    @Query('limit') limit?: any,
    @Query('type') type?: string,
    @Query('search') search?: string
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    
    return this.reportsService.getReportTemplates(pageNum, limitNum, type, search);
  }

  @Get()
  async getGeneratedReports(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('meetingId') meetingId = '',
    @Query('templateId') templateId = '',
    @Query('search') search = ''
  ) {
    return this.reportsService.getGeneratedReports(+page, +limit, meetingId, templateId, search);
  }

  @Get('meeting/:meetingId')
  async getMeetingReports(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.reportsService.getMeetingReports(meetingId);
  }

  @Get(':id')
  async getGeneratedReport(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.getGeneratedReport(id);
  }

  @Delete(':id')
  async deleteGeneratedReport(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.deleteGeneratedReport(id);
  }

  // Report Templates Management
  @Post('templates')
  async createReportTemplate(@Body() dto: CreateReportTemplateDto) {
    return this.reportsService.createReportTemplate(dto);
  }

  @Get('templates/all')
  async getAllReportTemplates() {
    return this.reportsService.getAllReportTemplates();
  }

  @Get('templates/:id')
  async getReportTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.getReportTemplate(id);
  }

  @Put('templates/:id')
  async updateReportTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReportTemplateDto
  ) {
    return this.reportsService.updateReportTemplate(id, dto);
  }

  @Delete('templates/:id')
  async deleteReportTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.reportsService.deleteReportTemplate(id);
  }

  // Quick Report Generation
  @Get('meeting/:meetingId/summary')
  async generateMeetingSummary(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.reportsService.generateMeetingSummary(meetingId);
  }

  @Get('meeting/:meetingId/attendance')
  async generateAttendanceReport(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.reportsService.generateAttendanceReport(meetingId);
  }

  @Get('meeting/:meetingId/voting')
  async generateVotingReport(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.reportsService.generateVotingReport(meetingId);
  }

  @Get('meeting/:meetingId/registration')
  async generateRegistrationReport(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.reportsService.generateRegistrationReport(meetingId);
  }

 @Get('export/:type')
  async exportData(
    @Param('type') type: string,
    @Query() filters: any,
    @Res() res: any
  ) {
    try {
      const result = await this.reportsService.exportReportData(type, filters);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${result.data.fileName}`);
      
      const buffer = Buffer.from(result.data.buffer, 'base64');
      return res.send(buffer);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: error.message
        });
      }
      
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Lỗi khi export ${type.toLowerCase()}`,
        error: error.message
      });
    }
  }

}