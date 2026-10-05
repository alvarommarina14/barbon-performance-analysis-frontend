import type { components } from '@barbon-performance-analysis/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client';
import { LoadError } from '../components/LoadError';
import { useToast } from '../components/Toast';
import { formatBytes, formatDate, formatDuration } from '../lib/format';
import { problemDetail, problemSlug } from '../lib/problem';
import { UploadProgress } from '../components/UploadProgress';

type RecordingTips = components['schemas']['RecordingTipsView'];

const PDF_CONTENT_TYPE = 'application/pdf';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function RecordingTipsScreen() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const tips = useQuery<RecordingTips>({
    queryKey: ['recording-tips'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/content/recording-tips');
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not load the recording tips');
      }
      return data;
    },
  });

  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [pdfProgress, setPdfProgress] = useState<number | null>(null);

  const uploadVideo = useMutation({
    mutationFn: async () => {
      const picked = await window.barbonAnalysis.pickVideoFile();
      if (!picked) {
        return;
      }
      const { data, error } = await api.POST('/api/v1/content/recording-tips/video-upload-intent', {
        body: { sizeBytes: picked.size, fileName: picked.name },
      });
      if (!data) {
        throw new Error(problemDetail(error) ?? 'Could not start the upload');
      }
      setVideoProgress(0);
      await window.barbonAnalysis.uploadFeedback(
        { filePath: picked.path, uploadUrl: data.uploadUrl },
        setVideoProgress,
      );
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const confirm = await api.POST('/api/v1/content/recording-tips/video', {
          body: { videoAssetId: data.videoAssetId },
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
    onSettled: () => setVideoProgress(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recording-tips'] }),
    onError: (err) => toast.show(err instanceof Error ? err.message : 'Could not upload the video'),
  });

  const uploadPdf = useMutation({
    mutationFn: async () => {
      const picked = await window.barbonAnalysis.pickPdfFile();
      if (!picked) {
        return;
      }
      const { data, error } = await api.POST('/api/v1/content/recording-tips/pdf-upload-intent', {
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
      const confirm = await api.POST('/api/v1/content/recording-tips/pdf', {
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recording-tips'] }),
    onError: (err) => toast.show(err instanceof Error ? err.message : 'Could not upload the PDF'),
  });

  const data = tips.data;

  if (tips.isError) {
    return (
      <main className="workspace">
        <div className="workspace-header">
          <h1>Recording tips</h1>
        </div>
        <LoadError message={tips.error.message} onRetry={() => tips.refetch()} />
      </main>
    );
  }

  return (
    <main className="workspace">
      <div className="workspace-header">
        <h1>Recording tips</h1>
      </div>
      <p className="lede">
        The video and PDF shown to every player before they record a submission.
      </p>

      <div className="panel">
        <p className="section-title">Video</p>
        {videoProgress !== null ? (
          <UploadProgress fraction={videoProgress} label="Uploading the video" />
        ) : (
          <>
            <p className="lede">
              {!data?.videoAssetId
                ? 'No video uploaded yet.'
                : data.videoStatus === 'READY'
                  ? 'Uploaded and ready.'
                  : 'Processing…'}
            </p>
            {data?.videoAssetId ? (
              <p className="lede">
                {[
                  data.videoFileName,
                  formatBytes(data.videoSizeBytes),
                  formatDuration(data.videoDurationSeconds),
                  formatDate(data.videoUploadedAt) ? `Uploaded ${formatDate(data.videoUploadedAt)}` : null,
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
          disabled={uploadVideo.isPending}
          onClick={() => uploadVideo.mutate()}
        >
          {uploadVideo.isPending ? 'Uploading…' : data?.videoAssetId ? 'Replace video' : 'Upload video'}
        </button>
      </div>

      <div className="panel">
        <p className="section-title">PDF guide</p>
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
    </main>
  );
}
