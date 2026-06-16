import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Client, CreateClientInput, ClientType, LeadStatus, type PageResponse } from '@lm-unity/shared';
import { buildPage } from '../../common/pagination';

@Injectable()
export class ClientService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tenantId: string, input: Omit<CreateClientInput, 'tenantId'>) {
    return this.prisma.client.create({
      data: {
        tenantId,
        clientName: input.clientName,
        clientType: input.clientType as any,
        creditCode: input.creditCode,
        industry: input.industry,
        contactName: input.contactName,
        contactMobile: input.contactMobile,
        contactEmail: input.contactEmail,
      },
    }) as unknown as Client;
  }

  async findByTenant(tenantId: string, page = 1, pageSize = 20): Promise<PageResponse<Client>> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.client.count({ where: { tenantId } }),
    ]);
    return buildPage(items as unknown as Client[], total, page, pageSize);
  }

  async findOne(tenantId: string, id: string) {
    const client = await this.prisma.client.findFirst({ where: { id, tenantId } });
    if (!client) throw new NotFoundException('客户不存在');
    return client as unknown as Client;
  }

  async update(
    tenantId: string,
    id: string,
    input: Partial<Omit<CreateClientInput, 'tenantId'>>,
  ) {
    await this.findOne(tenantId, id);
    return this.prisma.client.update({
      where: { id },
      data: {
        clientName: input.clientName,
        clientType: input.clientType as any,
        creditCode: input.creditCode,
        industry: input.industry,
        contactName: input.contactName,
        contactMobile: input.contactMobile,
        contactEmail: input.contactEmail,
      },
    }) as unknown as Client;
  }

  /**
   * 从线索转为客户:创建客户并把线索状态推进到 CONVERTED_TO_MATTER
   */
  async convertFromLead(tenantId: string, leadId: string, extra?: Partial<Omit<CreateClientInput, 'tenantId'>>) {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) throw new NotFoundException('线索不存在');

    const clientType: ClientType = extra?.clientType || 'INDIVIDUAL';

    const client = await this.prisma.client.create({
      data: {
        tenantId,
        clientName: extra?.clientName || lead.clientName,
        clientType: clientType as any,
        creditCode: extra?.creditCode,
        industry: extra?.industry,
        contactName: extra?.contactName || lead.clientName,
        contactMobile: extra?.contactMobile || lead.contactMobile,
        contactEmail: extra?.contactEmail || lead.contactEmail,
      },
    });

    await this.prisma.lead.update({
      where: { id: leadId },
      data: { intakeStatus: LeadStatus.CONVERTED_TO_MATTER },
    });

    return client as unknown as Client;
  }
}
