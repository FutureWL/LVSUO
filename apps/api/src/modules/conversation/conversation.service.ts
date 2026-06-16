import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LushiRole, DataLevel, aiProcessable, LushiMessage, LushiConversation } from '@lm-unity/shared';

@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 律时 5 角色之一的消息接入
   * L6 守卫(任务书 5.2.1):L6 数据 AI 不可读
   */
  async sendMessage(input: {
    tenantId: string;
    userId: string;
    conversationId: string;
    content: string;
    contentType: 'TEXT' | 'VOICE' | 'IMAGE' | 'FILE';
    dataLevel: DataLevel;
  }): Promise<LushiMessage> {
    // L6 守卫
    if (!aiProcessable(input.dataLevel)) {
      throw new ForbiddenException({
        code: 'L6_AI_RESTRICTED',
        message: 'L6 数据不得进入 AI 处理(任务书 5.2.1)',
        dataLevel: input.dataLevel,
      });
    }

    return this.prisma.lushiMessage.create({
      data: {
        conversationId: input.conversationId,
        senderType: 'USER',
        senderId: input.userId,
        contentType: input.contentType,
        content: input.content,
        visibility: input.dataLevel,
        aiGenerated: false,
        lawyerApproved: false,
      },
    }) as unknown as LushiMessage;
  }

  async listMessages(tenantId: string, conversationId: string) {
    // 校验会话归属
    const conv = await this.prisma.lushiConversation.findFirst({
      where: { id: conversationId, tenantId },
    });
    if (!conv) throw new ForbiddenException('会话不存在或越租户');
    return this.prisma.lushiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
