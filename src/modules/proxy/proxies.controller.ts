import { 
  Controller, Get, Post, Body, Param, Put, Delete, 
  Query, ParseIntPipe, UseGuards, 
  UseInterceptors,
  UploadedFile
} from '@nestjs/common';
import { ProxiesService } from './proxies.service';
import { CreateProxyDto } from './dto/create-proxy.dto';
import { UpdateProxyDto } from './dto/update-proxy.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';


@Controller('proxies')
@UseGuards(JwtAuthGuard)
export class ProxiesController {
  constructor(private readonly proxiesService: ProxiesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('documentUrl'))
  async createProxy(
    @Body() dto: CreateProxyDto,
    @UploadedFile() documentUrl?: Express.Multer.File 
  ) {
    return this.proxiesService.createProxy(dto, documentUrl);
  }

  @Get()
  async getProxies(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('meetingId') meetingId = '',
    @Query('shareholderId') shareholderId = '',
    @Query('proxyPersonId') proxyPersonId = '',
    @Query('status') status = '',
    @Query('search') search = ''
  ) {
    return this.proxiesService.getProxies(
      +page, +limit, meetingId, shareholderId, proxyPersonId, status, search
    );
  }

  @Get('meeting/:meetingId')
  async getProxiesByMeeting(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.proxiesService.getProxiesByMeeting(meetingId);
  }

  @Get('shareholder/:shareholderId')
  async getProxiesByShareholder(@Param('shareholderId', ParseIntPipe) shareholderId: number) {
    return this.proxiesService.getProxiesByShareholder(shareholderId);
  }

  @Get('proxy-person/:proxyPersonId')
  async getProxiesByProxyPerson(@Param('proxyPersonId', ParseIntPipe) proxyPersonId: number) {
    return this.proxiesService.getProxiesByProxyPerson(proxyPersonId);
  }

  @Get(':id')
  async getProxyById(@Param('id', ParseIntPipe) id: number) {
    return this.proxiesService.getProxyById(id);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('documentUrl'))
  async updateProxy(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProxyDto,
     @UploadedFile() documentUrl?: Express.Multer.File
  ) {
    return this.proxiesService.updateProxy(id, dto, documentUrl);
  }

  @Delete(':id')
  async deleteProxy(@Param('id', ParseIntPipe) id: number) {
    return this.proxiesService.deleteProxy(id);
  }

  @Put(':id/approve')
  async approveProxy(
    @Param('id', ParseIntPipe) id: number,
    @Body('approvedBy') approvedBy: number
  ) {
    return this.proxiesService.approveProxy(id, approvedBy);
  }

  @Put(':id/reject')
  async rejectProxy(
    @Param('id', ParseIntPipe) id: number,
    @Body('rejectedReason') rejectedReason: string
  ) {
    return this.proxiesService.rejectProxy(id, rejectedReason);
  }

  @Put(':id/revoke')
  async revokeProxy(@Param('id', ParseIntPipe) id: number) {
    return this.proxiesService.revokeProxy(id);
  }

  @Get('meeting/:meetingId/statistics')
  async getProxyStatistics(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.proxiesService.getProxyStatistics(meetingId);
  }

  @Get('shareholder/:shareholderId/active')
  async getActiveProxyForShareholder(@Param('shareholderId', ParseIntPipe) shareholderId: number) {
    return this.proxiesService.getActiveProxyForShareholder(shareholderId);
  }

  @Post('validate')
  async validateProxy(@Body() data: { meetingId: number; shareholderId: number }) {
    return this.proxiesService.validateProxy(data.meetingId, data.shareholderId);
  }
}