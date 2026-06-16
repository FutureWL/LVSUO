import { BadRequestException } from '@nestjs/common';
import { ErrorCode } from '@lm-unity/shared';
import { QuoteService } from './quote.service';
import { makePrismaMock } from '../../common/test/prisma-mock';

/**
 * quote.service.create 单测 —— 重点验证'validate → prisma.create'的串联
 *  5 条阻断规则的纯函数测试见 quote-rules.spec.ts
 *  本文件只测 service 层的串联 + 写入 prisma 的字段映射
 */

const TENANT_ID = 'tenant-1';

function makeService() {
  const prisma = makePrismaMock({
    // create 返回 quote 行(id 自动 + 入参 data)
    'feeQuote.create': ({ data }: any) => ({ id: 'quote-1', tenantId: TENANT_ID, ...data }),
  });
  return { service: new QuoteService(prisma), prisma };
}

const validInput = {
  serviceScope: '起草诉状',
  excludedScope: '不包括出庭',
  thirdPartyCosts: [{ category: '法院', amount: 500 }],
  riskDisclosureConfirmed: true,
};

describe('QuoteService.create', () => {
  it('合法输入 → prisma.feeQuote.create 被调用且字段映射正确', async () => {
    const { service, prisma } = makeService();
    const result = await service.create(TENANT_ID, {
      ...validInput,
      leadId: 'lead-1',
      clientId: 'client-1',
      productId: 'product-1',
      lawyerFee: 5000,
      paymentSchedule: '签约 50% / 结案 50%',
    } as any);
    expect(prisma.feeQuote.create).toHaveBeenCalledTimes(1);
    expect(prisma.feeQuote.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: TENANT_ID,
        leadId: 'lead-1',
        clientId: 'client-1',
        productId: 'product-1',
        serviceScope: '起草诉状',
        excludedScope: '不包括出庭',
        lawyerFee: 5000,
        thirdPartyCosts: [{ category: '法院', amount: 500 }],
        paymentSchedule: '签约 50% / 结案 50%',
        clientConfirmed: false,
        status: 'DRAFT',
      }),
    });
    expect(result.id).toBe('quote-1');
  });

  it('serviceScope 空 → BadRequest + 不进 prisma', async () => {
    const { service, prisma } = makeService();
    await expect(service.create(TENANT_ID, { ...validInput, serviceScope: '' })).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.feeQuote.create).not.toHaveBeenCalled();
  });

  it('thirdPartyCosts 缺 → BadRequest + 不进 prisma', async () => {
    const { service, prisma } = makeService();
    await expect(
      service.create(TENANT_ID, { ...validInput, thirdPartyCosts: undefined }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.feeQuote.create).not.toHaveBeenCalled();
  });

  it('风险揭示未确认 → BadRequest', async () => {
    const { service, prisma } = makeService();
    await expect(
      service.create(TENANT_ID, { ...validInput, riskDisclosureConfirmed: false }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.feeQuote.create).not.toHaveBeenCalled();
  });

  it('containsSuccessPromise=true → BadRequest', async () => {
    const { service, prisma } = makeService();
    await expect(
      service.create(TENANT_ID, { ...validInput, containsSuccessPromise: true }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.feeQuote.create).not.toHaveBeenCalled();
  });

  it('所有阻断规则都在 create 之前生效(抛错顺序由 validateQuoteRules 决定)', async () => {
    // 5 条全坏:应该只抛第一个(SCOPE_EMPTY),不进 prisma
    const { service, prisma } = makeService();
    try {
      await service.create(TENANT_ID, {
        serviceScope: '',
        excludedScope: '',
        thirdPartyCosts: undefined,
        riskDisclosureConfirmed: false,
        containsSuccessPromise: true,
      });
      throw new Error('应抛错');
    } catch (e) {
      const res = (e as BadRequestException).getResponse() as { code?: string };
      expect(res.code).toBe(ErrorCode.QUOTE_SCOPE_EMPTY);
    }
    expect(prisma.feeQuote.create).not.toHaveBeenCalled();
  });

  it('可选字段未传时,prisma.create 收到的 data 中该字段是 undefined(不传空值)', async () => {
    const { service, prisma } = makeService();
    await service.create(TENANT_ID, validInput as any);
    const call = (prisma.feeQuote.create as jest.Mock).mock.calls[0][0];
    expect(call.data.leadId).toBeUndefined();
    expect(call.data.clientId).toBeUndefined();
    expect(call.data.matterId).toBeUndefined();
    expect(call.data.productId).toBeUndefined();
    expect(call.data.lawyerFee).toBeUndefined();
  });

  it('新创建的状态固定为 DRAFT + clientConfirmed=false(服务侧强制)', async () => {
    const { service, prisma } = makeService();
    await service.create(TENANT_ID, validInput as any);
    const call = (prisma.feeQuote.create as jest.Mock).mock.calls[0][0];
    expect(call.data.status).toBe('DRAFT');
    expect(call.data.clientConfirmed).toBe(false);
  });
});
