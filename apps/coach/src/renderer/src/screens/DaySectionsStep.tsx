import type { components } from '@barbon-performance-analysis/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type DragEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { DrillThumb } from '../components/DrillThumb';
import { LoadError } from '../components/LoadError';
import { cx } from '../lib/cx';
import { problemDetail } from '../lib/problem';
import { uid } from '../lib/uid';
import { useUnsavedChanges } from '../nav';

type LibraryItem = components['schemas']['LibraryItemView'];
type DaySectionView = components['schemas']['DaySectionView'];

const WEEK_FIELDS = ['setsRepsWk1', 'setsRepsWk2', 'setsRepsWk3', 'setsRepsWk4'] as const;
const LIBRARY_ITEM_TYPE = 'application/x-barbon-library-item';

interface ExerciseRow {
  key: string;
  id: string | null;
  libraryItemId: string;
  title: string;
  cueOverride: string;
  notes: string;
  setsRepsWk1: string;
  setsRepsWk2: string;
  setsRepsWk3: string;
  setsRepsWk4: string;
}

interface BlockRow {
  key: string;
  id: string | null;
  title: string;
  note: string;
  exercises: ExerciseRow[];
}

const toBlocks = (sections: DaySectionView[]): BlockRow[] =>
  sections.map((section) => ({
    key: section.id,
    id: section.id,
    title: section.title,
    note: section.note ?? '',
    exercises: section.exercises.map((e) => ({
      key: e.id,
      id: e.id,
      libraryItemId: e.libraryItemId,
      title: e.title,
      cueOverride: e.cueOverride ?? '',
      notes: e.notes ?? '',
      setsRepsWk1: e.setsRepsWk1 ?? '',
      setsRepsWk2: e.setsRepsWk2 ?? '',
      setsRepsWk3: e.setsRepsWk3 ?? '',
      setsRepsWk4: e.setsRepsWk4 ?? '',
    })),
  }));

// A null blockKey is the empty day: dropping there opens its first block.
interface DropTarget {
  blockKey: string | null;
  index: number;
}

const blankBlock = (title = ''): BlockRow => ({ key: uid(), id: null, title, note: '', exercises: [] });

