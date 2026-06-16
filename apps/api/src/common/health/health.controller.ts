import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { PrismaClient } from '@prisma/client';
import { Inject } from '@nestjs/common';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(PrismaClient) private readonly prisma: PrismaClient) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '健康检查' })
  async check() {
    const dbOk = await this.checkDb();
    return {
      status: 'ok',
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
