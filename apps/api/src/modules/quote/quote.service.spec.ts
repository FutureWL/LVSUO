import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuoteStatus } from '@lm-unity/shared';
import { QuoteService } from './quote.service';
import { makePrismaMock } from '../../common/test/prisma-mock';

/**
 * QuoteService 单测
 *  - create: 字段映射 + 默认 clientConfirmed=false, status=DRAFT
 *  - create: 阻断规则违反(quote-rules 测过, 这里只测集成)
 *  - findByTenant: 事务分页
 *  - findOne: 找到/NotFound(include lead/client/product)
 *  - updateStatus: 同状态 noop / 状态切换字段
 *  - approve / sendToClient / clientConfirm: 状态机守卫
 */

const VALID_INPUT = {
  serviceScope: '服务范围 A',
  excludedScope: '不包含 B',
  riskDisclosureConfirmed: true,
  thirdPartyCosts: [],
};

describe('QuoteService', () => {
  let service: QuoteService;
  let prisma: any;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new QuoteService(prisma);
  });

  function setupPrisma(spec: Record<string, any> = {}) {
    prisma = makePrismaMock(spec);
    service = new QuoteService(prisma);
  }

  describe('create', () => {
    it('字段映射 + 默认 clientConfirmed=false, status=DRAFT', async () => {
      const createFn = jest.fn().mockResolvedValue({ id: 'q1' });
      setupPrisma({ 'feeQuote.create': createFn });

      await service.create('t1', {
        ...VALID_INPUT,
        leadId: 'l1',
        lawyerFee: 5000,
      });

      expect(createFn).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 't1',
          leadId: 'l1',
          lawyerFee: 5000,
          serviceScope: '服务范围 A',
          clientConfirmed: false,
          status: 'DRAFT',
        }),
      });
    });

    it('阻断规则: 含承诺结果 + 无风险揭示 → 抛 BizException', async () => {
      setupPrisma({ 'feeQuote.create': jest.fn() });
      await expect(
        service.create('t1', {
          serviceScope: '服务范围 A',
          excludedScope: '',
          riskDisclosureConfirmed: false,
          containsSuccessPromise: true, // 触发阻断
        }),
      ).rejects.toThrow();
    });
  });

  describe('findByTenant', () => {
    it('事务 findMany + count → buildPage', async () => {
      const items = [{ id: 'q1' }];
      const findManyFn = jest.fn().mockResolvedValue(items);
      const countFn = jest.fn().mockResolvedValue(1);
      const txFn = jest.fn().mockResolvedValue([items, 1]);
      setupPrisma({
        $transaction: txFn,
        'feeQuote.findMany': findManyFn,
        'feeQuote.count': countFn,
      });

      const res = await service.findByTenant('t1', 2, 5);
      expect(res.items).toEqual(items);
      expect(res.total).toBe(1);
      expect(res.page).toBe(2);
      expect(res.pageSize).toBe(5);
    });
  });

  describe('findOne', () => {
    it('找到 → 返带 include 的 quote', async () => {
      const findFirstFn = jest
        .fn()
        .mockResolvedValue({ id: 'q1', lead: {}, client: {}, product: {} });
      setupPrisma({ 'feeQuote.findFirst': findFirstFn });
      const res = await service.findOne('t1', 'q1');
      expect(res).toEqual({ id: 'q1', lead: {}, client: {}, product: {} });
    });

    it('找不到 → NotFound', async () => {
      setupPrisma({ 'feeQuote.findFirst': jest.fn().mockResolvedValue(null) });
      await expect(service.findOne('t1', 'q99')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('新状态 == 当前状态 → noop(不调 update)', async () => {
      const updateFn = jest.fn();
      setupPrisma({
        'feeQuote.findFirst': jest.fn().mockResolvedValue({ id: 'q1', status: 'DRAFT' }),
        'feeQuote.update': updateFn,
      });

      const res = await service.updateStatus('t1', 'q1', QuoteStatus.DRAFT);
      expect(res).toEqual({ id: 'q1', status: 'DRAFT' });
      expect(updateFn).not.toHaveBeenCalled();
    });

    it('DRAFT → APPROVED, 带 approverId → data.approvedBy = actorUserId', async () => {
      const findFirstFn = jest.fn().mockResolvedValue({ id: 'q1', status: 'DRAFT' });
      const updateFn = jest.fn().mockResolvedValue({ id: 'q1', status: 'APPROVED' });
      setupPrisma({ 'feeQuote.findFirst': findFirstFn, 'feeQuote.update': updateFn });

      await service.updateStatus('t1', 'q1', QuoteStatus.APPROVED, 'u1');
      expect(updateFn).toHaveBeenCalledWith({
        where: { id: 'q1' },
        data: { status: 'APPROVED', approvedBy: 'u1' },
      });
    });

    it('SENT → CLIENT_CONFIRMED → data.clientConfirmed = true', async () => {
      const findFirstFn = jest.fn().mockResolvedValue({ id: 'q1', status: 'SENT' });
      const updateFn = jest.fn().mockResolvedValue({ id: 'q1', status: 'CLIENT_CONFIRMED' });
      setupPrisma({ 'feeQuote.findFirst': findFirstFn, 'feeQuote.update': updateFn });

      await service.updateStatus('t1', 'q1', QuoteStatus.CLIENT_CONFIRMED);
      expect(updateFn).toHaveBeenCalledWith({
        where: { id: 'q1' },
        data: { status: 'CLIENT_CONFIRMED', clientConfirmed: true },
      });
    });
  });

  describe('状态机守卫', () => {
    it('approve: 非 DRAFT/PENDING_APPROVAL → 抛 BadRequest', async () => {
      setupPrisma({
        'feeQuote.findFirst': jest.fn().mockResolvedValue({ id: 'q1', status: 'SENT' }),
      });
      await expect(service.approve('t1', 'q1', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('approve: DRAFT → APPROVED 成功', async () => {
      const findFirstFn = jest.fn().mockResolvedValue({ id: 'q1', status: 'DRAFT' });
      const updateFn = jest.fn().mockResolvedValue({ id: 'q1', status: 'APPROVED' });
      setupPrisma({ 'feeQuote.findFirst': findFirstFn, 'feeQuote.update': updateFn });
      await service.approve('t1', 'q1', 'u1');
      expect(updateFn).toHaveBeenCalled();
    });

    it('sendToClient: 非 DRAFT/APPROVED → 抛 BadRequest', async () => {
      setupPrisma({
        'feeQuote.findFirst': jest.fn().mockResolvedValue({ id: 'q1', status: 'REJECTED' }),
      });
      await expect(service.sendToClient('t1', 'q1')).rejects.toThrow(BadRequestException);
    });

    it('clientConfirm: 非 SENT → 抛 BadRequest', async () => {
      setupPrisma({
        'feeQuote.findFirst': jest.fn().mockResolvedValue({ id: 'q1', status: 'DRAFT' }),
      });
      await expect(service.clientConfirm('t1', 'q1')).rejects.toThrow(BadRequestException);
    });
  });
});
