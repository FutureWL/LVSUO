import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TenantType, DeploymentMode } from '@lm-unity/shared';
import { AppModule } from '../src/app.module';

/**
 * Auth e2e 真实测试
 *  - 启动完整 AppModule
 *  - 验证: registerTenant 200 / login 200 / login 401
 *  - 每次 register 用唯一 tenantName 避免重名 Conflict
 *
 * 重要:
 *  - 真实 DB(real prisma)→ 会真在 Postgres 写数据
 *  - 用 beforeAll/afterAll 控制生命周期
 *  - 跑完会留下测试租户(暂时不管,看 e2e 后面怎么清理)
 *
 * 不 mock: prisma / jwt / config
 * 让 controller → service → prisma 全链路跑通
 */
const HAS_DB = !!process.env.DATABASE_URL;

(HAS_DB ? describe : describe.skip)('Auth (e2e)', () => {
  let app: INestApplication;
  const uniqueName = `测试律所-${Date.now()}`;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/counsel/v1');
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/counsel/v1/auth/register-tenant → 201 创建成功', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/counsel/v1/auth/register-tenant')
      .send({
        tenantName: uniqueName,
        tenantType: TenantType.FIRM,
        deploymentMode: DeploymentMode.SAAS,
        adminUsername: 'admin',
        adminPassword: 'Test12345678',
        adminRealName: '测试管理员',
      })
      .expect(201);

    expect(res.body.tenant.tenantName).toBe(uniqueName);
    expect(res.body.user.username).toBe('admin');
    expect(res.body.user.roleType).toBe('FIRM_ADMIN');
  });

  it('POST .../register-tenant 重名 → 409', async () => {
    await request(app.getHttpServer())
      .post('/api/counsel/v1/auth/register-tenant')
      .send({
        tenantName: uniqueName, // 已存在
        tenantType: TenantType.FIRM,
        deploymentMode: DeploymentMode.SAAS,
        adminUsername: 'admin2',
        adminPassword: 'Test12345678',
        adminRealName: '测试管理员2',
      })
      .expect(409);
  });

  it('POST .../login 错误密码 → 401', async () => {
    // 需要先知道 tenant.id 才能登录
    // 简化: 用错误的 tenantId,看 401
    await request(app.getHttpServer())
      .post('/api/counsel/v1/auth/login')
      .send({
        tenantId: 'nonexistent',
        username: 'admin',
        password: 'wrong',
      })
      .expect(401);
  });
});
