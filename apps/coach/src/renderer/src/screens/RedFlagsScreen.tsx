import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { LoadError } from '../components/LoadError';
import { RedFlagEditor } from '../components/RedFlagEditor';
import { problemDetail } from '../lib/problem';

export default function RedFlagsScreen() {
  const queryClient = useQueryClient();

  const library = useQuery({
    queryKey: ['strength', 'red-flag-library'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/red-flag-library');
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the red flag library');
      }
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (next: { title: string; body?: string }[]) => {
      const { data, error } = await api.PUT('/api/v1/strength/red-flag-library', {
        body: { flags: next },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not save the red flag library');
      }
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['strength', 'red-flag-library'] }),
  });

  return (
    <main className="workspace">
      <div className="workspace-header">
        <h1>Red flags</h1>
      </div>
      <p className="lede">
        Your library of common warning signs. Clients don't see it — pick the ones that apply to each
        client from their Red flags tab, and add anything specific to their condition there.
      </p>
      {library.isPending ? (
        <p className="lede">Loading…</p>
      ) : library.isError ? (
        <LoadError message={library.error.message} onRetry={() => library.refetch()} />
      ) : (
        <RedFlagEditor
          flags={library.data}
          saving={save.isPending}
          error={save.isError ? save.error.message : null}
          placeholder="Sharp or electric pain during any exercise"
          onSave={(next) => save.mutate(next)}
        />
      )}
    </main>
  );
}
