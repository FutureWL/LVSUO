import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Lead, LeadStatus, CreateLeadInput } from '@lm-unity/shared';

@Injectable()
export class LeadService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tenantId: string, input: CreateLeadInput) {
    return this.prisma.lead.create({
      data: {
        tenantId,
        sourceChannel: input.sourceChannel,
        clientName: input.clientName,
        contactMobile: input.contactMobile,
        contactEmail: input.contactEmail,
        legalIssueType: input.legalIssueType,
        urgencyLevel: input.urgencyLevel || 'MEDIUM',
        emotionalState: 'NEUTRAL',
        intakeStatus: LeadStatus.NEW_LEAD,
      },
    });
  }

  async findByTenant(tenantId: string, page = 1, pageSize = 20) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.lead.count({ where: { tenantId } }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(tenantId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, tenantId } });
    if (!lead) throw new NotFoundException('线索不存在');
    return lead;
  }
}
