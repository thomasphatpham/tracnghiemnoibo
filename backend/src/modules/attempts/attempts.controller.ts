import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AttemptsService } from './attempts.service';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { TabSwitchDto } from './dto/tab-switch.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
  ) {
    return this.attemptsService.saveAnswer(id, dto, userId);
  }

  @Patch(':id/tab-switch')
  async recordTabSwitch(
    @Param('id') id: string,
    @Body() dto: TabSwitchDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.attemptsService.recordTabSwitch(id, dto, userId);
  }

  @Post(':id/submit')
  async submit(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.attemptsService.submitAttempt(id, userId);
  }

  @Get(':id/result')
  async getResult(@Param('id') id: string, @CurrentUser() user: any) {
    return this.attemptsService.getResult(id, user.id, user.role);
  }

  @Get(':id/cheat-answers')
  async getCheatAnswers(@Param('id') id: string, @CurrentUser() user: any) {
    return this.attemptsService.getCheatAnswers(id, user.id, user.role);
  }
}
