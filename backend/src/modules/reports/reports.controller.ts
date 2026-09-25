import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  async getSummary() {
    return this.reportsService.getSummary();
  }

  @Get('exams')
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
  async getExamCandidates(
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.reportsService.getExamCandidates(id, { search, status });
  }

  @Get('departments')
  async getDepartmentsReport() {
    return this.reportsService.getDepartmentsReport();
  }

  @Get('export/exam/:id')
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
}
