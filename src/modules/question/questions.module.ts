import { Module } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { PrismaService } from 'prisma/prisma.service';
import { QuestionsGateway } from './questions.gateway';

@Module({
  controllers: [QuestionsController],
  providers: [QuestionsService, PrismaService, QuestionsGateway],
})
export class QuestionsModule {}