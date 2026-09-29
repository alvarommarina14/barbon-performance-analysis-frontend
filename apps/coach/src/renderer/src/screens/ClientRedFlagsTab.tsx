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

  if (flags.isPending) {
    return <p className="lede">Loading…</p>;
  }
  if (flags.isError) {
    return <p className="error">{flags.error.message}</p>;
  }

  return (
    <>
      <div className="panel">
        <p className="section-title">For every client</p>
        {flags.data.forEveryone.length === 0 ? (
          <p className="lede">None yet — add them under Setup → Red flags.</p>
        ) : (
          <ul className="red-flag-list">
            {flags.data.forEveryone.map((flag) => (
              <li key={flag.id}>
                <strong>{flag.title}</strong>
                {flag.body ? <span> — {flag.body}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="section-title">Only for this client</p>
      <RedFlagEditor
        flags={flags.data.forPlayer}
        saving={save.isPending}
        error={save.isError ? save.error.message : null}
        placeholder="Elbow pain above 3/10 during pressing"
        onSave={(next) => save.mutate(next)}
      />
    </>
  );
}
