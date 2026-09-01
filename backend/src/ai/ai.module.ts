import { Module } from '@nestjs/common';

import { AiService } from './ai.service';
import { AiBatchService } from './ai-batch.service';

@Module({
  providers: [AiService, AiBatchService],
  exports: [AiService, AiBatchService],
})
export class AiModule {}
