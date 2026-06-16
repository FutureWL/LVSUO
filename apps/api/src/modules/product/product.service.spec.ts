import { NotFoundException } from '@nestjs/common';
import { ProductService } from './product.service';
import { makePrismaMock } from '../../common/test/prisma-mock';

/**
 * ProductService 单测
 *  - create / update / findOne / findByTenant
 *  - update 默认 requiresLawyer=true, requiresPartnerApproval=false
 *  - findByTenant 只取 status=ACTIVE
 *  - findOne 找不到 → NotFound
 */

const SAMPLE_TENANT = 't1';

describe('ProductService', () => {
  let service: ProductService;
  let prisma: any;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new ProductService(prisma);
  });

  function setupPrisma(spec: Record<string, any> = {}) {
    prisma = makePrismaMock(spec);
    service = new ProductService(prisma);
  }

  describe('create', () => {
    it('字段映射 + 默认值(requiresLawyer=true, requiresPartnerApproval=false)', async () => {
      const createFn = jest.fn().mockResolvedValue({ id: 'p1' });
      setupPrisma({ 'serviceProduct.create': createFn });

      await service.create(SAMPLE_TENANT, {
        productName: 'P1 低价诊断',
        productType: 'P1',
        serviceScope: '初步诊断',
      });

      expect(createFn).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: SAMPLE_TENANT,
          productName: 'P1 低价诊断',
          productType: 'P1',
          serviceScope: '初步诊断',
          requiresLawyer: true, // 默认
          requiresPartnerApproval: false, // 默认
        }),
      });
    });

    it('显式传 requiresPartnerApproval=true → 保留', async () => {
      const createFn = jest.fn().mockResolvedValue({ id: 'p1' });
      setupPrisma({ 'serviceProduct.create': createFn });

      await service.create(SAMPLE_TENANT, {
        productName: 'P5 完整代理',
        productType: 'P5',
        serviceScope: '诉讼全程',
        requiresPartnerApproval: true,
      });

      expect(createFn).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requiresPartnerApproval: true,
        }),
      });
    });
  });

  describe('update', () => {
    it('先 findOne 存在,再 update(不带默认值,因为是 update)', async () => {
      const findFirstFn = jest.fn().mockResolvedValue({ id: 'p1' });
      const updateFn = jest.fn().mockResolvedValue({ id: 'p1' });
      setupPrisma({
        'serviceProduct.findFirst': findFirstFn,
        'serviceProduct.update': updateFn,
      });

      await service.update(SAMPLE_TENANT, 'p1', {
        productName: '改名',
        basePrice: 6000,
      });

      expect(findFirstFn).toHaveBeenCalled();
      expect(updateFn).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: expect.objectContaining({
          productName: '改名',
          basePrice: 6000,
        }),
      });
    });

    it('findOne 不存在 → 抛 NotFound,update 不调', async () => {
      const updateFn = jest.fn();
      setupPrisma({
        'serviceProduct.findFirst': jest.fn().mockResolvedValue(null),
        'serviceProduct.update': updateFn,
      });

      await expect(service.update(SAMPLE_TENANT, 'p99', { productName: 'x' })).rejects.toThrow(
        NotFoundException,
      );
      expect(updateFn).not.toHaveBeenCalled();
    });
  });

  describe('findByTenant', () => {
    it('只取 status=ACTIVE, 按 createdAt desc', async () => {
      const findManyFn = jest.fn().mockResolvedValue([{ id: 'p1' }]);
      setupPrisma({ 'serviceProduct.findMany': findManyFn });

      const res = await service.findByTenant(SAMPLE_TENANT);
      expect(res).toEqual([{ id: 'p1' }]);
      expect(findManyFn).toHaveBeenCalledWith({
        where: { tenantId: SAMPLE_TENANT, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('找到 → 返回', async () => {
      const findFirstFn = jest.fn().mockResolvedValue({ id: 'p1', productName: 'P1' });
      setupPrisma({ 'serviceProduct.findFirst': findFirstFn });
      const res = await service.findOne(SAMPLE_TENANT, 'p1');
      expect(res).toEqual({ id: 'p1', productName: 'P1' });
    });

    it('找不到 → 抛 NotFoundException', async () => {
      setupPrisma({ 'serviceProduct.findFirst': jest.fn().mockResolvedValue(null) });
      await expect(service.findOne(SAMPLE_TENANT, 'p99')).rejects.toThrow(NotFoundException);
    });
  });
});
