import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class KnowledgeCardService {
  constructor(private readonly prisma: PrismaClient) {}

  async findByTenant(tenantId: string, cardType?: string) {
    return this.prisma.knowledgeCard.findMany({
      where: {
        tenantId,
        ...(cardType ? { cardType } : {}),
        reviewStatus: 'APPROVED',
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
