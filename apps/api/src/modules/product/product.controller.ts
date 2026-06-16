import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsIn, IsBoolean } from 'class-validator';
import { ProductService } from './product.service';
import { RequirePerm } from '../../common/permission/permission.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { JwtPayload, ProductType, PriceType } from '@lm-unity/shared';

class CreateProductDto {
  @IsString() productName!: string;
  @IsIn(['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']) productType!: ProductType;
  @IsOptional() @IsString() applicableScenarios?: string;
  @IsOptional() @IsString() excludedScenarios?: string;
  @IsOptional() @IsString() serviceScope?: string;
  @IsOptional() @IsString() excludedScope?: string;
  @IsOptional() @IsString() deliverables?: string;
  @IsOptional() @IsString() requiredMaterials?: string;
  @IsOptional() @IsIn(['FIXED', 'HOURLY', 'RANGE', 'CUSTOM']) priceType?: PriceType;
  @IsOptional() @IsNumber() basePrice?: number;
  @IsOptional() @IsNumber() deliveryDays?: number;
  @IsOptional() @IsBoolean() requiresLawyer?: boolean;
  @IsOptional() @IsBoolean() requiresPartnerApproval?: boolean;
}

@ApiTags('product')
@ApiBearerAuth()
@Controller('service-products')
export class ProductController {
  constructor(private readonly product: ProductService) {}

  @Post()
  @RequirePerm({ action: 'product:write' })
  @Audit({ resourceType: 'product' })
  @ApiOperation({ summary: '创建服务产品' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProductDto) {
    return this.product.create(user.tid, dto);
  }

  @Get()
  @RequirePerm({ action: 'product:read' })
  @ApiOperation({ summary: '查询服务产品列表' })
  async list(@CurrentUser() user: JwtPayload) {
    return this.product.findByTenant(user.tid);
  }

  @Get(':id')
  @RequirePerm({ action: 'product:read' })
  @ApiOperation({ summary: '查询服务产品详情' })
  async one(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.product.findOne(user.tid, id);
  }

  @Put(':id')
  @RequirePerm({ action: 'product:write' })
  @Audit({ resourceType: 'product' })
  @ApiOperation({ summary: '更新服务产品' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.product.update(user.tid, id, dto);
  }
}
