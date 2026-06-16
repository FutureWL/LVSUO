import { Module } from '@nestjs/common';
import { MatterController } from './matter.controller';
import { MatterService } from './matter.service';

@Module({
  controllers: [MatterController],
  providers: [MatterService],
  exports: [MatterService],
})
export class MatterModule {}
