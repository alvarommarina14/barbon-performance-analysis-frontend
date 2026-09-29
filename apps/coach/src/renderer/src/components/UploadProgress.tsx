interface UploadProgressProps {
  fraction: number;
  label?: string;
}

export function UploadProgress({ fraction, label = 'Uploading' }: UploadProgressProps) {
  const pct = Math.min(100, Math.round(fraction * 100));
  const processing = fraction >= 1;

  return (
    <div className="upload-progress" role="status" aria-live="polite">
      <div className="upload-progress-head">
        {processing ? <div className="spinner" /> : null}
        <span>{processing ? 'Processing…' : label}</span>
        {processing ? null : <span className="upload-progress-pct">{pct}%</span>}
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
