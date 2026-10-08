import { type ReactNode, useId } from 'react';

export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const tipId = useId();
  return (
    <span className="info-tip" tabIndex={0} aria-label={label} aria-describedby={tipId}>
      i
      <span className="info-tip-text" role="tooltip" id={tipId}>
        {children}
      </span>
    </span>
  );
}
