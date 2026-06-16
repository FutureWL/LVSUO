import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaClient) {}

  async findByTenant(tenantId: string) {
    return this.prisma.serviceProduct.findMany({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    return this.prisma.serviceProduct.findFirst({ where: { id, tenantId } });
  }
}
