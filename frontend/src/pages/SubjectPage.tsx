import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getDocumentById,
  getDocuments,
  createDocument,
  uploadDocument,
} from "../api/documents";
import { getSubjectById } from "../api/subjects";
import { useAuth } from "../context/AuthContext";
import type { DocumentSummary } from "../types";

export function SubjectPage() {
  const navigate = useNavigate();
  const { subjectId } = useParams();
  const { token } = useAuth();
  const [subjectName, setSubjectName] = useState("");
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const subjectIdValue = useMemo(() => subjectId ?? "", [subjectId]);

  useEffect(() => {
    if (!token || !subjectIdValue) {
      navigate("/login", { replace: true });
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError("");
      try {
        const [subject, documentList] = await Promise.all([
          getSubjectById(token, subjectIdValue),
          getDocuments(token),
        ]);

        setSubjectName(subject.name ?? "Subject");
        setDocuments(
          documentList.filter(
            (document) => document.subject.id === subjectIdValue,
          ),
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load subject data.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [navigate, subjectIdValue, token]);

  const handleCreateDocument = async () => {
    if (!token || !title.trim() || !subjectIdValue) return;
    setIsSubmitting(true);
    setError("");

    try {
      const createdDocument = await createDocument(
        token,
        title.trim(),
        subjectIdValue,
      );
      const docId = createdDocument.id;

      if (file) {
        await uploadDocument(token, docId, file);
      }

      const detail = await getDocumentById(token, docId);
      const nextDocs = await getDocuments(token);
      setDocuments(
        nextDocs.filter((document) => document.subject.id === subjectIdValue),
      );
      setTitle("");
      setFile(null);

      navigate(`/documents/${detail.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create document.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="subject-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Subject</p>
          <h1>{subjectName || "Subject"}</h1>
        </div>
        <Link to="/" className="secondary-button">
          Back to dashboard
        </Link>
      </div>

      <div className="panel">
        <div className="column-layout">
          <div className="document-form-box">
            <h3>Create document</h3>
            <label>
              <span>Document title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Computer Networks"
              />
            </label>

            <label>
              <span>Upload PDF</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>

            {error && <div className="error-box">{error}</div>}

            <button
              type="button"
              className="primary-button"
              onClick={handleCreateDocument}
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting ? "Creating document..." : "Create document"}
            </button>
          </div>

          <div className="documents-list-box">
            <h3>Documents</h3>

            {isLoading ? (
              <div className="loading-box">Loading documents...</div>
            ) : documents.length === 0 ? (
              <div className="empty-box">
                <p>No documents yet.</p>
                <p>Upload your first study PDF to get started.</p>
              </div>
            ) : (
              <div className="document-list">
                {documents.map((document) => (
                  <Link
                    key={document.id}
                    to={`/documents/${document.id}`}
                    className="document-item"
                  >
                    <div>
                      <strong>{document.title}</strong>
                      <small>{document.subject.name}</small>
                    </div>
                    <span>
                      {new Date(document.createdAt).toLocaleDateString()}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
