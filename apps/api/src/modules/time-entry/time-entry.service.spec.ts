import { TimeEntrySource, TimeEntryStatus } from '@lm-unity/shared';
import { TimeEntryService } from './time-entry.service';
import { makePrismaMock } from '../../common/test/prisma-mock';

/**
 * TimeEntryService 单测
 *  - startTimer: 创建 RUNNING 状态, 字段映射
 *  - stopTimer: 计算 durationMinutes, 改 DRAFT
 *  - stopTimer: 找不到 entry → 返回 null
 */

describe('TimeEntryService', () => {
  let service: TimeEntryService;
  let prisma: any;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new TimeEntryService(prisma);
  });

  function setupPrisma(spec: Record<string, any> = {}) {
    prisma = makePrismaMock(spec);
    service = new TimeEntryService(prisma);
  }

  describe('startTimer', () => {
    it('创建 RUNNING 计时,字段映射(source=LUSHI_VOICE, billable=true)', async () => {
      const createFn = jest.fn().mockResolvedValue({ id: 't1' });
      setupPrisma({ 'timeEntry.create': createFn });

      await service.startTimer('t1', 'u1', 'm1');

      expect(createFn).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 't1',
          userId: 'u1',
          matterId: 'm1',
          source: TimeEntrySource.LUSHI_VOICE,
          status: TimeEntryStatus.RUNNING,
          billable: true,
        }),
      });
      // startTime 应该是 Date 实例
      const call = createFn.mock.calls[0]![0] as any;
      expect(call.data.startTime).toBeInstanceOf(Date);
    });

    it('不传 matterId → matterId undefined', async () => {
      const createFn = jest.fn().mockResolvedValue({ id: 't1' });
      setupPrisma({ 'timeEntry.create': createFn });

      await service.startTimer('t1', 'u1');

      const call = createFn.mock.calls[0]![0] as any;
      expect(call.data.matterId).toBeUndefined();
    });
  });

  describe('stopTimer', () => {
    it('找到 entry → 计算 durationMinutes, 改 DRAFT', async () => {
      // startTime 设 30 分钟前
      const startTime = new Date(Date.now() - 30 * 60 * 1000);
      const findUniqueFn = jest.fn().mockResolvedValue({
        id: 't1',
        startTime,
      });
      const updateFn = jest.fn().mockResolvedValue({ id: 't1', durationMinutes: 30 });
      setupPrisma({
        'timeEntry.findUnique': findUniqueFn,
        'timeEntry.update': updateFn,
      });

      const res = await service.stopTimer('t1');
      expect(res).toEqual({ id: 't1', durationMinutes: 30 });
      // durationMinutes 应该在 30 附近(允许 1 分钟误差)
      const call = updateFn.mock.calls[0]![0] as any;
      expect(call.data.durationMinutes).toBeGreaterThanOrEqual(29);
      expect(call.data.durationMinutes).toBeLessThanOrEqual(31);
      expect(call.data.status).toBe(TimeEntryStatus.DRAFT);
      expect(call.data.endTime).toBeInstanceOf(Date);
    });

    it('找不到 entry → 返回 null, 不调 update', async () => {
      const updateFn = jest.fn();
      setupPrisma({
        'timeEntry.findUnique': jest.fn().mockResolvedValue(null),
        'timeEntry.update': updateFn,
      });

      const res = await service.stopTimer('t99');
      expect(res).toBeNull();
      expect(updateFn).not.toHaveBeenCalled();
    });
  });
});
