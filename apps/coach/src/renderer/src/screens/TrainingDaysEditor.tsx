import type { components } from '@barbon-performance-analysis/api-client';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { useUnsavedChanges } from '../nav';

type TrainingDayView = components['schemas']['TrainingDayView'];
type TrainingDayInput = components['schemas']['TrainingDayInput'];
type TrainingDayKind = TrainingDayView['kind'];

interface Row {
  id: string | null;
  title: string;
  focus: string;
  durationMinutes: string;
  kind: TrainingDayKind;
  protocol: string;
  exerciseCount: number;
}

const toRow = (day: TrainingDayView): Row => ({
  id: day.id,
  title: day.title,
  focus: day.focus ?? '',
  durationMinutes: day.durationMinutes != null ? String(day.durationMinutes) : '',
  kind: day.kind,
  protocol: day.protocol ?? '',
  exerciseCount: day.exerciseCount ?? 0,
});

const blankRow = (): Row => ({
  id: null,
  title: '',
  focus: '',
  durationMinutes: '',
  kind: 'STRENGTH',
  protocol: '',
  exerciseCount: 0,
});

interface TrainingDaysEditorProps {
  days: TrainingDayView[];
  save: (days: TrainingDayInput[]) => Promise<void>;
  onEditDay: (day: { id: string; title: string }) => void;
  emptyMessage: ReactNode;
}

export default function TrainingDaysEditor({ days, save, onEditDay, emptyMessage }: TrainingDaysEditorProps) {
  const [rows, setRows] = useState<Row[]>(() => days.map(toRow));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) {
      setRows(days.map(toRow));
    }
  }, [days, dirty]);

  useUnsavedChanges(dirty);

  const saveDays = useMutation({
    mutationFn: () =>
      save(
        rows.map((r) => ({
          id: r.id ?? undefined,
          title: r.title.trim(),
          focus: r.focus.trim() || undefined,
          durationMinutes: r.durationMinutes.trim() ? Number(r.durationMinutes) : undefined,
          kind: r.kind,
          protocol: r.kind === 'CARDIO' ? r.protocol.trim() || undefined : undefined,
        })),
      ),
    onSuccess: () => setDirty(false),
  });

  function addDay() {
    setRows((prev) => [...prev, blankRow()]);
    setDirty(true);
  }

  function update(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    setDirty(true);
  }

  function move(index: number, delta: number) {
    setRows((prev) => {
      const j = index + delta;
      if (j < 0 || j >= prev.length) {
        return prev;
      }
      const copy = [...prev];
      const [row] = copy.splice(index, 1);
      copy.splice(j, 0, row as Row);
      return copy;
    });
    setDirty(true);
  }

  function remove(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  const anyBlank = rows.some((r) => !r.title.trim());

  return (
    <div className="panel days-panel">
      <div className="workspace-header">
        <h2 className="section-title">Training days</h2>
        <button type="button" className="ghost" onClick={addDay}>
          + Add a day
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="lede">{emptyMessage}</p>
      ) : (
        <>
          <div className="day-grid day-grid-head">
            <span>Day</span>
            <span>Title</span>
            <span>Focus</span>
            <span>Min</span>
            <span>Kind</span>
            <span />
          </div>
          <div className="days-list">
            {rows.map((row, index) => (
              <div className="day-grid day-row" key={row.id ?? `new-${index}`}>
                <span className="day-label">Day {index + 1}</span>
                <input
                  aria-label="Title"
                  placeholder="Rehab — forearm & scapular"
                  value={row.title}
                  onChange={(e) => update(index, { title: e.target.value })}
                />
                <input
                  aria-label="Focus"
                  placeholder="Focus"
                  value={row.focus}
                  onChange={(e) => update(index, { focus: e.target.value })}
                />
                <input
                  aria-label="Duration in minutes"
                  placeholder="Min"
                  type="number"
                  value={row.durationMinutes}
                  onChange={(e) => update(index, { durationMinutes: e.target.value })}
                />
                <select
                  aria-label="Kind"
                  value={row.kind}
                  onChange={(e) => update(index, { kind: e.target.value as TrainingDayKind })}
                >
                  <option value="STRENGTH">Strength</option>
                  <option value="REHAB">Rehab</option>
                  <option value="CARDIO">Cardio</option>
                </select>
                <div className="day-actions">
                  <button type="button" className="ghost" aria-label={`Move Day ${index + 1} up`} onClick={() => move(index, -1)}>
                    ↑
                  </button>
                  <button type="button" className="ghost" aria-label={`Move Day ${index + 1} down`} onClick={() => move(index, 1)}>
                    ↓
                  </button>
                  <button type="button" className="ghost" aria-label={`Remove Day ${index + 1}`} onClick={() => remove(index)}>
                    Remove
                  </button>
                  {row.kind === 'CARDIO' ? null : row.id ? (
                    <button
                      type="button"
                      className="ghost"
                      aria-label={`Exercises for Day ${index + 1} (${row.exerciseCount})`}
                      onClick={() => onEditDay({ id: row.id as string, title: row.title })}
                    >
                      Exercises ({row.exerciseCount}) →
                    </button>
                  ) : (
                    <span className="lede day-unsaved">Save to add exercises</span>
                  )}
                </div>
                {row.kind === 'CARDIO' ? (
                  <textarea
                    className="textarea day-protocol"
                    aria-label={`Protocol for Day ${index + 1}`}
                    placeholder="Protocol — e.g. 5 min easy, then 8 × 30 s hard / 90 s easy, 5 min cool-down"
                    value={row.protocol}
                    onChange={(e) => update(index, { protocol: e.target.value })}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="days-foot">
        {anyBlank ? <p className="lede">Every day needs a title before it can be saved.</p> : null}
        {saveDays.isError ? <p className="error" role="alert">{saveDays.error.message}</p> : null}
        <button
          type="button"
          className="primary"
          disabled={saveDays.isPending || !dirty || anyBlank}
          onClick={() => saveDays.mutate()}
        >
          {saveDays.isPending ? 'Saving…' : 'Save training days'}
        </button>
      </div>
    </div>
  );
}
