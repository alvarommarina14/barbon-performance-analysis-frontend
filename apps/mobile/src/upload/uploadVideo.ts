import * as tus from 'tus-js-client';

// The one-time upload URL from the backend is a Cloudflare tus endpoint: no credential, the URL
// itself is the authorisation. tus-js-client's React Native build reads a `{ uri }` source by
// fetching it, but its types only describe the web `File`, hence the cast.
export function uploadVideo(
  uri: string,
  uploadUrl: string,
  size: number,
  mimeType: string | undefined,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const source = { uri, name: 'stroke.mp4', type: mimeType ?? 'video/mp4' };
    const upload = new tus.Upload(source as unknown as Blob, {
      uploadUrl,
      uploadSize: size,
      chunkSize: 50 * 1024 * 1024,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      metadata: { filetype: mimeType ?? 'video/mp4' },
      onError: (error) => reject(error),
      onProgress: (sent, total) => onProgress(total > 0 ? sent / total : 0),
      onSuccess: () => resolve(),
    });
    upload.start();
  });
}
