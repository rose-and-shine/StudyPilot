import { Injectable } from '@nestjs/common';

@Injectable()
export class AiBatchService {
  private readonly maxCharacters = 12000;

  createBatches(chunks: { chunkIndex: number; text: string }[]): string[] {
    const batches: string[] = [];
    let currentBatch = '';

    for (const chunk of chunks) {
      const chunkText = `[Chunk ${chunk.chunkIndex}]\n${chunk.text}`;

      if (
        currentBatch.length > 0 &&
        currentBatch.length + chunkText.length > this.maxCharacters
      ) {
        batches.push(currentBatch);
        currentBatch = '';
      }

      currentBatch += currentBatch.length > 0 ? `\n\n${chunkText}` : chunkText;
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }
}
