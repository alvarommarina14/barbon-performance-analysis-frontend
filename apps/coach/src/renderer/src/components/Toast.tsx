import {
  createContext,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface ToastValue {
  show: (message: string) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((next: string) => {
    setMessage(next);
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => setMessage(null), 4000);
  }, []);

  const value = useMemo<ToastValue>(() => ({ show }), [show]);

  return (
    <ToastContext value={value}>
      {children}
      {/* The live region has to exist before the message arrives, or screen readers skip it. */}
      <div role="status" aria-live="polite">
        {message ? <div className="toast">{message}</div> : null}
      </div>
    </ToastContext>
  );
}

export function useToast(): ToastValue {
  const context = use(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider');
  }
  return context;
}
