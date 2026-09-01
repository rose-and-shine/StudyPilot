import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

import { Document } from './document.entity';
import { Subject } from 'src/subjects/subject.entity';
import { User } from 'src/users/user.entity';
import { Flashcard } from './flashcard.entity';
import { Quiz } from './quiz.entity';
import { DocumentVersion } from './document-version.entity';
import { StorageService } from './storage.service';
import { AiBatchService } from 'src/ai/ai-batch.service';
import { PDFParse } from 'pdf-parse';

import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentChunk } from './document-chunk.entity';
import { ChunkingService } from './chunking.service';
import { RagService } from 'src/rag/rag.service';
import { AiService } from 'src/ai/ai.service';
import { EmbeddingsService } from 'src/embeddings/embeddings.service';

@Injectable()
export class DocumentsService {
  private readonly MIN_SIMILARITY = 0.6;
  private readonly TOP_K = 5;
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,

    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,

    @InjectRepository(DocumentVersion)
    private readonly documentVersionRepository: Repository<DocumentVersion>,

    @InjectRepository(DocumentChunk)
    private readonly documentChunkRepository: Repository<DocumentChunk>,

    @InjectRepository(Flashcard)
    private readonly flashcardRepository: Repository<Flashcard>,

    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,

    private readonly storageService: StorageService,
    private readonly chunkingService: ChunkingService,
    private readonly ragService: RagService,
    private readonly aiService: AiService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly aiBatchService: AiBatchService,
  ) {}

  async create(createDocumentDto: CreateDocumentDto, user: User) {
    const subject = await this.subjectRepository.findOne({
      where: {
        id: createDocumentDto.subjectId,
        user: {
          id: user.id,
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const document = this.documentRepository.create({
      title: createDocumentDto.title,
      subject,
      createdBy: user,
    });

    return this.documentRepository.save(document);
  }
  async uploadDocument(
    documentId: string,
    file: Express.Multer.File,
    user: User,
  ) {
    const document = await this.documentRepository.findOne({
      where: {
        id: documentId,
      },
      relations: {
        createdBy: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.createdBy.id !== user.id) {
      throw new NotFoundException('Document not found');
    }

    const latestVersion = await this.documentVersionRepository.findOne({
      where: {
        document: {
          id: documentId,
        },
      },
      order: {
        version: 'DESC',
      },
    });

    const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

    const storagePath = `${documentId}/v${nextVersion}.pdf`;

    // Extract text from PDF
    const parser = new PDFParse({
      data: file.buffer,
    });

    let extractedText: string;

    try {
      const result = await parser.getText();
      extractedText = result.text;
    } finally {
      await parser.destroy();
    }

    // Upload PDF to Supabase
    await this.storageService.uploadFile(
      storagePath,
      file.buffer,
      file.mimetype,
    );

    // Save document version
    const documentVersion = this.documentVersionRepository.create({
      document,
      version: nextVersion,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      storagePath,
      extractedText,
    });

    const savedVersion =
      await this.documentVersionRepository.save(documentVersion);
    const chunks = this.chunkingService.chunkText(
      savedVersion.extractedText ?? '',
    );

    const documentChunks: DocumentChunk[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const text = chunks[i];

      const embedding = await this.embeddingsService.generateEmbedding(text);

      const chunk = this.documentChunkRepository.create({
        documentVersion: savedVersion,
        chunkIndex: i,
        text,
        embedding,
      });

      documentChunks.push(chunk);
    }

    await this.documentChunkRepository.save(documentChunks);

    /*return {
      id: savedVersion.id,
      documentId: document.id,
      version: savedVersion.version,
      fileName: savedVersion.fileName,
      mimeType: savedVersion.mimeType,
      fileSize: savedVersion.fileSize,
      storagePath: savedVersion.storagePath,
      extractedText: savedVersion.extractedText,
      createdAt: savedVersion.createdAt,
    }; */
    return {
      id: savedVersion.id,
      documentId: document.id,
      version: savedVersion.version,
      fileName: savedVersion.fileName,
      mimeType: savedVersion.mimeType,
      fileSize: savedVersion.fileSize,
      storagePath: savedVersion.storagePath,
      extractedText: savedVersion.extractedText,
      chunkCount: documentChunks.length,
      chunks: documentChunks.map((chunk) => ({
        id: chunk.id,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
      })),
      createdAt: savedVersion.createdAt,
    };
  }
  async findAll(user: User) {
    const documents = await this.documentRepository.find({
      where: {
        createdBy: {
          id: user.id,
        },
      },
      relations: {
        subject: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return documents.map((document) => ({
      id: document.id,
      title: document.title,
      subject: {
        id: document.subject.id,
        name: document.subject.name,
      },
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    }));
  }
  async findOne(documentId: string, user: User) {
    const document = await this.documentRepository.findOne({
      where: {
        id: documentId,
        createdBy: {
          id: user.id,
        },
      },
      relations: {
        subject: true,
        versions: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    document.versions.sort((a, b) => b.version - a.version);

    return {
      id: document.id,
      title: document.title,
      subject: {
        id: document.subject.id,
        name: document.subject.name,
      },
      versions: document.versions.map((version) => ({
        id: version.id,
        version: version.version,
        fileName: version.fileName,
        mimeType: version.mimeType,
        fileSize: version.fileSize,
        storagePath: version.storagePath,
        createdAt: version.createdAt,
      })),
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
  async getDownloadUrl(documentId: string, user: User) {
    const document = await this.documentRepository.findOne({
      where: {
        id: documentId,
        createdBy: {
          id: user.id,
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const latestVersion = await this.documentVersionRepository.findOne({
      where: {
        document: {
          id: documentId,
        },
      },
      order: {
        version: 'DESC',
      },
    });

    if (!latestVersion) {
      throw new NotFoundException('No uploaded file found for this document');
    }

    const signedUrl = await this.storageService.createSignedUrl(
      latestVersion.storagePath,
    );

    return {
      documentId: document.id,
      version: latestVersion.version,
      fileName: latestVersion.fileName,
      url: signedUrl,
    };
  }
  async searchDocument(documentId: string, query: string, user: User) {
    const document = await this.documentRepository.findOne({
      where: {
        id: documentId,
        createdBy: {
          id: user.id,
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const results = await this.ragService.retrieveRelevantChunks(
      document,
      query,
    );

    return results.map(({ chunk, similarity }) => ({
      chunkId: chunk.id,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      similarity,
    }));
  }
  async askDocument(documentId: string, question: string, user: User) {
    const document = await this.documentRepository.findOne({
      where: {
        id: documentId,
        createdBy: {
          id: user.id,
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const results = await this.ragService.retrieveRelevantChunks(
      document,
      question,
    );

    if (results.length === 0) {
      return {
        question,
        answer: "I couldn't find the answer in the provided study material.",
        sources: [],
      };
    }

    const context = results
      .map(
        ({ chunk }, index) =>
          `[Source ${index + 1} - Chunk ${chunk.chunkIndex}]\n${chunk.text}`,
      )
      .join('\n\n');

    const answer = await this.aiService.generateAnswer(question, context);

    return {
      question,
      answer,
      sources: results.map(({ chunk, similarity }) => ({
        chunkId: chunk.id,
        chunkIndex: chunk.chunkIndex,
        similarity,
      })),
    };
  }
  async summarizeDocument(documentId: string, user: User) {
    const document = await this.documentRepository.findOne({
      where: {
        id: documentId,
        createdBy: {
          id: user.id,
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const latestVersion = await this.documentVersionRepository.findOne({
      where: {
        document: {
          id: documentId,
        },
      },
      order: {
        version: 'DESC',
      },
    });

    if (!latestVersion) {
      throw new NotFoundException('No uploaded file found for this document');
    }

    const chunks = await this.documentChunkRepository.find({
      where: {
        documentVersion: {
          id: latestVersion.id,
        },
      },
      order: {
        chunkIndex: 'ASC',
      },
    });

    if (chunks.length === 0) {
      throw new NotFoundException('No text chunks found for this document');
    }

    const batches = this.aiBatchService.createBatches(chunks);

    // Summarize each batch
    const sectionSummaries: string[] = [];

    for (const batch of batches) {
      const summary = await this.aiService.generateChunkSummary(batch);

      sectionSummaries.push(summary);
    }

    // Combine section summaries
    const finalSummary =
      sectionSummaries.length === 1
        ? sectionSummaries[0]
        : await this.aiService.generateFinalSummary(sectionSummaries);

    return {
      documentId: document.id,
      version: latestVersion.version,
      summary: finalSummary,
    };
  }
  async generateFlashcards(documentId: string, user: User) {
    // 1. Verify that the document belongs to the authenticated user
    const document = await this.documentRepository.findOne({
      where: {
        id: documentId,
        createdBy: {
          id: user.id,
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // 2. Get the latest uploaded version
    const latestVersion = await this.documentVersionRepository.findOne({
      where: {
        document: {
          id: documentId,
        },
      },
      order: {
        version: 'DESC',
      },
    });

    if (!latestVersion) {
      throw new NotFoundException('No uploaded file found for this document');
    }

    // 3. Get all text chunks for the latest version
    const chunks = await this.documentChunkRepository.find({
      where: {
        documentVersion: {
          id: latestVersion.id,
        },
      },
      order: {
        chunkIndex: 'ASC',
      },
    });

    if (chunks.length === 0) {
      throw new NotFoundException('No text chunks found for this document');
    }

    // 4. Divide chunks into batches
    const batches = this.aiBatchService.createBatches(chunks);

    console.log(`Generating flashcards for document ${documentId}`);
    console.log(`Chunks: ${chunks.length}`);
    console.log(`Batches: ${batches.length}`);

    // 5. Generate candidate flashcards from each batch
    const generatedFlashcards: {
      question: string;
      answer: string;
    }[] = [];

    for (const batch of batches) {
      const flashcards = await this.aiService.generateFlashcards(batch, 10);

      generatedFlashcards.push(...flashcards);
    }

    console.log('Generated candidate flashcards:', generatedFlashcards.length);

    // 6. Select the best flashcards and limit final result to 10
    let finalFlashcards = generatedFlashcards;

    if (generatedFlashcards.length > 10) {
      finalFlashcards = await this.aiService.selectBestFlashcards(
        generatedFlashcards,
        10,
      );
    }

    // Extra safety: never save more than 10
    finalFlashcards = finalFlashcards.slice(0, 10);

    console.log('Final flashcards:', finalFlashcards.length);

    // 7. Remove existing flashcards for this document version
    // This makes regeneration replace the old set
    await this.flashcardRepository.delete({
      documentVersion: {
        id: latestVersion.id,
      },
    });

    // 8. Convert generated flashcards into database entities
    const flashcards = finalFlashcards.map((flashcard) =>
      this.flashcardRepository.create({
        documentVersion: latestVersion,
        question: flashcard.question,
        answer: flashcard.answer,
      }),
    );

    // 9. Save final flashcards
    const savedFlashcards = await this.flashcardRepository.save(flashcards);

    // 10. Return the saved flashcards
    return {
      documentId: document.id,
      version: latestVersion.version,
      flashcards: savedFlashcards.map((flashcard) => ({
        id: flashcard.id,
        question: flashcard.question,
        answer: flashcard.answer,
      })),
    };
  }
  async getFlashcards(documentId: string, user: User) {
    const document = await this.documentRepository.findOne({
      where: {
        id: documentId,
        createdBy: {
          id: user.id,
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const latestVersion = await this.documentVersionRepository.findOne({
      where: {
        document: {
          id: documentId,
        },
      },
      order: {
        version: 'DESC',
      },
    });

    if (!latestVersion) {
      throw new NotFoundException('No uploaded file found for this document');
    }

    const flashcards = await this.flashcardRepository.find({
      where: {
        documentVersion: {
          id: latestVersion.id,
        },
      },
      order: {
        createdAt: 'ASC',
      },
    });

    return {
      documentId: document.id,
      version: latestVersion.version,
      flashcards: flashcards.map((flashcard) => ({
        id: flashcard.id,
        question: flashcard.question,
        answer: flashcard.answer,
      })),
    };
  }
  async generateQuiz(documentId: string, user: User) {
    // 1. Verify document ownership
    const document = await this.documentRepository.findOne({
      where: {
        id: documentId,
        createdBy: {
          id: user.id,
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // 2. Get latest document version
    const latestVersion = await this.documentVersionRepository.findOne({
      where: {
        document: {
          id: documentId,
        },
      },
      order: {
        version: 'DESC',
      },
    });

    if (!latestVersion) {
      throw new NotFoundException('No uploaded file found for this document');
    }

    // 3. Get chunks for latest version
    const chunks = await this.documentChunkRepository.find({
      where: {
        documentVersion: {
          id: latestVersion.id,
        },
      },
      order: {
        chunkIndex: 'ASC',
      },
    });

    if (chunks.length === 0) {
      throw new NotFoundException('No text chunks found for this document');
    }

    // 4. Create batches
    const batches = this.aiBatchService.createBatches(chunks);

    console.log(`Generating quiz for document ${documentId}`);
    console.log(`Chunks: ${chunks.length}`);
    console.log(`Batches: ${batches.length}`);

    // 5. Generate candidate questions
    const generatedQuiz: {
      question: string;
      options: string[];
      correctAnswer: string;
      explanation: string;
    }[] = [];

    for (const batch of batches) {
      const quiz = await this.aiService.generateQuiz(batch, 10);

      generatedQuiz.push(...quiz);
    }

    console.log('Generated candidate questions:', generatedQuiz.length);

    // 6. Select best questions if there are more than 10
    let finalQuiz = generatedQuiz;

    if (generatedQuiz.length > 10) {
      finalQuiz = await this.aiService.selectBestQuiz(generatedQuiz, 10);
    }

    // Extra safety: never save more than 10 questions
    finalQuiz = finalQuiz.slice(0, 10);

    console.log('Final quiz questions:', finalQuiz.length);

    // 7. Delete previous quiz for this document version
    await this.quizRepository.delete({
      documentVersion: {
        id: latestVersion.id,
      },
    });

    // 8. Create database entities
    const quizQuestions = finalQuiz.map((item) =>
      this.quizRepository.create({
        documentVersion: latestVersion,
        question: item.question,
        options: item.options,
        correctAnswer: item.correctAnswer,
        explanation: item.explanation,
      }),
    );

    // 9. Save final quiz
    const savedQuiz = await this.quizRepository.save(quizQuestions);

    // 10. Return result
    return {
      documentId: document.id,
      version: latestVersion.version,
      questions: savedQuiz.map((quiz) => ({
        id: quiz.id,
        question: quiz.question,
        options: quiz.options,
        correctAnswer: quiz.correctAnswer,
        explanation: quiz.explanation,
      })),
    };
  }
  async getQuiz(documentId: string, user: User) {
    const document = await this.documentRepository.findOne({
      where: {
        id: documentId,
        createdBy: {
          id: user.id,
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const latestVersion = await this.documentVersionRepository.findOne({
      where: {
        document: {
          id: documentId,
        },
      },
      order: {
        version: 'DESC',
      },
    });

    if (!latestVersion) {
      throw new NotFoundException('No uploaded file found for this document');
    }

    const quiz = await this.quizRepository.find({
      where: {
        documentVersion: {
          id: latestVersion.id,
        },
      },
      order: {
        createdAt: 'ASC',
      },
    });

    return {
      documentId: document.id,
      version: latestVersion.version,
      questions: quiz.map((item) => ({
        id: item.id,
        question: item.question,
        options: item.options,
      })),
    };
  }
  async submitQuiz(
    documentId: string,
    submitQuizDto: SubmitQuizDto,
    user: User,
  ) {
    // Check document ownership
    const document = await this.documentRepository.findOne({
      where: {
        id: documentId,
        createdBy: {
          id: user.id,
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Get latest document version
    const latestVersion = await this.documentVersionRepository.findOne({
      where: {
        document: {
          id: documentId,
        },
      },
      order: {
        version: 'DESC',
      },
    });

    if (!latestVersion) {
      throw new NotFoundException('No uploaded file found for this document');
    }

    // Get quiz questions
    const quizQuestions = await this.quizRepository.find({
      where: {
        documentVersion: {
          id: latestVersion.id,
        },
      },
      order: {
        createdAt: 'ASC',
      },
    });

    if (quizQuestions.length === 0) {
      throw new NotFoundException('No quiz found for this document');
    }

    // Prevent duplicate question IDs in submission
    const submittedQuestionIds = submitQuizDto.answers.map(
      (answer) => answer.questionId,
    );

    if (new Set(submittedQuestionIds).size !== submittedQuestionIds.length) {
      throw new BadRequestException('Duplicate question IDs are not allowed');
    }

    // Make sure every submitted question belongs to this quiz
    const quizQuestionMap = new Map(
      quizQuestions.map((question) => [question.id, question]),
    );

    for (const submittedAnswer of submitQuizDto.answers) {
      if (!quizQuestionMap.has(submittedAnswer.questionId)) {
        throw new NotFoundException(
          `Quiz question ${submittedAnswer.questionId} not found`,
        );
      }
    }

    // Calculate score
    let score = 0;

    const results = quizQuestions.map((question) => {
      const submittedAnswer = submitQuizDto.answers.find(
        (answer) => answer.questionId === question.id,
      );

      // If the user didn't answer this question
      if (!submittedAnswer) {
        return {
          questionId: question.id,
          question: question.question,
          selectedAnswer: null,
          correctAnswer: question.correctAnswer,
          correct: false,
          explanation: question.explanation,
        };
      }

      const correct =
        submittedAnswer.answer.trim() === question.correctAnswer.trim();

      if (correct) {
        score++;
      }

      return {
        questionId: question.id,
        question: question.question,
        selectedAnswer: submittedAnswer.answer,
        correctAnswer: question.correctAnswer,
        correct,
        explanation: question.explanation,
      };
    });

    const total = quizQuestions.length;

    return {
      documentId: document.id,
      version: latestVersion.version,
      score,
      total,
      percentage: Math.round((score / total) * 100),
      results,
    };
  }
}
