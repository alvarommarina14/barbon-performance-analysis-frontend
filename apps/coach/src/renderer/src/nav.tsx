import type { components } from '@barbon-performance-analysis/api-client';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useConfirm } from './components/Confirm';

type SubmissionSummary = components['schemas']['SubmissionSummary'];

export type Screen =
  | { name: 'queue' }
  | { name: 'clients' }
  | { name: 'library' }
  | { name: 'recording-tips' }
  | { name: 'program-templates' }
  | { name: 'program-template'; templateId: string }
  | { name: 'rpe-guide' }
  | { name: 'red-flags' }
  | { name: 'warmup-recovery' }
  | { name: 'calls' }
  | { name: 'review'; submission: SubmissionSummary }
  | { name: 'editor'; analysisId: string }
  | { name: 'client-training'; playerProfileId: string; playerName: string };

interface NavValue {
  screen: Screen;
  navigate: (screen: Screen) => void;
  back: () => void;
  reset: (screen: Screen) => void;
  canGoBack: boolean;
  // Runs `action` once the user has agreed to drop any unsaved changes (at once when there are none).
  leaveThen: (action: () => void) => void;
  setUnsaved: (owner: string, unsaved: boolean) => void;
  // For flows that throw the edits away on purpose (discarding a draft) right before navigating.
  forgetUnsaved: () => void;
}

const NavContext = createContext<NavValue | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const confirm = useConfirm();
  const [stack, setStack] = useState<Screen[]>([{ name: 'queue' }]);
  const unsavedOwners = useRef(new Set<string>());

  const setUnsaved = useCallback((owner: string, unsaved: boolean) => {
    if (unsaved) {
      unsavedOwners.current.add(owner);
    } else {
      unsavedOwners.current.delete(owner);
    }
  }, []);

  const forgetUnsaved = useCallback(() => unsavedOwners.current.clear(), []);

  const leaveThen = useCallback(
    (action: () => void) => {
      if (unsavedOwners.current.size === 0) {
        action();
        return;
      }
      void confirm({
        title: 'Discard unsaved changes?',
        message: 'You have changes that are not saved yet. If you leave now, they are lost.',
        confirmLabel: 'Discard changes',
        cancelLabel: 'Keep editing',
        danger: true,
      }).then((discard) => {
        if (discard) {
          unsavedOwners.current.clear();
          action();
        }
      });
    },
    [confirm],
  );

  // Electron cancels a close or reload silently when this is set; the main process turns that
  // into a native prompt (see will-prevent-unload in main/index.ts).
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (unsavedOwners.current.size > 0) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const navigate = useCallback(
    (screen: Screen) => leaveThen(() => setStack((prev) => [...prev, screen])),
    [leaveThen],
  );
  const back = useCallback(
    () => leaveThen(() => setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))),
    [leaveThen],
  );
  const reset = useCallback((screen: Screen) => leaveThen(() => setStack([screen])), [leaveThen]);

  const value = useMemo<NavValue>(
    () => ({
      screen: stack[stack.length - 1] ?? { name: 'queue' },
      navigate,
      back,
      reset,
      canGoBack: stack.length > 1,
      leaveThen,
      setUnsaved,
      forgetUnsaved,
    }),
    [stack, navigate, back, reset, leaveThen, setUnsaved, forgetUnsaved],
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

// Marks the calling screen as holding unsaved changes while `unsaved` is true, so leaving it
// (navigation, tab switches that go through leaveThen, closing the window) asks first.
export function useUnsavedChanges(unsaved: boolean) {
  const owner = useId();
  const { setUnsaved } = useNav();

  useEffect(() => {
    setUnsaved(owner, unsaved);
    return () => setUnsaved(owner, false);
  }, [owner, unsaved, setUnsaved]);
}
