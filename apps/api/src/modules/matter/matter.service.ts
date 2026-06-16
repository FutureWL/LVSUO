import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { MatterStatus, MATTER_STATUS_TRANSITIONS, CreateMatterInput } from '@lm-unity/shared';

@Injectable()
export class MatterService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tenantId: string, input: CreateMatterInput) {
    const year = new Date().getFullYear();
    const count = await this.prisma.matter.count({
      where: { tenantId, createdAt: { gte: new Date(`${year}-01-01`) } },
    });
    const matterNo = `${year}-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.matter.create({
      data: {
        tenantId,
        clientId: input.clientId,
        matterNo,
        matterTitle: input.matterTitle,
        matterType: input.matterType,
        disputeAmount: input.disputeAmount,
        status: MatterStatus.MATTER_OPENED,
        confidentialityLevel: input.confidentialityLevel || 'L3_MATTER_TEAM',
        responsiblePartnerId: input.responsiblePartnerId,
        leadLawyerId: input.leadLawyerId,
        billingType: input.billingType,
        budgetAmount: input.budgetAmount,
        openedAt: new Date(),
      },
    });
  }

  async transition(tenantId: string, matterId: string, to: MatterStatus) {
    const matter = await this.prisma.matter.findFirst({ where: { id: matterId, tenantId } });
    if (!matter) throw new NotFoundException('案件不存在');

    const allowed = MATTER_STATUS_TRANSITIONS[matter.status as MatterStatus] || [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `非法状态流转: ${matter.status} → ${to}`,
      );
    }

    return this.prisma.matter.update({
      where: { id: matterId },
      data: {
        status: to,
        closedAt:
          to === MatterStatus.CLOSING || to === MatterStatus.COMPLETED
            ? new Date()
            : undefined,
      },
    });
  }

  async findByTenant(tenantId: string, page = 1, pageSize = 20) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.matter.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.matter.count({ where: { tenantId } }),
    ]);
    return { items, total, page, pageSize };
  }
}
