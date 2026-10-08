import type { components } from '@barbon-performance-analysis/api-client';
import { setsRepsForCycleWeek } from '@barbon-performance-analysis/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client';
import { LoadError } from '../components/LoadError';
import { problemDetail } from '../lib/problem';

type DayExerciseView = components['schemas']['DayExerciseView'];
type ExerciseLogView = components['schemas']['ExerciseLogView'];

const PLAN_WEEKS = 12;

function prescribed(exercise: DayExerciseView, planWeek: number): string | undefined {
  const cycleWeek = ((planWeek - 1) % 4) + 1;
  return setsRepsForCycleWeek(exercise, cycleWeek);
}

function describeSets(log: ExerciseLogView): string {
  const unit = log.unit.toLowerCase();
  return log.sets
    .map((set) => (set.weight != null ? `${set.reps} × ${set.weight} ${unit}` : `${set.reps} × BW`))
    .join(' · ');
}

export default function ClientLogsTab({ playerProfileId }: { playerProfileId: string }) {
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

  const [dayId, setDayId] = useState<string | null>(null);
  const [week, setWeek] = useState<number | null>(null);
  const selectedDayId = dayId ?? days.data?.[0]?.id ?? null;
  const selectedWeek = week ?? plan.data?.planWeek ?? 1;

  const sections = useQuery({
    queryKey: ['strength', 'training-day', selectedDayId, 'sections'],
    enabled: Boolean(selectedDayId),
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/training-days/{trainingDayId}/sections', {
        params: { path: { trainingDayId: selectedDayId as string } },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the exercises');
      }
      return data;
    },
  });

  const logs = useQuery({
    queryKey: ['strength', 'training-day', selectedDayId, 'logs', selectedWeek],
    enabled: Boolean(selectedDayId),
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/training-days/{trainingDayId}/logs', {
        params: { path: { trainingDayId: selectedDayId as string }, query: { planWeek: selectedWeek } },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the logs');
      }
      return data;
    },
  });

  if (days.isError) {
    return <LoadError message={days.error.message} onRetry={() => days.refetch()} />;
  }
  if (days.isPending) {
    return <p className="lede">Loading…</p>;
  }
  if (days.data.length === 0) {
    return <p className="lede">No training days yet — add them on the Days tab.</p>;
  }

  const logByExercise = new Map((logs.data ?? []).map((log) => [log.dayExerciseId, log]));

  return (
    <>
      <div className="button-row">
        <label className="field">
          <span>Training day</span>
          <select value={selectedDayId ?? ''} onChange={(e) => setDayId(e.target.value)}>
            {days.data.map((day) => (
              <option key={day.id} value={day.id}>
                {day.dayLabel} — {day.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Plan week</span>
          <select value={selectedWeek} onChange={(e) => setWeek(Number(e.target.value))}>
            {Array.from({ length: PLAN_WEEKS }, (_, index) => index + 1).map((w) => (
              <option key={w} value={w}>
                Week {w}
                {w === plan.data?.planWeek ? ' (now)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      {sections.isError || logs.isError ? (
        <LoadError
          message={(sections.error ?? logs.error)?.message ?? 'Could not load the logs'}
          onRetry={() => {
            void sections.refetch();
            void logs.refetch();
          }}
        />
      ) : sections.isPending || logs.isPending ? (
        <p className="lede">Loading…</p>
      ) : sections.data.every((section) => section.exercises.length === 0) ? (
        <p className="lede">This day has no exercises yet.</p>
      ) : (
        <div className="table-scroll">
          <table className="clients">
            <thead>
              <tr>
                <th>Exercise</th>
                <th>Prescribed</th>
                <th>Logged</th>
              </tr>
            </thead>
            {sections.data
              .filter((section) => section.exercises.length > 0)
              .map((section) => (
                <tbody key={section.id}>
                  <tr className="logs-block-row">
                    <th colSpan={3} scope="colgroup">
                      {section.title}
                    </th>
                  </tr>
                  {section.exercises.map((exercise) => {
                    const log = logByExercise.get(exercise.id);
                    return (
                      <tr key={exercise.id}>
                        <td>{exercise.title}</td>
                        <td>{prescribed(exercise, selectedWeek) ?? '—'}</td>
                        <td>{log ? describeSets(log) : <span className="lede">Not logged</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              ))}
          </table>
        </div>
      )}
    </>
  );
}
