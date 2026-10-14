import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Role, ExamStatus, CandidateScope, AttemptStatus, QuestionStatus } from '@prisma/client';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { AttemptsService } from '../attempts/attempts.service';

describe('Exams Data Isolation & Permissions', () => {
  let service: ExamsService;
  let controller: ExamsController;
  let prismaMock: any;
  let attemptsServiceMock: any;

  const adminUser = {
    id: 'admin-1',
    username: 'admin',
    role: Role.ADMIN,
    departmentId: null,
    permissions: [],
  };

  const techDeptManager = {
    id: 'dm-tech-1',
    username: 'tech_manager',
    role: Role.DEPT_MANAGER,
    departmentId: 'dept-tech',
    permissions: ['exams:read', 'exams:create', 'exams:update', 'exams:publish', 'exams:delete'],
  };

  const techDeptManagerNoPerms = {
    id: 'dm-tech-2',
    username: 'tech_manager_no_perms',
    role: Role.DEPT_MANAGER,
    departmentId: 'dept-tech',
    permissions: [],
  };

  const salesDeptManager = {
    id: 'dm-sales-1',
    username: 'sales_manager',
    role: Role.DEPT_MANAGER,
    departmentId: 'dept-sales',
    permissions: ['exams:read', 'exams:create', 'exams:update', 'exams:publish', 'exams:delete'],
  };

  const managerWithoutDept = {
    id: 'dm-no-dept',
    username: 'manager_no_dept',
    role: Role.DEPT_MANAGER,
    departmentId: null,
    permissions: ['exams:read', 'exams:create'],
  };

  const employeeUser = {
    id: 'emp-1',
    username: 'employee_1',
    role: Role.EMPLOYEE,
    departmentId: 'dept-tech',
    permissions: [],
  };

  const mockTechExam = {
    id: 'exam-tech-1',
    name: 'Kỳ thi Công nghệ',
    description: 'Mô tả kỳ thi Công nghệ',
    status: ExamStatus.DRAFT,
    openAt: new Date(Date.now() - 3600000),
    closeAt: new Date(Date.now() + 3600000),
    durationMinutes: 45,
    totalQuestions: 10,
    passingCorrectAnswers: 5,
    candidateScope: CandidateScope.DEPARTMENTS,
    maxAttempts: 1,
    departmentRules: [
      {
        id: 'rule-tech-1',
        departmentId: 'dept-tech',
        percentage: 100,
        allocatedCount: 10,
        department: { id: 'dept-tech', code: 'TECH', name: 'Phòng Công nghệ' },
      },
    ],
    assignedDepartments: [
      {
        departmentId: 'dept-tech',
        department: { id: 'dept-tech', code: 'TECH', name: 'Phòng Công nghệ' },
      },
    ],
    assignedUsers: [],
    _count: { attempts: 0 },
  };

  const mockSalesExam = {
    id: 'exam-sales-1',
    name: 'Kỳ thi Kinh doanh',
    description: 'Mô tả kỳ thi Kinh doanh',
    status: ExamStatus.DRAFT,
    openAt: new Date(Date.now() - 3600000),
    closeAt: new Date(Date.now() + 3600000),
    durationMinutes: 60,
    totalQuestions: 20,
    passingCorrectAnswers: 10,
    candidateScope: CandidateScope.DEPARTMENTS,
    maxAttempts: 1,
    departmentRules: [
      {
        id: 'rule-sales-1',
        departmentId: 'dept-sales',
        percentage: 100,
        allocatedCount: 20,
        department: { id: 'dept-sales', code: 'SALES', name: 'Phòng Kinh doanh' },
      },
    ],
    assignedDepartments: [
      {
        departmentId: 'dept-sales',
        department: { id: 'dept-sales', code: 'SALES', name: 'Phòng Kinh doanh' },
      },
    ],
    assignedUsers: [],
    _count: { attempts: 0 },
  };

  beforeEach(() => {
    prismaMock = {
      exam: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      examDepartmentRule: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      examAssignedDepartment: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      examAssignedUser: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      examAttempt: {
        groupBy: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      question: {
        count: jest.fn().mockResolvedValue(50),
      },
      department: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.id === 'dept-tech') {
            return Promise.resolve({ id: 'dept-tech', code: 'TECH', name: 'Phòng Công nghệ', status: 'ACTIVE' });
          }
          if (where.id === 'dept-sales') {
            return Promise.resolve({ id: 'dept-sales', code: 'SALES', name: 'Phòng Kinh doanh', status: 'ACTIVE' });
          }
          return Promise.resolve(null);
        }),
      },
      user: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.id === 'u-tech-1') {
            return Promise.resolve({ id: 'u-tech-1', departmentId: 'dept-tech' });
          }
          if (where.id === 'u-sales-1') {
            return Promise.resolve({ id: 'u-sales-1', departmentId: 'dept-sales' });
          }
          return Promise.resolve(null);
        }),
        findMany: jest.fn().mockImplementation(({ where }: any) => {
          const ids: string[] = where?.id?.in || [];
          return Promise.resolve(
            ids.map((id) => ({
              id,
              departmentId: id.includes('sales') ? 'dept-sales' : 'dept-tech',
            })),
          );
        }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((callback) => callback(prismaMock)),
    };

    attemptsServiceMock = {
      startExam: jest.fn().mockResolvedValue({ attemptId: 'attempt-1' }),
    };

    service = new ExamsService(prismaMock as PrismaService);
    controller = new ExamsController(service, attemptsServiceMock as AttemptsService);
  });

  describe('findAll Data Isolation', () => {
    it('DEPT_MANAGER only retrieves exams for their department', async () => {
      prismaMock.exam.findMany.mockResolvedValue([mockTechExam]);
      prismaMock.exam.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 }, techDeptManager);

      expect(prismaMock.exam.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            departmentRules: {
              some: { departmentId: 'dept-tech' },
            },
          }),
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('DEPT_MANAGER without exams:read throws ForbiddenException', async () => {
      await expect(
        service.findAll({ page: 1, limit: 10 }, techDeptManagerNoPerms),
      ).rejects.toThrow(ForbiddenException);
    });

    it('DEPT_MANAGER without departmentId throws ForbiddenException', async () => {
      await expect(
        service.findAll({ page: 1, limit: 10 }, managerWithoutDept),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ADMIN retains unrestricted global access across all exams', async () => {
      prismaMock.exam.findMany.mockResolvedValue([mockTechExam, mockSalesExam]);
      prismaMock.exam.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 }, adminUser);

      const findManyCall = prismaMock.exam.findMany.mock.calls[0][0];
      expect(findManyCall.where.departmentRules).toBeUndefined();
      expect(result.data).toHaveLength(2);
    });

    it('EMPLOYEE retains access to assigned, active, non-expired exams', async () => {
      prismaMock.exam.findMany.mockResolvedValue([mockTechExam]);
      prismaMock.exam.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 }, employeeUser);

      const findManyCall = prismaMock.exam.findMany.mock.calls[0][0];
      expect(findManyCall.where.status).toBe(ExamStatus.PUBLISHED);
      expect(findManyCall.where.closeAt).toBeDefined();
      expect(findManyCall.where.OR).toBeDefined();
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne & checkAvailability Data Isolation', () => {
    it('DEPT_MANAGER can view an exam of their department', async () => {
      prismaMock.exam.findUnique.mockResolvedValue(mockTechExam);

      const result = await service.findOne('exam-tech-1', techDeptManager);
      expect(result.id).toBe('exam-tech-1');
    });

    it('DEPT_MANAGER cannot view an exam of another department', async () => {
      prismaMock.exam.findUnique.mockResolvedValue(mockSalesExam);

      await expect(
        service.findOne('exam-sales-1', techDeptManager),
      ).rejects.toThrow(ForbiddenException);
    });

    it('DEPT_MANAGER without exams:read permission cannot view an exam', async () => {
      prismaMock.exam.findUnique.mockResolvedValue(mockTechExam);

      await expect(
        service.findOne('exam-tech-1', techDeptManagerNoPerms),
      ).rejects.toThrow(ForbiddenException);
    });

    it('DEPT_MANAGER without departmentId cannot view an exam', async () => {
      prismaMock.exam.findUnique.mockResolvedValue(mockTechExam);

      await expect(
        service.findOne('exam-tech-1', managerWithoutDept),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ADMIN can view an exam of any department', async () => {
      prismaMock.exam.findUnique.mockResolvedValue(mockSalesExam);

      const result = await service.findOne('exam-sales-1', adminUser);
      expect(result.id).toBe('exam-sales-1');
    });

    it('checkAvailability enforces DEPT_MANAGER department isolation', async () => {
      prismaMock.exam.findUnique.mockResolvedValue(mockSalesExam);

      await expect(
        service.checkAvailability('exam-sales-1', techDeptManager),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create Data Isolation & Enforced Allocation', () => {
    const validDto: any = {
      name: 'Kỳ thi Kiểm thử mới',
      openAt: new Date(Date.now() + 100000).toISOString(),
      closeAt: new Date(Date.now() + 500000).toISOString(),
      durationMinutes: 30,
      totalQuestions: 10,
      passingCorrectAnswers: 5,
      departmentRules: [{ departmentId: 'dept-sales', percentage: 100 }], // Attempting sales dept
    };

    it('DEPT_MANAGER creating exam enforces department rule allocation to their department', async () => {
      prismaMock.exam.create.mockImplementation(({ data }: any) => {
        return Promise.resolve({
          id: 'new-exam-1',
          name: data.name,
          totalQuestions: data.totalQuestions,
          openAt: data.openAt,
          closeAt: data.closeAt,
          candidateScope: data.candidateScope,
          departmentRules: data.departmentRules.create,
        });
      });

      const exam = await service.create(
        { ...validDto },
        techDeptManager.id,
        techDeptManager,
        '10.0.0.1',
      );

      // Verify rule was forced to techDeptManager.departmentId
      expect(exam.departmentRules[0].departmentId).toBe('dept-tech');
      expect(exam.departmentRules[0].percentage).toBe(100);
      expect(exam.candidateScope).toBe(CandidateScope.DEPARTMENTS);

      // Verify audit log has user.id and clientIp
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: techDeptManager.id,
            ipAddress: '10.0.0.1',
            action: 'CREATE_EXAM',
          }),
        }),
      );
    });

    it('DEPT_MANAGER cannot create exam for CandidateScope.ALL', async () => {
      const allScopeDto = {
        ...validDto,
        candidateScope: CandidateScope.ALL,
      };

      await expect(
        service.create(allScopeDto, techDeptManager.id, techDeptManager),
      ).rejects.toThrow(ForbiddenException);
    });

    it('DEPT_MANAGER cannot assign other departments in CandidateScope.DEPARTMENTS', async () => {
      const otherDeptDto = {
        ...validDto,
        candidateScope: CandidateScope.DEPARTMENTS,
        assignedDepartmentIds: ['dept-sales'],
      };

      await expect(
        service.create(otherDeptDto, techDeptManager.id, techDeptManager),
      ).rejects.toThrow(ForbiddenException);
    });

    it('DEPT_MANAGER cannot assign users from another department in SPECIFIC_USERS', async () => {
      const specificUsersDto = {
        ...validDto,
        candidateScope: CandidateScope.SPECIFIC_USERS,
        assignedUserIds: ['u-sales-1'],
      };

      await expect(
        service.create(specificUsersDto, techDeptManager.id, techDeptManager),
      ).rejects.toThrow(ForbiddenException);
    });

    it('DEPT_MANAGER without department cannot create exam', async () => {
      await expect(
        service.create(validDto, managerWithoutDept.id, managerWithoutDept),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ADMIN retains ability to configure any department rules and candidate scope', async () => {
      prismaMock.exam.create.mockImplementation(({ data }: any) => {
        return Promise.resolve({
          id: 'admin-exam-1',
          ...data,
        });
      });

      const adminDto = {
        ...validDto,
        departmentRules: [{ departmentId: 'dept-sales', percentage: 100 }],
        candidateScope: CandidateScope.ALL,
      };

      const result = await service.create(adminDto, adminUser.id, adminUser, '192.168.1.1');
      expect(result.candidateScope).toBe(CandidateScope.ALL);
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: adminUser.id,
            ipAddress: '192.168.1.1',
          }),
        }),
      );
    });
  });

  describe('update Data Isolation & Ownership', () => {
    it('DEPT_MANAGER can update exam of their own department', async () => {
      prismaMock.exam.findUnique.mockResolvedValue(mockTechExam);
      prismaMock.exam.update.mockResolvedValue({ ...mockTechExam, name: 'Đã cập nhật' });

      const result = await service.update(
        'exam-tech-1',
        { name: 'Đã cập nhật' },
        techDeptManager.id,
        techDeptManager,
        '10.0.0.2',
      );

      expect(result.name).toBe('Đã cập nhật');
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: techDeptManager.id,
            ipAddress: '10.0.0.2',
            action: 'UPDATE_EXAM',
          }),
        }),
      );
    });

    it('DEPT_MANAGER cannot update exam of another department', async () => {
      prismaMock.exam.findUnique.mockResolvedValue(mockSalesExam);

      await expect(
        service.update(
          'exam-sales-1',
          { name: 'Hacker Update' },
          techDeptManager.id,
          techDeptManager,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('DEPT_MANAGER cannot change departmentRules to another department', async () => {
      prismaMock.exam.findUnique.mockResolvedValue(mockTechExam);

      await expect(
        service.update(
          'exam-tech-1',
          { departmentRules: [{ departmentId: 'dept-sales', percentage: 100 }] },
          techDeptManager.id,
          techDeptManager,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('DEPT_MANAGER cannot set candidateScope to ALL during update', async () => {
      prismaMock.exam.findUnique.mockResolvedValue(mockTechExam);

      await expect(
        service.update(
          'exam-tech-1',
          { candidateScope: CandidateScope.ALL },
          techDeptManager.id,
          techDeptManager,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ADMIN can update exam of any department', async () => {
      prismaMock.exam.findUnique.mockResolvedValue(mockSalesExam);
      prismaMock.exam.update.mockResolvedValue({ ...mockSalesExam, name: 'Admin Update' });

      const result = await service.update(
        'exam-sales-1',
        { name: 'Admin Update' },
        adminUser.id,
        adminUser,
      );

      expect(result.name).toBe('Admin Update');
    });
  });

  describe('publish & revertToDraft Data Isolation', () => {
    it('DEPT_MANAGER can publish their department exam', async () => {
      prismaMock.exam.findUnique.mockResolvedValue(mockTechExam);
      prismaMock.question.count.mockResolvedValue(100);
      prismaMock.exam.update.mockResolvedValue({ ...mockTechExam, status: ExamStatus.PUBLISHED });

      const result = await service.publish(
        'exam-tech-1',
        techDeptManager.id,
        techDeptManager,
        '10.0.0.3',
      );

      expect(result.status).toBe(ExamStatus.PUBLISHED);
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: techDeptManager.id,
            ipAddress: '10.0.0.3',
            action: 'PUBLISH_EXAM',
          }),
        }),
      );
    });

    it('DEPT_MANAGER cannot publish exam of another department', async () => {
      prismaMock.exam.findUnique.mockResolvedValue(mockSalesExam);

      await expect(
        service.publish('exam-sales-1', techDeptManager.id, techDeptManager),
      ).rejects.toThrow(ForbiddenException);
    });

    it('DEPT_MANAGER can revert their department exam to draft', async () => {
      const publishedTechExam = { ...mockTechExam, status: ExamStatus.PUBLISHED };
      prismaMock.exam.findUnique.mockResolvedValue(publishedTechExam);
      prismaMock.examAttempt.count.mockResolvedValue(0);
      prismaMock.exam.update.mockResolvedValue({ ...mockTechExam, status: ExamStatus.DRAFT });

      const result = await service.revertToDraft(
        'exam-tech-1',
        techDeptManager.id,
        techDeptManager,
        '10.0.0.4',
      );

      expect(result.status).toBe(ExamStatus.DRAFT);
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: techDeptManager.id,
            ipAddress: '10.0.0.4',
            action: 'REVERT_EXAM_TO_DRAFT',
          }),
        }),
      );
    });

    it('DEPT_MANAGER cannot revert exam of another department', async () => {
      const publishedSalesExam = { ...mockSalesExam, status: ExamStatus.PUBLISHED };
      prismaMock.exam.findUnique.mockResolvedValue(publishedSalesExam);

      await expect(
        service.revertToDraft('exam-sales-1', techDeptManager.id, techDeptManager),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ADMIN can publish and revert exams of any department', async () => {
      prismaMock.exam.findUnique.mockResolvedValue(mockSalesExam);
      prismaMock.question.count.mockResolvedValue(100);
      prismaMock.exam.update.mockResolvedValue({ ...mockSalesExam, status: ExamStatus.PUBLISHED });

      const pubResult = await service.publish('exam-sales-1', adminUser.id, adminUser);
      expect(pubResult.status).toBe(ExamStatus.PUBLISHED);

      prismaMock.exam.findUnique.mockResolvedValue({ ...mockSalesExam, status: ExamStatus.PUBLISHED });
      prismaMock.examAttempt.count.mockResolvedValue(0);
      prismaMock.exam.update.mockResolvedValue({ ...mockSalesExam, status: ExamStatus.DRAFT });

      const revResult = await service.revertToDraft('exam-sales-1', adminUser.id, adminUser);
      expect(revResult.status).toBe(ExamStatus.DRAFT);
    });
  });

  describe('delete Data Isolation & Ownership', () => {
    it('DEPT_MANAGER can delete DRAFT exam of their department with 0 attempts', async () => {
      prismaMock.exam.findUnique.mockResolvedValue(mockTechExam);
      prismaMock.exam.delete.mockResolvedValue(mockTechExam);

      const result = await service.delete(
        'exam-tech-1',
        techDeptManager.id,
        techDeptManager,
        '10.0.0.5',
      );

      expect(result.message).toContain('Đã xóa kỳ thi thành công');
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: techDeptManager.id,
            ipAddress: '10.0.0.5',
            action: 'DELETE_EXAM',
          }),
        }),
      );
    });

    it('DEPT_MANAGER cannot delete exam of another department', async () => {
      prismaMock.exam.findUnique.mockResolvedValue(mockSalesExam);

      await expect(
        service.delete('exam-sales-1', techDeptManager.id, techDeptManager),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ADMIN can delete exam in any department', async () => {
      prismaMock.exam.findUnique.mockResolvedValue(mockSalesExam);
      prismaMock.exam.delete.mockResolvedValue(mockSalesExam);

      const result = await service.delete('exam-sales-1', adminUser.id, adminUser);
      expect(result.message).toContain('Đã xóa kỳ thi thành công');
    });
  });

  describe('Violations Data Isolation', () => {
    it('DEPT_MANAGER getViolationAlerts filters by user department', async () => {
      prismaMock.examAttempt.findMany.mockResolvedValue([]);

      await service.getViolationAlerts(techDeptManager);

      expect(prismaMock.examAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            exam: {
              departmentRules: {
                some: { departmentId: 'dept-tech' },
              },
            },
          }),
        }),
      );
    });

    it('ADMIN getViolationAlerts retrieves all violation alerts globally', async () => {
      prismaMock.examAttempt.findMany.mockResolvedValue([]);

      await service.getViolationAlerts(adminUser);

      const call = prismaMock.examAttempt.findMany.mock.calls[0][0];
      expect(call.where.exam).toBeUndefined();
    });

    it('DEPT_MANAGER getExamViolations allows viewing their department exam violations', async () => {
      prismaMock.exam.findUnique.mockResolvedValue(mockTechExam);
      prismaMock.examAttempt.findMany.mockResolvedValue([]);

      const result = await service.getExamViolations('exam-tech-1', {}, techDeptManager);
      expect(result.exam.id).toBe('exam-tech-1');
    });

    it('DEPT_MANAGER getExamViolations throws ForbiddenException for another department exam', async () => {
      prismaMock.exam.findUnique.mockResolvedValue(mockSalesExam);

      await expect(
        service.getExamViolations('exam-sales-1', {}, techDeptManager),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('ExamsController IP Extraction & Delegation', () => {
    it('extracts client IP from x-forwarded-for header and passes to service methods', async () => {
      const spy = jest.spyOn(service, 'findAll').mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });

      const mockReq = {
        headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' },
        ip: '127.0.0.1',
      } as any;

      await controller.findAll({ page: 1, limit: 10 }, techDeptManager, mockReq);

      expect(spy).toHaveBeenCalledWith(
        { page: 1, limit: 10 },
        techDeptManager,
        '203.0.113.195',
      );
    });

    it('controller passes user, userId and IP to create', async () => {
      const spy = jest.spyOn(service, 'create').mockResolvedValue(mockTechExam as any);
      const mockReq = {
        headers: {},
        ip: '192.168.5.5',
      } as any;

      const dto: any = { name: 'Test' };
      await controller.create(dto, techDeptManager, mockReq);

      expect(spy).toHaveBeenCalledWith(
        dto,
        techDeptManager.id,
        techDeptManager,
        '192.168.5.5',
      );
    });

    it('controller passes user, userId and IP to update', async () => {
      const spy = jest.spyOn(service, 'update').mockResolvedValue(mockTechExam as any);
      const mockReq = {
        headers: {},
        ip: '192.168.5.5',
      } as any;

      const dto: any = { name: 'Updated' };
      await controller.update('exam-tech-1', dto, techDeptManager, mockReq);

      expect(spy).toHaveBeenCalledWith(
        'exam-tech-1',
        dto,
        techDeptManager.id,
        techDeptManager,
        '192.168.5.5',
      );
    });
  });
});
