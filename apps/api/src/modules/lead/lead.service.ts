import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { Lead, LeadStatus, CreateLeadInput, TriageResult, type PageResponse, type UrgencyLevel } from '@lm-unity/shared';
import { buildPage } from '../../common/pagination';

export interface LeadListFilters {
  keyword?: string;
  status?: LeadStatus;
  urgency?: UrgencyLevel;
  /** YYYY-MM-DD 本地时区起始日期(含) */
  from?: string;
  /** YYYY-MM-DD 本地时区结束日期(含) */
  to?: string;
}

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

  async findByTenant(
    tenantId: string,
    page = 1,
    pageSize = 20,
    filters: LeadListFilters = {},
  ): Promise<PageResponse<Lead>> {
    const where: Prisma.LeadWhereInput = { tenantId };

    const trimmed = filters.keyword?.trim();
    if (trimmed) {
      where.OR = [
        { clientName: { contains: trimmed, mode: 'insensitive' } },
        { contactMobile: { contains: trimmed, mode: 'insensitive' } },
      ];
    }
    if (filters.status) where.intakeStatus = filters.status;
    if (filters.urgency) where.urgencyLevel = filters.urgency;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(`${filters.from}T00:00:00`);
      if (filters.to) {
        // end-of-day 本地时区
        const end = new Date(`${filters.to}T23:59:59.999`);
        where.createdAt.lte = end;
      }
    }

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
