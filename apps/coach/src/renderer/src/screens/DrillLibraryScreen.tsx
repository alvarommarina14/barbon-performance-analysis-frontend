import type { components } from '@barbon-performance-analysis/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import { VideoLoader } from '../components/VideoLoader';
import { problemDetail, problemSlug } from '../lib/problem';

type LibraryItem = components['schemas']['LibraryItemView'];
type DrillCategory = components['schemas']['LibraryItemView']['category'];

const CATEGORIES: DrillCategory[] = ['FOREHAND', 'BACKHAND', 'SERVE', 'MOVEMENT', 'FITNESS'];

const label = (c: DrillCategory) => c.charAt(0) + c.slice(1).toLowerCase();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface Draft {
  videoAssetId: string | null;
  title: string;
  cue: string;
  category: DrillCategory;
}

export default function DrillLibraryScreen() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const library = useQuery({
    queryKey: ['drills', 'library'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/drills/library');
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the drill library');
      }
      return data;
    },
  });

  const [draft, setDraft] = useState<Draft | null>(null);
  const [uploadFraction, setUploadFraction] = useState<number | null>(null);
  const [editing, setEditing] = useState<LibraryItem | null>(null);

  const pickAndUpload = useMutation({
    mutationFn: async () => {
      const picked = await window.barbonAnalysis.pickVideoFile();
      if (!picked) {
        return;
      }
      const { data, error } = await api.POST('/api/v1/drills/library/upload-intent', {
        body: { sizeBytes: picked.size },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not start the upload');
      }
      setDraft((prev) => (prev ? { ...prev, videoAssetId: data.videoAssetId } : prev));
      setUploadFraction(0);
      // The IPC bridge is generic (filePath + uploadUrl); it streams from disk in the main process.
      await window.barbonAnalysis.uploadFeedback(
        { filePath: picked.path, uploadUrl: data.uploadUrl },
        setUploadFraction,
      );
    },
    onSettled: () => setUploadFraction(null),
  });

  const createItem = useMutation({
    mutationFn: async (d: { videoAssetId: string; title: string; cue: string; category: DrillCategory }) => {
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const { data, error } = await api.POST('/api/v1/drills/library', {
          body: {
            videoAssetId: d.videoAssetId,
            title: d.title.trim(),
            cue: d.cue.trim() || undefined,
            category: d.category,
          },
        });
        if (data) {
          return;
        }
        if (problemSlug(error) === 'video-not-ready') {
          await sleep(2000);
          continue;
        }
        throw new Error(problemDetail(error) ?? 'Could not add the drill');
      }
      throw new Error('The video is taking too long to process. Try again in a moment.');
    },
    onSuccess: () => {
      setDraft(null);
      queryClient.invalidateQueries({ queryKey: ['drills', 'library'] });
    },
  });

  const saveEdit = useMutation({
    mutationFn: async (item: LibraryItem) => {
      const { error } = await api.PUT('/api/v1/drills/library/{itemId}', {
        params: { path: { itemId: item.id } },
        body: { title: item.title.trim(), cue: item.cue?.trim() || undefined, category: item.category },
      });
      if (error) {
        throw new Error(problemDetail(error) ?? 'Could not save');
      }
    },
    onSuccess: () => {
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['drills', 'library'] });
    },
  });

  const remove = useMutation({
    mutationFn: async (itemId: string) => {
      const { response } = await api.DELETE('/api/v1/drills/library/{itemId}', {
        params: { path: { itemId } },
      });
      if (!response.ok) {
        throw new Error(
          response.status === 409
            ? 'That drill is still assigned to a player — remove it there first.'
            : 'Could not delete the drill',
        );
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drills', 'library'] }),
    onError: (err) => toast.show(err instanceof Error ? err.message : 'Could not delete the drill'),
  });

  return (
    <main className="workspace">
      <div className="workspace-header">
        <h1>Drill library</h1>
        <button
          type="button"
          className="primary"
          disabled={draft !== null}
          onClick={() => setDraft({ videoAssetId: null, title: '', cue: '', category: 'FOREHAND' })}
        >
          Add a drill
        </button>
      </div>

      {library.isPending ? (
        <p className="lede">Loading…</p>
      ) : library.isError ? (
        <div className="panel">
          <p className="error">We could not load the drill library.</p>
          <button type="button" className="ghost" onClick={() => library.refetch()}>
            Try again
          </button>
        </div>
      ) : library.data.length === 0 ? (
        <p className="lede">No drills yet. Add one to start building your library.</p>
      ) : (
        <div className="drill-grid">
          {library.data.map((item) =>
            editing?.id === item.id ? (
              <div className="panel" key={item.id}>
                <label className="field">
                  <span>Title</span>
                  <input
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Cue</span>
                  <input
                    value={editing.cue ?? ''}
                    onChange={(e) => setEditing({ ...editing, cue: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Category</span>
                  <select
                    value={editing.category}
                    onChange={(e) =>
                      setEditing({ ...editing, category: e.target.value as DrillCategory })
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {label(c)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="button-row">
                  <button
                    type="button"
                    className="primary"
                    disabled={saveEdit.isPending || !editing.title.trim()}
                    onClick={() => saveEdit.mutate(editing)}
                  >
                    Save
                  </button>
                  <button type="button" className="ghost" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="drill-card" key={item.id}>
                <div className="drill-thumb">
                  {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" /> : null}
                  {item.videoStatus !== 'READY' ? (
                    <span className="drill-status">Processing…</span>
                  ) : item.durationSeconds ? (
                    <span className="drill-dur">
                      {Math.floor(item.durationSeconds / 60)}:
                      {String(item.durationSeconds % 60).padStart(2, '0')}
                    </span>
                  ) : null}
                </div>
                <div className="drill-body">
                  <span className="tier">{label(item.category)}</span>
                  <h5>{item.title}</h5>
                  {item.cue ? <p className="drill-cue">{item.cue}</p> : null}
                  <div className="drill-actions">
                    <button type="button" className="ghost" onClick={() => setEditing(item)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {draft ? (
        <div className="modal-overlay">
          <div className="panel modal">
            <p className="section-title">New drill</p>
            <label className="field">
              <span>Title</span>
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Cue</span>
              <input value={draft.cue} onChange={(e) => setDraft({ ...draft, cue: e.target.value })} />
            </label>
            <label className="field">
              <span>Category</span>
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as DrillCategory })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {label(c)}
                  </option>
                ))}
              </select>
            </label>

            {uploadFraction !== null ? (
              <div className="video-frame-wrap modal-video">
                <div className="video-frame" />
                <VideoLoader fraction={uploadFraction} label="Uploading the drill video…" />
              </div>
            ) : (
              <button type="button" className="ghost" onClick={() => pickAndUpload.mutate()}>
                {draft.videoAssetId ? 'Replace video' : 'Select video'}
              </button>
            )}
            {pickAndUpload.isError ? (
              <p className="error">{pickAndUpload.error.message}</p>
            ) : null}

            <div className="button-row">
              <button
                type="button"
                className="primary"
                disabled={
                  createItem.isPending ||
                  uploadFraction !== null ||
                  !draft.videoAssetId ||
                  !draft.title.trim()
                }
                onClick={() => {
                  if (!draft.videoAssetId) {
                    return;
                  }
                  createItem.mutate({ ...draft, videoAssetId: draft.videoAssetId });
                }}
              >
                {createItem.isPending ? 'Saving…' : 'Add to library'}
              </button>
              <button
                type="button"
                className="ghost"
                disabled={createItem.isPending}
                onClick={() => setDraft(null)}
              >
                Cancel
              </button>
            </div>
            {createItem.isError ? <p className="error">{createItem.error.message}</p> : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
