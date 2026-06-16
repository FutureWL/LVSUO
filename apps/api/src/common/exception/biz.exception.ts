import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorCodeType } from '@lm-unity/shared';

/**
 * 业务异常 —— 携带稳定的 error code,前端可按 code 分支处理
 *
 *  用法:
 *    throw new BizException(ErrorCode.LEAD_NOT_FOUND, '线索不存在', HttpStatus.NOT_FOUND);
 *    throw new BizNotFoundException(ErrorCode.LEAD_NOT_FOUND, '线索不存在');
 *
 * 设计:
 *  - 抛出的对象 res = { code, message }，GlobalExceptionFilter 已能拾取
 *  - 不传 status 时默认 400（业务参数错），按需选合适子类
 *  - message 是给用户看的中文，前端会原样展示
 */
export class BizException extends HttpException {
  constructor(
    public readonly code: ErrorCodeType,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message }, status);
  }
}

/** 400 - 业务参数 / 状态不合法 */
export class BizBadRequestException extends BizException {
  constructor(code: ErrorCodeType, message: string) {
    super(code, message, HttpStatus.BAD_REQUEST);
  }
}

/** 401 - 未登录 / token 无效 */
export class BizUnauthorizedException extends BizException {
  constructor(code: ErrorCodeType, message: string) {
    super(code, message, HttpStatus.UNAUTHORIZED);
  }
}

/** 403 - 已登录但越权 / 越租户 */
export class BizForbiddenException extends BizException {
  constructor(code: ErrorCodeType, message: string) {
    super(code, message, HttpStatus.FORBIDDEN);
  }
}

/** 404 - 资源不存在 */
export class BizNotFoundException extends BizException {
  constructor(code: ErrorCodeType, message: string) {
    super(code, message, HttpStatus.NOT_FOUND);
  }
}

/** 409 - 资源冲突（重复 / 状态不允许） */
export class BizConflictException extends BizException {
  constructor(code: ErrorCodeType, message: string) {
    super(code, message, HttpStatus.CONFLICT);
  }
}
