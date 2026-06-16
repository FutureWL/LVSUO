import { ConflictException, NotFoundException } from '@nestjs/common';
import { TenantType, DeploymentMode } from '@lm-unity/shared';
import { PlatformTenantService } from './platform-tenant.service';
import { makePrismaMock } from '../../common/test/prisma-mock';

/**
 * PlatformTenantService 单测
 *  - listAll: 分页 + search 过滤
 *  - create: 重名 → Conflict; 创建 tenant + 第一个管理员(bcrypt 密码)
 *    - SOLO → roleType=SOLO_LAWYER
 *    - 非 SOLO → roleType=FIRM_ADMIN
 *  - updateStatus: 找不到 → NotFound; PLATFORM 自身 → Conflict
 *  - getStats: 跨租户统计
 */

describe('PlatformTenantService', () => {
  let service: PlatformTenantService;
  let prisma: any;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new PlatformTenantService(prisma);
  });

  function setupPrisma(spec: Record<string, any> = {}) {
    prisma = makePrismaMock(spec);
    service = new PlatformTenantService(prisma);
  }

  describe('listAll', () => {
    it('分页 + search 过滤 + 包含 _count', async () => {
      const findManyFn = jest.fn().mockResolvedValue([{ id: 't1' }]);
      const countFn = jest.fn().mockResolvedValue(1);
      const txFn = jest.fn().mockResolvedValue([[{ id: 't1' }], 1]);
      setupPrisma({
        $transaction: txFn,
        'tenant.findMany': findManyFn,
        'tenant.count': countFn,
      });

      const res = await service.listAll(2, 5, 'ABC');
      expect(res.total).toBe(1);
      expect(res.page).toBe(2);
      expect(res.pageSize).toBe(5);
      // search 进了 where
      expect(findManyFn).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantName: { contains: 'ABC', mode: 'insensitive' } },
        }),
      );
    });

    it('不传 search → where 是空对象', async () => {
      const findManyFn = jest.fn().mockResolvedValue([]);
      const countFn = jest.fn().mockResolvedValue(0);
      const txFn = jest.fn().mockResolvedValue([[], 0]);
      setupPrisma({
        $transaction: txFn,
        'tenant.findMany': findManyFn,
        'tenant.count': countFn,
      });

      await service.listAll();
      expect(findManyFn).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });
  });

  describe('create', () => {
    const baseInput = {
      tenantName: '新律所',
      tenantType: TenantType.FIRM,
      deploymentMode: DeploymentMode.SAAS,
      adminUsername: 'admin',
      adminPassword: 'Test12345678',
      adminRealName: '管理员',
    };

    it('租户名已存在 → 抛 ConflictException', async () => {
      const createFn = jest.fn();
      setupPrisma({
        'tenant.findFirst': jest.fn().mockResolvedValue({ id: 'existing' }),
        'tenant.create': createFn,
      });

      await expect(service.create(baseInput)).rejects.toThrow(ConflictException);
      expect(createFn).not.toHaveBeenCalled();
    });

    it('SOLO → roleType=SOLO_LAWYER', async () => {
      const tenantCreate = jest.fn().mockResolvedValue({ id: 't1', tenantName: '新律所' });
      const userCreate = jest.fn().mockResolvedValue({ id: 'u1' });
      setupPrisma({
        'tenant.findFirst': jest.fn().mockResolvedValue(null),
        'tenant.create': tenantCreate,
        'user.create': userCreate,
      });

      await service.create({ ...baseInput, tenantType: TenantType.SOLO });

      expect(userCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 't1',
          username: 'admin',
          realName: '管理员',
          roleType: 'SOLO_LAWYER',
          passwordHash: expect.stringMatching(/^\$2[aby]\$/),
        }),
      });
    });

    it('FIRM → roleType=FIRM_ADMIN', async () => {
      const tenantCreate = jest.fn().mockResolvedValue({ id: 't2' });
      const userCreate = jest.fn().mockResolvedValue({ id: 'u2' });
      setupPrisma({
        'tenant.findFirst': jest.fn().mockResolvedValue(null),
        'tenant.create': tenantCreate,
        'user.create': userCreate,
      });

      await service.create(baseInput);
      expect(userCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 't2',
          roleType: 'FIRM_ADMIN',
        }),
      });
    });
  });

  describe('updateStatus', () => {
    it('找不到 → NotFound', async () => {
      const updateFn = jest.fn();
      setupPrisma({
        'tenant.findUnique': jest.fn().mockResolvedValue(null),
        'tenant.update': updateFn,
      });
      await expect(service.updateStatus('t99', 'ACTIVE')).rejects.toThrow(NotFoundException);
      expect(updateFn).not.toHaveBeenCalled();
    });

    it('PLATFORM 自身租户 → Conflict(不能修改)', async () => {
      const updateFn = jest.fn();
      setupPrisma({
        'tenant.findUnique': jest.fn().mockResolvedValue({ id: 't1', tenantName: 'PLATFORM' }),
        'tenant.update': updateFn,
      });
      await expect(service.updateStatus('t1', 'SUSPENDED')).rejects.toThrow(ConflictException);
      expect(updateFn).not.toHaveBeenCalled();
    });

    it('普通租户 → 改 status', async () => {
      const updateFn = jest.fn().mockResolvedValue({ id: 't1', status: 'SUSPENDED' });
      setupPrisma({
        'tenant.findUnique': jest.fn().mockResolvedValue({ id: 't1', tenantName: 'ABC 律所' }),
        'tenant.update': updateFn,
      });
      await service.updateStatus('t1', 'SUSPENDED');
      expect(updateFn).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { status: 'SUSPENDED' },
      });
    });
  });

  describe('getStats', () => {
    it('跨租户统计 + byType group', async () => {
      const txFn = jest.fn().mockResolvedValue([
        10, // totalTenants
        8, // activeTenants
        50, // totalUsers
        100, // totalLeads
        20, // totalMatters
        5, // totalKnowledgeCards
        [
          { tenantType: 'FIRM', _count: { _all: 8 } },
          { tenantType: 'SOLO', _count: { _all: 2 } },
        ],
      ]);
      setupPrisma({
        $transaction: txFn,
        // 下面这些 .count() 会在 service 里被调用以构造入参,需要返回 promise
        'tenant.count': jest.fn().mockResolvedValue(0),
        'user.count': jest.fn().mockResolvedValue(0),
        'lead.count': jest.fn().mockResolvedValue(0),
        'matter.count': jest.fn().mockResolvedValue(0),
        'knowledgeCard.count': jest.fn().mockResolvedValue(0),
        'tenant.groupBy': jest.fn().mockResolvedValue([]),
      });

      const stats = await service.getStats();
      expect(stats.totalTenants).toBe(10);
      expect(stats.activeTenants).toBe(8);
      expect(stats.totalUsers).toBe(50);
      expect(stats.byType.FIRM).toBe(8);
      expect(stats.byType.SOLO).toBe(2);
    });
  });
});
