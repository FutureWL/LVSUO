import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ErrorCode } from '@lm-unity/shared';

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
    input: Parameters<QuoteService['validate']>[0] & {
      leadId?: string;
      clientId?: string;
      matterId?: string;
      productId?: string;
      lawyerFee?: number;
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
        clientConfirmed: false,
        status: 'DRAFT',
      },
    });
  }
}
