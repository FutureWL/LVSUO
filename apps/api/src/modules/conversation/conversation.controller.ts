import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';
import { ConversationService } from './conversation.service';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { JwtPayload, DataLevel } from '@lm-unity/shared';

class SendMessageDto {
  @IsString() conversationId!: string;
  @IsString() content!: string;
  @IsIn(['TEXT', 'VOICE', 'IMAGE', 'FILE']) contentType!: 'TEXT' | 'VOICE' | 'IMAGE' | 'FILE';
  @IsIn(['L1_PUBLIC','L2_FIRM_INTERNAL','L3_MATTER_TEAM','L4_CLIENT_CONFIDENTIAL','L5_HIGHLY_CONFIDENTIAL','L6_AI_RESTRICTED'])
  dataLevel!: DataLevel;
}

@ApiTags('lushi')
@ApiBearerAuth()
@Controller('lushi')
export class ConversationController {
  constructor(private readonly conv: ConversationService) {}

  @Post('message')
  @ApiOperation({ summary: '律时消息接入(L6 守卫)' })
  async send(@CurrentUser() user: JwtPayload, @Body() dto: SendMessageDto) {
    return this.conv.sendMessage({
      tenantId: user.tid,
      userId: user.sub,
      ...dto,
    });
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: '查询会话消息' })
  async messages(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.conv.listMessages(user.tid, id);
  }
}
