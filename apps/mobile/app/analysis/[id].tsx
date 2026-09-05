import { colors, formatTimestamp, spacing } from '@barbon-performance-analysis/core';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { theme } from '@/ui/theme';

export default function AnalysisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const analysis = useQuery({
    queryKey: ['analysis', id],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/analyses/{analysisId}', {
        params: { path: { analysisId: id } },
      });
      if (error || !data) {
        throw new Error('Could not load this analysis');
      }
      return data;
    },
  });

  const playback = useQuery({
    queryKey: ['analysis', id, 'playback'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/analyses/{analysisId}/playback', {
        params: { path: { analysisId: id } },
      });
      if (error || !data) {
        throw new Error('Could not load the video');
      }
      return data;
    },
  });

  const player = useVideoPlayer(playback.data?.hlsUrl ?? null);

  function seekTo(seconds: number) {
    player.currentTime = seconds;
    player.play();
  }

  if (analysis.isPending) {
    return (
      <View style={[theme.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (analysis.isError || !analysis.data) {
    return (
      <SafeAreaView style={theme.screen} edges={['bottom']}>
        <View style={{ padding: spacing.xl }}>
          <Text style={theme.error}>We could not load this analysis.</Text>
          <Pressable onPress={() => analysis.refetch()} style={{ marginTop: spacing.md }}>
            <Text style={[theme.muted, { color: colors.accent }]}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const data = analysis.data;

  return (
    <SafeAreaView style={theme.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
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
            <VideoView player={player} style={{ flex: 1 }} nativeControls />
          )}
        </View>

        <View>
          <Text style={theme.eyebrow}>{data.coachName}</Text>
          <Text style={[theme.display, { fontSize: 30, marginTop: spacing.xs }]}>{data.title}</Text>
          {data.summary ? (
            <Text style={[theme.body, { marginTop: spacing.sm }]}>{data.summary}</Text>
          ) : null}
        </View>

        {data.findings.length > 0 ? (
          <View style={{ gap: spacing.xs }}>
            {data.findings.map((finding) => (
              <Pressable
                key={finding.id}
                onPress={() => seekTo(finding.timestampSeconds ?? 0)}
                style={{
                  backgroundColor: colors.card,
                  borderLeftColor: colors.accent,
                  borderLeftWidth: 3,
                  borderRadius: 6,
                  flexDirection: 'row',
                  gap: spacing.md,
                  padding: spacing.md,
                }}
              >
                <Text style={theme.stamp}>{formatTimestamp(finding.timestampSeconds ?? 0)}</Text>
                <Text style={[theme.body, { flex: 1 }]}>
                  <Text style={{ color: colors.white, fontWeight: '700' }}>{finding.title}</Text>
                  {finding.detail ? ` — ${finding.detail}` : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={theme.muted}>Your coach has not marked any findings yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
