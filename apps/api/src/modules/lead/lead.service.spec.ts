import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { LeadStatus, TriageResult } from '@lm-unity/shared';
import { LeadService } from './lead.service';

/**
 * lead.service 单测 —— 三个核心方法:
 *  - findOne(tenantId, id): 越租户查询 / 找不到
 *  - assignLawyer(tenantId, leadId, lawyerId): 推进到 LAWYER_REVIEW_REQUIRED
 *  - triage(tenantId, leadId, input): 状态机检查 + $transaction 写入
 *
 * Mock 策略:PrismaClient 用 jest.fn() 替身,只暴露 service 实际用到的方法
 *  - $transaction 捕获 ops 数组(供 spy 校验),resolve mock 结果
 *  - 不连真实数据库
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

function makePrisma(
  opts: {
    lead?: any | null;
    /** $transaction 模拟 resolve 的结果;默认 [triage 行, lead 行] */
    transactionResult?: any[];
  } = {},
) {
  // opts.lead: undefined → 用默认; null → 模拟查不到
  // 用 'currentLead' 作为可变状态,lead.update 会真正修改它
  // 这样 triage() 内部的 'return this.findOne(...)' 第二次会拿到更新后的值
  const currentLead = opts.lead === undefined ? makeLeadRow() : opts.lead;

  const intakeTriageCreate = jest
    .fn()
    .mockImplementation(({ data }) => Promise.resolve({ id: 'triage-1', ...data }));
  const leadUpdate = jest.fn().mockImplementation(({ data }) => {
    Object.assign(currentLead, data); // 真正变更
    return Promise.resolve(currentLead);
  });
  const leadFindFirst = jest.fn().mockImplementation(() => Promise.resolve(currentLead));

  // $transaction 接收 ops 数组,resolve 模拟结果(不真跑 ops)
  const transactionResult = opts.transactionResult ?? [
    { id: 'triage-1', tenantId: TENANT_ID, leadId: LEAD_ID },
    { ...currentLead },
  ];
  const transaction = jest.fn().mockImplementation(() => Promise.resolve(transactionResult));

  return {
    $transaction: transaction,
    lead: {
      findFirst: leadFindFirst,
      update: leadUpdate,
    },
    intakeTriage: {
      create: intakeTriageCreate,
    },
  } as unknown as PrismaClient;
}

function makeService(prisma: PrismaClient) {
  return new LeadService(prisma);
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
    const prisma = makePrisma({ lead: null });
    await expect(makeService(prisma).findOne(TENANT_ID, LEAD_ID)).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('LeadService.assignLawyer', () => {
  it('找到 lead → update 为 LAWYER_REVIEW_REQUIRED + 设律师', async () => {
    const prisma = makePrisma({ lead: makeLeadRow() });
    const result = await makeService(prisma).assignLawyer(TENANT_ID, LEAD_ID, LAWYER_ID);
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
    const prisma = makePrisma({ lead: null });
    await expect(makeService(prisma).assignLawyer(TENANT_ID, LEAD_ID, LAWYER_ID)).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('LeadService.triage', () => {
  it('happy path: shouldTransferToLawyer=true → 状态 LAWYER_REVIEW_REQUIRED', async () => {
    const prisma = makePrisma();
    const result = await makeService(prisma).triage(TENANT_ID, LEAD_ID, validTriageInput);
    expect(result.intakeStatus).toBe(LeadStatus.LAWYER_REVIEW_REQUIRED);
  });

  it('happy path: shouldTransferToLawyer=false → 状态 TRIAGED', async () => {
    const prisma = makePrisma();
    const result = await makeService(prisma).triage(TENANT_ID, LEAD_ID, {
      ...validTriageInput,
      shouldTransferToLawyer: false,
    });
    expect(result.intakeStatus).toBe(LeadStatus.TRIAGED);
  });

  it('写入 intakeTriage 字段映射正确(aiGenerated / lawyerConfirmed / confirmedBy)', async () => {
    const prisma = makePrisma();
    await makeService(prisma).triage(TENANT_ID, LEAD_ID, validTriageInput);
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
    const prisma = makePrisma();
    await makeService(prisma).triage(TENANT_ID, LEAD_ID, {
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
    const prisma = makePrisma({
      lead: makeLeadRow({ intakeStatus: LeadStatus.CONVERTED_TO_MATTER }),
    });
    await expect(makeService(prisma).triage(TENANT_ID, LEAD_ID, validTriageInput)).rejects.toThrow(
      BadRequestException,
    );
    // 不能进 transaction
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('lead.intakeStatus === CLOSED_LOST → BadRequest', async () => {
    const prisma = makePrisma({
      lead: makeLeadRow({ intakeStatus: LeadStatus.CLOSED_LOST }),
    });
    await expect(makeService(prisma).triage(TENANT_ID, LEAD_ID, validTriageInput)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('lead 不存在 → NotFoundException(不进入 transaction)', async () => {
    const prisma = makePrisma({ lead: null });
    await expect(makeService(prisma).triage(TENANT_ID, LEAD_ID, validTriageInput)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('transaction 包含 create + update 两步', async () => {
    const prisma = makePrisma();
    await makeService(prisma).triage(TENANT_ID, LEAD_ID, validTriageInput);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const ops = (prisma.$transaction as jest.Mock).mock.calls[0][0];
    expect(Array.isArray(ops)).toBe(true);
    expect(ops).toHaveLength(2);
    // ops[0] 是 intakeTriage.create 的 pending promise
    // ops[1] 是 lead.update 的 pending promise
  });
});
