import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ServiceProduct, CreateServiceProductInput } from '@lm-unity/shared';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tenantId: string, input: Omit<CreateServiceProductInput, 'tenantId'>) {
    return this.prisma.serviceProduct.create({
      data: {
        tenantId,
        productName: input.productName,
        productType: input.productType,
        applicableScenarios: input.applicableScenarios,
        excludedScenarios: input.excludedScenarios,
        serviceScope: input.serviceScope,
        excludedScope: input.excludedScope,
        deliverables: input.deliverables,
        requiredMaterials: input.requiredMaterials,
        priceType: input.priceType,
        basePrice: input.basePrice,
        deliveryDays: input.deliveryDays,
        requiresLawyer: input.requiresLawyer ?? true,
        requiresPartnerApproval: input.requiresPartnerApproval ?? false,
      },
    }) as unknown as ServiceProduct;
  }

  async update(tenantId: string, id: string, input: Partial<Omit<CreateServiceProductInput, 'tenantId'>>) {
    await this.findOne(tenantId, id);
    return this.prisma.serviceProduct.update({
      where: { id },
      data: {
        productName: input.productName,
        productType: input.productType,
        applicableScenarios: input.applicableScenarios,
        excludedScenarios: input.excludedScenarios,
        serviceScope: input.serviceScope,
        excludedScope: input.excludedScope,
        deliverables: input.deliverables,
        requiredMaterials: input.requiredMaterials,
        priceType: input.priceType,
        basePrice: input.basePrice,
        deliveryDays: input.deliveryDays,
        requiresLawyer: input.requiresLawyer,
        requiresPartnerApproval: input.requiresPartnerApproval,
      },
    }) as unknown as ServiceProduct;
  }

  async findByTenant(tenantId: string) {
    return this.prisma.serviceProduct.findMany({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const product = await this.prisma.serviceProduct.findFirst({ where: { id, tenantId } });
    if (!product) throw new NotFoundException('服务产品不存在');
    return product as unknown as ServiceProduct;
  }
}
