import { Module } from '@nestjs/common';
import { ResolutionsService } from './resolutions.service';
import { ResolutionsController } from './resolutions.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [ResolutionsController],
  providers: [ResolutionsService, PrismaService],
})
export class ResolutionsModule {}