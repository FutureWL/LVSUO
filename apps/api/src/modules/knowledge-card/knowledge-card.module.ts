import { Module } from '@nestjs/common';
import { KnowledgeCardController } from './knowledge-card.controller';
import { KnowledgeCardService } from './knowledge-card.service';

@Module({
  controllers: [KnowledgeCardController],
  providers: [KnowledgeCardService],
  exports: [KnowledgeCardService],
})
export class KnowledgeCardModule {}
