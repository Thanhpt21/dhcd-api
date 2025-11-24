import { 
  Controller, Get, Post, Body, Param, Put, Delete, 
  Query, ParseIntPipe, UseGuards 
} from '@nestjs/common';
import { EmailTemplatesService } from './email-templates.service';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';


@Controller('email-templates')
@UseGuards(JwtAuthGuard)
export class EmailTemplatesController {
  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  @Post()
  async createEmailTemplate(@Body() dto: CreateEmailTemplateDto) {
    return this.emailTemplatesService.createEmailTemplate(dto);
  }

  @Get()
  async getEmailTemplates(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('category') category = '',
    @Query('isActive') isActive = '',
    @Query('language') language = '',
    @Query('search') search = ''
  ) {
    return this.emailTemplatesService.getEmailTemplates(
      +page, +limit, category, isActive, language, search
    );
  }

  @Get('active')
  async getActiveTemplates() {
    return this.emailTemplatesService.getActiveTemplates();
  }

  @Get('categories')
  async getTemplateCategories() {
    return this.emailTemplatesService.getTemplateCategories();
  }

  @Get(':id')
  async getEmailTemplateById(@Param('id', ParseIntPipe) id: number) {
    return this.emailTemplatesService.getEmailTemplateById(id);
  }

  @Get('name/:name')
  async getEmailTemplateByName(@Param('name') name: string) {
    return this.emailTemplatesService.getEmailTemplateByName(name);
  }

  @Put(':id')
  async updateEmailTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmailTemplateDto
  ) {
    return this.emailTemplatesService.updateEmailTemplate(id, dto);
  }

  @Delete(':id')
  async deleteEmailTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.emailTemplatesService.deleteEmailTemplate(id);
  }

  @Put(':id/toggle-active')
  async toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.emailTemplatesService.toggleActive(id);
  }

  @Post(':id/duplicate')
  async duplicateTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.emailTemplatesService.duplicateTemplate(id);
  }

  @Post('preview')
  async previewTemplate(@Body() previewData: { templateId: number; variables: Record<string, any> }) {
    return this.emailTemplatesService.previewTemplate(previewData.templateId, previewData.variables);
  }
}