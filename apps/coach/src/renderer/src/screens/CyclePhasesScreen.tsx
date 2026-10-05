import type { components } from '@barbon-performance-analysis/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client';
import { useConfirm } from '../components/Confirm';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { cx } from '../lib/cx';
import { problemDetail } from '../lib/problem';

type CyclePhaseTemplate = components['schemas']['CyclePhaseTemplateView'];

interface WeekRow {
  weekNumber: number;
  phaseName: string;
  goal: string;
  setsReps: string;
  rpeRange: string;
}

const blankWeeks = (): WeekRow[] =>
  [1, 2, 3, 4].map((weekNumber) => ({
    weekNumber,
    phaseName: '',
    goal: '',
    setsReps: '',
    rpeRange: '',
  }));

interface Draft {
  name: string;
  editingName: string | null;
  weeks: WeekRow[];
}

export default function CyclePhasesScreen() {
  const queryClient = useQueryClient();

  const templates = useQuery({
    queryKey: ['strength', 'cycle-phase-templates'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/cycle-phase-templates');
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the cycle phase templates');
      }
      return data;
    },
  });

  const [draft, setDraft] = useState<Draft | null>(null);
  const [activeWeek, setActiveWeek] = useState(1);

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const { data, error } = await api.PUT('/api/v1/strength/cycle-phase-templates/{name}', {
        params: { path: { name: d.name.trim() } },
        body: {
          weeks: d.weeks.map((w) => ({
            weekNumber: w.weekNumber,
            phaseName: w.phaseName.trim(),
            goal: w.goal.trim(),
            setsReps: w.setsReps.trim() || undefined,
            rpeRange: w.rpeRange.trim() || undefined,
          })),
        },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not save the template');
      }
      return data;
    },
    onSuccess: () => {
      setDraft(null);
      queryClient.invalidateQueries({ queryKey: ['strength', 'cycle-phase-templates'] });
    },
  });

  const confirm = useConfirm();
  const toast = useToast();

  const remove = useMutation({
    mutationFn: async (name: string) => {
      const { response } = await api.DELETE('/api/v1/strength/cycle-phase-templates/{name}', {
        params: { path: { name } },
      });
      if (!response.ok) {
        throw new Error('Could not delete the template');
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['strength', 'cycle-phase-templates'] }),
    onError: (err) => toast.show(err instanceof Error ? err.message : 'Could not delete the template'),
  });

  async function confirmRemove(name: string) {
    const sure = await confirm({
      title: `Delete “${name}”?`,
      message: 'Clients who already got this template keep their weeks; it only leaves this list.',
      confirmLabel: 'Delete template',
      danger: true,
    });
    if (sure) {
      remove.mutate(name);
    }
  }

  function startNew() {
    setDraft({ name: '', editingName: null, weeks: blankWeeks() });
    setActiveWeek(1);
  }

  function startEdit(template: CyclePhaseTemplate) {
    setDraft({
      name: template.name,
      editingName: template.name,
      weeks: [1, 2, 3, 4].map((weekNumber) => {
        const found = template.weeks.find((w) => w.weekNumber === weekNumber);
        return found
          ? {
              weekNumber,
              phaseName: found.phaseName,
              goal: found.goal,
              setsReps: found.setsReps ?? '',
              rpeRange: found.rpeRange ?? '',
            }
          : { weekNumber, phaseName: '', goal: '', setsReps: '', rpeRange: '' };
      }),
    });
    setActiveWeek(1);
  }

  function updateWeek(weekNumber: number, patch: Partial<WeekRow>) {
    setDraft((d) =>
      d ? { ...d, weeks: d.weeks.map((w) => (w.weekNumber === weekNumber ? { ...w, ...patch } : w)) } : d,
    );
  }

  const anyBlank = draft ? draft.weeks.some((w) => !w.phaseName.trim() || !w.goal.trim()) : false;

  return (
    <main className="workspace">
      <div className="workspace-header">
        <h1>Cycle phase templates</h1>
        <button type="button" className="primary" disabled={draft !== null} onClick={startNew}>
          + New template
        </button>
      </div>
      <p className="lede">
        Reusable 4-week strength cycles. Apply one to a client from their training screen — applying
        copies the weeks once, it isn’t a live link back to the template.
      </p>

      {templates.isPending ? (
        <p className="lede">Loading…</p>
      ) : templates.isError ? (
        <div className="panel">
          <p className="error" role="alert">We could not load the templates.</p>
          <button type="button" className="ghost" onClick={() => templates.refetch()}>
            Try again
          </button>
        </div>
      ) : templates.data.length === 0 && draft === null ? (
        <p className="lede">No templates yet. Create one to reuse across clients.</p>
      ) : (
        <div className="findings-list">
          {templates.data.map((template) => (
            <div className="panel" key={template.name}>
              <div className="workspace-header">
                <h2 className="section-title">{template.name}</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="ghost"
                    disabled={draft !== null}
                    aria-label={`Edit ${template.name}`}
                    onClick={() => startEdit(template)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    disabled={remove.isPending}
                    aria-label={`Delete ${template.name}`}
                    onClick={() => confirmRemove(template.name)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="lede">
                {template.weeks.map((w) => w.phaseName).join(' → ') || 'No weeks set'}
              </p>
            </div>
          ))}
        </div>
      )}

      {draft ? (
        <Modal
          title={draft.editingName ? `Edit “${draft.editingName}”` : 'New template'}
          onClose={() => setDraft(null)}
          closeDisabled={save.isPending}
        >
          {!draft.editingName ? (
            <label className="field">
              <span>Template name</span>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
          ) : null}
          <div className="tabs">
            {draft.weeks.map((week) => {
              const complete = week.phaseName.trim() && week.goal.trim();
              return (
                <button
                  key={week.weekNumber}
                  type="button"
                  className={cx('tab', activeWeek === week.weekNumber && 'on')}
                  aria-pressed={activeWeek === week.weekNumber}
                  onClick={() => setActiveWeek(week.weekNumber)}
                >
                  Week {week.weekNumber}
                  {complete ? ' ✓' : ''}
                </button>
              );
            })}
          </div>
          {(() => {
            const week = draft.weeks.find((w) => w.weekNumber === activeWeek);
            if (!week) {
              return null;
            }
            return (
              <div className="panel">
                <label className="field">
                  <span>Phase name</span>
                  <input
                    value={week.phaseName}
                    onChange={(e) => updateWeek(week.weekNumber, { phaseName: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Goal</span>
                  <textarea
                    className="textarea"
                    value={week.goal}
                    onChange={(e) => updateWeek(week.weekNumber, { goal: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Sets &amp; reps</span>
                  <input
                    placeholder="e.g. 3 × 10–12"
                    value={week.setsReps}
                    onChange={(e) => updateWeek(week.weekNumber, { setsReps: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>RPE range</span>
                  <input
                    placeholder="e.g. RPE 6–7"
                    value={week.rpeRange}
                    onChange={(e) => updateWeek(week.weekNumber, { rpeRange: e.target.value })}
                  />
                </label>
              </div>
            );
          })()}
          <div className="findings-foot">
            <div className="button-row">
              <button
                type="button"
                className="primary"
                disabled={save.isPending || !draft.name.trim() || anyBlank}
                onClick={() => save.mutate(draft)}
              >
                {save.isPending ? 'Saving…' : 'Save template'}
              </button>
              <button
                type="button"
                className="ghost"
                disabled={save.isPending}
                onClick={() => setDraft(null)}
              >
                Cancel
              </button>
            </div>
            {save.isError ? <p className="error" role="alert">{save.error.message}</p> : null}
          </div>
        </Modal>
      ) : null}
    </main>
  );
}
