import type { components } from '@barbon-performance-analysis/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client';
import { HlsVideo } from '../components/HlsVideo';
import { problemDetail, problemSlug } from '../lib/problem';
import { relativeDate } from '../lib/relativeTime';
import { useNav } from '../nav';

type SubmissionSummary = components['schemas']['SubmissionSummary'];

export default function ReviewScreen({ submission }: { submission: SubmissionSummary }) {
  const { navigate, back } = useNav();
  const queryClient = useQueryClient();

  const recordedDate = new Date(submission.recordedAt ?? submission.createdAt).toLocaleDateString();
  const [title, setTitle] = useState(`${submission.playerName} - ${recordedDate}`);
  const [summary, setSummary] = useState('');
  const [wantsDownload, setWantsDownload] = useState(false);
  const [alreadyAnalysed, setAlreadyAnalysed] = useState(false);

  const playback = useQuery({
    queryKey: ['video', submission.videoAssetId, 'playback'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/videos/{videoAssetId}/playback', {
        params: { path: { videoAssetId: submission.videoAssetId } },
      });
      if (error || !data) {
        throw new Error('Could not load the video');
      }
      return data;
    },
  });

  const download = useQuery({
    queryKey: ['video', submission.videoAssetId, 'download'],
    enabled: wantsDownload,
    refetchInterval: (query) => (query.state.data && !query.state.data.ready ? 3000 : false),
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/videos/{videoAssetId}/download-url', {
        params: { path: { videoAssetId: submission.videoAssetId } },
      });
      if (error || !data) {
        throw new Error('Could not prepare the download');
      }
      return data;
    },
  });

  const start = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST('/api/v1/analyses', {
        body: {
          submissionId: submission.id,
          title: title.trim(),
          summary: summary.trim() || undefined,
        },
      });
      if (error || !data) {
        if (problemSlug(error) === 'conflict') {
          setAlreadyAnalysed(true);
        }
        throw new Error(problemDetail(error) ?? 'Could not start the analysis');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['submissions', 'queue'] });
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
      navigate({ name: 'editor', analysisId: data.id });
    },
  });

  return (
    <main className="workspace review-screen">
      <button type="button" className="back-link" onClick={back}>
        ← Queue
      </button>
      <div className="workspace-header">
        <div>
          <h1>{submission.playerName}</h1>
          <p className="lede">
            {relativeDate(submission.recordedAt ?? submission.createdAt)}
          </p>
        </div>
      </div>

      <div className="editor">
        <div className="editor-main">
          <div className="panel">
            {playback.isPending ? (
              <p className="lede">Loading video…</p>
            ) : playback.isError ? (
              <>
                <p className="error">We could not load the video.</p>
                <button type="button" className="ghost" onClick={() => playback.refetch()}>
                  Try again
                </button>
              </>
            ) : (
              <HlsVideo src={playback.data.hlsUrl} />
            )}
            {submission.playerNote ? (
              <p className="lede">“{submission.playerNote}”</p>
            ) : null}
          </div>
        </div>

        <div className="editor-side">
          <div className="panel">
            <p className="section-title">Edit the video</p>
            <p className="lede">Pull the original into your editor, then upload the cut on the next step.</p>
            {!wantsDownload ? (
              <button type="button" className="ghost" onClick={() => setWantsDownload(true)}>
                Download the original
              </button>
            ) : download.isError ? (
              <>
                <p className="error">We could not prepare the download.</p>
                <button type="button" className="ghost" onClick={() => download.refetch()}>
                  Try again
                </button>
              </>
            ) : download.data?.ready ? (
              <a className="primary" href={download.data.url} target="_blank" rel="noreferrer">
                Download
              </a>
            ) : (
              <p className="lede">Preparing the download…</p>
            )}
          </div>

          <div className="panel">
            <p className="section-title">Start the analysis</p>
            <label className="field">
              <span>Title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="field">
              <span>Summary (optional)</span>
              <textarea
                className="textarea"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
              />
            </label>

            {alreadyAnalysed ? (
              <p className="error">
                This video already has an analysis — find it under “Drafts in progress”.
              </p>
            ) : start.isError ? (
              <p className="error">{start.error.message}</p>
            ) : null}

            <button
              type="button"
              className="primary"
              disabled={start.isPending || !title.trim()}
              onClick={() => start.mutate()}
            >
              {start.isPending ? 'Starting…' : 'Start the analysis'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
