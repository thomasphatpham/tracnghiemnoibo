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
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  async findAll(
    @Query('onlyActive') onlyActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.departmentsService.findAll({
      onlyActive: onlyActive === 'true',
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Get('import/template')
  @Roles(Role.ADMIN)
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.departmentsService.generateTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Mau_Import_Phong_Ban.xlsx"',
    );
    res.send(buffer);
  }

  @Post('import/validate')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async validateExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn tệp tin Excel (.xlsx) để tải lên.');
    }
    return this.departmentsService.validateExcel(file.buffer);
  }

  @Post('import/confirm')
  @Roles(Role.ADMIN)
  async confirmImport(@Body('validRows') validRows: any[]) {
    return this.departmentsService.confirmImport(validRows);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  async findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, dto);
  }

  @Patch(':id/toggle-status')
  @Roles(Role.ADMIN)
  async toggleStatus(@Param('id') id: string) {
    return this.departmentsService.toggleStatus(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async delete(@Param('id') id: string) {
    return this.departmentsService.delete(id);
  }
}
