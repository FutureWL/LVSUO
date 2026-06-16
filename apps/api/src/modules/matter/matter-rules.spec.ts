import { BadRequestException } from '@nestjs/common';
import { MATTER_STATUS_TRANSITIONS, MatterStatus } from '@lm-unity/shared';
import { assertValidMatterTransition } from './matter-rules';

function expectThrow(from: MatterStatus, to: MatterStatus) {
  expect(() => assertValidMatterTransition(from, to)).toThrow(BadRequestException);
}

function expectOk(from: MatterStatus, to: MatterStatus) {
  expect(() => assertValidMatterTransition(from, to)).not.toThrow();
}

describe('assertValidMatterTransition', () => {
  it('合法流转不抛', () => {
    // MATERIAL_COLLECTION → FACT_RECONSTRUCTION 是定义好的合法流转
    expectOk(MatterStatus.MATERIAL_COLLECTION, MatterStatus.FACT_RECONSTRUCTION);
  });

  it('任意状态都能流转到 CLOSING(分流),例 LEAD → CLOSING', () => {
    expectOk(MatterStatus.LEAD, MatterStatus.CLOSING);
  });

  it('COMPLETED 是终态,不能继续流转', () => {
    expectThrow(MatterStatus.COMPLETED, MatterStatus.ARCHIVING);
    expectThrow(MatterStatus.COMPLETED, MatterStatus.CLOSING);
  });

  it('不能跳级:MATERIAL_COLLECTION 直接到 STRATEGY_PLANNING 抛错', () => {
    expectThrow(MatterStatus.MATERIAL_COLLECTION, MatterStatus.STRATEGY_PLANNING);
  });

  it('不能倒退:EVIDENCE_ANALYSIS → MATERIAL_COLLECTION 抛错', () => {
    expectThrow(MatterStatus.EVIDENCE_ANALYSIS, MatterStatus.MATERIAL_COLLECTION);
  });

  it('MATTER_OPENED 只能去 MATERIAL_COLLECTION(不能直接跳到 ARCHIVING)', () => {
    expectOk(MatterStatus.MATTER_OPENED, MatterStatus.MATERIAL_COLLECTION);
    expectThrow(MatterStatus.MATTER_OPENED, MatterStatus.ARCHIVING);
  });

  it('CLOSING 只能去 ARCHIVING', () => {
    expectOk(MatterStatus.CLOSING, MatterStatus.ARCHIVING);
    expectThrow(MatterStatus.CLOSING, MatterStatus.MATTER_OPENED);
  });

  it('非法 message 含 from / to 便于排查', () => {
    try {
      assertValidMatterTransition(MatterStatus.LEAD, MatterStatus.ARCHIVING);
      throw new Error('should throw');
    } catch (e) {
      expect((e as Error).message).toContain(MatterStatus.LEAD);
      expect((e as Error).message).toContain(MatterStatus.ARCHIVING);
    }
  });

  it('MATTER_STATUS_TRANSITIONS 本身自洽(每个 from 的 allowed 至少 1 个或终态)', () => {
    // 这条保护 shared 常量本身没被改坏
    for (const [from, allowed] of Object.entries(MATTER_STATUS_TRANSITIONS)) {
      expect(Array.isArray(allowed)).toBe(true);
      if (from !== MatterStatus.COMPLETED) {
        // 非终态必须有至少一个后续
        expect(allowed.length).toBeGreaterThan(0);
      }
    }
  });
});
