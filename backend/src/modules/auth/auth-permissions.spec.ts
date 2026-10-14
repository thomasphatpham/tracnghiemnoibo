import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, UserStatus } from '@prisma/client';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './auth.service';
import { MeController } from './auth.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';

describe('Auth Permissions Integration', () => {
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      session: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      rolePermission: {
        findMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
  });

  describe('JwtStrategy', () => {
    let strategy: JwtStrategy;
    let configServiceMock: any;

    beforeEach(() => {
      configServiceMock = {
        get: jest.fn().mockReturnValue('test-secret'),
      };
      strategy = new JwtStrategy(configServiceMock as ConfigService, prismaMock as PrismaService);
    });

    it('attaches permissions when user is DEPT_MANAGER', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'dm-1',
        username: 'manager1',
        email: 'manager1@example.com',
        fullName: 'Department Manager',
        position: 'Lead',
        role: Role.DEPT_MANAGER,
        status: UserStatus.ACTIVE,
        departmentId: 'dept-1',
        department: { id: 'dept-1', code: 'IT', name: 'IT Dept' },
        lockedUntil: null,
      });

      prismaMock.session.findUnique.mockResolvedValue({
        id: 'sess-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      });

      prismaMock.rolePermission.findMany.mockResolvedValue([
        { permission: { resource: 'questions', action: 'read' } },
        { permission: { resource: 'questions', action: 'create' } },
        { permission: { resource: 'exams', action: 'publish' } },
      ]);

      const result = await strategy.validate({
        sub: 'dm-1',
        username: 'manager1',
        role: Role.DEPT_MANAGER,
        sessionId: 'sess-1',
      });

      expect(prismaMock.rolePermission.findMany).toHaveBeenCalledWith({
        where: { role: Role.DEPT_MANAGER },
        include: { permission: true },
      });
      expect(result.permissions).toEqual(['questions:read', 'questions:create', 'exams:publish']);
      expect(result.id).toBe('dm-1');
    });

    it('returns empty permissions and does not query rolePermission for EMPLOYEE', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'emp-1',
        username: 'emp1',
        email: 'emp1@example.com',
        fullName: 'Employee One',
        position: 'Staff',
        role: Role.EMPLOYEE,
        status: UserStatus.ACTIVE,
        departmentId: 'dept-1',
        department: { id: 'dept-1', code: 'IT', name: 'IT Dept' },
        lockedUntil: null,
      });

      prismaMock.session.findUnique.mockResolvedValue({
        id: 'sess-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      });

      const result = await strategy.validate({
        sub: 'emp-1',
        username: 'emp1',
        role: Role.EMPLOYEE,
        sessionId: 'sess-1',
      });

      expect(prismaMock.rolePermission.findMany).not.toHaveBeenCalled();
      expect(result.permissions).toEqual([]);
    });
  });

  describe('AuthService.login', () => {
    let service: AuthService;
    let jwtServiceMock: any;
    let configServiceMock: any;
    let emailServiceMock: any;

    beforeEach(() => {
      jwtServiceMock = {
        sign: jest.fn().mockReturnValue('mock-access-token'),
      };
      configServiceMock = {
        get: jest.fn().mockImplementation((key: string, defaultValue: any) => defaultValue),
      };
      emailServiceMock = {};

      service = new AuthService(
        prismaMock as PrismaService,
        jwtServiceMock as JwtService,
        configServiceMock as ConfigService,
        emailServiceMock as EmailService,
      );
    });

    it('returns permissions for DEPT_MANAGER on login', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'dm-1',
        username: 'manager1',
        email: 'manager1@example.com',
        passwordHash,
        fullName: 'Manager One',
        position: 'Head',
        role: Role.DEPT_MANAGER,
        status: UserStatus.ACTIVE,
        failedLoginCount: 0,
        lockedUntil: null,
        departmentId: 'dept-1',
        department: { id: 'dept-1', code: 'IT', name: 'IT Dept' },
      });

      prismaMock.session.create.mockResolvedValue({ id: 'sess-new' });
      prismaMock.rolePermission.findMany.mockResolvedValue([
        { permission: { resource: 'exams', action: 'read' } },
        { permission: { resource: 'exams', action: 'create' } },
      ]);

      const res = await service.login({ usernameOrEmail: 'manager1', password: 'secret123' });

      expect(res.user.permissions).toEqual(['exams:read', 'exams:create']);
      expect(res.accessToken).toBe('mock-access-token');
    });

    it('returns empty permissions for EMPLOYEE on login', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'emp-1',
        username: 'emp1',
        email: 'emp1@example.com',
        passwordHash,
        fullName: 'Emp One',
        position: 'Dev',
        role: Role.EMPLOYEE,
        status: UserStatus.ACTIVE,
        failedLoginCount: 0,
        lockedUntil: null,
        departmentId: 'dept-1',
        department: { id: 'dept-1', code: 'IT', name: 'IT Dept' },
      });

      prismaMock.session.create.mockResolvedValue({ id: 'sess-new' });

      const res = await service.login({ usernameOrEmail: 'emp1', password: 'secret123' });

      expect(prismaMock.rolePermission.findMany).not.toHaveBeenCalled();
      expect(res.user.permissions).toEqual([]);
    });
  });

  describe('MeController.getProfile', () => {
    let controller: MeController;

    beforeEach(() => {
      controller = new MeController(prismaMock as PrismaService);
    });

    it('returns user profile with permissions for DEPT_MANAGER', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'dm-1',
        username: 'manager1',
        email: 'manager1@example.com',
        fullName: 'Manager One',
        position: 'Head',
        role: Role.DEPT_MANAGER,
        status: UserStatus.ACTIVE,
        departmentId: 'dept-1',
        department: { id: 'dept-1', code: 'IT', name: 'IT Dept', status: 'ACTIVE' },
        createdAt: new Date(),
      });

      prismaMock.rolePermission.findMany.mockResolvedValue([
        { permission: { resource: 'reports', action: 'read' } },
      ]);

      const res = await controller.getProfile('dm-1');

      expect(res.user).toBeDefined();
      expect(res.user?.permissions).toEqual(['reports:read']);
    });

    it('returns user profile with empty permissions for EMPLOYEE', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'emp-1',
        username: 'emp1',
        email: 'emp1@example.com',
        fullName: 'Emp One',
        position: 'Staff',
        role: Role.EMPLOYEE,
        status: UserStatus.ACTIVE,
        departmentId: 'dept-1',
        department: { id: 'dept-1', code: 'IT', name: 'IT Dept', status: 'ACTIVE' },
        createdAt: new Date(),
      });

      const res = await controller.getProfile('emp-1');

      expect(prismaMock.rolePermission.findMany).not.toHaveBeenCalled();
      expect(res.user?.permissions).toEqual([]);
    });
  });

  describe('MeController.updateProfile', () => {
    let controller: MeController;

    beforeEach(() => {
      controller = new MeController(prismaMock as PrismaService);
    });

    it('rejects DEPT_MANAGER attempting to supply a departmentId with BadRequestException', async () => {
      const user = {
        id: 'dm-1',
        role: Role.DEPT_MANAGER,
        status: UserStatus.ACTIVE,
      };

      await expect(
        controller.updateProfile(user, { departmentId: 'dept-2' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects active EMPLOYEE attempting to supply a departmentId with BadRequestException', async () => {
      const user = {
        id: 'emp-1',
        role: Role.EMPLOYEE,
        status: UserStatus.ACTIVE,
      };

      await expect(
        controller.updateProfile(user, { departmentId: 'dept-2' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
