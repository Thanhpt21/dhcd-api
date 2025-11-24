import { Module } from '@nestjs/common';

import { PrismaService } from 'prisma/prisma.service';
import { PromptAIController } from './promptAI.controller';
import { PromptAIServices } from './promptAI.service';

@Module({
  controllers: [PromptAIController],
  providers: [PromptAIServices, PrismaService],
})
export class PromptAIModule {}
