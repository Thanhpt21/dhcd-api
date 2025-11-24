import { Module } from '@nestjs/common';
import { MeetingMinutesService } from './meeting-minutes.service';
import { MeetingMinutesController } from './meeting-minutes.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [MeetingMinutesController],
  providers: [MeetingMinutesService, PrismaService],
  exports: [MeetingMinutesService],
})
export class MeetingMinutesModule {}