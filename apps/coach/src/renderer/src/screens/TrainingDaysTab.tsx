import type { components } from '@barbon-performance-analysis/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { LoadError } from '../components/LoadError';
import { problemDetail } from '../lib/problem';
import TrainingDaysEditor from './TrainingDaysEditor';

type PlanView = components['schemas']['PlanView'];
type CyclePhaseView = components['schemas']['CyclePhaseView'];

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

  async function saveDays(input: components['schemas']['TrainingDayInput'][]) {
    const { data, error } = await api.PUT('/api/v1/strength/players/{playerProfileId}/training-days', {
      params: { path: { playerProfileId } },
      body: { days: input },
    });
    if (!data) {
      throw new Error(problemDetail(error) ?? 'Could not save the training days');
    }
    queryClient.setQueryData(['strength', 'training-days', playerProfileId], data);
  }

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

      {days.isError ? (
        <LoadError message={days.error.message} onRetry={() => days.refetch()} />
      ) : days.isPending ? (
        <p className="lede">Loading…</p>
      ) : (
        <TrainingDaysEditor
          days={days.data}
          save={saveDays}
          onEditDay={onEditExercises}
          emptyMessage="No training days yet. Add one, or apply a program template on the Program tab."
        />
      )}
    </>
  );
}
