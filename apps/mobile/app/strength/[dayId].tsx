import { colors, setsRepsForCycleWeek, spacing } from '@barbon-performance-analysis/core';
import type { components } from '@barbon-performance-analysis/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { problemDetail } from '@/api/problem';
import { useAuth } from '@/auth/AuthContext';
import { readWeightUnit, writeWeightUnit, type WeightUnit } from '@/prefs/weightUnit';
import { theme } from '@/ui/theme';

type DayExerciseView = components['schemas']['DayExerciseView'];
type ExerciseLogView = components['schemas']['ExerciseLogView'];

interface SetRow {
  reps: string;
  weight: string;
}

// "3×8", "3x8" or "3 x 8-10" → three rows pre-filled with 8 reps; anything else → one empty row.
function rowsFromPrescription(prescription: string | undefined): SetRow[] {
  const match = prescription?.match(/(\d+)\s*[x×]\s*(\d+)/i);
  if (!match) {
    return [{ reps: '', weight: '' }];
  }
  const sets = Math.min(Number(match[1]), 10);
  return Array.from({ length: sets }, () => ({ reps: match[2] as string, weight: '' }));
}

function rowsFromLog(log: ExerciseLogView): SetRow[] {
  return log.sets.map((set) => ({
    reps: String(set.reps ?? ''),
    weight: set.weight != null ? String(set.weight) : '',
  }));
}

function describeLog(log: ExerciseLogView): string {
  const unit = log.unit.toLowerCase();
  return log.sets
    .map((set) => (set.weight != null ? `${set.reps}×${set.weight}${unit}` : `${set.reps}×BW`))
    .join(', ');
}

