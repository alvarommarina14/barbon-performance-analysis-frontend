import { colors, spacing } from '@barbon-performance-analysis/core';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { strokeLabel } from '@/ui/strokes';
import { theme } from '@/ui/theme';

export default function AnalysesScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const analyses = useQuery({
    queryKey: ['analyses'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/analyses');
      if (error || !data) {
        throw new Error('Could not load your analyses');
      }
      return data;
    },
    enabled: Boolean(user),
  });

  return (
    <SafeAreaView style={theme.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={analyses.isRefetching}
            onRefresh={() => analyses.refetch()}
            tintColor={colors.accent}
          />
        }
      >
        <View>
          <Text style={theme.eyebrow}>Barbon Performance</Text>
          <Text style={[theme.display, { marginTop: spacing.xs }]}>ANALYSIS</Text>
        </View>

        {analyses.isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : analyses.isError ? (
          <View style={theme.card}>
            <Text style={theme.error}>We could not load your analyses right now.</Text>
            <Pressable onPress={() => analyses.refetch()} style={{ marginTop: spacing.md }}>
              <Text style={[theme.muted, { color: colors.accent }]}>Try again</Text>
            </Pressable>
          </View>
        ) : analyses.data.length === 0 ? (
          <View style={theme.card}>
            <Text style={theme.body}>No analyses yet.</Text>
            <Text style={[theme.muted, { marginTop: spacing.xs }]}>
              Send your coach a video from the Send tab and it will show up here.
            </Text>
          </View>
        ) : (
          analyses.data.map((analysis) => (
            <Pressable
              key={analysis.id}
              style={theme.card}
              onPress={() => router.push({ pathname: '/analysis/[id]', params: { id: analysis.id } })}
            >
              <Text style={theme.eyebrow}>
                {analysis.strokeType ? strokeLabel(analysis.strokeType) : 'Analysis'}
              </Text>
              <Text
                style={[theme.body, { color: colors.white, fontWeight: '700', marginTop: spacing.xs }]}
              >
                {analysis.title}
              </Text>
              <Text style={[theme.muted, { marginTop: spacing.xs }]}>
                {analysis.coachName}
                {analysis.publishedAt
                  ? ` · ${new Date(analysis.publishedAt).toLocaleDateString()}`
                  : ''}
                {analysis.findingCount ? ` · ${analysis.findingCount} marks` : ''}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
