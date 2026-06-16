import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { KnowledgeCardService } from './knowledge-card.service';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { JwtPayload } from '@lm-unity/shared';

@ApiTags('knowledge')
@ApiBearerAuth()
@Controller('knowledge-cards')
export class KnowledgeCardController {
  constructor(private readonly card: KnowledgeCardService) {}

  @Get()
  @ApiOperation({ summary: '查询知识卡片' })
  async list(@CurrentUser() user: JwtPayload, @Query('cardType') cardType?: string) {
    return this.card.findByTenant(user.tid, cardType);
  }
}
