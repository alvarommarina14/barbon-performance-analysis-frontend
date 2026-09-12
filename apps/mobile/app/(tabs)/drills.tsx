import { colors, spacing } from '@barbon-performance-analysis/core';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { theme } from '@/ui/theme';
import type { components } from '@barbon-performance-analysis/api-client';

type DrillAssignment = components['schemas']['DrillAssignmentView'];
type DrillCategory = DrillAssignment['category'];

const CATEGORIES: DrillCategory[] = ['FOREHAND', 'BACKHAND', 'SERVE', 'MOVEMENT', 'FITNESS'];

function categoryLabel(category: DrillCategory): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

export default function DrillsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<DrillCategory | 'ALL'>('ALL');
  const [playing, setPlaying] = useState<DrillAssignment | null>(null);

  const drills = useQuery({
    queryKey: ['drills', 'assignments'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/drills/assignments');
      if (error || !data) {
        throw new Error('Could not load your drills');
      }
      return data;
    },
    enabled: Boolean(user),
  });

  const visible = (drills.data ?? []).filter((drill) => filter === 'ALL' || drill.category === filter);

  return (
    <SafeAreaView style={theme.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={drills.isRefetching}
            onRefresh={() => drills.refetch()}
            tintColor={colors.accent}
          />
        }
      >
        <View>
          <Text style={theme.eyebrow}>Barbon Performance</Text>
          <Text style={[theme.display, { marginTop: spacing.xs }]}>DRILLS</Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Pressable
            style={[theme.pill, filter === 'ALL' && theme.pillActive]}
            onPress={() => setFilter('ALL')}
          >
            <Text style={[theme.pillLabel, filter === 'ALL' && theme.pillLabelActive]}>All</Text>
          </Pressable>
          {CATEGORIES.map((category) => {
            const active = filter === category;
            return (
              <Pressable
                key={category}
                style={[theme.pill, active && theme.pillActive]}
                onPress={() => setFilter(category)}
              >
                <Text style={[theme.pillLabel, active && theme.pillLabelActive]}>
                  {categoryLabel(category)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {drills.isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : drills.isError ? (
          <View style={theme.card}>
            <Text style={theme.error}>We could not load your drills.</Text>
            <Pressable onPress={() => drills.refetch()} style={{ marginTop: spacing.md }}>
              <Text style={[theme.muted, { color: colors.accent }]}>Try again</Text>
            </Pressable>
          </View>
        ) : visible.length === 0 ? (
          <Text style={theme.muted}>No drills here yet.</Text>
        ) : (
          visible.map((drill) => (
            <Pressable key={drill.id} style={theme.card} onPress={() => setPlaying(drill)}>
              <Text style={theme.eyebrow}>{categoryLabel(drill.category)}</Text>
              <Text
                style={[theme.body, { color: colors.white, fontWeight: '700', marginTop: spacing.xs }]}
              >
                {drill.title}
              </Text>
              {drill.cue ? <Text style={[theme.muted, { marginTop: spacing.xs }]}>{drill.cue}</Text> : null}
              {drill.coachNote ? (
                <Text style={[theme.body, { marginTop: spacing.sm }]}>{drill.coachNote}</Text>
              ) : null}
              {drill.analysisId ? (
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    router.push({ pathname: '/analysis/[id]', params: { id: drill.analysisId as string } });
                  }}
                  style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}
                >
                  <Text style={[theme.muted, { color: colors.accent }]}>
                    From {drill.analysisTitle ?? 'your analysis'} →
                  </Text>
                </Pressable>
              ) : null}
            </Pressable>
          ))
        )}
      </ScrollView>

      {playing ? <DrillPlayer drill={playing} onClose={() => setPlaying(null)} /> : null}
    </SafeAreaView>
  );
}

function DrillPlayer({ drill, onClose }: { drill: DrillAssignment; onClose: () => void }) {
  const playback = useQuery({
    queryKey: ['drills', 'library', drill.libraryItemId, 'playback'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/drills/library/{itemId}/playback', {
        params: { path: { itemId: drill.libraryItemId } },
      });
      if (error || !data) {
        throw new Error('Could not load this drill video');
      }
      return data;
    },
  });

  const player = useVideoPlayer(playback.data?.hlsUrl ?? null, (p) => p.play());

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[theme.screen, { padding: spacing.xl, gap: spacing.lg }]}>
        <Pressable onPress={onClose} style={{ alignSelf: 'flex-start' }}>
          <Text style={[theme.muted, { color: colors.accent }]}>← Back</Text>
        </Pressable>
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
        <Text style={[theme.body, { color: colors.white, fontWeight: '700' }]}>{drill.title}</Text>
        {drill.cue ? <Text style={theme.muted}>{drill.cue}</Text> : null}
      </SafeAreaView>
    </Modal>
  );
}
