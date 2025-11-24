import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PrismaService } from 'prisma/prisma.service';
import { UploadService } from '../upload/upload.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, PrismaService, UploadService],
})
export class DocumentsModule {}