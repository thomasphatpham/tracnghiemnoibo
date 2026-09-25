import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { QueryExamsDto } from './dto/query-exams.dto';
import { ExamStatus, QuestionStatus, Role, CandidateScope, AttemptStatus } from '@prisma/client';

export interface CalculatedDepartmentRule {
  departmentId: string;
  percentage: number;
  allocatedCount: number;
}

export function calculateLargestRemainderDistribution(
  rules: { departmentId: string; percentage: number }[],
  totalQuestions: number,
): CalculatedDepartmentRule[] {
  if (!rules || rules.length === 0) {
    throw new BadRequestException('Kỳ thi phải cấu hình tỷ lệ câu hỏi cho ít nhất một phòng ban.');
  }

  const sumPercentage = rules.reduce((acc, r) => acc + Number(r.percentage), 0);
  if (Math.abs(sumPercentage - 100) > 0.05) {
    throw new BadRequestException(
      `Tổng tỷ lệ phân bổ của các phòng ban phải chính xác bằng 100% (hiện tại: ${sumPercentage}%).`,
    );
  }

  // 1. Calculate raw and floor allocation for each department
  const items = rules.map((r) => {
    const percentage = Number(r.percentage);
    const raw = (totalQuestions * percentage) / 100;
    const floor = Math.floor(raw);
    const remainder = raw - floor;
    return {
      departmentId: r.departmentId,
      percentage,
      allocatedCount: floor,
      remainder,
    };
  });

  const sumFloors = items.reduce((acc, item) => acc + item.allocatedCount, 0);
  const remaining = totalQuestions - sumFloors;

  // 2. Distribute remaining questions to departments with largest fractional remainder
  if (remaining > 0) {
    const sorted = [...items].sort((a, b) => {
      if (Math.abs(b.remainder - a.remainder) > 0.000001) {
        return b.remainder - a.remainder;
      }
      return a.departmentId.localeCompare(b.departmentId);
    });

    for (let i = 0; i < remaining; i++) {
      const targetId = sorted[i % sorted.length].departmentId;
      const target = items.find((it) => it.departmentId === targetId);
      if (target) {
        target.allocatedCount += 1;
      }
    }
  }

  // 3. Final verification: Total allocated count must equal totalQuestions
  const finalSum = items.reduce((acc, item) => acc + item.allocatedCount, 0);
  if (finalSum !== totalQuestions) {
    throw new BadRequestException(
      `Lỗi thuật toán phân bổ câu hỏi: Tổng số câu được phân bổ (${finalSum}) không khớp với tổng số câu hỏi (${totalQuestions}).`,
    );
  }

  return items.map(({ departmentId, percentage, allocatedCount }) => ({
    departmentId,
    percentage,
    allocatedCount,
  }));
}

