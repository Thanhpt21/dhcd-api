import { 
  Controller, Get, Post, Body, Param, Delete, Put, Query, 
  ParseIntPipe, UseGuards, Patch, UseInterceptors, UploadedFile, 
  Res, Response 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ShareholdersService } from './shareholders.service';
import { CreateShareholderDto } from './dto/create-shareholder.dto';
import { UpdateShareholderDto } from './dto/update-shareholder.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('shareholders')
@UseGuards(JwtAuthGuard)
export class ShareholdersController {
  constructor(private readonly shareholdersService: ShareholdersService) {}

  @Post()
  async createShareholder(@Body() dto: CreateShareholderDto) {
    return this.shareholdersService.createShareholder(dto);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importShareholders(@UploadedFile() file: Express.Multer.File) {
    return this.shareholdersService.importShareholders(file);
  }

    @Get('export')
    async exportShareholders(@Res() res: any) {
    try {
        const result = await this.shareholdersService.exportShareholders();
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${result.data.fileName}`);
        
        const buffer = Buffer.from(result.data.buffer, 'base64');
        return res.send(buffer);
    } catch (error) {
        return res.status(500).json({
        success: false,
        message: 'Lỗi khi export danh sách cổ đông',
        error: error.message
        });
    }
    }

      @Get('export/template')
    async exportShareholdersTemplate(@Res() res: any) {
    try {
        const result = await this.shareholdersService.exportTemplate();
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${result.data.fileName}`);
        
        const buffer = Buffer.from(result.data.buffer, 'base64');
        return res.send(buffer);
    } catch (error) {
        return res.status(500).json({
        success: false,
        message: 'Lỗi khi export danh sách cổ đông',
        error: error.message
        });
    }
    }

  @Get()
  async getShareholders(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search = '',
    @Query('isActive') isActive = ''
  ) {
    return this.shareholdersService.getShareholders(+page, +limit, search, isActive);
  }

  @Get('all/list')
  async getAllShareholders(@Query('search') search = '', @Query('isActive') isActive = '') {
    return this.shareholdersService.getAllShareholders(search, isActive);
  }

  @Get(':id')
  async getShareholderById(@Param('id', ParseIntPipe) id: number) {
    return this.shareholdersService.getShareholderById(id);
  }

  @Get(':id/shares-history')
  async getShareholderHistory(@Param('id', ParseIntPipe) id: number) {
    return this.shareholdersService.getShareholderHistory(id);
  }

  @Put(':id')
  async updateShareholder(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateShareholderDto) {
    return this.shareholdersService.updateShareholder(id, dto);
  }

  @Put(':id/status')
  async updateShareholderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean
  ) {
    return this.shareholdersService.updateShareholderStatus(id, isActive);
  }

  @Delete(':id')
  async deleteShareholder(@Param('id', ParseIntPipe) id: number) {
    return this.shareholdersService.deleteShareholder(id);
  }

  @Get(':id/statistics')
  async getShareholderStatistics(@Param('id', ParseIntPipe) id: number) {
    return this.shareholdersService.getShareholderStatistics(id);
  }

  
}