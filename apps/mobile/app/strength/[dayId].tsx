import { colors, spacing } from '@barbon-performance-analysis/core';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { theme } from '@/ui/theme';
import type { components } from '@barbon-performance-analysis/api-client';

type DayExerciseView = components['schemas']['DayExerciseView'];

function repsForWeek(exercise: DayExerciseView, week: number): string | undefined {
  switch (week) {
    case 1:
      return exercise.setsRepsWk1;
    case 2:
      return exercise.setsRepsWk2;
    case 3:
      return exercise.setsRepsWk3;
    case 4:
      return exercise.setsRepsWk4;
    default:
      return undefined;
  }
}

export default function TrainingDayScreen() {
  const { user } = useAuth();
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const [playing, setPlaying] = useState<DayExerciseView | null>(null);

  const home = useQuery({
    queryKey: ['player', 'home'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/players/me/home');
      if (error || !data) {
        throw new Error('Could not load your home');
      }
      return data;
    },
    enabled: Boolean(user),
  });

  const trainingDays = useQuery({
    queryKey: ['strength', 'training-days'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/training-days');
      if (error || !data) {
        throw new Error('Could not load your training days');
      }
      return data;
    },
    enabled: Boolean(user),
  });

  const exercises = useQuery({
    queryKey: ['strength', 'training-days', dayId, 'exercises'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/training-days/{trainingDayId}/exercises', {
        params: { path: { trainingDayId: dayId } },
      });
      if (error || !data) {
        throw new Error('Could not load this day');
      }
      return data;
    },
    enabled: Boolean(user) && Boolean(dayId),
  });

  const day = trainingDays.data?.find((d) => d.id === dayId);
  const currentWeek = home.data?.currentWeek ?? 1;

  if (exercises.isPending) {
    return (
      <View style={[theme.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (exercises.isError || !exercises.data) {
    return (
      <SafeAreaView style={theme.screen} edges={['bottom']}>
        <View style={{ padding: spacing.xl }}>
          <Text style={theme.error}>We could not load this training day.</Text>
          <Pressable onPress={() => exercises.refetch()} style={{ marginTop: spacing.md }}>
            <Text style={[theme.muted, { color: colors.accent }]}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={theme.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
        <View>
          <Text style={theme.eyebrow}>Barbon Performance</Text>
          <Text style={[theme.display, { marginTop: spacing.xs }]}>
            {(day?.title ?? 'Training day').toUpperCase()}
          </Text>
          {day?.focus ? <Text style={[theme.body, { marginTop: spacing.sm }]}>{day.focus}</Text> : null}
        </View>

        {exercises.data.length === 0 ? (
          <Text style={theme.muted}>No exercises here yet.</Text>
        ) : (
          exercises.data.map((exercise) => {
            const reps = repsForWeek(exercise, currentWeek);
            const cue = exercise.cueOverride ?? exercise.cue;
            return (
              <Pressable key={exercise.id} style={theme.card} onPress={() => setPlaying(exercise)}>
                <Text
                  style={[theme.body, { color: colors.white, fontWeight: '700' }]}
                >
                  {exercise.title}
                </Text>
                {cue ? <Text style={[theme.muted, { marginTop: spacing.xs }]}>{cue}</Text> : null}
                <Text style={[theme.body, { marginTop: spacing.sm }]}>
                  {reps ?? `No reps set for week ${currentWeek}`}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {playing ? <ExercisePlayer exercise={playing} onClose={() => setPlaying(null)} /> : null}
    </SafeAreaView>
  );
}

function ExercisePlayer({
  exercise,
  onClose,
}: {
  exercise: DayExerciseView;
  onClose: () => void;
}) {
  const playback = useQuery({
    queryKey: ['drills', 'library', exercise.libraryItemId, 'playback'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/drills/library/{itemId}/playback', {
        params: { path: { itemId: exercise.libraryItemId } },
      });
      if (error || !data) {
        throw new Error('Could not load this exercise video');
      }
      return data;
    },
  });

  const player = useVideoPlayer(playback.data?.hlsUrl ?? null);

  useEffect(() => {
    const sub = player.addListener('statusChange', (payload) => {
      if (payload.status === 'readyToPlay') {
        player.play();
      }
    });
    return () => sub.remove();
  }, [player]);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={[theme.screen, { padding: spacing.xl, gap: spacing.lg }]}>
          <Pressable
            onPress={onClose}
            style={[theme.chip, { alignSelf: 'flex-start', paddingVertical: spacing.sm }]}
          >
            <Text style={[theme.chipLabel, { color: colors.accent, fontSize: 13 }]}>← Back</Text>
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
          <Text style={[theme.body, { color: colors.white, fontWeight: '700' }]}>{exercise.title}</Text>
          {exercise.cueOverride ?? exercise.cue ? (
            <Text style={theme.muted}>{exercise.cueOverride ?? exercise.cue}</Text>
          ) : null}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
