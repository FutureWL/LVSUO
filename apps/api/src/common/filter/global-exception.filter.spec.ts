import { HttpStatus } from '@nestjs/common';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ErrorCode } from '@lm-unity/shared';
import { GlobalExceptionFilter } from './global-exception.filter';
import {
  BizException,
  BizNotFoundException,
} from '../exception/biz.exception';

interface MockBody {
  code?: string;
  message?: string;
  dataLevel?: string;
  traceId?: string;
  timestamp?: string;
}

function makeHost(headers: Record<string, string> = {}) {
  const captured: { status?: number; body?: MockBody } = {};
  const response = {
    status(code: number) {
      captured.status = code;
      return this;
    },
    json(body: MockBody) {
      captured.body = body;
      return this;
    },
  };
  const request = { headers };
  const host = {
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
  } as any;
  return { host, captured };
}

describe('GlobalExceptionFilter', () => {
  const filter = new GlobalExceptionFilter();

  it('BizException 携带 code,前端可按 code 处理', () => {
    const { host, captured } = makeHost();
    filter.catch(
      new BizException(ErrorCode.LEAD_INVALID_STATUS, '当前线索状态不允许分诊', HttpStatus.BAD_REQUEST),
      host,
    );
    expect(captured.status).toBe(400);
    expect(captured.body?.code).toBe('LEAD_INVALID_STATUS');
    expect(captured.body?.message).toBe('当前线索状态不允许分诊');
    expect(captured.body?.timestamp).toBeTruthy();
  });

  it('BizNotFoundException 默认 404 + 业务 code', () => {
    const { host, captured } = makeHost();
    filter.catch(new BizNotFoundException(ErrorCode.LEAD_NOT_FOUND, '线索不存在'), host);
    expect(captured.status).toBe(404);
    expect(captured.body?.code).toBe('LEAD_NOT_FOUND');
    expect(captured.body?.message).toBe('线索不存在');
  });

  it('原生 NotFoundException(字符串) 走 status→code 兜底映射', () => {
    const { host, captured } = makeHost();
    filter.catch(new NotFoundException('线索不存在'), host);
    expect(captured.status).toBe(404);
    expect(captured.body?.code).toBe('NOT_FOUND');
    expect(captured.body?.message).toBe('线索不存在');
  });

  it('原生 BadRequestException(对象带 code) 透传 code', () => {
    const { host, captured } = makeHost();
    filter.catch(
      new BadRequestException({ code: ErrorCode.QUOTE_SCOPE_EMPTY, message: '服务范围不能为空' }),
      host,
    );
    expect(captured.status).toBe(400);
    expect(captured.body?.code).toBe('QUOTE_SCOPE_EMPTY');
    expect(captured.body?.message).toBe('服务范围不能为空');
  });

  it('Unauthorized / Forbidden 状态码与 code 映射正确', () => {
    const h1 = makeHost();
    filter.catch(new UnauthorizedException('token 失效'), h1.host);
    expect(h1.captured.status).toBe(401);
    expect(h1.captured.body?.code).toBe('UNAUTHORIZED');

    const h2 = makeHost();
    filter.catch(new ForbiddenException('越租户'), h2.host);
    expect(h2.captured.status).toBe(403);
    expect(h2.captured.body?.code).toBe('FORBIDDEN');
  });

  it('未知异常 → 500 + INTERNAL_ERROR,stack 进入日志', () => {
    const { host, captured } = makeHost();
    const boom = new Error('数据库挂了');
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {}); // nest Logger 走 console
    filter.catch(boom, host);
    expect(captured.status).toBe(500);
    expect(captured.body?.code).toBe('INTERNAL_ERROR');
    expect(captured.body?.message).toBe('Internal server error');
    spy.mockRestore();
  });

  it('透传 traceId 与 dataLevel(来自对象 res)', () => {
    const { host, captured } = makeHost({ 'x-trace-id': 'trace-abc-123' });
    filter.catch(
      new BadRequestException({ code: 'X', message: 'm', dataLevel: 'L4' }),
      host,
    );
    expect(captured.body?.traceId).toBe('trace-abc-123');
    expect(captured.body?.dataLevel).toBe('L4');
  });
});
