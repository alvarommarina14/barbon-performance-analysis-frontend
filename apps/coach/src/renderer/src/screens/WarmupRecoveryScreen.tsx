import type { components } from '@barbon-performance-analysis/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';
import { UploadProgress } from '../components/UploadProgress';
import { formatBytes, formatDate, formatDuration } from '../lib/format';
import { problemDetail, problemSlug } from '../lib/problem';

type DailyRoutine = components['schemas']['DailyRoutineView'];
type RoutineVideo = components['schemas']['RoutineVideoView'];
type Part = components['schemas']['ConfirmRoutineVideoRequest']['part'];

const QUERY_KEY = ['daily-routine'];
const PDF_CONTENT_TYPE = 'application/pdf';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function WarmupRecoveryScreen() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const routine = useQuery<DailyRoutine>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/content/daily-routine');
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the daily routine');
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
      const { data, error } = await api.POST('/api/v1/content/daily-routine/pdf-upload-intent', {
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
      const confirm = await api.POST('/api/v1/content/daily-routine/pdf', {
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (err) => toast.show(err instanceof Error ? err.message : 'Could not upload the PDF'),
  });

  const data = routine.data;

  return (
    <main className="workspace">
      <div className="workspace-header">
        <h1>Warm-up &amp; recovery</h1>
      </div>
      <p className="lede">
        The routine every client runs before they play and after they come off court: one video for
        each, plus the Daily Routine PDF.
      </p>

      <div className="panel-row">
        <RoutineVideoPanel part="WARMUP" title="Warm-up video" video={data?.warmup} />
        <RoutineVideoPanel part="RECOVERY" title="Recovery video" video={data?.recovery} />
        <div className="panel">
          <p className="section-title">Daily Routine PDF</p>
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
        </div>
      </div>
    </main>
  );
}

function RoutineVideoPanel({
  part,
  title,
  video,
}: {
  part: Part;
  title: string;
  video: RoutineVideo | undefined;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [progress, setProgress] = useState<number | null>(null);

  const upload = useMutation({
    mutationFn: async () => {
      const picked = await window.barbonAnalysis.pickVideoFile();
      if (!picked) {
        return;
      }
      const { data, error } = await api.POST('/api/v1/content/daily-routine/video-upload-intent', {
        body: { part, sizeBytes: picked.size, fileName: picked.name },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not start the upload');
      }
      setProgress(0);
      await window.barbonAnalysis.uploadFeedback(
        { filePath: picked.path, uploadUrl: data.uploadUrl },
        setProgress,
      );
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const confirm = await api.POST('/api/v1/content/daily-routine/video', {
          body: { part, videoAssetId: data.videoAssetId },
        });
        if (confirm.data) {
          return;
        }
        if (problemSlug(confirm.error) === 'video-not-ready') {
          await sleep(2000);
          continue;
        }
        throw new Error(problemDetail(confirm.error) ?? 'Could not confirm the video');
      }
      throw new Error('The video is taking too long to process. Try again in a moment.');
    },
    onSettled: () => setProgress(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (err) => toast.show(err instanceof Error ? err.message : 'Could not upload the video'),
  });

  return (
    <div className="panel">
      <p className="section-title">{title}</p>
      {progress !== null ? (
        <UploadProgress fraction={progress} label="Uploading the video" />
      ) : (
        <>
          <p className="lede">
            {!video ? 'No video uploaded yet.' : video.status === 'READY' ? 'Uploaded and ready.' : 'Processing…'}
          </p>
          {video ? (
            <p className="lede">
              {[
                video.fileName,
                formatBytes(video.sizeBytes),
                formatDuration(video.durationSeconds),
                formatDate(video.uploadedAt) ? `Uploaded ${formatDate(video.uploadedAt)}` : null,
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
        disabled={upload.isPending}
        onClick={() => upload.mutate()}
      >
        {upload.isPending ? 'Uploading…' : video ? 'Replace video' : 'Upload video'}
      </button>
    </div>
  );
}
