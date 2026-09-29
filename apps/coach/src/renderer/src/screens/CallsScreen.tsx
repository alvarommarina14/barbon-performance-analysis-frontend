import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { problemDetail } from '../lib/problem';

const QUERY_KEY = ['coach', 'booking-link'];

export default function CallsScreen() {
  const queryClient = useQueryClient();

  const link = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/coach/booking-link');
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the booking link');
      }
      return data;
    },
  });

  const saved = link.data?.bookingUrl ?? '';
  const [draft, setDraft] = useState(saved);

  useEffect(() => {
    setDraft(saved);
  }, [saved]);

  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.PUT('/api/v1/coach/booking-link', {
        body: { bookingUrl: draft.trim() },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not save the booking link');
      }
      return data;
    },
    onSuccess: (data) => queryClient.setQueryData(QUERY_KEY, data),
  });

  const trimmed = draft.trim();
  const looksValid = trimmed === '' || /^https:\/\/\S+\.\S*$/.test(trimmed);

  return (
    <main className="workspace">
      <div className="workspace-header">
        <h1>Calls</h1>
      </div>
      <p className="lede">
        Paste the link to your booking page — a Google Calendar appointment schedule, Calendly or
        similar. Clients get a “Book a call” button that opens it. Leave it empty to hide the button.
      </p>

      <div className="panel">
        <p className="section-title">Booking link</p>
        <label className="field booking-field">
          <span>Link</span>
          <input
            placeholder="https://calendar.app.google/…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </label>
        {!looksValid ? <p className="error">The link has to start with https://</p> : null}
        <div className="button-row">
          <button
            type="button"
            className="primary"
            disabled={save.isPending || trimmed === saved || !looksValid}
            onClick={() => save.mutate()}
          >
            {save.isPending ? 'Saving…' : 'Save link'}
          </button>
          <button
            type="button"
            className="ghost"
            disabled={!saved}
            onClick={() => window.open(saved, '_blank')}
          >
            Open
          </button>
        </div>
        {save.isError ? <p className="error">{save.error.message}</p> : null}
      </div>
    </main>
  );
}
