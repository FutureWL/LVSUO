import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';
import { MatterService } from './matter.service';
import { RequirePerm } from '../../common/permission/permission.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { JwtPayload, MatterStatus, DataLevel } from '@lm-unity/shared';

class CreateMatterDto {
  @IsString() clientId!: string;
  @IsString() matterTitle!: string;
  @IsOptional() @IsString() matterType?: string;
  @IsOptional() @IsNumber() disputeAmount?: number;
  @IsOptional() @IsIn(['L1_PUBLIC','L2_FIRM_INTERNAL','L3_MATTER_TEAM','L4_CLIENT_CONFIDENTIAL','L5_HIGHLY_CONFIDENTIAL','L6_AI_RESTRICTED'])
  confidentialityLevel?: DataLevel;
  @IsOptional() @IsString() responsiblePartnerId?: string;
  @IsOptional() @IsString() leadLawyerId?: string;
  @IsIn(['HOURLY', 'FIXED', 'CONTINGENT', 'RETAINER', 'HYBRID']) billingType!: 'HOURLY' | 'FIXED' | 'CONTINGENT' | 'RETAINER' | 'HYBRID';
  @IsOptional() @IsNumber() budgetAmount?: number;
}

class TransitionDto {
  @IsString() to!: MatterStatus;
}

class CreateFromQuoteDto {
  @IsString() quoteId!: string;
  @IsString() matterTitle!: string;
  @IsOptional() @IsString() matterType?: string;
  @IsOptional() @IsNumber() disputeAmount?: number;
  @IsOptional() @IsIn(['L1_PUBLIC','L2_FIRM_INTERNAL','L3_MATTER_TEAM','L4_CLIENT_CONFIDENTIAL','L5_HIGHLY_CONFIDENTIAL','L6_AI_RESTRICTED'])
  confidentialityLevel?: DataLevel;
  @IsOptional() @IsString() responsiblePartnerId?: string;
  @IsOptional() @IsString() leadLawyerId?: string;
  @IsIn(['HOURLY', 'FIXED', 'CONTINGENT', 'RETAINER', 'HYBRID']) billingType!: 'HOURLY' | 'FIXED' | 'CONTINGENT' | 'RETAINER' | 'HYBRID';
  @IsOptional() @IsNumber() budgetAmount?: number;
}

@ApiTags('matter')
@ApiBearerAuth()
@Controller('matters')
export class MatterController {
  constructor(private readonly matter: MatterService) {}

  @Post()
  @RequirePerm({ action: 'matter:write' })
  @Audit({ resourceType: 'matter' })
  @ApiOperation({ summary: '创建案件' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateMatterDto) {
    return this.matter.create(user.tid, dto);
  }

  @Get()
  @RequirePerm({ action: 'matter:read' })
  @ApiOperation({ summary: '查询案件列表' })
  async list(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.matter.findByTenant(user.tid, Number(page), Number(pageSize));
  }

  @Post(':id/transition')
  @RequirePerm({ action: 'matter:write' })
  @Audit({ resourceType: 'matter' })
  @ApiOperation({ summary: '状态机流转' })
  async transition(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: TransitionDto,
  ) {
    return this.matter.transition(user.tid, id, dto.to);
  }

  @Post('from-quote')
  @RequirePerm({ action: 'matter:write' })
  @Audit({ resourceType: 'matter' })
  @ApiOperation({ summary: '从已确认报价创建案件' })
  async createFromQuote(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFromQuoteDto,
  ) {
    return this.matter.createFromQuote(user.tid, dto.quoteId, dto);
  }
}
