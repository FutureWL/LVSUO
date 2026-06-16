import { NotFoundException } from '@nestjs/common';
import { LeadStatus } from '@lm-unity/shared';
import { ClientService } from './client.service';
import { makePrismaMock } from '../../common/test/prisma-mock';

/**
 * ClientService 单测
 *  - 用 prisma-mock 工厂替换 PrismaClient
 *  - 验证: 字段映射 + NotFound 异常 + convertFromLead 的状态推进
 *
 * 共享 mock 在 apps/api/src/common/test/prisma-mock.ts(spec-driven factory)
 */

const SAMPLE_TENANT = 't1';

describe('ClientService', () => {
  let service: ClientService;
  let prisma: any;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new ClientService(prisma);
  });

  // helper: 重新初始化 prisma 加上 mock
  function setupPrisma(spec: Record<string, any> = {}) {
    prisma = makePrismaMock(spec);
    service = new ClientService(prisma);
  }

  describe('create', () => {
    it('调 prisma.client.create,字段正确映射', async () => {
      const createFn = jest.fn().mockResolvedValue({ id: 'c1', tenantId: SAMPLE_TENANT });
      setupPrisma({ 'client.create': createFn });

      const input = {
        clientName: 'ABC 公司',
        clientType: 'ENTERPRISE' as const,
        creditCode: '91110000XXXXXXXX',
        industry: '互联网',
        contactName: '张三',
        contactMobile: '13800138000',
        contactEmail: 'a@b.com',
      };
      await service.create(SAMPLE_TENANT, input);

      expect(createFn).toHaveBeenCalledWith({
        data: {
          tenantId: SAMPLE_TENANT,
          clientName: 'ABC 公司',
          clientType: 'ENTERPRISE',
          creditCode: '91110000XXXXXXXX',
          industry: '互联网',
          contactName: '张三',
          contactMobile: '13800138000',
          contactEmail: 'a@b.com',
        },
      });
    });
  });

  describe('findByTenant', () => {
    it('事务里 findMany + count → buildPage(分页)', async () => {
      const items = [{ id: 'c1' }, { id: 'c2' }];
      const findManyFn = jest.fn().mockResolvedValue(items);
      const countFn = jest.fn().mockResolvedValue(47);
      const txFn = jest.fn().mockResolvedValue([items, 47]);
      setupPrisma({
        $transaction: txFn,
        'client.findMany': findManyFn,
        'client.count': countFn,
      });

      const res = await service.findByTenant(SAMPLE_TENANT, 2, 10);

      expect(txFn).toHaveBeenCalledTimes(1);
      // findMany / count 在事务里被传入
      expect(findManyFn).toHaveBeenCalled();
      expect(countFn).toHaveBeenCalled();
      // 返回结构
      expect(res.items).toEqual(items);
      expect(res.total).toBe(47);
      expect(res.page).toBe(2);
      expect(res.pageSize).toBe(10);
    });
  });

  describe('findOne', () => {
    it('找到 → 返回', async () => {
      const findFirstFn = jest.fn().mockResolvedValue({ id: 'c1' });
      setupPrisma({ 'client.findFirst': findFirstFn });
      const res = await service.findOne(SAMPLE_TENANT, 'c1');
      expect(res).toEqual({ id: 'c1' });
    });

    it('找不到 → 抛 NotFoundException', async () => {
      const findFirstFn = jest.fn().mockResolvedValue(null);
      setupPrisma({ 'client.findFirst': findFirstFn });
      await expect(service.findOne(SAMPLE_TENANT, 'c99')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('先 findOne 存在,再 update', async () => {
      const findFirstFn = jest.fn().mockResolvedValue({ id: 'c1' });
      const updateFn = jest.fn().mockResolvedValue({ id: 'c1', clientName: '新名' });
      setupPrisma({ 'client.findFirst': findFirstFn, 'client.update': updateFn });

      await service.update(SAMPLE_TENANT, 'c1', { clientName: '新名' });

      expect(findFirstFn).toHaveBeenCalledWith({
        where: { id: 'c1', tenantId: SAMPLE_TENANT },
      });
      expect(updateFn).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: expect.objectContaining({ clientName: '新名' }),
      });
    });

    it('findOne 不存在 → 抛 NotFound,不调 update', async () => {
      const findFirstFn = jest.fn().mockResolvedValue(null);
      const updateFn = jest.fn();
      setupPrisma({ 'client.findFirst': findFirstFn, 'client.update': updateFn });

      await expect(service.update(SAMPLE_TENANT, 'c99', { clientName: 'x' })).rejects.toThrow(
        NotFoundException,
      );
      expect(updateFn).not.toHaveBeenCalled();
    });
  });

  describe('convertFromLead', () => {
    it('从线索创建客户,并把 lead 状态推进到 CONVERTED_TO_MATTER', async () => {
      const leadFindFirst = jest.fn().mockResolvedValue({
        id: 'l1',
        clientName: '王五',
        contactMobile: '13800138000',
        contactEmail: 'wang@example.com',
      });
      const clientCreate = jest.fn().mockResolvedValue({ id: 'c1' });
      const leadUpdate = jest.fn().mockResolvedValue({ id: 'l1' });
      setupPrisma({
        'lead.findFirst': leadFindFirst,
        'client.create': clientCreate,
        'lead.update': leadUpdate,
      });

      await service.convertFromLead(SAMPLE_TENANT, 'l1');

      expect(clientCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: SAMPLE_TENANT,
          clientName: '王五',
          contactMobile: '13800138000',
        }),
      });
      expect(leadUpdate).toHaveBeenCalledWith({
        where: { id: 'l1' },
        data: { intakeStatus: LeadStatus.CONVERTED_TO_MATTER },
      });
    });

    it('extra 字段覆盖 lead 字段(优先级高)', async () => {
      setupPrisma({
        'lead.findFirst': jest.fn().mockResolvedValue({
          id: 'l1',
          clientName: '原名',
          contactMobile: '原手机',
        }),
        'client.create': jest.fn().mockResolvedValue({ id: 'c1' }),
        'lead.update': jest.fn().mockResolvedValue({ id: 'l1' }),
      });

      await service.convertFromLead(SAMPLE_TENANT, 'l1', {
        clientName: '覆盖名',
        clientType: 'ENTERPRISE',
        contactMobile: '新手机',
      });

      expect(prisma.client.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clientName: '覆盖名',
          clientType: 'ENTERPRISE',
          contactMobile: '新手机',
        }),
      });
    });

    it('extra 没传 clientType → 默认 INDIVIDUAL', async () => {
      setupPrisma({
        'lead.findFirst': jest.fn().mockResolvedValue({ id: 'l1', clientName: 'X' }),
        'client.create': jest.fn().mockResolvedValue({ id: 'c1' }),
        'lead.update': jest.fn().mockResolvedValue({ id: 'l1' }),
      });

      await service.convertFromLead(SAMPLE_TENANT, 'l1');

      expect(prisma.client.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ clientType: 'INDIVIDUAL' }),
      });
    });

    it('lead 不存在 → 抛 NotFound,client 不创建', async () => {
      const clientCreate = jest.fn();
      setupPrisma({
        'lead.findFirst': jest.fn().mockResolvedValue(null),
        'client.create': clientCreate,
      });

      await expect(service.convertFromLead(SAMPLE_TENANT, 'l99')).rejects.toThrow(
        NotFoundException,
      );
      expect(clientCreate).not.toHaveBeenCalled();
    });
  });
});
