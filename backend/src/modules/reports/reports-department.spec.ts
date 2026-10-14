import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { AttemptStatus, Role } from '@prisma/client';
import { PERMISSION_KEY } from '../../common/decorators/require-permission.decorator';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { Response } from 'express';

describe('Department Reports & Export (Task 7)', () => {
  let service: ReportsService;
  let controller: ReportsController;
  let prisma: any;
  let reflector: Reflector;

  const mockDepartment = {
    id: 'dept-cntt-uuid',
    code: 'CNTT',
    name: 'Phòng Công Nghệ Thông Tin',
  };

  const mockUsers = [
    {
      id: 'user-1',
      fullName: 'Nguyen Van A',
      username: 'anguyen',
      email: 'anguyen@saigonbank.com.vn',
      position: 'Chuyên viên CNTT',
      status: 'ACTIVE',
      attempts: [
        {
          id: 'att-1',
          score: 8.5,
          correctCount: 17,
          isPassed: true,
          tabSwitchCount: 0,
          submittedAt: new Date('2026-10-10T10:30:00Z'),
          exam: { id: 'exam-1', name: 'ATTT Cơ Bản', totalQuestions: 20 },
        },
      ],
    },
    {
      id: 'user-2',
      fullName: 'Tran Thi B',
      username: 'btran',
      email: 'btran@saigonbank.com.vn',
      position: 'Lập trình viên',
      status: 'ACTIVE',
      attempts: [
        {
          id: 'att-2',
          score: 4.0,
          correctCount: 8,
          isPassed: false,
          tabSwitchCount: 2,
          submittedAt: new Date('2026-10-10T11:00:00Z'),
          exam: { id: 'exam-1', name: 'ATTT Cơ Bản', totalQuestions: 20 },
        },
      ],
    },
    {
      id: 'user-3',
      fullName: 'Le Van C',
      username: 'cle',
      email: 'cle@saigonbank.com.vn',
      position: 'Quản trị mạng',
      status: 'ACTIVE',
      attempts: [],
    },
  ];

  const mockAttempts = [
    { score: 8.5, isPassed: true },
    { score: 4.0, isPassed: false },
  ];

  beforeEach(() => {
    prisma = {
      department: {
        findUnique: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      examAttempt: {
        findMany: jest.fn(),
      },
    };

    service = new ReportsService(prisma as PrismaService);
    controller = new ReportsController(service);
    reflector = new Reflector();
  });

  describe('ReportsService.getMyDepartmentReport', () => {
    it('should throw NotFoundException if department does not exist', async () => {
      prisma.department.findUnique.mockResolvedValue(null);

      await expect(
        service.getMyDepartmentReport('non-existent-dept', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should strictly filter users and attempts by departmentId and calculate summary KPIs', async () => {
      prisma.department.findUnique.mockResolvedValue(mockDepartment);
      prisma.user.findMany.mockResolvedValue(mockUsers);
      prisma.user.count.mockResolvedValue(3);
      prisma.examAttempt.findMany.mockResolvedValue(mockAttempts);

      const result = await service.getMyDepartmentReport('dept-cntt-uuid', {
        page: 1,
        limit: 20,
      });

      // Verify department check
      expect(prisma.department.findUnique).toHaveBeenCalledWith({
        where: { id: 'dept-cntt-uuid' },
        select: { id: true, code: true, name: true },
      });

      // Verify user query strictly filters by departmentId
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { departmentId: 'dept-cntt-uuid' },
          skip: 0,
          take: 20,
          orderBy: { fullName: 'asc' },
        }),
      );

      // Verify examAttempt query strictly filters by user.departmentId
      expect(prisma.examAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: { departmentId: 'dept-cntt-uuid' },
            status: {
              in: [
                AttemptStatus.SUBMITTED,
                AttemptStatus.AUTO_SUBMITTED,
                AttemptStatus.EXPIRED,
              ],
            },
          }),
        }),
      );

      // Verify summary KPIs
      expect(result.department).toEqual(mockDepartment);
      expect(result.summary.totalEmployees).toBe(3);
      expect(result.summary.totalAttempts).toBe(2);
      expect(result.summary.passedCount).toBe(1);
      // (8.5 + 4.0) / 2 = 6.25
      expect(result.summary.avgScore).toBe(6.25);
      // (1 / 2) * 100 = 50%
      expect(result.summary.passRate).toBe(50);
      expect(result.employees).toEqual(mockUsers);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
      });
    });

    it('should handle zero attempts gracefully without NaN', async () => {
      prisma.department.findUnique.mockResolvedValue(mockDepartment);
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);
      prisma.examAttempt.findMany.mockResolvedValue([]);

      const result = await service.getMyDepartmentReport('dept-cntt-uuid', {});

      expect(result.summary.totalAttempts).toBe(0);
      expect(result.summary.passedCount).toBe(0);
      expect(result.summary.avgScore).toBe(0);
      expect(result.summary.passRate).toBe(0);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should apply search, examId, and isPassed filters', async () => {
      prisma.department.findUnique.mockResolvedValue(mockDepartment);
      prisma.user.findMany.mockResolvedValue([mockUsers[0]]);
      prisma.user.count.mockResolvedValue(1);
      prisma.examAttempt.findMany.mockResolvedValue([mockAttempts[0]]);

      await service.getMyDepartmentReport('dept-cntt-uuid', {
        search: 'Nguyen',
        examId: 'exam-1',
        isPassed: true,
        page: 2,
        limit: 10,
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            departmentId: 'dept-cntt-uuid',
            OR: [
              { fullName: { contains: 'Nguyen', mode: 'insensitive' } },
              { username: { contains: 'Nguyen', mode: 'insensitive' } },
              { email: { contains: 'Nguyen', mode: 'insensitive' } },
            ],
          }),
          skip: 10,
          take: 10,
        }),
      );

      expect(prisma.examAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: { departmentId: 'dept-cntt-uuid' },
            examId: 'exam-1',
          }),
        }),
      );
    });
  });

  describe('ReportsService.exportMyDepartmentReport', () => {
    it('should throw NotFoundException if department not found', async () => {
      prisma.department.findUnique.mockResolvedValue(null);

      await expect(
        service.exportMyDepartmentReport('non-existent-dept'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully create an Excel workbook with valid buffer', async () => {
      prisma.department.findUnique.mockResolvedValue(mockDepartment);
      prisma.user.count.mockResolvedValue(3);
      prisma.examAttempt.findMany.mockResolvedValue(mockAttempts);
      prisma.user.findMany.mockResolvedValue(mockUsers);

      const buffer = await service.exportMyDepartmentReport('dept-cntt-uuid', {
        search: '',
        examId: 'exam-1',
      });

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(0);
      // Valid Excel file signature: PK\x03\x04
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    });
  });

  describe('ReportsController', () => {
    const mockUserWithDept = {
      id: 'manager-1',
      role: Role.DEPT_MANAGER,
      departmentId: 'dept-cntt-uuid',
      department: { id: 'dept-cntt-uuid', code: 'CNTT', name: 'Phòng CNTT' },
      permissions: ['reports:read', 'reports:export'],
    };

    const mockUserWithoutDept = {
      id: 'manager-no-dept',
      role: Role.DEPT_MANAGER,
      departmentId: null,
      permissions: ['reports:read', 'reports:export'],
    };

    it('should throw BadRequestException if user.departmentId is missing on getMyDepartment', async () => {
      await expect(
        controller.getMyDepartment(mockUserWithoutDept, '1', '20', undefined, undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delegate to service.getMyDepartmentReport when user.departmentId exists', async () => {
      const spy = jest.spyOn(service, 'getMyDepartmentReport').mockResolvedValue({
        department: mockDepartment,
        summary: {} as any,
        employees: [],
        meta: {} as any,
      });

      const res = await controller.getMyDepartment(
        mockUserWithDept,
        '2',
        '10',
        'Nguyen',
        'exam-1',
        'true',
      );

      expect(spy).toHaveBeenCalledWith('dept-cntt-uuid', {
        page: 2,
        limit: 10,
        search: 'Nguyen',
        examId: 'exam-1',
        isPassed: true,
      });
      expect(res.department).toEqual(mockDepartment);
    });

    it('should throw BadRequestException if user.departmentId is missing on exportMyDepartment', async () => {
      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await expect(
        controller.exportMyDepartment(mockUserWithoutDept, '', '', '', mockRes),
      ).rejects.toThrow(BadRequestException);
    });

    it('should export Excel with Saigonbank headers when user.departmentId exists', async () => {
      const mockBuffer = Buffer.from('mock-excel-binary');
      jest.spyOn(service, 'exportMyDepartmentReport').mockResolvedValue(mockBuffer);

      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.exportMyDepartment(mockUserWithDept, 'Nguyen', 'exam-1', 'false', mockRes);

      expect(service.exportMyDepartmentReport).toHaveBeenCalledWith('dept-cntt-uuid', {
        search: 'Nguyen',
        examId: 'exam-1',
        isPassed: false,
      });
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="Bao_Cao_Phong_Ban_CNTT.xlsx"',
      );
      expect(mockRes.send).toHaveBeenCalledWith(mockBuffer);
    });

    it('should have RequirePermission metadata set correctly on route handlers', () => {
      const getMyDeptPermission = reflector.get(
        PERMISSION_KEY,
        controller.getMyDepartment,
      );
      expect(getMyDeptPermission).toBe('reports:read');

      const exportDeptPermission = reflector.get(
        PERMISSION_KEY,
        controller.exportMyDepartment,
      );
      expect(exportDeptPermission).toBe('reports:export');
    });

    it('should have Roles(Role.ADMIN) metadata set on admin reports routes', () => {
      const summaryRole = reflector.get(ROLES_KEY, controller.getSummary);
      expect(summaryRole).toEqual([Role.ADMIN]);

      const examsReportRole = reflector.get(ROLES_KEY, controller.getExamsReport);
      expect(examsReportRole).toEqual([Role.ADMIN]);

      const candidatesReportRole = reflector.get(
        ROLES_KEY,
        controller.getExamCandidates,
      );
      expect(candidatesReportRole).toEqual([Role.ADMIN]);

      const deptsReportRole = reflector.get(
        ROLES_KEY,
        controller.getDepartmentsReport,
      );
      expect(deptsReportRole).toEqual([Role.ADMIN]);

      const exportExamRole = reflector.get(ROLES_KEY, controller.exportExamReport);
      expect(exportExamRole).toEqual([Role.ADMIN]);

      const exportOverviewRole = reflector.get(
        ROLES_KEY,
        controller.exportOverviewReport,
      );
      expect(exportOverviewRole).toEqual([Role.ADMIN]);
    });
  });
});
