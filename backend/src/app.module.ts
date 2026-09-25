import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { EmailModule } from './modules/email/email.module';
import { ExamsModule } from './modules/exams/exams.module';
import { AttemptsModule } from './modules/attempts/attempts.module';
import { AccountRequestsModule } from './modules/account-requests/account-requests.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),
    PrismaModule,
    EmailModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
    QuestionsModule,
    ExamsModule,
    AttemptsModule,
    AccountRequestsModule,
    ReportsModule,
    AuditLogsModule,
  ],
})
export class AppModule {}
