import { BadRequestException } from '@nestjs/common';
import { ErrorCode } from '@lm-unity/shared';
import { validateQuoteRules, type QuoteRuleInput } from './quote-rules';

const baseValid: QuoteRuleInput = {
  serviceScope: '起草诉状',
  excludedScope: '不包括出庭',
  thirdPartyCosts: { court: 500 },
  riskDisclosureConfirmed: true,
  containsSuccessPromise: false,
};

function expectCode(fn: () => void, code: string) {
  try {
    fn();
    throw new Error('expected to throw');
  } catch (e) {
    expect(e).toBeInstanceOf(BadRequestException);
    const res = (e as BadRequestException).getResponse() as { code?: string; message?: string };
    expect(res.code).toBe(code);
  }
}

describe('validateQuoteRules', () => {
  it('合法输入不抛错', () => {
    expect(() => validateQuoteRules(baseValid)).not.toThrow();
  });

  it('服务范围为空 → QUOTE_SCOPE_EMPTY', () => {
    expectCode(() => validateQuoteRules({ ...baseValid, serviceScope: '' }), ErrorCode.QUOTE_SCOPE_EMPTY);
    expectCode(() => validateQuoteRules({ ...baseValid, serviceScope: undefined }), ErrorCode.QUOTE_SCOPE_EMPTY);
  });

  it('不包含事项为空 → QUOTE_EXCLUDED_EMPTY', () => {
    expectCode(() => validateQuoteRules({ ...baseValid, excludedScope: '' }), ErrorCode.QUOTE_EXCLUDED_EMPTY);
  });

  it('第三方费用未说明 → QUOTE_THIRD_PARTY_NOT_EXPLAINED', () => {
    expectCode(() => validateQuoteRules({ ...baseValid, thirdPartyCosts: undefined }), ErrorCode.QUOTE_THIRD_PARTY_NOT_EXPLAINED);
    expectCode(() => validateQuoteRules({ ...baseValid, thirdPartyCosts: null }), ErrorCode.QUOTE_THIRD_PARTY_NOT_EXPLAINED);
  });

  it('风险揭示未确认 → RISK_DISCLOSURE_NOT_CONFIRMED', () => {
    expectCode(() => validateQuoteRules({ ...baseValid, riskDisclosureConfirmed: false }), ErrorCode.RISK_DISCLOSURE_NOT_CONFIRMED);
  });

  it('承诺结果 → QUOTE_CONTAINS_SUCCESS_PROMISE', () => {
    expectCode(() => validateQuoteRules({ ...baseValid, containsSuccessPromise: true }), ErrorCode.QUOTE_CONTAINS_SUCCESS_PROMISE);
  });

  it('按检查顺序,首个不通过的 code 先抛', () => {
    // serviceScope + excludedScope 都缺,应抛 SCOPE_EMPTY(第一个)
    expectCode(
      () => validateQuoteRules({ ...baseValid, serviceScope: '', excludedScope: '' }),
      ErrorCode.QUOTE_SCOPE_EMPTY,
    );
  });
});
