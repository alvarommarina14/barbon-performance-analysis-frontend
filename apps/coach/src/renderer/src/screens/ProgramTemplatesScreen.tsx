import type { components } from '@barbon-performance-analysis/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client';
import { useConfirm } from '../components/Confirm';
import { LoadError } from '../components/LoadError';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { problemDetail } from '../lib/problem';
import { useNav } from '../nav';

type ProgramTemplateSummary = components['schemas']['ProgramTemplateSummary'];

export function useProgramTemplates() {
  return useQuery({
    queryKey: ['strength', 'program-templates'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/program-templates');
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the program templates');
      }
      return data;
    },
  });
}

export default function ProgramTemplatesScreen() {
  const queryClient = useQueryClient();
  const { navigate } = useNav();
  const confirm = useConfirm();
  const toast = useToast();
  const templates = useProgramTemplates();
  const [newName, setNewName] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await api.POST('/api/v1/strength/program-templates', { body: { name } });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not create the template');
      }
      return data;
    },
    onSuccess: (data) => {
      setNewName(null);
      queryClient.setQueryData(['strength', 'program-template', data.id], data);
      void queryClient.invalidateQueries({ queryKey: ['strength', 'program-templates'] });
      navigate({ name: 'program-template', templateId: data.id });
    },
  });

  const remove = useMutation({
    mutationFn: async (templateId: string) => {
      const { response } = await api.DELETE('/api/v1/strength/program-templates/{templateId}', {
        params: { path: { templateId } },
      });
      if (!response.ok) {
        throw new Error('Could not delete the template');
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['strength', 'program-templates'] }),
    onError: (err) => toast.show(err instanceof Error ? err.message : 'Could not delete the template'),
  });

  async function confirmRemove(template: ProgramTemplateSummary) {
    const sure = await confirm({
      title: `Delete “${template.name}”?`,
      message: 'Clients who already got this template keep their program; it only leaves this list.',
      confirmLabel: 'Delete template',
      danger: true,
    });
    if (sure) {
      remove.mutate(template.id);
    }
  }

  return (
    <main className="workspace">
      <div className="workspace-header">
        <h1>Program templates</h1>
        <button type="button" className="primary" onClick={() => setNewName('')}>
          + New template
        </button>
      </div>
      <p className="lede">
        Whole programs to start a client from: training days with their blocks and exercises, the
        four cycle weeks and the cover texts. Applying one copies it once — it isn’t a live link
        back to the template. To turn a client’s program into a template, use “Save as template” on
        their Program tab.
      </p>

      {templates.isError ? (
        <LoadError message={templates.error.message} onRetry={() => templates.refetch()} />
      ) : templates.isPending ? (
        <p className="lede">Loading…</p>
      ) : templates.data.length === 0 ? (
        <p className="lede">No templates yet. Create one to reuse across clients.</p>
      ) : (
        <div className="findings-list">
          {templates.data.map((template) => (
            <div className="panel" key={template.id}>
              <div className="workspace-header template-row">
                <div>
                  <h2 className="section-title">{template.name}</h2>
                  <p className="lede">
                    {template.dayCount} training {template.dayCount === 1 ? 'day' : 'days'}
                  </p>
                </div>
                <div className="button-row">
                  <button
                    type="button"
                    className="ghost"
                    aria-label={`Edit ${template.name}`}
                    onClick={() => navigate({ name: 'program-template', templateId: template.id })}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    disabled={remove.isPending}
                    aria-label={`Delete ${template.name}`}
                    onClick={() => void confirmRemove(template)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {newName !== null ? (
        <Modal title="New template" onClose={() => setNewName(null)} closeDisabled={create.isPending}>
          <label className="field">
            <span>Template name</span>
            <input data-autofocus value={newName} onChange={(e) => setNewName(e.target.value)} />
          </label>
          <div className="findings-foot">
            <div className="button-row">
              <button
                type="button"
                className="primary"
                disabled={create.isPending || !newName.trim()}
                onClick={() => create.mutate(newName.trim())}
              >
                {create.isPending ? 'Creating…' : 'Create template'}
              </button>
              <button
                type="button"
                className="ghost"
                disabled={create.isPending}
                onClick={() => setNewName(null)}
              >
                Cancel
              </button>
            </div>
            {create.isError ? <p className="error" role="alert">{create.error.message}</p> : null}
          </div>
        </Modal>
      ) : null}
    </main>
  );
}
