import { colors, fonts, radii, spacing } from '@court-proof/core';
import { StyleSheet } from 'react-native';

export const theme = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.black,
  },
  eyebrow: {
    color: colors.gray,
    fontFamily: fonts.body,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  display: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: 44,
    letterSpacing: 1,
  },
  body: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  muted: {
    color: colors.gray,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  input: {
    backgroundColor: colors.dark,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.white,
    fontFamily: fonts.body,
    fontSize: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing.lg,
  },
  primaryButtonLabel: {
    color: colors.black,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.body,
    fontSize: 13,
  },
});
