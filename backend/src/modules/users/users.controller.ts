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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get('import/template')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.usersService.generateTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Mau_Import_Danh_Sach_Nguoi_Dung.xlsx"',
    );
    res.send(buffer);
  }

  @Post('import/validate')
  @UseInterceptors(FileInterceptor('file'))
  async validateExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn tệp tin Excel (.xlsx) để tải lên.');
    }
    return this.usersService.validateExcel(file.buffer);
  }

  @Post('import/confirm')
  async confirmImport(@Body('validRows') validRows: any[]) {
    return this.usersService.confirmImport(validRows);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/lock')
  async toggleLock(@Param('id') id: string) {
    return this.usersService.toggleLock(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser('id') currentUserId: string) {
    return this.usersService.delete(id, currentUserId);
  }
}
