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
import * as crypto from 'crypto';

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
    // 1. Validate department exists
    const dep = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!dep) {
      throw new BadRequestException('Phòng ban không tồn tại.');
    }

    // 2. Handle & Auto-generate question code if not provided
    let finalCode = dto.code ? dto.code.trim().toUpperCase() : '';
    if (!finalCode) {
      const prefix = dep.code ? dep.code.trim().toUpperCase() : 'Q';
      let attempt = 0;
      do {
        const randHex = crypto.randomBytes(3).toString('hex').toUpperCase();
        finalCode = `${prefix}-Q${randHex}`;
        const existing = await this.prisma.question.findUnique({
          where: { code: finalCode },
        });
        if (!existing) break;
        attempt++;
      } while (attempt < 100);
    } else {
      const existing = await this.prisma.question.findUnique({
        where: { code: finalCode },
      });
      if (existing) {
        throw new ConflictException(`Mã câu hỏi '${dto.code}' đã tồn tại.`);
      }
    }

    // 3. Validate options: exactly 4 options A, B, C, D and exactly ONE correct
    this.validateOptions(dto.options);

    // 4. Create question and options in a transaction
    const created = await this.prisma.$transaction(async (tx) => {
      const question = await tx.question.create({
        data: {
          code: finalCode,
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
    workbook.creator = 'Hệ Thống Thi Trắc Nghiệm SDTC';
    workbook.created = new Date();

    // Query active departments to put in Sheet 2 and as guidance
    const departments = await this.prisma.department.findMany({
      select: { code: true, name: true },
      orderBy: { code: 'asc' },
    });

    // Sheet 1: Danh sách câu hỏi (Không cần cột Mã câu hỏi, hệ thống sẽ tự sinh)
    const sheet1 = workbook.addWorksheet('DanhSachCauHoi', {
      views: [{ showGridLines: true }],
    });

    const headers1 = [
      'Mã phòng ban (*)',
      'Nội dung câu hỏi (*)',
      'Đáp án A (*)',
      'Đáp án B (*)',
      'Đáp án C (*)',
      'Đáp án D (*)',
      'Đáp án đúng (*)',
      'Giải thích đáp án',
    ];

    const headerRow1 = sheet1.addRow(headers1);
    headerRow1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow1.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066B1' }, // SAIGONBANK Blue #0066B1
    };
    headerRow1.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow1.height = 28;

    // Sample rows using actual departments or fallback
    const sampleDep1 = departments.length > 0 ? departments[0].code : 'TECH';
    const sampleDep2 = departments.length > 1 ? departments[1].code : 'SALES';

    sheet1.addRow([
      sampleDep1,
      'Trong hệ điều hành Linux, lệnh nào dùng để hiển thị đường dẫn thư mục hiện tại?',
      'pwd',
      'cd',
      'ls',
      'dir',
      'A',
      'pwd là viết tắt của print working directory.',
    ]);

    sheet1.addRow([
      sampleDep2,
      'Thuật ngữ CRM trong quản trị doanh nghiệp là viết tắt của cụm từ gì?',
      'Customer Relationship Management',
      'Customer Record Marketing',
      'Company Resource Management',
      'Client Reaction Model',
      'A',
      'CRM là hệ thống quản lý quan hệ khách hàng.',
    ]);

    // Set column widths for Sheet 1
    sheet1.columns = [
      { width: 22 }, // Mã phòng ban
      { width: 48 }, // Nội dung câu hỏi
      { width: 32 }, // Đáp án A
      { width: 32 }, // Đáp án B
      { width: 32 }, // Đáp án C
      { width: 32 }, // Đáp án D
      { width: 18 }, // Đáp án đúng
      { width: 38 }, // Giải thích
    ];

    // Sheet 2: Danh sách phòng ban (để người dùng tra cứu mã phòng ban)
    const sheet2 = workbook.addWorksheet('DanhSachPhongBan', {
      views: [{ showGridLines: true }],
    });

    const headers2 = [
      'STT',
      'Mã phòng ban (Nhập vào cột Mã phòng ban)',
      'Tên phòng ban',
    ];

    const headerRow2 = sheet2.addRow(headers2);
    headerRow2.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow2.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066B1' }, // SAIGONBANK Blue #0066B1
    };
    headerRow2.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow2.height = 28;

    departments.forEach((dept, idx) => {
      const row = sheet2.addRow([idx + 1, dept.code, dept.name]);
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).font = { bold: true };
      row.getCell(2).alignment = { horizontal: 'center' };
    });

    sheet2.columns = [
      { width: 10 }, // STT
      { width: 38 }, // Mã phòng ban
      { width: 45 }, // Tên phòng ban
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

    // Check header to detect template format:
    // Legacy format: column 1 contains "mã câu hỏi" or "code"
    // New format: column 1 contains "mã phòng ban" or "department"
    const firstHeaderCell = worksheet.getRow(1).getCell(1).text?.trim().toLowerCase() || '';
    const isLegacyFormat = firstHeaderCell.includes('câu hỏi') || firstHeaderCell.includes('code');

    const seenInFileCodes = new Set<string>();
    const validRows: ValidatedQuestionRow[] = [];
    const errors: ExcelValidationError[] = [];

    let rowCount = 0;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      let codeRaw = '';
      let depCodeRaw = '';
      let contentRaw = '';
      let optA = '';
      let optB = '';
      let optC = '';
      let optD = '';
      let correctRaw = '';
      let explanationRaw = '';

      if (isLegacyFormat) {
        codeRaw = row.getCell(1).text?.trim();
        depCodeRaw = row.getCell(2).text?.trim();
        contentRaw = row.getCell(3).text?.trim();
        optA = row.getCell(4).text?.trim();
        optB = row.getCell(5).text?.trim();
        optC = row.getCell(6).text?.trim();
        optD = row.getCell(7).text?.trim();
        correctRaw = row.getCell(8).text?.trim()?.toUpperCase();
        explanationRaw = row.getCell(9).text?.trim();
      } else {
        // New standard format (No question code column in template)
        depCodeRaw = row.getCell(1).text?.trim();
        contentRaw = row.getCell(2).text?.trim();
        optA = row.getCell(3).text?.trim();
        optB = row.getCell(4).text?.trim();
        optC = row.getCell(5).text?.trim();
        optD = row.getCell(6).text?.trim();
        correctRaw = row.getCell(7).text?.trim()?.toUpperCase();
        explanationRaw = row.getCell(8).text?.trim();
      }

      // Check if entire row is empty
      if (!depCodeRaw && !contentRaw && !optA) {
        return;
      }

      rowCount++;
      let hasRowError = false;

      // Validate Department first
      let depId = '';
      const depUpper = depCodeRaw ? depCodeRaw.toUpperCase() : '';
      if (!depCodeRaw) {
        errors.push({
          row: rowNumber,
          code: codeRaw || '—',
          field: 'Mã phòng ban',
          message: 'Mã phòng ban không được để trống (tham khảo sheet DanhSachPhongBan)',
        });
        hasRowError = true;
      } else {
        if (!depMap.has(depUpper)) {
          errors.push({
            row: rowNumber,
            code: codeRaw || '—',
            field: 'Mã phòng ban',
            message: `Mã phòng ban '${depCodeRaw}' không tồn tại trong danh mục hệ thống (xem sheet DanhSachPhongBan)`,
          });
          hasRowError = true;
        } else {
          depId = depMap.get(depUpper)!;
        }
      }

      // Handle & Auto-generate Question Code
      let finalCode = '';
      if (codeRaw) {
        // User explicitly provided a code (in legacy template)
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
          finalCode = codeUpper;
        }
      } else {
        // Auto-generate code automatically based on department and hash/random
        let attempt = 0;
        const prefix = depUpper || 'Q';
        do {
          const randHex = crypto.randomBytes(3).toString('hex').toUpperCase();
          finalCode = `${prefix}-Q${randHex}`;
          attempt++;
        } while ((existingCodeSet.has(finalCode) || seenInFileCodes.has(finalCode)) && attempt < 100);
        seenInFileCodes.add(finalCode);
      }

      // Validate Content
      if (!contentRaw) {
        errors.push({ row: rowNumber, code: finalCode, field: 'Nội dung', message: 'Nội dung câu hỏi không được để trống' });
        hasRowError = true;
      }

      // Validate 4 Options
      if (!optA) {
        errors.push({ row: rowNumber, code: finalCode, field: 'Đáp án A', message: 'Đáp án A không được để trống' });
        hasRowError = true;
      }
      if (!optB) {
        errors.push({ row: rowNumber, code: finalCode, field: 'Đáp án B', message: 'Đáp án B không được để trống' });
        hasRowError = true;
      }
      if (!optC) {
        errors.push({ row: rowNumber, code: finalCode, field: 'Đáp án C', message: 'Đáp án C không được để trống' });
        hasRowError = true;
      }
      if (!optD) {
        errors.push({ row: rowNumber, code: finalCode, field: 'Đáp án D', message: 'Đáp án D không được để trống' });
        hasRowError = true;
      }

      // Validate Correct Key
      if (!correctRaw || !['A', 'B', 'C', 'D'].includes(correctRaw)) {
        errors.push({
          row: rowNumber,
          code: finalCode,
          field: 'Đáp án đúng',
          message: `Đáp án đúng phải là một trong các giá trị A, B, C hoặc D (nhận được: '${correctRaw || 'trống'}')`,
        });
        hasRowError = true;
      }

      if (!hasRowError) {
        validRows.push({
          code: finalCode,
          departmentCode: depUpper,
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
