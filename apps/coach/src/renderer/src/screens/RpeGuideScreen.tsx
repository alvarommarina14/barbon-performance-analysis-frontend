import type { components } from '@barbon-performance-analysis/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client';
import { LoadError } from '../components/LoadError';
import { formatBytes, formatDate } from '../lib/format';
import { problemDetail } from '../lib/problem';
import { UploadProgress } from '../components/UploadProgress';

type RpeGuide = components['schemas']['RpeGuideView'];

const PDF_CONTENT_TYPE = 'application/pdf';

export default function RpeGuideScreen() {
  const queryClient = useQueryClient();

  const guide = useQuery<RpeGuide>({
    queryKey: ['content', 'rpe-guide'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/content/rpe-guide');
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the RPE guide');
      }
      return data;
    },
  });

  const [pdfProgress, setPdfProgress] = useState<number | null>(null);

  const uploadPdf = useMutation({
    mutationFn: async () => {
      const picked = await window.barbonAnalysis.pickPdfFile();
      if (!picked) {
        return;
      }
      const { data, error } = await api.POST('/api/v1/content/rpe-guide/pdf-upload-intent', {
        body: { sizeBytes: picked.size, contentType: PDF_CONTENT_TYPE },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not start the upload');
      }
      setPdfProgress(0);
      await window.barbonAnalysis.uploadContent(
        { filePath: picked.path, uploadUrl: data.uploadUrl, contentType: PDF_CONTENT_TYPE },
        setPdfProgress,
      );
      const confirm = await api.POST('/api/v1/content/rpe-guide/pdf', {
        body: {
          objectKey: data.objectKey,
          contentType: PDF_CONTENT_TYPE,
          fileName: picked.name,
          sizeBytes: picked.size,
        },
      });
      if (!confirm.data) {
        throw new Error(problemDetail(confirm.error) ?? 'Could not confirm the PDF');
      }
    },
    onSettled: () => setPdfProgress(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['content', 'rpe-guide'] }),
  });

  const data = guide.data;

  if (guide.isError) {
    return (
      <main className="workspace">
        <div className="workspace-header">
          <h1>RPE guide</h1>
        </div>
        <LoadError message={guide.error.message} onRetry={() => guide.refetch()} />
      </main>
    );
  }

  return (
    <main className="workspace">
      <div className="workspace-header">
        <h1>RPE guide</h1>
      </div>
      <p className="lede">
        The one PDF, shown to every client, that explains how to pick a working weight from the
        RPE scale.
      </p>

      <div className="panel">
        <h2 className="section-title">PDF guide</h2>
        {pdfProgress !== null ? (
          <UploadProgress fraction={pdfProgress} label="Uploading the PDF" />
        ) : (
          <>
            <p className="lede">{data?.pdfUrl ? 'Uploaded and ready.' : 'No PDF uploaded yet.'}</p>
            {data?.pdfUrl ? (
              <p className="lede">
                {[
                  data.pdfFileName,
                  formatBytes(data.pdfSizeBytes),
                  formatDate(data.pdfUploadedAt) ? `Uploaded ${formatDate(data.pdfUploadedAt)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
          </>
        )}
        <button
          type="button"
          className="primary"
          disabled={uploadPdf.isPending}
          onClick={() => uploadPdf.mutate()}
        >
          {uploadPdf.isPending ? 'Uploading…' : data?.pdfUrl ? 'Replace PDF' : 'Upload PDF'}
        </button>
        {uploadPdf.isError ? (
          <p className="error" role="alert">
            {uploadPdf.error instanceof Error ? uploadPdf.error.message : 'Could not upload the PDF'}
          </p>
        ) : null}
      </div>
    </main>
  );
}
