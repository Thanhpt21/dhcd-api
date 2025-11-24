import { Module } from '@nestjs/common';
import { FeedbacksController } from './feedbacks.controller';
import { PrismaService } from 'prisma/prisma.service';
import { FeedbacksService } from './feedbacks.service';

@Module({
  controllers: [FeedbacksController],
  providers: [FeedbacksService, PrismaService],
})
export class FeedbacksModule {}