import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TimeEntryStatus, TimeEntrySource, TimeEntry } from '@lm-unity/shared';

@Injectable()
export class TimeEntryService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 任务书 12.3 / 15.x 律时语音计时
   */
  async startTimer(tenantId: string, userId: string, matterId?: string) {
    return this.prisma.timeEntry.create({
      data: {
        tenantId,
        userId,
        matterId,
        startTime: new Date(),
        source: TimeEntrySource.LUSHI_VOICE,
        status: TimeEntryStatus.RUNNING,
        billable: true,
      },
    });
  }

  async stopTimer(id: string) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) return null;
    const end = new Date();
    const minutes = Math.round((end.getTime() - entry.startTime.getTime()) / 60000);
    return this.prisma.timeEntry.update({
      where: { id },
      data: {
        endTime: end,
        durationMinutes: minutes,
        status: TimeEntryStatus.DRAFT,
      },
    });
  }
}
