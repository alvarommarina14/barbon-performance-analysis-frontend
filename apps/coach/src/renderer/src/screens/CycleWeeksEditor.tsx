import type { components } from '@barbon-performance-analysis/api-client';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useUnsavedChanges } from '../nav';

type CyclePhaseView = components['schemas']['CyclePhaseView'];
type CyclePhaseInput = components['schemas']['CyclePhaseInput'];

interface WeekRow {
  weekNumber: number;
  phaseName: string;
  goal: string;
  effort: string;
  rpeRange: string;
  repsLeft: string;
  example: string;
}

const toRows = (phases: CyclePhaseView[]): WeekRow[] =>
  [1, 2, 3, 4].map((weekNumber) => {
    const found = phases.find((p) => p.weekNumber === weekNumber);
    return {
      weekNumber,
      phaseName: found?.phaseName ?? '',
      goal: found?.goal ?? '',
      effort: found?.effort ?? '',
      rpeRange: found?.rpeRange ?? '',
      repsLeft: found?.repsLeft ?? '',
      example: found?.example ?? '',
    };
  });

interface CycleWeeksEditorProps {
  phases: CyclePhaseView[];
  save: (phases: CyclePhaseInput[]) => Promise<void>;
}

export default function CycleWeeksEditor({ phases, save }: CycleWeeksEditorProps) {
  const [rows, setRows] = useState<WeekRow[]>(() => toRows(phases));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) {
      setRows(toRows(phases));
    }
  }, [phases, dirty]);

  useUnsavedChanges(dirty);

  const saveWeeks = useMutation({
    mutationFn: () =>
      save(
        rows.map((w) => ({
          weekNumber: w.weekNumber,
          phaseName: w.phaseName.trim(),
          goal: w.goal.trim(),
          effort: w.effort.trim() || undefined,
          rpeRange: w.rpeRange.trim() || undefined,
          repsLeft: w.repsLeft.trim() || undefined,
          example: w.example.trim() || undefined,
        })),
      ),
    onSuccess: () => setDirty(false),
  });

  function updateWeek(weekNumber: number, patch: Partial<WeekRow>) {
    setRows((prev) => prev.map((w) => (w.weekNumber === weekNumber ? { ...w, ...patch } : w)));
    setDirty(true);
  }

  const anyWeekBlank = rows.some((w) => !w.phaseName.trim() || !w.goal.trim());

  return (
    <>
      <div className="findings-list cycle-weeks">
        {rows.map((week) => (
          <div className="panel" key={week.weekNumber}>
            <h3 className="section-title">Week {week.weekNumber}</h3>
            <label className="field">
              <span>Phase name</span>
              <input
                value={week.phaseName}
                onChange={(e) => updateWeek(week.weekNumber, { phaseName: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Effort (optional)</span>
              <input
                placeholder="e.g. Light/Moderate"
                value={week.effort}
                onChange={(e) => updateWeek(week.weekNumber, { effort: e.target.value })}
              />
            </label>
            <label className="field">
              <span>RPE range</span>
              <input
                placeholder="e.g. 5–6"
                value={week.rpeRange}
                onChange={(e) => updateWeek(week.weekNumber, { rpeRange: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Reps left in the tank (optional)</span>
              <input
                placeholder="e.g. You could do 3 to 4 more reps"
                value={week.repsLeft}
                onChange={(e) => updateWeek(week.weekNumber, { repsLeft: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Goal — what it means</span>
              <textarea
                className="textarea"
                placeholder="e.g. Comfortable effort. You finish each set feeling like you could easily keep going."
                value={week.goal}
                onChange={(e) => updateWeek(week.weekNumber, { goal: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Example (optional)</span>
              <textarea
                className="textarea"
                placeholder="e.g. If the program says 2×10 and you do 10 reps, you should feel like you could have done 13–14."
                value={week.example}
                onChange={(e) => updateWeek(week.weekNumber, { example: e.target.value })}
              />
            </label>
          </div>
        ))}
      </div>
      <div className="findings-foot">
        {dirty && anyWeekBlank ? (
          <p className="lede">Every week needs a phase name and a goal before it can be saved.</p>
        ) : null}
        <button
          type="button"
          className="primary"
          disabled={saveWeeks.isPending || !dirty || anyWeekBlank}
          onClick={() => saveWeeks.mutate()}
        >
          {saveWeeks.isPending ? 'Saving…' : 'Save cycle weeks'}
        </button>
        {saveWeeks.isError ? <p className="error" role="alert">{saveWeeks.error.message}</p> : null}
      </div>
    </>
  );
}
