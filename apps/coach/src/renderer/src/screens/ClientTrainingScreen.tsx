import { useState } from 'react';
import { ProgramPdfPane, usePdfPaneOpen } from '../components/ProgramPdfPane';
import { cx } from '../lib/cx';
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
  const [pdfOpen, setPdfOpen] = usePdfPaneOpen();

  const pdfToggle = pdfOpen ? null : (
    <button type="button" className="ghost" onClick={() => setPdfOpen(true)}>
      Show PDF
    </button>
  );
  const pdfPane = pdfOpen ? (
    <ProgramPdfPane playerProfileId={playerProfileId} onClose={() => setPdfOpen(false)} />
  ) : null;

  if (selectedDay) {
    return (
      <main className={cx('workspace editor-screen', pdfOpen && 'with-pdf-pane')}>
        <button type="button" className="back-link" onClick={() => leaveThen(() => setSelectedDay(null))}>
          ← {playerName}'s training days
        </button>
        <div className="workspace-header">
          <h1>{selectedDay.title}</h1>
          {pdfToggle}
        </div>
        <DaySectionsStep trainingDayId={selectedDay.id} />
        {pdfPane}
      </main>
    );
  }

  return (
    <main className={cx('workspace', tab === 'days' && 'fit-screen', pdfOpen && 'with-pdf-pane')}>
      <button type="button" className="back-link" onClick={back}>
        ← Clients
      </button>
      <div className="workspace-header">
        <h1>{playerName}'s training</h1>
        {pdfToggle}
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
      {pdfPane}
    </main>
  );
}
