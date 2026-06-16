import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Matter, MatterStatus, CreateMatterInput, QuoteStatus, type PageResponse } from '@lm-unity/shared';
import { buildPage } from '../../common/pagination';
import { assertValidMatterTransition } from './matter-rules';

@Injectable()
export class MatterService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tenantId: string, input: Omit<CreateMatterInput, 'tenantId'>) {
    const client = await this.prisma.client.findFirst({
      where: { id: input.clientId, tenantId },
    });
    if (!client) throw new NotFoundException('客户不存在');

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

  async createFromQuote(tenantId: string, quoteId: string, input: Omit<CreateMatterInput, 'tenantId' | 'clientId'>) {
    const quote = await this.prisma.feeQuote.findFirst({
      where: { id: quoteId, tenantId },
      include: { client: true },
    });
    if (!quote) throw new NotFoundException('报价卡不存在');
    if (quote.status !== QuoteStatus.CLIENT_CONFIRMED && quote.status !== QuoteStatus.APPROVED) {
      throw new BadRequestException('报价未确认,不能转为案件');
    }
    if (!quote.clientId) {
      throw new BadRequestException('报价未关联客户,不能转为案件');
    }

    const matter = await this.create(tenantId, { ...input, clientId: quote.clientId });

    await this.prisma.feeQuote.update({
      where: { id: quoteId },
      data: { matterId: matter.id },
    });

    return matter;
  }

  async transition(tenantId: string, matterId: string, to: MatterStatus) {
    const matter = await this.prisma.matter.findFirst({ where: { id: matterId, tenantId } });
    if (!matter) throw new NotFoundException('案件不存在');

    assertValidMatterTransition(matter.status as MatterStatus, to);

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

  async findByTenant(tenantId: string, page = 1, pageSize = 20): Promise<PageResponse<Matter>> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.matter.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          client: { select: { id: true, clientName: true } },
          responsiblePartner: { select: { id: true, realName: true } },
          leadLawyer: { select: { id: true, realName: true } },
        },
      }),
      this.prisma.matter.count({ where: { tenantId } }),
    ]);
    return buildPage(items as unknown as Matter[], total, page, pageSize);
  }
}
