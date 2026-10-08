import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import { cx } from '../lib/cx';
import { problemDetail } from '../lib/problem';
import { useNav } from '../nav';
import ClientLogsTab from './ClientLogsTab';
import ClientRedFlagsTab from './ClientRedFlagsTab';
import CyclePlanTab from './CyclePlanTab';
import DaySectionsStep from './DaySectionsStep';
import ProgramTab from './ProgramTab';
import TrainingDaysTab from './TrainingDaysTab';
import WeeklyNotesTab from './WeeklyNotesTab';

type ClientTab = 'days' | 'program' | 'cycle-plan' | 'weekly-notes' | 'red-flags' | 'logs';

const CLIENT_TABS: { key: ClientTab; label: string }[] = [
  { key: 'days', label: 'Days' },
  { key: 'program', label: 'Program' },
  { key: 'cycle-plan', label: 'Cycle & plan' },
  { key: 'weekly-notes', label: 'Weekly notes' },
  { key: 'red-flags', label: 'Red flags' },
  { key: 'logs', label: 'Logs' },
];

function PreviewPdfButton({ playerProfileId }: { playerProfileId: string }) {
  const toast = useToast();

  // The PDF is generated from what is saved, so unsaved edits on screen are not in it yet.
  const preview = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/program-pdf-link', {
        params: { query: { playerProfileId } },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not open the program PDF');
      }
      window.open(data.url);
    },
    onError: (err) => toast.show(err.message),
  });

  return (
    <button
      type="button"
      className="ghost"
      disabled={preview.isPending}
      onClick={() => preview.mutate()}
    >
      {preview.isPending ? 'Opening…' : 'Preview PDF'}
    </button>
  );
}

export default function ClientTrainingScreen({
  playerProfileId,
  playerName,
}: {
  playerProfileId: string;
  playerName: string;
}) {
  const { back, leaveThen } = useNav();
  const [tab, setTab] = useState<ClientTab>('days');
  const [selectedDay, setSelectedDay] = useState<{ id: string; title: string } | null>(null);

  if (selectedDay) {
    return (
      <main className="workspace editor-screen">
        <button type="button" className="back-link" onClick={() => leaveThen(() => setSelectedDay(null))}>
          ← {playerName}'s training days
        </button>
        <div className="workspace-header">
          <h1>{selectedDay.title}</h1>
          <PreviewPdfButton playerProfileId={playerProfileId} />
        </div>
        <DaySectionsStep trainingDayId={selectedDay.id} />
      </main>
    );
  }

  return (
    <main className={cx('workspace', tab === 'days' && 'fit-screen')}>
      <button type="button" className="back-link" onClick={back}>
        ← Clients
      </button>
      <div className="workspace-header">
        <h1>{playerName}'s training</h1>
        <PreviewPdfButton playerProfileId={playerProfileId} />
      </div>
      <div className="tabs">
        {CLIENT_TABS.map(({ key, label }) => (
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

      {tab === 'days' ? (
        <TrainingDaysTab
          playerProfileId={playerProfileId}
          onEditExercises={(day) => leaveThen(() => setSelectedDay(day))}
          onOpenCyclePlan={() => leaveThen(() => setTab('cycle-plan'))}
        />
      ) : null}
      {tab === 'program' ? <ProgramTab playerProfileId={playerProfileId} playerName={playerName} /> : null}
      {tab === 'cycle-plan' ? <CyclePlanTab playerProfileId={playerProfileId} /> : null}
      {tab === 'weekly-notes' ? <WeeklyNotesTab playerProfileId={playerProfileId} /> : null}
      {tab === 'red-flags' ? <ClientRedFlagsTab playerProfileId={playerProfileId} /> : null}
      {tab === 'logs' ? <ClientLogsTab playerProfileId={playerProfileId} /> : null}
    </main>
  );
}
