import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { PrismaClient } from '@prisma/client';
import { Inject } from '@nestjs/common';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(PrismaClient) private readonly prisma: PrismaClient) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '健康检查(数据库可达性)' })
  @ApiResponse({ status: 200, description: '服务正常', schema: {
      example: { status: 'ok', timestamp: '2026-06-16T10:00:00.000Z', version: '0.1.0', components: { database: 'up' } },
    } })
  @ApiResponse({ status: 503, description: '数据库不可达', schema: {
      example: { status: 'degraded', components: { database: 'down' } },
    } })
  async check() {
    const dbOk = await this.checkDb();
    return {
      status: dbOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      components: {
        database: dbOk ? 'up' : 'down',
      },
    };
  }

  private async checkDb(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
