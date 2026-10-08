import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { boldOnCtrlB } from '../lib/bold';
import { useUnsavedChanges } from '../nav';

export interface ProgramCover {
  name: string;
  athleteLevel: string;
  about: string;
  schedule: string;
  cycleNote: string;
}

interface ProgramCoverPanelProps {
  cover: ProgramCover;
  // A template has a name and no athlete; a client's program has an athlete and no name.
  variant: 'client' | 'template';
  save: (cover: ProgramCover) => Promise<void>;
}

const same = (a: ProgramCover, b: ProgramCover) =>
  a.name.trim() === b.name.trim() &&
  a.athleteLevel.trim() === b.athleteLevel.trim() &&
  a.about.trim() === b.about.trim() &&
  a.schedule.trim() === b.schedule.trim() &&
  a.cycleNote.trim() === b.cycleNote.trim();

export default function ProgramCoverPanel({ cover, variant, save }: ProgramCoverPanelProps) {
  const [draft, setDraft] = useState(cover);
  const dirty = !same(draft, cover);

  useEffect(() => {
    setDraft(cover);
  }, [cover]);

  useUnsavedChanges(dirty);

  const saveCover = useMutation({ mutationFn: () => save(draft) });

  const nameMissing = variant === 'template' && !draft.name.trim();

  return (
    <div className="panel program-cover">
      <h2 className="section-title">Cover</h2>
      <p className="lede">
        The first page of the program PDF. Select words and press Ctrl+B — or type **like this** — to
        print them in bold.
      </p>
      {variant === 'template' ? (
        <label className="field">
          <span>Template name</span>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </label>
      ) : (
        <label className="field">
          <span>Athlete level</span>
          <input
            placeholder="e.g. Advanced junior"
            value={draft.athleteLevel}
            onChange={(e) => setDraft({ ...draft, athleteLevel: e.target.value })}
          />
        </label>
      )}
      <label className="field">
        <span>About your program</span>
        <textarea
          className="textarea"
          placeholder="What this program is for and how it builds over the weeks"
          value={draft.about}
          onChange={(e) => setDraft({ ...draft, about: e.target.value })}
          onKeyDown={boldOnCtrlB}
        />
      </label>
      <label className="field">
        <span>How to schedule</span>
        <textarea
          className="textarea"
          placeholder="e.g. Days 1 and 3 on court days, Day 2 on a rest day"
          value={draft.schedule}
          onChange={(e) => setDraft({ ...draft, schedule: e.target.value })}
          onKeyDown={boldOnCtrlB}
        />
      </label>
      <label className="field">
        <span>4-week cycle</span>
        <textarea
          className="textarea"
          placeholder="e.g. Deload weeks are non-negotiable — they let the body adapt to the previous 3 weeks of work."
          value={draft.cycleNote}
          onChange={(e) => setDraft({ ...draft, cycleNote: e.target.value })}
          onKeyDown={boldOnCtrlB}
        />
        <small className="field-hint">
          Follows “Repeat the 4-week cycle continuously: Week 1 (Base) → …”, which the PDF builds from the
          cycle weeks.
        </small>
      </label>
      <button
        type="button"
        className="primary"
        disabled={saveCover.isPending || !dirty || nameMissing}
        onClick={() => saveCover.mutate()}
      >
        {saveCover.isPending ? 'Saving…' : 'Save cover'}
      </button>
      {saveCover.isError ? <p className="error" role="alert">{saveCover.error.message}</p> : null}
    </div>
  );
}
