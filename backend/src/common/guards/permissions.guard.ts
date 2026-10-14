import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException('Phiên làm việc không xác thực quyền.');
    }

    // 1. ADMIN bypasses all permission checks
    if (user.role === Role.ADMIN) {
      return true;
    }

    // 2. Check Role requirement if specified
    if (Array.isArray(requiredRoles) && requiredRoles.length > 0) {
      const hasRole = requiredRoles.includes(user.role);
      if (!hasRole) {
        throw new ForbiddenException(`Quyền truy cập bị từ chối: Yêu cầu vai trò [${requiredRoles.join(', ')}]`);
      }
    }

    // 3. Check Granular Permission if specified
    if (requiredPermission) {
      if (user.role === Role.DEPT_MANAGER) {
        const userPerms: string[] = user.permissions || [];
        if (!userPerms.includes(requiredPermission)) {
          throw new ForbiddenException(`Bạn không có quyền thực hiện chức năng này (${requiredPermission}).`);
        }
      } else {
        // Other non-admin roles without permissions check
        throw new ForbiddenException('Vai trò của bạn không được cấp quyền sử dụng chức năng này.');
      }
    }

    return true;
  }
}
