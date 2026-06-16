import { LushiRole, DataLevel } from '../enums/index.js';

export type ConversationChannel = 'WEB' | 'IM' | 'VOICE' | 'VIDEO' | 'APP';

export interface LushiConversation {
  id: string;
  tenantId: string;
  userId: string;
  clientId?: string;
  leadId?: string;
  matterId?: string;
  conversationType: LushiRole;
  channel: ConversationChannel;
  startedAt: Date;
  endedAt?: Date;
  summary?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: Date;
}

export interface LushiMessage {
  id: string;
  conversationId: string;
  senderType: 'USER' | 'LUSHI' | 'LAWYER';
  senderId: string;
  contentType: 'TEXT' | 'VOICE' | 'IMAGE' | 'FILE';
  content: string;
  audioFileId?: string;
  visibility: DataLevel;
  aiGenerated: boolean;
  lawyerApproved: boolean;
  createdAt: Date;
}
