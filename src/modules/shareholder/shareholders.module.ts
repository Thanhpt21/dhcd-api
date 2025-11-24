import { Module } from '@nestjs/common';
import { ShareholdersService } from './shareholders.service';
import { ShareholdersController } from './shareholders.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [ShareholdersController],
  providers: [ShareholdersService, PrismaService],
})
export class ShareholdersModule {}