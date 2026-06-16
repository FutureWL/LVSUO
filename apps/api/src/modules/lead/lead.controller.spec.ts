import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe, CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { RoleType, TriageResult } from '@lm-unity/shared';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';

/**
 * LeadController 端到端测试
 *  - 真实 NestTestingModule + supertest
 *  - 覆盖 JwtAuthGuard / TenantGuard / PermissionGuard
 *    (用 mock 替换,都放行)
 *  - DTO 验证(ValidationPipe 注入)
 *  - 通过自定义 provider 注入 request.user(JwtPayload)
 *    让 @CurrentUser() 拿得到
 */

class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = {
      sub: 'u1',
      tid: 't1',
      role: RoleType.FIRM_ADMIN,
    };
    return true;
  }
}
class MockTenantGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}
class MockPermissionGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

// 确认 require 拿到的是 class(不是 undefined)
// const { JwtAuthGuard } = require('../../common/auth/jwt-auth.guard');
// const { TenantGuard } = require('../../common/tenant/tenant.guard');
// const { PermissionGuard } = require('../../common/permission/permission.guard');
// console.log('guards:', typeof JwtAuthGuard, typeof TenantGuard, typeof PermissionGuard);

describe('LeadController (e2e)', () => {
  let app: INestApplication;
  let leadService: jest.Mocked<LeadService>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadController],
      providers: [
        {
          provide: LeadService,
          useValue: {
            create: jest.fn(),
            findByTenant: jest.fn(),
            findOne: jest.fn(),
            assignLawyer: jest.fn(),
            triage: jest.fn(),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    // 全局注册 mock 守卫(覆盖 APP_GUARD)
    app.useGlobalGuards(new MockAuthGuard(), new MockTenantGuard(), new MockPermissionGuard());
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    leadService = module.get(LeadService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /leads', () => {
    it('201 → service.create,带 tid from request.user', async () => {
      leadService.create.mockResolvedValue({ id: 'l1' } as any);
      const body = {
        sourceChannel: '抖音',
        clientName: '王小明',
        contactMobile: '13800138000',
        urgencyLevel: 'URGENT',
      };
      const res = await request(app.getHttpServer()).post('/leads').send(body).expect(201);
      expect(res.body).toEqual({ id: 'l1' });
      expect(leadService.create).toHaveBeenCalledWith('t1', body);
    });

    it('缺 clientName → 400', async () => {
      await request(app.getHttpServer()).post('/leads').send({ sourceChannel: '抖音' }).expect(400);
      expect(leadService.create).not.toHaveBeenCalled();
    });

    it('urgencyLevel 不在枚举 → 400', async () => {
      await request(app.getHttpServer())
        .post('/leads')
        .send({ sourceChannel: '抖音', clientName: 'X', urgencyLevel: 'INVALID' })
        .expect(400);
    });
  });

  describe('GET /leads', () => {
    it('200 → service.findByTenant,page/pageSize 转 number', async () => {
      leadService.findByTenant.mockResolvedValue({
        items: [{ id: 'l1' }],
        total: 1,
        page: 2,
        pageSize: 5,
      } as any);
      const res = await request(app.getHttpServer())
        .get('/leads?page=2&pageSize=5&keyword=王&status=NEW_LEAD')
        .expect(200);
      expect(res.body.items).toHaveLength(1);
      expect(leadService.findByTenant).toHaveBeenCalledWith('t1', 2, 5, {
        keyword: '王',
        status: 'NEW_LEAD',
        urgency: undefined,
        from: undefined,
        to: undefined,
      });
    });
  });

  describe('GET /leads/:id', () => {
    it('200 → service.findOne', async () => {
      leadService.findOne.mockResolvedValue({ id: 'l1', clientName: 'X' } as any);
      const res = await request(app.getHttpServer()).get('/leads/l1').expect(200);
      expect(res.body.id).toBe('l1');
      expect(leadService.findOne).toHaveBeenCalledWith('t1', 'l1');
    });
  });

  describe('POST /leads/:id/assign-lawyer', () => {
    it('201 → service.assignLawyer', async () => {
      leadService.assignLawyer.mockResolvedValue({ id: 'l1' } as any);
      const res = await request(app.getHttpServer())
        .post('/leads/l1/assign-lawyer')
        .send({ lawyerId: 'u1' })
        .expect(201);
      expect(leadService.assignLawyer).toHaveBeenCalledWith('t1', 'l1', 'u1');
    });

    it('缺 lawyerId → 400', async () => {
      await request(app.getHttpServer()).post('/leads/l1/assign-lawyer').send({}).expect(400);
    });
  });

  describe('POST /leads/:id/triage', () => {
    it('201 → service.triage,带 tid', async () => {
      leadService.triage.mockResolvedValue({ id: 'l1' } as any);
      const body = {
        triageResult: TriageResult.STRUCTURED_DIAGNOSIS,
        shouldTransferToLawyer: true,
      };
      const res = await request(app.getHttpServer())
        .post('/leads/l1/triage')
        .send(body)
        .expect(201);
      expect(leadService.triage).toHaveBeenCalledWith('t1', 'l1', body);
    });

    it('triageResult 缺 → 400(必填)', async () => {
      await request(app.getHttpServer())
        .post('/leads/l1/triage')
        .send({ shouldTransferToLawyer: true })
        .expect(400);
    });
  });
});
