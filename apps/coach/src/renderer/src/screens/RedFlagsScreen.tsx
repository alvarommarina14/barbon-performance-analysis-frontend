import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { RedFlagEditor } from '../components/RedFlagEditor';
import { problemDetail } from '../lib/problem';

export default function RedFlagsScreen() {
  const queryClient = useQueryClient();

  const flags = useQuery({
    queryKey: ['strength', 'red-flags'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/red-flags');
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the red flags');
      }
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (next: { title: string; body?: string }[]) => {
      const { data, error } = await api.PUT('/api/v1/strength/red-flags', { body: { flags: next } });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not save the red flags');
      }
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['strength', 'red-flags'] }),
  });

  return (
    <main className="workspace">
      <div className="workspace-header">
        <h1>Red flags</h1>
      </div>
      <p className="lede">
        Warning signs every client reads at the top of their training, before they start a session.
        Add client-specific ones from the client's Red flags tab.
      </p>
      {flags.isPending ? (
        <p className="lede">Loading…</p>
      ) : flags.isError ? (
        <p className="error">{flags.error.message}</p>
      ) : (
        <RedFlagEditor
          flags={flags.data.forEveryone}
          saving={save.isPending}
          error={save.isError ? save.error.message : null}
          placeholder="Sharp or electric pain during any exercise"
          onSave={(next) => save.mutate(next)}
        />
      )}
    </main>
  );
}
