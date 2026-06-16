import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { RoleType } from '@lm-unity/shared';
import { AuthService } from './auth.service';

/**
 * auth.service 单测 —— 三个外部依赖用最小 mock:
 *  - PrismaClient: jest.fn() 替身,只暴露 service 实际用到的方法
 *  - JwtService: 真实实例(用测试 secret 签发 + 校验,这样能验证 token 真的合法)
 *  - ConfigService: stub,提供 refresh 过期时间
 *  - bcrypt: 真实实现(用预先生成的 hash 喂进去,跑真实 compare)
 */

const TEST_SECRET = 'test-jwt-secret-for-unit-test';
const TEST_TENANT_ID = 'tenant-1';
const TEST_USER_ID = 'user-1';
const TEST_PASSWORD = 'Test12345678';
const TEST_HASH = bcrypt.hashSync(TEST_PASSWORD, 4); // cost=4 跑得快

function makePrisma(opts: { user?: any; tenant?: any } = {}) {
  const userRow = opts.user;
  const tenantRow = opts.tenant ?? { id: TEST_TENANT_ID, status: 'ACTIVE' };
  return {
    user: {
      findFirst: jest.fn().mockResolvedValue(userRow),
      findUnique: jest.fn().mockResolvedValue(userRow),
    },
    tenant: {
      findFirst: jest.fn().mockResolvedValue(tenantRow),
    },
  } as unknown as PrismaClient;
}

function makeConfig() {
  return {
    get: jest.fn((key: string, def?: string) => {
      if (key === 'JWT_REFRESH_EXPIRES_IN') return def ?? '30d';
      return def;
    }),
  } as unknown as ConfigService;
}

function makeService(opts: { user?: any; tenant?: any } = {}) {
  const prisma = makePrisma(opts);
  const jwt = new JwtService({ secret: TEST_SECRET });
  const config = makeConfig();
  const service = new AuthService(prisma, jwt, config);
  return { service, prisma, jwt, config };
}

describe('AuthService.login', () => {
  it('成功:返回 accessToken / refreshToken / user', async () => {
    const { service } = makeService({
      user: {
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        username: 'admin',
        passwordHash: TEST_HASH,
        realName: '测试管理员',
        roleType: RoleType.FIRM_ADMIN,
        userStatus: 'ACTIVE',
      },
    });

    const res = await service.login(TEST_TENANT_ID, 'admin', TEST_PASSWORD);
    expect(res.accessToken).toBeTruthy();
    expect(res.refreshToken).toBeTruthy();
    expect(res.user).toEqual({
      id: TEST_USER_ID,
      username: 'admin',
      realName: '测试管理员',
      role: RoleType.FIRM_ADMIN,
      tenantId: TEST_TENANT_ID,
    });
    // accessToken 和 refreshToken 不能相等(签名 options 不同)
    expect(res.accessToken).not.toBe(res.refreshToken);
  });

  it('accessToken 可用测试 secret 解出正确 payload', async () => {
    const { service, jwt } = makeService({
      user: {
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        username: 'admin',
        passwordHash: TEST_HASH,
        realName: '测试管理员',
        roleType: RoleType.FIRM_ADMIN,
        userStatus: 'ACTIVE',
      },
    });
    const res = await service.login(TEST_TENANT_ID, 'admin', TEST_PASSWORD);
    const payload = jwt.verify(res.accessToken);
    expect(payload).toMatchObject({
      sub: TEST_USER_ID,
      tid: TEST_TENANT_ID,
      role: RoleType.FIRM_ADMIN,
    });
  });

  it('用户名不存在 → 401', async () => {
    const { service } = makeService({ user: null });
    await expect(
      service.login(TEST_TENANT_ID, 'nobody', TEST_PASSWORD),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('密码错误 → 401(不会暴露用户名是否存在)', async () => {
    const { service } = makeService({
      user: {
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        username: 'admin',
        passwordHash: TEST_HASH,
        realName: '测试管理员',
        roleType: RoleType.FIRM_ADMIN,
        userStatus: 'ACTIVE',
      },
    });
    await expect(
      service.login(TEST_TENANT_ID, 'admin', 'wrong-password'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('已禁用用户(userStatus !== ACTIVE)被 prisma 过滤后等同于"用户不存在"', async () => {
    // service 用 where.userStatus: 'ACTIVE' 过滤,DB 层就排除了禁用账户
    // 模拟 prisma 已过滤,返回 null
    const { service, prisma } = makeService({ user: null });
    await expect(
      service.login(TEST_TENANT_ID, 'admin', TEST_PASSWORD),
    ).rejects.toThrow(UnauthorizedException);
    // 确认查询条件带了 userStatus: 'ACTIVE'(防止改坏过滤)
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userStatus: 'ACTIVE' }),
      }),
    );
  });

  it('用户属于别的租户 → 同样 401', async () => {
    // 用 tenantId-A 查,prisma 因为 where 条件 tenantId 不匹配返回 null
    const { service } = makeService({ user: null });
    await expect(
      service.login('tenant-other', 'admin', TEST_PASSWORD),
    ).rejects.toThrow(UnauthorizedException);
  });
});

describe('AuthService.refresh', () => {
  it('有效 refreshToken → 返回新 accessToken', async () => {
    const { service, jwt } = makeService({
      user: {
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        username: 'admin',
        passwordHash: TEST_HASH,
        realName: '测试管理员',
        roleType: RoleType.FIRM_ADMIN,
        userStatus: 'ACTIVE',
      },
    });
    const refreshToken = jwt.sign(
      { sub: TEST_USER_ID, tid: TEST_TENANT_ID, role: RoleType.FIRM_ADMIN },
      { expiresIn: '30d' },
    );
    const res = await service.refresh(refreshToken);
    expect(res.accessToken).toBeTruthy();
    const payload = jwt.verify(res.accessToken);
    expect(payload.sub).toBe(TEST_USER_ID);
  });

  it('无效 token(签名错)→ 401', async () => {
    const { service } = makeService({ user: null });
    await expect(service.refresh('not-a-real-jwt')).rejects.toThrow(UnauthorizedException);
  });

  it('token 合法但用户已被禁用 → 401', async () => {
    const { service, jwt } = makeService({ user: null });
    const refreshToken = jwt.sign(
      { sub: TEST_USER_ID, tid: TEST_TENANT_ID, role: RoleType.FIRM_ADMIN },
    );
    await expect(service.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
  });
});
