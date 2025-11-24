import { Module } from '@nestjs/common';
import { ResolutionCandidatesService } from './resolution-candidates.service';
import { ResolutionCandidatesController } from './resolution-candidates.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [ResolutionCandidatesController],
  providers: [ResolutionCandidatesService, PrismaService],
})
export class ResolutionCandidatesModule {}