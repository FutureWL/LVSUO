import { NotFoundException } from '@nestjs/common';
import { RoleType } from '@lm-unity/shared';
import { UserService } from './user.service';
import { makePrismaMock } from '../../common/test/prisma-mock';

/**
 * UserService 单测
 *  - 字段映射(create / findOne / findByTenant)
 *  - bcrypt 密码 hash(create)
 *  - NotFound 异常(findOne)
 */

const SAMPLE_TENANT = 't1';

describe('UserService', () => {
  let service: UserService;
  let prisma: any;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new UserService(prisma);
  });

  function setupPrisma(spec: Record<string, any> = {}) {
    prisma = makePrismaMock(spec);
    service = new UserService(prisma);
  }

  describe('create', () => {
    it('bcrypt 密码 hash + 字段映射', async () => {
      const createFn = jest.fn().mockResolvedValue({ id: 'u1' });
      setupPrisma({ 'user.create': createFn });

      const input = {
        username: 'admin',
        password: 'Test12345678',
        mobile: '13800138000',
        email: 'admin@example.com',
        realName: '管理员',
        roleType: RoleType.FIRM_ADMIN,
        licenseNo: 'L-001',
      };
      await service.create(SAMPLE_TENANT, input);

      // password 不在入参 data(只 hash 后的 passwordHash)
      expect(createFn).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: SAMPLE_TENANT,
          username: 'admin',
          realName: '管理员',
          roleType: 'FIRM_ADMIN',
          licenseNo: 'L-001',
          userStatus: 'ACTIVE',
          // passwordHash 是 bcrypt 算的,不是明文
          passwordHash: expect.stringMatching(/^\$2[aby]\$/),
        }),
      });
      // 明文 password 一定不在入参
      const call = createFn.mock.calls[0]![0] as any;
      expect(call.data.passwordHash).not.toBe('Test12345678');
    });

    it('bcrypt hash 不是明文(不可逆)', async () => {
      const createFn = jest.fn().mockResolvedValue({ id: 'u1' });
      setupPrisma({ 'user.create': createFn });
      await service.create(SAMPLE_TENANT, {
        username: 'admin',
        password: 'Test12345678',
        realName: '管理员',
        roleType: RoleType.FIRM_ADMIN,
      });
      const call = createFn.mock.calls[0]![0] as any;
      // bcrypt hash 长度 = 60
      expect(call.data.passwordHash.length).toBe(60);
    });
  });

  describe('findOne', () => {
    it('找到 → 返回', async () => {
      const findFirstFn = jest.fn().mockResolvedValue({ id: 'u1', username: 'admin' });
      setupPrisma({ 'user.findFirst': findFirstFn });
      const res = await service.findOne(SAMPLE_TENANT, 'u1');
      expect(res).toEqual({ id: 'u1', username: 'admin' });
      expect(findFirstFn).toHaveBeenCalledWith({
        where: { id: 'u1', tenantId: SAMPLE_TENANT },
      });
    });

    it('找不到 → 抛 NotFoundException', async () => {
      setupPrisma({ 'user.findFirst': jest.fn().mockResolvedValue(null) });
      await expect(service.findOne(SAMPLE_TENANT, 'u99')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByTenant', () => {
    it('只取 ACTIVE 用户,按 createdAt desc 排序', async () => {
      const findManyFn = jest.fn().mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
      setupPrisma({ 'user.findMany': findManyFn });

      const res = await service.findByTenant(SAMPLE_TENANT);
      expect(res).toEqual([{ id: 'u1' }, { id: 'u2' }]);
      expect(findManyFn).toHaveBeenCalledWith({
        where: { tenantId: SAMPLE_TENANT, userStatus: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
