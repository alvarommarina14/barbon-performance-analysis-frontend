interface VideoLoaderProps {
  // 0..1 while the clip downloads, or null before the first byte / on a stall.
  fraction: number | null;
  label?: string;
}

export function VideoLoader({ fraction, label = 'Loading video' }: VideoLoaderProps) {
  const pct = fraction == null ? null : Math.min(100, Math.round(fraction * 100));

  return (
    <div className="video-loader" role="status" aria-live="polite">
      {pct == null ? (
        <div className="spinner" />
      ) : (
        <>
          <span className="video-loader-pct">{pct}%</span>
          <div className="video-loader-track">
            <div className="video-loader-fill" style={{ width: `${pct}%` }} />
          </div>
        </>
      )}
      <span className="video-loader-label">{label}</span>
    </div>
  );
}
