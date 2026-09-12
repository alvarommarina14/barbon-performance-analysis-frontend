import type { components } from '@barbon-performance-analysis/api-client';
import { formatTimestamp } from '@barbon-performance-analysis/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { HlsVideo } from '../components/HlsVideo';
import { useToast } from '../components/Toast';
import { problemDetail, problemSlug } from '../lib/problem';
import { uid } from '../lib/uid';
import { useNav } from '../nav';
import DrillAssignmentStep from './DrillAssignmentStep';

type AnalysisDetail = components['schemas']['AnalysisDetail'];
type FeedbackState = 'loading' | 'none' | 'processing' | 'errored' | 'ready' | 'published';

interface FindingRow {
  key: string;
  timestampSeconds: number;
  title: string;
  detail: string;
}

export default function AnalysisEditorScreen({ analysisId }: { analysisId: string }) {
  const { navigate, back } = useNav();
  const toast = useToast();
  const queryClient = useQueryClient();

  const analysis = useQuery({
    queryKey: ['analysis', analysisId],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/analyses/{analysisId}', {
        params: { path: { analysisId } },
      });
      if (error || !data) {
        throw new Error('Could not load this analysis');
      }
      return data;
    },
    refetchInterval: (query) => {
      const detail = query.state.data;
      return detail && detail.feedbackVideoAssetId && !detail.feedbackReady ? 3000 : false;
    },
  });

  const feedbackReady = Boolean(analysis.data?.feedbackReady);

  const playback = useQuery({
    queryKey: ['analysis', analysisId, 'playback'],
    enabled: feedbackReady,
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/analyses/{analysisId}/playback', {
        params: { path: { analysisId } },
      });
      if (error || !data) {
        throw new Error('Could not load the feedback video');
      }
      return data;
    },
  });

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [headerDirty, setHeaderDirty] = useState(false);

  const [findings, setFindings] = useState<FindingRow[]>([]);
  const [findingsDirty, setFindingsDirty] = useState(false);

  const [uploadFraction, setUploadFraction] = useState<number | null>(null);
  const [step, setStep] = useState<'marks' | 'drills' | 'details'>('marks');

  const videoRef = useRef<HTMLVideoElement>(null);
  const titleInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const seededHeaderAt = useRef<string | null>(null);
  const seededFindingsAt = useRef<string | null>(null);

  const data = analysis.data;

  useEffect(() => {
    if (!data || headerDirty || seededHeaderAt.current === data.updatedAt) {
      return;
    }
    setTitle(data.title);
    setSummary(data.summary ?? '');
    seededHeaderAt.current = data.updatedAt;
  }, [data, headerDirty]);

  useEffect(() => {
    if (!data || findingsDirty || seededFindingsAt.current === data.updatedAt) {
      return;
    }
    setFindings(
      data.findings.map((finding) => ({
        key: finding.id,
        timestampSeconds: finding.timestampSeconds ?? 0,
        title: finding.title,
        detail: finding.detail ?? '',
      })),
    );
    seededFindingsAt.current = data.updatedAt;
  }, [data, findingsDirty]);

  const status = data?.status;
  const editable = status === 'DRAFT';

  // "Changed" compares against what the server holds, not just whether a field was touched, so
  // adding a mark and removing it again leaves nothing to save.
  const findingsChanged = useMemo(() => {
    const shape = (rows: { timestampSeconds: number; title: string; detail: string }[]) =>
      JSON.stringify(rows.map((row) => [row.timestampSeconds, row.title.trim(), row.detail.trim()]));
    const fromServer = (data?.findings ?? []).map((finding) => ({
      timestampSeconds: finding.timestampSeconds ?? 0,
      title: finding.title,
      detail: finding.detail ?? '',
    }));
    return shape(fromServer) !== shape(findings);
  }, [data?.findings, findings]);

  const feedbackState = feedbackStateOf(data);
  const canEditFindings = editable && feedbackState === 'ready';
  const canPublish =
    editable &&
    feedbackState === 'ready' &&
    findings.length > 0 &&
    !findingsChanged &&
    !headerDirty;

  const cache = (fresh: AnalysisDetail) => queryClient.setQueryData(['analysis', analysisId], fresh);

  const saveHeader = useMutation({
    mutationFn: async () => {
      const { data: fresh, error } = await api.PUT('/api/v1/analyses/{analysisId}', {
        params: { path: { analysisId } },
        body: { title: title.trim(), summary: summary.trim() || undefined },
      });
      if (error || !fresh) {
        throw new Error(publishableMessage(error, 'Could not save'));
      }
      return fresh;
    },
    onSuccess: (fresh) => {
      setHeaderDirty(false);
      cache(fresh);
    },
  });

  const upload = useMutation({
    mutationFn: async () => {
      const picked = await window.barbonAnalysis.pickVideoFile();
      if (!picked) {
        return;
      }
      const { data: intent, error } = await api.POST(
        '/api/v1/analyses/{analysisId}/feedback-upload-intent',
        { params: { path: { analysisId } }, body: { sizeBytes: picked.size } },
      );
      if (error || !intent) {
        throw new Error('Could not start the upload. Try again.');
      }
      setUploadFraction(0);
      await window.barbonAnalysis.uploadFeedback(
        { filePath: picked.path, uploadUrl: intent.uploadUrl },
        setUploadFraction,
      );
    },
    onSettled: () => setUploadFraction(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['analysis', analysisId] }),
  });

  const saveFindings = useMutation({
    mutationFn: async () => {
      const { data: fresh, error } = await api.PUT('/api/v1/analyses/{analysisId}/findings', {
        params: { path: { analysisId } },
        body: {
          findings: findings.map((finding) => ({
            timestampSeconds: finding.timestampSeconds,
            title: finding.title.trim(),
            detail: finding.detail.trim() || undefined,
          })),
        },
      });
      if (error || !fresh) {
        throw new Error(publishableMessage(error, 'Could not save the findings'));
      }
      return fresh;
    },
    onSuccess: (fresh) => {
      setFindingsDirty(false);
      cache(fresh);
    },
  });

  const publish = useMutation({
    mutationFn: async () => {
      const { data: fresh, error } = await api.POST('/api/v1/analyses/{analysisId}/publish', {
        params: { path: { analysisId } },
      });
      if (error || !fresh) {
        throw new Error(publishableMessage(error, 'Could not publish'));
      }
      return fresh;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions', 'queue'] });
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
      toast.show('Analysis published — the player can watch it now.');
      navigate({ name: 'queue' });
    },
  });

  const discard = useMutation({
    mutationFn: async () => {
      const { error } = await api.DELETE('/api/v1/analyses/{analysisId}', {
        params: { path: { analysisId } },
      });
      if (error) {
        throw new Error('Could not discard the analysis');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions', 'queue'] });
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
      toast.show('Draft discarded — the video is back in your queue.');
      navigate({ name: 'queue' });
    },
  });

  function markHere() {
    const seconds = Math.floor(videoRef.current?.currentTime ?? 0);
    const key = uid();
    setFindings((rows) => [...rows, { key, timestampSeconds: seconds, title: '', detail: '' }]);
    setFindingsDirty(true);
    requestAnimationFrame(() => titleInputs.current[key]?.focus());
  }

  function seek(seconds: number) {
    const video = videoRef.current;
    if (video) {
      video.currentTime = seconds;
      void video.play();
    }
  }

  function updateRow(key: string, patch: Partial<FindingRow>) {
    setFindings((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    setFindingsDirty(true);
  }

  function moveRow(key: string, delta: number) {
    setFindings((rows) => {
      const index = rows.findIndex((row) => row.key === key);
      const next = index + delta;
      if (index < 0 || next < 0 || next >= rows.length) {
        return rows;
      }
      const copy = [...rows];
      const [row] = copy.splice(index, 1);
      copy.splice(next, 0, row as FindingRow);
      return copy;
    });
    setFindingsDirty(true);
  }

  function removeRow(key: string) {
    setFindings((rows) => rows.filter((row) => row.key !== key));
    setFindingsDirty(true);
  }

  if (analysis.isPending) {
    return (
      <main className="workspace">
        <p className="lede">Loading…</p>
      </main>
    );
  }

  if (analysis.isError || !data) {
    return (
      <main className="workspace">
        <div className="panel">
          <p className="error">We could not load this analysis.</p>
          <button type="button" className="ghost" onClick={() => navigate({ name: 'queue' })}>
            Back to queue
          </button>
        </div>
      </main>
    );
  }

  const anyFindingBlank = findings.some((finding) => !finding.title.trim());
  const showFindings = feedbackState === 'ready' || feedbackState === 'published';

  return (
    <main className="workspace editor-screen">
      <button
        type="button"
        className="back-link"
        onClick={() =>
          step === 'details'
            ? setStep('drills')
            : step === 'drills'
              ? setStep('marks')
              : back()
        }
      >
        ← {step === 'details' ? 'Drills' : step === 'drills' ? 'Marks' : 'Queue'}
      </button>
      <div className="workspace-header">
        <h1>{data.title}</h1>
        <span className="tier">
          {status === 'PUBLISHED'
            ? `Published ${data.publishedAt ? new Date(data.publishedAt).toLocaleDateString() : ''}`
            : 'Draft'}
        </span>
      </div>

      {step === 'marks' ? (
        <div className="editor">
          <div className="editor-main">
            <div className="panel">
              <p className="section-title">Feedback video</p>
              {feedbackState === 'loading' ? (
                <p className="lede">Loading…</p>
              ) : feedbackState === 'none' ? (
                <>
                  <p className="lede">Upload the edited feedback video (MP4).</p>
                  <button
                    type="button"
                    className="primary"
                    disabled={upload.isPending}
                    onClick={() => upload.mutate()}
                  >
                    {upload.isPending ? 'Uploading…' : 'Choose a video…'}
                  </button>
                  {uploadFraction !== null ? (
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.round(uploadFraction * 100)}%` }}
                      />
                    </div>
                  ) : null}
                  {upload.isError ? <p className="error">{upload.error.message}</p> : null}
                </>
              ) : feedbackState === 'processing' ? (
                <div className="lede" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span className="spinner" />
                  Cloudflare is processing the video…
                </div>
              ) : feedbackState === 'errored' ? (
                <>
                  <p className="error">The feedback video failed to process.</p>
                  <button type="button" className="primary" onClick={() => upload.mutate()}>
                    Upload again
                  </button>
                </>
              ) : playback.isPending ? (
                <p className="lede">Loading video…</p>
              ) : playback.isError ? (
                <p className="error">We could not load the feedback video.</p>
              ) : playback.data ? (
                <HlsVideo ref={videoRef} src={playback.data.hlsUrl} />
              ) : null}
            </div>
          </div>

          <div className="editor-side">
            <div className="panel findings-panel">
              <div className="workspace-header">
                <p className="section-title">Findings</p>
                {canEditFindings ? (
                  <button
                    type="button"
                    className="mark-btn"
                    onClick={markHere}
                    disabled={!playback.data}
                  >
                    Mark here
                  </button>
                ) : null}
              </div>

              {!showFindings ? (
                <p className="lede">Available once the feedback video is ready.</p>
              ) : findings.length === 0 ? (
                <p className="lede">
                  {canEditFindings
                    ? 'Scrub the video and press “Mark here” to add a finding.'
                    : 'No findings.'}
                </p>
              ) : (
                <div className="findings-list">
                  {canEditFindings
                    ? findings.map((row) => (
                        <div className="finding-row" key={row.key}>
                          <button
                            type="button"
                            className="stamp"
                            onClick={() => seek(row.timestampSeconds)}
                          >
                            {formatTimestamp(row.timestampSeconds)}
                          </button>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <input
                              ref={(element) => {
                                titleInputs.current[row.key] = element;
                              }}
                              placeholder="What to fix"
                              value={row.title}
                              onChange={(event) =>
                                updateRow(row.key, { title: event.target.value })
                              }
                            />
                            <textarea
                              className="textarea"
                              placeholder="Detail (optional)"
                              value={row.detail}
                              onChange={(event) =>
                                updateRow(row.key, { detail: event.target.value })
                              }
                            />
                          </div>
                          <div className="finding-actions">
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => moveRow(row.key, -1)}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => moveRow(row.key, 1)}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => removeRow(row.key)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))
                    : findings.map((row) => (
                        <div
                          className="finding-card"
                          key={row.key}
                          onClick={() => seek(row.timestampSeconds)}
                        >
                          <span className="stamp">{formatTimestamp(row.timestampSeconds)}</span>
                          <p>
                            <strong>{row.title}</strong>
                            {row.detail ? ` — ${row.detail}` : ''}
                          </p>
                        </div>
                      ))}
                </div>
              )}

              {canEditFindings ? (
                <div className="findings-foot">
                  <button
                    type="button"
                    className="ghost"
                    disabled={saveFindings.isPending || !findingsChanged || anyFindingBlank}
                    onClick={() => saveFindings.mutate()}
                  >
                    {saveFindings.isPending ? 'Saving…' : 'Save findings'}
                  </button>
                  {anyFindingBlank ? (
                    <p className="lede">Every mark needs a title before it can be saved.</p>
                  ) : null}
                  {saveFindings.isError ? (
                    <p className="error">{saveFindings.error.message}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="primary"
              disabled={editable && findingsChanged}
              onClick={() => setStep('drills')}
            >
              Next: drills →
            </button>
            {editable && findingsChanged ? (
              <p className="lede">Save your marks before moving on.</p>
            ) : null}
          </div>
        </div>
      ) : step === 'drills' ? (
        <>
          <DrillAssignmentStep analysisId={analysisId} editable={editable} />
          <button
            type="button"
            className="primary"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => setStep('details')}
          >
            Next: title &amp; publish →
          </button>
        </>
      ) : (
        <div className="editor-details-step">
          <div className="panel">
            <p className="section-title">Details</p>
            <label className="field">
              <span>Title</span>
              <input
                value={title}
                disabled={!editable}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setHeaderDirty(true);
                }}
              />
            </label>
            <label className="field">
              <span>Summary</span>
              <textarea
                className="textarea"
                value={summary}
                disabled={!editable}
                onChange={(event) => {
                  setSummary(event.target.value);
                  setHeaderDirty(true);
                }}
              />
            </label>
            {editable ? (
              <button
                type="button"
                className="ghost"
                disabled={!headerDirty || saveHeader.isPending}
                onClick={() => saveHeader.mutate()}
              >
                {saveHeader.isPending ? 'Saving…' : 'Save'}
              </button>
            ) : null}
            {saveHeader.isError ? <p className="error">{saveHeader.error.message}</p> : null}
          </div>

          {editable ? (
            <div className="panel">
              <p className="section-title">Publish</p>
              <button
                type="button"
                className="primary"
                disabled={!canPublish || publish.isPending}
                onClick={() => publish.mutate()}
              >
                {publish.isPending ? 'Publishing…' : 'Publish'}
              </button>
              {!canPublish ? (
                <p className="lede">
                  {feedbackState !== 'ready'
                    ? 'Waiting for the feedback video.'
                    : findings.length === 0
                      ? 'Add at least one finding on the marks step.'
                      : findingsChanged
                        ? 'Save your marks first.'
                        : 'Save your changes first.'}
                </p>
              ) : null}
              {publish.isError ? <p className="error">{publish.error.message}</p> : null}

              <button
                type="button"
                className="ghost"
                onClick={() => {
                  if (
                    window.confirm(
                      'Discard this analysis? All marks are lost and the video returns to your queue.',
                    )
                  ) {
                    discard.mutate();
                  }
                }}
              >
                Discard draft
              </button>
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}

function feedbackStateOf(data: AnalysisDetail | undefined): FeedbackState {
  if (!data) {
    return 'loading';
  }
  if (data.status === 'PUBLISHED') {
    return 'published';
  }
  if (!data.feedbackVideoAssetId) {
    return 'none';
  }
  if (data.feedbackVideoStatus === 'ERRORED') {
    return 'errored';
  }
  if (data.feedbackReady) {
    return 'ready';
  }
  return 'processing';
}

function publishableMessage(error: unknown, fallback: string): string {
  const slug = problemSlug(error);
  if (slug === 'feedback-video-not-ready') {
    return 'The feedback video is still processing. Try again in a moment.';
  }
  if (slug === 'analysis-not-editable') {
    return 'This analysis is already published and can no longer be edited.';
  }
  return problemDetail(error) ?? fallback;
}
