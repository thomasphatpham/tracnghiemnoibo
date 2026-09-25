import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionsDto } from './dto/query-questions.dto';
import { QuestionStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';

export interface ExcelValidationError {
  row: number;
  code?: string;
  field: string;
  message: string;
}

export interface ValidatedQuestionRow {
  code: string;
  departmentCode: string;
  departmentId: string;
  content: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctKey: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
}

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryQuestionsDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          department: {
            select: { id: true, code: true, name: true },
          },
          options: {
            orderBy: { key: 'asc' },
          },
        },
      }),
      this.prisma.question.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        department: {
          select: { id: true, code: true, name: true },
        },
        options: {
          orderBy: { key: 'asc' },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Không tìm thấy câu hỏi.');
    }

    return question;
  }

  async create(dto: CreateQuestionDto) {
    // 1. Check code uniqueness
    const existing = await this.prisma.question.findUnique({
      where: { code: dto.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`Mã câu hỏi '${dto.code}' đã tồn tại.`);
    }

    // 2. Validate department exists
    const dep = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!dep) {
      throw new BadRequestException('Phòng ban không tồn tại.');
    }

    // 3. Validate options: exactly 4 options A, B, C, D and exactly ONE correct
    this.validateOptions(dto.options);

    // 4. Create question and options in a transaction
    const created = await this.prisma.$transaction(async (tx) => {
      const question = await tx.question.create({
        data: {
          code: dto.code.trim().toUpperCase(),
          content: dto.content.trim(),
          departmentId: dto.departmentId,
          explanation: dto.explanation ? dto.explanation.trim() : null,
          status: dto.status || QuestionStatus.ACTIVE,
        },
      });

      for (const opt of dto.options) {
        await tx.questionOption.create({
          data: {
            questionId: question.id,
            key: opt.key.toUpperCase(),
            content: opt.content.trim(),
            isCorrect: opt.isCorrect,
          },
        });
      }

      return tx.question.findUnique({
        where: { id: question.id },
        include: {
          department: true,
          options: { orderBy: { key: 'asc' } },
        },
      });
    });

    await this.prisma.auditLog
      .create({
        data: {
          action: 'CREATE_QUESTION',
          entity: 'Question',
          entityId: created!.id,
          details: { code: created!.code, departmentId: created!.departmentId },
        },
      })
      .catch(() => {});

    return created;
  }

  async update(id: string, dto: UpdateQuestionDto) {
    await this.findOne(id);

    if (dto.departmentId) {
      const dep = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!dep) {
        throw new BadRequestException('Phòng ban không tồn tại.');
      }
    }

    if (dto.options) {
      this.validateOptions(dto.options);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const question = await tx.question.update({
        where: { id },
        data: {
          ...(dto.content ? { content: dto.content.trim() } : {}),
          ...(dto.departmentId ? { departmentId: dto.departmentId } : {}),
          ...(dto.explanation !== undefined
            ? { explanation: dto.explanation ? dto.explanation.trim() : null }
            : {}),
          ...(dto.status ? { status: dto.status } : {}),
        },
      });

      if (dto.options) {
        for (const opt of dto.options) {
          await tx.questionOption.upsert({
            where: {
              questionId_key: {
                questionId: id,
                key: opt.key.toUpperCase(),
              },
            },
            update: {
              content: opt.content.trim(),
              isCorrect: opt.isCorrect,
            },
            create: {
              questionId: id,
              key: opt.key.toUpperCase(),
              content: opt.content.trim(),
              isCorrect: opt.isCorrect,
            },
          });
        }
      }

      return tx.question.findUnique({
        where: { id },
        include: {
          department: true,
          options: { orderBy: { key: 'asc' } },
        },
      });
    });

    await this.prisma.auditLog
      .create({
        data: {
          action: 'UPDATE_QUESTION',
          entity: 'Question',
          entityId: id,
          details: { code: updated!.code },
        },
      })
      .catch(() => {});

    return updated;
  }

  async toggleStatus(id: string) {
    const q = await this.findOne(id);
    const newStatus =
      q.status === QuestionStatus.ACTIVE ? QuestionStatus.INACTIVE : QuestionStatus.ACTIVE;

    return this.prisma.question.update({
      where: { id },
      data: { status: newStatus },
      include: {
        department: true,
        options: { orderBy: { key: 'asc' } },
      },
    });
  }

  private validateOptions(options: any[]) {
    if (!options || options.length !== 4) {
      throw new BadRequestException('Câu hỏi trắc nghiệm bắt buộc phải có đúng 4 phương án.');
    }

    const keys = options.map((o) => o.key.toUpperCase()).sort();
    if (keys.join('') !== 'ABCD') {
      throw new BadRequestException('4 phương án phải có mã lần lượt là A, B, C, D.');
    }

    const correctCount = options.filter((o) => o.isCorrect === true).length;
    if (correctCount !== 1) {
      throw new BadRequestException('Câu hỏi trắc nghiệm phải có chính xác 1 đáp án đúng duy nhất.');
    }
  }

  // EXCEL IMPORT & TEMPLATE
  async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hệ Thống Thi Trắc Nghiệm';
    workbook.created = new Date();

    // Sheet 1: Danh sách câu hỏi
    const sheet = workbook.addWorksheet('DanhSachCauHoi', {
      views: [{ showGridLines: true }],
    });

    const headers = [
      'Mã câu hỏi (*)',
      'Mã phòng ban (*)',
      'Nội dung câu hỏi (*)',
      'Đáp án A (*)',
      'Đáp án B (*)',
      'Đáp án C (*)',
      'Đáp án D (*)',
      'Đáp án đúng (*)',
      'Giải thích đáp án',
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }, // Blue 800
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 28;

    // Sample rows
    sheet.addRow([
      'TECH-EX-001',
      'TECH',
      'Trong hệ điều hành Linux, lệnh nào dùng để hiển thị đường dẫn thư mục hiện tại?',
      'pwd',
      'cd',
      'ls',
      'dir',
      'A',
      'pwd là viết tắt của print working directory.',
    ]);

    sheet.addRow([
      'SALES-EX-001',
      'SALES',
      'Thuật ngữ CRM trong quản trị doanh nghiệp là viết tắt của gì?',
      'Customer Relationship Management',
      'Customer Record Marketing',
      'Company Resource Management',
      'Client Reaction Model',
      'A',
      'CRM là hệ thống quản lý quan hệ khách hàng.',
    ]);

    // Set column widths
    sheet.columns = [
      { width: 18 }, // Mã câu hỏi
      { width: 18 }, // Mã phòng ban
      { width: 45 }, // Nội dung
      { width: 30 }, // A
      { width: 30 }, // B
      { width: 30 }, // C
      { width: 30 }, // D
      { width: 16 }, // Đáp án đúng
      { width: 35 }, // Giải thích
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as any);
  }

  async validateExcel(fileBuffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(fileBuffer as any);
    } catch (e) {
      throw new BadRequestException('File tải lên không đúng định dạng .xlsx hợp lệ.');
    }

    const worksheet = workbook.getWorksheet('DanhSachCauHoi') || workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Tệp Excel không chứa trang tính hợp lệ.');
    }

    // Pre-fetch departments and existing question codes
    const departments = await this.prisma.department.findMany({
      select: { id: true, code: true },
    });
    const depMap = new Map<string, string>(); // CODE -> ID
    departments.forEach((d) => depMap.set(d.code.toUpperCase(), d.id));

    const existingQuestions = await this.prisma.question.findMany({
      select: { code: true },
    });
    const existingCodeSet = new Set<string>(existingQuestions.map((q) => q.code.toUpperCase()));

    const seenInFileCodes = new Set<string>();
    const validRows: ValidatedQuestionRow[] = [];
    const errors: ExcelValidationError[] = [];

    let rowCount = 0;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const codeRaw = row.getCell(1).text?.trim();
      const depCodeRaw = row.getCell(2).text?.trim();
      const contentRaw = row.getCell(3).text?.trim();
      const optA = row.getCell(4).text?.trim();
      const optB = row.getCell(5).text?.trim();
      const optC = row.getCell(6).text?.trim();
      const optD = row.getCell(7).text?.trim();
      const correctRaw = row.getCell(8).text?.trim()?.toUpperCase();
      const explanationRaw = row.getCell(9).text?.trim();

      // Check if entire row is empty
      if (!codeRaw && !depCodeRaw && !contentRaw) {
        return;
      }

      rowCount++;
      let hasRowError = false;

      // Validate Code
      if (!codeRaw) {
        errors.push({ row: rowNumber, field: 'Mã câu hỏi', message: 'Mã câu hỏi không được để trống' });
        hasRowError = true;
      } else {
        const codeUpper = codeRaw.toUpperCase();
        if (existingCodeSet.has(codeUpper)) {
          errors.push({
            row: rowNumber,
            code: codeRaw,
            field: 'Mã câu hỏi',
            message: `Mã câu hỏi '${codeRaw}' đã tồn tại trong cơ sở dữ liệu`,
          });
          hasRowError = true;
        } else if (seenInFileCodes.has(codeUpper)) {
          errors.push({
            row: rowNumber,
            code: codeRaw,
            field: 'Mã câu hỏi',
            message: `Mã câu hỏi '${codeRaw}' bị trùng lặp trong tệp Excel này`,
          });
          hasRowError = true;
        } else {
          seenInFileCodes.add(codeUpper);
        }
      }

      // Validate Department
      let depId = '';
      if (!depCodeRaw) {
        errors.push({ row: rowNumber, code: codeRaw, field: 'Mã phòng ban', message: 'Mã phòng ban không được để trống' });
        hasRowError = true;
      } else {
        const depUpper = depCodeRaw.toUpperCase();
        if (!depMap.has(depUpper)) {
          errors.push({
            row: rowNumber,
            code: codeRaw,
            field: 'Mã phòng ban',
            message: `Mã phòng ban '${depCodeRaw}' không tồn tại trong danh mục hệ thống`,
          });
          hasRowError = true;
        } else {
          depId = depMap.get(depUpper)!;
        }
      }

      // Validate Content
      if (!contentRaw) {
        errors.push({ row: rowNumber, code: codeRaw, field: 'Nội dung', message: 'Nội dung câu hỏi không được để trống' });
        hasRowError = true;
      }

      // Validate 4 Options
      if (!optA) {
        errors.push({ row: rowNumber, code: codeRaw, field: 'Đáp án A', message: 'Đáp án A không được để trống' });
        hasRowError = true;
      }
      if (!optB) {
        errors.push({ row: rowNumber, code: codeRaw, field: 'Đáp án B', message: 'Đáp án B không được để trống' });
        hasRowError = true;
      }
      if (!optC) {
        errors.push({ row: rowNumber, code: codeRaw, field: 'Đáp án C', message: 'Đáp án C không được để trống' });
        hasRowError = true;
      }
      if (!optD) {
        errors.push({ row: rowNumber, code: codeRaw, field: 'Đáp án D', message: 'Đáp án D không được để trống' });
        hasRowError = true;
      }

      // Validate Correct Key
      if (!correctRaw || !['A', 'B', 'C', 'D'].includes(correctRaw)) {
        errors.push({
          row: rowNumber,
          code: codeRaw,
          field: 'Đáp án đúng',
          message: `Đáp án đúng phải là một trong các giá trị A, B, C hoặc D (nhận được: '${correctRaw || 'trống'}')`,
        });
        hasRowError = true;
      }

      if (!hasRowError) {
        validRows.push({
          code: codeRaw.toUpperCase(),
          departmentCode: depCodeRaw.toUpperCase(),
          departmentId: depId,
          content: contentRaw,
          options: {
            A: optA,
            B: optB,
            C: optC,
            D: optD,
          },
          correctKey: correctRaw as 'A' | 'B' | 'C' | 'D',
          explanation: explanationRaw || undefined,
        });
      }
    });

    return {
      totalRows: rowCount,
      validCount: validRows.length,
      errorCount: errors.length,
      validRows,
      errors,
    };
  }

  async confirmImport(validRows: ValidatedQuestionRow[]) {
    if (!validRows || validRows.length === 0) {
      throw new BadRequestException('Không có câu hỏi hợp lệ nào để import.');
    }

    const createdQuestions = await this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const row of validRows) {
        const question = await tx.question.create({
          data: {
            code: row.code,
            departmentId: row.departmentId,
            content: row.content,
            explanation: row.explanation || null,
            status: QuestionStatus.ACTIVE,
          },
        });

        const optionsData = [
          { key: 'A', content: row.options.A, isCorrect: row.correctKey === 'A' },
          { key: 'B', content: row.options.B, isCorrect: row.correctKey === 'B' },
          { key: 'C', content: row.options.C, isCorrect: row.correctKey === 'C' },
          { key: 'D', content: row.options.D, isCorrect: row.correctKey === 'D' },
        ];

        for (const opt of optionsData) {
          await tx.questionOption.create({
            data: {
              questionId: question.id,
              key: opt.key,
              content: opt.content,
              isCorrect: opt.isCorrect,
            },
          });
        }
        results.push(question.id);
      }
      return results;
    });

    await this.prisma.auditLog
      .create({
        data: {
          action: 'IMPORT_QUESTIONS',
          entity: 'Question',
          details: { importedCount: createdQuestions.length },
        },
      })
      .catch(() => {});

    return {
      message: `Nhập thành công ${createdQuestions.length} câu hỏi vào ngân hàng đề thi.`,
      importedCount: createdQuestions.length,
    };
  }

  async delete(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            attemptQuestions: true,
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Không tìm thấy câu hỏi.');
    }

    if (question._count.attemptQuestions > 0) {
      throw new BadRequestException(
        `Không thể xóa câu hỏi này vì đã có ${question._count.attemptQuestions} bài làm của thí sinh liên kết tới nó. Hãy sử dụng chức năng 'Tắt câu hỏi' (Ẩn) để câu hỏi không xuất hiện trong các kỳ thi mới.`,
      );
    }

    await this.prisma.question.delete({ where: { id } });

    await this.prisma.auditLog
      .create({
        data: {
          action: 'DELETE_QUESTION',
          entity: 'Question',
          entityId: id,
          details: { code: question.code, content: question.content.substring(0, 100) },
        },
      })
      .catch(() => {});

    return { message: `Đã xóa câu hỏi [${question.code}] thành công.` };
  }
}
