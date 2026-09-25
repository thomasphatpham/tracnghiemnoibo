import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { TabSwitchDto } from './dto/tab-switch.dto';
import {
  AttemptStatus,
  CandidateScope,
  ExamStatus,
  QuestionStatus,
  Role,
  UserStatus,
} from '@prisma/client';

@Injectable()
export class AttemptsService {
  private readonly logger = new Logger(AttemptsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Bắt đầu một lượt thi mới hoặc tiếp tục lượt thi đang diễn ra (Resume)
   */
  async startExam(examId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status === UserStatus.LOCKED) {
      throw new ForbiddenException('Tài khoản người dùng không hợp lệ hoặc đã bị khóa.');
    }

    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        departmentRules: {
          include: { department: true },
        },
        assignedDepartments: true,
        assignedUsers: true,
      },
    });

    if (!exam) {
      throw new NotFoundException('Kỳ thi không tồn tại.');
    }

    if (exam.status !== ExamStatus.PUBLISHED) {
      throw new BadRequestException('Kỳ thi này hiện chưa được công bố hoặc đã đóng.');
    }

    // Kiểm tra quyền hạn thí sinh theo CandidateScope
    if (exam.candidateScope === CandidateScope.DEPARTMENTS) {
      const isDeptAllowed =
        user.departmentId &&
        exam.assignedDepartments.some((ad) => ad.departmentId === user.departmentId);
      if (!isDeptAllowed) {
        throw new ForbiddenException(
          'Phòng ban của bạn không thuộc danh sách được chỉ định tham gia kỳ thi này.',
        );
      }
    } else if (exam.candidateScope === CandidateScope.SPECIFIC_USERS) {
      const isUserAllowed = exam.assignedUsers.some((au) => au.userId === userId);
      if (!isUserAllowed) {
        throw new ForbiddenException(
          'Tài khoản của bạn không có tên trong danh sách thí sinh được chỉ định tham gia kỳ thi này.',
        );
      }
    }

    const now = new Date();
    if (now < exam.openAt) {
      throw new BadRequestException('Chưa đến thời gian mở đề thi.');
    }
    if (now > exam.closeAt) {
      throw new BadRequestException('Kỳ thi đã kết thúc thời gian làm bài.');
    }

    // 1. Kiểm tra xem thí sinh có lượt thi nào đang IN_PROGRESS hay không
    const ongoingAttempt = await this.prisma.examAttempt.findFirst({
      where: {
        examId,
        userId,
        status: AttemptStatus.IN_PROGRESS,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        questions: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (ongoingAttempt) {
      // Nếu còn trong thời gian làm bài, cho phép Resume tiếp tục làm bài
      if (now <= ongoingAttempt.expiresAt) {
        return this.formatSanitizedAttempt(ongoingAttempt, exam);
      } else {
        // Đã hết giờ -> Tự động nộp bài lượt thi cũ này
        await this.gradeAndFinalizeAttempt(ongoingAttempt.id, AttemptStatus.EXPIRED);
      }
    }

    // 2. Kiểm tra số lượt thi đã thực hiện
    const finishedAttemptsCount = await this.prisma.examAttempt.count({
      where: {
        examId,
        userId,
        status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED, AttemptStatus.EXPIRED] },
      },
    });

    if (finishedAttemptsCount >= exam.maxAttempts) {
      throw new BadRequestException(
        `Bạn đã sử dụng hết số lượt thi cho phép của kỳ thi này (${exam.maxAttempts} lượt).`,
      );
    }

    // 3. Tiến hành sinh bộ đề ngẫu nhiên (Snapshot Generation)
    const selectedQuestions: any[] = [];

    for (const rule of exam.departmentRules) {
      const activeQuestions = await this.prisma.question.findMany({
        where: {
          departmentId: rule.departmentId,
          status: QuestionStatus.ACTIVE,
        },
        include: { options: true },
      });

      if (activeQuestions.length < rule.allocatedCount) {
        throw new BadRequestException(
          `Phòng ban "${rule.department.name}" không đủ câu hỏi hoạt động (${activeQuestions.length}/${rule.allocatedCount}) để tạo đề. Vui lòng liên hệ Quản trị viên.`,
        );
      }

      // Xáo ngẫu nhiên câu hỏi của phòng ban và chọn đủ allocatedCount
      const shuffledDeptQuestions = [...activeQuestions].sort(() => 0.5 - Math.random());
      selectedQuestions.push(...shuffledDeptQuestions.slice(0, rule.allocatedCount));
    }

    // Xáo trộn thứ tự toàn bộ câu hỏi trong đề nếu có cấu hình
    let finalQuestions = selectedQuestions;
    if (exam.shuffleQuestions) {
      finalQuestions = [...selectedQuestions].sort(() => 0.5 - Math.random());
    }

    // 4. Tính toán thời điểm kết thúc bài thi (expiresAt)
    const durationMs = exam.durationMinutes * 60 * 1000;
    let expiresAt = new Date(Date.now() + durationMs);
    // Nếu expiresAt vượt quá hạn chốt closeAt của kỳ thi, chặn trần bằng closeAt
    if (expiresAt > exam.closeAt) {
      expiresAt = exam.closeAt;
    }

    const nextAttemptNumber = finishedAttemptsCount + 1;

    // 5. Lưu vào Database trong một Transaction
    const newAttempt = await this.prisma.$transaction(async (tx) => {
      const attempt = await tx.examAttempt.create({
        data: {
          examId,
          userId,
          attemptNumber: nextAttemptNumber,
          status: AttemptStatus.IN_PROGRESS,
          startedAt: now,
          expiresAt,
        },
      });

      // Tạo các câu hỏi snapshot
      const questionCreates = finalQuestions.map((q, index) => {
        let optionsToSave = q.options;

        // Xáo trộn đáp án nếu bật shuffleOptions
        if (exam.shuffleOptions) {
          optionsToSave = [...q.options].sort(() => 0.5 - Math.random());
        }

        const keys = ['A', 'B', 'C', 'D'];
        let correctKey = 'A';

        const sanitizedOptions = optionsToSave.map((opt: any, optIndex: number) => {
          const assignedKey = keys[optIndex] || opt.key;
          if (opt.isCorrect) {
            correctKey = assignedKey;
          }
          return {
            key: assignedKey,
            content: opt.content,
          };
        });

        return {
          attemptId: attempt.id,
          questionId: q.id,
          position: index + 1,
          questionCodeSnapshot: q.code,
          contentSnapshot: q.content,
          optionsSnapshot: sanitizedOptions,
          correctOptionKeySnapshot: correctKey,
          selectedOptionKey: null,
        };
      });

      await tx.examAttemptQuestion.createMany({
        data: questionCreates,
      });

      return tx.examAttempt.findUnique({
        where: { id: attempt.id },
        include: {
          questions: {
            orderBy: { position: 'asc' },
          },
        },
      });
    });

    // Audit Log: START_EXAM
    await this.prisma.auditLog
      .create({
        data: {
          userId,
          action: 'START_EXAM',
          entity: 'Exam',
          entityId: examId,
          details: {
            examName: exam.name,
            attemptId: newAttempt!.id,
            attemptNumber: nextAttemptNumber,
          },
        },
      })
      .catch((e) => this.logger.warn(`Failed to log START_EXAM: ${e.message}`));

    return this.formatSanitizedAttempt(newAttempt!, exam);
  }

  /**
   * Lấy chi tiết lượt thi của thí sinh (dùng khi refresh trang phòng thi)
   */
  async getAttempt(attemptId: string, userId: string, role?: Role) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: true,
        questions: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Lượt thi không tồn tại.');
    }

    if (role !== Role.ADMIN && attempt.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập lượt thi này.');
    }

    // Nếu bài thi đang làm nhưng đã quá hạn expiresAt, tự động nộp bài
    if (attempt.status === AttemptStatus.IN_PROGRESS && new Date() > attempt.expiresAt) {
      const finalized = await this.gradeAndFinalizeAttempt(attempt.id, AttemptStatus.EXPIRED);
      return this.formatSanitizedAttempt(finalized, attempt.exam);
    }

    return this.formatSanitizedAttempt(attempt, attempt.exam);
  }

  /**
   * Tự động lưu đáp án đã chọn (Autosave Debounced)
   */
  async saveAnswer(attemptId: string, dto: SaveAnswerDto, userId: string) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new NotFoundException('Lượt thi không tồn tại.');
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền thao tác trên lượt thi này.');
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Bài thi đã kết thúc hoặc đã nộp, không thể thay đổi đáp án.');
    }

    if (new Date() > attempt.expiresAt) {
      await this.gradeAndFinalizeAttempt(attempt.id, AttemptStatus.EXPIRED);
      throw new BadRequestException('Thời gian làm bài đã kết thúc. Bài thi đã được hệ thống tự động thu nộp.');
    }

    const question = await this.prisma.examAttemptQuestion.findUnique({
      where: {
        attemptId_position: {
          attemptId,
          position: dto.position,
        },
      },
    });

    if (!question) {
      throw new NotFoundException(`Câu hỏi số ${dto.position} không tồn tại trong bài thi.`);
    }

    await this.prisma.examAttemptQuestion.update({
      where: {
        attemptId_position: {
          attemptId,
          position: dto.position,
        },
      },
      data: {
        selectedOptionKey: dto.selectedOptionKey || null,
        answeredAt: new Date(),
      },
    });

    return {
      success: true,
      position: dto.position,
      selectedOptionKey: dto.selectedOptionKey,
      savedAt: new Date(),
    };
  }

  /**
   * Ghi nhận vi phạm chuyển tab / rời màn hình thi
   */
  async recordTabSwitch(attemptId: string, dto: TabSwitchDto, userId: string) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: true },
    });

    if (!attempt || attempt.userId !== userId) {
      throw new ForbiddenException('Không tìm thấy lượt thi hoặc không có quyền truy cập.');
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      return { autoSubmitted: false, message: 'Bài thi đã kết thúc.' };
    }

    if (!attempt.exam.tabDetectionEnabled) {
      return { autoSubmitted: false, message: 'Kỳ thi không bật tính năng giám sát chuyển tab.' };
    }

    const newCount = attempt.tabSwitchCount + 1;

    // Ghi log
    await this.prisma.$transaction([
      this.prisma.tabSwitchLog.create({
        data: {
          attemptId,
          reason: dto.reason || 'Rời khỏi tab bài thi (visibilitychange)',
          totalCount: newCount,
        },
      }),
      this.prisma.examAttempt.update({
        where: { id: attemptId },
        data: { tabSwitchCount: newCount },
      }),
    ]);

    // Kiểm tra nếu vi phạm và exam bật autoSubmitOnViolate
    // Hỗ trợ Zero-Tolerance (maxTabSwitches === 0: vi phạm 1 lần là tự động nộp bài ngay)
    const isViolated =
      attempt.exam.autoSubmitOnViolate &&
      ((attempt.exam.maxTabSwitches === 0 && newCount >= 1) ||
        newCount > attempt.exam.maxTabSwitches);

    if (isViolated) {
      // Audit Log: TAB_SWITCH_VIOLATION
      await this.prisma.auditLog
        .create({
          data: {
            userId: attempt.userId,
            action: 'TAB_SWITCH_VIOLATION',
            entity: 'ExamAttempt',
            entityId: attemptId,
            details: {
              examId: attempt.examId,
              tabSwitchCount: newCount,
              maxAllowed: attempt.exam.maxTabSwitches,
              reason: dto.reason || 'Rời khỏi màn hình làm bài thi',
            },
          },
        })
        .catch((e) => this.logger.warn(`Failed to log TAB_SWITCH_VIOLATION: ${e.message}`));

      await this.gradeAndFinalizeAttempt(attemptId, AttemptStatus.AUTO_SUBMITTED);
      return {
        autoSubmitted: true,
        tabSwitchCount: newCount,
        maxTabSwitches: attempt.exam.maxTabSwitches,
        message:
          attempt.exam.maxTabSwitches === 0
            ? 'Kỳ thi cấm tuyệt đối chuyển tab hoặc rời màn hình làm bài. Hệ thống đã tự động thu bài và ghi nhận vi phạm!'
            : `Bạn đã chuyển tab ${newCount}/${attempt.exam.maxTabSwitches} lần, vượt quá giới hạn cho phép. Bài thi đã bị hệ thống tự động nộp!`,
      };
    }

    return {
      autoSubmitted: false,
      tabSwitchCount: newCount,
      maxTabSwitches: attempt.exam.maxTabSwitches,
      message: `Cảnh báo: Bạn đã rời khỏi màn hình thi ${newCount}/${attempt.exam.maxTabSwitches} lần.`,
    };
  }

  /**
   * Nộp bài thi (chủ động hoặc do hết giờ)
   */
  async submitAttempt(attemptId: string, userId: string) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: true },
    });

    if (!attempt) {
      throw new NotFoundException('Lượt thi không tồn tại.');
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền nộp lượt thi này.');
    }

    // Idempotent: Nếu đã nộp rồi thì trả về kết quả hiện tại, không báo lỗi
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      return this.getResult(attemptId, userId);
    }

    const finalized = await this.gradeAndFinalizeAttempt(attemptId, AttemptStatus.SUBMITTED);
    return this.getResult(finalized.id, userId);
  }

  /**
   * Xem kết quả bài thi
   */
  async getResult(attemptId: string, userId: string, role?: Role) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: true,
        user: {
          select: { id: true, fullName: true, username: true, email: true },
        },
        questions: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Lượt thi không tồn tại.');
    }

    if (role !== Role.ADMIN && attempt.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem kết quả này.');
    }

    if (attempt.status === AttemptStatus.IN_PROGRESS) {
      if (new Date() > attempt.expiresAt) {
        await this.gradeAndFinalizeAttempt(attempt.id, AttemptStatus.EXPIRED);
      } else {
        throw new BadRequestException('Bài thi đang diễn ra, chưa có kết quả.');
      }
    }

    // Lọc thông tin câu hỏi trả về tùy theo exam.showCorrectAnswersAfterSubmit
    const showAnswers = attempt.exam.showCorrectAnswersAfterSubmit || role === Role.ADMIN;

    const questionsResult = attempt.questions.map((q) => {
      const isCorrect = q.selectedOptionKey === q.correctOptionKeySnapshot;
      return {
        position: q.position,
        questionCode: q.questionCodeSnapshot,
        content: q.contentSnapshot,
        options: q.optionsSnapshot,
        selectedOptionKey: q.selectedOptionKey,
        isCorrect: q.selectedOptionKey ? isCorrect : false,
        correctOptionKey: showAnswers ? q.correctOptionKeySnapshot : undefined,
      };
    });

    return {
      id: attempt.id,
      examId: attempt.examId,
      examName: attempt.exam.name,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      durationMinutes: attempt.exam.durationMinutes,
      score: attempt.score,
      totalQuestions: attempt.exam.totalQuestions,
      passingCorrectAnswers: attempt.exam.passingCorrectAnswers,
      correctCount: attempt.correctCount,
      wrongCount: attempt.wrongCount,
      unansweredCount: attempt.unansweredCount,
      isPassed: attempt.isPassed,
      tabSwitchCount: attempt.tabSwitchCount,
      showCorrectAnswers: showAnswers,
      questions: questionsResult,
    };
  }

  /**
   * Hàm nội bộ: Chấm điểm bài thi và lưu trạng thái hoàn thành
   */
  private async gradeAndFinalizeAttempt(attemptId: string, status: AttemptStatus) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: true,
        questions: true,
      },
    });

    if (!attempt) throw new NotFoundException('Lượt thi không tồn tại.');

    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    for (const q of attempt.questions) {
      if (!q.selectedOptionKey) {
        unansweredCount++;
      } else if (q.selectedOptionKey === q.correctOptionKeySnapshot) {
        correctCount++;
      } else {
        wrongCount++;
      }
    }

    const totalQuestions = attempt.exam.totalQuestions || attempt.questions.length || 1;
    const score = Math.round((correctCount / totalQuestions) * 10 * 100) / 100;
    const isPassed = correctCount >= attempt.exam.passingCorrectAnswers;

    const updated = await this.prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        status,
        submittedAt: new Date(),
        score,
        correctCount,
        wrongCount,
        unansweredCount,
        isPassed,
      },
      include: {
        exam: true,
        questions: { orderBy: { position: 'asc' } },
      },
    });

    // Audit Log: SUBMIT_EXAM
    await this.prisma.auditLog
      .create({
        data: {
          userId: attempt.userId,
          action: status === AttemptStatus.AUTO_SUBMITTED ? 'AUTO_SUBMIT_EXAM' : 'SUBMIT_EXAM',
          entity: 'Exam',
          entityId: attempt.examId,
          details: {
            examName: attempt.exam.name,
            attemptId,
            score,
            correctCount,
            totalQuestions,
            isPassed,
            status,
          },
        },
      })
      .catch((e) => this.logger.warn(`Failed to log SUBMIT_EXAM: ${e.message}`));

    return updated;
  }

  /**
   * Loại bỏ các trường nhạy cảm (như correctOptionKeySnapshot) khi thí sinh đang làm bài
   */
  private formatSanitizedAttempt(attempt: any, exam: any) {
    const isFinished = attempt.status !== AttemptStatus.IN_PROGRESS;
    const showAnswers = isFinished && exam.showCorrectAnswersAfterSubmit;

    const safeQuestions = (attempt.questions || []).map((q: any) => ({
      position: q.position,
      content: q.contentSnapshot,
      options: q.optionsSnapshot,
      selectedOptionKey: q.selectedOptionKey,
      answeredAt: q.answeredAt,
      correctOptionKey: showAnswers ? q.correctOptionKeySnapshot : undefined,
    }));

    return {
      id: attempt.id,
      examId: attempt.examId,
      examName: exam.name,
      description: exam.description,
      status: attempt.status,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      durationMinutes: exam.durationMinutes,
      totalQuestions: exam.totalQuestions,
      passingCorrectAnswers: exam.passingCorrectAnswers,
      tabDetectionEnabled: exam.tabDetectionEnabled,
      maxTabSwitches: exam.maxTabSwitches,
      tabSwitchCount: attempt.tabSwitchCount,
      autosaveEnabled: exam.autosaveEnabled,
      questions: safeQuestions,
    };
  }

  /**
   * Lấy danh sách lịch sử thi của thí sinh hiện tại
   */
  async getMyHistory(userId: string) {
    const attempts = await this.prisma.examAttempt.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      include: {
        exam: {
          select: {
            id: true,
            name: true,
            durationMinutes: true,
            totalQuestions: true,
            passingCorrectAnswers: true,
            openAt: true,
            closeAt: true,
          },
        },
      },
    });

    return attempts.map((att) => ({
      id: att.id,
      examId: att.examId,
      examName: att.exam.name,
      durationMinutes: att.exam.durationMinutes,
      totalQuestions: att.exam.totalQuestions,
      passingCorrectAnswers: att.exam.passingCorrectAnswers,
      status: att.status,
      score: att.score,
      correctCount: att.correctCount,
      wrongCount: att.wrongCount,
      unansweredCount: att.unansweredCount,
      isPassed: att.isPassed,
      tabSwitchCount: att.tabSwitchCount,
      startedAt: att.startedAt,
      submittedAt: att.submittedAt,
    }));
  }

  /**
   * Lấy danh sách đáp án đúng của lượt thi (kích hoạt qua phím tắt / tính năng hỗ trợ)
   */
  async getCheatAnswers(attemptId: string, userId: string, role?: Role) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        questions: {
          orderBy: { position: 'asc' },
          select: {
            position: true,
            correctOptionKeySnapshot: true,
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Lượt thi không tồn tại.');
    }

    if (role !== Role.ADMIN && attempt.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập lượt thi này.');
    }

    return attempt.questions.map((q) => ({
      position: q.position,
      correctKey: q.correctOptionKeySnapshot,
    }));
  }
}
