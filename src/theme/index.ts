import { Colors, Spacing } from '../constants/theme';
import type { ThemeColor } from '../constants/theme';

type Palette = (typeof Colors)['light'];

function mapPalette(p: Palette) {
  return {
    surface: '#0e141d',
    surfaceDim: '#0e141d',
    surfaceBright: '#343944',
    surfaceContainerLowest: '#080e17',
    surfaceContainerLow: '#161c25',
    surfaceContainer: '#1a2029',
    surfaceContainerHigh: '#242a34',
    surfaceContainerHighest: '#2f353f',
    onSurface: '#dde2f0',
    onSurfaceVariant: '#bac9cc',
    inverseSurface: '#dde2f0',
    inverseOnSurface: '#2b313b',
    outline: '#849396',
    outlineVariant: '#3b494c',
    surfaceTint: '#00daf3',
    accent: '#00e5ff',
    accentSoft: '#c3f5ff',
    primary: '#c3f5ff',
    onPrimary: '#00363d',
    primaryContainer: '#00e5ff', // Electric Cyan
    onPrimaryContainer: '#00626e',
    inversePrimary: '#006875',
    secondary: '#ffd799',
    onSecondary: '#432c00',
    secondaryContainer: '#feb300', // Safety Signal Amber
    onSecondaryContainer: '#6a4800',
    tertiary: '#b1ffbf',
    onTertiary: '#003918',
    tertiaryContainer: '#22ef7e', // Terminal Success Lime
    onTertiaryContainer: '#006731',
    error: '#ffb4ab',
    onError: '#690005',
    errorContainer: '#93000a',
    onErrorContainer: '#ffdad6',
    primaryFixed: '#9cf0ff',
    primaryFixedDim: '#00daf3',
    onPrimaryFixed: '#001f24',
    onPrimaryFixedVariant: '#004f58',
    secondaryFixed: '#ffdeac',
    secondaryFixedDim: '#ffba38',
    onSecondaryFixed: '#281900',
    onSecondaryFixedVariant: '#604100',
    tertiaryFixed: '#62ff96',
    tertiaryFixedDim: '#00e475',
    onTertiaryFixed: '#00210b',
    onTertiaryFixedVariant: '#005226',
    background: '#0e141d',
    onBackground: '#dde2f0',
    surfaceVariant: '#2f353f',
    navy: '#080e17',
    navyMid: '#161c25',
    navyLight: '#242a34',
    surfaceAlt: '#1a2029',
    card: '#161c25',
    border: '#3b494c',
    borderLight: '#242a34',
    text: '#dde2f0',
    textSecondary: '#bac9cc',
    textMuted: '#849396',
    textOnDark: '#dde2f0',
    teal: '#00e5ff',
    tealLight: '#c3f5ff',
    tealMuted: '#00626e',
    cyan: '#00e5ff',
    amber: '#feb300',
    lime: '#22ef7e',
    crimson: '#ff5252',
    driver: '#00e5ff',
    driverMuted: '#00626e',
    supervisor: '#feb300',
    supervisorMuted: '#6a4800',
    success: '#22ef7e',
    successMuted: '#006731',
    warning: '#feb300',
    warningMuted: '#6a4800',
    danger: '#ff5252',
    dangerMuted: '#93000a',
    white: '#dde2f0',
  };
}

export const colors = mapPalette(Colors.dark);

export const radius = {
  sm: 2,
  DEFAULT: 4,
  md: 6,
  lg: 8,
  xl: 12,
  pill: 9999,
};

export const spacing = {
  gutter: Spacing.three,
  margin: Spacing.four,
  xs: Spacing.one,
  sm: Spacing.two,
  md: Spacing.three,
  lg: Spacing.four,
  xl: Spacing.five,
};

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  button: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  glow: {
    shadowColor: '#0274DF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  warningGlow: {
    shadowColor: '#C05600',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
};

export function statusColor(status: string): string {
  switch (status) {
    case 'COMPLETED':
    case 'APPROVED':
      return Colors.light.success;
    case 'IN_PROGRESS':
      return Colors.light.accent;
    case 'PENDING_APPROVAL':
    case 'NOT_STARTED':
      return Colors.light.warning;
    case 'REJECTED':
      return Colors.light.danger;
    default:
      return Colors.light.textSecondary;
  }
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

export type { ThemeColor };
