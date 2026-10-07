import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { api } from '../api/client';
import { useConfirm } from '../components/Confirm';
import { LoadError } from '../components/LoadError';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { problemDetail } from '../lib/problem';
import ProgramCoverPanel, { type ProgramCover } from './ProgramCoverPanel';
import { useProgramTemplates } from './ProgramTemplatesScreen';

interface ProgramTabProps {
  playerProfileId: string;
  playerName: string;
}

export default function ProgramTab({ playerProfileId, playerName }: ProgramTabProps) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();

  const program = useQuery({
    queryKey: ['strength', 'program', playerProfileId],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/program', {
        params: { query: { playerProfileId } },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the program cover');
      }
      return data;
    },
  });

  const cover = useMemo<ProgramCover | null>(
    () =>
      program.data
        ? {
            name: '',
            athleteLevel: program.data.athleteLevel ?? '',
            about: program.data.about ?? '',
            schedule: program.data.schedule ?? '',
          }
        : null,
    [program.data],
  );

  async function saveCover(next: ProgramCover) {
    const { data, error } = await api.PUT('/api/v1/strength/players/{playerProfileId}/program', {
      params: { path: { playerProfileId } },
      body: {
        athleteLevel: next.athleteLevel.trim() || undefined,
        about: next.about.trim() || undefined,
        schedule: next.schedule.trim() || undefined,
      },
    });
    if (!data) {
      throw new Error(problemDetail(error) ?? 'Could not save the cover');
    }
    queryClient.setQueryData(['strength', 'program', playerProfileId], data);
  }

  const templates = useProgramTemplates();
  const [templateId, setTemplateId] = useState('');

  const apply = useMutation({
    mutationFn: async (id: string) => {
      const { response } = await api.POST('/api/v1/strength/players/{playerProfileId}/program/apply-template', {
        params: { path: { playerProfileId } },
        body: { templateId: id },
      });
      if (!response.ok) {
        throw new Error('Could not apply the template');
      }
    },
    onSuccess: () => {
      setTemplateId('');
      void queryClient.invalidateQueries({ queryKey: ['strength'] });
      toast.show('Template applied');
    },
  });

  async function confirmApply() {
    const template = templates.data?.find((t) => t.id === templateId);
    if (!template) {
      return;
    }
    const sure = await confirm({
      title: `Apply “${template.name}” to ${playerName}?`,
      message:
        `This replaces ${playerName}’s training days, their exercises and the four cycle weeks with a ` +
        'copy of the template. Exercises they already logged are lost. The template’s About and ' +
        'Schedule texts replace the cover’s, when the template has them.',
      confirmLabel: 'Replace program',
      danger: true,
    });
    if (sure) {
      apply.mutate(template.id);
    }
  }

  const [templateName, setTemplateName] = useState<string | null>(null);

  const saveAsTemplate = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await api.POST('/api/v1/strength/program-templates', {
        body: { name, fromPlayerProfileId: playerProfileId },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not save the template');
      }
      return data;
    },
    onSuccess: (data) => {
      setTemplateName(null);
      void queryClient.invalidateQueries({ queryKey: ['strength', 'program-templates'] });
      toast.show(`Saved as template “${data.name}”`);
    },
  });

  return (
    <div className="program-layout">
      {program.isError ? (
        <LoadError message={program.error.message} onRetry={() => program.refetch()} />
      ) : cover ? (
        <ProgramCoverPanel cover={cover} variant="client" save={saveCover} />
      ) : (
        <p className="lede">Loading…</p>
      )}

      <div className="panel">
        <h2 className="section-title">Templates</h2>
        <p className="lede">
          Start from a template, or keep this program to reuse with other clients. A template is a
          one-time copy — later edits on either side don’t carry over.
        </p>
        {templates.isError ? (
          <LoadError message={templates.error.message} onRetry={() => templates.refetch()} />
        ) : templates.data && templates.data.length > 0 ? (
          <div className="template-apply">
            <label className="field">
              <span>Apply a template</span>
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                <option value="">Choose…</option>
                {templates.data.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} · {template.dayCount} {template.dayCount === 1 ? 'day' : 'days'}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="ghost"
              disabled={!templateId || apply.isPending}
              onClick={() => void confirmApply()}
            >
              {apply.isPending ? 'Applying…' : 'Apply'}
            </button>
          </div>
        ) : templates.isPending ? null : (
          <p className="lede">No templates yet — save this program as the first one.</p>
        )}
        {apply.isError ? <p className="error" role="alert">{apply.error.message}</p> : null}
        <button type="button" className="ghost" onClick={() => setTemplateName('')}>
          Save as template
        </button>
      </div>

      {templateName !== null ? (
        <Modal
          title="Save as template"
          onClose={() => setTemplateName(null)}
          closeDisabled={saveAsTemplate.isPending}
        >
          <p className="lede">
            Copies {playerName}’s days, blocks, exercises, cycle weeks and the About and
            Schedule texts into a new template.
          </p>
          <label className="field">
            <span>Template name</span>
            <input
              data-autofocus
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          </label>
          <div className="findings-foot">
            <div className="button-row">
              <button
                type="button"
                className="primary"
                disabled={saveAsTemplate.isPending || !templateName.trim()}
                onClick={() => saveAsTemplate.mutate(templateName.trim())}
              >
                {saveAsTemplate.isPending ? 'Saving…' : 'Save template'}
              </button>
              <button
                type="button"
                className="ghost"
                disabled={saveAsTemplate.isPending}
                onClick={() => setTemplateName(null)}
              >
                Cancel
              </button>
            </div>
            {saveAsTemplate.isError ? (
              <p className="error" role="alert">{saveAsTemplate.error.message}</p>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
