import type { components } from '@barbon-performance-analysis/api-client';
import { useEffect, useMemo, useState } from 'react';
import { cx } from '../lib/cx';
import { useUnsavedChanges } from '../nav';

type RedFlagView = components['schemas']['RedFlagView'];
type RedFlagInput = components['schemas']['RedFlagInput'];

interface Row {
  key: string;
  title: string;
  body: string;
}

let nextKey = 0;
const newKey = () => `row-${nextKey++}`;

const toRows = (flags: RedFlagView[]): Row[] =>
  flags.map((flag) => ({ key: flag.id, title: flag.title, body: flag.body ?? '' }));

const serialize = (rows: Row[]): string =>
  JSON.stringify(rows.map((r) => [r.title.trim(), r.body.trim()]));

interface RedFlagEditorProps {
  flags: RedFlagView[];
  saving: boolean;
  error: string | null;
  placeholder: string;
  onSave: (flags: RedFlagInput[]) => void;
  library?: RedFlagView[];
}

export function RedFlagEditor({
  flags,
  saving,
  error,
  placeholder,
  onSave,
  library,
}: RedFlagEditorProps) {
  const [rows, setRows] = useState<Row[]>(() => toRows(flags));
  const savedShape = useMemo(() => serialize(toRows(flags)), [flags]);

  useEffect(() => {
    setRows(toRows(flags));
  }, [flags]);

  const dirty = serialize(rows) !== savedShape;
  const anyBlank = rows.some((r) => !r.title.trim());
  useUnsavedChanges(dirty);

  function update(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function move(index: number, delta: number) {
    setRows((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) {
        return prev;
      }
      const copy = [...prev];
      const [row] = copy.splice(index, 1);
      copy.splice(target, 0, row as Row);
      return copy;
    });
  }

  function addFromLibrary(flag: RedFlagView) {
    setRows((prev) => [...prev, { key: newKey(), title: flag.title, body: flag.body ?? '' }]);
  }

  const editor = (
    <>
      {rows.length === 0 ? <p className="lede">No red flags yet.</p> : null}
      <div className="findings-list">
        {rows.map((row, index) => (
          <div className="panel red-flag-row" key={row.key}>
            <label className="field">
              <span>Red flag</span>
              <input
                placeholder={placeholder}
                value={row.title}
                onChange={(e) => update(row.key, { title: e.target.value })}
              />
            </label>
            <label className="field">
              <span>What to do (optional)</span>
              <input
                placeholder="Stop the exercise and message your coach."
                value={row.body}
                onChange={(e) => update(row.key, { body: e.target.value })}
              />
            </label>
            <div className="button-row">
              <button
                type="button"
                className="ghost"
                aria-label={`Move red flag ${index + 1} up`}
                onClick={() => move(index, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="ghost"
                aria-label={`Move red flag ${index + 1} down`}
                onClick={() => move(index, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="ghost"
                aria-label={`Remove red flag ${index + 1}`}
                onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="findings-foot">
        <div className="button-row">
          <button
            type="button"
            className="ghost"
            onClick={() => setRows((prev) => [...prev, { key: newKey(), title: '', body: '' }])}
          >
            + Add a red flag
          </button>
          <button
            type="button"
            className="primary"
            disabled={saving || !dirty || anyBlank}
            onClick={() =>
              onSave(
                rows.map((r) => ({ title: r.title.trim(), body: r.body.trim() || undefined })),
              )
            }
          >
            {saving ? 'Saving…' : 'Save red flags'}
          </button>
        </div>
        {anyBlank ? <p className="lede">Every red flag needs a text before it can be saved.</p> : null}
        {error ? <p className="error" role="alert">{error}</p> : null}
      </div>
    </>
  );

  if (!library) {
    return editor;
  }

  return (
    <div className="editor">
      <div className="editor-main">{editor}</div>
      <div className="editor-side">
        <div className="panel findings-panel">
          <h2 className="section-title">Red flag library</h2>
          {library.length === 0 ? (
            <p className="lede">Your library is empty — add red flags under Setup → Red flags.</p>
          ) : (
            <div className="findings-list">
              {library.map((flag) => {
                const added = rows.some((r) => r.title.trim() === flag.title);
                return (
                  <button
                    key={flag.id}
                    type="button"
                    className={cx('drill-pick', added && 'is-added')}
                    disabled={added}
                    onClick={() => addFromLibrary(flag)}
                  >
                    <strong>{flag.title}</strong>
                    {flag.body ? <span className="drill-cue">{flag.body}</span> : null}
                    <span className="drill-pick-add">{added ? 'Added' : '+ Add'}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
