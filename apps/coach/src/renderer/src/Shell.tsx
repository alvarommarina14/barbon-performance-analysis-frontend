import { useEffect, useRef } from 'react';
import { useAuth } from './auth/AuthContext';
import { ToastProvider } from './components/Toast';
import { cx } from './lib/cx';
import { type Screen, useNav } from './nav';
import AnalysisEditorScreen from './screens/AnalysisEditorScreen';
import CallsScreen from './screens/CallsScreen';
import ClientListScreen from './screens/ClientListScreen';
import ClientTrainingScreen from './screens/ClientTrainingScreen';
import DrillLibraryScreen from './screens/DrillLibraryScreen';
import ProgramTemplateScreen from './screens/ProgramTemplateScreen';
import ProgramTemplatesScreen from './screens/ProgramTemplatesScreen';
import QueueScreen from './screens/QueueScreen';
import RecordingTipsScreen from './screens/RecordingTipsScreen';
import RedFlagsScreen from './screens/RedFlagsScreen';
import ReviewScreen from './screens/ReviewScreen';
import RpeGuideScreen from './screens/RpeGuideScreen';
import WarmupRecoveryScreen from './screens/WarmupRecoveryScreen';

type Mode = 'coaching' | 'setup';

// Setup is everything a coach configures once in a while (org-wide content and templates);
// coaching is the day-to-day work, including the drill-down screens pushed on top of it.
const SETUP_SCREENS = new Set<Screen['name']>([
  'library',
  'recording-tips',
  'program-templates',
  'program-template',
  'rpe-guide',
  'red-flags',
  'warmup-recovery',
  'calls',
]);

function modeOf(screen: Screen): Mode {
  return SETUP_SCREENS.has(screen.name) ? 'setup' : 'coaching';
}

type TabScreen =
  | 'queue'
  | 'clients'
  | 'library'
  | 'recording-tips'
  | 'program-templates'
  | 'rpe-guide'
  | 'red-flags'
  | 'warmup-recovery'
  | 'calls';

const COACHING_TABS: { name: TabScreen; label: string }[] = [
  { name: 'queue', label: 'Queue' },
  { name: 'clients', label: 'Clients' },
];

const SETUP_TABS: { name: TabScreen; label: string }[] = [
  { name: 'library', label: 'Library' },
  { name: 'recording-tips', label: 'Recording tips' },
  { name: 'program-templates', label: 'Program templates' },
  { name: 'rpe-guide', label: 'RPE guide' },
  { name: 'red-flags', label: 'Red flags' },
  { name: 'warmup-recovery', label: 'Warm-up & recovery' },
  { name: 'calls', label: 'Calls' },
];

// Drill-down screens keep their parent tab lit, so the coach always sees where they are.
function sectionOf(screen: Screen): Screen['name'] {
  if (screen.name === 'client-training') {
    return 'clients';
  }
  if (screen.name === 'review' || screen.name === 'editor') {
    return 'queue';
  }
  if (screen.name === 'program-template') {
    return 'program-templates';
  }
  return screen.name;
}

export default function Shell() {
  const { user, logout } = useAuth();
  const { screen, reset, leaveThen } = useNav();
  const mode = modeOf(screen);
  const section = sectionOf(screen);
  const body = useRef<HTMLDivElement>(null);

  // A new screen moves focus to its heading and names the window, so a screen reader announces
  // where the coach landed instead of leaving focus on a button that no longer exists.
  useEffect(() => {
    const heading = body.current?.querySelector('h1');
    document.title = heading?.textContent
      ? `${heading.textContent} — Barbon Performance Analysis`
      : 'Barbon Performance Analysis';
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }, [screen]);

  return (
    <ToastProvider>
      <div className="shell" data-mode={mode}>
        <div className="shell-header">
          <header className="shell-bar">
            <div className="shell-brand">
              <p className="eyebrow">Barbon Performance</p>
              <strong>Analysis</strong>
            </div>
            <div className="shell-switch">
              <button
                type="button"
                className={cx('shell-switch-seg', mode === 'coaching' && 'is-active')}
                aria-current={mode === 'coaching' ? 'page' : undefined}
                onClick={() => reset({ name: 'queue' })}
              >
                Coaching
              </button>
              <button
                type="button"
                className={cx('shell-switch-seg', mode === 'setup' && 'is-active')}
                aria-current={mode === 'setup' ? 'page' : undefined}
                onClick={() => reset({ name: 'library' })}
              >
                Setup
              </button>
            </div>
            <div className="workspace-user">
              <span>{user?.name}</span>
              <button type="button" className="ghost" onClick={() => leaveThen(() => void logout())}>
                Sign out
              </button>
            </div>
          </header>

          <nav className="shell-subnav" aria-label={mode === 'coaching' ? 'Coaching' : 'Setup'}>
            {(mode === 'coaching' ? COACHING_TABS : SETUP_TABS).map(({ name, label }) => (
              <button
                key={name}
                type="button"
                className={cx('shell-tab', section === name && 'is-active')}
                aria-current={section === name ? 'page' : undefined}
                onClick={() => reset({ name })}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="shell-body" ref={body}>
          {screen.name === 'queue' && <QueueScreen />}
          {screen.name === 'clients' && <ClientListScreen />}
          {screen.name === 'library' && <DrillLibraryScreen />}
          {screen.name === 'recording-tips' && <RecordingTipsScreen />}
          {screen.name === 'program-templates' && <ProgramTemplatesScreen />}
          {screen.name === 'program-template' && (
            <ProgramTemplateScreen key={screen.templateId} templateId={screen.templateId} />
          )}
          {screen.name === 'rpe-guide' && <RpeGuideScreen />}
          {screen.name === 'red-flags' && <RedFlagsScreen />}
          {screen.name === 'warmup-recovery' && <WarmupRecoveryScreen />}
          {screen.name === 'calls' && <CallsScreen />}
          {screen.name === 'review' && <ReviewScreen submission={screen.submission} />}
          {screen.name === 'editor' && (
            <AnalysisEditorScreen key={screen.analysisId} analysisId={screen.analysisId} />
          )}
          {screen.name === 'client-training' && (
            <ClientTrainingScreen
              key={screen.playerProfileId}
              playerProfileId={screen.playerProfileId}
              playerName={screen.playerName}
            />
          )}
        </div>
      </div>
    </ToastProvider>
  );
}