export default function DaySectionsStep({ trainingDayId }: { trainingDayId: string }) {
  const queryClient = useQueryClient();
  const sectionsKey = ['strength', 'training-day', trainingDayId, 'sections'];

  const sections = useQuery({
    queryKey: sectionsKey,
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/training-days/{trainingDayId}/sections', {
        params: { path: { trainingDayId } },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the blocks');
      }
      return data;
    },
  });

  const library = useQuery({
    queryKey: ['drills', 'library'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/drills/library');
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the drill library');
      }
      return data;
    },
  });

  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  useEffect(() => {
    if (sections.data && !dirty) {
      setBlocks(toBlocks(sections.data));
    }
  }, [sections.data, dirty]);

  useUnsavedChanges(dirty);

  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.PUT('/api/v1/strength/training-days/{trainingDayId}/sections', {
        params: { path: { trainingDayId } },
        body: {
          sections: blocks.map((b) => ({
            id: b.id ?? undefined,
            title: b.title.trim(),
            note: b.note.trim() || undefined,
            exercises: b.exercises.map((e) => ({
              id: e.id ?? undefined,
              libraryItemId: e.libraryItemId,
              cueOverride: e.cueOverride.trim() || undefined,
              notes: e.notes.trim() || undefined,
              setsRepsWk1: e.setsRepsWk1.trim() || undefined,
              setsRepsWk2: e.setsRepsWk2.trim() || undefined,
              setsRepsWk3: e.setsRepsWk3.trim() || undefined,
              setsRepsWk4: e.setsRepsWk4.trim() || undefined,
            })),
          })),
        },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not save the blocks');
      }
      return data;
    },
    onSuccess: (data) => {
      setDirty(false);
      setActiveKey(null);
      queryClient.setQueryData(sectionsKey, data);
      void queryClient.invalidateQueries({ queryKey: ['strength', 'training-days'] });
      void queryClient.invalidateQueries({ queryKey: ['strength', 'program-template'] });
    },
  });

  function edit(change: (prev: BlockRow[]) => BlockRow[]) {
    setBlocks(change);
    setDirty(true);
  }

  const activeBlock = blocks.find((b) => b.key === activeKey) ?? blocks[blocks.length - 1];

  function addBlock() {
    const block = blankBlock();
    edit((prev) => [...prev, block]);
    setActiveKey(block.key);
  }

  function updateBlock(key: string, patch: Partial<Omit<BlockRow, 'exercises'>>) {
    edit((prev) => prev.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  }

  function moveBlock(index: number, delta: number) {
    edit((prev) => {
      const j = index + delta;
      if (j < 0 || j >= prev.length) {
        return prev;
      }
      const copy = [...prev];
      const [block] = copy.splice(index, 1);
      copy.splice(j, 0, block as BlockRow);
      return copy;
    });
  }

  function removeBlock(key: string) {
    edit((prev) => prev.filter((b) => b.key !== key));
  }

  function addExercise(item: LibraryItem, target?: DropTarget) {
    const row: ExerciseRow = {
      key: uid(),
      id: null,
      libraryItemId: item.id,
      title: item.title,
      cueOverride: '',
      notes: '',
      setsRepsWk1: '',
      setsRepsWk2: '',
      setsRepsWk3: '',
      setsRepsWk4: '',
    };
    const blockKey = target ? target.blockKey : (activeBlock?.key ?? null);
    if (blockKey === null) {
      const block = { ...blankBlock('Exercises'), exercises: [row] };
      edit(() => [block]);
      setActiveKey(block.key);
      return;
    }
    const index = target?.index ?? Infinity;
    edit((prev) =>
      prev.map((b) => (b.key === blockKey ? { ...b, exercises: b.exercises.toSpliced(index, 0, row) } : b)),
    );
    setActiveKey(blockKey);
  }

  function dragOver(event: DragEvent<HTMLElement>, target: DropTarget) {
    if (!event.dataTransfer.types.includes(LIBRARY_ITEM_TYPE)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    setDropTarget((prev) =>
      prev?.blockKey === target.blockKey && prev.index === target.index ? prev : target,
    );
  }

  function dragOverExercise(event: DragEvent<HTMLElement>, blockKey: string, exerciseIndex: number) {
    const rect = event.currentTarget.getBoundingClientRect();
    const below = event.clientY > rect.top + rect.height / 2;
    dragOver(event, { blockKey, index: exerciseIndex + (below ? 1 : 0) });
  }

  function drop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    const item = pickable.find((i) => i.id === event.dataTransfer.getData(LIBRARY_ITEM_TYPE));
    if (item && dropTarget) {
      addExercise(item, dropTarget);
    }
    setDropTarget(null);
  }

  function dragLeave(event: DragEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDropTarget(null);
    }
  }

  function updateExercise(key: string, patch: Partial<ExerciseRow>) {
    edit((prev) =>
      prev.map((b) => ({
        ...b,
        exercises: b.exercises.map((e) => (e.key === key ? { ...e, ...patch } : e)),
      })),
    );
  }

  // Past the first or last exercise of a block, an exercise moves into the neighbouring block, so
  // the arrows alone are enough to regroup a day without drag and drop.
  function moveExercise(blockIndex: number, exerciseIndex: number, delta: number) {
    edit((prev) => {
      const copy = prev.map((b) => ({ ...b, exercises: [...b.exercises] }));
      const block = copy[blockIndex];
      if (!block) {
        return prev;
      }
      const [row] = block.exercises.splice(exerciseIndex, 1);
      if (!row) {
        return prev;
      }
      const target = exerciseIndex + delta;
      if (target >= 0 && target <= block.exercises.length) {
        block.exercises.splice(target, 0, row);
        return copy;
      }
      const neighbour = copy[blockIndex + delta];
      if (!neighbour) {
        return prev;
      }
      if (delta < 0) {
        neighbour.exercises.push(row);
      } else {
        neighbour.exercises.unshift(row);
      }
      return copy;
    });
  }

  function removeExercise(key: string) {
    edit((prev) => prev.map((b) => ({ ...b, exercises: b.exercises.filter((e) => e.key !== key) })));
  }

  const addedIds = new Set(blocks.flatMap((b) => b.exercises.map((e) => e.libraryItemId)));
  const fitness = (library.data ?? []).filter((item) => item.category === 'FITNESS');
  const pickable = fitness.filter((item) => !addedIds.has(item.id));
  const anyBlockUntitled = blocks.some((b) => !b.title.trim());

  if (sections.isError) {
    return <LoadError message={sections.error.message} onRetry={() => sections.refetch()} />;
  }

  return (
    <div className="editor">
      <div className="editor-main">
        <div
          className={cx('panel findings-panel', dropTarget?.blockKey === null && 'is-drop-target')}
          onDragOver={(e) =>
            blocks.length === 0 ? dragOver(e, { blockKey: null, index: 0 }) : setDropTarget(null)
          }
          onDragLeave={dragLeave}
          onDrop={drop}
        >
          <div className="workspace-header">
            <h2 className="section-title">Blocks</h2>
            <button type="button" className="ghost" disabled={sections.isPending} onClick={addBlock}>
              + Add a block
            </button>
          </div>
          {sections.isPending ? (
            <p className="lede">Loading…</p>
          ) : blocks.length === 0 ? (
            <p className="lede">
              Split the day into blocks — “Injury prevention”, “Main work”, “Finisher” — and pick
              each block’s exercises from the library on the right, or drag them in.
            </p>
          ) : (
            <div className="findings-list">
              {blocks.map((block, blockIndex) => (
                <section
                  key={block.key}
                  className={cx(
                    'day-block',
                    block.key === activeBlock?.key && 'is-active',
                    dropTarget?.blockKey === block.key && 'is-drop-target',
                    dropTarget?.blockKey === block.key &&
                      block.exercises.length > 0 &&
                      dropTarget.index === block.exercises.length &&
                      'drop-at-end',
                  )}
                  onClick={() => setActiveKey(block.key)}
                  onFocus={() => setActiveKey(block.key)}
                  onDragOver={(e) => dragOver(e, { blockKey: block.key, index: block.exercises.length })}
                  onDrop={drop}
                >
                  <div className="day-block-head">
                    <input
                      aria-label={`Block ${blockIndex + 1} title`}
                      placeholder="Block title — e.g. Injury prevention"
                      value={block.title}
                      onChange={(e) => updateBlock(block.key, { title: e.target.value })}
                    />
                    <input
                      aria-label={`Block ${blockIndex + 1} note`}
                      placeholder="Note — e.g. 10–12 min"
                      value={block.note}
                      onChange={(e) => updateBlock(block.key, { note: e.target.value })}
                    />
                    <div className="day-actions">
                      <button type="button" className="ghost" aria-label={`Move block ${blockIndex + 1} up`} onClick={() => moveBlock(blockIndex, -1)}>
                        ↑
                      </button>
                      <button type="button" className="ghost" aria-label={`Move block ${blockIndex + 1} down`} onClick={() => moveBlock(blockIndex, 1)}>
                        ↓
                      </button>
                      <button type="button" className="ghost" aria-label={`Remove block ${blockIndex + 1}`} onClick={() => removeBlock(block.key)}>
                        Remove block
                      </button>
                    </div>
                  </div>

                  {block.exercises.length === 0 ? (
                    <p className="lede">
                      {block.key === activeBlock?.key
                        ? 'Exercises you pick from the library land here.'
                        : 'No exercises yet — drag one here, or click this block and pick from the library.'}
                    </p>
                  ) : (
                    block.exercises.map((row, exerciseIndex) => (
                      <div
                        className={cx(
                          'block-exercise',
                          dropTarget?.blockKey === block.key && dropTarget.index === exerciseIndex && 'drop-before',
                        )}
                        key={row.key}
                        onDragOver={(e) => dragOverExercise(e, block.key, exerciseIndex)}
                      >
                        <div className="block-exercise-head">
                          <strong>{row.title}</strong>
                          <div className="day-actions">
                            <button type="button" className="ghost" aria-label={`Move ${row.title} up`} onClick={() => moveExercise(blockIndex, exerciseIndex, -1)}>
                              ↑
                            </button>
                            <button type="button" className="ghost" aria-label={`Move ${row.title} down`} onClick={() => moveExercise(blockIndex, exerciseIndex, 1)}>
                              ↓
                            </button>
                            <button type="button" className="ghost" aria-label={`Remove ${row.title}`} onClick={() => removeExercise(row.key)}>
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="block-exercise-texts">
                          <label className="field">
                            <span>Cue override (optional)</span>
                            <textarea
                              className="textarea"
                              value={row.cueOverride}
                              onChange={(e) => updateExercise(row.key, { cueOverride: e.target.value })}
                            />
                          </label>
                          <label className="field">
                            <span>Notes (optional)</span>
                            <textarea
                              className="textarea"
                              placeholder="e.g. Use a light band, pause 2 s at the top"
                              value={row.notes}
                              onChange={(e) => updateExercise(row.key, { notes: e.target.value })}
                            />
                          </label>
                        </div>
                        <div className="week-fields">
                          {WEEK_FIELDS.map((field, i) => (
                            <label className="field" key={field}>
                              <span>Week {i + 1}</span>
                              <input
                                placeholder="3 × 10"
                                value={row[field]}
                                onChange={(e) => updateExercise(row.key, { [field]: e.target.value })}
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </section>
              ))}
            </div>
          )}
          <div className="findings-foot">
            {anyBlockUntitled ? <p className="lede">Every block needs a title before it can be saved.</p> : null}
            <button
              type="button"
              className="primary"
              disabled={save.isPending || !dirty || anyBlockUntitled}
              onClick={() => save.mutate()}
            >
              {save.isPending ? 'Saving…' : 'Save day'}
            </button>
            {save.isError ? <p className="error" role="alert">{save.error.message}</p> : null}
          </div>
        </div>
      </div>

      <div className="editor-side">
        <div className="panel findings-panel">
          <h2 className="section-title">Fitness library</h2>
          {activeBlock ? (
            <p className="lede">
              Adding to <strong>{activeBlock.title.trim() || `Block ${blocks.indexOf(activeBlock) + 1}`}</strong>
            </p>
          ) : null}
          {library.isError ? (
            <LoadError message={library.error.message} onRetry={() => library.refetch()} />
          ) : library.isPending ? (
            <p className="lede">Loading…</p>
          ) : fitness.length === 0 ? (
            <p className="lede">
              No fitness drills yet — add some from the Library tab (category Fitness).
            </p>
          ) : pickable.length === 0 ? (
            <p className="lede">Every fitness drill is already in this day.</p>
          ) : (
            <div className="findings-list">
              {pickable.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="drill-pick"
                  disabled={sections.isPending}
                  draggable
                  onClick={() => addExercise(item)}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(LIBRARY_ITEM_TYPE, item.id);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onDragEnd={() => setDropTarget(null)}
                >
                  <span className="drill-pick-thumb">
                    <DrillThumb
                      libraryItemId={item.id}
                      thumbnailUrl={item.thumbnailUrl}
                      ready={item.videoStatus === 'READY'}
                    />
                  </span>
                  <span className="drill-pick-body">
                    <strong>{item.title}</strong>
                    {item.cue ? <span className="drill-cue">{item.cue}</span> : null}
                    <span className="drill-pick-add">+ Add</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
