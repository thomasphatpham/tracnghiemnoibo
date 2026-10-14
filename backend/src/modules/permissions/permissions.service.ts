import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ sortOrder: 'asc' }, { resource: 'asc' }],
    });
  }

  async getRolePermissions(role: Role) {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role },
      include: { permission: true },
    });
    return rolePermissions.map((rp) => rp.permission);
  }

  async updateRolePermissions(role: Role, permissionIds: string[], adminUserId?: string) {
    if (role === Role.ADMIN) {
      throw new BadRequestException('Vai trò ADMIN luôn có toàn quyền và không thể giới hạn.');
    }

    // Verify all permissionIds exist
    if (permissionIds.length > 0) {
      const validCount = await this.prisma.permission.count({
        where: { id: { in: permissionIds } },
      });
      if (validCount !== permissionIds.length) {
        throw new BadRequestException('Một hoặc nhiều quyền được chọn không tồn tại.');
      }
    }

    // Replace permissions in a transaction
    return this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { role },
      });

      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((pId) => ({
            role,
            permissionId: pId,
            grantedBy: adminUserId,
          })),
        });
      }

      return tx.rolePermission.findMany({
        where: { role },
        include: { permission: true },
      });
    });
  }
}
