import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to write an audit log entry safely without throwing errors into caller
   */
  async log(data: {
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    details?: any;
    ipAddress?: string;
  }) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: data.userId || null,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId || null,
          details: data.details || Prisma.DbNull,
          ipAddress: data.ipAddress || null,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record audit log: ${err.message}`, err.stack);
      return null;
    }
  }

  async findAll(query: QueryAuditLogsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (query.action && query.action !== 'ALL') {
      where.action = query.action;
    }

    if (query.entity && query.entity !== 'ALL') {
      where.entity = query.entity;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { user: { fullName: { contains: s, mode: 'insensitive' } } },
        { user: { username: { contains: s, mode: 'insensitive' } } },
        { user: { email: { contains: s, mode: 'insensitive' } } },
        { action: { contains: s, mode: 'insensitive' } },
        { entity: { contains: s, mode: 'insensitive' } },
        { ipAddress: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              email: true,
              role: true,
              department: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalToday, loginsToday, adminActionsToday, examTakesToday] = await Promise.all([
      this.prisma.auditLog.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      this.prisma.auditLog.count({
        where: {
          createdAt: { gte: startOfToday },
          action: 'LOGIN',
        },
      }),
      this.prisma.auditLog.count({
        where: {
          createdAt: { gte: startOfToday },
          action: {
            in: [
              'CREATE_EXAM',
              'UPDATE_EXAM',
              'PUBLISH_EXAM',
              'REVERT_EXAM_TO_DRAFT',
              'DELETE_EXAM',
              'CREATE_USER',
              'UPDATE_USER',
              'IMPORT_USERS',
              'CREATE_DEPARTMENT',
              'UPDATE_DEPARTMENT',
              'IMPORT_DEPARTMENTS',
              'CREATE_QUESTION',
              'UPDATE_QUESTION',
              'DELETE_QUESTION',
              'IMPORT_QUESTIONS',
            ],
          },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          createdAt: { gte: startOfToday },
          action: {
            in: ['START_EXAM', 'SUBMIT_EXAM', 'TAB_SWITCH_VIOLATION'],
          },
        },
      }),
    ]);

    return {
      totalToday,
      loginsToday,
      adminActionsToday,
      examTakesToday,
    };
  }
}
