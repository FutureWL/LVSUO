import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsObject } from 'class-validator';
import { QuoteService } from './quote.service';
import { RequirePerm } from '../../common/permission/permission.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { JwtPayload } from '@lm-unity/shared';

class CreateQuoteDto {
  @IsOptional() @IsString() leadId?: string;
  @IsOptional() @IsString() clientId?: string;
  @IsOptional() @IsString() productId?: string;
  @IsString() serviceScope!: string;
  @IsString() excludedScope!: string;
  @IsOptional() @IsNumber() lawyerFee?: number;
  @IsObject() thirdPartyCosts!: object;
  @IsBoolean() riskDisclosureConfirmed!: boolean;
  @IsOptional() @IsBoolean() containsSuccessPromise?: boolean;
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
}
