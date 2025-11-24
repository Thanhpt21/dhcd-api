import { Module } from '@nestjs/common';
import { MeetingSettingsService } from './meeting-settings.service';
import { MeetingSettingsController } from './meeting-settings.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [MeetingSettingsController],
  providers: [MeetingSettingsService, PrismaService],
  exports: [MeetingSettingsService],
})
export class MeetingSettingsModule {}