import { colors, spacing } from '@barbon-performance-analysis/core';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { theme } from '@/ui/theme';
import type { components } from '@barbon-performance-analysis/api-client';

type TrainingDayView = components['schemas']['TrainingDayView'];
type TrainingDayKind = TrainingDayView['kind'];

const PLAN_WEEKS = 12;
const CYCLE_WEEKS = 4;

function cycleWeekOf(planWeek: number): number {
  return ((planWeek - 1) % CYCLE_WEEKS) + 1;
}

function kindLabel(kind: TrainingDayKind): string {
  return kind.charAt(0) + kind.slice(1).toLowerCase();
}

export default function StrengthScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

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

  const cyclePhases = useQuery({
    queryKey: ['strength', 'cycle-phases'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/cycle-phases');
      if (error || !data) {
        throw new Error('Could not load the strength cycle');
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

  const rpeGuide = useQuery({
    queryKey: ['content', 'rpe-guide'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/content/rpe-guide');
      if (error || !data) {
        throw new Error('Could not load the RPE guide');
      }
      return data;
    },
    enabled: Boolean(user),
  });

  const planWeeks = home.data?.planWeeks ?? PLAN_WEEKS;
  const currentWeek = home.data?.planWeek;
  const effectiveWeek = selectedWeek ?? currentWeek ?? 1;
  const selectedPhase = cyclePhases.data?.find(
    (phase) => phase.weekNumber === cycleWeekOf(effectiveWeek),
  );

  const isPending = home.isPending || cyclePhases.isPending || trainingDays.isPending;
  const isError = cyclePhases.isError || trainingDays.isError;

  return (
    <SafeAreaView style={theme.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
        <View>
          <Text style={theme.eyebrow}>Barbon Performance</Text>
          <Text style={[theme.display, { marginTop: spacing.xs }]}>STRENGTH & CONDITIONING</Text>
        </View>

        {isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : isError ? (
          <View style={theme.card}>
            <Text style={theme.error}>We could not load your training.</Text>
            <Pressable
              onPress={() => {
                cyclePhases.refetch();
                trainingDays.refetch();
              }}
              style={{ marginTop: spacing.md }}
            >
              <Text style={[theme.muted, { color: colors.accent }]}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm }}
            >
              {Array.from({ length: planWeeks }, (_, index) => index + 1).map((week) => {
                const active = week === effectiveWeek;
                const current = week === currentWeek;
                return (
                  <Pressable
                    key={week}
                    style={[
                      theme.pill,
                      current && !active && { borderColor: colors.accent },
                      active && theme.pillActive,
                    ]}
                    onPress={() => setSelectedWeek(week)}
                  >
                    <Text style={[theme.pillLabel, active && theme.pillLabelActive]}>
                      Week {week}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {selectedPhase ? (
              <View style={theme.card}>
                <Text style={theme.eyebrow}>
                  {effectiveWeek === currentWeek ? 'This week · ' : ''}Week {effectiveWeek} of {planWeeks}
                </Text>
                <Text
                  style={[theme.body, { color: colors.white, fontWeight: '700', marginTop: spacing.xs }]}
                >
                  {selectedPhase.phaseName}
                </Text>
                <Text style={[theme.muted, { marginTop: spacing.xs }]}>{selectedPhase.goal}</Text>
                {selectedPhase.setsReps || selectedPhase.rpeRange ? (
                  <Text style={[theme.body, { marginTop: spacing.xs }]}>
                    {[selectedPhase.setsReps, selectedPhase.rpeRange].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={theme.muted}>
                Your coach has not set up this part of the cycle yet.
              </Text>
            )}

            <View>
              <Text style={theme.sectionTitle}>Training days</Text>
              <View style={{ marginTop: spacing.md, gap: spacing.md }}>
                {(trainingDays.data ?? []).length === 0 ? (
                  <Text style={theme.muted}>No training days here yet.</Text>
                ) : (
                  (trainingDays.data ?? []).map((day) => (
                    <Pressable
                      key={day.id}
                      style={theme.card}
                      onPress={() =>
                        router.push({
                          pathname: '/strength/[dayId]',
                          params: { dayId: day.id, week: String(effectiveWeek) },
                        })
                      }
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={theme.eyebrow}>{day.dayLabel}</Text>
                        <View style={theme.chip}>
                          <Text style={theme.chipLabel}>{kindLabel(day.kind)}</Text>
                        </View>
                      </View>
                      <Text
                        style={[theme.body, { color: colors.white, fontWeight: '700', marginTop: spacing.xs }]}
                      >
                        {day.title}
                      </Text>
                      {day.focus ? (
                        <Text style={[theme.muted, { marginTop: spacing.xs }]}>{day.focus}</Text>
                      ) : null}
                      <Text style={[theme.muted, { marginTop: spacing.sm }]}>
                        {[
                          day.durationMinutes ? `${day.durationMinutes} min` : null,
                          `${day.exerciseCount ?? 0} exercises`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
            </View>

            <View style={{ gap: spacing.md }}>
              {home.data?.programPdfUrl ? (
                <Pressable style={theme.card} onPress={() => Linking.openURL(home.data.programPdfUrl as string)}>
                  <Text style={[theme.body, { color: colors.white, fontWeight: '700' }]}>
                    Program PDF
                  </Text>
                  <Text style={[theme.muted, { marginTop: spacing.xs, color: colors.accent }]}>
                    Open →
                  </Text>
                </Pressable>
              ) : null}
              {rpeGuide.data?.pdfUrl ? (
                <Pressable style={theme.card} onPress={() => Linking.openURL(rpeGuide.data.pdfUrl as string)}>
                  <Text style={[theme.body, { color: colors.white, fontWeight: '700' }]}>
                    RPE guide
                  </Text>
                  <Text style={[theme.muted, { marginTop: spacing.xs, color: colors.accent }]}>
                    Open →
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
