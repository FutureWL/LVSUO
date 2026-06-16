import { NotFoundException } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { makePrismaMock } from '../../common/test/prisma-mock';

/**
 * TenantService 单测
 *  - findOne: 找到/NotFound
 */

describe('TenantService', () => {
  let service: TenantService;
  let prisma: any;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new TenantService(prisma);
  });

  function setupPrisma(spec: Record<string, any> = {}) {
    prisma = makePrismaMock(spec);
    service = new TenantService(prisma);
  }

  describe('findOne', () => {
    it('找到 → 返回 tenant', async () => {
      const findUniqueFn = jest.fn().mockResolvedValue({ id: 't1', tenantName: 'ABC 律所' });
      setupPrisma({ 'tenant.findUnique': findUniqueFn });

      const res = await service.findOne('t1');
      expect(res).toEqual({ id: 't1', tenantName: 'ABC 律所' });
      expect(findUniqueFn).toHaveBeenCalledWith({ where: { id: 't1' } });
    });

    it('找不到 → 抛 NotFoundException', async () => {
      setupPrisma({ 'tenant.findUnique': jest.fn().mockResolvedValue(null) });
      await expect(service.findOne('t99')).rejects.toThrow(NotFoundException);
    });
  });
});
