import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsBoolean } from 'class-validator';
import { LeadService } from './lead.service';
import { RequirePerm } from '../../common/permission/permission.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { JwtPayload, UrgencyLevel, TriageResult } from '@lm-unity/shared';
import { Audit } from '../../common/audit/audit.decorator';

class CreateLeadDto {
  @IsString() sourceChannel!: string;
  @IsString() clientName!: string;
  @IsOptional() @IsString() contactMobile?: string;
  @IsOptional() @IsString() contactEmail?: string;
  @IsOptional() @IsString() legalIssueType?: string;
  @IsOptional() @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  urgencyLevel?: UrgencyLevel;
}

class AssignLawyerDto {
  @IsString() lawyerId!: string;
}

class TriageDto {
  @IsOptional() @IsString() factsSummary?: string;
  @IsOptional() @IsString() evidenceSummary?: string;
  @IsOptional() @IsString() urgencyReason?: string;
  @IsString() triageResult!: TriageResult;
  @IsOptional() @IsString() recommendedProductId?: string;
  @IsBoolean() shouldTransferToLawyer!: boolean;
  @IsOptional() @IsBoolean() aiGenerated?: boolean;
  @IsOptional() @IsString() confirmedBy?: string;
}

@ApiTags('lead')
@ApiBearerAuth()
@Controller('leads')
export class LeadController {
  constructor(private readonly lead: LeadService) {}

  @Post()
  @RequirePerm({ action: 'lead:write' })
  @Audit({ resourceType: 'lead' })
  @ApiOperation({ summary: '创建线索' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateLeadDto) {
    return this.lead.create(user.tid, dto);
  }

  @Get()
  @RequirePerm({ action: 'lead:read' })
  @ApiOperation({ summary: '查询线索列表' })
  async list(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('urgency') urgency?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.lead.findByTenant(user.tid, Number(page), Number(pageSize), {
      keyword,
      status: status as any,
      urgency: urgency as any,
      from,
      to,
    });
  }

  @Get(':id')
  @RequirePerm({ action: 'lead:read' })
  @ApiOperation({ summary: '查询线索详情' })
  async one(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.lead.findOne(user.tid, id);
  }

  @Post(':id/assign-lawyer')
  @RequirePerm({ action: 'lead:write' })
  @Audit({ resourceType: 'lead' })
  @ApiOperation({ summary: '分配律师' })
  async assignLawyer(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AssignLawyerDto,
  ) {
    return this.lead.assignLawyer(user.tid, id, dto.lawyerId);
  }

  @Post(':id/triage')
  @RequirePerm({ action: 'lead:write' })
  @Audit({ resourceType: 'lead' })
  @ApiOperation({ summary: '结构化分诊' })
  async triage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: TriageDto,
  ) {
    return this.lead.triage(user.tid, id, dto);
  }
}
