import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';
import { ClientService } from './client.service';
import { RequirePerm } from '../../common/permission/permission.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { JwtPayload, ClientType } from '@lm-unity/shared';

class CreateClientDto {
  @IsString() clientName!: string;
  @IsIn(['INDIVIDUAL', 'ENTERPRISE']) clientType!: ClientType;
  @IsOptional() @IsString() creditCode?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() contactMobile?: string;
  @IsOptional() @IsString() contactEmail?: string;
}

class UpdateClientDto {
  @IsOptional() @IsString() clientName?: string;
  @IsOptional() @IsIn(['INDIVIDUAL', 'ENTERPRISE']) clientType?: ClientType;
  @IsOptional() @IsString() creditCode?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() contactMobile?: string;
  @IsOptional() @IsString() contactEmail?: string;
}

class ConvertFromLeadDto {
  @IsString() leadId!: string;
  @IsOptional() @IsString() clientName?: string;
  @IsOptional() @IsIn(['INDIVIDUAL', 'ENTERPRISE']) clientType?: ClientType;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() contactMobile?: string;
  @IsOptional() @IsString() contactEmail?: string;
}

@ApiTags('client')
@ApiBearerAuth()
@Controller('clients')
export class ClientController {
  constructor(private readonly client: ClientService) {}

  @Post()
  @RequirePerm({ action: 'client:write' })
  @Audit({ resourceType: 'client' })
  @ApiOperation({ summary: '创建客户' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateClientDto) {
    return this.client.create(user.tid, dto);
  }

  @Get()
  @RequirePerm({ action: 'client:read' })
  @ApiOperation({ summary: '查询客户列表' })
  async list(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.client.findByTenant(user.tid, Number(page), Number(pageSize));
  }

  @Get(':id')
  @RequirePerm({ action: 'client:read' })
  @ApiOperation({ summary: '查询客户详情' })
  async one(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.client.findOne(user.tid, id);
  }

  @Put(':id')
  @RequirePerm({ action: 'client:write' })
  @Audit({ resourceType: 'client' })
  @ApiOperation({ summary: '更新客户' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.client.update(user.tid, id, dto);
  }

  @Post('convert-from-lead')
  @RequirePerm({ action: 'client:write' })
  @Audit({ resourceType: 'client' })
  @ApiOperation({ summary: '从线索转为客户' })
  async convertFromLead(@CurrentUser() user: JwtPayload, @Body() dto: ConvertFromLeadDto) {
    return this.client.convertFromLead(user.tid, dto.leadId, dto);
  }
}
