import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class EmbeddingsService {
  private readonly ai: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    this.ai = new GoogleGenAI({
      apiKey: this.configService.getOrThrow<string>('GEMINI_API_KEY'),
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text,
      config: {
        outputDimensionality: 768,
      },
    });

    const embedding = response.embeddings?.[0]?.values;

    if (!embedding) {
      throw new Error('Failed to generate embedding');
    }

    return embedding;
  }
}
