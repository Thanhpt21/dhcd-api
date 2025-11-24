import { Module } from '@nestjs/common';
import { ProxiesService } from './proxies.service';
import { ProxiesController } from './proxies.controller';
import { PrismaService } from 'prisma/prisma.service';
import { UploadService } from '../upload/upload.service';

@Module({
  controllers: [ProxiesController],
  providers: [ProxiesService, PrismaService, UploadService],
  exports: [ProxiesService],
})
export class ProxiesModule {}