/** Design tokens for the BMad Portal (Hub) based on DESIGN.md */

export const colors = {
  background: '#0A1120',
  surface: '#121B30',
  'surface-elevated': '#182544',
  'surface-inset': '#1C2B4D',
  border: '#24314F',
  'border-soft': '#1B2843',
  'text-primary': '#E7ECF6',
  'text-secondary': '#96A3C2',
  'text-faint': '#5F6D8F',
  success: '#34D399',
  warning: '#F5A524',
  error: '#FB6478',
  info: '#38BDF8',
  action: '#8B8CF8',
  neutral: '#7885A3',
} as const;

export const localRemote = {
  local: {
    muted: colors.neutral,
    text: colors['text-secondary'],
  },
  remote: {
    vibrant: colors.info,
    action: colors.action,
    glow: colors.info,
  },
} as const;

export const wsStatusColors = {
  active: colors.info,
  idle: colors.neutral,
  unreachable: colors.error,
} as const;

export type DesignTokens = typeof colors;
