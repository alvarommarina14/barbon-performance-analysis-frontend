import { useEffect, useState } from 'react';

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    void window.barbonAnalysis.windowControls.isMaximized().then(setMaximized);
    return window.barbonAnalysis.windowControls.onMaximizeChange(setMaximized);
  }, []);

  return (
    <div className="titlebar">
      <div className="titlebar-drag" onDoubleClick={() => window.barbonAnalysis.windowControls.toggleMaximize()}>
        <span className="titlebar-title">Barbon Performance Analysis</span>
      </div>
      <div className="titlebar-controls">
        <button
          type="button"
          className="titlebar-btn"
          aria-label="Minimize"
          onClick={() => window.barbonAnalysis.windowControls.minimize()}
        >
          <svg viewBox="0 0 10 10" width="10" height="10">
            <rect x="0" y="4.5" width="10" height="1" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          className="titlebar-btn"
          aria-label={maximized ? 'Restore' : 'Maximize'}
          onClick={() => window.barbonAnalysis.windowControls.toggleMaximize()}
        >
          {maximized ? (
            <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor">
              <rect x="2.5" y="0.5" width="6" height="6" />
              <path d="M0.5 2.5V8.5H6.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor">
              <rect x="0.5" y="0.5" width="9" height="9" />
            </svg>
          )}
        </button>
        <button
          type="button"
          className="titlebar-btn titlebar-close"
          aria-label="Close"
          onClick={() => window.barbonAnalysis.windowControls.close()}
        >
          <svg viewBox="0 0 10 10" width="10" height="10" stroke="currentColor">
            <line x1="0.5" y1="0.5" x2="9.5" y2="9.5" />
            <line x1="9.5" y1="0.5" x2="0.5" y2="9.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
