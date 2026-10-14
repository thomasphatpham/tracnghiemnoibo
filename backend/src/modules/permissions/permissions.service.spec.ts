import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PermissionsService } from './permissions.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      permission: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      rolePermission: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prismaMock)),
    };

    service = new PermissionsService(prismaMock as PrismaService);
  });

  describe('getAllPermissions', () => {
    it('should return all permissions ordered by sortOrder and resource', async () => {
      const mockPermissions = [
        { id: 'p1', resource: 'questions', action: 'read', label: 'Xem câu hỏi', sortOrder: 1 },
        { id: 'p2', resource: 'questions', action: 'create', label: 'Tạo câu hỏi', sortOrder: 2 },
      ];
      prismaMock.permission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.getAllPermissions();

      expect(prismaMock.permission.findMany).toHaveBeenCalledWith({
        orderBy: [{ sortOrder: 'asc' }, { resource: 'asc' }],
      });
      expect(result).toEqual(mockPermissions);
    });
  });

  describe('getRolePermissions', () => {
    it('should return flattened permissions for a given role', async () => {
      const mockRolePermissions = [
        {
          id: 'rp1',
          role: Role.DEPT_MANAGER,
          permissionId: 'p1',
          permission: { id: 'p1', resource: 'questions', action: 'read', label: 'Xem câu hỏi' },
        },
        {
          id: 'rp2',
          role: Role.DEPT_MANAGER,
          permissionId: 'p2',
          permission: { id: 'p2', resource: 'questions', action: 'create', label: 'Tạo câu hỏi' },
        },
      ];
      prismaMock.rolePermission.findMany.mockResolvedValue(mockRolePermissions);

      const result = await service.getRolePermissions(Role.DEPT_MANAGER);

      expect(prismaMock.rolePermission.findMany).toHaveBeenCalledWith({
        where: { role: Role.DEPT_MANAGER },
        include: { permission: true },
      });
      expect(result).toEqual([
        { id: 'p1', resource: 'questions', action: 'read', label: 'Xem câu hỏi' },
        { id: 'p2', resource: 'questions', action: 'create', label: 'Tạo câu hỏi' },
      ]);
    });

    it('should return empty array if role has no permissions', async () => {
      prismaMock.rolePermission.findMany.mockResolvedValue([]);

      const result = await service.getRolePermissions(Role.EMPLOYEE);

      expect(result).toEqual([]);
    });
  });

  describe('updateRolePermissions', () => {
    it('should reject update if role is ADMIN', async () => {
      await expect(
        service.updateRolePermissions(Role.ADMIN, ['p1', 'p2'], 'admin-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateRolePermissions(Role.ADMIN, ['p1', 'p2'], 'admin-1'),
      ).rejects.toThrow('Vai trò ADMIN luôn có toàn quyền và không thể giới hạn.');

      expect(prismaMock.permission.count).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should reject update if one or more permissionIds do not exist', async () => {
      prismaMock.permission.count.mockResolvedValue(1); // 2 requested, only 1 valid

      await expect(
        service.updateRolePermissions(Role.DEPT_MANAGER, ['p1', 'invalid-p'], 'admin-1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateRolePermissions(Role.DEPT_MANAGER, ['p1', 'invalid-p'], 'admin-1'),
      ).rejects.toThrow('Một hoặc nhiều quyền được chọn không tồn tại.');

      expect(prismaMock.permission.count).toHaveBeenCalledWith({
        where: { id: { in: ['p1', 'invalid-p'] } },
      });
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should successfully update role permissions in a transaction', async () => {
      const permissionIds = ['p1', 'p2'];
      prismaMock.permission.count.mockResolvedValue(2);

      const expectedUpdatedResult = [
        {
          id: 'rp1',
          role: Role.DEPT_MANAGER,
          permissionId: 'p1',
          permission: { id: 'p1', resource: 'questions', action: 'read' },
        },
        {
          id: 'rp2',
          role: Role.DEPT_MANAGER,
          permissionId: 'p2',
          permission: { id: 'p2', resource: 'questions', action: 'create' },
        },
      ];

      prismaMock.rolePermission.deleteMany.mockResolvedValue({ count: 1 });
      prismaMock.rolePermission.createMany.mockResolvedValue({ count: 2 });
      prismaMock.rolePermission.findMany.mockResolvedValue(expectedUpdatedResult);

      const result = await service.updateRolePermissions(
        Role.DEPT_MANAGER,
        permissionIds,
        'admin-user-id',
      );

      expect(prismaMock.permission.count).toHaveBeenCalledWith({
        where: { id: { in: permissionIds } },
      });
      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(prismaMock.rolePermission.deleteMany).toHaveBeenCalledWith({
        where: { role: Role.DEPT_MANAGER },
      });
      expect(prismaMock.rolePermission.createMany).toHaveBeenCalledWith({
        data: [
          { role: Role.DEPT_MANAGER, permissionId: 'p1', grantedBy: 'admin-user-id' },
          { role: Role.DEPT_MANAGER, permissionId: 'p2', grantedBy: 'admin-user-id' },
        ],
      });
      expect(prismaMock.rolePermission.findMany).toHaveBeenCalledWith({
        where: { role: Role.DEPT_MANAGER },
        include: { permission: true },
      });
      expect(result).toEqual(expectedUpdatedResult);
    });

    it('should handle clearing all permissions (empty permissionIds list)', async () => {
      prismaMock.rolePermission.deleteMany.mockResolvedValue({ count: 2 });
      prismaMock.rolePermission.findMany.mockResolvedValue([]);

      const result = await service.updateRolePermissions(
        Role.DEPT_MANAGER,
        [],
        'admin-user-id',
      );

      expect(prismaMock.permission.count).not.toHaveBeenCalled();
      expect(prismaMock.rolePermission.deleteMany).toHaveBeenCalledWith({
        where: { role: Role.DEPT_MANAGER },
      });
      expect(prismaMock.rolePermission.createMany).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
