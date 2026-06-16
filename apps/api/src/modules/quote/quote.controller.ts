import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsIn } from 'class-validator';
import { QuoteService } from './quote.service';
import { RequirePerm } from '../../common/permission/permission.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { JwtPayload } from '@lm-unity/shared';
import { QuoteStatus } from '@lm-unity/shared';

class CreateQuoteDto {
  @IsOptional() @IsString() leadId?: string;
  @IsOptional() @IsString() clientId?: string;
  @IsOptional() @IsString() productId?: string;
  @IsString() serviceScope!: string;
  @IsString() excludedScope!: string;
  @IsOptional() @IsNumber() lawyerFee?: number;
  thirdPartyCosts?: any[];
  @IsBoolean() riskDisclosureConfirmed!: boolean;
  @IsOptional() @IsBoolean() containsSuccessPromise?: boolean;
}

class UpdateQuoteDto {
  @IsOptional() @IsString() serviceScope?: string;
  @IsOptional() @IsString() excludedScope?: string;
  @IsOptional() @IsNumber() lawyerFee?: number;
  thirdPartyCosts?: any[];
}

@ApiTags('quote')
@ApiBearerAuth()
@Controller('quotes')
export class QuoteController {
  constructor(private readonly quote: QuoteService) {}

  @Post()
  @RequirePerm({ action: 'quote:write' })
  @Audit({ resourceType: 'quote' })
  @ApiOperation({ summary: '创建报价卡(强制通过 10.4 阻断规则)' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateQuoteDto) {
    return this.quote.create(user.tid, dto);
  }

  @Get()
  @RequirePerm({ action: 'quote:read' })
  @ApiOperation({ summary: '查询报价列表' })
  async list(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.quote.findByTenant(user.tid, Number(page), Number(pageSize));
  }

  @Get(':id')
  @RequirePerm({ action: 'quote:read' })
  @ApiOperation({ summary: '查询报价详情' })
  async one(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.quote.findOne(user.tid, id);
  }

  @Put(':id')
  @RequirePerm({ action: 'quote:write' })
  @Audit({ resourceType: 'quote' })
  @ApiOperation({ summary: '更新报价卡' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateQuoteDto,
  ) {
    return this.quote.create(user.tid, { ...dto, riskDisclosureConfirmed: true } as any);
  }

  @Post(':id/approve')
  @RequirePerm({ action: 'quote:write' })
  @Audit({ resourceType: 'quote' })
  @ApiOperation({ summary: '内部审批通过' })
  async approve(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.quote.approve(user.tid, id, user.sub);
  }

  @Post(':id/send-to-client')
  @RequirePerm({ action: 'quote:write' })
  @Audit({ resourceType: 'quote' })
  @ApiOperation({ summary: '发送给客户' })
  async sendToClient(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.quote.sendToClient(user.tid, id);
  }

  @Post(':id/client-confirm')
  @RequirePerm({ action: 'quote:write' })
  @Audit({ resourceType: 'quote' })
  @ApiOperation({ summary: '客户确认报价(含风险揭示)' })
  async clientConfirm(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.quote.clientConfirm(user.tid, id);
  }
}
