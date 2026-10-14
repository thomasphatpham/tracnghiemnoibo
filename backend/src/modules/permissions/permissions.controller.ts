import { Controller, Get, Put, Param, Body, UseGuards, ParseEnumPipe } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  async getAll() {
    return this.permissionsService.getAllPermissions();
  }

  @Get('role/:role')
  async getByRole(@Param('role', new ParseEnumPipe(Role)) role: Role) {
    return this.permissionsService.getRolePermissions(role);
  }

  @Put('role/:role')
  async updateRolePermissions(
    @Param('role', new ParseEnumPipe(Role)) role: Role,
    @Body() dto: UpdateRolePermissionsDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.permissionsService.updateRolePermissions(role, dto.permissionIds, adminUserId);
  }
}
