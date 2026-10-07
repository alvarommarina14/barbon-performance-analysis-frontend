import type { components } from '@barbon-performance-analysis/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { LoadError } from '../components/LoadError';
import { problemDetail } from '../lib/problem';
import CycleWeeksEditor from './CycleWeeksEditor';
import PlanStartPanel from './PlanStartPanel';

export default function CyclePlanTab({ playerProfileId }: { playerProfileId: string }) {
  const queryClient = useQueryClient();

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

  async function saveWeeks(phases: components['schemas']['CyclePhaseInput'][]) {
    const { data, error } = await api.PUT('/api/v1/strength/players/{playerProfileId}/cycle-phases', {
      params: { path: { playerProfileId } },
      body: { phases },
    });
    if (!data) {
      throw new Error(problemDetail(error) ?? 'Could not save the cycle phase');
    }
    queryClient.setQueryData(['strength', 'cycle-phases', playerProfileId], data);
  }

  return (
    <>
      <PlanStartPanel playerProfileId={playerProfileId} />

      <div className="panel">
        <h2 className="section-title">Cycle phase</h2>
        {cyclePhases.isError ? (
          <LoadError message={cyclePhases.error.message} onRetry={() => cyclePhases.refetch()} />
        ) : cyclePhases.isPending ? (
          <p className="lede">Loading…</p>
        ) : (
          <CycleWeeksEditor phases={cyclePhases.data} save={saveWeeks} />
        )}
      </div>
    </>
  );
}
