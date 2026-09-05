import { colors, spacing, STROKE_TYPES, type StrokeType } from '@barbon-performance-analysis/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { strokeLabel } from '@/ui/strokes';
import { theme } from '@/ui/theme';
import { uploadVideo } from '@/upload/uploadVideo';
import type { components } from '@barbon-performance-analysis/api-client';

type Submission = components['schemas']['SubmissionSummary'];
type PickedVideo = { uri: string; sizeBytes: number; mimeType?: string };

export default function SubmitScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [picked, setPicked] = useState<PickedVideo | null>(null);
  const [strokeType, setStrokeType] = useState<StrokeType>('FOREHAND');
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  const submissions = useQuery({
    queryKey: ['submissions'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/submissions/mine');
      if (error || !data) {
        throw new Error('Could not load your submissions');
      }
      return data;
    },
    enabled: Boolean(user),
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!picked) return;
      const { data, error } = await api.POST('/api/v1/submissions/upload-intent', {
        body: {
          strokeType,
          playerNote: note.trim() || undefined,
          sizeBytes: picked.sizeBytes,
        },
      });
      if (error || !data) {
        throw new Error('Could not start the upload. Try again.');
      }
      await uploadVideo(picked.uri, data.uploadUrl, picked.sizeBytes, picked.mimeType, setProgress);
    },
    onSuccess: () => {
      setPicked(null);
      setNote('');
      setProgress(null);
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
    onError: () => setProgress(null),
  });

  async function pick() {
    setPickError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPickError('Barbon Performance needs access to your videos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
    });
    if (result.canceled) {
      return;
    }
    const asset = result.assets[0];
    if (!asset?.fileSize) {
      setPickError('Could not read that video. Try another one.');
      return;
    }
    setPicked({ uri: asset.uri, sizeBytes: asset.fileSize, mimeType: asset.mimeType ?? undefined });
  }

  const busy = send.isPending;

  return (
    <SafeAreaView style={theme.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={submissions.isRefetching}
            onRefresh={() => submissions.refetch()}
            tintColor={colors.accent}
          />
        }
      >
        <View>
          <Text style={theme.eyebrow}>Barbon Performance</Text>
          <Text style={[theme.display, { marginTop: spacing.xs }]}>SEND A VIDEO</Text>
        </View>

        <View style={[theme.card, { gap: spacing.md }]}>
          {!picked ? (
            <>
              <Text style={theme.body}>Record yourself on court, then choose the clip here.</Text>
              <Pressable style={theme.primaryButton} onPress={pick}>
                <Text style={theme.primaryButtonLabel}>Choose a video</Text>
              </Pressable>
              {pickError ? <Text style={theme.error}>{pickError}</Text> : null}
            </>
          ) : (
            <>
              <Text style={theme.muted}>{formatBytes(picked.sizeBytes)} selected</Text>

              <Text style={theme.eyebrow}>Stroke</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {STROKE_TYPES.map((stroke) => {
                  const active = stroke === strokeType;
                  return (
                    <Pressable
                      key={stroke}
                      style={[theme.pill, active && theme.pillActive]}
                      onPress={() => setStrokeType(stroke)}
                      disabled={busy}
                    >
                      <Text style={[theme.pillLabel, active && theme.pillLabelActive]}>
                        {strokeLabel(stroke)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                style={[theme.input, { minHeight: 88, textAlignVertical: 'top' }]}
                placeholder="Anything your coach should know? (optional)"
                placeholderTextColor={colors.gray}
                value={note}
                onChangeText={setNote}
                editable={!busy}
                multiline
                maxLength={2000}
              />

              {progress !== null ? (
                <View style={{ gap: spacing.xs }}>
                  <View style={theme.progressTrack}>
                    <View style={[theme.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
                  </View>
                  <Text style={theme.muted}>Uploading {Math.round(progress * 100)}%</Text>
                </View>
              ) : null}

              {send.isError ? (
                <Text style={theme.error}>
                  {send.error instanceof Error ? send.error.message : 'Upload failed'}
                </Text>
              ) : null}

              <Pressable
                style={[theme.primaryButton, { opacity: busy ? 0.7 : 1 }]}
                onPress={() => send.mutate()}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={colors.black} />
                ) : (
                  <Text style={theme.primaryButtonLabel}>Send to your coach</Text>
                )}
              </Pressable>

              {!busy ? (
                <Pressable onPress={() => setPicked(null)} style={{ alignSelf: 'center' }}>
                  <Text style={theme.muted}>Pick a different video</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>

        <Text style={theme.sectionTitle}>YOUR SUBMISSIONS</Text>

        {submissions.isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : submissions.isError ? (
          <View style={theme.card}>
            <Text style={theme.error}>We could not load your submissions.</Text>
          </View>
        ) : submissions.data.length === 0 ? (
          <Text style={theme.muted}>Nothing sent yet.</Text>
        ) : (
          submissions.data.map((submission) => (
            <View key={submission.id} style={theme.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[theme.body, { color: colors.white, fontWeight: '700' }]}>
                  {strokeLabel(submission.strokeType)}
                </Text>
                <View style={theme.chip}>
                  <Text style={theme.chipLabel}>{statusLabel(submission)}</Text>
                </View>
              </View>
              <Text style={[theme.muted, { marginTop: spacing.xs }]}>
                {new Date(submission.createdAt).toLocaleString()}
              </Text>
              {submission.playerNote ? (
                <Text style={[theme.muted, { marginTop: spacing.xs }]}>{submission.playerNote}</Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function statusLabel(submission: Submission): string {
  if (submission.assetStatus === 'ERRORED') {
    return 'Upload failed';
  }
  if (submission.assetStatus !== 'READY') {
    return 'Processing';
  }
  if (submission.status === 'ANALYZED') {
    return 'Analysis ready';
  }
  if (submission.status === 'IN_REVIEW') {
    return 'Your coach is on it';
  }
  return 'Waiting for your coach';
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}
