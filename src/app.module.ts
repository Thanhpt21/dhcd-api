import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from 'prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RoleModule } from './modules/role/roles.module';
import { PermissionsModule } from './modules/permission/permissions.module';
import { RolePermissionsModule } from './modules/role-permission/role-permissions.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { ConfigsModule } from './modules/config/config.module';
import { ContactModule } from './modules/contact/contact.module';
import { PromptAIModule } from './modules/promtpAI/promptAI.module';
import { UserRoleModule } from './modules/user-role/user-role.module';
import { MeetingsModule } from './modules/meeting/meetings.module';
import { ShareholdersModule } from './modules/shareholder/shareholders.module';
import { RegistrationsModule } from './modules/registration/registrations.module';
import { AttendancesModule } from './modules/attendance/attendances.module';
import { ResolutionsModule } from './modules/resolution/resolutions.module';
import { ResolutionCandidatesModule } from './modules/candidate/resolution-candidates.module';
import { VotesModule } from './modules/vote/votes.module';
import { QuestionsModule } from './modules/question/questions.module';
import { FeedbacksModule } from './modules/feedback/feedbacks.module';
import { DocumentsModule } from './modules/document/documents.module';
import { AgendasModule } from './modules/agenda/agendas.module';
import { VerificationLinksModule } from './modules/verification-link/verification-links.module';
import { ReportsModule } from './modules/reports/reports.module';
import { MeetingSettingsModule } from './modules/meeting-settings/meeting-settings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EmailTemplatesModule } from './modules/email-templates/email-templates.module';
import { MeetingMinutesModule } from './modules/meeting-minutes/meeting-minutes.module';
import { ProxiesModule } from './modules/proxy/proxies.module';
import { EmailModule } from './modules/email/email.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ResolutionOptionsModule } from './modules/resolution-options/resolution-options.module';
import { PrintModule } from './modules/print/print.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env',
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
    RoleModule,
    PermissionsModule,
    RolePermissionsModule,
    AuditLogModule,
    ConfigsModule,
    ContactModule,
    PromptAIModule,
    UserRoleModule,
    MeetingsModule,
    ShareholdersModule,
    RegistrationsModule,
    AttendancesModule,
    ResolutionsModule,
    ResolutionCandidatesModule,
    VotesModule,
    QuestionsModule,
    FeedbacksModule,
    DocumentsModule,
    AgendasModule,
    VerificationLinksModule,
    ReportsModule,
    MeetingSettingsModule,
    NotificationsModule,
    EmailTemplatesModule,
    MeetingMinutesModule,
    ProxiesModule,
    EmailModule,
    CheckoutModule,
    ResolutionOptionsModule,
    PrintModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
