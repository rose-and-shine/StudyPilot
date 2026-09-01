import { apiRequest, buildApiUrl } from './client';
import type {
  AskDocumentResponse,
  DocumentDetail,
  DocumentSummary,
  FlashcardsResponse,
  QuizAnswer,
  QuizSet,
  QuizSubmission,
} from '../types';

export async function getDocuments(token: string) {
  return apiRequest<DocumentSummary[]>('/documents', { method: 'GET' }, token);
}

export async function createDocument(token: string, title: string, subjectId: string) {
  return apiRequest<{ id: string; title: string; subjectId: string; createdAt: string }>(
    '/documents',
    {
      method: 'POST',
      body: JSON.stringify({ title, subjectId }),
    },
    token,
  );
}

export async function uploadDocument(token: string, documentId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return apiRequest<{
    id: string;
    documentId: string;
    version: number;
    fileName: string;
    mimeType: string;
    fileSize: number;
    storagePath: string;
    chunkCount: number;
    createdAt: string;
  }>(`/documents/${documentId}/upload`, {
    method: 'POST',
    body: formData,
  }, token);
}

export async function getDocumentById(token: string, documentId: string) {
  return apiRequest<DocumentDetail>(`/documents/${documentId}`, { method: 'GET' }, token);
}

export async function getDocumentDownloadUrl(token: string, documentId: string) {
  return apiRequest<{ documentId: string; version: number; fileName: string; url: string }>(
    `/documents/${documentId}/download`,
    { method: 'GET' },
    token,
  );
}

export async function askDocument(token: string, documentId: string, question: string) {
  return apiRequest<AskDocumentResponse>(
    `/documents/${documentId}/ask`,
    {
      method: 'POST',
      body: JSON.stringify({ question }),
    },
    token,
  );
}

export async function summarizeDocument(token: string, documentId: string) {
  return apiRequest<{ documentId: string; version: number; summary: string }>(
    `/documents/${documentId}/summarize`,
    { method: 'POST' },
    token,
  );
}

export async function generateFlashcards(token: string, documentId: string) {
  return apiRequest<FlashcardsResponse>(
    `/documents/${documentId}/flashcards/generate`,
    { method: 'POST' },
    token,
  );
}

export async function getFlashcards(token: string, documentId: string) {
  return apiRequest<FlashcardsResponse>(`/documents/${documentId}/flashcards`, { method: 'GET' }, token);
}

export async function generateQuiz(token: string, documentId: string) {
  return apiRequest<QuizSet>(`/documents/${documentId}/quiz/generate`, { method: 'POST' }, token);
}

export async function getQuiz(token: string, documentId: string) {
  return apiRequest<QuizSet>(`/documents/${documentId}/quiz`, { method: 'GET' }, token);
}

export async function submitQuiz(token: string, documentId: string, answers: QuizAnswer[]) {
  return apiRequest<QuizSubmission>(
    `/documents/${documentId}/quiz/submit`,
    {
      method: 'POST',
      body: JSON.stringify({ answers }),
    },
    token,
  );
}

export function getFileUrlFromDocument(documentId: string, version: number): string {
  return `${buildApiUrl('/documents')}/${documentId}/download?version=${version}`;
}
