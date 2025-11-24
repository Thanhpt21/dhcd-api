import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseInterceptors,
  Query,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ConfigService } from './config.service';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('configs')
@UseGuards(JwtAuthGuard, PermissionsGuard) // Áp dụng cho tất cả (trừ GET public nếu cần)
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  // === CREATE ===
  @Post()
  @Permissions('create_configs')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'banner', maxCount: 10 },
    ]),
  )
  async create(
    @Body() dto: CreateConfigDto,
    @UploadedFiles()
    files: { logo?: Express.Multer.File[]; banner?: Express.Multer.File[] },
  ) {
    const logoFile = files.logo?.[0];
    const bannerFiles = files.banner || [];
    return this.configService.create(dto, logoFile, bannerFiles);
  }

  // === GET ALL (với phân trang & tìm kiếm) ===
  @Get()
  async getAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search = '',
  ) {
    return this.configService.getConfigs(Number(page), Number(limit), search);
  }

  // === GET BY ID ===
  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.configService.getById(id);
  }

  // === UPDATE ===
  @Put(':id')
  @Permissions('update_configs')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'banner', maxCount: 10 },
    ]),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConfigDto,
    @UploadedFiles()
    files: { logo?: Express.Multer.File[]; banner?: Express.Multer.File[] },
  ) {
    const logoFile = files.logo?.[0];
    const bannerFiles = files.banner || [];
    return this.configService.update(id, dto, logoFile, bannerFiles);
  }

  // === DELETE ===
  @Delete(':id')
  @Permissions('delete_configs')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.configService.delete(id);
  }
}