import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountRequestDto } from './dto/create-account-request.dto';
import { RejectAccountRequestDto } from './dto/reject-account-request.dto';
import { AccountRequestStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AccountRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAccountRequestDto) {
    const username = dto.username.trim().toLowerCase();
    const email = dto.email.trim().toLowerCase();

    // 1. Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new ConflictException(`Tên đăng nhập '${username}' đã tồn tại trong hệ thống.`);
      }
      throw new ConflictException(`Email '${email}' đã được đăng ký trong hệ thống.`);
    }

    // 2. Check if there's a PENDING request with same username or email
    const pendingRequest = await this.prisma.accountRequest.findFirst({
      where: {
        status: AccountRequestStatus.PENDING,
        OR: [{ username }, { email }],
      },
    });

    if (pendingRequest) {
      if (pendingRequest.username === username) {
        throw new ConflictException(`Tên đăng nhập '${username}' đang có yêu cầu chờ duyệt.`);
      }
      throw new ConflictException(`Email '${email}' đang có yêu cầu chờ duyệt.`);
    }

    // 3. Check department validity
    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });

    if (!department || department.status !== 'ACTIVE') {
      throw new BadRequestException('Phòng ban được chọn không hợp lệ hoặc đã ngừng hoạt động.');
    }

    // 4. Create request record
    const request = await this.prisma.accountRequest.create({
      data: {
        fullName: dto.fullName.trim(),
        username,
        email,
        departmentId: dto.departmentId,
        position: dto.position ? dto.position.trim() : null,
        reason: dto.reason ? dto.reason.trim() : null,
        status: AccountRequestStatus.PENDING,
      },
      include: {
        department: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    return {
      success: true,
      message: 'Gửi yêu cầu cấp tài khoản thành công. Vui lòng chờ Ban Quản trị phê duyệt!',
      data: request,
    };
  }

  async findAll(query: {
    status?: AccountRequestStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { fullName: { contains: s, mode: 'insensitive' } },
        { username: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [data, total, pendingCount] = await Promise.all([
      this.prisma.accountRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          department: {
            select: { id: true, code: true, name: true },
          },
        },
      }),
      this.prisma.accountRequest.count({ where }),
      this.prisma.accountRequest.count({
        where: { status: AccountRequestStatus.PENDING },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      pendingCount,
    };
  }

  async approve(id: string, adminUserId: string) {
    const request = await this.prisma.accountRequest.findUnique({
      where: { id },
      include: { department: true },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu cấp tài khoản.');
    }

    if (request.status !== AccountRequestStatus.PENDING) {
      throw new BadRequestException('Yêu cầu này đã được xử lý trước đó.');
    }

    // Check if user account was created in the meantime
    const conflictUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: request.username }, { email: request.email }],
      },
    });

    if (conflictUser) {
      throw new ConflictException(
        'Tên đăng nhập hoặc Email này đã tồn tại trong hệ thống người dùng.',
      );
    }

    // Default password for newly approved user
    const defaultPassword = 'User@123456';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const [user, updatedRequest] = await this.prisma.$transaction([
      this.prisma.user.create({
        data: {
          username: request.username,
          email: request.email,
          passwordHash,
          fullName: request.fullName,
          position: request.position,
          departmentId: request.departmentId,
          role: 'EMPLOYEE',
          status: 'ACTIVE',
        },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.accountRequest.update({
        where: { id },
        data: {
          status: AccountRequestStatus.APPROVED,
          reviewedBy: adminUserId,
          reviewedAt: new Date(),
        },
      }),
    ]);

    return {
      success: true,
      message: `Đã phê duyệt thành công! Tài khoản '${user.username}' đã được tạo với mật khẩu mặc định là '${defaultPassword}'.`,
      user,
      request: updatedRequest,
    };
  }

  async reject(id: string, adminUserId: string, dto: RejectAccountRequestDto) {
    const request = await this.prisma.accountRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu cấp tài khoản.');
    }

    if (request.status !== AccountRequestStatus.PENDING) {
      throw new BadRequestException('Yêu cầu này đã được xử lý trước đó.');
    }

    const updatedRequest = await this.prisma.accountRequest.update({
      where: { id },
      data: {
        status: AccountRequestStatus.REJECTED,
        rejectionReason: dto.rejectionReason?.trim() || 'Không đáp ứng điều kiện cấp tài khoản',
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Đã từ chối yêu cầu cấp tài khoản.',
      request: updatedRequest,
    };
  }

  async getPublicDepartments() {
    return this.prisma.department.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
