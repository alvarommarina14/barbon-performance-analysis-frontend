import type { components } from '@barbon-performance-analysis/api-client';
import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type SubmissionSummary = components['schemas']['SubmissionSummary'];

export type Screen =
  | { name: 'queue' }
  | { name: 'clients' }
  | { name: 'library' }
  | { name: 'recording-tips' }
  | { name: 'cycle-phases' }
  | { name: 'rpe-guide' }
  | { name: 'red-flags' }
  | { name: 'review'; submission: SubmissionSummary }
  | { name: 'editor'; analysisId: string }
  | { name: 'client-training'; playerProfileId: string; playerName: string };

interface NavValue {
  screen: Screen;
  navigate: (screen: Screen) => void;
  back: () => void;
  reset: (screen: Screen) => void;
  canGoBack: boolean;
}

const NavContext = createContext<NavValue | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Screen[]>([{ name: 'queue' }]);

  const navigate = useCallback((screen: Screen) => setStack((prev) => [...prev, screen]), []);
  const back = useCallback(
    () => setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev)),
    [],
  );
  const reset = useCallback((screen: Screen) => setStack([screen]), []);

  const value = useMemo<NavValue>(
    () => ({
      screen: stack[stack.length - 1] ?? { name: 'queue' },
      navigate,
      back,
      reset,
      canGoBack: stack.length > 1,
    }),
    [stack, navigate, back, reset],
  );

  return <NavContext value={value}>{children}</NavContext>;
}

export function useNav(): NavValue {
  const context = use(NavContext);
  if (!context) {
    throw new Error('useNav must be used inside a NavProvider');
  }
  return context;
}
