import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Role, QuestionStatus } from '@prisma/client';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { PrismaService } from '../../prisma/prisma.service';

describe('Questions Data Isolation & Permissions', () => {
  let service: QuestionsService;
  let controller: QuestionsController;
  let prismaMock: any;

  const adminUser = {
    id: 'admin-1',
    username: 'admin',
    role: Role.ADMIN,
    departmentId: null,
  };

  const techDeptManager = {
    id: 'dm-tech-1',
    username: 'tech_manager',
    role: Role.DEPT_MANAGER,
    departmentId: 'dept-tech',
  };

  const salesDeptManager = {
    id: 'dm-sales-1',
    username: 'sales_manager',
    role: Role.DEPT_MANAGER,
    departmentId: 'dept-sales',
  };

  const managerWithoutDept = {
    id: 'dm-no-dept',
    username: 'manager_no_dept',
    role: Role.DEPT_MANAGER,
    departmentId: null,
  };

  const mockTechQuestion = {
    id: 'q-tech-1',
    code: 'TECH-Q001',
    content: 'Câu hỏi Công nghệ',
    departmentId: 'dept-tech',
    status: QuestionStatus.ACTIVE,
    department: { id: 'dept-tech', code: 'TECH', name: 'Phòng Công nghệ' },
    options: [
      { id: 'opt-1', key: 'A', content: 'A', isCorrect: true },
      { id: 'opt-2', key: 'B', content: 'B', isCorrect: false },
      { id: 'opt-3', key: 'C', content: 'C', isCorrect: false },
      { id: 'opt-4', key: 'D', content: 'D', isCorrect: false },
    ],
    _count: { attemptQuestions: 0 },
  };

  const mockSalesQuestion = {
    id: 'q-sales-1',
    code: 'SALES-Q001',
    content: 'Câu hỏi Kinh doanh',
    departmentId: 'dept-sales',
    status: QuestionStatus.ACTIVE,
    department: { id: 'dept-sales', code: 'SALES', name: 'Phòng Kinh doanh' },
    options: [
      { id: 'opt-5', key: 'A', content: 'A', isCorrect: true },
      { id: 'opt-6', key: 'B', content: 'B', isCorrect: false },
      { id: 'opt-7', key: 'C', content: 'C', isCorrect: false },
      { id: 'opt-8', key: 'D', content: 'D', isCorrect: false },
    ],
    _count: { attemptQuestions: 0 },
  };

  beforeEach(() => {
    prismaMock = {
      question: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      questionOption: {
        create: jest.fn(),
        upsert: jest.fn(),
      },
      department: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((callback) => callback(prismaMock)),
    };

    service = new QuestionsService(prismaMock as PrismaService);
    controller = new QuestionsController(service);
  });

  describe('findAll Data Isolation', () => {
    it('DEPT_MANAGER can only list questions of their department', async () => {
      prismaMock.question.findMany.mockResolvedValue([mockTechQuestion]);
      prismaMock.question.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 }, techDeptManager);

      expect(prismaMock.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { departmentId: 'dept-tech' },
        }),
      );
      expect(prismaMock.question.count).toHaveBeenCalledWith({
        where: { departmentId: 'dept-tech' },
      });
      expect(result.data).toEqual([mockTechQuestion]);
      expect(result.total).toBe(1);
    });

    it('DEPT_MANAGER cannot override department filter in query', async () => {
      prismaMock.question.findMany.mockResolvedValue([mockTechQuestion]);
      prismaMock.question.count.mockResolvedValue(1);

      await service.findAll({ page: 1, limit: 10, departmentId: 'dept-sales' }, techDeptManager);

      expect(prismaMock.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { departmentId: 'dept-tech' },
        }),
      );
    });

    it('DEPT_MANAGER without department throws ForbiddenException', async () => {
      await expect(service.findAll({}, managerWithoutDept)).rejects.toThrow(ForbiddenException);
      await expect(service.findAll({}, managerWithoutDept)).rejects.toThrow(
        'Tài khoản quản lý chưa được gán phòng ban trực thuộc.',
      );
    });

    it('ADMIN can list questions across all departments when no departmentId is queried', async () => {
      prismaMock.question.findMany.mockResolvedValue([mockTechQuestion, mockSalesQuestion]);
      prismaMock.question.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 }, adminUser);

      expect(prismaMock.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
      expect(result.total).toBe(2);
    });

    it('ADMIN can optionally filter by specific departmentId', async () => {
      prismaMock.question.findMany.mockResolvedValue([mockSalesQuestion]);
      prismaMock.question.count.mockResolvedValue(1);

      await service.findAll({ page: 1, limit: 10, departmentId: 'dept-sales' }, adminUser);

      expect(prismaMock.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { departmentId: 'dept-sales' },
        }),
      );
    });
  });

  describe('findOne Data Isolation', () => {
    it('DEPT_MANAGER can view a question of their department', async () => {
      prismaMock.question.findUnique.mockResolvedValue(mockTechQuestion);

      const result = await service.findOne('q-tech-1', techDeptManager);

      expect(result).toEqual(mockTechQuestion);
      expect(prismaMock.question.findUnique).toHaveBeenCalledWith({
        where: { id: 'q-tech-1' },
        include: expect.any(Object),
      });
    });

    it('DEPT_MANAGER cannot view a question of another department', async () => {
      prismaMock.question.findUnique.mockResolvedValue(mockSalesQuestion);

      await expect(service.findOne('q-sales-1', techDeptManager)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findOne('q-sales-1', techDeptManager)).rejects.toThrow(
        'Bạn không có quyền truy cập câu hỏi của phòng ban khác.',
      );
    });

    it('ADMIN can view questions of any department', async () => {
      prismaMock.question.findUnique.mockResolvedValue(mockSalesQuestion);

      const result = await service.findOne('q-sales-1', adminUser);

      expect(result).toEqual(mockSalesQuestion);
    });

    it('throws NotFoundException when question does not exist', async () => {
      prismaMock.question.findUnique.mockResolvedValue(null);

      await expect(service.findOne('q-non-existent', techDeptManager)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create Data Isolation & Audit Logging', () => {
    const getCreateDto = () => ({
      content: 'Nội dung câu hỏi mới',
      departmentId: 'dept-sales',
      options: [
        { key: 'A', content: 'Opt A', isCorrect: true },
        { key: 'B', content: 'Opt B', isCorrect: false },
        { key: 'C', content: 'Opt C', isCorrect: false },
        { key: 'D', content: 'Opt D', isCorrect: false },
      ],
    });

    it('forces DEPT_MANAGER question to their own department and writes audit log', async () => {
      const createDto = getCreateDto();
      const createdQuestion = {
        id: 'q-new-1',
        code: 'TECH-Q123',
        content: createDto.content,
        departmentId: 'dept-tech',
        status: QuestionStatus.ACTIVE,
      };
      prismaMock.department.findUnique.mockResolvedValue({ id: 'dept-tech', code: 'TECH' });
      prismaMock.question.findUnique
        .mockResolvedValueOnce(null) // code check
        .mockResolvedValueOnce(createdQuestion); // return created
      prismaMock.question.create.mockResolvedValue(createdQuestion);

      const result = await service.create(createDto, techDeptManager, '192.168.1.100');

      expect(prismaMock.department.findUnique).toHaveBeenCalledWith({
        where: { id: 'dept-tech' },
      });
      expect(prismaMock.question.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            departmentId: 'dept-tech',
          }),
        }),
      );
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'dm-tech-1',
          ipAddress: '192.168.1.100',
          action: 'CREATE_QUESTION',
        }),
      });
      expect(result).toEqual(createdQuestion);
    });

    it('ADMIN can create question for any department', async () => {
      const createDto = getCreateDto();
      const createdQuestion = {
        id: 'q-new-sales',
        code: 'SALES-Q123',
        content: createDto.content,
        departmentId: 'dept-sales',
        status: QuestionStatus.ACTIVE,
      };
      prismaMock.department.findUnique.mockResolvedValue({ id: 'dept-sales', code: 'SALES' });
      prismaMock.question.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(createdQuestion);
      prismaMock.question.create.mockResolvedValue(createdQuestion);

      await service.create(createDto, adminUser, '127.0.0.1');

      expect(prismaMock.department.findUnique).toHaveBeenCalledWith({
        where: { id: 'dept-sales' },
      });
      expect(prismaMock.question.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            departmentId: 'dept-sales',
          }),
        }),
      );
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'admin-1',
          ipAddress: '127.0.0.1',
          action: 'CREATE_QUESTION',
        }),
      });
    });

    it('DEPT_MANAGER without department cannot create question', async () => {
      await expect(service.create(getCreateDto(), managerWithoutDept)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update Data Isolation & Audit Logging', () => {
    it('DEPT_MANAGER can update a question of their own department', async () => {
      prismaMock.question.findUnique
        .mockResolvedValueOnce(mockTechQuestion) // findOne check
        .mockResolvedValueOnce({ ...mockTechQuestion, content: 'Updated Tech' }); // transaction result

      prismaMock.question.update.mockResolvedValue({
        ...mockTechQuestion,
        content: 'Updated Tech',
      });

      const result = await service.update(
        'q-tech-1',
        { content: 'Updated Tech' },
        techDeptManager,
        '10.0.0.5',
      );

      expect(prismaMock.question.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'q-tech-1' },
          data: expect.objectContaining({ content: 'Updated Tech' }),
        }),
      );
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'dm-tech-1',
          ipAddress: '10.0.0.5',
          action: 'UPDATE_QUESTION',
        }),
      });
    });

    it('DEPT_MANAGER cannot update a question of another department', async () => {
      prismaMock.question.findUnique.mockResolvedValue(mockSalesQuestion);

      await expect(
        service.update('q-sales-1', { content: 'Hack content' }, techDeptManager, '10.0.0.5'),
      ).rejects.toThrow(ForbiddenException);

      expect(prismaMock.question.update).not.toHaveBeenCalled();
    });

    it('DEPT_MANAGER cannot reassign question to another department', async () => {
      prismaMock.question.findUnique.mockResolvedValue(mockTechQuestion);

      await expect(
        service.update(
          'q-tech-1',
          { departmentId: 'dept-sales' },
          techDeptManager,
          '10.0.0.5',
        ),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(
          'q-tech-1',
          { departmentId: 'dept-sales' },
          techDeptManager,
          '10.0.0.5',
        ),
      ).rejects.toThrow('Bạn không có quyền chuyển câu hỏi sang phòng ban khác.');
    });

    it('ADMIN can update question of any department', async () => {
      prismaMock.question.findUnique
        .mockResolvedValueOnce(mockSalesQuestion)
        .mockResolvedValueOnce({ ...mockSalesQuestion, content: 'Admin updated sales' });

      prismaMock.question.update.mockResolvedValue({
        ...mockSalesQuestion,
        content: 'Admin updated sales',
      });

      await service.update(
        'q-sales-1',
        { content: 'Admin updated sales' },
        adminUser,
        '127.0.0.1',
      );

      expect(prismaMock.question.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'q-sales-1' },
          data: expect.objectContaining({ content: 'Admin updated sales' }),
        }),
      );
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'admin-1',
          ipAddress: '127.0.0.1',
          action: 'UPDATE_QUESTION',
        }),
      });
    });
  });

  describe('toggleStatus Data Isolation & Audit Logging', () => {
    it('DEPT_MANAGER can toggle status of their department question', async () => {
      prismaMock.question.findUnique.mockResolvedValue(mockTechQuestion);
      prismaMock.question.update.mockResolvedValue({
        ...mockTechQuestion,
        status: QuestionStatus.INACTIVE,
      });

      const res = await service.toggleStatus('q-tech-1', techDeptManager, '10.0.0.2');

      expect(res.status).toBe(QuestionStatus.INACTIVE);
      expect(prismaMock.question.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'q-tech-1' },
          data: { status: QuestionStatus.INACTIVE },
        }),
      );
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'dm-tech-1',
          ipAddress: '10.0.0.2',
          action: 'TOGGLE_QUESTION_STATUS',
        }),
      });
    });

    it('DEPT_MANAGER cannot toggle status of another department question', async () => {
      prismaMock.question.findUnique.mockResolvedValue(mockSalesQuestion);

      await expect(
        service.toggleStatus('q-sales-1', techDeptManager, '10.0.0.2'),
      ).rejects.toThrow(ForbiddenException);

      expect(prismaMock.question.update).not.toHaveBeenCalled();
    });

    it('ADMIN can toggle status of any question', async () => {
      prismaMock.question.findUnique.mockResolvedValue(mockSalesQuestion);
      prismaMock.question.update.mockResolvedValue({
        ...mockSalesQuestion,
        status: QuestionStatus.INACTIVE,
      });

      await service.toggleStatus('q-sales-1', adminUser, '127.0.0.1');

      expect(prismaMock.question.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'q-sales-1' },
          data: { status: QuestionStatus.INACTIVE },
        }),
      );
    });
  });

  describe('delete Data Isolation & Audit Logging', () => {
    it('DEPT_MANAGER can delete question of their department', async () => {
      prismaMock.question.findUnique.mockResolvedValue(mockTechQuestion);
      prismaMock.question.delete.mockResolvedValue(mockTechQuestion);

      const res = await service.delete('q-tech-1', techDeptManager, '10.0.0.3');

      expect(res.message).toContain('Đã xóa câu hỏi [TECH-Q001] thành công.');
      expect(prismaMock.question.delete).toHaveBeenCalledWith({ where: { id: 'q-tech-1' } });
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'dm-tech-1',
          ipAddress: '10.0.0.3',
          action: 'DELETE_QUESTION',
        }),
      });
    });

    it('DEPT_MANAGER cannot delete question of another department', async () => {
      prismaMock.question.findUnique.mockResolvedValue(mockSalesQuestion);

      await expect(service.delete('q-sales-1', techDeptManager, '10.0.0.3')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.delete('q-sales-1', techDeptManager, '10.0.0.3')).rejects.toThrow(
        'Bạn không có quyền truy cập câu hỏi của phòng ban khác.',
      );

      expect(prismaMock.question.delete).not.toHaveBeenCalled();
    });

    it('ADMIN can delete question in any department', async () => {
      prismaMock.question.findUnique.mockResolvedValue(mockSalesQuestion);
      prismaMock.question.delete.mockResolvedValue(mockSalesQuestion);

      await service.delete('q-sales-1', adminUser, '127.0.0.1');

      expect(prismaMock.question.delete).toHaveBeenCalledWith({ where: { id: 'q-sales-1' } });
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'admin-1',
          ipAddress: '127.0.0.1',
          action: 'DELETE_QUESTION',
        }),
      });
    });
  });

  describe('confirmImport Data Isolation & Audit Logging', () => {
    const validRows = [
      {
        code: 'TECH-Q002',
        departmentCode: 'TECH',
        departmentId: 'dept-tech',
        content: 'Câu hỏi Import 1',
        options: { A: '1', B: '2', C: '3', D: '4' },
        correctKey: 'A' as const,
      },
    ];

    it('DEPT_MANAGER can import questions for their department', async () => {
      prismaMock.question.create.mockResolvedValue({ id: 'q-imp-1' });

      const res = await service.confirmImport(validRows, techDeptManager, '10.0.0.4');

      expect(res.importedCount).toBe(1);
      expect(prismaMock.question.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            departmentId: 'dept-tech',
          }),
        }),
      );
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'dm-tech-1',
          ipAddress: '10.0.0.4',
          action: 'IMPORT_QUESTIONS',
        }),
      });
    });

    it('DEPT_MANAGER cannot import questions belonging to another department', async () => {
      const foreignRows = [
        {
          code: 'SALES-Q002',
          departmentCode: 'SALES',
          departmentId: 'dept-sales',
          content: 'Câu hỏi Import Sales',
          options: { A: '1', B: '2', C: '3', D: '4' },
          correctKey: 'A' as const,
        },
      ];

      await expect(
        service.confirmImport(foreignRows, techDeptManager, '10.0.0.4'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.confirmImport(foreignRows, techDeptManager, '10.0.0.4'),
      ).rejects.toThrow('Bạn không có quyền import câu hỏi cho phòng ban khác.');
    });

    it('ADMIN can import questions for any department', async () => {
      prismaMock.question.create.mockResolvedValue({ id: 'q-imp-2' });

      const mixedRows = [
        {
          code: 'SALES-Q002',
          departmentCode: 'SALES',
          departmentId: 'dept-sales',
          content: 'Câu hỏi Import Sales',
          options: { A: '1', B: '2', C: '3', D: '4' },
          correctKey: 'A' as const,
        },
      ];

      const res = await service.confirmImport(mixedRows, adminUser, '127.0.0.1');

      expect(res.importedCount).toBe(1);
      expect(prismaMock.question.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            departmentId: 'dept-sales',
          }),
        }),
      );
    });
  });

  describe('QuestionsController Client IP & Delegation', () => {
    it('extracts client IP from x-forwarded-for header and forwards to service', async () => {
      const reqMock = {
        headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' },
        ip: '127.0.0.1',
      } as any;

      const spyCreate = jest.spyOn(service, 'create').mockResolvedValue(mockTechQuestion as any);

      await controller.create(
        {
          content: 'New q',
          departmentId: 'dept-tech',
          options: mockTechQuestion.options as any,
        },
        techDeptManager,
        reqMock,
      );

      expect(spyCreate).toHaveBeenCalledWith(
        expect.anything(),
        techDeptManager,
        '203.0.113.195',
      );
    });

    it('falls back to req.ip if x-forwarded-for is missing', async () => {
      const reqMock = {
        headers: {},
        ip: '192.168.1.50',
      } as any;

      const spyDelete = jest
        .spyOn(service, 'delete')
        .mockResolvedValue({ message: 'Deleted' } as any);

      await controller.delete('q-tech-1', techDeptManager, reqMock);

      expect(spyDelete).toHaveBeenCalledWith('q-tech-1', techDeptManager, '192.168.1.50');
    });
  });
});
