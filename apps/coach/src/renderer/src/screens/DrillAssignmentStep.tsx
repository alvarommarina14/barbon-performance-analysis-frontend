import type { components } from '@barbon-performance-analysis/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { LoadError } from '../components/LoadError';
import { DrillThumb } from '../components/DrillThumb';
import { cx } from '../lib/cx';
import { problemDetail } from '../lib/problem';

type LibraryItem = components['schemas']['LibraryItemView'];
type DrillCategory = LibraryItem['category'];

const CATEGORIES: DrillCategory[] = ['FOREHAND', 'BACKHAND', 'SERVE', 'MOVEMENT', 'FITNESS'];
const label = (c: DrillCategory) => c.charAt(0) + c.slice(1).toLowerCase();

interface Row {
  libraryItemId: string;
  title: string;
  category: DrillCategory;
  coachNote: string;
}

interface DrillsState {
  changed: boolean;
  count: number;
}

export default function DrillAssignmentStep({
  analysisId,
  editable,
  onStateChange,
  attemptedNext,
}: {
  analysisId: string;
  editable: boolean;
  onStateChange?: (state: DrillsState) => void;
  attemptedNext?: boolean;
}) {
  const queryClient = useQueryClient();

  const assigned = useQuery({
    queryKey: ['drills', 'analysis', analysisId],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/drills/assignments', {
        params: { query: { analysisId } },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the drills');
      }
      return data;
    },
  });

  const library = useQuery({
    queryKey: ['drills', 'library'],
    enabled: editable,
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/drills/library');
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the drill library');
      }
      return data;
    },
  });

  const [rows, setRows] = useState<Row[]>([]);
  const [dirty, setDirty] = useState(false);
  const [pickerCategory, setPickerCategory] = useState<DrillCategory | 'ALL'>('ALL');
  const seededAt = useMemo(
    () => assigned.data?.map((a) => a.id).join(','),
    [assigned.data],
  );

  useEffect(() => {
    if (!assigned.data || dirty) {
      return;
    }
    setRows(
      assigned.data.map((a) => ({
        libraryItemId: a.libraryItemId,
        title: a.title,
        category: a.category,
        coachNote: a.coachNote ?? '',
      })),
    );
  }, [seededAt, assigned.data, dirty]);

  const changed = useMemo(() => {
    const server = (assigned.data ?? []).map((a) => [a.libraryItemId, a.coachNote?.trim() ?? '']);
    const current = rows.map((r) => [r.libraryItemId, r.coachNote.trim()]);
    return JSON.stringify(server) !== JSON.stringify(current);
  }, [assigned.data, rows]);

  useEffect(() => {
    onStateChange?.({ changed, count: rows.length });
  }, [changed, rows.length, onStateChange]);

  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.PUT('/api/v1/drills/analyses/{analysisId}/assignments', {
        params: { path: { analysisId } },
        body: { drills: rows.map((r) => ({ libraryItemId: r.libraryItemId, coachNote: r.coachNote.trim() || undefined })) },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not save the drills');
      }
      return data;
    },
    onSuccess: (data) => {
      setDirty(false);
      queryClient.setQueryData(['drills', 'analysis', analysisId], data);
    },
  });

  function add(item: LibraryItem) {
    if (rows.some((r) => r.libraryItemId === item.id)) {
      return;
    }
    setRows((prev) => [
      ...prev,
      { libraryItemId: item.id, title: item.title, category: item.category, coachNote: '' },
    ]);
    setDirty(true);
  }

  function update(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.libraryItemId === id ? { ...r, ...patch } : r)));
    setDirty(true);
  }

  function move(id: string, delta: number) {
    setRows((prev) => {
      const i = prev.findIndex((r) => r.libraryItemId === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= prev.length) {
        return prev;
      }
      const copy = [...prev];
      const [row] = copy.splice(i, 1);
      copy.splice(j, 0, row as Row);
      return copy;
    });
    setDirty(true);
  }

  function remove(id: string) {
    setRows((prev) => prev.filter((r) => r.libraryItemId !== id));
    setDirty(true);
  }

  const pickable = (library.data ?? []).filter(
    (item) => pickerCategory === 'ALL' || item.category === pickerCategory,
  );

  if (assigned.isError) {
    return <LoadError message={assigned.error.message} onRetry={() => assigned.refetch()} />;
  }

  return (
    <div className="editor">
      <div className="editor-main">
        <div className="panel findings-panel">
          <h2 className="section-title">Assigned drills</h2>
          {rows.length === 0 ? (
            <>
              <p className="lede">
                {editable
                  ? 'Pick drills from the library on the right. They show up on the player’s analysis.'
                  : 'No drills on this analysis.'}
              </p>
              {editable ? <p className="error">No drills added — the player won’t get any exercises.</p> : null}
            </>
          ) : null}
          {rows.length > 0 ? (
            <div className="findings-list">
              {rows.map((row) => (
                <div className="finding-row" key={row.libraryItemId}>
                  <span className="tier">{label(row.category)}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <strong>{row.title}</strong>
                    {editable ? (
                      <label className="field">
                        <span>Note for the player (optional)</span>
                        <textarea
                          className="textarea"
                          value={row.coachNote}
                          onChange={(e) => update(row.libraryItemId, { coachNote: e.target.value })}
                        />
                      </label>
                    ) : row.coachNote ? (
                      <p className="lede">{row.coachNote}</p>
                    ) : null}
                  </div>
                  {editable ? (
                    <div className="finding-actions">
                      <button type="button" className="ghost" aria-label={`Move ${row.title} up`} onClick={() => move(row.libraryItemId, -1)}>
                        ↑
                      </button>
                      <button type="button" className="ghost" aria-label={`Move ${row.title} down`} onClick={() => move(row.libraryItemId, 1)}>
                        ↓
                      </button>
                      <button type="button" className="ghost" aria-label={`Remove ${row.title}`} onClick={() => remove(row.libraryItemId)}>
                        Remove
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          {editable ? (
            <div className="findings-foot">
              <button
                type="button"
                className="primary"
                disabled={save.isPending || !changed}
                onClick={() => save.mutate()}
              >
                {save.isPending ? 'Saving…' : 'Save drills'}
              </button>
              {changed && !save.isPending && attemptedNext ? (
                <p className="error" role="alert">You have unsaved drill changes.</p>
              ) : null}
              {save.isError ? <p className="error" role="alert">{save.error.message}</p> : null}
            </div>
          ) : null}
        </div>
      </div>

      {editable ? (
        <div className="editor-side">
          <div className="panel findings-panel">
            <h2 className="section-title">Drill library</h2>
            <div className="tabs">
              <button
                type="button"
                className={cx('tab', pickerCategory === 'ALL' && 'on')}
                aria-pressed={pickerCategory === 'ALL'}
                onClick={() => setPickerCategory('ALL')}
              >
                All
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cx('tab', pickerCategory === c && 'on')}
                  aria-pressed={pickerCategory === c}
                  onClick={() => setPickerCategory(c)}
                >
                  {label(c)}
                </button>
              ))}
            </div>
            {library.isError ? (
              <LoadError message={library.error.message} onRetry={() => library.refetch()} />
            ) : library.isPending ? (
              <p className="lede">Loading…</p>
            ) : pickable.length === 0 ? (
              <p className="lede">Nothing here — add drills from the Library tab.</p>
            ) : (
              <div className="findings-list">
                {pickable.map((item) => {
                  const added = rows.some((r) => r.libraryItemId === item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={cx('drill-pick', added && 'is-added')}
                      disabled={added}
                      onClick={() => add(item)}
                    >
                      <span className="drill-pick-thumb">
                        <DrillThumb
                          libraryItemId={item.id}
                          thumbnailUrl={item.thumbnailUrl}
                          ready={item.videoStatus === 'READY'}
                        />
                      </span>
                      <span className="drill-pick-body">
                        <span className="tier">{label(item.category)}</span>
                        <strong>{item.title}</strong>
                        {item.cue ? <span className="drill-cue">{item.cue}</span> : null}
                        <span className="drill-pick-add">{added ? 'Added' : '+ Add'}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
