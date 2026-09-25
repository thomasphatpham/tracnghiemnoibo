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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionsDto } from './dto/query-questions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('questions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  async findAll(@Query() query: QueryQuestionsDto) {
    return this.questionsService.findAll(query);
  }

  @Get('import/template')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.questionsService.generateTemplate();
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
  @UseInterceptors(FileInterceptor('file'))
  async validateExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn tệp tin Excel (.xlsx) để tải lên.');
    }
    return this.questionsService.validateExcel(file.buffer);
  }

  @Post('import/confirm')
  async confirmImport(@Body('validRows') validRows: any[]) {
    return this.questionsService.confirmImport(validRows);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.questionsService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateQuestionDto) {
    return this.questionsService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.questionsService.update(id, dto);
  }

  @Patch(':id/toggle-status')
  async toggleStatus(@Param('id') id: string) {
    return this.questionsService.toggleStatus(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.questionsService.delete(id);
  }
}
