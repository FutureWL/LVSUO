import { BadRequestException } from '@nestjs/common';
import { ErrorCode } from '@lm-unity/shared';

/** 报价卡阻断规则输入 —— 任务书 10.4 */
export interface QuoteRuleInput {
  serviceScope?: string;
  excludedScope?: string;
  thirdPartyCosts?: unknown;
  riskDisclosureConfirmed?: boolean;
  containsSuccessPromise?: boolean;
}

/**
 * 报价卡阻断规则 —— 5 条全部检查,任一不满足抛 BizException 等价的 HttpException
 * 抽出为纯函数便于单测(quote.service.validate 是 private,直接测需要 mock 大量 prisma)
 *
 * 设计原则:
 *  - 抛 BadRequestException + 业务 code,前端可按 code 弹具体提示
 *  - 一票否决,不通过即抛(不留"警告"余地)
 */
export function validateQuoteRules(input: QuoteRuleInput): void {
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
