import type { components } from '@barbon-performance-analysis/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { cx } from '../lib/cx';
import { problemDetail } from '../lib/problem';

type LibraryItem = components['schemas']['LibraryItemView'];

interface Row {
  id: string | null;
  libraryItemId: string;
  title: string;
  cueOverride: string;
  setsRepsWk1: string;
  setsRepsWk2: string;
  setsRepsWk3: string;
  setsRepsWk4: string;
}

export default function DayExerciseStep({ trainingDayId }: { trainingDayId: string }) {
  const queryClient = useQueryClient();

  const assigned = useQuery({
    queryKey: ['strength', 'training-day', trainingDayId, 'exercises'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/training-days/{trainingDayId}/exercises', {
        params: { path: { trainingDayId } },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the exercises');
      }
      return data;
    },
  });

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

  const [rows, setRows] = useState<Row[]>([]);
  const [dirty, setDirty] = useState(false);
  const seededAt = useMemo(() => assigned.data?.map((a) => a.id).join(','), [assigned.data]);

  useEffect(() => {
    if (!assigned.data || dirty) {
      return;
    }
    setRows(
      assigned.data.map((a) => ({
        id: a.id,
        libraryItemId: a.libraryItemId,
        title: a.title,
        cueOverride: a.cueOverride ?? '',
        setsRepsWk1: a.setsRepsWk1 ?? '',
        setsRepsWk2: a.setsRepsWk2 ?? '',
        setsRepsWk3: a.setsRepsWk3 ?? '',
        setsRepsWk4: a.setsRepsWk4 ?? '',
      })),
    );
  }, [seededAt, assigned.data, dirty]);

  const changed = useMemo(() => {
    const shape = (list: { libraryItemId: string; cueOverride: string; setsRepsWk1: string; setsRepsWk2: string; setsRepsWk3: string; setsRepsWk4: string }[]) =>
      JSON.stringify(list.map((r) => [r.libraryItemId, r.cueOverride.trim(), r.setsRepsWk1.trim(), r.setsRepsWk2.trim(), r.setsRepsWk3.trim(), r.setsRepsWk4.trim()]));
    const server = (assigned.data ?? []).map((a) => ({
      libraryItemId: a.libraryItemId,
      cueOverride: a.cueOverride ?? '',
      setsRepsWk1: a.setsRepsWk1 ?? '',
      setsRepsWk2: a.setsRepsWk2 ?? '',
      setsRepsWk3: a.setsRepsWk3 ?? '',
      setsRepsWk4: a.setsRepsWk4 ?? '',
    }));
    return shape(server) !== shape(rows);
  }, [assigned.data, rows]);

  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.PUT('/api/v1/strength/training-days/{trainingDayId}/exercises', {
        params: { path: { trainingDayId } },
        body: {
          exercises: rows.map((r) => ({
            id: r.id ?? undefined,
            libraryItemId: r.libraryItemId,
            cueOverride: r.cueOverride.trim() || undefined,
            setsRepsWk1: r.setsRepsWk1.trim() || undefined,
            setsRepsWk2: r.setsRepsWk2.trim() || undefined,
            setsRepsWk3: r.setsRepsWk3.trim() || undefined,
            setsRepsWk4: r.setsRepsWk4.trim() || undefined,
          })),
        },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not save the exercises');
      }
      return data;
    },
    onSuccess: (data) => {
      setDirty(false);
      queryClient.setQueryData(['strength', 'training-day', trainingDayId, 'exercises'], data);
      queryClient.invalidateQueries({ queryKey: ['strength', 'training-days'] });
    },
  });

  function add(item: LibraryItem) {
    if (rows.some((r) => r.libraryItemId === item.id)) {
      return;
    }
    setRows((prev) => [
      ...prev,
      {
        id: null,
        libraryItemId: item.id,
        title: item.title,
        cueOverride: '',
        setsRepsWk1: '',
        setsRepsWk2: '',
        setsRepsWk3: '',
        setsRepsWk4: '',
      },
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

  const pickable = (library.data ?? []).filter((item) => item.category === 'FITNESS');

  return (
    <div className="editor">
      <div className="editor-main">
        <div className="panel findings-panel">
          <p className="section-title">Exercises</p>
          {rows.length === 0 ? (
            <p className="lede">Pick exercises from the library on the right.</p>
          ) : (
            <div className="findings-list">
              {rows.map((row) => (
                <div className="finding-row" key={row.libraryItemId}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <strong>{row.title}</strong>
                    <textarea
                      className="textarea"
                      placeholder="Cue override (optional)"
                      value={row.cueOverride}
                      onChange={(e) => update(row.libraryItemId, { cueOverride: e.target.value })}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['setsRepsWk1', 'setsRepsWk2', 'setsRepsWk3', 'setsRepsWk4'] as const).map(
                        (field, i) => (
                          <input
                            key={field}
                            placeholder={`Wk${i + 1}`}
                            value={row[field]}
                            onChange={(e) => update(row.libraryItemId, { [field]: e.target.value })}
                          />
                        ),
                      )}
                    </div>
                  </div>
                  <div className="finding-actions">
                    <button type="button" className="ghost" onClick={() => move(row.libraryItemId, -1)}>
                      ↑
                    </button>
                    <button type="button" className="ghost" onClick={() => move(row.libraryItemId, 1)}>
                      ↓
                    </button>
                    <button type="button" className="ghost" onClick={() => remove(row.libraryItemId)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="findings-foot">
            <button
              type="button"
              className="primary"
              disabled={save.isPending || !changed}
              onClick={() => save.mutate()}
            >
              {save.isPending ? 'Saving…' : 'Save exercises'}
            </button>
            {save.isError ? <p className="error">{save.error.message}</p> : null}
          </div>
        </div>
      </div>

      <div className="editor-side">
        <div className="panel findings-panel">
          <p className="section-title">Fitness library</p>
          {library.isPending ? (
            <p className="lede">Loading…</p>
          ) : pickable.length === 0 ? (
            <p className="lede">
              No fitness drills yet — add some from the Library tab (category Fitness).
            </p>
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
                    <strong>{item.title}</strong>
                    {item.cue ? <span className="drill-cue">{item.cue}</span> : null}
                    <span className="drill-pick-add">{added ? 'Added' : '+ Add'}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
