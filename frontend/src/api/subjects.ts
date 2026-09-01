import { apiRequest } from './client';
import type { Subject } from '../types';

export async function getSubjects(token: string) {
  return apiRequest<Subject[]>('/subjects', { method: 'GET' }, token);
}

export async function createSubject(token: string, name: string) {
  return apiRequest<Subject>(
    '/subjects',
    {
      method: 'POST',
      body: JSON.stringify({ name }),
    },
    token,
  );
}

export async function getSubjectById(token: string, subjectId: string) {
  return apiRequest<Subject & { user?: { id: string } }>(
    `/subjects/${subjectId}`,
    { method: 'GET' },
    token,
  );
}
