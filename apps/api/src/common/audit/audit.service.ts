import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { DataLevel, DATA_LEVEL_RANK } from '@lm-unity/shared';

export interface AuditEntry {
  tenantId: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  dataLevel?: DataLevel;
  ip?: string;
  userAgent?: string;
  input?: unknown;
  output?: unknown;
  result?: 'SUCCESS' | 'FAILURE';
  traceId?: string;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuditService.name);
  }

  async record(entry: AuditEntry): Promise<void> {
    // L4 及以上告警
    if (entry.dataLevel && DATA_LEVEL_RANK[entry.dataLevel] >= DATA_LEVEL_RANK[DataLevel.L4_CLIENT_CONFIDENTIAL]) {
      this.logger.warn(
        { action: entry.action, dataLevel: entry.dataLevel, tenantId: entry.tenantId },
        '⚠️  敏感数据访问(L4+)',
      );
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        dataLevel: entry.dataLevel,
        ip: entry.ip,
        userAgent: entry.userAgent,
        input: (entry.input as any) ?? undefined,
        output: (entry.output as any) ?? undefined,
        result: entry.result || 'SUCCESS',
        traceId: entry.traceId,
      },
    });
  }
}
