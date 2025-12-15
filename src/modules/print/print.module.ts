// src/print/print.module.ts
import { Module } from '@nestjs/common';
import { PrintController } from './print.controller';
import { PrintService } from './print.service';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [PrintController],
  providers: [PrintService, PrismaService],
  exports: [PrintService],
})
export class PrintModule {}