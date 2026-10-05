import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { problemDetail } from '../lib/problem';
import PlanStartPanel from './PlanStartPanel';
import { UploadProgress } from '../components/UploadProgress';

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

const PDF_CONTENT_TYPE = 'application/pdf';

export default function CyclePlanTab({ playerProfileId }: { playerProfileId: string }) {
  const queryClient = useQueryClient();

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

  return (
    <>
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
    </>
  );
}
