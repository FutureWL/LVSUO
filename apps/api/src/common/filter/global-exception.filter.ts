import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiResponse, ErrorCode } from '@lm-unity/shared';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ErrorCode.INTERNAL_ERROR;
    let message = 'Internal server error';
    let dataLevel: ApiResponse['dataLevel'];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as any;
        message = obj.message || exception.message;
        code = obj.code || this.mapStatusToCode(status);
        dataLevel = obj.dataLevel;
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.stack);
    }

    const body: ApiResponse = {
      code,
      message: Array.isArray(message) ? message.join('; ') : String(message),
      dataLevel,
      traceId: request.headers['x-trace-id'] as string,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }

  private mapStatusToCode(status: number): string {
    switch (status) {
      case 400:
        return ErrorCode.INVALID_PARAMS;
      case 401:
        return ErrorCode.UNAUTHORIZED;
      case 403:
        return ErrorCode.FORBIDDEN;
      case 404:
        return ErrorCode.NOT_FOUND;
      case 409:
        return ErrorCode.CONFLICT;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }
}
