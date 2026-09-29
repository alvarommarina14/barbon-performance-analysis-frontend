import type { components } from '@barbon-performance-analysis/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useNav } from '../nav';
import { cx } from '../lib/cx';
import { problemDetail } from '../lib/problem';
import ClientLogsTab from './ClientLogsTab';
import ClientRedFlagsTab from './ClientRedFlagsTab';
import DayExerciseStep from './DayExerciseStep';
import PlanStartPanel from './PlanStartPanel';
import WeeklyNotesTab from './WeeklyNotesTab';
import { UploadProgress } from '../components/UploadProgress';

type TrainingDayView = components['schemas']['TrainingDayView'];
type TrainingDayKind = TrainingDayView['kind'];

interface Row {
  id: string | null;
  dayLabel: string;
  title: string;
  focus: string;
  durationMinutes: string;
  kind: TrainingDayKind;
  exerciseCount: number;
}

interface WeekRow {
  weekNumber: number;
  phaseName: string;
  goal: string;
  setsReps: string;
  rpeRange: string;
}

const blankWeeks = (): WeekRow[] =>
  [1, 2, 3, 4].map((weekNumber) => ({
    weekNumber,
    phaseName: '',
    goal: '',
    setsReps: '',
    rpeRange: '',
  }));

const toRow = (day: TrainingDayView): Row => ({
  id: day.id,
  dayLabel: day.dayLabel,
  title: day.title,
  focus: day.focus ?? '',
  durationMinutes: day.durationMinutes != null ? String(day.durationMinutes) : '',
  kind: day.kind,
  exerciseCount: day.exerciseCount ?? 0,
});

const blankRow = (): Row => ({
  id: null,
  dayLabel: '',
  title: '',
  focus: '',
  durationMinutes: '',
  kind: 'STRENGTH',
  exerciseCount: 0,
});

const PDF_CONTENT_TYPE = 'application/pdf';

type ClientTab = 'program' | 'weekly-notes' | 'red-flags' | 'logs';

const CLIENT_TABS: { key: ClientTab; label: string }[] = [
  { key: 'program', label: 'Program' },
  { key: 'weekly-notes', label: 'Weekly notes' },
  { key: 'red-flags', label: 'Red flags' },
  { key: 'logs', label: 'Logs' },
];

