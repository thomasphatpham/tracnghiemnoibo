import { Module } from '@nestjs/common';
import { AccountRequestsController } from './account-requests.controller';
import { AccountRequestsService } from './account-requests.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule,EmailModule],
  controllers: [AccountRequestsController],
  providers: [AccountRequestsService],
  exports: [AccountRequestsService],
})
export class AccountRequestsModule {}
