import type { components } from '@barbon-performance-analysis/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { LoadError } from '../components/LoadError';
import { problemDetail } from '../lib/problem';
import { useUnsavedChanges } from '../nav';

type TrainingDayView = components['schemas']['TrainingDayView'];
type TrainingDayKind = TrainingDayView['kind'];
type PlanView = components['schemas']['PlanView'];
type CyclePhaseView = components['schemas']['CyclePhaseView'];

interface Row {
  id: string | null;
  title: string;
  focus: string;
  durationMinutes: string;
  kind: TrainingDayKind;
  exerciseCount: number;
}

const toRow = (day: TrainingDayView): Row => ({
  id: day.id,
  title: day.title,
  focus: day.focus ?? '',
  durationMinutes: day.durationMinutes != null ? String(day.durationMinutes) : '',
  kind: day.kind,
  exerciseCount: day.exerciseCount ?? 0,
});

const blankRow = (): Row => ({
  id: null,
  title: '',
  focus: '',
  durationMinutes: '',
  kind: 'STRENGTH',
  exerciseCount: 0,
});

function planLabel(plan: PlanView | undefined): string {
  if (!plan?.startDate) {
    return 'Not started';
  }
  if (plan.planWeek) {
    return `Week ${plan.planWeek} of ${plan.planWeeks ?? 12}`;
  }
  return plan.unlockedWeeks === 0 ? 'Starts soon' : 'Complete';
}

interface TrainingDaysTabProps {
  playerProfileId: string;
  onEditExercises: (day: { id: string; title: string }) => void;
  onOpenCyclePlan: () => void;
}

export default function TrainingDaysTab({
  playerProfileId,
  onEditExercises,
  onOpenCyclePlan,
}: TrainingDaysTabProps) {
  const queryClient = useQueryClient();

  const days = useQuery({
    queryKey: ['strength', 'training-days', playerProfileId],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/training-days', {
        params: { query: { playerProfileId } },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the training days');
      }
      return data;
    },
  });

  const plan = useQuery({
    queryKey: ['strength', 'plan', playerProfileId],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/plan', {
        params: { query: { playerProfileId } },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the plan');
      }
      return data;
    },
  });

  const cyclePhases = useQuery({
    queryKey: ['strength', 'cycle-phases', playerProfileId],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/cycle-phases', {
        params: { query: { playerProfileId } },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the cycle phase');
      }
      return data;
    },
  });

  const currentPhase: CyclePhaseView | undefined = plan.data?.cycleWeek
    ? cyclePhases.data?.find((p) => p.weekNumber === plan.data.cycleWeek)
    : undefined;

  const [rows, setRows] = useState<Row[]>([]);
  const [dirty, setDirty] = useState(false);
  const seededAt = useMemo(() => days.data?.map((d) => d.id).join(','), [days.data]);

  useEffect(() => {
    if (!days.data || dirty) {
      return;
    }
    setRows(days.data.map(toRow));
  }, [seededAt, days.data, dirty]);

  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.PUT('/api/v1/strength/players/{playerProfileId}/training-days', {
        params: { path: { playerProfileId } },
        body: {
          days: rows.map((r) => ({
            id: r.id ?? undefined,
            title: r.title.trim(),
            focus: r.focus.trim() || undefined,
            durationMinutes: r.durationMinutes.trim() ? Number(r.durationMinutes) : undefined,
            kind: r.kind,
          })),
        },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not save the training days');
      }
      return data;
    },
    onSuccess: (data) => {
      setDirty(false);
      queryClient.setQueryData(['strength', 'training-days', playerProfileId], data);
    },
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
  useUnsavedChanges(dirty);

  return (
    <>
      <div className="context-chips">
        <span className="chip">
          <span className="chip-label">Plan</span>
          {plan.isPending ? '…' : planLabel(plan.data)}
        </span>
        {currentPhase ? (
          <span className="chip">
            <span className="chip-label">Phase</span>
            <span className="chip-accent">{currentPhase.phaseName}</span>
            {[currentPhase.setsReps, currentPhase.rpeRange].filter(Boolean).join(' · ')}
          </span>
        ) : null}
        <button type="button" className="back-link chip-link" onClick={onOpenCyclePlan}>
          Change in Cycle &amp; plan →
        </button>
      </div>

      <div className="panel days-panel">
        <div className="workspace-header">
          <h2 className="section-title">Training days</h2>
          {days.isSuccess ? (
            <button type="button" className="ghost" onClick={addDay}>
              + Add a day
            </button>
          ) : null}
        </div>

        {days.isError ? (
          <LoadError message={days.error.message} onRetry={() => days.refetch()} />
        ) : days.isPending ? (
          <p className="lede">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="lede">No training days yet. Add one to get started.</p>
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
                    value={row.focus}
                    onChange={(e) => update(index, { focus: e.target.value })}
                  />
                  <input
                    aria-label="Duration in minutes"
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
                    {row.id ? (
                      <button
                        type="button"
                        className="ghost"
                        aria-label={`Exercises for Day ${index + 1} (${row.exerciseCount})`}
                        onClick={() => onEditExercises({ id: row.id as string, title: row.title })}
                      >
                        Exercises ({row.exerciseCount}) →
                      </button>
                    ) : (
                      <span className="lede day-unsaved">Save to add exercises</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="days-foot" hidden={!days.isSuccess}>
          {anyBlank ? (
            <p className="lede">Every day needs a title before it can be saved.</p>
          ) : null}
          {save.isError ? <p className="error" role="alert">{save.error.message}</p> : null}
          <button
            type="button"
            className="primary"
            disabled={save.isPending || !dirty || anyBlank}
            onClick={() => save.mutate()}
          >
            {save.isPending ? 'Saving…' : 'Save training days'}
          </button>
        </div>
      </div>
    </>
  );
}