export default function ClientTrainingScreen({
  playerProfileId,
  playerName,
}: {
  playerProfileId: string;
  playerName: string;
}) {
  const { back } = useNav();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ClientTab>('program');

  const days = useQuery({
    queryKey: ['strength', 'training-days', playerProfileId],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/training-days', {
        params: { query: { playerProfileId } },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the training days');
      }
      return data;
    },
  });

  const [rows, setRows] = useState<Row[]>([]);
  const [dirty, setDirty] = useState(false);
  const [selectedDay, setSelectedDay] = useState<{ id: string; title: string } | null>(null);
  const seededAt = useMemo(() => days.data?.map((d) => d.id).join(','), [days.data]);

  useEffect(() => {
    if (!days.data || dirty) {
      return;
    }
    setRows(days.data.map(toRow));
  }, [seededAt, days.data, dirty]);

  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.PUT('/api/v1/strength/players/{playerProfileId}/training-days', {
        params: { path: { playerProfileId } },
        body: {
          days: rows.map((r) => ({
            id: r.id ?? undefined,
            dayLabel: r.dayLabel.trim(),
            title: r.title.trim(),
            focus: r.focus.trim() || undefined,
            durationMinutes: r.durationMinutes.trim() ? Number(r.durationMinutes) : undefined,
            kind: r.kind,
          })),
        },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not save the training days');
      }
      return data;
    },
    onSuccess: (data) => {
      setDirty(false);
      queryClient.setQueryData(['strength', 'training-days', playerProfileId], data);
    },
  });

  const cyclePhases = useQuery({
    queryKey: ['strength', 'cycle-phases', playerProfileId],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/cycle-phases', {
        params: { query: { playerProfileId } },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the cycle phase');
      }
      return data;
    },
  });

  const templates = useQuery({
    queryKey: ['strength', 'cycle-phase-templates'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/cycle-phase-templates');
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the templates');
      }
      return data;
    },
  });

  const [weekRows, setWeekRows] = useState<WeekRow[]>(blankWeeks());
  const [weeksDirty, setWeeksDirty] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const seededWeeksAt = useMemo(
    () => cyclePhases.data?.map((p) => p.id).join(','),
    [cyclePhases.data],
  );

  useEffect(() => {
    if (!cyclePhases.data || weeksDirty) {
      return;
    }
    setWeekRows(
      [1, 2, 3, 4].map((weekNumber) => {
        const found = cyclePhases.data.find((p) => p.weekNumber === weekNumber);
        return found
          ? {
              weekNumber,
              phaseName: found.phaseName,
              goal: found.goal,
              setsReps: found.setsReps ?? '',
              rpeRange: found.rpeRange ?? '',
            }
          : { weekNumber, phaseName: '', goal: '', setsReps: '', rpeRange: '' };
      }),
    );
  }, [seededWeeksAt, cyclePhases.data, weeksDirty]);

  const saveWeeks = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.PUT('/api/v1/strength/players/{playerProfileId}/cycle-phases', {
        params: { path: { playerProfileId } },
        body: {
          phases: weekRows.map((w) => ({
            weekNumber: w.weekNumber,
            phaseName: w.phaseName.trim(),
            goal: w.goal.trim(),
            setsReps: w.setsReps.trim() || undefined,
            rpeRange: w.rpeRange.trim() || undefined,
          })),
        },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not save the cycle phase');
      }
      return data;
    },
    onSuccess: (data) => {
      setWeeksDirty(false);
      queryClient.setQueryData(['strength', 'cycle-phases', playerProfileId], data);
    },
  });

  function applyTemplate(templateName: string) {
    setSelectedTemplate(templateName);
    const template = templates.data?.find((t) => t.name === templateName);
    if (!template) {
      return;
    }
    setWeekRows(
      [1, 2, 3, 4].map((weekNumber) => {
        const found = template.weeks.find((w) => w.weekNumber === weekNumber);
        return found
          ? {
              weekNumber,
              phaseName: found.phaseName,
              goal: found.goal,
              setsReps: found.setsReps ?? '',
              rpeRange: found.rpeRange ?? '',
            }
          : { weekNumber, phaseName: '', goal: '', setsReps: '', rpeRange: '' };
      }),
    );
    setWeeksDirty(true);
  }

  function updateWeek(weekNumber: number, patch: Partial<WeekRow>) {
    setWeekRows((prev) => prev.map((w) => (w.weekNumber === weekNumber ? { ...w, ...patch } : w)));
    setWeeksDirty(true);
  }

  const anyWeekBlank = weekRows.some((w) => !w.phaseName.trim() || !w.goal.trim());

  const [pdfProgress, setPdfProgress] = useState<number | null>(null);
  const uploadProgramPdf = useMutation({
    mutationFn: async () => {
      const picked = await window.barbonAnalysis.pickPdfFile();
      if (!picked) {
        return;
      }
      const { data, error } = await api.POST('/api/v1/players/{playerProfileId}/program-pdf/upload-intent', {
        params: { path: { playerProfileId } },
        body: { sizeBytes: picked.size },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not start the upload');
      }
      setPdfProgress(0);
      await window.barbonAnalysis.uploadContent(
        { filePath: picked.path, uploadUrl: data.uploadUrl, contentType: PDF_CONTENT_TYPE },
        setPdfProgress,
      );
      const { response } = await api.POST('/api/v1/players/{playerProfileId}/program-pdf/confirm', {
        params: { path: { playerProfileId } },
        body: { objectKey: data.objectKey },
      });
      if (!response.ok) {
        throw new Error('Could not confirm the PDF');
      }
    },
    onSettled: () => setPdfProgress(null),
  });

  function addDay() {
    setRows((prev) => [...prev, blankRow()]);
    setDirty(true);
  }

  function update(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    setDirty(true);
  }

  function move(index: number, delta: number) {
    setRows((prev) => {
      const j = index + delta;
      if (j < 0 || j >= prev.length) {
        return prev;
      }
      const copy = [...prev];
      const [row] = copy.splice(index, 1);
      copy.splice(j, 0, row as Row);
      return copy;
    });
    setDirty(true);
  }

  function remove(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  const anyBlank = rows.some((r) => !r.dayLabel.trim() || !r.title.trim());

  if (selectedDay) {
    return (
      <main className="workspace">
        <button type="button" className="back-link" onClick={() => setSelectedDay(null)}>
          ← {playerName}'s training days
        </button>
        <div className="workspace-header">
          <h1>{selectedDay.title}</h1>
        </div>
        <DayExerciseStep trainingDayId={selectedDay.id} />
      </main>
    );
  }

  const heading = (
    <>
      <button type="button" className="back-link" onClick={back}>
        ← Clients
      </button>
      <div className="workspace-header">
        <h1>{playerName}'s training</h1>
      </div>
      <div className="tabs">
        {CLIENT_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={cx('tab', tab === key && 'on')}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );

  if (tab !== 'program') {
    return (
      <main className="workspace">
        {heading}
        {tab === 'weekly-notes' ? <WeeklyNotesTab playerProfileId={playerProfileId} /> : null}
        {tab === 'red-flags' ? <ClientRedFlagsTab playerProfileId={playerProfileId} /> : null}
        {tab === 'logs' ? <ClientLogsTab playerProfileId={playerProfileId} /> : null}
      </main>
    );
  }

  return (
    <main className="workspace">
      {heading}

      <div className="panel-row">
        <PlanStartPanel playerProfileId={playerProfileId} />
        <div className="panel">
          <p className="section-title">Program PDF</p>
          {pdfProgress !== null ? (
            <UploadProgress fraction={pdfProgress} label="Uploading the program PDF" />
          ) : (
            <p className="lede">Uploads replace whatever the player currently sees.</p>
          )}
          <button
            type="button"
            className="primary"
            disabled={uploadProgramPdf.isPending}
            onClick={() => uploadProgramPdf.mutate()}
          >
            {uploadProgramPdf.isPending ? 'Uploading…' : 'Upload program PDF'}
          </button>
          {uploadProgramPdf.isError ? (
            <p className="error">
              {uploadProgramPdf.error instanceof Error
                ? uploadProgramPdf.error.message
                : 'Could not upload the PDF'}
            </p>
          ) : null}
        </div>
      </div>

      <div className="panel">
        <p className="section-title">Cycle phase</p>
        {cyclePhases.isPending ? (
          <p className="lede">Loading…</p>
        ) : (
          <>
            {templates.data && templates.data.length > 0 ? (
              <label className="field">
                <span>Apply a template</span>
                <select value={selectedTemplate} onChange={(e) => applyTemplate(e.target.value)}>
                  <option value="">Choose…</option>
                  {templates.data.map((template) => (
                    <option key={template.name} value={template.name}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="lede">
                No templates yet — create one under Setup → Cycle phase templates, or edit the weeks
                below by hand.
              </p>
            )}

            <div className="findings-list cycle-weeks">
              {weekRows.map((week) => (
                <div className="panel" key={week.weekNumber}>
                  <p className="section-title">Week {week.weekNumber}</p>
                  <label className="field">
                    <span>Phase name</span>
                    <input
                      value={week.phaseName}
                      onChange={(e) => updateWeek(week.weekNumber, { phaseName: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Goal</span>
                    <textarea
                      className="textarea"
                      value={week.goal}
                      onChange={(e) => updateWeek(week.weekNumber, { goal: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Sets &amp; reps</span>
                    <input
                      placeholder="e.g. 3 × 10–12"
                      value={week.setsReps}
                      onChange={(e) => updateWeek(week.weekNumber, { setsReps: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>RPE range</span>
                    <input
                      placeholder="e.g. RPE 6–7"
                      value={week.rpeRange}
                      onChange={(e) => updateWeek(week.weekNumber, { rpeRange: e.target.value })}
                    />
                  </label>
                </div>
              ))}
            </div>
            <div className="findings-foot">
              <button
                type="button"
                className="primary"
                disabled={saveWeeks.isPending || !weeksDirty || anyWeekBlank}
                onClick={() => saveWeeks.mutate()}
              >
                {saveWeeks.isPending ? 'Saving…' : 'Save cycle phase'}
              </button>
              {saveWeeks.isError ? <p className="error">{saveWeeks.error.message}</p> : null}
            </div>
          </>
        )}
      </div>

      <div className="workspace-header">
        <p className="section-title">Training days</p>
        <button type="button" className="ghost" onClick={addDay}>
          + Add a day
        </button>
      </div>

      {days.isPending ? (
        <p className="lede">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="lede">No training days yet. Add one to get started.</p>
      ) : (
        <div className="findings-list">
          {rows.map((row, index) => (
            <div className="panel" key={row.id ?? `new-${index}`}>
              <div style={{ display: 'flex', gap: 10 }}>
                <label className="field" style={{ flex: 1 }}>
                  <span>Day label</span>
                  <input
                    placeholder="Day A"
                    value={row.dayLabel}
                    onChange={(e) => update(index, { dayLabel: e.target.value })}
                  />
                </label>
                <label className="field" style={{ flex: 2 }}>
                  <span>Title</span>
                  <input
                    placeholder="Rehab — forearm & scapular"
                    value={row.title}
                    onChange={(e) => update(index, { title: e.target.value })}
                  />
                </label>
              </div>
              <label className="field">
                <span>Focus</span>
                <input value={row.focus} onChange={(e) => update(index, { focus: e.target.value })} />
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <label className="field">
                  <span>Duration (min)</span>
                  <input
                    type="number"
                    value={row.durationMinutes}
                    onChange={(e) => update(index, { durationMinutes: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Kind</span>
                  <select
                    value={row.kind}
                    onChange={(e) => update(index, { kind: e.target.value as TrainingDayKind })}
                  >
                    <option value="STRENGTH">Strength</option>
                    <option value="REHAB">Rehab</option>
                  </select>
                </label>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button type="button" className="ghost" onClick={() => move(index, -1)}>
                  ↑
                </button>
                <button type="button" className="ghost" onClick={() => move(index, 1)}>
                  ↓
                </button>
                <button type="button" className="ghost" onClick={() => remove(index)}>
                  Remove
                </button>
                {row.id ? (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => setSelectedDay({ id: row.id as string, title: row.title })}
                  >
                    Edit exercises ({row.exerciseCount}) →
                  </button>
                ) : (
                  <span className="lede">Save to add exercises</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="findings-foot">
        <button
          type="button"
          className="primary"
          disabled={save.isPending || !dirty || anyBlank}
          onClick={() => save.mutate()}
        >
          {save.isPending ? 'Saving…' : 'Save training days'}
        </button>
        {anyBlank ? (
          <p className="lede">Every day needs a label and a title before it can be saved.</p>
        ) : null}
        {save.isError ? <p className="error">{save.error.message}</p> : null}
      </div>
    </main>
  );
}
