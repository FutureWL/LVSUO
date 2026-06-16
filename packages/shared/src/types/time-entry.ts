import { TimeEntryStatus, TimeEntrySource } from '../enums/index.js';

export interface TimeEntry {
  id: string;
  tenantId: string;
  matterId?: string;
  clientId?: string;
  userId: string;
  taskId?: string;
  startTime: Date;
  endTime?: Date;
  durationMinutes?: number;
  workType?: string;
  billable: boolean;
  billingRate?: number;
  internalDescription?: string;
  clientDescription?: string;
  source: TimeEntrySource;
  status: TimeEntryStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
