import { useAuth } from './auth/AuthContext';
import { ToastProvider } from './components/Toast';
import { cx } from './lib/cx';
import { type Screen, useNav } from './nav';
import AnalysisEditorScreen from './screens/AnalysisEditorScreen';
import CallsScreen from './screens/CallsScreen';
import ClientListScreen from './screens/ClientListScreen';
import ClientTrainingScreen from './screens/ClientTrainingScreen';
import CyclePhasesScreen from './screens/CyclePhasesScreen';
import DrillLibraryScreen from './screens/DrillLibraryScreen';
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
  'cycle-phases',
  'rpe-guide',
  'red-flags',
  'warmup-recovery',
  'calls',
]);

function modeOf(screen: Screen): Mode {
  return SETUP_SCREENS.has(screen.name) ? 'setup' : 'coaching';
}

export default function Shell() {
  const { user, logout } = useAuth();
  const { screen, reset } = useNav();
  const mode = modeOf(screen);

  return (
    <ToastProvider>
      <div className="shell">
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
                onClick={() => reset({ name: 'queue' })}
              >
                Coaching
              </button>
              <button
                type="button"
                className={cx('shell-switch-seg', mode === 'setup' && 'is-active')}
                onClick={() => reset({ name: 'library' })}
              >
                Setup
              </button>
            </div>
            <div className="workspace-user">
              <span>{user?.name}</span>
              <button type="button" className="ghost" onClick={logout}>
                Sign out
              </button>
            </div>
          </header>

          <nav className="shell-subnav">
            {mode === 'coaching' ? (
              <>
                <button
                  type="button"
                  className={cx('shell-tab', screen.name === 'queue' && 'is-active')}
                  onClick={() => reset({ name: 'queue' })}
                >
                  Queue
                </button>
                <button
                  type="button"
                  className={cx('shell-tab', screen.name === 'clients' && 'is-active')}
                  onClick={() => reset({ name: 'clients' })}
                >
                  Clients
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={cx('shell-tab', screen.name === 'library' && 'is-active')}
                  onClick={() => reset({ name: 'library' })}
                >
                  Library
                </button>
                <button
                  type="button"
                  className={cx('shell-tab', screen.name === 'recording-tips' && 'is-active')}
                  onClick={() => reset({ name: 'recording-tips' })}
                >
                  Recording tips
                </button>
                <button
                  type="button"
                  className={cx('shell-tab', screen.name === 'cycle-phases' && 'is-active')}
                  onClick={() => reset({ name: 'cycle-phases' })}
                >
                  Cycle phases
                </button>
                <button
                  type="button"
                  className={cx('shell-tab', screen.name === 'rpe-guide' && 'is-active')}
                  onClick={() => reset({ name: 'rpe-guide' })}
                >
                  RPE guide
                </button>
                <button
                  type="button"
                  className={cx('shell-tab', screen.name === 'red-flags' && 'is-active')}
                  onClick={() => reset({ name: 'red-flags' })}
                >
                  Red flags
                </button>
                <button
                  type="button"
                  className={cx('shell-tab', screen.name === 'warmup-recovery' && 'is-active')}
                  onClick={() => reset({ name: 'warmup-recovery' })}
                >
                  Warm-up &amp; recovery
                </button>
                <button
                  type="button"
                  className={cx('shell-tab', screen.name === 'calls' && 'is-active')}
                  onClick={() => reset({ name: 'calls' })}
                >
                  Calls
                </button>
              </>
            )}
          </nav>
        </div>

        <div className="shell-body">
          {screen.name === 'queue' && <QueueScreen />}
          {screen.name === 'clients' && <ClientListScreen />}
          {screen.name === 'library' && <DrillLibraryScreen />}
          {screen.name === 'recording-tips' && <RecordingTipsScreen />}
          {screen.name === 'cycle-phases' && <CyclePhasesScreen />}
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
