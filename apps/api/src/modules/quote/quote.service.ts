import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ErrorCode, FeeQuote, QuoteStatus, type PageResponse } from '@lm-unity/shared';
import { buildPage } from '../../common/pagination';

@Injectable()
export class QuoteService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 任务书 10.4 报价阻断规则
   */
  private validate(input: {
    serviceScope?: string;
    excludedScope?: string;
    thirdPartyCosts?: any;
    riskDisclosureConfirmed?: boolean;
    containsSuccessPromise?: boolean;
  }) {
    if (!input.serviceScope) {
      throw new BadRequestException({
        code: ErrorCode.QUOTE_SCOPE_EMPTY,
        message: '服务范围不能为空',
      });
    }
    if (!input.excludedScope) {
      throw new BadRequestException({
        code: ErrorCode.QUOTE_EXCLUDED_EMPTY,
        message: '必须说明不包含事项',
      });
    }
    if (!input.thirdPartyCosts) {
      throw new BadRequestException({
        code: ErrorCode.QUOTE_THIRD_PARTY_NOT_EXPLAINED,
        message: '第三方费用未说明',
      });
    }
    if (!input.riskDisclosureConfirmed) {
      throw new BadRequestException({
        code: ErrorCode.RISK_DISCLOSURE_NOT_CONFIRMED,
        message: '客户未确认风险揭示',
      });
    }
    if (input.containsSuccessPromise) {
      throw new BadRequestException({
        code: ErrorCode.QUOTE_CONTAINS_SUCCESS_PROMISE,
        message: '报价内容不得承诺结果',
      });
    }
  }

  async create(
    tenantId: string,
    input: {
      leadId?: string;
      clientId?: string;
      matterId?: string;
      productId?: string;
      serviceScope: string;
      excludedScope: string;
      lawyerFee?: number;
      thirdPartyCosts?: any;
      paymentSchedule?: string;
      additionalFeeConditions?: string;
      riskDisclosureConfirmed: boolean;
      containsSuccessPromise?: boolean;
    },
  ) {
    this.validate(input);
    return this.prisma.feeQuote.create({
      data: {
        tenantId,
        leadId: input.leadId,
        clientId: input.clientId,
        matterId: input.matterId,
        productId: input.productId,
        serviceScope: input.serviceScope,
        excludedScope: input.excludedScope,
        lawyerFee: input.lawyerFee,
        thirdPartyCosts: input.thirdPartyCosts as any,
        paymentSchedule: input.paymentSchedule,
        additionalFeeConditions: input.additionalFeeConditions,
        clientConfirmed: false,
        status: 'DRAFT',
      },
    }) as unknown as FeeQuote;
  }

  async findByTenant(tenantId: string, page = 1, pageSize = 20): Promise<PageResponse<FeeQuote>> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.feeQuote.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.feeQuote.count({ where: { tenantId } }),
    ]);
    return buildPage(items as unknown as FeeQuote[], total, page, pageSize);
  }

  async findOne(tenantId: string, id: string) {
    const quote = await this.prisma.feeQuote.findFirst({
      where: { id, tenantId },
      include: {
        lead: { select: { id: true, clientName: true } },
        client: { select: { id: true, clientName: true } },
        product: { select: { id: true, productName: true, productType: true } },
      },
    });
    if (!quote) throw new NotFoundException('报价卡不存在');
    return quote;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: QuoteStatus,
    actorUserId?: string,
  ) {
    const quote = await this.findOne(tenantId, id);
    if (quote.status === status) return quote;

    const data: any = { status };
    if (status === QuoteStatus.APPROVED) {
      data.approvedBy = actorUserId;
    }
    if (status === QuoteStatus.CLIENT_CONFIRMED) {
      data.clientConfirmed = true;
    }

    return this.prisma.feeQuote.update({
      where: { id },
      data,
    });
  }

  async sendToClient(tenantId: string, id: string) {
    const quote = await this.findOne(tenantId, id);
    if (quote.status !== QuoteStatus.DRAFT && quote.status !== QuoteStatus.APPROVED) {
      throw new BadRequestException('当前报价状态不可发送给客户');
    }
    return this.updateStatus(tenantId, id, QuoteStatus.SENT);
  }

  async clientConfirm(tenantId: string, id: string) {
    const quote = await this.findOne(tenantId, id);
    if (quote.status !== QuoteStatus.SENT) {
      throw new BadRequestException('报价未发送或已被确认');
    }
    return this.updateStatus(tenantId, id, QuoteStatus.CLIENT_CONFIRMED);
  }

  async approve(tenantId: string, id: string, approverId: string) {
    const quote = await this.findOne(tenantId, id);
    if (quote.status !== QuoteStatus.DRAFT && quote.status !== QuoteStatus.PENDING_APPROVAL) {
      throw new BadRequestException('当前报价状态不可审批');
    }
    return this.updateStatus(tenantId, id, QuoteStatus.APPROVED, approverId);
  }
}
