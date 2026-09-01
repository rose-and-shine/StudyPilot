import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import confetti from "canvas-confetti";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  FileText,
  Layers,
  HelpCircle,
  Send,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Shuffle,
  Copy,
  Check,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Loader2
} from "lucide-react";
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
} from "../api/documents";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { AiLoadingState } from "../components/LoadingSkeleton";
import { EmptyState } from "../components/EmptyState";
import type {
  AskDocumentResponse,
  DocumentDetail,
  Flashcard,
  QuizQuestion,
  QuizSubmission,
} from "../types";

export function DocumentPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { showToast } = useToast();

  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"summary" | "flashcards" | "quiz" | "ask">("summary");

  // Summary State
  const [summary, setSummary] = useState<string>("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Flashcards State
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFlashcardsLoading, setIsFlashcardsLoading] = useState(false);

  // Quiz State
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizSubmission | null>(null);
  const [resultFilter, setResultFilter] = useState<"all" | "correct" | "incorrect">("all");

  // Ask AI State
  const [question, setQuestion] = useState("");
  const [isQuestionLoading, setIsQuestionLoading] = useState(false);
  const [qaHistory, setQaHistory] = useState<AskDocumentResponse[]>([]);
  const [expandedSources, setExpandedSources] = useState<Record<number, boolean>>({});

  const documentIdValue = useMemo(() => documentId ?? "", [documentId]);

  // Load Initial Document Metadata
  useEffect(() => {
    if (!token || !documentIdValue) {
      navigate("/login", { replace: true });
      return;
    }

    const loadDocument = async () => {
      try {
        const detail = await getDocumentById(token, documentIdValue);
        setDocument(detail);

        try {
          const download = await getDocumentDownloadUrl(token, documentIdValue);
          setDownloadUrl(download.url);
        } catch {
          // No file uploaded yet or download url not available
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load document.";
        showToast(message, "error");
      }
    };

    loadDocument();
  }, [documentIdValue, navigate, token]);

  // Load cached Flashcards and Quiz on initial render
  useEffect(() => {
    if (!document || !token) return;

    const loadPreexistingData = async () => {
      try {
        const [flashcardsData, quizData] = await Promise.allSettled([
          getFlashcards(token, document.id),
          getQuiz(token, document.id),
        ]);

        if (flashcardsData.status === "fulfilled" && flashcardsData.value.flashcards?.length > 0) {
          setFlashcards(flashcardsData.value.flashcards);
        }

        if (quizData.status === "fulfilled" && quizData.value.questions?.length > 0) {
          setQuiz(quizData.value.questions as QuizQuestion[]);
        }
      } catch {
        // Ignore fallback
      }
    };

    loadPreexistingData();
  }, [document, token]);

  // Keyboard navigation for Flashcards
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== "flashcards" || flashcards.length === 0) return;

      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setFlashcardIndex((prev) => (prev + 1) % flashcards.length);
        setIsFlipped(false);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFlashcardIndex((prev) => (prev === 0 ? flashcards.length - 1 : prev - 1));
        setIsFlipped(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, flashcards.length]);

  // ==========================================
  // Handlers for Summary
  // ==========================================
  const handleGenerateSummary = async () => {
    if (!token || !documentIdValue) return;
    setIsSummaryLoading(true);

    try {
      const result = await summarizeDocument(token, documentIdValue);
      setSummary(result.summary);
      showToast("Summary generated.", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to generate summary.";
      showToast(message, "error");
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const handleCopySummary = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setIsCopied(true);
    showToast("Summary copied to clipboard.", "info");
    setTimeout(() => setIsCopied(false), 2000);
  };

  // ==========================================
  // Handlers for Flashcards
  // ==========================================
  const handleGenerateFlashcards = async () => {
    if (!token || !documentIdValue) return;
    setIsFlashcardsLoading(true);

    try {
      const result = await generateFlashcards(token, documentIdValue);
      setFlashcards(result.flashcards);
      setFlashcardIndex(0);
      setIsFlipped(false);
      showToast(`${result.flashcards.length} flashcards created.`, "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to generate flashcards.";
      showToast(message, "error");
    } finally {
      setIsFlashcardsLoading(false);
    }
  };

  const handleShuffleFlashcards = () => {
    if (flashcards.length <= 1) return;
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setFlashcardIndex(0);
    setIsFlipped(false);
    showToast("Deck shuffled.", "info");
  };

  // ==========================================
  // Handlers for Quiz
  // ==========================================
  const handleGenerateQuiz = async () => {
    if (!token || !documentIdValue) return;
    setIsQuizLoading(true);
    setQuizResult(null);
    setSelectedAnswers({});
    setCurrentQuizIndex(0);

    try {
      const result = await generateQuiz(token, documentIdValue);
      setQuiz(result.questions as QuizQuestion[]);
      showToast(`${result.questions.length} questions generated.`, "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to generate quiz.";
      showToast(message, "error");
    } finally {
      setIsQuizLoading(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!token || !documentIdValue || quiz.length === 0) return;

    const unanswerdCount = quiz.filter((q) => !selectedAnswers[q.id]).length;
    if (unanswerdCount > 0) {
      const confirmSubmit = window.confirm(
        `You have ${unanswerdCount} unanswered question(s). Do you still want to submit?`
      );
      if (!confirmSubmit) return;
    }

    setIsSubmittingQuiz(true);
    try {
      const answers = quiz.map((item) => ({
        questionId: item.id,
        answer: selectedAnswers[item.id] ?? "",
      }));

      const result = await submitQuiz(token, documentIdValue, answers);
      setQuizResult(result);

      if (result.percentage >= 60) {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#9688C0', '#B6A5E8', '#A596D3', '#C8B6FF', '#CDBDFF'],
        });
      }
      showToast(`Quiz submitted. Score: ${result.score}/${result.total}`, "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to submit quiz.";
      showToast(message, "error");
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  // ==========================================
  // Handlers for Ask AI
  // ==========================================
  const handleAsk = async () => {
    if (!token || !documentIdValue || !question.trim()) return;

    setIsQuestionLoading(true);
    try {
      const result = await askDocument(token, documentIdValue, question.trim());
      setQaHistory((prev) => [result, ...prev]);
      setQuestion("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to answer question.";
      showToast(message, "error");
    } finally {
      setIsQuestionLoading(false);
    }
  };

  const toggleSources = (index: number) => {
    setExpandedSources((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const currentFlashcard = flashcards[flashcardIndex];
  const currentQuizQuestion = quiz[currentQuizIndex];

  const filteredQuizResults = useMemo(() => {
    if (!quizResult) return [];
    if (resultFilter === "correct") return quizResult.results.filter((r) => r.correct);
    if (resultFilter === "incorrect") return quizResult.results.filter((r) => !r.correct);
    return quizResult.results;
  }, [quizResult, resultFilter]);

  return (
    <div className="document-page">
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <Link to="/" className="breadcrumb-link">
          Dashboard
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        {document?.subject && (
          <>
            <Link to={`/subjects/${document.subject.id}`} className="breadcrumb-link">
              {document.subject.name}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
          </>
        )}
        <span className="breadcrumb-current">{document?.title || "Document"}</span>
      </div>

      {/* Header Banner */}
      <div className="document-header-banner">
        <div className="document-header-info">
          <div className="document-header-icon">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="document-header-title-group">
            <h1>{document?.title || "Document"}</h1>
            <div className="document-header-badges">
              {document?.subject && (
                <span className="subject-badge">{document.subject.name}</span>
              )}
              <span className="version-badge">Version 1</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="secondary-button"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open PDF</span>
            </a>
          )}
          <Link
            to={document?.subject ? `/subjects/${document.subject.id}` : "/"}
            className="ghost-button"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
        </div>
      </div>

      {/* Workspace Tabs Switcher */}
      <div className="document-workspace-tabs" role="tablist">
        <button
          type="button"
          className={`workspace-tab ${activeTab === "summary" ? "active" : ""}`}
          onClick={() => setActiveTab("summary")}
        >
          <FileText className="w-4 h-4" />
          <span>Summary</span>
        </button>
        <button
          type="button"
          className={`workspace-tab ${activeTab === "flashcards" ? "active" : ""}`}
          onClick={() => setActiveTab("flashcards")}
        >
          <Layers className="w-4 h-4" />
          <span>Flashcards</span>
        </button>
        <button
          type="button"
          className={`workspace-tab ${activeTab === "quiz" ? "active" : ""}`}
          onClick={() => setActiveTab("quiz")}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Quiz</span>
        </button>
        <button
          type="button"
          className={`workspace-tab ${activeTab === "ask" ? "active" : ""}`}
          onClick={() => setActiveTab("ask")}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Ask AI</span>
        </button>
      </div>

      {/* ===================================================================
          TAB 1: SUMMARY
          =================================================================== */}
      {activeTab === "summary" && (
        <div className="summary-workspace">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--stroke)", paddingBottom: "1rem" }}>
            <div>
              <h2>Document Summary</h2>
              <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                Summary of key concepts and notes.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {summary && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleCopySummary}
                >
                  {isCopied ? <Check className="w-4 h-4 text-purple" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopied ? "Copied" : "Copy"}</span>
                </button>
              )}
              <button
                type="button"
                className="primary-button"
                onClick={handleGenerateSummary}
                disabled={isSummaryLoading}
              >
                {isSummaryLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Summarizing...</span>
                  </>
                ) : (
                  <span>{summary ? "Regenerate Summary" : "Generate Summary"}</span>
                )}
              </button>
            </div>
          </div>

          {isSummaryLoading ? (
            <AiLoadingState
              message="Summarizing document..."
              subtext="Extracting structured key points"
            />
          ) : summary ? (
            <div className="summary-content">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No summary generated yet"
              description="Generate a concise overview of this document."
              action={
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleGenerateSummary}
                >
                  <span>Generate Summary</span>
                </button>
              }
            />
          )}
        </div>
      )}

      {/* ===================================================================
          TAB 2: FLASHCARDS
          =================================================================== */}
      {activeTab === "flashcards" && (
        <div className="flashcards-workspace">
          <div className="flashcard-header-row">
            <div>
              <h2>Flashcards</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                {flashcards.length > 0 ? `Card ${flashcardIndex + 1} of ${flashcards.length}` : "No cards loaded"}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {flashcards.length > 1 && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleShuffleFlashcards}
                  title="Shuffle deck"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Shuffle</span>
                </button>
              )}
              <button
                type="button"
                className="primary-button"
                onClick={handleGenerateFlashcards}
                disabled={isFlashcardsLoading}
              >
                {isFlashcardsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>{flashcards.length > 0 ? "Regenerate" : "Generate Cards"}</span>
              </button>
            </div>
          </div>

          {isFlashcardsLoading ? (
            <div className="panel" style={{ width: "100%" }}>
              <AiLoadingState
                message="Generating flashcards..."
                subtext="Formulating question and answer pairs"
              />
            </div>
          ) : flashcards.length === 0 ? (
            <div style={{ width: "100%" }}>
              <EmptyState
                icon={Layers}
                title="No flashcards yet"
                description="Generate flashcards to test your recall."
                action={
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleGenerateFlashcards}
                  >
                    <span>Generate Flashcards</span>
                  </button>
                }
              />
            </div>
          ) : (
            <>
              {/* Progress Bar */}
              <div className="flashcard-progress-bar-wrap">
                <div
                  className="flashcard-progress-fill"
                  style={{
                    width: `${((flashcardIndex + 1) / flashcards.length) * 100}%`,
                  }}
                />
              </div>

              {/* 3D Interactive Card */}
              <div className="flashcard-scene" onClick={() => setIsFlipped(!isFlipped)}>
                <div className={`flashcard-inner ${isFlipped ? "is-flipped" : ""}`}>
                  {/* Front Side */}
                  <div className="flashcard-face flashcard-front">
                    <span className="flashcard-prompt-hint">Question</span>
                    <div className="flashcard-main-text">
                      {currentFlashcard?.question}
                    </div>
                    <div className="flashcard-click-hint">
                      <span>Click card or press Space to show answer</span>
                      <RotateCcw className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Back Side */}
                  <div className="flashcard-face flashcard-back">
                    <span className="flashcard-prompt-hint" style={{ color: "var(--purple)" }}>
                      Answer
                    </span>
                    <div className="flashcard-main-text" style={{ fontSize: "1.15rem", fontWeight: 500 }}>
                      {currentFlashcard?.answer}
                    </div>
                    <div className="flashcard-click-hint">
                      <span>Click to flip back to question</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flashcard-controls">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setFlashcardIndex((prev) => (prev === 0 ? flashcards.length - 1 : prev - 1));
                    setIsFlipped(false);
                  }}
                  disabled={flashcards.length <= 1}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{isFlipped ? "Hide Answer" : "Show Answer"}</span>
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setFlashcardIndex((prev) => (prev + 1) % flashcards.length);
                    setIsFlipped(false);
                  }}
                  disabled={flashcards.length <= 1}
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Keyboard Shortcut Helper */}
              <div className="keyboard-shortcut-hint">
                <span>Shortcuts:</span>
                <kbd>←</kbd> <kbd>→</kbd> Navigate • <kbd>Space</kbd> Flip card
              </div>
            </>
          )}
        </div>
      )}

      {/* ===================================================================
          TAB 3: QUIZ
          =================================================================== */}
      {activeTab === "quiz" && (
        <div className="quiz-workspace">
          {/* Header Card */}
          <div className="quiz-header-card">
            <div>
              <h2>Practice Quiz</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Multiple-choice questions based on this document.
              </p>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={handleGenerateQuiz}
              disabled={isQuizLoading}
            >
              {isQuizLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>{quiz.length > 0 ? "New Quiz" : "Generate Quiz"}</span>
            </button>
          </div>

          {isQuizLoading ? (
            <div className="panel">
              <AiLoadingState
                message="Generating quiz questions..."
                subtext="Preparing multiple-choice options"
              />
            </div>
          ) : quizResult ? (
            /* Quiz Results View */
            <div className="quiz-results-card">
              <div className="quiz-score-gauge">
                <span className="quiz-score-value">{quizResult.score}</span>
                <span className="quiz-score-percent">/ {quizResult.total} ({quizResult.percentage}%)</span>
              </div>

              <div>
                <h2>Quiz Complete</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", marginTop: "0.25rem" }}>
                  You scored {quizResult.score} out of {quizResult.total} questions ({quizResult.percentage}%).
                </p>
              </div>

              <div className="quiz-results-filter-bar">
                <button
                  type="button"
                  className={`filter-pill ${resultFilter === "all" ? "active" : ""}`}
                  onClick={() => setResultFilter("all")}
                >
                  All ({quizResult.total})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${resultFilter === "correct" ? "active" : ""}`}
                  onClick={() => setResultFilter("correct")}
                >
                  Correct ({quizResult.score})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${resultFilter === "incorrect" ? "active" : ""}`}
                  onClick={() => setResultFilter("incorrect")}
                >
                  Incorrect ({quizResult.total - quizResult.score})
                </button>
              </div>

              {/* Review Cards */}
              <div className="quiz-review-list">
                {filteredQuizResults.map((res, index) => (
                  <div
                    key={res.questionId}
                    className={`quiz-review-card ${res.correct ? "correct" : "incorrect"}`}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>
                        Question {index + 1}
                      </span>
                      <span className={`quiz-review-status ${res.correct ? "correct" : "incorrect"}`}>
                        {res.correct ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Correct</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            <span>Incorrect</span>
                          </>
                        )}
                      </span>
                    </div>

                    <h4 style={{ fontSize: "1.05rem", color: "var(--espresso)" }}>
                      {res.question}
                    </h4>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.9rem" }}>
                      <div>
                        <strong>Your answer:</strong>{" "}
                        <span style={{ color: res.correct ? "#1E7B58" : "var(--purple)", fontWeight: 600 }}>
                          {res.selectedAnswer || "No answer selected"}
                        </span>
                      </div>
                      {!res.correct && (
                        <div>
                          <strong>Correct answer:</strong>{" "}
                          <span style={{ color: "#1E7B58", fontWeight: 600 }}>
                            {res.correctAnswer}
                          </span>
                        </div>
                      )}
                    </div>

                    {res.explanation && (
                      <div className="explanation-box">
                        <strong>Explanation:</strong> {res.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setQuizResult(null);
                    setSelectedAnswers({});
                    setCurrentQuizIndex(0);
                  }}
                >
                  Retake Quiz
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleGenerateQuiz}
                >
                  Generate New Questions
                </button>
              </div>
            </div>
          ) : quiz.length === 0 ? (
            <EmptyState
              icon={HelpCircle}
              title="No quiz yet"
              description="Generate a practice quiz to test your comprehension."
              action={
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleGenerateQuiz}
                >
                  <span>Generate Quiz</span>
                </button>
              }
            />
          ) : (
            /* Active Quiz Taking Screen */
            <div className="quiz-question-card">
              {/* Question Header */}
              <div className="quiz-question-header">
                <span className="quiz-question-number">
                  Question {currentQuizIndex + 1} of {quiz.length}
                </span>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  {Object.keys(selectedAnswers).length} of {quiz.length} answered
                </span>
              </div>

              {/* Progress Line */}
              <div className="flashcard-progress-bar-wrap">
                <div
                  className="flashcard-progress-fill"
                  style={{
                    width: `${((currentQuizIndex + 1) / quiz.length) * 100}%`,
                  }}
                />
              </div>

              <h3 className="quiz-question-title">
                {currentQuizQuestion?.question}
              </h3>

              {/* Options List */}
              <div className="quiz-options-list">
                {currentQuizQuestion?.options.map((option, idx) => {
                  const isSelected = selectedAnswers[currentQuizQuestion.id] === option;
                  return (
                    <label
                      key={idx}
                      className={`quiz-option-label ${isSelected ? "is-selected" : ""}`}
                      onClick={() =>
                        setSelectedAnswers((prev) => ({
                          ...prev,
                          [currentQuizQuestion.id]: option,
                        }))
                      }
                    >
                      <div className="quiz-option-indicator" />
                      <span className="quiz-option-text">{option}</span>
                    </label>
                  );
                })}
              </div>

              {/* Actions Footer */}
              <div className="quiz-bottom-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setCurrentQuizIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQuizIndex === 0}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {currentQuizIndex < quiz.length - 1 ? (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setCurrentQuizIndex((prev) => prev + 1)}
                  >
                    <span>Next Question</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleSubmitQuiz}
                    disabled={isSubmittingQuiz}
                  >
                    {isSubmittingQuiz ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Submit Quiz</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          TAB 4: ASK AI
          =================================================================== */}
      {activeTab === "ask" && (
        <div className="ask-workspace">
          {/* Question Input Box */}
          <div className="ask-input-panel">
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <div className="input-field-wrap" style={{ flex: 1 }}>
                <textarea
                  className="input-field"
                  placeholder="Ask a question about this document... (Press Enter to send)"
                  rows={3}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAsk();
                    }
                  }}
                />
              </div>
              <button
                type="button"
                className="primary-button"
                style={{ height: "3.25rem", padding: "0 1.25rem" }}
                onClick={() => handleAsk()}
                disabled={isQuestionLoading || !question.trim()}
              >
                <Send className="w-4 h-4" />
                <span>Ask</span>
              </button>
            </div>
          </div>

          {/* AI Loading State */}
          {isQuestionLoading && (
            <div className="panel">
              <AiLoadingState
                message="Retrieving answer..."
                subtext="Searching document chunks"
              />
            </div>
          )}

          {/* Q&A Stream */}
          <div className="qa-stream">
            {qaHistory.length === 0 && !isQuestionLoading ? (
              <EmptyState
                icon={MessageSquare}
                title="Ask anything about your document"
                description="Type your question in the box above to retrieve answers from this document."
              />
            ) : (
              qaHistory.map((item, index) => (
                <div key={index} className="qa-card">
                  {/* User Question */}
                  <div className="qa-question-row">
                    <div className="qa-avatar user">You</div>
                    <div className="qa-question-text">{item.question}</div>
                  </div>

                  {/* AI Answer Body */}
                  <div style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
                    <div className="qa-avatar ai">AI</div>
                    <div style={{ flex: 1 }}>
                      <div className="qa-answer-body">
                        <ReactMarkdown>{item.answer}</ReactMarkdown>
                      </div>

                      {/* Sources Accordion */}
                      {item.sources && item.sources.length > 0 && (
                        <div className="sources-accordion" style={{ marginTop: "1rem" }}>
                          <button
                            type="button"
                            className="sources-toggle-btn"
                            onClick={() => toggleSources(index)}
                          >
                            <span>Sources ({item.sources.length} matching sections)</span>
                            {expandedSources[index] ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>

                          {expandedSources[index] && (
                            <div className="sources-list">
                              {item.sources.map((source, sIdx) => (
                                <div key={sIdx} className="source-item">
                                  <span>Chunk #{source.chunkIndex + 1}</span>
                                  <span className="similarity-badge">
                                    Similarity: {Math.round(source.similarity * 100)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
