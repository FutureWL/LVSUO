import { Controller, Param, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { TimeEntryService } from './time-entry.service';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { JwtPayload } from '@lm-unity/shared';

class StartTimerDto {
  @IsOptional() @IsString() matterId?: string;
}

@ApiTags('time-entry')
@ApiBearerAuth()
@Controller('lushi/time')
export class TimeEntryController {
  constructor(private readonly entry: TimeEntryService) {}

  @Post('start')
  @ApiOperation({ summary: '律时语音开始计时' })
  async start(@CurrentUser() user: JwtPayload, @Body() dto: StartTimerDto) {
    return this.entry.startTimer(user.tid, user.sub, dto.matterId);
  }

  @Post(':id/stop')
  @ApiOperation({ summary: '律时语音停止计时' })
  async stop(@Param('id') id: string) {
    return this.entry.stopTimer(id);
  }
}
