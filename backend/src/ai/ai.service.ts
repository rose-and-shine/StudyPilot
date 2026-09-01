import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiService {
  private readonly ai: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    this.ai = new GoogleGenAI({
      apiKey: this.configService.getOrThrow<string>('GEMINI_API_KEY'),
    });
  }
  private async generateWithRetry(
    prompt: string,
    maxRetries = 3,
  ): Promise<string> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
        });

        if (!response.text) {
          throw new Error('Gemini returned an empty response');
        }

        return response.text;
      } catch (error: any) {
        lastError = error;

        const status = error?.status;
        const errorMessage = error?.message || '';

        // Daily quota exhausted.
        // Retrying will not help.
        if (
          status === 429 &&
          (errorMessage.includes('quota') ||
            errorMessage.includes('RESOURCE_EXHAUSTED') ||
            errorMessage.includes('GenerateRequestsPerDay'))
        ) {
          console.error('Gemini daily quota exhausted.');
          throw new ServiceUnavailableException(
            'Gemini daily quota has been exhausted. Please try again later.',
          );
        }

        // Retry only temporary errors.
        if (status !== 429 && status !== 500 && status !== 503) {
          throw error;
        }

        if (attempt === maxRetries) {
          break;
        }

        const delay = 1000 * Math.pow(2, attempt);

        console.log(
          `Gemini request failed (${status}). ` + `Retrying in ${delay}ms...`,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    console.error('Gemini request failed after retries:', lastError);

    throw new ServiceUnavailableException(
      'AI service is temporarily unavailable. Please try again later.',
    );
  }
  async generateAnswer(question: string, context: string): Promise<string> {
    const prompt = `
You are StudyPilot, an AI study assistant.

Answer the student's question using ONLY the provided study material.

Rules:
- Use only information supported by the study material.
- Do not use outside knowledge.
- Do not invent or assume information.
- If the answer cannot be found in the study material, say:
  "I couldn't find the answer in the provided study material."
- Give a clear and concise answer.
- Use bullet points or numbered lists when appropriate.
- Do not mention embeddings, vector search, retrieval, or RAG.

STUDY MATERIAL:

${context}

STUDENT QUESTION:

${question}
`;

    const responseText = await this.generateWithRetry(prompt);

    return responseText;
  }
  async generateChunkSummary(text: string): Promise<string> {
    const prompt = `
You are StudyPilot, an AI study assistant.

Summarize the following study material.

Rules:
- Use ONLY the information provided.
- Preserve important concepts, definitions, facts, and relationships.
- Do not add information from outside the material.
- Do not omit important technical details.
- Use clear and concise language.
- Organize the summary with headings and bullet points where appropriate.

STUDY MATERIAL:
${text}
`;

    const responseText = await this.generateWithRetry(prompt);

    if (!responseText) {
      throw new Error('Gemini returned an empty summary');
    }

    return responseText;
  }
  async generateFinalSummary(summaries: string[]): Promise<string> {
    const combinedSummaries = summaries
      .map((summary, index) => `[Section ${index + 1}]\n${summary}`)
      .join('\n\n');

    const prompt = `
You are StudyPilot, an AI study assistant.

Create a final study summary from the section summaries below.

Rules:
- Use ONLY the information contained in the provided summaries.
- Combine overlapping information intelligently.
- Preserve important concepts, definitions, facts, and relationships.
- Do not introduce outside information.
- Avoid unnecessary repetition.
- Organize the result with clear headings and bullet points.
- Make the summary useful for exam revision.

SECTION SUMMARIES:
${combinedSummaries}
`;

    const responseText = await this.generateWithRetry(prompt);

    if (!responseText) {
      throw new Error('Gemini returned an empty final summary');
    }

    return responseText;
  }
  async generateFlashcards(
    context: string,
    maxCount = 10,
  ): Promise<{ question: string; answer: string }[]> {
    const prompt = `
You are StudyPilot, an AI study assistant.

Create study flashcards from the provided study material.

Rules:
- Use ONLY information from the provided study material.
- Do not add outside knowledge.
- Focus on important concepts, definitions, facts, comparisons, and relationships.
- Each flashcard should test one clear concept.
- Keep questions concise.
- Keep answers clear and reasonably concise.
- Generate UP TO ${maxCount} flashcards.
- Only generate flashcards that are directly supported by the study material.
- If the material does not contain enough distinct information, generate fewer flashcards.
- Do not invent information.
- Do not create repetitive flashcards.
- Return ONLY valid JSON.
- Do not use markdown code fences.

Return exactly this format:

[
  {
    "question": "Question here",
    "answer": "Answer here"
  }
]

STUDY MATERIAL:

${context}
`;

    const responseText = await this.generateWithRetry(prompt);

    try {
      const flashcards = JSON.parse(responseText);

      if (!Array.isArray(flashcards)) {
        throw new Error('Invalid flashcard response');
      }

      for (const item of flashcards) {
        if (
          typeof item.question !== 'string' ||
          typeof item.answer !== 'string'
        ) {
          throw new Error('Invalid flashcard format');
        }
      }

      return flashcards.slice(0, maxCount);
    } catch {
      throw new Error('Gemini returned invalid flashcard JSON');
    }
  }
  async generateQuiz(
    context: string,
    maxCount = 10,
  ): Promise<
    {
      question: string;
      options: string[];
      correctAnswer: string;
      explanation: string;
    }[]
  > {
    const prompt = `
You are StudyPilot, an AI study assistant.

Create a multiple-choice quiz from the provided study material.

Rules:
- Use ONLY information from the provided study material.
- Do not add outside knowledge.
- Generate UP TO ${maxCount} questions.
- If the material does not contain enough distinct information, generate fewer questions.
- Do not invent information.
- Do not create repetitive questions.
- Each question must test one clear concept.
- Each question must have exactly 4 options.
- Only one option should be correct.
- The correctAnswer must exactly match one of the options.
- Provide a short explanation for the correct answer.
- Return ONLY valid JSON.
- Do not use markdown code fences.

Return exactly this format:

[
  {
    "question": "Question here",
    "options": [
      "Option A",
      "Option B",
      "Option C",
      "Option D"
    ],
    "correctAnswer": "Option A",
    "explanation": "Explanation here"
  }
]

STUDY MATERIAL:

${context}
`;

    const responseText = await this.generateWithRetry(prompt);

    try {
      const quiz = JSON.parse(responseText);

      if (!Array.isArray(quiz)) {
        throw new Error('Invalid quiz response');
      }

      for (const item of quiz) {
        if (
          typeof item.question !== 'string' ||
          !Array.isArray(item.options) ||
          item.options.length !== 4 ||
          typeof item.correctAnswer !== 'string' ||
          typeof item.explanation !== 'string' ||
          !item.options.includes(item.correctAnswer)
        ) {
          throw new Error('Invalid quiz format');
        }
      }

      return quiz.slice(0, maxCount);
    } catch {
      throw new Error('Gemini returned invalid quiz JSON');
    }
  }
  async selectBestFlashcards(
    flashcards: {
      question: string;
      answer: string;
    }[],
    maxCount = 10,
  ): Promise<
    {
      question: string;
      answer: string;
    }[]
  > {
    if (flashcards.length <= maxCount) {
      return flashcards;
    }

    const prompt = `
You are StudyPilot, an AI study assistant.

Below are flashcards generated from different sections of the same study document.

Select the best flashcards for the final study set.

Rules:
- Select UP TO ${maxCount} flashcards.
- Remove duplicate or nearly duplicate flashcards.
- Prefer important and useful concepts.
- Prefer clear and non-repetitive questions.
- Do not invent information.
- Do not modify factual content.
- Return ONLY valid JSON.
- Do not use markdown code fences.

Return exactly this format:

[
  {
    "question": "Question here",
    "answer": "Answer here"
  }
]

FLASHCARDS:

${JSON.stringify(flashcards)}
`;

    const responseText = await this.generateWithRetry(prompt);

    try {
      const selected = JSON.parse(responseText);

      if (!Array.isArray(selected)) {
        throw new Error('Invalid flashcard selection');
      }

      for (const item of selected) {
        if (
          typeof item.question !== 'string' ||
          typeof item.answer !== 'string'
        ) {
          throw new Error('Invalid flashcard format');
        }
      }

      return selected.slice(0, maxCount);
    } catch {
      throw new Error('Gemini returned invalid flashcard selection JSON');
    }
  }
  async selectBestQuiz(
    questions: {
      question: string;
      options: string[];
      correctAnswer: string;
      explanation: string;
    }[],
    maxCount = 10,
  ): Promise<
    {
      question: string;
      options: string[];
      correctAnswer: string;
      explanation: string;
    }[]
  > {
    if (questions.length <= maxCount) {
      return questions;
    }

    const prompt = `
You are StudyPilot, an AI study assistant.

Below are multiple-choice questions generated from different sections of the same study document.

Select the best questions for a final quiz.

Rules:
- Select UP TO ${maxCount} questions.
- Remove duplicate or nearly duplicate questions.
- Prefer questions covering different important concepts.
- Prefer clear questions with plausible options.
- Keep exactly four options for each question.
- The correctAnswer must exactly match one of the options.
- Do not introduce information that is not present in the questions.
- If fewer than ${maxCount} questions are sufficiently useful, return fewer.
- Return ONLY valid JSON.
- Do not use markdown code fences.

Return exactly this format:

[
  {
    "question": "Question here",
    "options": [
      "Option A",
      "Option B",
      "Option C",
      "Option D"
    ],
    "correctAnswer": "Option A",
    "explanation": "Explanation"
  }
]

QUESTIONS:

${JSON.stringify(questions)}
`;

    const responseText = await this.generateWithRetry(prompt);

    try {
      const selected = JSON.parse(responseText);

      if (!Array.isArray(selected)) {
        throw new Error('Invalid quiz selection');
      }

      for (const item of selected) {
        if (
          typeof item.question !== 'string' ||
          !Array.isArray(item.options) ||
          item.options.length !== 4 ||
          typeof item.correctAnswer !== 'string' ||
          typeof item.explanation !== 'string' ||
          !item.options.includes(item.correctAnswer)
        ) {
          throw new Error('Invalid quiz format');
        }
      }

      return selected.slice(0, maxCount);
    } catch {
      throw new Error('Gemini returned invalid quiz selection JSON');
    }
  }
}
