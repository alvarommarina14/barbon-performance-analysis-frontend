import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { LoadError } from '../components/LoadError';
import { problemDetail } from '../lib/problem';
import { useUnsavedChanges } from '../nav';

export default function PlanStartPanel({ playerProfileId }: { playerProfileId: string }) {
  const queryClient = useQueryClient();

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

  const [startDate, setStartDate] = useState('');
  const saved = plan.data?.startDate ?? '';

  useEffect(() => {
    setStartDate(saved);
  }, [saved]);

  useUnsavedChanges(startDate !== saved);

  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.PUT('/api/v1/strength/players/{playerProfileId}/plan', {
        params: { path: { playerProfileId } },
        body: { startDate: startDate || undefined },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not save the plan start');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['strength', 'plan', playerProfileId], data);
      void queryClient.invalidateQueries({ queryKey: ['coach', 'clients'] });
    },
  });

  const data = plan.data;
  const status = !data?.startDate
    ? 'Not started yet.'
    : data.planWeek
      ? `Week ${data.planWeek} of ${data.planWeeks ?? 12} · cycle week ${data.cycleWeek}`
      : data.unlockedWeeks === 0
        ? 'Starts on that date.'
        : 'Plan complete.';

  return (
    <div className="panel">
      <h2 className="section-title">Twelve-week plan</h2>
      {plan.isError ? (
        <LoadError message={plan.error.message} onRetry={() => plan.refetch()} />
      ) : (
        <>
          <p className="lede">{plan.isPending ? 'Loading…' : status}</p>
          <label className="field">
            <span>Plan start date</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <button
            type="button"
            className="primary"
            disabled={plan.isPending || save.isPending || startDate === saved}
            onClick={() => save.mutate()}
          >
            {save.isPending ? 'Saving…' : 'Save start date'}
          </button>
          {save.isError ? <p className="error" role="alert">{save.error.message}</p> : null}
        </>
      )}
    </div>
  );
}
