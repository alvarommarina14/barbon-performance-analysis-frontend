import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { LoadError } from '../components/LoadError';
import { useConfirm } from '../components/Confirm';
import { cx } from '../lib/cx';
import { problemDetail } from '../lib/problem';
import { useNav, useUnsavedChanges } from '../nav';

const PLAN_WEEKS = 12;

function weekRange(startDate: string, planWeek: number): string {
  const start = new Date(`${startDate}T00:00:00`);
  start.setDate(start.getDate() + (planWeek - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const format = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${format(start)} – ${format(end)}`;
}

export default function WeeklyNotesTab({ playerProfileId }: { playerProfileId: string }) {
  const queryClient = useQueryClient();
  const notesKey = ['strength', 'weekly-notes', playerProfileId];

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

  const notes = useQuery({
    queryKey: notesKey,
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/weekly-notes', {
        params: { query: { playerProfileId } },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the weekly notes');
      }
      return data;
    },
  });

  const [week, setWeek] = useState<number | null>(null);
  const selectedWeek = week ?? plan.data?.planWeek ?? 1;
  const saved = notes.data?.find((n) => n.planWeek === selectedWeek)?.body ?? '';
  const [draft, setDraft] = useState(saved);

  useEffect(() => {
    setDraft(saved);
  }, [saved, selectedWeek]);

  const { leaveThen } = useNav();
  const confirm = useConfirm();
  useUnsavedChanges(draft !== saved);

  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.PUT(
        '/api/v1/strength/players/{playerProfileId}/weekly-notes/{planWeek}',
        { params: { path: { playerProfileId, planWeek: selectedWeek } }, body: { body: draft } },
      );
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not save the note');
      }
      return data;
    },
    onSuccess: (data) => queryClient.setQueryData(notesKey, data),
  });

  const written = new Set(notes.data?.map((n) => n.planWeek));
  const startDate = plan.data?.startDate;

  if (notes.isError || plan.isError) {
    return (
      <LoadError
        message={(notes.error ?? plan.error)?.message ?? 'Could not load the weekly notes'}
        onRetry={() => {
          void notes.refetch();
          void plan.refetch();
        }}
      />
    );
  }
  if (notes.isPending || plan.isPending) {
    return <p className="lede">Loading…</p>;
  }

  return (
    <>
      <div className="tabs">
        {Array.from({ length: PLAN_WEEKS }, (_, index) => index + 1).map((w) => (
          <button
            key={w}
            type="button"
            className={cx('tab', w === selectedWeek && 'on', written.has(w) && 'has-note')}
            aria-pressed={w === selectedWeek}
            onClick={() => leaveThen(() => setWeek(w))}
          >
            Week {w}
            {w === plan.data?.planWeek ? ' · now' : ''}
          </button>
        ))}
      </div>

      <div className="panel">
        <h2 className="section-title">Week {selectedWeek}</h2>
        <p className="lede">
          {startDate
            ? weekRange(startDate, selectedWeek)
            : 'Set the plan start date on the Cycle & plan tab to date these notes.'}
          {' · '}The player sees this note once the week starts.
        </p>
        <textarea
          className="textarea"
          rows={8}
          placeholder="What should the player focus on this week?"
          aria-label={`Note for week ${selectedWeek}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="button"
          className="primary"
          disabled={save.isPending || draft.trim() === saved.trim()}
          onClick={async () => {
            const deleting = !draft.trim();
            if (
              deleting &&
              !(await confirm({
                title: `Delete the note for week ${selectedWeek}?`,
                message: 'The player stops seeing it.',
                confirmLabel: 'Delete note',
                danger: true,
              }))
            ) {
              return;
            }
            save.mutate();
          }}
        >
          {save.isPending ? 'Saving…' : draft.trim() || !saved ? 'Save note' : 'Delete note'}
        </button>
        {save.isError ? <p className="error" role="alert">{save.error.message}</p> : null}
      </div>
    </>
  );
}
