import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  askDocument,
  generateFlashcards,
  generateQuiz,
  getDocumentById,
  getDocumentDownloadUrl,
  getFlashcards,
  getQuiz,
  submitQuiz,
  summarizeDocument,
} from '../api/documents';
import { useAuth } from '../context/AuthContext';
import type {
  AskDocumentResponse,
  DocumentDetail,
  Flashcard,
  QuizQuestion,
  QuizSubmission,
} from '../types';

function formatSummaryMarkdown(rawSummary: string): string {
  if (!rawSummary) {
    return '';
  }

  const lines = rawSummary.replace(/\r/g, '\n').split('\n');

  return lines
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed || !trimmed.includes('|')) {
        return trimmed || '';
      }

      const cells = trimmed
        .split('|')
        .map((cell) => cell.trim())
        .filter(Boolean)
        .filter((cell) => !/^[-:]+$/.test(cell) && !/^-{3,}$/.test(cell));

      if (cells.length < 2) {
        return trimmed;
      }

      if (cells.length % 2 === 0) {
        return Array.from({ length: cells.length / 2 }, (_, index) => {
          const key = cells[index * 2];
          const value = cells[index * 2 + 1];
          return `- ${key}: ${value}`;
        }).join('\n');
      }

      return `- ${cells.join(' — ')}`;
    })
    .filter((line) => line.trim().length > 0)
    .join('\n\n');
}

