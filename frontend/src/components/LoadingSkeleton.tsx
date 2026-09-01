import { Loader2 } from 'lucide-react';

interface LoadingProps {
  message?: string;
  subtext?: string;
}

export function AiLoadingState({
  message = "Processing document...",
  subtext
}: LoadingProps) {
  return (
    <div className="ai-loading-container">
      <Loader2 className="w-6 h-6 text-purple animate-spin" />
      <div className="ai-loading-content">
        <h4 className="ai-loading-message">{message}</h4>
        {subtext && <p className="ai-loading-subtext">{subtext}</p>}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line skeleton-text" />
      <div className="skeleton-line skeleton-short" />
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-item">
          <div className="skeleton-avatar" />
          <div className="skeleton-body">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-line skeleton-short" />
          </div>
        </div>
      ))}
    </div>
  );
}
