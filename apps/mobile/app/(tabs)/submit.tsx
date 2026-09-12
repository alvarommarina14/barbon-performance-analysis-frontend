import { colors, spacing } from '@barbon-performance-analysis/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { problemDetail, problemType } from '@/api/problem';
import { useAuth } from '@/auth/AuthContext';
import { theme } from '@/ui/theme';
import { uploadVideo } from '@/upload/uploadVideo';
import type { components } from '@barbon-performance-analysis/api-client';

type Submission = components['schemas']['SubmissionSummary'];
type PickedVideo = { uri: string; sizeBytes: number; mimeType?: string };

export default function SubmitScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [picked, setPicked] = useState<PickedVideo | null>(null);
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  const submissions = useQuery({
    queryKey: ['submissions'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/submissions/mine');
      if (error || !data) {
        throw new Error('Could not load your sent videos');
      }
      return data;
    },
    enabled: Boolean(user),
  });

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

  // Which submissions have a published analysis to open.
  const analysisBySubmission = useMemo(() => {
    const map = new Map<string, string>();
    for (const analysis of analyses.data ?? []) {
      if (analysis.submissionId && analysis.status === 'PUBLISHED') {
        map.set(analysis.submissionId, analysis.id);
      }
    }
    return map;
  }, [analyses.data]);

  const send = useMutation({
    mutationFn: async () => {
      if (!picked) return;

      // 1. Register the video and get a one-time upload URL. No submission yet.
      const intent = await api.POST('/api/v1/submissions/upload-intent', {
        body: { sizeBytes: picked.sizeBytes },
      });
      if (!intent.data) {
        console.warn('upload-intent failed', intent.error);
        throw new Error(problemDetail(intent.error) ?? 'Could not start the upload. Try again.');
      }
      const videoAssetId = intent.data.videoAssetId;

      // 2. Upload the bytes. If this fails there is nothing to clean up — the server sweeps the
      //    unused asset. The player just sees the error and can try again.
      try {
        await uploadVideo(
          picked.uri,
          intent.data.uploadUrl,
          picked.sizeBytes,
          picked.mimeType,
          setProgress,
        );
      } catch (uploadError) {
        console.warn('tus upload to', intent.data.uploadUrl, 'failed', uploadError);
        throw new Error(
          uploadError instanceof Error
            ? `Upload failed: ${uploadError.message}`
            : 'Upload failed. Try again.',
        );
      }

      // 3. Create the submission now that the video exists. The provider webhook may still be a
      //    beat behind, so retry while the backend says the video is not ready.
      setFinishing(true);
      const trimmedNote = note.trim();
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const { data, error, response } = await api.POST('/api/v1/submissions', {
          body: {
            videoAssetId,
            ...(trimmedNote ? { playerNote: trimmedNote } : {}),
          },
        });
        if (data) {
          return;
        }
        const stillProcessing =
          response.status === 409 && problemType(error)?.includes('video-not-ready');
        if (!stillProcessing) {
          console.warn('create submission failed', response.status, error);
          throw new Error(problemDetail(error) ?? 'Could not send the video. Try again.');
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      throw new Error('The video is taking too long to process. Try again in a moment.');
    },
    onSuccess: () => {
      setPicked(null);
      setNote('');
      setProgress(null);
      setFinishing(false);
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
    onError: () => {
      setProgress(null);
      setFinishing(false);
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
  });

  const discard = useMutation({
    mutationFn: async (submissionId: string) => {
      const { error } = await api.DELETE('/api/v1/submissions/{submissionId}', {
        params: { path: { submissionId } },
      });
      if (error) {
        throw new Error('Could not remove that submission.');
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['submissions'] }),
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
                  <Text style={theme.muted}>
                    {finishing ? 'Processing…' : `Uploading ${Math.round(progress * 100)}%`}
                  </Text>
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

        <Text style={theme.sectionTitle}>YOUR SENT VIDEOS</Text>

        {submissions.isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : submissions.isError ? (
          <View style={theme.card}>
            <Text style={theme.error}>We could not load your sent videos.</Text>
          </View>
        ) : submissions.data.length === 0 ? (
          <Text style={theme.muted}>Nothing sent yet.</Text>
        ) : (
          submissions.data.map((submission) => {
            const analysisId = analysisBySubmission.get(submission.id);
            const open = analysisId
              ? () => router.push({ pathname: '/analysis/[id]', params: { id: analysisId } })
              : undefined;
            return (
              <Pressable
                key={submission.id}
                onPress={open}
                disabled={!open}
                style={({ pressed }) => [theme.card, pressed && open ? { opacity: 0.7 } : null]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[theme.body, { color: colors.white, fontWeight: '700' }]}>
                    Your video
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
                {open ? (
                  <Text style={[theme.muted, { marginTop: spacing.sm, color: colors.accent }]}>
                    View analysis →
                  </Text>
                ) : isRemovable(submission) ? (
                  <Pressable
                    onPress={() => discard.mutate(submission.id)}
                    disabled={discard.isPending}
                    style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}
                  >
                    <Text style={[theme.muted, { color: colors.danger }]}>
                      {discard.isPending ? 'Removing…' : 'Remove'}
                    </Text>
                  </Pressable>
                ) : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function statusLabel(submission: Submission): string {
  if (submission.status === 'ANALYZED') {
    return 'Analysis ready';
  }
  if (submission.status === 'IN_REVIEW') {
    return 'Your coach is on it';
  }
  return 'Waiting for your coach';
}

// A submission only exists once its video is ready, so the player can pull it back right up
// until the coach starts on it.
function isRemovable(submission: Submission): boolean {
  return submission.status === 'SUBMITTED';
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}
