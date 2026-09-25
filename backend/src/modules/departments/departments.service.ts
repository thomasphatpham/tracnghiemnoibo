import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: { onlyActive?: boolean; page?: number; limit?: number; search?: string } | boolean) {
    let onlyActive = false;
    let page: number | undefined;
    let limit: number | undefined;
    let search: string | undefined;

    if (typeof query === 'boolean') {
      onlyActive = query;
    } else if (query) {
      onlyActive = !!query.onlyActive;
      page = query.page;
      limit = query.limit;
      search = query.search;
    }

    const where: any = onlyActive ? { status: DepartmentStatus.ACTIVE } : {};

    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (page !== undefined || limit !== undefined) {
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Number(limit) || 10);
      const skip = (pageNum - 1) * limitNum;

      const [data, total] = await Promise.all([
        this.prisma.department.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { code: 'asc' },
          include: {
            _count: {
              select: {
                users: true,
                questions: true,
              },
            },
          },
        }),
        this.prisma.department.count({ where }),
      ]);

      return { data, total, page: pageNum, limit: limitNum };
    }

    return this.prisma.department.findMany({
      where,
      orderBy: { code: 'asc' },
      include: {
        _count: {
          select: {
            users: true,
            questions: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            questions: true,
          },
        },
      },
    });
    if (!department) {
      throw new NotFoundException('Không tìm thấy phòng ban.');
    }
    return department;
  }

  async create(dto: CreateDepartmentDto) {
    const existing = await this.prisma.department.findUnique({
      where: { code: dto.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`Mã phòng ban '${dto.code}' đã tồn tại.`);
    }

    const created = await this.prisma.department.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        status: DepartmentStatus.ACTIVE,
      },
    });

    await this.prisma.auditLog
      .create({
        data: {
          action: 'CREATE_DEPARTMENT',
          entity: 'Department',
          entityId: created.id,
          details: { code: created.code, name: created.name },
        },
      })
      .catch(() => {});

    return created;
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    await this.findOne(id);

    const updated = await this.prisma.department.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });

    await this.prisma.auditLog
      .create({
        data: {
          action: 'UPDATE_DEPARTMENT',
          entity: 'Department',
          entityId: id,
          details: { name: updated.name, status: updated.status },
        },
      })
      .catch(() => {});

    return updated;
  }

  async toggleStatus(id: string) {
    const dep = await this.findOne(id);
    const newStatus =
      dep.status === DepartmentStatus.ACTIVE
        ? DepartmentStatus.INACTIVE
        : DepartmentStatus.ACTIVE;

    return this.prisma.department.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  async delete(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            questions: true,
            examRules: true,
            assignedExams: true,
            accountRequests: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('Không tìm thấy phòng ban.');
    }

    const { users, questions, examRules, assignedExams } = department._count;
    if (users > 0) {
      throw new BadRequestException(
        `Không thể xóa phòng ban đang có ${users} nhân viên trực thuộc. Vui lòng chuyển nhân viên sang phòng ban khác trước khi xóa.`,
      );
    }

    if (questions > 0) {
      throw new BadRequestException(
        `Không thể xóa phòng ban đang có ${questions} câu hỏi trong ngân hàng. Vui lòng xóa hoặc chuyển câu hỏi trước.`,
      );
    }

    if (examRules > 0 || assignedExams > 0) {
      throw new BadRequestException(
        'Không thể xóa phòng ban đang được liên kết trong quy tắc phân bổ hoặc danh sách chỉ định của kỳ thi.',
      );
    }

    // Delete any pending/processed account requests linked to this department
    await this.prisma.accountRequest.deleteMany({ where: { departmentId: id } });

    await this.prisma.department.delete({ where: { id } });

    await this.prisma.auditLog
      .create({
        data: {
          action: 'DELETE_DEPARTMENT',
          entity: 'Department',
          entityId: id,
          details: { code: department.code, name: department.name },
        },
      })
      .catch(() => {});

    return { message: `Đã xóa phòng ban ${department.name} (${department.code}) thành công.` };
  }

  // EXCEL IMPORT & TEMPLATE
  async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hệ Thống Thi Trắc Nghiệm';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('DanhSachPhongBan', {
      views: [{ showGridLines: true }],
    });

    const headers = [
      'Mã phòng ban (*)',
      'Tên phòng ban (*)',
      'Trạng thái (ACTIVE / INACTIVE)',
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
    sheet.addRow(['TECH', 'Phòng Kỹ thuật & Công nghệ', 'ACTIVE']);
    sheet.addRow(['SALES', 'Phòng Kinh doanh & Dịch vụ Khách hàng', 'ACTIVE']);
    sheet.addRow(['HR', 'Phòng Quản trị Nguồn nhân lực', 'ACTIVE']);
    sheet.addRow(['KT', 'Phòng Kế toán & Tài chính', 'ACTIVE']);

    sheet.columns = [
      { width: 25 }, // Mã phòng ban
      { width: 45 }, // Tên phòng ban
      { width: 30 }, // Trạng thái
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

    const worksheet = workbook.getWorksheet('DanhSachPhongBan') || workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Tệp Excel không chứa trang tính hợp lệ.');
    }

    const existingDepts = await this.prisma.department.findMany({
      select: { code: true },
    });
    const existingCodeSet = new Set(existingDepts.map((d) => d.code.toUpperCase()));
    const seenInFileCodes = new Set<string>();

    const validRows: { code: string; name: string; status: DepartmentStatus }[] = [];
    const errors: { row: number; field: string; code?: string; message: string }[] = [];

    let rowCount = 0;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const codeRaw = row.getCell(1).text?.trim();
      const nameRaw = row.getCell(2).text?.trim();
      const statusRaw = row.getCell(3).text?.trim()?.toUpperCase() || 'ACTIVE';

      // Skip completely empty row
      if (!codeRaw && !nameRaw) return;

      rowCount++;
      let hasError = false;

      // Validate Code
      if (!codeRaw) {
        errors.push({ row: rowNumber, field: 'Mã phòng ban', message: 'Mã phòng ban không được để trống' });
        hasError = true;
      } else {
        const codeUpper = codeRaw.toUpperCase();
        if (existingCodeSet.has(codeUpper)) {
          errors.push({
            row: rowNumber,
            code: codeRaw,
            field: 'Mã phòng ban',
            message: `Mã phòng ban '${codeRaw}' đã tồn tại trong hệ thống`,
          });
          hasError = true;
        } else if (seenInFileCodes.has(codeUpper)) {
          errors.push({
            row: rowNumber,
            code: codeRaw,
            field: 'Mã phòng ban',
            message: `Mã phòng ban '${codeRaw}' bị trùng lặp trong tệp Excel này`,
          });
          hasError = true;
        } else {
          seenInFileCodes.add(codeUpper);
        }
      }

      // Validate Name
      if (!nameRaw) {
        errors.push({
          row: rowNumber,
          code: codeRaw,
          field: 'Tên phòng ban',
          message: 'Tên phòng ban không được để trống',
        });
        hasError = true;
      }

      // Validate Status
      let status: DepartmentStatus = DepartmentStatus.ACTIVE;
      if (statusRaw === 'INACTIVE') {
        status = DepartmentStatus.INACTIVE;
      } else if (statusRaw && statusRaw !== 'ACTIVE') {
        errors.push({
          row: rowNumber,
          code: codeRaw,
          field: 'Trạng thái',
          message: `Trạng thái phải là ACTIVE hoặc INACTIVE (nhận được: '${statusRaw}')`,
        });
        hasError = true;
      }

      if (!hasError) {
        validRows.push({
          code: codeRaw.toUpperCase(),
          name: nameRaw,
          status,
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

  async confirmImport(validRows: { code: string; name: string; status: DepartmentStatus }[]) {
    if (!validRows || validRows.length === 0) {
      throw new BadRequestException('Không có phòng ban hợp lệ nào để import.');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const row of validRows) {
        const dep = await tx.department.create({
          data: {
            code: row.code,
            name: row.name,
            status: row.status,
          },
        });
        results.push(dep.id);
      }
      return results;
    });

    await this.prisma.auditLog
      .create({
        data: {
          action: 'IMPORT_DEPARTMENTS',
          entity: 'Department',
          details: { importedCount: created.length },
        },
      })
      .catch(() => {});

    return {
      message: `Nhập thành công ${created.length} phòng ban vào cơ sở dữ liệu.`,
      importedCount: created.length,
    };
  }
}
