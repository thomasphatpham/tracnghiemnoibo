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
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response, Request } from 'express';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionsDto } from './dto/query-questions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { getRealClientIp } from '../../common/utils/ip.util';

@Controller('questions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  @RequirePermission('questions', 'read')
  async findAll(
    @Query() query: QueryQuestionsDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const clientIp = getRealClientIp(req);
    return this.questionsService.findAll(query, user, clientIp);
  }

  @Get('import/template')
  @RequirePermission('questions', 'read')
  async downloadTemplate(@Res() res: Response, @CurrentUser() user: any) {
    const buffer = await this.questionsService.generateTemplate(user);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Mau_Import_Ngan_Hang_Cau_Hoi.xlsx"',
    );
    res.send(buffer);
  }

  @Post('import/validate')
  @RequirePermission('questions', 'import')
  @UseInterceptors(FileInterceptor('file'))
  async validateExcel(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn tệp tin Excel (.xlsx) để tải lên.');
    }
    return this.questionsService.validateExcel(file.buffer, user);
  }

  @Post('import/confirm')
  @RequirePermission('questions', 'import')
  async confirmImport(
    @Body('validRows') validRows: any[],
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const clientIp = getRealClientIp(req);
    return this.questionsService.confirmImport(validRows, user, clientIp);
  }

  @Get(':id')
  @RequirePermission('questions', 'read')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const clientIp = getRealClientIp(req);
    return this.questionsService.findOne(id, user, clientIp);
  }

  @Post()
  @RequirePermission('questions', 'create')
  async create(
    @Body() dto: CreateQuestionDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const clientIp = getRealClientIp(req);
    return this.questionsService.create(dto, user, clientIp);
  }

  @Patch(':id')
  @RequirePermission('questions', 'update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const clientIp = getRealClientIp(req);
    return this.questionsService.update(id, dto, user, clientIp);
  }

  @Patch(':id/toggle-status')
  @RequirePermission('questions', 'update')
  async toggleStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const clientIp = getRealClientIp(req);
    return this.questionsService.toggleStatus(id, user, clientIp);
  }

  @Delete(':id')
  @RequirePermission('questions', 'delete')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    const clientIp = getRealClientIp(req);
    return this.questionsService.delete(id, user, clientIp);
  }
}
