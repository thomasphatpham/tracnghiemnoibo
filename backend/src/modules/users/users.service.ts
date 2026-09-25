import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import * as bcrypt from 'bcrypt';
import { UserStatus, Role } from '@prisma/client';
import * as ExcelJS from 'exceljs';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryUsersDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where.role = query.role;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          position: true,
          role: true,
          status: true,
          failedLoginCount: true,
          lockedUntil: true,
          departmentId: true,
          department: {
            select: { id: true, code: true, name: true },
          },
          createdAt: true,
          _count: {
            select: {
              attempts: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
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
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        position: true,
        role: true,
        status: true,
        failedLoginCount: true,
        lockedUntil: true,
        departmentId: true,
        department: {
          select: { id: true, code: true, name: true },
        },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            attempts: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng.');
    }

    return user;
  }

  async create(dto: CreateUserDto) {
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username.trim() },
    });
    if (existingUsername) {
      throw new ConflictException(`Tên đăng nhập '${dto.username}' đã được sử dụng.`);
    }

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (existingEmail) {
      throw new ConflictException(`Email '${dto.email}' đã được sử dụng.`);
    }

    if (dto.departmentId) {
      const dep = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!dep) {
        throw new BadRequestException('Phòng ban không tồn tại.');
      }
    }

    const rawPassword = dto.password || 'User@123456';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username.trim(),
        email: dto.email.trim().toLowerCase(),
        passwordHash,
        fullName: dto.fullName.trim(),
        position: dto.position ? dto.position.trim() : null,
        role: dto.role || 'EMPLOYEE',
        status: dto.status || 'ACTIVE',
        departmentId: dto.departmentId || null,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        position: true,
        role: true,
        status: true,
        departmentId: true,
        createdAt: true,
      },
    });

    await this.prisma.auditLog
      .create({
        data: {
          action: 'CREATE_USER',
          entity: 'User',
          entityId: user.id,
          details: { username: user.username, fullName: user.fullName, role: user.role },
        },
      })
      .catch(() => {});

    return {
      message: 'Tạo tài khoản người dùng thành công.',
      user,
      initialPassword: dto.password ? undefined : 'User@123456',
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    const dataToUpdate: any = {};

    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      const existingEmail = await this.prisma.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (existingEmail) {
        throw new ConflictException(`Email '${dto.email}' đã được sử dụng bởi tài khoản khác.`);
      }
      dataToUpdate.email = email;
    }

    if (dto.fullName) dataToUpdate.fullName = dto.fullName.trim();
    if (dto.position !== undefined) dataToUpdate.position = dto.position ? dto.position.trim() : null;
    if (dto.role) dataToUpdate.role = dto.role;
    if (dto.status) dataToUpdate.status = dto.status;

    if (dto.departmentId !== undefined) {
      if (dto.departmentId) {
        const dep = await this.prisma.department.findUnique({
          where: { id: dto.departmentId },
        });
        if (!dep) {
          throw new BadRequestException('Phòng ban không tồn tại.');
        }
      }
      dataToUpdate.departmentId = dto.departmentId || null;
    }

    // If password is updated by admin, hash it and revoke user's sessions
    if (dto.password) {
      dataToUpdate.passwordHash = await bcrypt.hash(dto.password, 10);
      dataToUpdate.failedLoginCount = 0;
      dataToUpdate.lockedUntil = null;
      await this.prisma.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        position: true,
        role: true,
        status: true,
        departmentId: true,
        updatedAt: true,
      },
    });

    await this.prisma.auditLog
      .create({
        data: {
          action: 'UPDATE_USER',
          entity: 'User',
          entityId: id,
          details: { username: updated.username, updatedFields: Object.keys(dataToUpdate) },
        },
      })
      .catch(() => {});

    return { message: 'Cập nhật tài khoản thành công.', user: updated };
  }

  async toggleLock(id: string) {
    const user = await this.findOne(id);

    if (user.role === 'ADMIN') {
      // Prevent locking the last active admin if needed
    }

    const isCurrentlyLocked = user.status === UserStatus.LOCKED || (user.lockedUntil && user.lockedUntil > new Date());
    const newStatus = isCurrentlyLocked ? UserStatus.ACTIVE : UserStatus.LOCKED;

    if (newStatus === UserStatus.LOCKED) {
      // Revoke all active sessions immediately
      await this.prisma.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        status: newStatus,
        failedLoginCount: 0,
        lockedUntil: null,
      },
      select: {
        id: true,
        username: true,
        status: true,
      },
    });

    await this.prisma.auditLog
      .create({
        data: {
          action: newStatus === UserStatus.LOCKED ? 'LOCK_USER' : 'UNLOCK_USER',
          entity: 'User',
          entityId: id,
          details: { username: user.username, status: newStatus },
        },
      })
      .catch(() => {});

    const actionText = newStatus === UserStatus.LOCKED ? 'Khóa' : 'Mở khóa';
    return {
      message: `${actionText} tài khoản thành công.`,
      user: updated,
    };
  }

  async delete(id: string, currentUserId?: string) {
    if (currentUserId && id === currentUserId) {
      throw new BadRequestException('Bạn không thể tự xóa chính tài khoản đang đăng nhập.');
    }

    const user = await this.findOne(id);

    if (user._count?.attempts > 0) {
      throw new BadRequestException(
        `Không thể xóa người dùng [${user.fullName}] vì đã có ${user._count.attempts} lượt bài thi sát hạch trên hệ thống. Vui lòng sử dụng tính năng 'Khóa tài khoản' để bảo lưu dữ liệu.`,
      );
    }

    await this.prisma.accountRequest.deleteMany({
      where: {
        OR: [{ username: user.username }, { email: user.email }],
      },
    });

    await this.prisma.user.delete({ where: { id } });

    await this.prisma.auditLog
      .create({
        data: {
          action: 'DELETE_USER',
          entity: 'User',
          entityId: id,
          details: { username: user.username, fullName: user.fullName },
        },
      })
      .catch(() => {});

    return {
      message: `Đã xóa tài khoản [${user.fullName} (${user.username})] thành công.`,
    };
  }

  // EXCEL IMPORT & TEMPLATE
  async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hệ Thống Thi Trắc Nghiệm';
    workbook.created = new Date();

    // Sheet 1: Danh sách người dùng
    const sheet = workbook.addWorksheet('DanhSachNguoiDung', {
      views: [{ showGridLines: true }],
    });

    const headers = [
      'Tên đăng nhập (*)',
      'Email (*)',
      'Họ và tên (*)',
      'Mật khẩu ban đầu',
      'Mã phòng ban',
      'Chức vụ / Vị trí',
      'Vai trò (EMPLOYEE / ADMIN)',
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
      'nv.tech01',
      'nv.tech01@saigonbank.com.vn',
      'Nguyễn Văn An',
      'User@123456',
      'TECH',
      'Chuyên viên CNTT',
      'EMPLOYEE',
    ]);

    sheet.addRow([
      'nv.sales01',
      'nv.sales01@saigonbank.com.vn',
      'Trần Thị Bình',
      'User@123456',
      'SALES',
      'Giao dịch viên',
      'EMPLOYEE',
    ]);

    sheet.columns = [
      { width: 22 }, // Tên đăng nhập
      { width: 35 }, // Email
      { width: 28 }, // Họ và tên
      { width: 20 }, // Mật khẩu ban đầu
      { width: 20 }, // Mã phòng ban
      { width: 25 }, // Chức vụ / Vị trí
      { width: 30 }, // Vai trò
    ];

    // Sheet 2: Danh sách phòng ban tra cứu
    const departments = await this.prisma.department.findMany({
      where: { status: 'ACTIVE' },
      select: { code: true, name: true },
      orderBy: { code: 'asc' },
    });

    const depSheet = workbook.addWorksheet('DanhSachPhongBan');
    const depHeader = depSheet.addRow(['Mã phòng ban', 'Tên phòng ban']);
    depHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    depHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF334155' }, // Slate 700
    };
    depSheet.columns = [{ width: 20 }, { width: 45 }];

    departments.forEach((d) => {
      depSheet.addRow([d.code, d.name]);
    });

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

    const worksheet = workbook.getWorksheet('DanhSachNguoiDung') || workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Tệp Excel không chứa trang tính hợp lệ.');
    }

    const [existingUsers, departments] = await Promise.all([
      this.prisma.user.findMany({
        select: { username: true, email: true },
      }),
      this.prisma.department.findMany({
        select: { id: true, code: true },
      }),
    ]);

    const existingUsernames = new Set(existingUsers.map((u) => u.username.toLowerCase()));
    const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));
    const depMap = new Map<string, string>();
    departments.forEach((d) => depMap.set(d.code.toUpperCase(), d.id));

    const seenInFileUsernames = new Set<string>();
    const seenInFileEmails = new Set<string>();

    const validRows: any[] = [];
    const errors: { row: number; field: string; code?: string; message: string }[] = [];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let rowCount = 0;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const usernameRaw = row.getCell(1).text?.trim();
      const emailRaw = row.getCell(2).text?.trim();
      const fullNameRaw = row.getCell(3).text?.trim();
      const passwordRaw = row.getCell(4).text?.trim() || 'User@123456';
      const depCodeRaw = row.getCell(5).text?.trim();
      const positionRaw = row.getCell(6).text?.trim();
      const roleRaw = row.getCell(7).text?.trim()?.toUpperCase() || 'EMPLOYEE';

      // Skip completely empty row
      if (!usernameRaw && !emailRaw && !fullNameRaw) return;

      rowCount++;
      let hasError = false;

      // Validate Username
      if (!usernameRaw) {
        errors.push({ row: rowNumber, field: 'Tên đăng nhập', message: 'Tên đăng nhập không được để trống' });
        hasError = true;
      } else if (usernameRaw.length < 3) {
        errors.push({
          row: rowNumber,
          code: usernameRaw,
          field: 'Tên đăng nhập',
          message: 'Tên đăng nhập phải có ít nhất 3 ký tự',
        });
        hasError = true;
      } else if (existingUsernames.has(usernameRaw.toLowerCase())) {
        errors.push({
          row: rowNumber,
          code: usernameRaw,
          field: 'Tên đăng nhập',
          message: `Tên đăng nhập '${usernameRaw}' đã tồn tại trong hệ thống`,
        });
        hasError = true;
      } else if (seenInFileUsernames.has(usernameRaw.toLowerCase())) {
        errors.push({
          row: rowNumber,
          code: usernameRaw,
          field: 'Tên đăng nhập',
          message: `Tên đăng nhập '${usernameRaw}' bị trùng lặp trong tệp Excel này`,
        });
        hasError = true;
      } else {
        seenInFileUsernames.add(usernameRaw.toLowerCase());
      }

      // Validate Email
      if (!emailRaw) {
        errors.push({
          row: rowNumber,
          code: usernameRaw,
          field: 'Email',
          message: 'Email không được để trống',
        });
        hasError = true;
      } else if (!emailRegex.test(emailRaw)) {
        errors.push({
          row: rowNumber,
          code: usernameRaw,
          field: 'Email',
          message: `Email '${emailRaw}' không đúng định dạng hợp lệ`,
        });
        hasError = true;
      } else if (existingEmails.has(emailRaw.toLowerCase())) {
        errors.push({
          row: rowNumber,
          code: usernameRaw,
          field: 'Email',
          message: `Email '${emailRaw}' đã được đăng ký trong hệ thống`,
        });
        hasError = true;
      } else if (seenInFileEmails.has(emailRaw.toLowerCase())) {
        errors.push({
          row: rowNumber,
          code: usernameRaw,
          field: 'Email',
          message: `Email '${emailRaw}' bị trùng lặp trong tệp Excel này`,
        });
        hasError = true;
      } else {
        seenInFileEmails.add(emailRaw.toLowerCase());
      }

      // Validate FullName
      if (!fullNameRaw) {
        errors.push({
          row: rowNumber,
          code: usernameRaw,
          field: 'Họ và tên',
          message: 'Họ và tên không được để trống',
        });
        hasError = true;
      }

      // Validate Department (optional or valid code)
      let departmentId: string | null = null;
      if (depCodeRaw) {
        const depUpper = depCodeRaw.toUpperCase();
        if (!depMap.has(depUpper)) {
          errors.push({
            row: rowNumber,
            code: usernameRaw,
            field: 'Mã phòng ban',
            message: `Mã phòng ban '${depCodeRaw}' không tồn tại trong hệ thống`,
          });
          hasError = true;
        } else {
          departmentId = depMap.get(depUpper)!;
        }
      }

      // Validate Role
      let role: Role = Role.EMPLOYEE;
      if (roleRaw === 'ADMIN') {
        role = Role.ADMIN;
      } else if (roleRaw && roleRaw !== 'EMPLOYEE') {
        errors.push({
          row: rowNumber,
          code: usernameRaw,
          field: 'Vai trò',
          message: `Vai trò phải là EMPLOYEE hoặc ADMIN (nhận được: '${roleRaw}')`,
        });
        hasError = true;
      }

      // Validate Password
      if (passwordRaw.length < 6) {
        errors.push({
          row: rowNumber,
          code: usernameRaw,
          field: 'Mật khẩu',
          message: 'Mật khẩu phải có độ dài từ 6 ký tự trở lên',
        });
        hasError = true;
      }

      if (!hasError) {
        validRows.push({
          username: usernameRaw,
          email: emailRaw.toLowerCase(),
          fullName: fullNameRaw,
          password: passwordRaw,
          departmentCode: depCodeRaw ? depCodeRaw.toUpperCase() : null,
          departmentId,
          position: positionRaw || null,
          role,
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

  async confirmImport(validRows: any[]) {
    if (!validRows || validRows.length === 0) {
      throw new BadRequestException('Không có tài khoản người dùng hợp lệ nào để import.');
    }

    const usersToCreate: any[] = [];
    for (const row of validRows) {
      const passwordHash = await bcrypt.hash(row.password, 10);
      usersToCreate.push({
        username: row.username,
        email: row.email,
        fullName: row.fullName,
        passwordHash,
        departmentId: row.departmentId || null,
        position: row.position || null,
        role: row.role || Role.EMPLOYEE,
        status: UserStatus.ACTIVE,
      });
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const userData of usersToCreate) {
        const u = await tx.user.create({ data: userData });
        results.push(u.id);
      }
      return results;
    });

    await this.prisma.auditLog
      .create({
        data: {
          action: 'IMPORT_USERS',
          entity: 'User',
          details: { importedCount: created.length },
        },
      })
      .catch(() => {});

    return {
      message: `Nhập thành công ${created.length} tài khoản người dùng vào cơ sở dữ liệu.`,
      importedCount: created.length,
    };
  }
}
