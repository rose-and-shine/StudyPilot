import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createSubject, getSubjects } from '../api/subjects';
import { useAuth } from '../context/AuthContext';
import type { Subject } from '../types';

export function DashboardPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    const loadSubjects = async () => {
      setIsLoading(true);
      try {
        const data = await getSubjects(token);
        setSubjects(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load subjects.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSubjects();
  }, [navigate, token]);

  const handleCreateSubject = async () => {
    if (!name.trim() || !token) return;
    setIsCreating(true);
    setError('');

    try {
      const created = await createSubject(token, name.trim());
      setSubjects((current) => [created, ...current]);
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create subject.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>What do you want to study today?</h1>
        </div>
      </div>

      <div className="panel subject-creator">
        <div className="inline-create">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Create a subject"
            aria-label="Subject name"
          />
          <button type="button" className="primary-button" onClick={handleCreateSubject} disabled={isCreating || !name.trim()}>
            {isCreating ? 'Creating...' : '+ Create Subject'}
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <section className="panel">
        <div className="section-title-row">
          <h2>My Subjects</h2>
        </div>

        {isLoading ? (
          <div className="loading-box">Loading your subjects...</div>
        ) : subjects.length === 0 ? (
          <div className="empty-box">
            <p>No subjects yet.</p>
            <p>Create your first subject to organize your study materials.</p>
          </div>
        ) : (
          <div className="subject-grid">
            {subjects.map((subject) => (
              <Link key={subject.id} to={`/subjects/${subject.id}`} className="subject-card">
                <h3>{subject.name}</h3>
                <span>Open subject</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
