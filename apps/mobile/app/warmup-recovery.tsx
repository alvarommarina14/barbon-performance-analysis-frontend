import { colors, spacing } from '@barbon-performance-analysis/core';
import type { components } from '@barbon-performance-analysis/api-client';
import { useQuery } from '@tanstack/react-query';
import { useVideoPlayer, VideoView, type VideoPlayerStatus } from 'expo-video';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { theme } from '@/ui/theme';
import { VideoLoader } from '@/ui/VideoLoader';

type Part = components['schemas']['ConfirmRoutineVideoRequest']['part'];

const PARTS: { part: Part; label: string; blurb: string }[] = [
  { part: 'WARMUP', label: 'Warm-up', blurb: 'Before every session and every match.' },
  { part: 'RECOVERY', label: 'Recovery', blurb: 'After you come off court.' },
];

export default function WarmupRecoveryScreen() {
  const [part, setPart] = useState<Part>('WARMUP');

  const routine = useQuery({
    queryKey: ['daily-routine'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/content/daily-routine');
      if (error || !data) {
        throw new Error('Could not load the daily routine');
      }
      return data;
    },
  });

  if (routine.isPending) {
    return (
      <View style={[theme.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (routine.isError || !routine.data) {
    return (
      <SafeAreaView style={theme.screen} edges={['bottom']}>
        <View style={{ padding: spacing.xl }}>
          <Text style={theme.error}>We could not load the warm-up and recovery routine.</Text>
          <Pressable onPress={() => routine.refetch()} style={{ marginTop: spacing.md }}>
            <Text style={[theme.muted, { color: colors.accent }]}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const data = routine.data;
  const selected = PARTS.find((p) => p.part === part) ?? PARTS[0];
  const video = part === 'WARMUP' ? data.warmup : data.recovery;

  return (
    <SafeAreaView style={theme.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
        <View>
          <Text style={theme.eyebrow}>Every session</Text>
          <Text style={[theme.display, { marginTop: spacing.xs }]}>WARM-UP & RECOVERY</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {PARTS.map(({ part: p, label }) => {
            const active = p === part;
            return (
              <Pressable
                key={p}
                style={[theme.pill, active && theme.pillActive]}
                onPress={() => setPart(p)}
              >
                <Text style={[theme.pillLabel, active && theme.pillLabelActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={theme.body}>{selected?.blurb}</Text>

        {video ? (
          <RoutineVideo key={part} part={part} />
        ) : (
          <View style={theme.card}>
            <Text style={theme.muted}>Your coach has not uploaded this video yet.</Text>
          </View>
        )}

        {data.pdfUrl ? (
          <Pressable style={theme.card} onPress={() => Linking.openURL(data.pdfUrl as string)}>
            <Text style={[theme.body, { color: colors.white, fontWeight: '700' }]}>
              Daily Routine (PDF)
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

function RoutineVideo({ part }: { part: Part }) {
  const playback = useQuery({
    queryKey: ['daily-routine', 'playback', part],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/content/daily-routine/playback', {
        params: { query: { part } },
      });
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

  const downloadFraction = player.duration > 0 ? Math.min(1, bufferedSeconds / player.duration) : null;
  const showVideoLoader = status === 'loading' || status === 'error';

  return (
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
  );
}
