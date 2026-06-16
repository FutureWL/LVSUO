import { ForbiddenException } from '@nestjs/common';
import { DataLevel } from '@lm-unity/shared';
import { ConversationService } from './conversation.service';
import { makePrismaMock } from '../../common/test/prisma-mock';

/**
 * ConversationService 单测
 *  - sendMessage: L6 守卫(任务书 5.2.1): L6 数据 AI 不可读 → ForbiddenException
 *  - sendMessage: 非 L6 → 写 message
 *  - listMessages: 校验会话归属(防越租户)
 */

describe('ConversationService', () => {
  let service: ConversationService;
  let prisma: any;

  beforeEach(() => {
    prisma = makePrismaMock();
    service = new ConversationService(prisma);
  });

  function setupPrisma(spec: Record<string, any> = {}) {
    prisma = makePrismaMock(spec);
    service = new ConversationService(prisma);
  }

  describe('sendMessage', () => {
    it('L6 数据(AI_RESTRICTED)→ 抛 ForbiddenException, response.code=L6_AI_RESTRICTED', async () => {
      const createFn = jest.fn();
      setupPrisma({ 'lushiMessage.create': createFn });

      try {
        await service.sendMessage({
          tenantId: 't1',
          userId: 'u1',
          conversationId: 'c1',
          content: '机密',
          contentType: 'TEXT',
          dataLevel: DataLevel.L6_AI_RESTRICTED,
        });
        // 应在上方抛错,走到这里就 fail
        expect(true).toBe(false);
      } catch (err: any) {
        // NestJS ForbiddenException(obj) → obj 变 response
        expect(err.response.code).toBe('L6_AI_RESTRICTED');
        expect(err.response.dataLevel).toBe(DataLevel.L6_AI_RESTRICTED);
      }
      expect(createFn).not.toHaveBeenCalled();
    });

    it('非 L6 → 字段映射写 message', async () => {
      const createFn = jest.fn().mockResolvedValue({ id: 'm1' });
      setupPrisma({ 'lushiMessage.create': createFn });

      await service.sendMessage({
        tenantId: 't1',
        userId: 'u1',
        conversationId: 'c1',
        content: '你好',
        contentType: 'TEXT',
        dataLevel: DataLevel.L3_MATTER_TEAM,
      });

      expect(createFn).toHaveBeenCalledWith({
        data: expect.objectContaining({
          conversationId: 'c1',
          senderType: 'USER',
          senderId: 'u1',
          contentType: 'TEXT',
          content: '你好',
          visibility: DataLevel.L3_MATTER_TEAM,
          aiGenerated: false,
          lawyerApproved: false,
        }),
      });
    });
  });

  describe('listMessages', () => {
    it('会话存在 → 返消息列表', async () => {
      const findFirstFn = jest.fn().mockResolvedValue({ id: 'c1', tenantId: 't1' });
      const findManyFn = jest.fn().mockResolvedValue([{ id: 'm1' }]);
      setupPrisma({
        'lushiConversation.findFirst': findFirstFn,
        'lushiMessage.findMany': findManyFn,
      });

      const res = await service.listMessages('t1', 'c1');
      expect(res).toEqual([{ id: 'm1' }]);
      expect(findManyFn).toHaveBeenCalledWith({
        where: { conversationId: 'c1' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('会话不存在或越租户 → 抛 Forbidden', async () => {
      const findManyFn = jest.fn();
      setupPrisma({
        'lushiConversation.findFirst': jest.fn().mockResolvedValue(null),
        'lushiMessage.findMany': findManyFn,
      });

      await expect(service.listMessages('t1', 'c99')).rejects.toThrow(ForbiddenException);
      expect(findManyFn).not.toHaveBeenCalled();
    });
  });
});
