export type User = {
  id: string;
  name: string;
  email: string;
};

export type Subject = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentSummary = {
  id: string;
  title: string;
  subject: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type DocumentVersion = {
  id: string;
  version: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  createdAt: string;
};

export type DocumentDetail = {
  id: string;
  title: string;
  subject: {
    id: string;
    name: string;
  };
  versions: DocumentVersion[];
  createdAt: string;
  updatedAt: string;
};

export type AskDocumentResponse = {
  question: string;
  answer: string;
  sources: {
    chunkId: string;
    chunkIndex: number;
    similarity: number;
  }[];
};

export type Flashcard = {
  id: string;
  question: string;
  answer: string;
};

export type FlashcardsResponse = {
  documentId: string;
  version: number;
  flashcards: Flashcard[];
};

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer?: string;
  explanation?: string;
};

export type QuizSet = {
  documentId: string;
  version: number;
  questions: QuizQuestion[];
};

export type QuizAnswer = {
  questionId: string;
  answer: string;
};

export type QuizResultItem = {
  questionId: string;
  question: string;
  selectedAnswer: string | null;
  correctAnswer: string;
  correct: boolean;
  explanation: string;
};

export type QuizSubmission = {
  documentId: string;
  version: number;
  score: number;
  total: number;
  percentage: number;
  results: QuizResultItem[];
};
