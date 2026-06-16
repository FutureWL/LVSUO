import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { RequirePerm } from '../../common/permission/permission.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { JwtPayload } from '@lm-unity/shared';

@ApiTags('product')
@ApiBearerAuth()
@Controller('service-products')
export class ProductController {
  constructor(private readonly product: ProductService) {}

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
}
