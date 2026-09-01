import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { Document } from 'src/documents/document.entity';
import { DocumentVersion } from 'src/documents/document-version.entity';
import { DocumentChunk } from 'src/documents/document-chunk.entity';
import { EmbeddingsService } from 'src/embeddings/embeddings.service';

@Injectable()
export class RagService {
  private readonly MIN_SIMILARITY = 0.6;
  private readonly TOP_K = 5;

  constructor(
    private readonly dataSource: DataSource,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  async retrieveRelevantChunks(document: Document, question: string) {
    // Get latest version of the document
    const documentVersionRepository =
      this.dataSource.getRepository(DocumentVersion);

    const latestVersion = await documentVersionRepository.findOne({
      where: {
        document: {
          id: document.id,
        },
      },
      order: {
        version: 'DESC',
      },
    });

    if (!latestVersion) {
      throw new NotFoundException('No uploaded file found for this document');
    }

    // Generate embedding for the question
    const queryEmbedding =
      await this.embeddingsService.generateEmbedding(question);

    const embeddingString = `[${queryEmbedding.join(',')}]`;

    // Search using pgvector
    const results = await this.dataSource
      .getRepository(DocumentChunk)
      .createQueryBuilder('chunk')
      .where('chunk.documentVersion = :versionId', {
        versionId: latestVersion.id,
      })
      .andWhere('chunk.embedding IS NOT NULL')
      .addSelect('chunk.embedding <=> CAST(:embedding AS vector)', 'distance')
      .setParameter('embedding', embeddingString)
      .orderBy('distance', 'ASC')
      .limit(this.TOP_K)
      .getRawAndEntities();

    // Convert distance → similarity
    const retrievedResults = results.entities.map((chunk, index) => ({
      chunk,
      similarity: 1 - Number(results.raw[index].distance),
    }));

    // Apply similarity threshold
    return retrievedResults.filter(
      (result) => result.similarity >= this.MIN_SIMILARITY,
    );
  }
}
