import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './document.entity';
import { Subject } from 'src/subjects/subject.entity';
import { DocumentVersion } from './document-version.entity';
import { StorageService } from './storage.service';
import { ChunkingService } from './chunking.service';
import { DocumentChunk } from './document-chunk.entity';
import { AiModule } from 'src/ai/ai.module';
import { RagModule } from 'src/rag/rag.module';
import { EmbeddingsModule } from 'src/embeddings/embeddings.module';
import { Flashcard } from './flashcard.entity';
import { Quiz } from './quiz.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Document,
      Subject,
      DocumentVersion,
      DocumentChunk,
      Flashcard, Quiz,
    ]),
    RagModule,
    EmbeddingsModule,
    AiModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, StorageService, ChunkingService],
})
export class DocumentsModule {}
