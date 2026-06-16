import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Tenant, DeploymentMode, TenantType } from '@lm-unity/shared';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaClient) {}

  async findOne(tenantId: string): Promise<Tenant> {
    const t = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!t) throw new NotFoundException('租户不存在');
    return t as unknown as Tenant;
  }
}