export function DocumentPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'ask' | 'summary' | 'flashcards' | 'quiz'>('ask');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<AskDocumentResponse | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [isQuestionLoading, setIsQuestionLoading] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isFlashcardsLoading, setIsFlashcardsLoading] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizSubmission | null>(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [error, setError] = useState('');

  const documentIdValue = useMemo(() => documentId ?? '', [documentId]);

  useEffect(() => {
    if (!token || !documentIdValue) {
      navigate('/login', { replace: true });
      return;
    }

    const loadDocument = async () => {
      try {
        const detail = await getDocumentById(token, documentIdValue);
        const download = await getDocumentDownloadUrl(token, documentIdValue);
        setDocument(detail);
        setDownloadUrl(download.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load document.');
      }
    };

    loadDocument();
  }, [documentIdValue, navigate, token]);

  useEffect(() => {
    if (!document || !token) return;

    const loadFlashcards = async () => {
      try {
        const fetched = await getFlashcards(token, document.id);
        setFlashcards(fetched.flashcards); 
      } catch {
        setFlashcards([]);
      }
    };

    const loadQuiz = async () => {
      try {
        const fetched = await getQuiz(token, document.id);
        setQuiz(fetched.questions as QuizQuestion[]);
      } catch {
        setQuiz([]);
      }
    };

    loadFlashcards();
    loadQuiz();
  }, [document, token]);

  const handleAsk = async () => {
    if (!token || !documentIdValue || !question.trim()) return;
    setIsQuestionLoading(true);
    setError('');

    try {
      const result = await askDocument(token, documentIdValue, question.trim());
      setAnswer(result);
      setQuestion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to ask the document.');
    } finally {
      setIsQuestionLoading(false);
    }
  };

  const handleSummary = async () => {
    if (!token || !documentIdValue) return;
    setIsSummaryLoading(true);
    setError('');

    try {
      const result = await summarizeDocument(token, documentIdValue);
      setSummary(formatSummaryMarkdown(result.summary));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate document summary.');
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!token || !documentIdValue) return;
    setIsFlashcardsLoading(true);
    setError('');

    try {
      const result = await generateFlashcards(token, documentIdValue);
      setFlashcards(result.flashcards);
      setFlashcardIndex(0);
      setShowAnswer(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate flashcards.');
    } finally {
      setIsFlashcardsLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!token || !documentIdValue) return;
    setIsQuizLoading(true);
    setError('');

    try {
      const result = await generateQuiz(token, documentIdValue);
      setQuiz(result.questions as QuizQuestion[]);
      setSelectedAnswers({});
      setQuizResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate quiz.');
    } finally {
      setIsQuizLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!token || !documentIdValue || quiz.length === 0) return;

    const answers = quiz.map((item) => ({
      questionId: item.id,
      answer: selectedAnswers[item.id] ?? '',
    }));

    try {
      const result = await submitQuiz(token, documentIdValue, answers);
      setQuizResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit quiz.');
    }
  };

  const currentFlashcard = flashcards[flashcardIndex] ?? null;
  const progressText = flashcards.length ? `${flashcardIndex + 1} / ${flashcards.length}` : '0 / 0';

  return (
    <div className="document-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Document workspace</p>
          <h1>{document?.title ?? 'Document'}</h1>
        </div>
        <Link to="/" className="secondary-button">Back to dashboard</Link>
      </div>

      {document && (
        <div className="panel document-banner">
          <div>
            <strong>{document.title}</strong>
            <span>{document.subject.name}</span>
          </div>
          {downloadUrl && (
            <a href={downloadUrl} target="_blank" rel="noreferrer" className="secondary-button">
              Open PDF
            </a>
          )}
        </div>
      )}

      <div className="tab-row document-tabs" role="tablist" aria-label="Document tools">
        <button type="button" className={activeTab === 'ask' ? 'tab active' : 'tab'} onClick={() => setActiveTab('ask')}>Ask AI</button>
        <button type="button" className={activeTab === 'summary' ? 'tab active' : 'tab'} onClick={() => setActiveTab('summary')}>Summary</button>
        <button type="button" className={activeTab === 'flashcards' ? 'tab active' : 'tab'} onClick={() => setActiveTab('flashcards')}>Flashcards</button>
        <button type="button" className={activeTab === 'quiz' ? 'tab active' : 'tab'} onClick={() => setActiveTab('quiz')}>Quiz</button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {activeTab === 'ask' && (
        <div className="panel">
          <h2>Ask anything about this document</h2>
          <div className="ask-box">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={4}
              placeholder="Ask a question based on your study material..."
            />
            <button type="button" className="primary-button" onClick={handleAsk} disabled={isQuestionLoading || !question.trim()}>
              {isQuestionLoading ? 'Studying your document...' : 'Ask'}
            </button>
          </div>

          {answer && (
            <div className="answer-box">
              <h3>AI Answer</h3>
              <p>{answer.answer}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="panel">
          <div className="toolbar-row">
            <h2>Document Summary</h2>
            <button type="button" className="secondary-button" onClick={handleSummary} disabled={isSummaryLoading}>
              {isSummaryLoading ? 'Summarizing...' : 'Generate Summary'}
            </button>
          </div>

          {summary ? (
            <div className="summary-box">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          ) : (
            <div className="empty-box">
              <p>No summary yet.</p>
              <p>Generate a concise summary of this document.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'flashcards' && (
        <div className="panel">
          <div className="toolbar-row">
            <h2>Flashcards</h2>
            <button type="button" className="secondary-button" onClick={handleGenerateFlashcards} disabled={isFlashcardsLoading}>
              {isFlashcardsLoading ? 'Generating...' : 'Regenerate'}
            </button>
          </div>

          {isFlashcardsLoading ? (
            <div className="loading-box">Generating flashcards...</div>
          ) : flashcards.length === 0 ? (
            <div className="empty-box">
              <p>No flashcards yet.</p>
              <p>Generate a new set from this document.</p>
            </div>
          ) : (
            <div className="flashcard-stack">
              <div className="flashcard-progress">FLASHCARD {progressText}</div>
              <div className="flashcard-card">
                <div className="flashcard-question">{currentFlashcard.question}</div>
                {showAnswer && <div className="flashcard-answer">{currentFlashcard.answer}</div>}
              </div>
              <div className="flashcard-controls">
                <button type="button" className="secondary-button" onClick={() => { setFlashcardIndex((value) => (value === 0 ? flashcards.length - 1 : value - 1)); setShowAnswer(false); }} disabled={flashcards.length <= 1}>Previous</button>
                <button type="button" className="primary-button" onClick={() => setShowAnswer((value) => !value)}>
                  {showAnswer ? 'Hide Answer' : 'Show Answer'}
                </button>
                <button type="button" className="secondary-button" onClick={() => { setFlashcardIndex((value) => (value + 1) % flashcards.length); setShowAnswer(false); }} disabled={flashcards.length <= 1}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'quiz' && (
        <div className="panel">
          <div className="toolbar-row">
            <h2>Quiz</h2>
            <button type="button" className="secondary-button" onClick={handleGenerateQuiz} disabled={isQuizLoading}>
              {isQuizLoading ? 'Generating...' : 'Generate quiz'}
            </button>
          </div>

          {quizResult ? (
            <div className="quiz-results-box">
              <h3>Quiz Complete!</h3>
              <div className="score-box">{quizResult.score} / {quizResult.total}</div>
              <div className="score-percent">{quizResult.percentage}%</div>

              {quizResult.results.map((result, index) => (
                <div key={result.questionId} className="result-item">
                  <div className="result-header">
                    <strong>Question {index + 1}</strong>
                    <span>{result.correct ? '✓ Correct' : '✗ Incorrect'}</span>
                  </div>
                  <p><strong>Question:</strong> {result.question}</p>
                  <p><strong>Your answer:</strong> {result.selectedAnswer ?? 'No answer'}</p>
                  <p><strong>Correct answer:</strong> {result.correctAnswer}</p>
                  <p><strong>Explanation:</strong> {result.explanation}</p>
                </div>
              ))}
            </div>
          ) : isQuizLoading ? (
            <div className="loading-box">StudyPilot is creating your quiz...</div>
          ) : quiz.length === 0 ? (
            <div className="empty-box">
              <p>No quiz yet.</p>
              <p>Generate a set of practice questions for this document.</p>
            </div>
          ) : (
            <div className="quiz-box">
              {quiz.map((item, questionIndex) => (
                <div key={item.id} className="quiz-question-panel">
                  <h3>Question {questionIndex + 1}</h3>
                  <p>{item.question}</p>
                  <div className="options-list">
                    {item.options.map((option) => (
                      <label key={option} className={selectedAnswers[item.id] === option ? 'option selected' : 'option'}>
                        <input
                          type="radio"
                          name={item.id}
                          checked={selectedAnswers[item.id] === option}
                          onChange={() => setSelectedAnswers((current) => ({ ...current, [item.id]: option }))}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <button type="button" className="primary-button" onClick={handleSubmitQuiz}>
                Submit Quiz
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
