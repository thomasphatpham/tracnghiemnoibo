import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AttemptStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Thống kê tổng quan toàn hệ thống (KPIs)
   */
  async getSummary() {
    const [totalExams, totalAttempts, completedAttempts, allPassedCount, violationsCount] =
      await Promise.all([
        this.prisma.exam.count(),
        this.prisma.examAttempt.count(),
        this.prisma.examAttempt.findMany({
          where: {
            status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED, AttemptStatus.EXPIRED] },
          },
          select: { score: true, isPassed: true },
        }),
        this.prisma.examAttempt.count({
          where: {
            status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED, AttemptStatus.EXPIRED] },
            isPassed: true,
          },
        }),
        this.prisma.examAttempt.count({
          where: {
            OR: [
              { status: AttemptStatus.AUTO_SUBMITTED },
              { tabSwitchCount: { gt: 0 } },
            ],
          },
        }),
      ]);

    const completedCount = completedAttempts.length;
    let totalScore = 0;
    for (const att of completedAttempts) {
      totalScore += att.score || 0;
    }

    const averageScore = completedCount > 0 ? Math.round((totalScore / completedCount) * 100) / 100 : 0;
    const overallPassRate = completedCount > 0 ? Math.round((allPassedCount / completedCount) * 1000) / 10 : 0;

    return {
      totalExams,
      totalAttempts,
      completedAttempts: completedCount,
      averageScore,
      overallPassRate,
      totalViolations: violationsCount,
    };
  }

  /**
   * Danh sách báo cáo theo từng kỳ thi (kèm phân trang & tìm kiếm)
   */
  async getExamsReport(query: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search && query.search.trim()) {
      where.name = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const [exams, total] = await Promise.all([
      this.prisma.exam.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          attempts: {
            where: {
              status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED, AttemptStatus.EXPIRED] },
            },
            select: {
              score: true,
              isPassed: true,
              tabSwitchCount: true,
              status: true,
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

    const data = exams.map((exam) => {
      const completedList = exam.attempts;
      const completedCount = completedList.length;

      let sumScore = 0;
      let minScore = completedCount > 0 ? 10 : 0;
      let maxScore = 0;
      let passedCount = 0;
      let violationCount = 0;

      for (const a of completedList) {
        const sc = a.score || 0;
        sumScore += sc;
        if (sc > maxScore) maxScore = sc;
        if (sc < minScore) minScore = sc;
        if (a.isPassed) passedCount++;
        if (a.tabSwitchCount > 0 || a.status === AttemptStatus.AUTO_SUBMITTED) {
          violationCount++;
        }
      }

      const avgScore = completedCount > 0 ? Math.round((sumScore / completedCount) * 100) / 100 : 0;
      const passRate = completedCount > 0 ? Math.round((passedCount / completedCount) * 1000) / 10 : 0;

      return {
        id: exam.id,
        name: exam.name,
        status: exam.status,
        openAt: exam.openAt,
        closeAt: exam.closeAt,
        durationMinutes: exam.durationMinutes,
        totalQuestions: exam.totalQuestions,
        passingCorrectAnswers: exam.passingCorrectAnswers,
        totalAttempts: exam._count.attempts,
        completedCount,
        passedCount,
        failedCount: completedCount - passedCount,
        passRate,
        avgScore,
        minScore: completedCount > 0 ? minScore : 0,
        maxScore,
        violationCount,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Danh sách chi tiết kết quả của toàn bộ thí sinh trong 1 kỳ thi
   */
  async getExamCandidates(
    examId: string,
    query?: { search?: string; status?: string; page?: number; limit?: number },
  ) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
        totalQuestions: true,
        passingCorrectAnswers: true,
        openAt: true,
        closeAt: true,
      },
    });

    if (!exam) {
      throw new NotFoundException('Kỳ thi không tồn tại.');
    }

    const where: any = {
      examId,
      status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED, AttemptStatus.EXPIRED] },
    };

    if (query?.status === 'PASSED') {
      where.isPassed = true;
    } else if (query?.status === 'FAILED') {
      where.isPassed = false;
    } else if (query?.status === 'VIOLATED') {
      where.OR = [
        { status: AttemptStatus.AUTO_SUBMITTED },
        { tabSwitchCount: { gt: 0 } },
      ];
    }

    if (query?.search && query.search.trim()) {
      const s = query.search.trim();
      where.user = {
        OR: [
          { fullName: { contains: s, mode: 'insensitive' } },
          { username: { contains: s, mode: 'insensitive' } },
          { email: { contains: s, mode: 'insensitive' } },
        ],
      };
    }

    const attempts = await this.prisma.examAttempt.findMany({
      where,
      orderBy: [{ score: 'desc' }, { submittedAt: 'asc' }],
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            department: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    });

    const candidates = attempts.map((att, index) => {
      let durationSeconds = 0;
      if (att.startedAt && att.submittedAt) {
        durationSeconds = Math.round((att.submittedAt.getTime() - att.startedAt.getTime()) / 1000);
      }

      return {
        rank: index + 1,
        id: att.id,
        userId: att.userId,
        fullName: att.user.fullName,
        username: att.user.username,
        email: att.user.email,
        departmentCode: att.user.department?.code || '—',
        departmentName: att.user.department?.name || 'Chưa phân bổ',
        score: att.score || 0,
        correctCount: att.correctCount || 0,
        totalQuestions: exam.totalQuestions,
        isPassed: att.isPassed,
        status: att.status,
        tabSwitchCount: att.tabSwitchCount,
        durationSeconds,
        startedAt: att.startedAt,
        submittedAt: att.submittedAt,
      };
    });

    return {
      exam,
      total: candidates.length,
      candidates,
    };
  }

  /**
   * Báo cáo phân tích hiệu suất theo từng phòng ban
   */
  async getDepartmentsReport() {
    const departments = await this.prisma.department.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        code: true,
        name: true,
        users: {
          select: {
            id: true,
            attempts: {
              where: {
                status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED, AttemptStatus.EXPIRED] },
              },
              select: {
                score: true,
                isPassed: true,
              },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    return departments.map((dep) => {
      const totalUsers = dep.users.length;
      const allAttempts = dep.users.flatMap((u) => u.attempts);
      const completedCount = allAttempts.length;

      let sumScore = 0;
      let passedCount = 0;

      for (const a of allAttempts) {
        sumScore += a.score || 0;
        if (a.isPassed) passedCount++;
      }

      const avgScore = completedCount > 0 ? Math.round((sumScore / completedCount) * 100) / 100 : 0;
      const passRate = completedCount > 0 ? Math.round((passedCount / completedCount) * 1000) / 10 : 0;

      return {
        id: dep.id,
        code: dep.code,
        name: dep.name,
        totalUsers,
        completedAttempts: completedCount,
        passedCount,
        avgScore,
        passRate,
      };
    });
  }

  /**
   * Xuất tệp Excel (.xlsx) báo cáo chi tiết kết quả của 1 kỳ thi
   */
  async exportExamReport(examId: string): Promise<Buffer> {
    const details = await this.getExamCandidates(examId);
    const { exam, candidates } = details;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hệ Thống Thi Trắc Nghiệm - Saigonbank';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('KetQuaThi', {
      views: [{ showGridLines: true }],
    });

    // 1. Tiêu đề chính
    sheet.mergeCells('A1:I1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `BÁO CÁO KẾT QUẢ KỲ THI: ${exam.name.toUpperCase()}`;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF0066B1' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 35;

    // 2. Thông tin tóm tắt kỳ thi
    sheet.getCell('A3').value = 'Thời lượng:';
    sheet.getCell('B3').value = `${exam.durationMinutes} phút`;
    sheet.getCell('A4').value = 'Tổng số câu:';
    sheet.getCell('B4').value = `${exam.totalQuestions} câu`;
    sheet.getCell('A5').value = 'Điểm đạt yêu cầu:';
    sheet.getCell('B5').value = `>= ${exam.passingCorrectAnswers}/${exam.totalQuestions} câu`;

    sheet.getCell('D3').value = 'Tổng số thí sinh nộp bài:';
    sheet.getCell('E3').value = candidates.length;
    const passedCount = candidates.filter((c) => c.isPassed).length;
    sheet.getCell('D4').value = 'Số thí sinh Đạt:';
    sheet.getCell('E4').value = `${passedCount} (${candidates.length > 0 ? Math.round((passedCount / candidates.length) * 100) : 0}%)`;

    ['A3', 'A4', 'A5', 'D3', 'D4'].forEach((cell) => {
      sheet.getCell(cell).font = { bold: true, color: { argb: 'FF475569' } };
    });

    // 3. Header bảng dữ liệu
    const startRow = 7;
    const headers = [
      'STT',
      'Tên đăng nhập',
      'Họ và tên thí sinh',
      'Phòng ban',
      'Điểm số (Thang 10)',
      'Số câu đúng',
      'Kết quả',
      'Số lần rời tab',
      'Thời gian nộp bài',
    ];

    const headerRow = sheet.getRow(startRow);
    headerRow.values = headers;
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066B1' }, // Saigonbank Navy Blue
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 28;

    // 4. Rows dữ liệu
    candidates.forEach((c, idx) => {
      const row = sheet.addRow([
        idx + 1,
        c.username,
        c.fullName,
        c.departmentName,
        c.score,
        `${c.correctCount}/${c.totalQuestions}`,
        c.isPassed ? 'ĐẠT' : 'CHƯA ĐẠT',
        c.tabSwitchCount,
        c.submittedAt ? new Date(c.submittedAt).toLocaleString('vi-VN') : '—',
      ]);

      row.alignment = { vertical: 'middle' };
      row.height = 22;

      // Căn giữa STT, Điểm, Kết quả, Tab switch, Thời gian
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };

      // Highlight kết quả Đạt / Chưa đạt
      if (c.isPassed) {
        row.getCell(7).font = { bold: true, color: { argb: 'FF059669' } }; // Green 600
      } else {
        row.getCell(7).font = { bold: true, color: { argb: 'FFE11D48' } }; // Rose 600
      }

      // Highlight vi phạm nếu có
      if (c.tabSwitchCount > 0) {
        row.getCell(8).font = { bold: true, color: { argb: 'FFE11D48' } };
      }
    });

    // 5. Căn chỉnh độ rộng cột
    sheet.columns = [
      { width: 8 },  // STT
      { width: 18 }, // Tên đăng nhập
      { width: 28 }, // Họ và tên
      { width: 32 }, // Phòng ban
      { width: 20 }, // Điểm số
      { width: 16 }, // Số câu đúng
      { width: 16 }, // Kết quả
      { width: 16 }, // Rời tab
      { width: 24 }, // Thời gian nộp
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as any);
  }

  /**
   * Xuất tệp Excel (.xlsx) tổng quan toàn bộ các kỳ thi
   */
  async exportOverviewReport(): Promise<Buffer> {
    const report = await this.getExamsReport({ limit: 1000 });
    const exams = report.data;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hệ Thống Thi Trắc Nghiệm - Saigonbank';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('TongQuanKyThi', {
      views: [{ showGridLines: true }],
    });

    sheet.mergeCells('A1:I1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'BÁO CÁO TỔNG HỢP KẾT QUẢ CÁC KỲ THI TRẮC NGHIỆM';
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF0066B1' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 35;

    const headers = [
      'STT',
      'Tên kỳ thi',
      'Trạng thái',
      'Thời gian bắt đầu',
      'Thời gian kết thúc',
      'Số lượt nộp',
      'Điểm trung bình',
      'Tỷ lệ Đạt (%)',
      'Lượt có vi phạm tab',
    ];

    const headerRow = sheet.getRow(3);
    headerRow.values = headers;
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066B1' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 28;

    exams.forEach((e, idx) => {
      const row = sheet.addRow([
        idx + 1,
        e.name,
        e.status,
        new Date(e.openAt).toLocaleString('vi-VN'),
        new Date(e.closeAt).toLocaleString('vi-VN'),
        e.completedCount,
        e.avgScore,
        `${e.passRate}%`,
        e.violationCount,
      ]);

      row.height = 22;
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };
    });

    sheet.columns = [
      { width: 8 },
      { width: 38 },
      { width: 16 },
      { width: 22 },
      { width: 22 },
      { width: 16 },
      { width: 18 },
      { width: 18 },
      { width: 20 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as any);
  }

  /**
   * Báo cáo thống kê dành riêng cho Trưởng đơn vị / Phòng ban
   */
  async getMyDepartmentReport(
    departmentId: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      examId?: string;
      isPassed?: boolean | string;
    },
  ) {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, code: true, name: true },
    });
    if (!department) throw new NotFoundException('Phòng ban không tồn tại.');

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Number(query?.limit) || 20);
    const skip = (page - 1) * limit;

    // Filter employees of this department
    const userWhere: any = { departmentId };
    if (query?.search?.trim()) {
      const s = query.search.trim();
      userWhere.OR = [
        { fullName: { contains: s, mode: 'insensitive' } },
        { username: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }

    const isPassedFilter =
      typeof query?.isPassed === 'boolean'
        ? query.isPassed
        : query?.isPassed === 'true'
        ? true
        : query?.isPassed === 'false'
        ? false
        : undefined;

    if (query?.examId || isPassedFilter !== undefined) {
      userWhere.attempts = {
        some: {
          status: {
            in: [
              AttemptStatus.SUBMITTED,
              AttemptStatus.AUTO_SUBMITTED,
              AttemptStatus.EXPIRED,
            ],
          },
          ...(query?.examId ? { examId: query.examId } : {}),
          ...(isPassedFilter !== undefined ? { isPassed: isPassedFilter } : {}),
        },
      };
    }

    const [employees, totalEmployees, allAttempts] = await Promise.all([
      this.prisma.user.findMany({
        where: userWhere,
        skip,
        take: limit,
        orderBy: { fullName: 'asc' },
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          position: true,
          status: true,
          attempts: {
            where: {
              status: {
                in: [
                  AttemptStatus.SUBMITTED,
                  AttemptStatus.AUTO_SUBMITTED,
                  AttemptStatus.EXPIRED,
                ],
              },
              ...(query?.examId ? { examId: query.examId } : {}),
              ...(isPassedFilter !== undefined ? { isPassed: isPassedFilter } : {}),
            },
            include: {
              exam: { select: { id: true, name: true, totalQuestions: true } },
            },
            orderBy: { submittedAt: 'desc' },
          },
        },
      }),
      this.prisma.user.count({ where: userWhere }),
      this.prisma.examAttempt.findMany({
        where: {
          user: { departmentId },
          status: {
            in: [
              AttemptStatus.SUBMITTED,
              AttemptStatus.AUTO_SUBMITTED,
              AttemptStatus.EXPIRED,
            ],
          },
          ...(query?.examId ? { examId: query.examId } : {}),
        },
        select: { score: true, isPassed: true },
      }),
    ]);

    const totalCompleted = allAttempts.length;
    const passedCount = allAttempts.filter((a) => a.isPassed).length;
    const sumScore = allAttempts.reduce((acc, a) => acc + (a.score || 0), 0);
    const avgScore =
      totalCompleted > 0 ? Math.round((sumScore / totalCompleted) * 100) / 100 : 0;
    const passRate =
      totalCompleted > 0 ? Math.round((passedCount / totalCompleted) * 1000) / 10 : 0;

    return {
      department,
      summary: {
        totalEmployees,
        totalAttempts: totalCompleted,
        passedCount,
        avgScore,
        passRate,
      },
      employees,
      meta: {
        page,
        limit,
        total: totalEmployees,
        totalPages: Math.ceil(totalEmployees / limit) || 1,
      },
    };
  }

  /**
   * Xuất tệp Excel (.xlsx) báo cáo kết quả thi của đơn vị/phòng ban
   */
  async exportMyDepartmentReport(
    departmentId: string,
    query?: { search?: string; examId?: string; isPassed?: boolean | string },
  ): Promise<Buffer> {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, code: true, name: true },
    });
    if (!department) throw new NotFoundException('Phòng ban không tồn tại.');

    const isPassedFilter =
      typeof query?.isPassed === 'boolean'
        ? query.isPassed
        : query?.isPassed === 'true'
        ? true
        : query?.isPassed === 'false'
        ? false
        : undefined;

    const userWhere: any = { departmentId };
    if (query?.search?.trim()) {
      const s = query.search.trim();
      userWhere.OR = [
        { fullName: { contains: s, mode: 'insensitive' } },
        { username: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query?.examId || isPassedFilter !== undefined) {
      userWhere.attempts = {
        some: {
          status: {
            in: [
              AttemptStatus.SUBMITTED,
              AttemptStatus.AUTO_SUBMITTED,
              AttemptStatus.EXPIRED,
            ],
          },
          ...(query?.examId ? { examId: query.examId } : {}),
          ...(isPassedFilter !== undefined ? { isPassed: isPassedFilter } : {}),
        },
      };
    }

    const [totalEmployees, allAttempts, users] = await Promise.all([
      this.prisma.user.count({ where: userWhere }),
      this.prisma.examAttempt.findMany({
        where: {
          user: { departmentId },
          status: {
            in: [
              AttemptStatus.SUBMITTED,
              AttemptStatus.AUTO_SUBMITTED,
              AttemptStatus.EXPIRED,
            ],
          },
          ...(query?.examId ? { examId: query.examId } : {}),
        },
        select: { score: true, isPassed: true },
      }),
      this.prisma.user.findMany({
        where: userWhere,
        orderBy: { fullName: 'asc' },
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          position: true,
          attempts: {
            where: {
              status: {
                in: [
                  AttemptStatus.SUBMITTED,
                  AttemptStatus.AUTO_SUBMITTED,
                  AttemptStatus.EXPIRED,
                ],
              },
              ...(query?.examId ? { examId: query.examId } : {}),
              ...(isPassedFilter !== undefined ? { isPassed: isPassedFilter } : {}),
            },
            include: {
              exam: { select: { id: true, name: true, totalQuestions: true } },
            },
            orderBy: { submittedAt: 'desc' },
          },
        },
      }),
    ]);

    const totalCompleted = allAttempts.length;
    const passedCount = allAttempts.filter((a) => a.isPassed).length;
    const sumScore = allAttempts.reduce((acc, a) => acc + (a.score || 0), 0);
    const avgScore =
      totalCompleted > 0 ? Math.round((sumScore / totalCompleted) * 100) / 100 : 0;
    const passRate =
      totalCompleted > 0 ? Math.round((passedCount / totalCompleted) * 1000) / 10 : 0;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hệ Thống Thi Trắc Nghiệm - Saigonbank';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('KetQuaPhongBan', {
      views: [{ showGridLines: true }],
    });

    // 1. Tiêu đề chính
    sheet.mergeCells('A1:J1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `BÁO CÁO KẾT QUẢ ĐÀO TẠO & THI TRẮC NGHIỆM - ${department.name.toUpperCase()}`;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF0066B1' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 35;

    // 2. Thông tin tóm tắt đơn vị
    sheet.getCell('A3').value = 'Mã phòng ban:';
    sheet.getCell('B3').value = department.code;
    sheet.getCell('A4').value = 'Tên phòng ban:';
    sheet.getCell('B4').value = department.name;
    sheet.getCell('A5').value = 'Tổng số nhân viên:';
    sheet.getCell('B5').value = totalEmployees;

    sheet.getCell('D3').value = 'Tổng số lượt thi:';
    sheet.getCell('E3').value = totalCompleted;
    sheet.getCell('D4').value = 'Số lượt Đạt:';
    sheet.getCell('E4').value = `${passedCount} (${passRate}%)`;
    sheet.getCell('D5').value = 'Điểm trung bình:';
    sheet.getCell('E5').value = avgScore;

    ['A3', 'A4', 'A5', 'D3', 'D4', 'D5'].forEach((cell) => {
      sheet.getCell(cell).font = { bold: true, color: { argb: 'FF475569' } };
    });

    // 3. Header bảng dữ liệu
    const startRow = 7;
    const headers = [
      'STT',
      'Tên đăng nhập',
      'Họ và tên thí sinh',
      'Chức danh',
      'Kỳ thi',
      'Điểm số (Thang 10)',
      'Số câu đúng',
      'Kết quả',
      'Số lần rời tab',
      'Thời gian nộp bài',
    ];

    const headerRow = sheet.getRow(startRow);
    headerRow.values = headers;
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066B1' }, // Saigonbank Navy Blue
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 28;

    // 4. Rows dữ liệu
    let rowIndex = 1;
    for (const u of users) {
      if (!u.attempts || u.attempts.length === 0) {
        const row = sheet.addRow([
          rowIndex++,
          u.username,
          u.fullName,
          u.position || '—',
          '—',
          '—',
          '—',
          'CHƯA THI',
          0,
          '—',
        ]);

        row.alignment = { vertical: 'middle' };
        row.height = 22;
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(10).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(8).font = { bold: true, color: { argb: 'FF64748B' } }; // Slate 500
      } else {
        for (const att of u.attempts) {
          const row = sheet.addRow([
            rowIndex++,
            u.username,
            u.fullName,
            u.position || '—',
            att.exam?.name || '—',
            att.score ?? 0,
            att.correctCount !== null &&
            att.correctCount !== undefined &&
            att.exam?.totalQuestions
              ? `${att.correctCount}/${att.exam.totalQuestions}`
              : `${att.score ?? 0}`,
            att.isPassed ? 'ĐẠT' : 'CHƯA ĐẠT',
            att.tabSwitchCount ?? 0,
            att.submittedAt
              ? new Date(att.submittedAt).toLocaleString('vi-VN')
              : '—',
          ]);

          row.alignment = { vertical: 'middle' };
          row.height = 22;

          row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
          row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
          row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
          row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
          row.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };
          row.getCell(10).alignment = { vertical: 'middle', horizontal: 'center' };

          if (att.isPassed) {
            row.getCell(8).font = { bold: true, color: { argb: 'FF059669' } }; // Green 600
          } else {
            row.getCell(8).font = { bold: true, color: { argb: 'FFE11D48' } }; // Rose 600
          }

          if (att.tabSwitchCount > 0) {
            row.getCell(9).font = { bold: true, color: { argb: 'FFE11D48' } };
          }
        }
      }
    }

    // 5. Căn chỉnh độ rộng cột
    sheet.columns = [
      { width: 8 },  // STT
      { width: 18 }, // Tên đăng nhập
      { width: 28 }, // Họ và tên thí sinh
      { width: 22 }, // Chức danh
      { width: 34 }, // Kỳ thi
      { width: 16 }, // Điểm số
      { width: 16 }, // Số câu đúng
      { width: 16 }, // Kết quả
      { width: 16 }, // Rời tab
      { width: 24 }, // Thời gian nộp bài
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as any);
  }
}

