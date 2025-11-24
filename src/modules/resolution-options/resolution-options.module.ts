// src/resolution-options/resolution-options.module.ts
import { Module } from '@nestjs/common';
import { ResolutionOptionsService } from './resolution-options.service';
import { ResolutionOptionsController } from './resolution-options.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [ResolutionOptionsController],
  providers: [ResolutionOptionsService, PrismaService],
  exports: [ResolutionOptionsService],
})
export class ResolutionOptionsModule {}