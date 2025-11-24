import { 
  Controller, Get, Post, Body, Param, Delete, Put, Query, 
  ParseIntPipe, UseGuards, UseInterceptors, UploadedFile,
  Req
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async createDocument(
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request
  ) {
     const userId = (req as any).user?.id;
    return this.documentsService.createDocument(dto, file, userId);
  }

  @Get()
  async getDocuments(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('meetingId') meetingId = '',
    @Query('category') category = '',
    @Query('isPublic') isPublic = '',
    @Query('search') search = ''
  ) {
    return this.documentsService.getDocuments(+page, +limit, meetingId, category, isPublic, search);
  }

  @Get('public')
  async getPublicDocuments(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('meetingId') meetingId = '',
    @Query('category') category = ''
  ) {
    return this.documentsService.getPublicDocuments(+page, +limit, meetingId, category);
  }

  @Get('meeting/:meetingId')
  async getDocumentsByMeeting(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.documentsService.getDocumentsByMeeting(meetingId);
  }

  @Get(':id')
  async getDocumentById(@Param('id', ParseIntPipe) id: number) {
    return this.documentsService.getDocumentById(id);
  }

  @Get(':id/download')
  async downloadDocument(@Param('id', ParseIntPipe) id: number) {
    return this.documentsService.downloadDocument(id);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('file'))
  async updateDocument(
    @Param('id', ParseIntPipe) id: number, 
    @Body() dto: UpdateDocumentDto,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.documentsService.updateDocument(id, dto, file);
  }

  @Put(':id/visibility')
  async toggleDocumentVisibility(@Param('id', ParseIntPipe) id: number) {
    return this.documentsService.toggleDocumentVisibility(id);
  }

  @Put(':id/order')
  async updateDocumentOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body('displayOrder') displayOrder: number
  ) {
    return this.documentsService.updateDocumentOrder(id, displayOrder);
  }

  @Delete(':id')
  async deleteDocument(@Param('id', ParseIntPipe) id: number) {
    return this.documentsService.deleteDocument(id);
  }

  @Get('meeting/:meetingId/statistics')
  async getMeetingDocumentStatistics(@Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.documentsService.getMeetingDocumentStatistics(meetingId);
  }
}