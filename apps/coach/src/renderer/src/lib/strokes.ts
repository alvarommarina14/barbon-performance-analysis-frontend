import type { StrokeType } from '@barbon-performance-analysis/core';

// Duplicated from apps/mobile/src/ui/strokes.ts; a later chore can hoist both into packages/core.
const LABELS: Record<StrokeType, string> = {
  FOREHAND: 'Forehand',
  BACKHAND: 'Backhand',
  SERVE: 'Serve',
  MOVEMENT: 'Movement',
  OTHER: 'Other',
};

export function strokeLabel(stroke: StrokeType): string {
  return LABELS[stroke];
}
