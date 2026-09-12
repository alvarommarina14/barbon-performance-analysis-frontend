import { useAuth } from './auth/AuthContext';
import { ToastProvider } from './components/Toast';
import { cx } from './lib/cx';
import { useNav } from './nav';
import AnalysisEditorScreen from './screens/AnalysisEditorScreen';
import ClientListScreen from './screens/ClientListScreen';
import DrillLibraryScreen from './screens/DrillLibraryScreen';
import QueueScreen from './screens/QueueScreen';
import ReviewScreen from './screens/ReviewScreen';

export default function Shell() {
  const { user, logout } = useAuth();
  const { screen, reset } = useNav();

  return (
    <ToastProvider>
      <div className="shell">
        <header className="shell-bar">
          <div className="shell-brand">
            <p className="eyebrow">Barbon Performance</p>
            <strong>Analysis</strong>
          </div>
          <nav className="shell-nav">
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
            <button
              type="button"
              className={cx('shell-tab', screen.name === 'library' && 'is-active')}
              onClick={() => reset({ name: 'library' })}
            >
              Library
            </button>
          </nav>
          <div className="workspace-user">
            <span>{user?.name}</span>
            <button type="button" className="ghost" onClick={logout}>
              Sign out
            </button>
          </div>
        </header>

        <div className="shell-body">
          {screen.name === 'queue' && <QueueScreen />}
          {screen.name === 'clients' && <ClientListScreen />}
          {screen.name === 'library' && <DrillLibraryScreen />}
          {screen.name === 'review' && <ReviewScreen submission={screen.submission} />}
          {screen.name === 'editor' && (
            <AnalysisEditorScreen key={screen.analysisId} analysisId={screen.analysisId} />
          )}
        </div>
      </div>
    </ToastProvider>
  );
}