export default function TrainingDayScreen() {
  const { user } = useAuth();
  const { dayId, week } = useLocalSearchParams<{ dayId: string; week?: string }>();
  const [playing, setPlaying] = useState<DayExerciseView | null>(null);
  const [unit, setUnit] = useState<WeightUnit>('LB');

  useEffect(() => {
    void readWeightUnit().then(setUnit);
  }, []);

  function chooseUnit(next: WeightUnit) {
    setUnit(next);
    void writeWeightUnit(next);
  }

  const plan = useQuery({
    queryKey: ['strength', 'plan'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/plan');
      if (error || !data) {
        throw new Error('Could not load your plan');
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

  const sections = useQuery({
    queryKey: ['strength', 'training-days', dayId, 'sections'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/training-days/{trainingDayId}/sections', {
        params: { path: { trainingDayId: dayId } },
      });
      if (error || !data) {
        throw new Error('Could not load this day');
      }
      return data;
    },
    enabled: Boolean(user) && Boolean(dayId),
  });

  const planWeek = Number(week) || plan.data?.planWeek || 1;
  const cycleWeek = ((planWeek - 1) % 4) + 1;
  const canLog = planWeek <= (plan.data?.unlockedWeeks ?? 0);

  const logsQuery = (planWeekToLoad: number) => ({
    queryKey: ['strength', 'training-days', dayId, 'logs', planWeekToLoad],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/training-days/{trainingDayId}/logs', {
        params: { path: { trainingDayId: dayId }, query: { planWeek: planWeekToLoad } },
      });
      if (error || !data) {
        throw new Error('Could not load your logs');
      }
      return data;
    },
  });
  const logs = useQuery({ ...logsQuery(planWeek), enabled: Boolean(user) && Boolean(dayId) });
  const previousLogs = useQuery({
    ...logsQuery(planWeek - 1),
    enabled: Boolean(user) && Boolean(dayId) && planWeek > 1,
  });

  const day = trainingDays.data?.find((d) => d.id === dayId);

  if (sections.isPending || logs.isPending) {
    return (
      <View style={[theme.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (sections.isError || !sections.data) {
    return (
      <SafeAreaView style={theme.screen} edges={['bottom']}>
        <View style={{ padding: spacing.xl }}>
          <Text style={theme.error}>We could not load this training day.</Text>
          <Pressable onPress={() => sections.refetch()} style={{ marginTop: spacing.md }}>
            <Text style={[theme.muted, { color: colors.accent }]}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={theme.screen} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text style={theme.eyebrow}>Barbon Performance</Text>
          <Text style={[theme.display, { marginTop: spacing.xs }]}>
            {(day?.title ?? 'Training day').toUpperCase()}
          </Text>
          <Text style={[theme.muted, { marginTop: spacing.sm }]}>Week {planWeek}</Text>
          {day?.focus ? <Text style={[theme.body, { marginTop: spacing.sm }]}>{day.focus}</Text> : null}
        </View>

        {day?.kind === 'CARDIO' ? null : (
          <>
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <Text style={theme.muted}>Weights in</Text>
              {(['LB', 'KG'] as const).map((option) => (
                <Pressable
                  key={option}
                  style={[theme.pill, unit === option && theme.pillActive]}
                  onPress={() => chooseUnit(option)}
                >
                  <Text style={[theme.pillLabel, unit === option && theme.pillLabelActive]}>
                    {option.toLowerCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            {!canLog ? <Text style={theme.muted}>You can log this week once it starts.</Text> : null}
          </>
        )}

        {day?.kind === 'CARDIO' ? (
          <View style={theme.card}>
            <Text style={theme.eyebrow}>Protocol</Text>
            <Text style={[theme.body, { marginTop: spacing.sm }]}>
              {day.protocol ?? 'Your coach will share this protocol.'}
            </Text>
          </View>
        ) : sections.data.every((section) => section.exercises.length === 0) ? (
          <Text style={theme.muted}>No exercises here yet.</Text>
        ) : (
          sections.data
            .filter((section) => section.exercises.length > 0)
            .map((section) => (
              <View key={section.id} style={{ gap: spacing.md }}>
                <View>
                  <Text style={[theme.eyebrow, { color: colors.accent }]}>{section.title}</Text>
                  {section.note ? (
                    <Text style={[theme.muted, { marginTop: spacing.xs }]}>{section.note}</Text>
                  ) : null}
                </View>
                {section.exercises.map((exercise) => (
                  <ExerciseCard
                    key={`${exercise.id}-${planWeek}`}
                    exercise={exercise}
                    dayId={dayId}
                    planWeek={planWeek}
                    prescription={setsRepsForCycleWeek(exercise, cycleWeek)}
                    log={logs.data?.find((l) => l.dayExerciseId === exercise.id)}
                    previous={previousLogs.data?.find((l) => l.dayExerciseId === exercise.id)}
                    unit={unit}
                    canLog={canLog}
                    onWatch={() => setPlaying(exercise)}
                  />
                ))}
              </View>
            ))
        )}
      </ScrollView>

      {playing ? <ExercisePlayer exercise={playing} onClose={() => setPlaying(null)} /> : null}
    </SafeAreaView>
  );
}

function ExerciseCard({
  exercise,
  dayId,
  planWeek,
  prescription,
  log,
  previous,
  unit,
  canLog,
  onWatch,
}: {
  exercise: DayExerciseView;
  dayId: string;
  planWeek: number;
  prescription: string | undefined;
  log: ExerciseLogView | undefined;
  previous: ExerciseLogView | undefined;
  unit: WeightUnit;
  canLog: boolean;
  onWatch: () => void;
}) {
  const queryClient = useQueryClient();
  const initialRows = useMemo(
    () => (log ? rowsFromLog(log) : rowsFromPrescription(prescription)),
    [log, prescription],
  );
  const [rows, setRows] = useState<SetRow[]>(initialRows);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const saved = log ? JSON.stringify([log.unit, rowsFromLog(log)]) : null;
  const dirty = JSON.stringify([unit, rows]) !== saved;
  const valid = rows.every(
    (row) => /^\d+$/.test(row.reps) && (row.weight === '' || !Number.isNaN(Number(row.weight))),
  );
  const saveable = dirty && valid;

  const save = useMutation({
    mutationFn: async () => {
      const { error, response } = await api.PUT(
        '/api/v1/strength/day-exercises/{dayExerciseId}/logs/{planWeek}',
        {
          params: { path: { dayExerciseId: exercise.id, planWeek } },
          body: {
            unit,
            sets: rows.map((row) => ({
              reps: Number(row.reps),
              weight: row.weight === '' ? undefined : Number(row.weight),
            })),
          },
        },
      );
      if (!response.ok) {
        throw new Error(problemDetail(error) ?? 'Could not save this exercise');
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['strength', 'training-days', dayId, 'logs', planWeek],
      }),
  });

  const cue = exercise.cueOverride ?? exercise.cue;

  function update(index: number, patch: Partial<SetRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addSet() {
    setRows((prev) => {
      const last = prev.at(-1);
      return [...prev, { reps: last?.reps ?? '', weight: last?.weight ?? '' }];
    });
  }

  return (
    <View style={theme.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
        <Text style={[theme.body, { color: colors.white, fontWeight: '700', flex: 1 }]}>
          {exercise.title}
        </Text>
        <Pressable onPress={onWatch} hitSlop={8}>
          <Text style={[theme.muted, { color: colors.accent }]}>Watch ▶</Text>
        </Pressable>
      </View>
      {cue ? <Text style={[theme.muted, { marginTop: spacing.xs }]}>{cue}</Text> : null}
      {exercise.notes ? (
        <Text style={[theme.body, { marginTop: spacing.xs }]}>{exercise.notes}</Text>
      ) : null}
      <Text style={[theme.body, { marginTop: spacing.sm }]}>
        {prescription ?? `No reps set for week ${planWeek}`}
      </Text>
      {previous ? (
        <Text style={[theme.muted, { marginTop: spacing.xs }]}>Last week: {describeLog(previous)}</Text>
      ) : null}

      {canLog ? (
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          {rows.map((row, index) => (
            <View key={index} style={styles.setRow}>
              <Text style={[theme.muted, styles.setLabel]}>Set {index + 1}</Text>
              <TextInput
                style={[theme.input, styles.setInput]}
                keyboardType="number-pad"
                placeholder="reps"
                placeholderTextColor={colors.gray}
                value={row.reps}
                onChangeText={(reps) => update(index, { reps })}
              />
              <TextInput
                style={[theme.input, styles.setInput]}
                keyboardType="decimal-pad"
                placeholder={unit.toLowerCase()}
                placeholderTextColor={colors.gray}
                value={row.weight}
                onChangeText={(weight) => update(index, { weight: weight.replace(',', '.') })}
              />
              <Pressable
                hitSlop={8}
                onPress={() => setRows((prev) => prev.filter((_, i) => i !== index))}
              >
                <Text style={theme.muted}>✕</Text>
              </Pressable>
            </View>
          ))}
          <Pressable onPress={addSet}>
            <Text style={[theme.muted, { color: colors.accent }]}>+ set</Text>
          </Pressable>
          <Pressable
            style={[theme.primaryButton, (!saveable || save.isPending) && theme.primaryButtonDisabled]}
            disabled={!saveable || save.isPending}
            onPress={() => save.mutate()}
          >
            {save.isPending ? (
              <ActivityIndicator color={colors.gray} />
            ) : (
              <Text style={[theme.primaryButtonLabel, !saveable && theme.primaryButtonLabelDisabled]}>
                {log ? 'Update' : 'Save'}
              </Text>
            )}
          </Pressable>
          {save.isError ? <Text style={theme.error}>{save.error.message}</Text> : null}
        </View>
      ) : log ? (
        <Text style={[theme.muted, { marginTop: spacing.sm }]}>Logged: {describeLog(log)}</Text>
      ) : null}
    </View>
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

  const player = useVideoPlayer(playback.data?.hlsUrl ?? null, (p) => {
    p.allowsExternalPlayback = false;
  });

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

const styles = StyleSheet.create({
  setRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  setLabel: {
    width: 44,
  },
  setInput: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
});
