import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useState } from 'react';
import { api } from '../api/client';
import { problemDetail } from '../lib/problem';
import { PdfPages } from './PdfPages';

const STORAGE_KEY = 'coach.pdf-pane-open';
const REFRESH_DELAY_MS = 600;

export function usePdfPaneOpen(): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const change = (next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // A blocked storage only means the choice isn't remembered.
    }
  };
  return [open, change];
}

async function signedLink(playerProfileId: string): Promise<string> {
  const { data, error } = await api.GET('/api/v1/strength/program-pdf-link', {
    params: { query: { playerProfileId } },
  });
  if (!data) {
    throw new Error(problemDetail(error) ?? 'Could not load the program PDF');
  }
  return data.url;
}

async function pdfBytes(playerProfileId: string): Promise<Uint8Array> {
  const response = await fetch(await signedLink(playerProfileId));
  if (!response.ok) {
    throw new Error('Could not load the program PDF');
  }
  return new Uint8Array(await response.arrayBuffer());
}

// The pane starts where the screens do, below the shell's header and section tabs.
function useContentTop(): number | undefined {
  const [top, setTop] = useState<number>();
  useLayoutEffect(() => {
    const measure = () => setTop(document.querySelector('.shell-body')?.getBoundingClientRect().top);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return top;
}

export function ProgramPdfPane({ playerProfileId, onClose }: { playerProfileId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const top = useContentTop();
  const queryKey = ['program-pdf-preview', playerProfileId];

  const pdf = useQuery({
    queryKey,
    queryFn: () => pdfBytes(playerProfileId),
    placeholderData: keepPreviousData,
    staleTime: Infinity,
    retry: false,
  });

  // The PDF is generated from what is saved, so it reloads after any save — in whichever tab.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && event.mutation.state.status === 'success') {
        clearTimeout(timer);
        timer = setTimeout(() => void queryClient.invalidateQueries({ queryKey }), REFRESH_DELAY_MS);
      }
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [queryClient, playerProfileId]);

  async function openInWindow() {
    window.open(await signedLink(playerProfileId));
  }

  return (
    <aside className="pdf-pane" aria-label="Program PDF preview" style={{ top }}>
      <div className="pdf-pane-head">
        <h2 className="section-title">PDF preview</h2>
        {pdf.isFetching ? <span className="pdf-pane-status">Updating…</span> : null}
        <div className="pdf-pane-actions">
          <button type="button" className="ghost" onClick={() => void pdf.refetch()}>
            Refresh
          </button>
          <button type="button" className="ghost" onClick={() => void openInWindow()}>
            Open ↗
          </button>
          <button type="button" className="ghost" aria-label="Hide the PDF preview" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>
      {pdf.data ? (
        <PdfPages bytes={pdf.data} />
      ) : pdf.isError ? (
        <p className="lede pdf-pane-empty">{pdf.error.message}</p>
      ) : (
        <p className="lede pdf-pane-empty">Loading the PDF…</p>
      )}
    </aside>
  );
}
