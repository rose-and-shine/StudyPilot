import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FolderPlus,
  Search,
  BookOpen,
  FileText,
  Trash2,
  ArrowRight,
  Plus
} from "lucide-react";
import { createSubject, getSubjects, deleteSubject } from "../api/subjects";
import { getDocuments } from "../api/documents";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Modal } from "../components/Modal";
import { EmptyState } from "../components/EmptyState";
import { CardSkeleton } from "../components/LoadingSkeleton";
import type { Subject, DocumentSummary } from "../types";

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Create Subject Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Delete Subject Modal State
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const loadData = async () => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setIsLoading(true);
    try {
      const [subjectsData, documentsData] = await Promise.all([
        getSubjects(token),
        getDocuments(token).catch(() => []),
      ]);
      setSubjects(subjectsData);
      setDocuments(documentsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load dashboard data.";
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [navigate, token]);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim() || !token) return;
    setIsCreating(true);

    try {
      const created = await createSubject(token, newSubjectName.trim());
      setSubjects((prev) => [created, ...prev]);
      setNewSubjectName("");
      setIsCreateModalOpen(false);
      showToast(`Subject "${created.name}" created.`, "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create subject.";
      showToast(message, "error");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSubject = async () => {
    if (!subjectToDelete || !token) return;
    setIsDeleting(true);

    try {
      await deleteSubject(token, subjectToDelete.id);
      setSubjects((prev) => prev.filter((s) => s.id !== subjectToDelete.id));
      showToast(`Subject "${subjectToDelete.name}" removed.`, "info");
      setSubjectToDelete(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete subject.";
      showToast(message, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Map document counts per subject
  const documentCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const doc of documents) {
      if (doc.subject?.id) {
        map.set(doc.subject.id, (map.get(doc.subject.id) || 0) + 1);
      }
    }
    return map;
  }, [documents]);

  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects;
    return subjects.filter((s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [subjects, searchQuery]);

  return (
    <div className="dashboard-page">
      {/* Greeting Banner */}
      <div className="greeting-banner">
        <div className="greeting-text">
          <div className="eyebrow">
            <span>Workspace</span>
          </div>
          <h1>
            {greeting}, {user?.name ? user.name.split(" ")[0] : "Student"}
          </h1>
          <p>Select a subject to view and study your documents.</p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="w-4 h-4" />
          <span>New Subject</span>
        </button>
      </div>

      {/* Stats Strip */}
      <div className="dashboard-stats-strip" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper purple">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{subjects.length}</span>
            <span className="stat-label">Subjects</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper lavender">
            <FileText className="w-5 h-5" />
          </div>
          <div className="stat-info">
            <span className="stat-value">{documents.length}</span>
            <span className="stat-label">Documents</span>
          </div>
        </div>
      </div>

      {/* Subjects Section */}
      <section>
        <div className="section-controls-row">
          <div>
            <h2>My Subjects</h2>
          </div>
          <div className="search-box">
            <div className="input-field-wrap">
              <Search className="input-field-icon w-4 h-4" />
              <input
                type="text"
                className="input-field has-icon"
                placeholder="Search subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="subject-grid">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : filteredSubjects.length === 0 ? (
          searchQuery ? (
            <EmptyState
              icon={Search}
              title="No matching subjects"
              description={`No subjects found matching "${searchQuery}".`}
              action={
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setSearchQuery("")}
                >
                  Clear Search
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={FolderPlus}
              title="No subjects yet"
              description="Create your first subject to start organizing your study materials."
              action={
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Subject</span>
                </button>
              }
            />
          )
        ) : (
          <div className="subject-grid">
            {filteredSubjects.map((subject) => {
              const docCount = documentCountMap.get(subject.id) || 0;
              return (
                <div key={subject.id} className="subject-card">
                  <div>
                    <div className="subject-card-top">
                      <div className="subject-card-icon">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <button
                        type="button"
                        className="subject-card-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setSubjectToDelete(subject);
                        }}
                        title="Delete subject"
                        aria-label="Delete subject"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="subject-card-title">{subject.name}</h3>
                    <div className="subject-card-meta">
                      Created {new Date(subject.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="subject-card-bottom">
                    <span className="document-count-pill">
                      <FileText className="w-3.5 h-3.5 text-purple" />
                      <span>{docCount} {docCount === 1 ? "document" : "documents"}</span>
                    </span>
                    <Link
                      to={`/subjects/${subject.id}`}
                      className="open-subject-arrow"
                    >
                      <span>Open</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Documents Section */}
      {documents.length > 0 && (
        <section style={{ marginTop: "1rem" }}>
          <div className="section-controls-row">
            <h2>Recent Documents</h2>
          </div>
          <div className="panel" style={{ padding: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {documents.slice(0, 4).map((doc) => (
                <div
                  key={doc.id}
                  className="document-card-item"
                  style={{ background: "#ffffff" }}
                >
                  <div className="document-item-left">
                    <div className="document-item-icon">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="document-item-info">
                      <div className="document-item-title">{doc.title}</div>
                      <div className="document-item-meta">
                        <span className="subject-badge">{doc.subject?.name}</span>
                        <span>• Added {new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/documents/${doc.id}`}
                    className="primary-button"
                    style={{ padding: "0.45rem 0.95rem", fontSize: "0.82rem" }}
                  >
                    <span>Open Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Create Subject Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Subject"
        description="Add a new topic to organize your documents."
      >
        <form onSubmit={handleCreateSubject} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="input-group">
            <label className="input-label" htmlFor="new-subject-name">
              Subject Name
            </label>
            <input
              id="new-subject-name"
              type="text"
              className="input-field"
              placeholder="e.g. Operating Systems, DBMS"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={isCreating || !newSubjectName.trim()}
            >
              {isCreating ? "Creating..." : "Create Subject"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Subject Confirmation Modal */}
      <Modal
        isOpen={Boolean(subjectToDelete)}
        onClose={() => setSubjectToDelete(null)}
        title="Delete Subject"
        description={`Are you sure you want to delete "${subjectToDelete?.name}"? All associated documents will also be deleted.`}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setSubjectToDelete(null)}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            style={{ background: "#C0392B" }}
            onClick={handleDeleteSubject}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Subject"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
