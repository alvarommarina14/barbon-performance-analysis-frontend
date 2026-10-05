import { createContext, use, useCallback, useRef, useState, type ReactNode } from 'react';
import { Modal } from './Modal';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((answer: boolean) => void) | null>(null);

  const confirm = useCallback<Confirm>((next) => {
    resolver.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function answer(value: boolean) {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  }

  return (
    <ConfirmContext value={confirm}>
      {children}
      {options ? (
        <Modal title={options.title} onClose={() => answer(false)}>
          <p className="lede">{options.message}</p>
          <div className="button-row">
            <button
              type="button"
              className={options.danger ? 'primary danger' : 'primary'}
              onClick={() => answer(true)}
            >
              {options.confirmLabel}
            </button>
            <button type="button" className="ghost" data-autofocus onClick={() => answer(false)}>
              {options.cancelLabel ?? 'Cancel'}
            </button>
          </div>
        </Modal>
      ) : null}
    </ConfirmContext>
  );
}

export function useConfirm(): Confirm {
  const context = use(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used inside a ConfirmProvider');
  }
  return context;
}
