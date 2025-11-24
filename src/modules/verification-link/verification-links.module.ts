import { Module } from '@nestjs/common';
import { VerificationLinksService } from './verification-links.service';
import { VerificationLinksController } from './verification-links.controller';
import { PrismaService } from 'prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AttendancesService } from '../attendance/attendances.service';
import { RegistrationsService } from '../registration/registrations.service';

@Module({
  controllers: [VerificationLinksController],
  providers: [VerificationLinksService, PrismaService, EmailService, AttendancesService, RegistrationsService],
})
export class VerificationLinksModule {}