import Hls from 'hls.js';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { VideoLoader } from './VideoLoader';

interface HlsVideoProps {
  src: string;
  className?: string;
}

type LoadPhase = 'loading' | 'stalled' | 'ready';

// Chromium (and therefore Electron) has no native HLS, so hls.js transmuxes to MSE. The worker
// is disabled: the renderer CSP has no `blob:` in script scope, and coach-review clips are short.
export const HlsVideo = forwardRef<HTMLVideoElement, HlsVideoProps>(function HlsVideo(
  { src, className },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement, []);

  const [phase, setPhase] = useState<LoadPhase>('loading');
  const [fraction, setFraction] = useState<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) {
      return;
    }

    setPhase('loading');
    setFraction(null);

    // How much of the whole clip has been downloaded, not just buffered ahead of the playhead.
    const readDownloaded = () => {
      if (video.duration > 0 && Number.isFinite(video.duration) && video.buffered.length > 0) {
        const end = video.buffered.end(video.buffered.length - 1);
        const next = Math.min(1, end / video.duration);
        setFraction(next);
        if (next >= 0.999) {
          setPhase('ready');
        }
      }
    };

    const onProgress = () => readDownloaded();
    const onWaiting = () => setPhase((p) => (p === 'ready' ? p : 'stalled'));
    const onResume = () => setPhase((p) => (p === 'stalled' ? 'loading' : p));
    // Dismiss once the clip is fully downloaded or the coach starts watching it.
    const onPlayingOrDone = () => setPhase('ready');

    video.addEventListener('loadedmetadata', onProgress);
    video.addEventListener('progress', onProgress);
    video.addEventListener('timeupdate', onProgress);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onResume);
    video.addEventListener('playing', onPlayingOrDone);
    video.addEventListener('canplaythrough', onPlayingOrDone);

    let hls: Hls | undefined;
    const isHls = /\.m3u8($|\?)/.test(src);
    if (!isHls) {
      // The local video provider hands back a pre-signed MP4 URL, not an HLS manifest — play it
      // natively rather than feeding a progressive file into hls.js, which expects a playlist.
      video.src = src;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    } else if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: false });
      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      video.src = src;
    }

    return () => {
      video.removeEventListener('loadedmetadata', onProgress);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('timeupdate', onProgress);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onResume);
      video.removeEventListener('playing', onPlayingOrDone);
      video.removeEventListener('canplaythrough', onPlayingOrDone);
      hls?.destroy();
    };
  }, [src]);

  return (
    <div className="video-frame-wrap">
      <video ref={videoRef} className={className ?? 'video-frame'} controls playsInline />
      {phase !== 'ready' ? (
        <VideoLoader fraction={phase === 'stalled' ? null : fraction} />
      ) : null}
    </div>
  );
});
