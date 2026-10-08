import { colors, fonts, radii, spacing } from '@barbon-performance-analysis/core';
import { useQuery } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { theme } from '@/ui/theme';

function planStatus(home: { planWeek?: number; planWeeks?: number; planStartedAt?: string }): string {
  if (home.planWeek) {
    return `Week ${home.planWeek} of ${home.planWeeks ?? 12}`;
  }
  if (!home.planStartedAt) {
    return 'Your coach has not started your plan yet';
  }
  return new Date(`${home.planStartedAt}T00:00:00`) > new Date()
    ? `Your plan starts ${formatDay(home.planStartedAt)}`
    : 'Plan complete';
}

function formatDay(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatLongDay(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
  });
}

function isFromTheLastMonth(note: { weekStartsOn?: string; updatedAt: string }): boolean {
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  const dated = note.weekStartsOn ? new Date(`${note.weekStartsOn}T00:00:00`) : new Date(note.updatedAt);
  return dated >= monthAgo;
}

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

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

  const weeklyNotes = useQuery({
    queryKey: ['strength', 'weekly-notes'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/strength/weekly-notes');
      if (error || !data) {
        throw new Error('Could not load your coach notes');
      }
      return data
        .filter(isFromTheLastMonth)
        .sort((a, b) => (b.planWeek ?? 0) - (a.planWeek ?? 0));
    },
    enabled: Boolean(user),
  });

  const coachFirstName = home.data?.coach?.name.split(' ')[0] ?? 'your coach';

  if (user === null) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView style={theme.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
        <View>
          <Text style={theme.eyebrow}>Barbon Performance</Text>
          <Text style={[theme.display, { marginTop: spacing.xs }]}>
            {(home.data?.name ?? user?.name ?? '').toUpperCase()}
          </Text>
        </View>

        {home.isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : home.isError ? (
          <View style={theme.card}>
            <Text style={theme.error}>We could not load your home right now.</Text>
            <Pressable onPress={() => home.refetch()} style={{ marginTop: spacing.md }}>
              <Text style={[theme.muted, { color: colors.accent }]}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={theme.card}>
              <Text style={theme.eyebrow}>Your plan</Text>
              <View style={styles.weekRow}>
                <Text style={styles.weekNumber}>{home.data.planWeek ?? '—'}</Text>
                <Text style={styles.weekTotal}>/ {home.data.planWeeks ?? 12}</Text>
              </View>
              <Text style={theme.muted}>{planStatus(home.data)}</Text>
              <View style={styles.tierPill}>
                <Text style={styles.tierLabel}>{home.data.membershipTier}</Text>
              </View>
              {home.data.currentPhase ? (
                <View style={{ marginTop: spacing.md }}>
                  <Text style={[theme.body, { color: colors.white, fontWeight: '700' }]}>
                    {home.data.currentPhase.phaseName}
                  </Text>
                  <Text style={[theme.muted, { marginTop: spacing.xs }]}>
                    {home.data.currentPhase.goal}
                  </Text>
                  {home.data.currentPhase.rpeRange ? (
                    <Text style={[theme.body, { marginTop: spacing.xs }]}>
                      {home.data.currentPhase.rpeRange}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              <Pressable
                onPress={() => router.push('/strength')}
                style={{ marginTop: spacing.md }}
              >
                <Text style={[theme.muted, { color: colors.accent }]}>
                  See my training →
                </Text>
              </Pressable>
            </View>

            <Pressable style={theme.card} onPress={() => router.push('/warmup-recovery')}>
              <Text style={[theme.body, { color: colors.white, fontWeight: '700' }]}>
                Warm-up & Recovery
              </Text>
              <Text style={[theme.muted, { marginTop: spacing.xs }]}>
                Before you play and after you come off court →
              </Text>
            </Pressable>

            {home.data.coach?.bookingUrl ? (
              <View style={theme.card}>
                <Text style={theme.eyebrow}>Book your call</Text>
                <Text style={[theme.body, { marginTop: spacing.sm }]}>
                  Included in your membership. Pick a time that works for you with{' '}
                  {coachFirstName}.
                </Text>
                <Pressable
                  style={[theme.primaryButton, { marginTop: spacing.md }]}
                  onPress={() => Linking.openURL(home.data.coach?.bookingUrl as string)}
                >
                  <Text style={theme.primaryButtonLabel}>Book a call</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={theme.card}>
              <Text style={theme.eyebrow}>Your coach</Text>
              <Text style={[theme.body, { marginTop: spacing.sm }]}>
                {home.data.coach?.name ?? 'Not assigned yet'}
              </Text>
              {home.data.nextCallAt ? (
                <Text style={[theme.muted, { marginTop: spacing.xs }]}>
                  Next call {new Date(home.data.nextCallAt).toLocaleString()}
                </Text>
              ) : null}
            </View>

            {weeklyNotes.data && weeklyNotes.data.length > 0 ? (
              <View style={{ gap: spacing.md }}>
                <Text style={theme.sectionTitle}>LATEST FROM {coachFirstName.toUpperCase()}</Text>
                {weeklyNotes.data.map((note, index) => (
                  <View key={note.planWeek} style={[styles.note, index > 0 && styles.noteOld]}>
                    <Text style={[styles.noteDate, index > 0 && { color: colors.gray }]}>
                      {note.weekStartsOn ? formatLongDay(note.weekStartsOn) : `Week ${note.planWeek}`}
                    </Text>
                    <Text style={[theme.body, { marginTop: spacing.sm }]}>{note.body}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        )}

        <Pressable
          onPress={logout}
          style={[theme.chip, { alignSelf: 'flex-start', marginTop: spacing.lg, paddingVertical: spacing.sm }]}
        >
          <Text style={[theme.chipLabel, { color: colors.danger, fontSize: 13 }]}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  note: {
    backgroundColor: colors.card,
    borderLeftColor: colors.accent,
    borderLeftWidth: 3,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  noteOld: {
    borderLeftColor: '#444',
    opacity: 0.85,
  },
  noteDate: {
    color: colors.accent,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  weekRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  weekNumber: {
    color: colors.accent,
    fontFamily: fonts.display,
    fontSize: 56,
  },
  weekTotal: {
    color: colors.gray,
    fontFamily: fonts.display,
    fontSize: 28,
  },
  tierPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.dark,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tierLabel: {
    color: colors.accent,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
