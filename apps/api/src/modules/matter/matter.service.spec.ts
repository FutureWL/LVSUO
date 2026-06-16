import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuoteStatus } from '@lm-unity/shared';
import { MatterService } from './matter.service';
import { makePrismaMock } from '../../common/test/prisma-mock';

/**
 * matter.service.createFromQuote 单测 —— 任务书 6.4 状态机入口
 *
 * 三道门:
 *  1. quote 存在(否则 NotFound)
 *  2. quote.status ∈ {CLIENT_CONFIRMED, APPROVED}(否则 BadRequest "未确认")
 *  3. quote.clientId 非空(否则 BadRequest "未关联客户")
 *
 * 全部通过后:
 *  · 调 this.create() 复用 create 逻辑(client 校验 + matterNo 生成 + matter.create)
 *  · quote.matterId 关联到新 matter
 */

const TENANT_ID = 'tenant-1';
const QUOTE_ID = 'quote-1';
const CLIENT_ID = 'client-1';

function makeQuoteRow(overrides: Partial<any> = {}) {
  return {
    id: QUOTE_ID,
    tenantId: TENANT_ID,
    status: QuoteStatus.CLIENT_CONFIRMED,
    clientId: CLIENT_ID,
    matterId: null,
    client: { id: CLIENT_ID, tenantId: TENANT_ID, clientName: '测试客户' },
    ...overrides,
  };
}

function makeServiceWithQuoteAndClient(
  quoteOverride: any | null | undefined = undefined,
  clientOverride: any | null | undefined = undefined,
) {
  const quoteRow = quoteOverride === undefined ? makeQuoteRow() : quoteOverride;
  // client.findFirst 校验 client 存在;默认返回 client 行,clientOverride 可覆盖
  const client =
    clientOverride === undefined ? { id: CLIENT_ID, tenantId: TENANT_ID } : clientOverride;
  const prisma = makePrismaMock({
    'feeQuote.findFirst': quoteRow,
    'feeQuote.update': { id: QUOTE_ID, matterId: 'matter-1' },
    'client.findFirst': client,
    'matter.count': 0,
    'matter.create': ({ data }: any) => ({ id: 'matter-1', tenantId: TENANT_ID, ...data }),
  });
  return { service: new MatterService(prisma), prisma };
}

const validInput = {
  matterTitle: '张某诉李某合同纠纷案',
  matterType: 'CIVIL',
  disputeAmount: 100000,
  confidentialityLevel: 'L3_MATTER_TEAM' as any,
  responsiblePartnerId: 'partner-1',
  leadLawyerId: 'lawyer-1',
  billingType: 'FIXED' as any,
  budgetAmount: 50000,
};

describe('MatterService.createFromQuote', () => {
  describe('quote 查找', () => {
    it('quote 不存在 → NotFoundException', async () => {
      const { service } = makeServiceWithQuoteAndClient(null);
      await expect(service.createFromQuote(TENANT_ID, QUOTE_ID, validInput)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('quote 状态门禁', () => {
    it('DRAFT → BadRequest "报价未确认"', async () => {
      const { service } = makeServiceWithQuoteAndClient(
        makeQuoteRow({ status: QuoteStatus.DRAFT }),
      );
      try {
        await service.createFromQuote(TENANT_ID, QUOTE_ID, validInput);
        throw new Error('应抛错');
      } catch (e) {
        const msg = (e as Error).message;
        expect(msg).toContain('报价未确认');
        expect(msg).not.toContain('未关联客户'); // 应该是第一道门,不是第二道
      }
    });

    it('PENDING_APPROVAL → BadRequest', async () => {
      const { service } = makeServiceWithQuoteAndClient(
        makeQuoteRow({ status: QuoteStatus.PENDING_APPROVAL }),
      );
      await expect(service.createFromQuote(TENANT_ID, QUOTE_ID, validInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('SENT → BadRequest', async () => {
      const { service } = makeServiceWithQuoteAndClient(makeQuoteRow({ status: QuoteStatus.SENT }));
      await expect(service.createFromQuote(TENANT_ID, QUOTE_ID, validInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('REJECTED → BadRequest', async () => {
      const { service } = makeServiceWithQuoteAndClient(
        makeQuoteRow({ status: QuoteStatus.REJECTED }),
      );
      await expect(service.createFromQuote(TENANT_ID, QUOTE_ID, validInput)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('quote 关联客户门禁', () => {
    it('CLIENT_CONFIRMED 但 clientId=null → BadRequest "未关联客户"', async () => {
      const { service } = makeServiceWithQuoteAndClient(
        makeQuoteRow({ status: QuoteStatus.CLIENT_CONFIRMED, clientId: null }),
      );
      try {
        await service.createFromQuote(TENANT_ID, QUOTE_ID, validInput);
        throw new Error('应抛错');
      } catch (e) {
        expect((e as Error).message).toContain('未关联客户');
      }
    });

    it('APPROVED 但 clientId=null → 同样 BadRequest', async () => {
      const { service } = makeServiceWithQuoteAndClient(
        makeQuoteRow({ status: QuoteStatus.APPROVED, clientId: null }),
      );
      await expect(service.createFromQuote(TENANT_ID, QUOTE_ID, validInput)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('happy path', () => {
    it('CLIENT_CONFIRMED + 有 clientId → 调 create + 关联 quote.matterId', async () => {
      const { service, prisma } = makeServiceWithQuoteAndClient();
      const matter = await service.createFromQuote(TENANT_ID, QUOTE_ID, validInput);

      // 1. client.findFirst 用 quote.clientId 校验
      expect(prisma.client.findFirst).toHaveBeenCalledWith({
        where: { id: CLIENT_ID, tenantId: TENANT_ID },
      });

      // 2. matter.create 带正确的 clientId(从 quote 取)
      expect(prisma.matter.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          clientId: CLIENT_ID, // 从 quote.clientId 取,不是 input
          matterTitle: validInput.matterTitle,
          matterType: validInput.matterType,
          disputeAmount: validInput.disputeAmount,
          confidentialityLevel: validInput.confidentialityLevel,
          responsiblePartnerId: validInput.responsiblePartnerId,
          leadLawyerId: validInput.leadLawyerId,
          billingType: validInput.billingType,
          budgetAmount: validInput.budgetAmount,
          status: 'MATTER_OPENED', // service.create 固定
          openedAt: expect.any(Date),
        }),
      });

      // 3. quote.matterId 关联
      expect(prisma.feeQuote.update).toHaveBeenCalledWith({
        where: { id: QUOTE_ID },
        data: { matterId: 'matter-1' },
      });

      expect(matter.id).toBe('matter-1');
      expect(matter.clientId).toBe(CLIENT_ID);
    });

    it('APPROVED + 有 clientId → 同样走通', async () => {
      const { service } = makeServiceWithQuoteAndClient(
        makeQuoteRow({ status: QuoteStatus.APPROVED }),
      );
      const matter = await service.createFromQuote(TENANT_ID, QUOTE_ID, validInput);
      expect(matter.id).toBe('matter-1');
    });

    it('client 不存在(被 service.create 兜底拦下)→ NotFoundException', async () => {
      // quote 有 clientId,但 prisma.client.findFirst 找不到(被同租户另一个删了之类)
      const { service, prisma } = makeServiceWithQuoteAndClient(undefined, null);
      await expect(service.createFromQuote(TENANT_ID, QUOTE_ID, validInput)).rejects.toThrow(
        NotFoundException,
      );
      // 不应该走到 matter.create
      expect(prisma.matter.create).not.toHaveBeenCalled();
    });
  });
});
