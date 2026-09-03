import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export default function ClientListScreen() {
  const { user, logout } = useAuth();

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
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Barbon Performance</p>
          <h1>Clients</h1>
        </div>
        <div className="workspace-user">
          <span>{user?.name}</span>
          <button type="button" className="ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      {clients.isPending ? (
        <p className="lede">Loading…</p>
      ) : clients.isError ? (
        <div className="panel">
          <p className="error">We could not load your clients right now.</p>
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
                <tr key={client.profileId}>
                  <td className="strong">{client.name}</td>
                  <td>{client.email}</td>
                  <td>
                    <span className="tier">{client.membershipTier}</span>
                  </td>
                  <td>{client.currentWeek} / 4</td>
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
