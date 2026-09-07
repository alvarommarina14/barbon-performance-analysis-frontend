import { colors, fonts, radii, spacing } from '@barbon-performance-analysis/core';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface VideoLoaderProps {
  // 0..1 while the clip downloads, or null before metadata is known / on a stall.
  fraction: number | null;
  label?: string;
}

export function VideoLoader({ fraction, label = 'Loading video' }: VideoLoaderProps) {
  const pct = fraction == null ? null : Math.min(100, Math.round(fraction * 100));

  return (
    <View style={styles.overlay}>
      {pct == null ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <>
          <Text style={styles.pct}>{pct}%</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct}%` }]} />
          </View>
        </>
      )}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  pct: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: 40,
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  track: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radii.pill,
    height: 6,
    overflow: 'hidden',
    width: '55%',
  },
  fill: {
    backgroundColor: colors.accent,
    height: 6,
  },
  label: {
    color: colors.gray,
    fontFamily: fonts.body,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
});
