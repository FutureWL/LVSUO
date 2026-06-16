import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LeadStatus, TriageResult } from '@lm-unity/shared';
import { LeadService } from './lead.service';
import { makePrismaMock } from '../../common/test/prisma-mock';

/**
 * lead.service 单测 —— 三个核心方法:
 *  - findOne(tenantId, id): 越租户查询 / 找不到
 *  - assignLawyer(tenantId, leadId, lawyerId): 推进到 LAWYER_REVIEW_REQUIRED
 *  - triage(tenantId, leadId, input): 状态机检查 + $transaction 写入
 *
 * Mock:makePrismaMock({ 'lead.findFirst': leadRow, 'lead.update': impl, '$transaction': [...] })
 *  - 'lead.findFirst' / 'lead.update' / 'intakeTriage.create' 按需声明
 *  - 'lead.update' 用 fn 形式 mockImplementation,真正变更 currentLead
 *    (triage 内部 return findOne 第二次,需要看到 update 后的状态)
 *  - '$transaction' 直接 resolve mock 结果,ops 数组中的 pending promise 不真跑
 */

const TENANT_ID = 'tenant-1';
const LEAD_ID = 'lead-1';
const LAWYER_ID = 'lawyer-1';

function makeLeadRow(overrides: Partial<any> = {}) {
  return {
    id: LEAD_ID,
    tenantId: TENANT_ID,
    clientName: '张三',
    intakeStatus: LeadStatus.NEW_LEAD,
    triages: [],
    assignedLawyer: null,
    ...overrides,
  };
}

function makeServiceWithLead(leadOverride: any | null | undefined = undefined) {
  // undefined → 用默认;null → 模拟查不到
  const lead = leadOverride === undefined ? makeLeadRow() : leadOverride;
  // lead.update 要真改 lead(可变),这样 triage 第二次 findOne 拿更新值
  const leadUpdateFn = ({ data }: any) => {
    Object.assign(lead, data);
    return lead;
  };
  const prisma = makePrismaMock({
    'lead.findFirst': lead,
    'lead.update': leadUpdateFn,
    'intakeTriage.create': { id: 'triage-1', tenantId: TENANT_ID, leadId: LEAD_ID },
    // $transaction 接受 ops 数组,返回 mock 结果(不真跑 ops)
    $transaction: [{ id: 'triage-1', tenantId: TENANT_ID, leadId: LEAD_ID }, { ...lead }],
  });
  return { service: new LeadService(prisma), prisma };
}

const validTriageInput = {
  factsSummary: '当事人 2026 年 1 月签订合同',
  evidenceSummary: '合同原件 1 份',
  urgencyReason: '临近诉讼时效',
  triageResult: TriageResult.LITIGATION_RECOMMENDED,
  recommendedProductId: 'product-1',
  shouldTransferToLawyer: true,
  aiGenerated: false,
  confirmedBy: 'user-1',
};

describe('LeadService.findOne', () => {
  it('找不到 → NotFoundException', async () => {
    const { service } = makeServiceWithLead(null);
    await expect(service.findOne(TENANT_ID, LEAD_ID)).rejects.toThrow(NotFoundException);
  });
});

describe('LeadService.assignLawyer', () => {
  it('找到 lead → update 为 LAWYER_REVIEW_REQUIRED + 设律师', async () => {
    const { service, prisma } = makeServiceWithLead();
    const result = await service.assignLawyer(TENANT_ID, LEAD_ID, LAWYER_ID);
    expect(prisma.lead.update).toHaveBeenCalledWith({
      where: { id: LEAD_ID },
      data: {
        assignedLawyerId: LAWYER_ID,
        intakeStatus: LeadStatus.LAWYER_REVIEW_REQUIRED,
      },
    });
    expect(result.intakeStatus).toBe(LeadStatus.LAWYER_REVIEW_REQUIRED);
  });

  it('lead 不存在 → NotFoundException', async () => {
    const { service } = makeServiceWithLead(null);
    await expect(service.assignLawyer(TENANT_ID, LEAD_ID, LAWYER_ID)).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('LeadService.triage', () => {
  it('happy path: shouldTransferToLawyer=true → 状态 LAWYER_REVIEW_REQUIRED', async () => {
    const { service } = makeServiceWithLead();
    const result = await service.triage(TENANT_ID, LEAD_ID, validTriageInput);
    expect(result.intakeStatus).toBe(LeadStatus.LAWYER_REVIEW_REQUIRED);
  });

  it('happy path: shouldTransferToLawyer=false → 状态 TRIAGED', async () => {
    const { service } = makeServiceWithLead();
    const result = await service.triage(TENANT_ID, LEAD_ID, {
      ...validTriageInput,
      shouldTransferToLawyer: false,
    });
    expect(result.intakeStatus).toBe(LeadStatus.TRIAGED);
  });

  it('写入 intakeTriage 字段映射正确(aiGenerated / lawyerConfirmed / confirmedBy)', async () => {
    const { service, prisma } = makeServiceWithLead();
    await service.triage(TENANT_ID, LEAD_ID, validTriageInput);
    expect(prisma.intakeTriage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: TENANT_ID,
        leadId: LEAD_ID,
        factsSummary: validTriageInput.factsSummary,
        evidenceSummary: validTriageInput.evidenceSummary,
        urgencyReason: validTriageInput.urgencyReason,
        triageResult: TriageResult.LITIGATION_RECOMMENDED,
        recommendedProductId: validTriageInput.recommendedProductId,
        shouldTransferToLawyer: true,
        aiGenerated: false,
        lawyerConfirmed: true, // !! confirmedBy 有值 → true
        confirmedBy: 'user-1',
      }),
    });
  });

  it('aiGenerated 默认 false,lawyerConfirmed 默认 false(无 confirmedBy)', async () => {
    const { service, prisma } = makeServiceWithLead();
    await service.triage(TENANT_ID, LEAD_ID, {
      ...validTriageInput,
      aiGenerated: undefined,
      confirmedBy: undefined,
    });
    expect(prisma.intakeTriage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        aiGenerated: false,
        lawyerConfirmed: false,
        confirmedBy: undefined,
      }),
    });
  });

  it('lead.intakeStatus === CONVERTED_TO_MATTER → BadRequest', async () => {
    const { service, prisma } = makeServiceWithLead(
      makeLeadRow({ intakeStatus: LeadStatus.CONVERTED_TO_MATTER }),
    );
    await expect(service.triage(TENANT_ID, LEAD_ID, validTriageInput)).rejects.toThrow(
      BadRequestException,
    );
    // 不能进 transaction
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('lead.intakeStatus === CLOSED_LOST → BadRequest', async () => {
    const { service, prisma } = makeServiceWithLead(
      makeLeadRow({ intakeStatus: LeadStatus.CLOSED_LOST }),
    );
    await expect(service.triage(TENANT_ID, LEAD_ID, validTriageInput)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('lead 不存在 → NotFoundException(不进入 transaction)', async () => {
    const { service, prisma } = makeServiceWithLead(null);
    await expect(service.triage(TENANT_ID, LEAD_ID, validTriageInput)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
