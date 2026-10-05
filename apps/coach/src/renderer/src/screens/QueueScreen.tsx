import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { LoadError } from '../components/LoadError';
import { relativeDate } from '../lib/relativeTime';
import { useNav } from '../nav';

export default function QueueScreen() {
  const { navigate } = useNav();

  const queue = useQuery({
    queryKey: ['submissions', 'queue'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/submissions/queue');
      if (error || !data) {
        throw new Error('Could not load the review queue');
      }
      return data;
    },
  });

  const analyses = useQuery({
    queryKey: ['analyses'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/analyses');
      if (error || !data) {
        throw new Error('Could not load your analyses');
      }
      return data;
    },
  });

  const drafts = (analyses.data ?? []).filter((analysis) => analysis.status === 'DRAFT');
  const refreshing = queue.isRefetching || analyses.isRefetching;

  return (
    <main className="workspace">
      <div className="workspace-header">
        <h1>Queue</h1>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            queue.refetch();
            analyses.refetch();
          }}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <h2 className="section-title">To review</h2>
      {queue.isPending ? (
        <p className="lede">Loading…</p>
      ) : queue.isError ? (
        <div className="panel">
          <p className="error" role="alert">We could not load the queue.</p>
          <button type="button" className="ghost" onClick={() => queue.refetch()}>
            Try again
          </button>
        </div>
      ) : queue.data.length === 0 ? (
        <div className="panel">
          <p className="lede">
            Your queue is clear. New videos from your clients show up here once they finish
            processing.
          </p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="clients">
            <thead>
              <tr>
                <th>Player</th>
                <th>Received</th>
                <th>Note</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {queue.data.map((submission) => (
                <tr key={submission.id}>
                  <td className="strong">{submission.playerName}</td>
                  <td>{relativeDate(submission.recordedAt ?? submission.createdAt)}</td>
                  <td>{truncate(submission.playerNote)}</td>
                  <td>
                    <button
                      type="button"
                      className="primary"
                      onClick={() => navigate({ name: 'review', submission })}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="section-title">Drafts in progress</h2>
      {analyses.isError ? (
        <LoadError message="We could not load your drafts." onRetry={() => analyses.refetch()} />
      ) : analyses.isPending ? (
        <p className="lede">Loading…</p>
      ) : drafts.length === 0 ? (
        <div className="panel">
          <p className="lede">No drafts. Start one from a video in the queue.</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="clients">
            <thead>
              <tr>
                <th>Title</th>
                <th>Player</th>
                <th>Feedback</th>
                <th>Marks</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {drafts.map((analysis) => (
                <tr key={analysis.id}>
                  <td className="strong">{analysis.title}</td>
                  <td>{analysis.playerName}</td>
                  <td>
                    <span className="tier">{analysis.feedbackReady ? 'Ready' : 'Processing'}</span>
                  </td>
                  <td>{analysis.findingCount ?? 0}</td>
                  <td>
                    <button
                      type="button"
                      className="primary"
                      onClick={() => navigate({ name: 'editor', analysisId: analysis.id })}
                    >
                      Continue
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function truncate(text: string | undefined, max = 80): string {
  if (!text) {
    return '—';
  }
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
