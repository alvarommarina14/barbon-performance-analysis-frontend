import { useState } from 'react';
import { useNav } from '../nav';
import { cx } from '../lib/cx';
import ClientLogsTab from './ClientLogsTab';
import ClientRedFlagsTab from './ClientRedFlagsTab';
import CyclePlanTab from './CyclePlanTab';
import DayExerciseStep from './DayExerciseStep';
import TrainingDaysTab from './TrainingDaysTab';
import WeeklyNotesTab from './WeeklyNotesTab';

type ClientTab = 'days' | 'cycle-plan' | 'weekly-notes' | 'red-flags' | 'logs';

const CLIENT_TABS: { key: ClientTab; label: string }[] = [
  { key: 'days', label: 'Days' },
  { key: 'cycle-plan', label: 'Cycle & plan' },
  { key: 'weekly-notes', label: 'Weekly notes' },
  { key: 'red-flags', label: 'Red flags' },
  { key: 'logs', label: 'Logs' },
];

export default function ClientTrainingScreen({
  playerProfileId,
  playerName,
}: {
  playerProfileId: string;
  playerName: string;
}) {
  const { back } = useNav();
  const [tab, setTab] = useState<ClientTab>('days');
  const [selectedDay, setSelectedDay] = useState<{ id: string; title: string } | null>(null);

  if (selectedDay) {
    return (
      <main className="workspace">
        <button type="button" className="back-link" onClick={() => setSelectedDay(null)}>
          ← {playerName}'s training days
        </button>
        <div className="workspace-header">
          <h1>{selectedDay.title}</h1>
        </div>
        <DayExerciseStep trainingDayId={selectedDay.id} />
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
      </div>
      <div className="tabs">
        {CLIENT_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={cx('tab', tab === key && 'on')}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'days' ? (
        <TrainingDaysTab
          playerProfileId={playerProfileId}
          onEditExercises={setSelectedDay}
          onOpenCyclePlan={() => setTab('cycle-plan')}
        />
      ) : null}
      {tab === 'cycle-plan' ? <CyclePlanTab playerProfileId={playerProfileId} /> : null}
      {tab === 'weekly-notes' ? <WeeklyNotesTab playerProfileId={playerProfileId} /> : null}
      {tab === 'red-flags' ? <ClientRedFlagsTab playerProfileId={playerProfileId} /> : null}
      {tab === 'logs' ? <ClientLogsTab playerProfileId={playerProfileId} /> : null}
    </main>
  );
}
