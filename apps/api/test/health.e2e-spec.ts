import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Health e2e 测试
 *  - 启动完整 AppModule(所有 module + guard)
 *  - 打 /api/counsel/v1/health
 *  - 公共路由(无 JwtAuthGuard 拦)
 *  - 验证 DB 可达性
 *
 * 运行: pnpm test:e2e -- test/health.e2e-spec.ts
 * 前提: .env 配置 DATABASE_URL 可达的真实 Postgres
 *       缺 DB 时 health 返回 503
 *
 * 重要:
 *  - 这个测试需要完整 NestModule 启动
 *  - 跟 controller.spec.ts(用 TestingModule + mock)不同
 *  - 是真正的端到端,跑全 module + 真实 DB
 *
 * 注意:测试要 skip 除非 DB 可用
 */
const HAS_DB = !!process.env.DATABASE_URL;

(HAS_DB ? describe : describe.skip)('Health (e2e)', () => {
  let app: INestApplication;

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

  it('GET /api/counsel/v1/health → 200 with status + db up', async () => {
    const res = await request(app.getHttpServer()).get('/api/counsel/v1/health').expect(200);

    expect(res.body).toMatchObject({
      status: 'ok',
      version: '0.1.0',
      components: { database: 'up' },
    });
    expect(res.body.timestamp).toBeDefined();
  });
});
