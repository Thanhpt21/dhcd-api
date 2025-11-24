import { 
  Controller, Get, Post, Body, Param, Delete, Put, Query, 
  ParseIntPipe, UseGuards, Patch, UseInterceptors, UploadedFile, 
  Res
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationDto } from './dto/update-registration.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('registrations')
@UseGuards(JwtAuthGuard)
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post()
  async createRegistration(@Body() dto: CreateRegistrationDto) {
    return this.registrationsService.createRegistration(dto);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importRegistrations(@UploadedFile() file: Express.Multer.File) {
    return this.registrationsService.importRegistrations(file);
  }

  @Get('export')
  async exportRegistrations(@Res() res: any, @Query('meetingId') meetingId?: string) {
    return this.registrationsService.exportRegistrations(res, meetingId ? +meetingId : undefined);
  }

  @Get()
  async getRegistrations(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search = '',
    @Query('status') status = '',
    @Query('meetingId') meetingId = '',
    @Query('shareholderId') shareholderId = ''
  ) {
    return this.registrationsService.getRegistrations(+page, +limit, search, status, meetingId, shareholderId);
  }

  @Get('all/list')
  async getAllRegistrations(
    @Query('search') search = '',
    @Query('status') status = '',
    @Query('meetingId') meetingId = '',
    @Query('shareholderId') shareholderId = ''
  ) {
    return this.registrationsService.getAllRegistrations(search, status, meetingId, shareholderId);
  }

  @Get('meeting/:meetingId')
  async getRegistrationsByMeeting(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.registrationsService.getRegistrationsByMeeting(meetingId);
  }

  @Get('shareholder/:shareholderId')
  async getRegistrationsByShareholder(@Param('shareholderId', ParseIntPipe) shareholderId: number) {
    return this.registrationsService.getRegistrationsByShareholder(shareholderId);
  }

  @Get(':id')
  async getRegistrationById(@Param('id', ParseIntPipe) id: number) {
    return this.registrationsService.getRegistrationById(id);
  }

  @Put(':id')
  async updateRegistration(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRegistrationDto) {
    return this.registrationsService.updateRegistration(id, dto);
  }

  @Put(':id/status')
  async updateRegistrationStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string
  ) {
    return this.registrationsService.updateRegistrationStatus(id, status);
  }

  @Post(':id/cancel')
  async cancelRegistration(@Param('id', ParseIntPipe) id: number) {
    return this.registrationsService.cancelRegistration(id);
  }

  @Delete(':id')
  async deleteRegistration(@Param('id', ParseIntPipe) id: number) {
    return this.registrationsService.deleteRegistration(id);
  }

  @Get('meeting/:meetingId/statistics')
  async getMeetingRegistrationStatistics(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.registrationsService.getMeetingRegistrationStatistics(meetingId);
  }

  @Get('shareholder/:shareholderId/statistics')
  async getShareholderRegistrationStatistics(@Param('shareholderId', ParseIntPipe) shareholderId: number) {
    return this.registrationsService.getShareholderRegistrationStatistics(shareholderId);
  }
}