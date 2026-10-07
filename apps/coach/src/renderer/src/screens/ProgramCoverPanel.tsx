import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useUnsavedChanges } from '../nav';

export interface ProgramCover {
  name: string;
  athleteLevel: string;
  about: string;
  schedule: string;
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
  a.schedule.trim() === b.schedule.trim();

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
      <p className="lede">The first page of the program PDF.</p>
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
        />
      </label>
      <label className="field">
        <span>Schedule</span>
        <textarea
          className="textarea"
          placeholder="e.g. Days 1 and 3 on court days, Day 2 on a rest day"
          value={draft.schedule}
          onChange={(e) => setDraft({ ...draft, schedule: e.target.value })}
        />
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
