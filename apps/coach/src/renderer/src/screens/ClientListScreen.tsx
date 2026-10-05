import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { components } from '@barbon-performance-analysis/api-client';
import { useNav } from '../nav';

type ClientSummary = components['schemas']['ClientSummary'];

export default function ClientListScreen() {
  const { navigate } = useNav();

  function openClient(client: ClientSummary) {
    navigate({ name: 'client-training', playerProfileId: client.profileId, playerName: client.name });
  }

  const clients = useQuery({
    queryKey: ['coach', 'clients'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/coach/clients');
      if (error || !data) {
        throw new Error('Could not load your clients');
      }
      return data;
    },
  });

  return (
    <main className="workspace">
      <h1>Clients</h1>

      {clients.isPending ? (
        <p className="lede">Loading…</p>
      ) : clients.isError ? (
        <div className="panel">
          <p className="error" role="alert">We could not load your clients right now.</p>
          <button type="button" className="ghost" onClick={() => clients.refetch()}>
            Try again
          </button>
        </div>
      ) : clients.data.length === 0 ? (
        <div className="panel">
          <p className="lede">
            No clients assigned yet. Once a player is attached to your profile they show up here.
          </p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="clients">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Tier</th>
                <th>Week</th>
                <th>Next call</th>
              </tr>
            </thead>
            <tbody>
              {clients.data.map((client) => (
                <tr
                  key={client.profileId}
                  className="is-clickable"
                  onClick={() => openClient(client)}
                >
                  <td className="strong">
                    <button
                      type="button"
                      className="row-link"
                      onClick={(event) => {
                        event.stopPropagation();
                        openClient(client);
                      }}
                    >
                      {client.name}
                    </button>
                  </td>
                  <td>{client.email}</td>
                  <td>
                    <span className="tier">{client.membershipTier}</span>
                  </td>
                  <td>{client.planWeek ? `${client.planWeek} / ${client.planWeeks ?? 12}` : '—'}</td>
                  <td>
                    {client.nextCallAt ? new Date(client.nextCallAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
