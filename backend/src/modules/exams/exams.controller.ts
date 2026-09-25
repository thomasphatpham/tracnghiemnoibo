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
} from '@nestjs/common';
import { ExamsService } from './exams.service';
import { AttemptsService } from '../attempts/attempts.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { QueryExamsDto } from './dto/query-exams.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamsController {
  constructor(
    private readonly examsService: ExamsService,
    private readonly attemptsService: AttemptsService,
  ) {}

  @Get()
  async findAll(@Query() query: QueryExamsDto, @CurrentUser() user: any) {
    return this.examsService.findAll(query, user);
  }

  @Get('violations/alerts')
  @Roles(Role.ADMIN)
  async getViolationAlerts() {
    return this.examsService.getViolationAlerts();
  }

  @Get(':id/violations')
  @Roles(Role.ADMIN)
  async getExamViolations(
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.examsService.getExamViolations(id, { search, status });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.examsService.findOne(id, user);
  }

  @Get(':id/availability')
  async checkAvailability(@Param('id') id: string) {
    return this.examsService.checkAvailability(id);
  }

  @Post(':id/start')
  async start(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.attemptsService.startExam(id, userId);
  }

  @Post()
  @Roles(Role.ADMIN)
  async create(
    @Body() dto: CreateExamDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.examsService.create(dto, userId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateExamDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.examsService.update(id, dto, userId);
  }

  @Patch(':id/publish')
  @Roles(Role.ADMIN)
  async publish(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.examsService.publish(id, userId);
  }

  @Patch(':id/revert-to-draft')
  @Roles(Role.ADMIN)
  async revertToDraft(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.examsService.revertToDraft(id, userId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.examsService.delete(id, userId);
  }
}
