import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Lead, LeadStatus, CreateLeadInput, TriageResult, type PageResponse } from '@lm-unity/shared';
import { buildPage } from '../../common/pagination';

@Injectable()
export class LeadService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(tenantId: string, input: Omit<CreateLeadInput, 'tenantId'>) {
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

  async findByTenant(tenantId: string, page = 1, pageSize = 20, keyword?: string): Promise<PageResponse<Lead>> {
    const trimmed = keyword?.trim();
    const where = {
      tenantId,
      ...(trimmed
        ? {
            OR: [
              { clientName: { contains: trimmed, mode: 'insensitive' as const } },
              { contactMobile: { contains: trimmed, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.lead.count({ where }),
    ]);
    return buildPage(items as unknown as Lead[], total, page, pageSize);
  }

  async findOne(tenantId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId },
      include: {
        triages: { orderBy: { createdAt: 'desc' }, take: 1 },
        assignedLawyer: { select: { id: true, realName: true, roleType: true } },
      },
    });
    if (!lead) throw new NotFoundException('线索不存在');
    return lead;
  }

  async assignLawyer(tenantId: string, leadId: string, lawyerId: string) {
    await this.findOne(tenantId, leadId);
    return this.prisma.lead.update({
      where: { id: leadId },
      data: {
        assignedLawyerId: lawyerId,
        intakeStatus: LeadStatus.LAWYER_REVIEW_REQUIRED,
      },
    });
  }

  async triage(
    tenantId: string,
    leadId: string,
    input: {
      factsSummary?: string;
      evidenceSummary?: string;
      urgencyReason?: string;
      triageResult: TriageResult;
      recommendedProductId?: string;
      shouldTransferToLawyer: boolean;
      aiGenerated?: boolean;
      confirmedBy?: string;
    },
  ) {
    const lead = await this.findOne(tenantId, leadId);
    if (lead.intakeStatus === LeadStatus.CONVERTED_TO_MATTER || lead.intakeStatus === LeadStatus.CLOSED_LOST) {
      throw new BadRequestException('当前线索状态不允许分诊');
    }

    await this.prisma.$transaction([
      this.prisma.intakeTriage.create({
        data: {
          tenantId,
          leadId,
          factsSummary: input.factsSummary,
          evidenceSummary: input.evidenceSummary,
          urgencyReason: input.urgencyReason,
          triageResult: input.triageResult,
          recommendedProductId: input.recommendedProductId,
          shouldTransferToLawyer: input.shouldTransferToLawyer,
          aiGenerated: input.aiGenerated ?? false,
          lawyerConfirmed: !!input.confirmedBy,
          confirmedBy: input.confirmedBy,
        },
      }),
      this.prisma.lead.update({
        where: { id: leadId },
        data: {
          recommendedProductId: input.recommendedProductId,
          intakeStatus: input.shouldTransferToLawyer
            ? LeadStatus.LAWYER_REVIEW_REQUIRED
            : LeadStatus.TRIAGED,
        },
      }),
    ]);

    return this.findOne(tenantId, leadId);
  }
}