@Injectable()
export class ExamsService {
  private readonly logger = new Logger(ExamsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExamDto, userId?: string) {
    const openAt = new Date(dto.openAt);
    const closeAt = new Date(dto.closeAt);

    if (isNaN(openAt.getTime()) || isNaN(closeAt.getTime())) {
      throw new BadRequestException('Thời gian mở hoặc kết thúc kỳ thi không hợp lệ.');
    }

    if (closeAt <= openAt) {
      throw new BadRequestException('Thời gian kết thúc kỳ thi phải diễn ra sau thời gian mở đề thi.');
    }

    if (dto.passingCorrectAnswers > dto.totalQuestions) {
      throw new BadRequestException('Số câu đúng để đạt không thể lớn hơn tổng số câu hỏi của đề thi.');
    }

    // Calculate largest remainder question distribution
    const calculatedRules = calculateLargestRemainderDistribution(
      dto.departmentRules,
      dto.totalQuestions,
    );

    // Verify departments exist and are active
    for (const rule of calculatedRules) {
      const dept = await this.prisma.department.findUnique({
        where: { id: rule.departmentId },
      });
      if (!dept) {
        throw new NotFoundException(`Phòng ban với ID ${rule.departmentId} không tồn tại.`);
      }
      if (dept.status !== 'ACTIVE') {
        throw new BadRequestException(`Phòng ban "${dept.name}" hiện đang bị tạm ngưng hoạt động.`);
      }
    }

    // Verify candidate scope and assigned entities
    const candidateScope = dto.candidateScope ?? CandidateScope.ALL;
    if (candidateScope === CandidateScope.DEPARTMENTS) {
      if (!dto.assignedDepartmentIds || dto.assignedDepartmentIds.length === 0) {
        throw new BadRequestException('Vui lòng chọn ít nhất một phòng ban tham gia kỳ thi.');
      }
      for (const dId of dto.assignedDepartmentIds) {
        const d = await this.prisma.department.findUnique({ where: { id: dId } });
        if (!d) {
          throw new NotFoundException(`Phòng ban với ID ${dId} không tồn tại.`);
        }
      }
    } else if (candidateScope === CandidateScope.SPECIFIC_USERS) {
      if (!dto.assignedUserIds || dto.assignedUserIds.length === 0) {
        throw new BadRequestException('Vui lòng chọn ít nhất một nhân viên tham gia kỳ thi.');
      }
      for (const uId of dto.assignedUserIds) {
        const u = await this.prisma.user.findUnique({ where: { id: uId } });
        if (!u) {
          throw new NotFoundException(`Nhân viên với ID ${uId} không tồn tại.`);
        }
      }
    }

    // Create Exam in transaction
    const exam = await this.prisma.exam.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        status: ExamStatus.DRAFT,
        openAt,
        closeAt,
        durationMinutes: dto.durationMinutes,
        totalQuestions: dto.totalQuestions,
        passingCorrectAnswers: dto.passingCorrectAnswers,
        shuffleQuestions: dto.shuffleQuestions ?? true,
        shuffleOptions: dto.shuffleOptions ?? true,
        autosaveEnabled: dto.autosaveEnabled ?? true,
        tabDetectionEnabled: dto.tabDetectionEnabled ?? true,
        maxTabSwitches: dto.maxTabSwitches ?? 3,
        autoSubmitOnViolate: dto.autoSubmitOnViolate ?? true,
        showScoreAfterSubmit: dto.showScoreAfterSubmit ?? true,
        showCorrectAnswersAfterSubmit: dto.showCorrectAnswersAfterSubmit ?? false,
        maxAttempts: dto.maxAttempts ?? 1,
        candidateScope,
        departmentRules: {
          create: calculatedRules.map((r) => ({
            departmentId: r.departmentId,
            percentage: r.percentage,
            allocatedCount: r.allocatedCount,
          })),
        },
        assignedDepartments:
          candidateScope === CandidateScope.DEPARTMENTS && dto.assignedDepartmentIds?.length
            ? {
                create: dto.assignedDepartmentIds.map((dId) => ({ departmentId: dId })),
              }
            : undefined,
        assignedUsers:
          candidateScope === CandidateScope.SPECIFIC_USERS && dto.assignedUserIds?.length
            ? {
                create: dto.assignedUserIds.map((uId) => ({ userId: uId })),
              }
            : undefined,
      },
      include: {
        departmentRules: {
          include: {
            department: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        assignedDepartments: {
          include: {
            department: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        assignedUsers: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true, username: true },
            },
          },
        },
      },
    });

    // Write audit log
    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'CREATE_EXAM',
          entity: 'Exam',
          entityId: exam.id,
          details: {
            name: exam.name,
            totalQuestions: exam.totalQuestions,
            openAt: exam.openAt,
            closeAt: exam.closeAt,
            departmentRules: calculatedRules,
          } as any,
        },
      });
    }

    return exam;
  }

  async findAll(query: QueryExamsDto, user: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (user.role === Role.EMPLOYEE) {
      // Employees: Chỉ thấy các kỳ thi PUBLISHED được phân công và CHƯA HẾT HẠN (closeAt >= now)
      const now = new Date();
      where.status = ExamStatus.PUBLISHED;
      where.closeAt = { gte: now }; // ẨN HOÀN TOÀN CÁC KỲ THI ĐÃ HẾT HẠN
      const userDeptId = user.departmentId;
      const userId = user.id;

      where.OR = [
        { candidateScope: CandidateScope.ALL },
        ...(userDeptId
          ? [
              {
                candidateScope: CandidateScope.DEPARTMENTS,
                assignedDepartments: {
                  some: { departmentId: userDeptId },
                },
              },
            ]
          : []),
        {
          candidateScope: CandidateScope.SPECIFIC_USERS,
          assignedUsers: {
            some: { userId: userId },
          },
        },
      ];
    } else {
      // Admin filters
      if (query.status) {
        where.status = query.status;
      }
    }

    if (query.search) {
      where.name = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.exam.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          departmentRules: {
            include: {
              department: {
                select: { id: true, code: true, name: true },
              },
            },
          },
          assignedDepartments: {
            include: {
              department: {
                select: { id: true, code: true, name: true },
              },
            },
          },
          assignedUsers: {
            include: {
              user: {
                select: { id: true, fullName: true, email: true, username: true },
              },
            },
          },
          _count: {
            select: {
              attempts: true,
            },
          },
        },
      }),
      this.prisma.exam.count({ where }),
    ]);

    // Tối ưu hóa: gom nhóm số lượng vi phạm
    const examIds = data.map((e) => e.id);
    const violationGroups = examIds.length > 0
      ? await this.prisma.examAttempt.groupBy({
          by: ['examId'],
          where: {
            examId: { in: examIds },
            OR: [
              { status: AttemptStatus.AUTO_SUBMITTED },
              { tabSwitchCount: { gt: 0 } },
            ],
          },
          _count: { id: true },
        })
      : [];

    const violationMap = new Map<string, number>();
    for (const g of violationGroups) {
      violationMap.set(g.examId, g._count.id);
    }

    // Đếm số lượt làm bài đã hoàn thành hoặc đang làm của chính thí sinh này
    const userAttemptMap = new Map<string, number>();
    if (user.role === Role.EMPLOYEE && examIds.length > 0) {
      const userAttemptGroups = await this.prisma.examAttempt.groupBy({
        by: ['examId'],
        where: {
          examId: { in: examIds },
          userId: user.id,
        },
        _count: { id: true },
      });
      for (const g of userAttemptGroups) {
        userAttemptMap.set(g.examId, g._count.id);
      }
    }

    const dataWithViolations = data.map((exam) => {
      const userAttemptsCount = userAttemptMap.get(exam.id) || 0;
      const isOutOfAttempts = user.role === Role.EMPLOYEE ? userAttemptsCount >= (exam.maxAttempts || 1) : false;

      return {
        ...exam,
        violationCount: violationMap.get(exam.id) || 0,
        userAttemptsCount,
        isOutOfAttempts,
      };
    });

    return {
      data: dataWithViolations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user?: any) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        departmentRules: {
          include: {
            department: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        assignedDepartments: {
          include: {
            department: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        assignedUsers: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true, username: true },
            },
          },
        },
        _count: {
          select: { attempts: true },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Kỳ thi không tồn tại.');
    }

    // Attach active questions availability check
    const availability = await Promise.all(
      exam.departmentRules.map(async (r) => {
        const activeCount = await this.prisma.question.count({
          where: {
            departmentId: r.departmentId,
            status: QuestionStatus.ACTIVE,
          },
        });
        return {
          departmentId: r.departmentId,
          departmentCode: r.department.code,
          departmentName: r.department.name,
          allocatedCount: r.allocatedCount,
          percentage: r.percentage,
          availableActiveQuestions: activeCount,
          isSufficient: activeCount >= r.allocatedCount,
        };
      }),
    );

    const isReadyToPublish = availability.every((a) => a.isSufficient);

    // Tính toán số lượt thi của user hiện tại
    let userAttemptsCount = 0;
    let isOutOfAttempts = false;
    if (user && user.role === Role.EMPLOYEE) {
      userAttemptsCount = await this.prisma.examAttempt.count({
        where: {
          examId: id,
          userId: user.id,
        },
      });
      isOutOfAttempts = userAttemptsCount >= (exam.maxAttempts || 1);
    }

    return {
      ...exam,
      availability,
      isReadyToPublish,
      userAttemptsCount,
      isOutOfAttempts,
    };
  }

  async checkAvailability(id: string) {
    const exam = await this.findOne(id);
    return {
      examId: exam.id,
      examName: exam.name,
      status: exam.status,
      availability: exam.availability,
      isReadyToPublish: exam.isReadyToPublish,
    };
  }

  async update(id: string, dto: UpdateExamDto, userId?: string) {
    const existing = await this.prisma.exam.findUnique({
      where: { id },
      include: { departmentRules: true },
    });

    if (!existing) {
      throw new NotFoundException('Kỳ thi không tồn tại.');
    }

    if (existing.status !== ExamStatus.DRAFT) {
      throw new BadRequestException('Chỉ có thể chỉnh sửa cấu hình kỳ thi khi đang ở trạng thái DRAFT (Bản nháp).');
    }

    const openAt = dto.openAt ? new Date(dto.openAt) : existing.openAt;
    const closeAt = dto.closeAt ? new Date(dto.closeAt) : existing.closeAt;

    if (closeAt <= openAt) {
      throw new BadRequestException('Thời gian kết thúc kỳ thi phải diễn ra sau thời gian mở đề thi.');
    }

    const totalQuestions = dto.totalQuestions ?? existing.totalQuestions;
    const passingCorrectAnswers = dto.passingCorrectAnswers ?? existing.passingCorrectAnswers;

    if (passingCorrectAnswers > totalQuestions) {
      throw new BadRequestException('Số câu đúng để đạt không thể lớn hơn tổng số câu hỏi.');
    }

    let calculatedRules: CalculatedDepartmentRule[] | undefined;
    if (dto.departmentRules) {
      calculatedRules = calculateLargestRemainderDistribution(
        dto.departmentRules,
        totalQuestions,
      );

      for (const rule of calculatedRules) {
        const dept = await this.prisma.department.findUnique({
          where: { id: rule.departmentId },
        });
        if (!dept || dept.status !== 'ACTIVE') {
          throw new BadRequestException(`Phòng ban ${rule.departmentId} không hợp lệ hoặc đang bị tạm dừng.`);
        }
      }
    }

    const targetScope = dto.candidateScope !== undefined ? dto.candidateScope : existing.candidateScope;
    if (targetScope === CandidateScope.DEPARTMENTS && dto.assignedDepartmentIds) {
      if (dto.assignedDepartmentIds.length === 0) {
        throw new BadRequestException('Vui lòng chọn ít nhất một phòng ban tham gia kỳ thi.');
      }
      for (const dId of dto.assignedDepartmentIds) {
        const d = await this.prisma.department.findUnique({ where: { id: dId } });
        if (!d) throw new NotFoundException(`Phòng ban với ID ${dId} không tồn tại.`);
      }
    } else if (targetScope === CandidateScope.SPECIFIC_USERS && dto.assignedUserIds) {
      if (dto.assignedUserIds.length === 0) {
        throw new BadRequestException('Vui lòng chọn ít nhất một nhân viên tham gia kỳ thi.');
      }
      for (const uId of dto.assignedUserIds) {
        const u = await this.prisma.user.findUnique({ where: { id: uId } });
        if (!u) throw new NotFoundException(`Nhân viên với ID ${uId} không tồn tại.`);
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (calculatedRules) {
        await tx.examDepartmentRule.deleteMany({ where: { examId: id } });
        await tx.examDepartmentRule.createMany({
          data: calculatedRules.map((r) => ({
            examId: id,
            departmentId: r.departmentId,
            percentage: r.percentage,
            allocatedCount: r.allocatedCount,
          })),
        });
      }

      if (dto.candidateScope !== undefined || dto.assignedDepartmentIds !== undefined || dto.assignedUserIds !== undefined) {
        await tx.examAssignedDepartment.deleteMany({ where: { examId: id } });
        await tx.examAssignedUser.deleteMany({ where: { examId: id } });

        if (targetScope === CandidateScope.DEPARTMENTS && dto.assignedDepartmentIds?.length) {
          await tx.examAssignedDepartment.createMany({
            data: dto.assignedDepartmentIds.map((dId) => ({ examId: id, departmentId: dId })),
          });
        } else if (targetScope === CandidateScope.SPECIFIC_USERS && dto.assignedUserIds?.length) {
          await tx.examAssignedUser.createMany({
            data: dto.assignedUserIds.map((uId) => ({ examId: id, userId: uId })),
          });
        }
      }

      return tx.exam.update({
        where: { id },
        data: {
          name: dto.name ? dto.name.trim() : undefined,
          description: dto.description !== undefined ? dto.description.trim() || null : undefined,
          openAt,
          closeAt,
          durationMinutes: dto.durationMinutes,
          totalQuestions,
          passingCorrectAnswers,
          shuffleQuestions: dto.shuffleQuestions,
          shuffleOptions: dto.shuffleOptions,
          autosaveEnabled: dto.autosaveEnabled,
          tabDetectionEnabled: dto.tabDetectionEnabled,
          maxTabSwitches: dto.maxTabSwitches,
          autoSubmitOnViolate: dto.autoSubmitOnViolate,
          showScoreAfterSubmit: dto.showScoreAfterSubmit,
          showCorrectAnswersAfterSubmit: dto.showCorrectAnswersAfterSubmit,
          maxAttempts: dto.maxAttempts,
          candidateScope: dto.candidateScope,
        },
        include: {
          departmentRules: {
            include: {
              department: { select: { id: true, code: true, name: true } },
            },
          },
          assignedDepartments: {
            include: {
              department: { select: { id: true, code: true, name: true } },
            },
          },
          assignedUsers: {
            include: {
              user: { select: { id: true, fullName: true, email: true, username: true } },
            },
          },
        },
      });
    });

    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'UPDATE_EXAM',
          entity: 'Exam',
          entityId: id,
          details: { updatedFields: Object.keys(dto) },
        },
      });
    }

    return updated;
  }

  async publish(id: string, userId?: string) {
    const exam = await this.findOne(id);

    if (exam.status !== ExamStatus.DRAFT) {
      throw new BadRequestException('Chỉ có thể công bố kỳ thi đang ở trạng thái DRAFT (Bản nháp).');
    }

    if (!exam.isReadyToPublish) {
      const deficientDepts = exam.availability
        .filter((a) => !a.isSufficient)
        .map((a) => `• Phòng ban ${a.departmentName}: có ${a.availableActiveQuestions} câu hoạt động, cần ${a.allocatedCount} câu.`)
        .join('\n');

      throw new BadRequestException(
        `Không thể công bố kỳ thi vì ngân hàng câu hỏi không đủ số lượng câu hỏi hoạt động theo phân bổ:\n${deficientDepts}`,
      );
    }

    const published = await this.prisma.exam.update({
      where: { id },
      data: { status: ExamStatus.PUBLISHED },
      include: {
        departmentRules: {
          include: {
            department: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'PUBLISH_EXAM',
          entity: 'Exam',
          entityId: id,
          details: { status: ExamStatus.PUBLISHED },
        },
      });
    }

    return published;
  }

  async revertToDraft(id: string, userId?: string) {
    const exam = await this.findOne(id);

    if (exam.status !== ExamStatus.PUBLISHED) {
      throw new BadRequestException('Chỉ có thể chuyển về bản nháp các kỳ thi đang ở trạng thái CÔNG BỐ (PUBLISHED).');
    }

    // Kiểm tra xem hiện tại có thí sinh nào đang trực tiếp làm bài thi không
    const inProgressCount = await this.prisma.examAttempt.count({
      where: {
        examId: id,
        status: AttemptStatus.IN_PROGRESS,
      },
    });

    if (inProgressCount > 0) {
      throw new BadRequestException(
        `Hiện đang có ${inProgressCount} thí sinh đang trực tiếp làm bài thi này. Vui lòng đợi các thí sinh hoàn thành hoặc nộp bài trước khi chuyển về bản nháp.`,
      );
    }

    const updated = await this.prisma.exam.update({
      where: { id },
      data: { status: ExamStatus.DRAFT },
      include: {
        departmentRules: {
          include: {
            department: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'REVERT_EXAM_TO_DRAFT',
          entity: 'Exam',
          entityId: id,
          details: { previousStatus: ExamStatus.PUBLISHED, status: ExamStatus.DRAFT },
        },
      });
    }

    return updated;
  }

  async delete(id: string, userId?: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: { _count: { select: { attempts: true } } },
    });

    if (!exam) {
      throw new NotFoundException('Kỳ thi không tồn tại.');
    }

    if (exam.status !== ExamStatus.DRAFT) {
      throw new BadRequestException('Chỉ có thể xóa kỳ thi đang ở trạng thái DRAFT (Bản nháp).');
    }

    if (exam._count.attempts > 0) {
      throw new BadRequestException('Không thể xóa kỳ thi đã có lượt thi của thí sinh.');
    }

    await this.prisma.exam.delete({ where: { id } });

    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'DELETE_EXAM',
          entity: 'Exam',
          entityId: id,
          details: { name: exam.name },
        },
      });
    }

    return { message: 'Đã xóa kỳ thi thành công.' };
  }

  async getViolationAlerts() {
    return this.prisma.examAttempt.findMany({
      where: {
        OR: [
          { status: AttemptStatus.AUTO_SUBMITTED },
          { tabSwitchCount: { gt: 0 } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            department: { select: { id: true, name: true } },
          },
        },
        exam: {
          select: {
            id: true,
            name: true,
            maxTabSwitches: true,
            tabDetectionEnabled: true,
            autoSubmitOnViolate: true,
          },
        },
        tabSwitchLogs: {
          orderBy: { switchedAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  async getExamViolations(examId: string, filter?: { search?: string; status?: string }) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: {
        id: true,
        name: true,
        maxTabSwitches: true,
        tabDetectionEnabled: true,
        autoSubmitOnViolate: true,
      },
    });

    if (!exam) {
      throw new NotFoundException('Kỳ thi không tồn tại.');
    }

    const where: any = {
      examId,
      OR: [
        { status: AttemptStatus.AUTO_SUBMITTED },
        { tabSwitchCount: { gt: 0 } },
      ],
    };

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.search?.trim()) {
      const s = filter.search.trim();
      where.user = {
        OR: [
          { fullName: { contains: s, mode: 'insensitive' } },
          { username: { contains: s, mode: 'insensitive' } },
          { email: { contains: s, mode: 'insensitive' } },
        ],
      };
    }

    const violations = await this.prisma.examAttempt.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            department: { select: { id: true, name: true, code: true } },
          },
        },
        tabSwitchLogs: {
          orderBy: { switchedAt: 'desc' },
          take: 20,
        },
      },
    });

    // Thống kê nhanh
    const totalViolators = violations.length;
    const autoSubmittedCount = violations.filter((v) => v.status === AttemptStatus.AUTO_SUBMITTED).length;
    const totalSwitches = violations.reduce((acc, curr) => acc + (curr.tabSwitchCount || 0), 0);

    return {
      exam,
      summary: {
        totalViolators,
        autoSubmittedCount,
        warningOnlyCount: totalViolators - autoSubmittedCount,
        totalSwitches,
      },
      violations,
    };
  }
}
