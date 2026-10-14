import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @Roles(Role.ADMIN)
  async getSummary() {
    return this.reportsService.getSummary();
  }

  @Get('exams')
  @Roles(Role.ADMIN)
  async getExamsReport(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.reportsService.getExamsReport({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Get('exams/:id/candidates')
  @Roles(Role.ADMIN)
  async getExamCandidates(
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.reportsService.getExamCandidates(id, { search, status });
  }

  @Get('departments')
  @Roles(Role.ADMIN)
  async getDepartmentsReport() {
    return this.reportsService.getDepartmentsReport();
  }

  @Get('export/exam/:id')
  @Roles(Role.ADMIN)
  async exportExamReport(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.reportsService.exportExamReport(id);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Bao_Cao_Ket_Qua_Ky_Thi_${id}.xlsx"`,
    );
    res.send(buffer);
  }

  @Get('export/overview')
  @Roles(Role.ADMIN)
  async exportOverviewReport(@Res() res: Response) {
    const buffer = await this.reportsService.exportOverviewReport();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Bao_Cao_Tong_Hop_Ket_Qua_Cac_Ky_Thi.xlsx"',
    );
    res.send(buffer);
  }

  @Get('my-department')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('reports', 'read')
  async getMyDepartment(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('examId') examId?: string,
    @Query('isPassed') isPassed?: string,
  ) {
    if (!user?.departmentId) {
      throw new BadRequestException('Tài khoản chưa được gán phòng ban trực thuộc.');
    }
    return this.reportsService.getMyDepartmentReport(user.departmentId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search,
      examId,
      isPassed:
        isPassed !== undefined
          ? isPassed === 'true'
            ? true
            : isPassed === 'false'
            ? false
            : undefined
          : undefined,
    });
  }

  @Get('my-department/export')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('reports', 'export')
  async exportMyDepartment(
    @CurrentUser() user: any,
    @Query('search') search: string,
    @Query('examId') examId: string,
    @Query('isPassed') isPassed: string,
    @Res() res: Response,
  ) {
    if (!user?.departmentId) {
      throw new BadRequestException('Tài khoản chưa được gán phòng ban trực thuộc.');
    }
    const buffer = await this.reportsService.exportMyDepartmentReport(user.departmentId, {
      search,
      examId,
      isPassed:
        isPassed !== undefined
          ? isPassed === 'true'
            ? true
            : isPassed === 'false'
            ? false
            : undefined
          : undefined,
    });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Bao_Cao_Phong_Ban_${user.department?.code || 'SDTC'}.xlsx"`,
    );
    res.send(buffer);
  }
}
