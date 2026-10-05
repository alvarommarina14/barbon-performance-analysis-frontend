import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Counts open dialogs so a confirm opened on top of a modal does not wake the app up when it closes.
let openDialogs = 0;

function setAppInert(inert: boolean) {
  const root = document.getElementById('root');
  if (root) {
    root.inert = inert;
  }
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  closeDisabled?: boolean;
  wide?: boolean;
}

export function Modal({ title, onClose, children, closeDisabled = false, wide = false }: ModalProps) {
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    openDialogs += 1;
    setAppInert(true);

    const node = dialog.current;
    const preferred = node?.querySelector<HTMLElement>('[data-autofocus]');
    const first = node?.querySelector<HTMLElement>(FOCUSABLE);
    (preferred ?? first ?? node)?.focus();

    return () => {
      openDialogs -= 1;
      if (openDialogs === 0) {
        setAppInert(false);
      }
      previous?.focus();
    };
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      if (!closeDisabled) {
        onClose();
      }
      return;
    }
    if (event.key !== 'Tab' || !dialog.current) {
      return;
    }
    const focusable = Array.from(dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div className="modal-overlay">
      <div
        ref={dialog}
        className={wide ? 'panel modal modal-wide' : 'panel modal'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId} className="section-title">
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
