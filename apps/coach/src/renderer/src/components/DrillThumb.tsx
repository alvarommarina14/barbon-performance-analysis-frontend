import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

interface DrillThumbProps {
  libraryItemId: string;
  thumbnailUrl?: string;
  ready: boolean;
}

// Cloudflare hands back a thumbnail; the local provider has no transcode step and therefore
// none, so fall back to a frame of the MP4 itself. An HLS manifest cannot paint a frame without
// hls.js, so it stays a black frame instead.
export function DrillThumb({ libraryItemId, thumbnailUrl, ready }: DrillThumbProps) {
  const playback = useQuery({
    queryKey: ['drill-thumb', libraryItemId],
    enabled: ready && !thumbnailUrl,
    // A fresh signed URL would reload the frame for nothing; the painted frame outlives its expiry.
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/drills/library/{itemId}/playback', {
        params: { path: { itemId: libraryItemId } },
      });
      if (error || !data) {
        throw new Error('Could not load the video');
      }
      return data;
    },
  });

  if (thumbnailUrl) {
    return <img className="video-thumb" src={thumbnailUrl} alt="" />;
  }
  const src = playback.data?.hlsUrl;
  if (!src || /\.m3u8($|\?)/.test(src)) {
    return null;
  }
  return <video className="video-thumb" src={`${src}#t=0.5`} preload="metadata" muted playsInline />;
}
