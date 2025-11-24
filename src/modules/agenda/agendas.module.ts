import { Module } from '@nestjs/common';
import { AgendasService } from './agendas.service';
import { AgendasController } from './agendas.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [AgendasController],
  providers: [AgendasService, PrismaService],
})
export class AgendasModule {}