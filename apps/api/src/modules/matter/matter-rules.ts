import { BadRequestException } from '@nestjs/common';
import { MATTER_STATUS_TRANSITIONS, MatterStatus } from '@lm-unity/shared';

/**
 * 校验案件状态流转是否合法
 * 任务书 6.4 案件办理 24 状态机,合法流转定义在 MATTER_STATUS_TRANSITIONS
 *
 * 不合法时抛 BadRequestException,带 友好 message 供前端展示
 */
export function assertValidMatterTransition(from: MatterStatus, to: MatterStatus): void {
  const allowed = MATTER_STATUS_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(`非法状态流转: ${from} → ${to}`);
  }
}
