import {
  BadRequestException,
  ForbiddenException,
  ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import {
  Role,
  UserStatus,
  QuestionStatus,
  AttemptStatus,
  ExamStatus,
} from '@prisma/client';
import { PermissionsService } from '../src/modules/permissions/permissions.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { QuestionsService } from '../src/modules/questions/questions.service';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { AttemptsService } from '../src/modules/attempts/attempts.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PERMISSION_KEY } from '../src/common/decorators/require-permission.decorator';

describe('DEPT_MANAGER End-to-End Verification & Integration Suite', () => {
  // In-memory data store for full lifecycle simulation
  let departments: any[];
  let permissions: any[];
  let rolePermissions: any[];
  let users: any[];
  let sessions: any[];
  let questions: any[];
  let questionOptions: any[];
  let exams: any[];
  let examAttempts: any[];
  let auditLogs: any[];

  let prismaMock: any;
  let permissionsService: PermissionsService;
  let jwtStrategy: JwtStrategy;
  let questionsService: QuestionsService;
  let permissionsGuard: PermissionsGuard;
  let attemptsService: AttemptsService;
  let reflector: Reflector;
  let configServiceMock: any;

  beforeEach(() => {
    // 1. Initial Master Data
    departments = [
      { id: 'dept-it', code: 'IT', name: 'Phòng Công nghệ Thông tin' },
      { id: 'dept-hr', code: 'HR', name: 'Phòng Nhân sự' },
      { id: 'dept-sales', code: 'SALES', name: 'Phòng Kinh doanh' },
    ];

    permissions = [
      { id: 'perm-q-read', resource: 'questions', action: 'read', label: 'Xem câu hỏi', sortOrder: 1 },
      { id: 'perm-q-create', resource: 'questions', action: 'create', label: 'Tạo câu hỏi', sortOrder: 2 },
      { id: 'perm-q-update', resource: 'questions', action: 'update', label: 'Sửa câu hỏi', sortOrder: 3 },
      { id: 'perm-q-delete', resource: 'questions', action: 'delete', label: 'Xóa câu hỏi', sortOrder: 4 },
      { id: 'perm-ex-read', resource: 'exams', action: 'read', label: 'Xem kỳ thi', sortOrder: 5 },
      { id: 'perm-ex-create', resource: 'exams', action: 'create', label: 'Tạo kỳ thi', sortOrder: 6 },
    ];

    rolePermissions = [];

    users = [
      {
        id: 'admin-1',
        username: 'sysadmin',
        email: 'admin@company.com',
        fullName: 'System Administrator',
        position: 'Admin',
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        departmentId: null,
        department: null,
        lockedUntil: null,
      },
      {
        id: 'dm-it-1',
        username: 'manager_it',
        email: 'it_manager@company.com',
        fullName: 'Trưởng phòng IT',
        position: 'Trưởng phòng',
        role: Role.DEPT_MANAGER,
        status: UserStatus.ACTIVE,
        departmentId: 'dept-it',
        department: { id: 'dept-it', code: 'IT', name: 'Phòng Công nghệ Thông tin' },
        lockedUntil: null,
      },
      {
        id: 'dm-hr-1',
        username: 'manager_hr',
        email: 'hr_manager@company.com',
        fullName: 'Trưởng phòng Nhân sự',
        position: 'Trưởng phòng',
        role: Role.DEPT_MANAGER,
        status: UserStatus.ACTIVE,
        departmentId: 'dept-hr',
        department: { id: 'dept-hr', code: 'HR', name: 'Phòng Nhân sự' },
        lockedUntil: null,
      },
      {
        id: 'emp-1',
        username: 'candidate_1',
        email: 'emp1@company.com',
        fullName: 'Nhân viên Thí sinh',
        position: 'Nhân viên',
        role: Role.EMPLOYEE,
        status: UserStatus.ACTIVE,
        departmentId: 'dept-it',
        department: { id: 'dept-it', code: 'IT', name: 'Phòng Công nghệ Thông tin' },
        lockedUntil: null,
      },
    ];

    sessions = [
      {
        id: 'sess-dm-it',
        userId: 'dm-it-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      {
        id: 'sess-admin',
        userId: 'admin-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      {
        id: 'sess-emp',
        userId: 'emp-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    ];

    questions = [
      {
        id: 'q-it-seed',
        code: 'IT-Q001',
        content: 'Câu hỏi chuyên môn IT ban đầu',
        departmentId: 'dept-it',
        explanation: 'Giải thích IT',
        status: QuestionStatus.ACTIVE,
        createdAt: new Date('2026-01-01'),
      },
      {
        id: 'q-hr-seed',
        code: 'HR-Q001',
        content: 'Câu hỏi quy chế Nhân sự ban đầu',
        departmentId: 'dept-hr',
        explanation: 'Giải thích HR',
        status: QuestionStatus.ACTIVE,
        createdAt: new Date('2026-01-02'),
      },
    ];

    questionOptions = [
      { id: 'opt-1', questionId: 'q-it-seed', key: 'A', content: 'Phương án A', isCorrect: true },
      { id: 'opt-2', questionId: 'q-it-seed', key: 'B', content: 'Phương án B', isCorrect: false },
      { id: 'opt-3', questionId: 'q-it-seed', key: 'C', content: 'Phương án C', isCorrect: false },
      { id: 'opt-4', questionId: 'q-it-seed', key: 'D', content: 'Phương án D', isCorrect: false },
      { id: 'opt-5', questionId: 'q-hr-seed', key: 'A', content: 'Phương án A', isCorrect: true },
      { id: 'opt-6', questionId: 'q-hr-seed', key: 'B', content: 'Phương án B', isCorrect: false },
      { id: 'opt-7', questionId: 'q-hr-seed', key: 'C', content: 'Phương án C', isCorrect: false },
      { id: 'opt-8', questionId: 'q-hr-seed', key: 'D', content: 'Phương án D', isCorrect: false },
    ];

    exams = [
      {
        id: 'exam-1',
        name: 'Kỳ thi sát hạch IT Q1/2026',
        status: ExamStatus.PUBLISHED,
        durationMinutes: 15,
        totalQuestions: 1,
        passingCorrectAnswers: 1,
        maxTabSwitches: 2,
        showCorrectAnswersAfterSubmit: true,
      },
    ];

    examAttempts = [];
    auditLogs = [];

    // 2. Build Stateful Mock Prisma Service
    prismaMock = {
      department: {
        findMany: jest.fn(async ({ where }: any = {}) => {
          if (!where) return departments;
          return departments.filter((d) => {
            if (where.id && d.id !== where.id) return false;
            return true;
          });
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          return departments.find((d) => d.id === where.id || d.code === where.code) || null;
        }),
      },

      permission: {
        findMany: jest.fn(async () => permissions),
        count: jest.fn(async ({ where }: any) => {
          if (where?.id?.in) {
            return permissions.filter((p) => where.id.in.includes(p.id)).length;
          }
          return permissions.length;
        }),
      },

      rolePermission: {
        findMany: jest.fn(async ({ where }: any) => {
          const matched = rolePermissions.filter((rp) => rp.role === where.role);
          return matched.map((rp) => {
            const perm = permissions.find((p) => p.id === rp.permissionId);
            return {
              ...rp,
              permission: perm,
            };
          });
        }),
        deleteMany: jest.fn(async ({ where }: any) => {
          const initialCount = rolePermissions.length;
          rolePermissions = rolePermissions.filter((rp) => rp.role !== where.role);
          return { count: initialCount - rolePermissions.length };
        }),
        createMany: jest.fn(async ({ data }: any) => {
          for (const item of data) {
            rolePermissions.push({
              id: `rp-${Date.now()}-${Math.random()}`,
              ...item,
            });
          }
          return { count: data.length };
        }),
      },

      user: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          const u = users.find((user) => user.id === where.id || user.username === where.username);
          if (!u) return null;
          if (include?.department) {
            const dept = departments.find((d) => d.id === u.departmentId);
            return { ...u, department: dept || null };
          }
          return u;
        }),
      },

      session: {
        findUnique: jest.fn(async ({ where }: any) => {
          return sessions.find((s) => s.id === where.id) || null;
        }),
      },

      question: {
        create: jest.fn(async ({ data }: any) => {
          const created = {
            id: `q-${Date.now()}`,
            ...data,
            createdAt: new Date(),
          };
          questions.push(created);
          return created;
        }),

        findUnique: jest.fn(async ({ where, include }: any) => {
          const q = questions.find((item) => item.id === where.id || item.code === where.code);
          if (!q) return null;

          const opts = questionOptions.filter((opt) => opt.questionId === q.id);
          const dept = departments.find((d) => d.id === q.departmentId);
          const attemptQuestions = examAttempts.flatMap((att) => att.questions || []).filter((aq) => aq.questionId === q.id);

          return {
            ...q,
            department: dept || null,
            options: include?.options ? opts : undefined,
            _count: {
              attemptQuestions: attemptQuestions.length,
            },
          };
        }),

        findMany: jest.fn(async ({ where, skip = 0, take = 10 }: any) => {
          let filtered = [...questions];
          if (where?.departmentId) {
            filtered = filtered.filter((q) => q.departmentId === where.departmentId);
          }
          if (where?.status) {
            filtered = filtered.filter((q) => q.status === where.status);
          }
          return filtered.slice(skip, skip + take).map((q) => {
            const dept = departments.find((d) => d.id === q.departmentId);
            const opts = questionOptions.filter((opt) => opt.questionId === q.id);
            return {
              ...q,
              department: dept,
              options: opts,
            };
          });
        }),

        count: jest.fn(async ({ where }: any) => {
          let filtered = [...questions];
          if (where?.departmentId) {
            filtered = filtered.filter((q) => q.departmentId === where.departmentId);
          }
          return filtered.length;
        }),

        update: jest.fn(async ({ where, data }: any) => {
          const idx = questions.findIndex((q) => q.id === where.id);
          if (idx === -1) return null;
          questions[idx] = { ...questions[idx], ...data };
          const dept = departments.find((d) => d.id === questions[idx].departmentId);
          const opts = questionOptions.filter((opt) => opt.questionId === questions[idx].id);
          return {
            ...questions[idx],
            department: dept,
            options: opts,
          };
        }),

        delete: jest.fn(async ({ where }: any) => {
          const idx = questions.findIndex((q) => q.id === where.id);
          if (idx !== -1) {
            const [deleted] = questions.splice(idx, 1);
            return deleted;
          }
          return null;
        }),
      },

      questionOption: {
        create: jest.fn(async ({ data }: any) => {
          const opt = { id: `opt-${Date.now()}-${Math.random()}`, ...data };
          questionOptions.push(opt);
          return opt;
        }),
        upsert: jest.fn(async ({ create }: any) => {
          const opt = { id: `opt-${Date.now()}-${Math.random()}`, ...create };
          questionOptions.push(opt);
          return opt;
        }),
      },

      exam: {
        findUnique: jest.fn(async ({ where }: any) => {
          return exams.find((e) => e.id === where.id) || null;
        }),
      },

      examAttempt: {
        findUnique: jest.fn(async ({ where }: any) => {
          return examAttempts.find((att) => att.id === where.id) || null;
        }),
        update: jest.fn(async ({ where, data, include }: any) => {
          const idx = examAttempts.findIndex((att) => att.id === where.id);
          if (idx === -1) return null;
          examAttempts[idx] = { ...examAttempts[idx], ...data };
          return examAttempts[idx];
        }),
      },

      tabSwitchLog: {
        create: jest.fn(async ({ data }: any) => {
          return { id: `tsl-${Date.now()}`, ...data };
        }),
      },

      auditLog: {
        create: jest.fn(async ({ data }: any) => {
          const record = {
            id: `audit-${Date.now()}-${Math.random()}`,
            ...data,
            createdAt: new Date(),
          };
          auditLogs.push(record);
          return record;
        }),
      },

      $transaction: jest.fn(async (cbOrArr: any) => {
        if (Array.isArray(cbOrArr)) {
          return Promise.all(cbOrArr);
        }
        return cbOrArr(prismaMock);
      }),
    };

    // 3. Instantiate Services and Guards
    configServiceMock = {
      get: jest.fn().mockReturnValue('test-jwt-secret-key-for-e2e-testing-only'),
    };
    reflector = new Reflector();

    permissionsService = new PermissionsService(prismaMock as unknown as PrismaService);
    jwtStrategy = new JwtStrategy(configServiceMock as ConfigService, prismaMock as unknown as PrismaService);
    questionsService = new QuestionsService(prismaMock as unknown as PrismaService);
    permissionsGuard = new PermissionsGuard(reflector);
    attemptsService = new AttemptsService(prismaMock as unknown as PrismaService);
  });

  // Helper to create mock ExecutionContext
  function createMockExecutionContext(user: any, requiredPermission?: string) {
    const handler = () => {};
    const cls = class TestController {};
    if (requiredPermission) {
      Reflect.defineMetadata(PERMISSION_KEY, requiredPermission, handler);
    }
    return {
      getHandler: () => handler,
      getClass: () => cls,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  // =========================================================================
  // CHECKPOINT 1: Admin configures permissions for DEPT_MANAGER
  // =========================================================================
  describe('Checkpoint 1: Admin configures permissions for DEPT_MANAGER', () => {
    it('1.1 should initially have no permissions assigned to DEPT_MANAGER', async () => {
      const initialPerms = await permissionsService.getRolePermissions(Role.DEPT_MANAGER);
      expect(initialPerms).toEqual([]);
    });

    it('1.2 should allow ADMIN to configure CRUD question permissions for DEPT_MANAGER', async () => {
      const permsToGrant = [
        'perm-q-read',
        'perm-q-create',
        'perm-q-update',
        'perm-q-delete',
      ];

      await permissionsService.updateRolePermissions(Role.DEPT_MANAGER, permsToGrant, 'admin-1');

      const updated = await permissionsService.getRolePermissions(Role.DEPT_MANAGER);
      expect(updated).toHaveLength(4);
      expect(updated.map((p) => `${p.resource}:${p.action}`)).toEqual([
        'questions:read',
        'questions:create',
        'questions:update',
        'questions:delete',
      ]);
    });

    it('1.3 should prevent updating ADMIN permissions (ADMIN always has full access)', async () => {
      await expect(
        permissionsService.updateRolePermissions(Role.ADMIN, ['perm-q-read'], 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('1.4 should reject configuration if invalid permission IDs are provided', async () => {
      await expect(
        permissionsService.updateRolePermissions(
          Role.DEPT_MANAGER,
          ['perm-q-read', 'non-existent-id'],
          'admin-1',
        ),
      ).rejects.toThrow('Một hoặc nhiều quyền được chọn không tồn tại.');
    });
  });

  // =========================================================================
  // CHECKPOINT 2: DEPT_MANAGER logs in & receives permissions in JWT payload
  // =========================================================================
  describe('Checkpoint 2: DEPT_MANAGER authentication & JWT permissions payload', () => {
    beforeEach(async () => {
      // Grant standard permissions to DEPT_MANAGER
      await permissionsService.updateRolePermissions(
        Role.DEPT_MANAGER,
        ['perm-q-read', 'perm-q-create', 'perm-q-update', 'perm-q-delete'],
        'admin-1',
      );
    });

    it('2.1 should populate permissions[] in user payload when DEPT_MANAGER validates token', async () => {
      const validatedUser = await jwtStrategy.validate({
        sub: 'dm-it-1',
        username: 'manager_it',
        role: Role.DEPT_MANAGER,
        sessionId: 'sess-dm-it',
      });

      expect(validatedUser).toBeDefined();
      expect(validatedUser.id).toBe('dm-it-1');
      expect(validatedUser.role).toBe(Role.DEPT_MANAGER);
      expect(validatedUser.departmentId).toBe('dept-it');
      expect(validatedUser.department).toEqual({
        id: 'dept-it',
        code: 'IT',
        name: 'Phòng Công nghệ Thông tin',
      });
      expect(validatedUser.permissions).toEqual([
        'questions:read',
        'questions:create',
        'questions:update',
        'questions:delete',
      ]);
    });

    it('2.2 should return empty permissions[] for standard EMPLOYEE role', async () => {
      const empUser = await jwtStrategy.validate({
        sub: 'emp-1',
        username: 'candidate_1',
        role: Role.EMPLOYEE,
        sessionId: 'sess-emp',
      });

      expect(empUser.role).toBe(Role.EMPLOYEE);
      expect(empUser.permissions).toEqual([]);
    });
  });

  // =========================================================================
  // CHECKPOINT 3: DEPT_MANAGER creating questions has departmentId enforced
  // =========================================================================
  describe('Checkpoint 3: Question creation with enforced department scoping', () => {
    let itManagerUser: any;

    beforeEach(async () => {
      await permissionsService.updateRolePermissions(
        Role.DEPT_MANAGER,
        ['perm-q-read', 'perm-q-create', 'perm-q-update', 'perm-q-delete'],
        'admin-1',
      );
      itManagerUser = await jwtStrategy.validate({
        sub: 'dm-it-1',
        username: 'manager_it',
        role: Role.DEPT_MANAGER,
        sessionId: 'sess-dm-it',
      });
    });

    it('3.1 should enforce question departmentId to manager department even if another departmentId is passed', async () => {
      const createDto = {
        code: 'IT-NEW-01',
        content: 'Câu hỏi mới về Kubernetes',
        departmentId: 'dept-hr', // Attempting to create for HR department!
        options: [
          { key: 'A', content: 'Container orchestration', isCorrect: true },
          { key: 'B', content: 'Database engine', isCorrect: false },
          { key: 'C', content: 'Web browser', isCorrect: false },
          { key: 'D', content: 'Operating system', isCorrect: false },
        ],
      };

      const created = await questionsService.create(createDto as any, itManagerUser, '192.168.1.100');

      expect(created).toBeDefined();
      // Crucial assertion: departmentId MUST be overridden to 'dept-it'
      expect(created.departmentId).toBe('dept-it');
      expect(created.code).toBe('IT-NEW-01');

      // Verify audit log recorded for creation
      const createLog = auditLogs.find((l) => l.action === 'CREATE_QUESTION' && l.entityId === created.id);
      expect(createLog).toBeDefined();
      expect(createLog.userId).toBe('dm-it-1');
      expect(createLog.ipAddress).toBe('192.168.1.100');
    });

    it('3.2 should throw ForbiddenException if manager has no assigned departmentId', async () => {
      const managerWithoutDept = {
        id: 'dm-orphaned',
        username: 'manager_orphaned',
        role: Role.DEPT_MANAGER,
        departmentId: null,
      };

      const createDto = {
        content: 'Câu hỏi mồ côi',
        departmentId: 'dept-it',
        options: [
          { key: 'A', content: 'A', isCorrect: true },
          { key: 'B', content: 'B', isCorrect: false },
          { key: 'C', content: 'C', isCorrect: false },
          { key: 'D', content: 'D', isCorrect: false },
        ],
      };

      await expect(
        questionsService.create(createDto as any, managerWithoutDept, '192.168.1.100'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // CHECKPOINT 4: DEPT_MANAGER listing questions only receives their department
  // =========================================================================
  describe('Checkpoint 4: Question listing data isolation', () => {
    let itManagerUser: any;
    let hrManagerUser: any;

    beforeEach(async () => {
      itManagerUser = await jwtStrategy.validate({
        sub: 'dm-it-1',
        username: 'manager_it',
        role: Role.DEPT_MANAGER,
        sessionId: 'sess-dm-it',
      });
      hrManagerUser = await jwtStrategy.validate({
        sub: 'dm-hr-1',
        username: 'manager_hr',
        role: Role.DEPT_MANAGER,
        sessionId: 'sess-dm-it',
      });
    });

    it('4.1 should return ONLY IT questions for IT department manager', async () => {
      const itResult = await questionsService.findAll(
        { page: 1, limit: 10 } as any,
        itManagerUser,
        '192.168.1.100',
      );

      expect(itResult.data.length).toBeGreaterThan(0);
      itResult.data.forEach((q: any) => {
        expect(q.departmentId).toBe('dept-it');
      });
      expect(itResult.data.some((q: any) => q.departmentId === 'dept-hr')).toBe(false);
    });

    it('4.2 should return ONLY HR questions for HR department manager', async () => {
      const hrResult = await questionsService.findAll(
        { page: 1, limit: 10 } as any,
        hrManagerUser,
        '192.168.1.101',
      );

      expect(hrResult.data.length).toBeGreaterThan(0);
      hrResult.data.forEach((q: any) => {
        expect(q.departmentId).toBe('dept-hr');
      });
      expect(hrResult.data.some((q: any) => q.departmentId === 'dept-it')).toBe(false);
    });

    it('4.3 should ignore query.departmentId if DEPT_MANAGER tries to query another department', async () => {
      // IT manager explicitly supplies departmentId: 'dept-hr' in query parameters
      const result = await questionsService.findAll(
        { page: 1, limit: 10, departmentId: 'dept-hr' } as any,
        itManagerUser,
        '192.168.1.100',
      );

      // System must still enforce dept-it
      result.data.forEach((q: any) => {
        expect(q.departmentId).toBe('dept-it');
      });
    });

    it('4.4 should allow ADMIN to view questions across all departments', async () => {
      const adminUser = {
        id: 'admin-1',
        username: 'sysadmin',
        role: Role.ADMIN,
      };

      const result = await questionsService.findAll({ page: 1, limit: 10 } as any, adminUser);
      const departmentIds = result.data.map((q: any) => q.departmentId);
      expect(departmentIds).toContain('dept-it');
      expect(departmentIds).toContain('dept-hr');
    });
  });

  // =========================================================================
  // CHECKPOINT 5: DEPT_MANAGER forbidden from accessing another department's question
  // =========================================================================
  describe('Checkpoint 5: Cross-department access prevention (Read, Update, Delete)', () => {
    let itManagerUser: any;

    beforeEach(async () => {
      itManagerUser = await jwtStrategy.validate({
        sub: 'dm-it-1',
        username: 'manager_it',
        role: Role.DEPT_MANAGER,
        sessionId: 'sess-dm-it',
      });
    });

    it('5.1 should reject findOne on another department question with ForbiddenException', async () => {
      // 'q-hr-seed' belongs to dept-hr
      await expect(
        questionsService.findOne('q-hr-seed', itManagerUser, '192.168.1.100'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        questionsService.findOne('q-hr-seed', itManagerUser, '192.168.1.100'),
      ).rejects.toThrow('Bạn không có quyền truy cập câu hỏi của phòng ban khác.');
    });

    it('5.2 should allow findOne on own department question', async () => {
      // 'q-it-seed' belongs to dept-it
      const question = await questionsService.findOne('q-it-seed', itManagerUser, '192.168.1.100');
      expect(question).toBeDefined();
      expect(question.id).toBe('q-it-seed');
      expect(question.departmentId).toBe('dept-it');
    });

    it('5.3 should reject update on another department question with ForbiddenException', async () => {
      const updateDto = {
        content: 'Nội dung cập nhật trái phép',
      };

      await expect(
        questionsService.update('q-hr-seed', updateDto as any, itManagerUser, '192.168.1.100'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('5.4 should reject delete on another department question with ForbiddenException', async () => {
      await expect(
        questionsService.delete('q-hr-seed', itManagerUser, '192.168.1.100'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        questionsService.delete('q-hr-seed', itManagerUser, '192.168.1.100'),
      ).rejects.toThrow('Bạn không có quyền truy cập câu hỏi của phòng ban khác.');
    });
  });

  // =========================================================================
  // CHECKPOINT 6: Admin revoking permission causes PermissionsGuard to reject with 403
  // =========================================================================
  describe('Checkpoint 6: Dynamic permission revocation & PermissionsGuard enforcement', () => {
    beforeEach(async () => {
      await permissionsService.updateRolePermissions(
        Role.DEPT_MANAGER,
        ['perm-q-read', 'perm-q-create', 'perm-q-update'],
        'admin-1',
      );
    });

    it('6.1 should allow action when permission is currently granted', async () => {
      // Admin grants read, create, update, delete
      await permissionsService.updateRolePermissions(
        Role.DEPT_MANAGER,
        ['perm-q-read', 'perm-q-create', 'perm-q-update', 'perm-q-delete'],
        'admin-1',
      );

      const managerUser = await jwtStrategy.validate({
        sub: 'dm-it-1',
        username: 'manager_it',
        role: Role.DEPT_MANAGER,
        sessionId: 'sess-dm-it',
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('questions:delete');
      const ctx = createMockExecutionContext(managerUser, 'questions:delete');

      expect(permissionsGuard.canActivate(ctx)).toBe(true);
    });

    it('6.2 should reject action with 403 Forbidden after Admin revokes questions:delete', async () => {
      // Admin revokes 'perm-q-delete', leaving only read, create, update
      await permissionsService.updateRolePermissions(
        Role.DEPT_MANAGER,
        ['perm-q-read', 'perm-q-create', 'perm-q-update'],
        'admin-1',
      );

      // Manager re-authenticates / validates token
      const managerUser = await jwtStrategy.validate({
        sub: 'dm-it-1',
        username: 'manager_it',
        role: Role.DEPT_MANAGER,
        sessionId: 'sess-dm-it',
      });

      expect(managerUser.permissions).not.toContain('questions:delete');
      expect(managerUser.permissions).toContain('questions:read');

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('questions:delete');
      const deleteCtx = createMockExecutionContext(managerUser, 'questions:delete');

      expect(() => permissionsGuard.canActivate(deleteCtx)).toThrow(ForbiddenException);
      expect(() => permissionsGuard.canActivate(deleteCtx)).toThrow(
        'Bạn không có quyền thực hiện chức năng này (questions:delete).',
      );
    });

    it('6.3 should still allow other granted permissions (e.g. questions:create)', async () => {
      const managerUser = await jwtStrategy.validate({
        sub: 'dm-it-1',
        username: 'manager_it',
        role: Role.DEPT_MANAGER,
        sessionId: 'sess-dm-it',
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('questions:create');
      const createCtx = createMockExecutionContext(managerUser, 'questions:create');

      expect(permissionsGuard.canActivate(createCtx)).toBe(true);
    });

    it('6.4 should allow ADMIN to perform questions:delete unconditionally without explicit permission', async () => {
      const adminUser = {
        id: 'admin-1',
        username: 'sysadmin',
        role: Role.ADMIN,
        permissions: [],
      };

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('questions:delete');
      const adminCtx = createMockExecutionContext(adminUser, 'questions:delete');

      expect(permissionsGuard.canActivate(adminCtx)).toBe(true);
    });
  });

  // =========================================================================
  // CHECKPOINT 7: Audit log operations (Client IP, User ID, and SYSTEM_AUTO_SUBMIT)
  // =========================================================================
  describe('Checkpoint 7: Audit log verification (Client IP, User ID & SYSTEM_AUTO_SUBMIT)', () => {
    it('7.1 should record caller userId and real clientIp on user operations (e.g. question update & delete)', async () => {
      const itManagerUser = await jwtStrategy.validate({
        sub: 'dm-it-1',
        username: 'manager_it',
        role: Role.DEPT_MANAGER,
        sessionId: 'sess-dm-it',
      });

      const clientIp = '103.21.244.15';
      await questionsService.update(
        'q-it-seed',
        { content: 'Nội dung IT đã chỉnh sửa' } as any,
        itManagerUser,
        clientIp,
      );

      const updateLog = auditLogs.find(
        (l) => l.action === 'UPDATE_QUESTION' && l.entityId === 'q-it-seed',
      );
      expect(updateLog).toBeDefined();
      expect(updateLog.userId).toBe('dm-it-1');
      expect(updateLog.ipAddress).toBe(clientIp);
    });

    it('7.2 should accurately log SUBMIT_EXAM with candidate userId and clientIp', async () => {
      const candidateUserId = 'emp-1';
      const clientIp = '172.16.0.42';

      // Seed an in-progress exam attempt
      const attemptId = 'att-normal-submit';
      examAttempts.push({
        id: attemptId,
        examId: 'exam-1',
        userId: candidateUserId,
        status: AttemptStatus.IN_PROGRESS,
        startedAt: new Date(Date.now() - 5 * 60 * 1000),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        tabSwitchCount: 0,
        exam: exams[0],
        questions: [
          {
            id: 'aq-1',
            attemptId,
            questionId: 'q-it-seed',
            position: 1,
            questionCodeSnapshot: 'IT-Q001',
            contentSnapshot: 'Câu hỏi IT',
            optionsSnapshot: [],
            selectedOptionKey: 'A',
            correctOptionKeySnapshot: 'A',
          },
        ],
      });

      await attemptsService.submitAttempt(attemptId, candidateUserId, clientIp);

      const submitLog = auditLogs.find(
        (l) => l.action === 'SUBMIT_EXAM' && l.details?.attemptId === attemptId,
      );
      expect(submitLog).toBeDefined();
      expect(submitLog.userId).toBe(candidateUserId);
      expect(submitLog.ipAddress).toBe(clientIp);
      expect(submitLog.entity).toBe('Exam');
      expect(submitLog.entityId).toBe('exam-1');
    });

    it('7.3 should record SYSTEM_AUTO_SUBMIT with userId=null and ipAddress=SYSTEM when attempt expires', async () => {
      const candidateUserId = 'emp-1';
      const expiredAttemptId = 'att-expired-auto';

      // Seed an expired attempt (expiresAt in past)
      examAttempts.push({
        id: expiredAttemptId,
        examId: 'exam-1',
        userId: candidateUserId,
        status: AttemptStatus.IN_PROGRESS,
        startedAt: new Date(Date.now() - 30 * 60 * 1000),
        expiresAt: new Date(Date.now() - 5 * 60 * 1000), // Expired 5 minutes ago!
        tabSwitchCount: 0,
        exam: exams[0],
        questions: [
          {
            id: 'aq-expired-1',
            attemptId: expiredAttemptId,
            questionId: 'q-it-seed',
            position: 1,
            questionCodeSnapshot: 'IT-Q001',
            contentSnapshot: 'Câu hỏi IT',
            optionsSnapshot: [],
            selectedOptionKey: null,
            correctOptionKeySnapshot: 'A',
          },
        ],
      });

      // System or user checks result -> triggers auto-submit for expired attempt
      await attemptsService.getResult(expiredAttemptId, candidateUserId);

      const autoSubmitLog = auditLogs.find(
        (l) => l.action === 'SYSTEM_AUTO_SUBMIT' && l.details?.attemptId === expiredAttemptId,
      );

      expect(autoSubmitLog).toBeDefined();
      expect(autoSubmitLog.userId).toBeNull();
      expect(autoSubmitLog.ipAddress).toBe('SYSTEM');
      expect(autoSubmitLog.entity).toBe('Exam');
      expect(autoSubmitLog.entityId).toBe('exam-1');
      expect(autoSubmitLog.details.reason).toBe('Đã hết giờ làm bài');
      expect(autoSubmitLog.details.status).toBe(AttemptStatus.EXPIRED);
    });

    it('7.4 should record TAB_SWITCH_VIOLATION and SYSTEM_AUTO_SUBMIT when candidate exceeds max tab switches', async () => {
      const candidateUserId = 'emp-1';
      const tabViolationAttemptId = 'att-tab-violation';
      const clientIp = '113.161.45.88';

      // Exam allows max 1 tab switch; current tabSwitchCount is 1
      examAttempts.push({
        id: tabViolationAttemptId,
        examId: 'exam-1',
        userId: candidateUserId,
        status: AttemptStatus.IN_PROGRESS,
        startedAt: new Date(Date.now() - 5 * 60 * 1000),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        tabSwitchCount: 1, // Next tab switch will reach 2 > maxTabSwitches (1)
        exam: {
          ...exams[0],
          tabDetectionEnabled: true,
          autoSubmitOnViolate: true,
          maxTabSwitches: 1,
        },
        questions: [
          {
            id: 'aq-tab-1',
            attemptId: tabViolationAttemptId,
            questionId: 'q-it-seed',
            position: 1,
            questionCodeSnapshot: 'IT-Q001',
            contentSnapshot: 'Câu hỏi IT',
            optionsSnapshot: [],
            selectedOptionKey: 'A',
            correctOptionKeySnapshot: 'A',
          },
        ],
      });

      const response = await attemptsService.recordTabSwitch(
        tabViolationAttemptId,
        { reason: 'Rời khỏi trình duyệt để tra cứu' },
        candidateUserId,
        clientIp,
      );

      expect(response.autoSubmitted).toBe(true);

      // Verify TAB_SWITCH_VIOLATION audit log
      const violationLog = auditLogs.find(
        (l) => l.action === 'TAB_SWITCH_VIOLATION' && l.entityId === tabViolationAttemptId,
      );
      expect(violationLog).toBeDefined();
      expect(violationLog.userId).toBe(candidateUserId);
      expect(violationLog.ipAddress).toBe(clientIp);

      // Verify SYSTEM_AUTO_SUBMIT audit log
      const autoSubmitLog = auditLogs.find(
        (l) => l.action === 'SYSTEM_AUTO_SUBMIT' && l.details?.attemptId === tabViolationAttemptId,
      );
      expect(autoSubmitLog).toBeDefined();
      expect(autoSubmitLog.userId).toBeNull();
      expect(autoSubmitLog.ipAddress).toBe('SYSTEM');
      expect(autoSubmitLog.details.status).toBe(AttemptStatus.AUTO_SUBMITTED);
    });
  });
});
