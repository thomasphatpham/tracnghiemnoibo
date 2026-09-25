import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AccountRequestsService } from './account-requests.service';
import { CreateAccountRequestDto } from './dto/create-account-request.dto';
import { RejectAccountRequestDto } from './dto/reject-account-request.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role, AccountRequestStatus } from '@prisma/client';

@Controller('account-requests')
export class AccountRequestsController {
  constructor(private readonly service: AccountRequestsService) {}

  // 1. Public endpoint: Submit an account registration request
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateAccountRequestDto) {
    return this.service.create(dto);
  }

  // 2. Public endpoint: Get active departments for the registration dropdown
  @Get('departments')
  async getDepartments() {
    return this.service.getPublicDepartments();
  }

  // 3. Admin endpoint: List account requests with pagination & status filter
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get()
  async findAll(
    @Query('status') status?: AccountRequestStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      status,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  // 4. Admin endpoint: Approve request and create user account
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/approve')
  async approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.approve(id, user.id);
  }

  // 5. Admin endpoint: Reject request with reason
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: RejectAccountRequestDto,
  ) {
    return this.service.reject(id, user.id, dto);
  }
}
