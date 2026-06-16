import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TenantType, DeploymentMode, RoleType } from '@lm-unity/shared';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * AuthController 端到端测试
 *  - 真实 NestTestingModule + supertest
 *  - DTO 验证(ValidationPipe 注入)
 *  - 公开路由(无 JwtAuthGuard)
 *  - 验证:
 *    · HTTP 路由(POST /register-tenant, /login, /refresh)
 *    · DTO 验证(缺字段 → 400)
 *    · Controller → Service 委托
 *    · 错误异常(Conflict / Unauthorized)
 */

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let authService: jest.Mocked<AuthService>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            registerTenant: jest.fn(),
            login: jest.fn(),
            refresh: jest.fn(),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    authService = module.get(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /register-tenant', () => {
    const validBody = {
      tenantName: '新律所',
      tenantType: TenantType.FIRM,
      deploymentMode: DeploymentMode.SAAS,
      adminUsername: 'admin',
      adminPassword: 'Test12345678',
      adminRealName: '管理员',
    };

    it('200 → service.registerTenant 被调, 返回结果', async () => {
      const mockResult = { tenant: { id: 't1', tenantName: '新律所' }, user: { id: 'u1' } };
      authService.registerTenant.mockResolvedValue(mockResult as any);

      const res = await request(app.getHttpServer())
        .post('/auth/register-tenant')
        .send(validBody)
        .expect(201);

      expect(res.body).toEqual(mockResult);
      expect(authService.registerTenant).toHaveBeenCalledWith(validBody);
    });

    it('ConflictException(重名) → 409', async () => {
      authService.registerTenant.mockRejectedValue(new ConflictException('租户名称已存在'));

      await request(app.getHttpServer()).post('/auth/register-tenant').send(validBody).expect(409);
    });

    it('缺 tenantName → 400(ValidationPipe 拦)', async () => {
      const { tenantName, ...noName } = validBody;
      const res = await request(app.getHttpServer())
        .post('/auth/register-tenant')
        .send(noName)
        .expect(400);
      expect(res.body.message).toBeDefined();
      // service 不该被调
      expect(authService.registerTenant).not.toHaveBeenCalled();
    });

    it('adminPassword 太短(<8) → 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/register-tenant')
        .send({ ...validBody, adminPassword: 'short' })
        .expect(400);
    });

    it('非白名单字段(forbidNonWhitelisted)→ 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/register-tenant')
        .send({ ...validBody, evilField: 'hacker' })
        .expect(400);
    });
  });

  describe('POST /login', () => {
    const validBody = { tenantId: 't1', username: 'admin', password: 'Test12345678' };

    it('200 → service.login, 返回 token + user', async () => {
      const mockResult = {
        accessToken: 'jwt-xxx',
        refreshToken: 'refresh-xxx',
        user: {
          id: 'u1',
          username: 'admin',
          realName: '管理员',
          role: RoleType.FIRM_ADMIN,
          tenantId: 't1',
        },
      };
      authService.login.mockResolvedValue(mockResult as any);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(validBody)
        .expect(201);

      expect(res.body).toEqual(mockResult);
      expect(authService.login).toHaveBeenCalledWith('t1', 'admin', 'Test12345678');
    });

    it('Unauthorized → 401', async () => {
      authService.login.mockRejectedValue(new UnauthorizedException('用户名或密码错误'));

      await request(app.getHttpServer()).post('/auth/login').send(validBody).expect(401);
    });

    it('缺 password → 400', async () => {
      const { password, ...noPwd } = validBody;
      await request(app.getHttpServer()).post('/auth/login').send(noPwd).expect(400);
    });
  });

  describe('POST /refresh', () => {
    it('200 → service.refresh, 返回新 accessToken', async () => {
      const mockResult = { accessToken: 'jwt-new' };
      authService.refresh.mockResolvedValue(mockResult as any);

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'refresh-xxx' })
        .expect(201);

      expect(res.body).toEqual(mockResult);
      expect(authService.refresh).toHaveBeenCalledWith('refresh-xxx');
    });

    it('token 无效 → 401', async () => {
      authService.refresh.mockRejectedValue(new UnauthorizedException('Refresh token 无效'));

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid' })
        .expect(401);
    });
  });
});
