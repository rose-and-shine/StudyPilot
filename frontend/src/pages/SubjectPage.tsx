import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  File,
  X,
  Plus,
  ChevronRight,
  ArrowRight,
  Loader2
} from "lucide-react";
import {
  getDocuments,
  createDocument,
  uploadDocument,
} from "../api/documents";
import { getSubjectById } from "../api/subjects";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { EmptyState } from "../components/EmptyState";
import { ListSkeleton } from "../components/LoadingSkeleton";
import type { DocumentSummary } from "../types";

export function SubjectPage() {
  const navigate = useNavigate();
  const { subjectId } = useParams();
  const { token } = useAuth();
  const { showToast } = useToast();

  const [subjectName, setSubjectName] = useState("");
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [title, setTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const subjectIdValue = useMemo(() => subjectId ?? "", [subjectId]);

  const loadData = async () => {
    if (!token || !subjectIdValue) {
      navigate("/login", { replace: true });
      return;
    }

    setIsLoading(true);
    try {
      const [subject, documentList] = await Promise.all([
        getSubjectById(token, subjectIdValue),
        getDocuments(token),
      ]);

      setSubjectName(subject.name ?? "Subject");
      setDocuments(
        documentList.filter(
          (document) => document.subject?.id === subjectIdValue
        )
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load subject data.";
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [navigate, subjectIdValue, token]);

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      showToast("Only PDF documents are supported.", "error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast("File size exceeds the 10MB limit.", "error");
      return;
    }

    setSelectedFile(file);
    if (!title.trim()) {
      const cleaned = file.name.replace(/\.pdf$/i, "").replace(/[_-]/g, " ");
      setTitle(cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleCreateAndUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !title.trim() || !subjectIdValue) return;

    setIsUploading(true);
    try {
      const createdDoc = await createDocument(token, title.trim(), subjectIdValue);

      if (selectedFile) {
        await uploadDocument(token, createdDoc.id, selectedFile);
        showToast("PDF uploaded and processed.", "success");
      } else {
        showToast("Document created.", "success");
      }

      setTitle("");
      setSelectedFile(null);
      navigate(`/documents/${createdDoc.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to upload document.";
      showToast(message, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="subject-page">
      {/* Header with Breadcrumbs */}
      <div>
        <div className="breadcrumbs">
          <Link to="/" className="breadcrumb-link">
            Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="breadcrumb-current">{subjectName || "Subject"}</span>
        </div>

        <div className="page-header">
          <div>
            <div className="eyebrow">
              <span>Subject</span>
            </div>
            <h1>{subjectName || "Subject"}</h1>
          </div>
          <Link to="/" className="secondary-button">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>

      <div className="subject-layout-grid">
        {/* Left: Upload & Document Creator */}
        <div className="upload-zone-panel">
          <div>
            <h3>Add Document</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              Upload your study PDF.
            </p>
          </div>

          <form onSubmit={handleCreateAndUpload} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="input-group">
              <label className="input-label" htmlFor="doc-title">
                Document Title
              </label>
              <input
                id="doc-title"
                type="text"
                className="input-field"
                placeholder="e.g. Chapter 1 - Introduction"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">PDF File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                style={{ display: "none" }}
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />

              {selectedFile ? (
                <div className="selected-file-preview">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0 }}>
                    <File className="w-5 h-5 text-purple" />
                    <div style={{ minWidth: 0 }}>
                      <div className="selected-file-name">{selectedFile.name}</div>
                      <div className="selected-file-size">{formatFileSize(selectedFile.size)}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="icon-button"
                    style={{ width: "1.75rem", height: "1.75rem" }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  className={`file-dropzone ${isDragActive ? "drag-active" : ""}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="file-dropzone-icon">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, color: "var(--purple)" }}>
                      Choose a PDF
                    </span>{" "}
                    or drag & drop
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                    Up to 10MB
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={isUploading || !title.trim()}
              style={{ marginTop: "0.5rem" }}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add Document</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Documents List */}
        <div className="documents-list-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3>Documents</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                {documents.length} {documents.length === 1 ? "document" : "documents"}
              </p>
            </div>
          </div>

          {isLoading ? (
            <ListSkeleton count={3} />
          ) : documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents yet"
              description="Upload a study PDF on the left to get started."
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {documents.map((doc) => (
                <div key={doc.id} className="document-card-item">
                  <div className="document-item-left">
                    <div className="document-item-icon">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="document-item-info">
                      <div className="document-item-title">{doc.title}</div>
                      <div className="document-item-meta">
                        <span className="version-badge">v1</span>
                        <span>• Added {new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/documents/${doc.id}`}
                    className="primary-button"
                    style={{ padding: "0.55rem 1rem", fontSize: "0.85rem" }}
                  >
                    <span>Open Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
