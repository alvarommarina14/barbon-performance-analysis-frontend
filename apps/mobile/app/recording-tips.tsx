import { colors, spacing } from '@barbon-performance-analysis/core';
import { useQuery } from '@tanstack/react-query';
import { useVideoPlayer, VideoView, type VideoPlayerStatus } from 'expo-video';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { theme } from '@/ui/theme';
import { VideoLoader } from '@/ui/VideoLoader';

export default function RecordingTipsScreen() {
  const tips = useQuery({
    queryKey: ['recording-tips'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/content/recording-tips');
      if (error || !data) {
        throw new Error('Could not load the recording tips');
      }
      return data;
    },
  });

  const videoAssetId = tips.data?.videoAssetId;

  const playback = useQuery({
    queryKey: ['recording-tips', 'playback'],
    enabled: Boolean(videoAssetId),
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/content/recording-tips/playback');
      if (error || !data) {
        throw new Error('Could not load the video');
      }
      return data;
    },
  });

  const player = useVideoPlayer(playback.data?.hlsUrl ?? null, (p) => {
    p.timeUpdateEventInterval = 0.5;
    p.allowsExternalPlayback = false;
  });

  const [status, setStatus] = useState<VideoPlayerStatus>('loading');
  const [bufferedSeconds, setBufferedSeconds] = useState(0);

  useEffect(() => {
    const statusSub = player.addListener('statusChange', (payload) => setStatus(payload.status));
    const timeSub = player.addListener('timeUpdate', (payload) =>
      setBufferedSeconds(payload.bufferedPosition),
    );
    // timeUpdate only fires during playback; poll so the percentage also moves while paused.
    const poll = setInterval(() => setBufferedSeconds(player.bufferedPosition), 400);
    return () => {
      statusSub.remove();
      timeSub.remove();
      clearInterval(poll);
    };
  }, [player]);

  const downloadFraction =
    player.duration > 0 ? Math.min(1, bufferedSeconds / player.duration) : null;
  const showVideoLoader = status === 'loading' || status === 'error';

  if (tips.isPending) {
    return (
      <View style={[theme.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (tips.isError || !tips.data) {
    return (
      <SafeAreaView style={theme.screen} edges={['bottom']}>
        <View style={{ padding: spacing.xl }}>
          <Text style={theme.error}>We could not load the recording tips.</Text>
          <Pressable onPress={() => tips.refetch()} style={{ marginTop: spacing.md }}>
            <Text style={[theme.muted, { color: colors.accent }]}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const data = tips.data;
  const hasVideo = Boolean(data.videoAssetId);
  const hasPdf = Boolean(data.pdfUrl);

  return (
    <SafeAreaView style={theme.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
        <View>
          <Text style={theme.eyebrow}>Barbon Performance</Text>
          <Text style={[theme.display, { marginTop: spacing.xs }]}>RECORDING TIPS</Text>
          <Text style={[theme.body, { marginTop: spacing.sm }]}>
            A good angle makes the analysis easier to read — watch the video and check the guide
            before you record.
          </Text>
        </View>

        {hasVideo ? (
          <View
            style={{
              aspectRatio: 16 / 9,
              backgroundColor: '#000',
              borderColor: colors.line,
              borderRadius: 8,
              borderWidth: 1,
              overflow: 'hidden',
            }}
          >
            {playback.isPending ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : playback.isError ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={theme.muted}>The video is not ready yet.</Text>
              </View>
            ) : (
              <>
                <VideoView player={player} style={{ flex: 1 }} nativeControls />
                {showVideoLoader ? (
                  <VideoLoader
                    fraction={status === 'error' ? null : downloadFraction}
                    label={status === 'error' ? 'Video unavailable' : 'Loading video'}
                  />
                ) : null}
              </>
            )}
          </View>
        ) : (
          <View style={theme.card}>
            <Text style={theme.muted}>Your coach has not uploaded a recording video yet.</Text>
          </View>
        )}

        {hasPdf ? (
          <Pressable style={theme.card} onPress={() => Linking.openURL(data.pdfUrl as string)}>
            <Text style={[theme.body, { color: colors.white, fontWeight: '700' }]}>
              Recording guide (PDF)
            </Text>
            <Text style={[theme.muted, { marginTop: spacing.xs, color: colors.accent }]}>
              Open →
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
