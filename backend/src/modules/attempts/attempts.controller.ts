import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AttemptsService } from './attempts.service';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { TabSwitchDto } from './dto/tab-switch.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { getRealClientIp } from '../../common/utils/ip.util';

@Controller('attempts')
@UseGuards(JwtAuthGuard)
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Get('my-history')
  async getMyHistory(@CurrentUser('id') userId: string) {
    return this.attemptsService.getMyHistory(userId);
  }

  @Get(':id')
  async getAttempt(@Param('id') id: string, @CurrentUser() user: any) {
    return this.attemptsService.getAttempt(id, user.id, user.role);
  }

  @Patch(':id/answer')
  async saveAnswer(
    @Param('id') id: string,
    @Body() dto: SaveAnswerDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const clientIp = getRealClientIp(req);
    return this.attemptsService.saveAnswer(id, dto, userId, clientIp);
  }

  @Patch(':id/tab-switch')
  async recordTabSwitch(
    @Param('id') id: string,
    @Body() dto: TabSwitchDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const clientIp = getRealClientIp(req);
    return this.attemptsService.recordTabSwitch(id, dto, userId, clientIp);
  }

  @Post(':id/submit')
  async submit(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const clientIp = getRealClientIp(req);
    return this.attemptsService.submitAttempt(id, userId, clientIp);
  }

  @Get(':id/result')
  async getResult(@Param('id') id: string, @CurrentUser() user: any) {
    return this.attemptsService.getResult(id, user.id, user.role);
  }
}
