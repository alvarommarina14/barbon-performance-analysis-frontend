import type { components } from '@barbon-performance-analysis/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '../api/client';
import { LoadError } from '../components/LoadError';
import { cx } from '../lib/cx';
import { problemDetail } from '../lib/problem';
import { useNav } from '../nav';
import CycleWeeksEditor from './CycleWeeksEditor';
import DaySectionsStep from './DaySectionsStep';
import ProgramCoverPanel, { type ProgramCover } from './ProgramCoverPanel';
import TrainingDaysEditor from './TrainingDaysEditor';

type ProgramTemplateView = components['schemas']['ProgramTemplateView'];
type TemplateTab = 'days' | 'cycle' | 'cover';

const TEMPLATE_TABS: { key: TemplateTab; label: string }[] = [
  { key: 'days', label: 'Days' },
  { key: 'cycle', label: 'Cycle weeks' },
  { key: 'cover', label: 'Cover' },
];

export default function ProgramTemplateScreen({ templateId }: { templateId: string }) {
  const queryClient = useQueryClient();
  const { back, leaveThen } = useNav();
  const [tab, setTab] = useState<TemplateTab>('days');
  const [selectedDay, setSelectedDay] = useState<{ id: string; title: string } | null>(null);
  const templateKey = ['strength', 'program-template', templateId];

  const template = useQuery({
    queryKey: templateKey,
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/program-templates/{templateId}', {
        params: { path: { templateId } },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the template');
      }
      return data;
    },
  });

  function stored(data: ProgramTemplateView) {
    queryClient.setQueryData(templateKey, data);
    void queryClient.invalidateQueries({ queryKey: ['strength', 'program-templates'] });
  }

  async function saveDays(days: components['schemas']['TrainingDayInput'][]) {
    const { data, error } = await api.PUT('/api/v1/strength/program-templates/{templateId}/training-days', {
      params: { path: { templateId } },
      body: { days },
    });
    if (!data) {
      throw new Error(problemDetail(error) ?? 'Could not save the training days');
    }
    stored(data);
  }

  async function saveWeeks(phases: components['schemas']['CyclePhaseInput'][]) {
    const { data, error } = await api.PUT('/api/v1/strength/program-templates/{templateId}/cycle-phases', {
      params: { path: { templateId } },
      body: { phases },
    });
    if (!data) {
      throw new Error(problemDetail(error) ?? 'Could not save the cycle weeks');
    }
    stored(data);
  }

  async function saveCover(next: ProgramCover) {
    const { data, error } = await api.PUT('/api/v1/strength/program-templates/{templateId}', {
      params: { path: { templateId } },
      body: {
        name: next.name.trim(),
        about: next.about.trim() || undefined,
        schedule: next.schedule.trim() || undefined,
        cycleNote: next.cycleNote.trim() || undefined,
      },
    });
    if (!data) {
      throw new Error(problemDetail(error) ?? 'Could not save the cover');
    }
    stored(data);
  }

  const cover = useMemo<ProgramCover | null>(
    () =>
      template.data
        ? {
            name: template.data.name,
            athleteLevel: '',
            about: template.data.about ?? '',
            schedule: template.data.schedule ?? '',
            cycleNote: template.data.cycleNote ?? '',
          }
        : null,
    [template.data],
  );

  const name = template.data?.name ?? 'Program template';

  if (selectedDay) {
    return (
      <main className="workspace editor-screen">
        <button type="button" className="back-link" onClick={() => leaveThen(() => setSelectedDay(null))}>
          ← {name}’s training days
        </button>
        <div className="workspace-header">
          <h1>{selectedDay.title}</h1>
        </div>
        <DaySectionsStep trainingDayId={selectedDay.id} />
      </main>
    );
  }

  return (
    <main className={cx('workspace', tab === 'days' && 'fit-screen')}>
      <button type="button" className="back-link" onClick={back}>
        ← Program templates
      </button>
      <div className="workspace-header">
        <h1>{name}</h1>
      </div>
      <div className="tabs">
        {TEMPLATE_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={cx('tab', tab === key && 'on')}
            aria-pressed={tab === key}
            onClick={() => leaveThen(() => setTab(key))}
          >
            {label}
          </button>
        ))}
      </div>

      {template.isError ? (
        <LoadError message={template.error.message} onRetry={() => template.refetch()} />
      ) : template.isPending || !cover ? (
        <p className="lede">Loading…</p>
      ) : (
        <>
          {tab === 'days' ? (
            <TrainingDaysEditor
              days={template.data.days}
              save={saveDays}
              onEditDay={(day) => leaveThen(() => setSelectedDay(day))}
              emptyMessage="No training days yet. Add one to get started."
            />
          ) : null}
          {tab === 'cycle' ? (
            <div className="panel">
              <h2 className="section-title">Cycle weeks</h2>
              <CycleWeeksEditor phases={template.data.weeks} save={saveWeeks} />
            </div>
          ) : null}
          {tab === 'cover' ? (
            <div className="program-layout">
              <ProgramCoverPanel cover={cover} variant="template" save={saveCover} />
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
