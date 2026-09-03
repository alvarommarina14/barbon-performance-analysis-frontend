
export const colors = {
  black: '#0a0a0a',
  dark: '#141414',
  card: '#1e1e1e',
  line: 'rgba(255,255,255,0.09)',
  accent: '#c8ff00',
  accentRead: '#b8e600',
  accentDim: '#a8d600',
  white: '#f5f5f5',
  text: '#e0e0e0',
  gray: '#8d8d8d',
  grayLight: '#bbbbbb',
  danger: '#ff5a5a',
} as const;

export const fonts = {
  display: 'BebasNeue',
  body: 'DMSans',
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  bold: '700',
} as const;

export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  pill: 100,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export type ColorToken = keyof typeof colors;
