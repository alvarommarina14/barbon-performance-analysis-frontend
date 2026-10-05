// A failed load must never look like an empty list: several screens save the whole list back,
// so editing an "empty" list that only failed to load would wipe what is really there.
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="load-error" role="alert">
      <p className="error">{message}</p>
      <button type="button" className="ghost" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
