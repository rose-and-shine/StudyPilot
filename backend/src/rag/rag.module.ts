import { Module } from '@nestjs/common';

import { RagService } from './rag.service';
import { EmbeddingsModule } from 'src/embeddings/embeddings.module';

@Module({
  imports: [EmbeddingsModule],

  providers: [RagService],

  exports: [RagService],
})
export class RagModule {}
