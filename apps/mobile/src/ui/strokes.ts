import type { StrokeType } from '@barbon-performance-analysis/core';

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
