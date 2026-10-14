import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ExamsService } from './exams.service';
import { AttemptsService } from '../attempts/attempts.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { QueryExamsDto } from './dto/query-exams.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('exams')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExamsController {
  constructor(
    private readonly examsService: ExamsService,
    private readonly attemptsService: AttemptsService,
  ) {}

  private extractClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.ip ||
      '127.0.0.1'
    );
  }

  @Get()
  async findAll(
    @Query() query: QueryExamsDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const clientIp = this.extractClientIp(req);
    return this.examsService.findAll(query, user, clientIp);
  }

  @Get('violations/alerts')
  @RequirePermission('exams', 'read')
  async getViolationAlerts(@CurrentUser() user: any) {
    return this.examsService.getViolationAlerts(user);
  }

  @Get(':id/violations')
  @RequirePermission('exams', 'read')
  async getExamViolations(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.examsService.getExamViolations(id, { search, status }, user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.examsService.findOne(id, user);
  }

  @Get(':id/availability')
  async checkAvailability(@Param('id') id: string, @CurrentUser() user: any) {
    return this.examsService.checkAvailability(id, user);
  }

  @Post(':id/start')
  async start(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.attemptsService.startExam(id, userId);
  }

  @Post()
  @RequirePermission('exams', 'create')
  async create(
    @Body() dto: CreateExamDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const clientIp = this.extractClientIp(req);
    return this.examsService.create(dto, user?.id, user, clientIp);
  }

  @Patch(':id')
  @RequirePermission('exams', 'update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateExamDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const clientIp = this.extractClientIp(req);
    return this.examsService.update(id, dto, user?.id, user, clientIp);
  }

  @Patch(':id/publish')
  @RequirePermission('exams', 'publish')
  async publish(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const clientIp = this.extractClientIp(req);
    return this.examsService.publish(id, user?.id, user, clientIp);
  }

  @Patch(':id/revert-to-draft')
  @RequirePermission('exams', 'publish')
  async revertToDraft(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const clientIp = this.extractClientIp(req);
    return this.examsService.revertToDraft(id, user?.id, user, clientIp);
  }

  @Delete(':id')
  @RequirePermission('exams', 'delete')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const clientIp = this.extractClientIp(req);
    return this.examsService.delete(id, user?.id, user, clientIp);
  }
}
