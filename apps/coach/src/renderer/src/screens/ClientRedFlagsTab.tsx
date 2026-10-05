import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { RedFlagEditor } from '../components/RedFlagEditor';
import { problemDetail } from '../lib/problem';

export default function ClientRedFlagsTab({ playerProfileId }: { playerProfileId: string }) {
  const queryClient = useQueryClient();
  const key = ['strength', 'red-flags', playerProfileId];

  const flags = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/red-flags', {
        params: { query: { playerProfileId } },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the red flags');
      }
      return data;
    },
  });

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
      const { data, error } = await api.PUT('/api/v1/strength/players/{playerProfileId}/red-flags', {
        params: { path: { playerProfileId } },
        body: { flags: next },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not save the red flags');
      }
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  if (flags.isPending || library.isPending) {
    return <p className="lede">Loading…</p>;
  }
  if (flags.isError) {
    return <p className="error">{flags.error.message}</p>;
  }
  if (library.isError) {
    return <p className="error">{library.error.message}</p>;
  }

  return (
    <>
      <p className="lede">
        What this client reads before every session. Pick from your library on the right, and add
        anything specific to their condition.
      </p>
      <RedFlagEditor
        flags={flags.data}
        library={library.data}
        saving={save.isPending}
        error={save.isError ? save.error.message : null}
        placeholder="Elbow pain above 3/10 during pressing"
        onSave={(next) => save.mutate(next)}
      />
    </>
  );
}
