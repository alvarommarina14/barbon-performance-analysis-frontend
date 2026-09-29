import { colors, fonts, radii, spacing } from '@barbon-performance-analysis/core';
import { useQuery } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { theme } from '@/ui/theme';

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
              <Text style={theme.eyebrow}>Strength cycle</Text>
              <View style={styles.weekRow}>
                <Text style={styles.weekNumber}>{home.data.currentWeek}</Text>
                <Text style={styles.weekTotal}>/ {home.data.cycleWeeks}</Text>
              </View>
              <Text style={theme.muted}>
                {home.data.cycleStartedAt
                  ? `Cycle started ${home.data.cycleStartedAt}`
                  : 'Your coach has not started a cycle yet'}
              </Text>
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
                  {home.data.currentPhase.setsReps || home.data.currentPhase.rpeRange ? (
                    <Text style={[theme.body, { marginTop: spacing.xs }]}>
                      {[home.data.currentPhase.setsReps, home.data.currentPhase.rpeRange]
                        .filter(Boolean)
                        .join(' · ')}
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
