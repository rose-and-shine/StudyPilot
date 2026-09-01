import { Injectable } from '@nestjs/common';

@Injectable()
export class ChunkingService {
  private readonly chunkSize = 2000;
  private readonly overlapSize = 200;

  chunkText(text: string): string[] {
    const cleanedText = this.cleanText(text);

    if (!cleanedText) {
      return [];
    }

    const sentences = this.splitIntoSentences(cleanedText);

    const chunks: string[] = [];
    let currentSentences: string[] = [];
    let currentLength = 0;

    for (const sentence of sentences) {
      const sentenceLength = sentence.length;

      if (
        currentSentences.length > 0 &&
        currentLength + sentenceLength > this.chunkSize
      ) {
        const chunk = currentSentences.join(' ').trim();

        if (chunk) {
          chunks.push(chunk);
        }

        const overlapSentences: string[] = [];
        let overlapLength = 0;

        for (let i = currentSentences.length - 1; i >= 0; i--) {
          const previousSentence = currentSentences[i];

          if (overlapLength + previousSentence.length > this.overlapSize) {
            break;
          }

          overlapSentences.unshift(previousSentence);
          overlapLength += previousSentence.length;
        }

        currentSentences = overlapSentences;
        currentLength = overlapLength;
      }

      currentSentences.push(sentence);
      currentLength += sentenceLength;
    }

    if (currentSentences.length > 0) {
      const chunk = currentSentences.join(' ').trim();

      if (chunk) {
        chunks.push(chunk);
      }
    }

    return chunks;
  }

  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/--\s*\d+\s+of\s+\d+\s+--/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  private splitIntoSentences(text: string): string[] {
    const sentences = text.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [];

    return sentences
      .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }
}
