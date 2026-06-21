// AppPalette — EXACT values transcribed from lib/ui/app_theme.dart
// (AppPalette.fromBrightness). Every color/radius/blur/motionScale is copied
// literally from the Flutter source so the port is visually identical.
//
// Dart color encodings used in the source:
//   Color(0xffRRGGBB)        -> "#RRGGBB"
//   Color(0xAARRGGBB)        -> rgb(r,g,b, AA/255)   (AA = alpha hex)
//   Colors.white.withValues  -> white(alpha)
//   Colors.black.withValues  -> black(alpha)
//   Color(0xffRRGGBB).withValues(alpha:a) -> withAlpha("#RRGGBB", a)

import { black, opaque, rgb, white, withAlpha, type ColorToken } from './colors';

export type VisualTheme =
  | 'default'
  | 'liquid-glass'
  | 'aurora-neon'
  | 'modern-minimal'
  | 'ios26'
  | 'midnight-bloom';

export interface AppPalette {
  visualTheme: VisualTheme;
  isDark: boolean;
  background: ColorToken;
  surface: ColorToken;
  surfaceDim: ColorToken;
  surfaceBright: ColorToken;
  primary: ColorToken;
  secondary: ColorToken;
  onSurface: ColorToken;
  onSurfaceVariant: ColorToken;
  outline: ColorToken;
  error: ColorToken;
  highlight: ColorToken;
  glow: ColorToken;
  shadow: ColorToken;
  panelRadius: number;
  cardRadius: number;
  controlRadius: number;
  sidebarRadius: number;
  glassBlur: number;
  motionScale: number;
  // Convenience flags (mirror Dart getters)
  isClassic: boolean;
  isLiquidGlass: boolean;
  isAurora: boolean;
  isMinimal: boolean;
  isIos26: boolean;
  isMidnightBloom: boolean;
}

export interface VisualThemeOption {
  key: VisualTheme;
  label: string;
  description: string;
}

export const VISUAL_THEME_ORDER: VisualTheme[] = [
  'default',
  'liquid-glass',
  'aurora-neon',
  'modern-minimal',
  'ios26',
  'midnight-bloom',
];

export const VISUAL_THEME_OPTIONS: VisualThemeOption[] = [
  { key: 'default', label: 'Default', description: 'The original AdoetzGPT look.' },
  { key: 'liquid-glass', label: 'Liquid Glass', description: 'Frosted translucent panels with soft depth.' },
  { key: 'aurora-neon', label: 'Aurora Neon', description: 'Deep space contrast with electric glow.' },
  { key: 'modern-minimal', label: 'Modern Minimal', description: 'Clean, spacious, and productivity focused.' },
  { key: 'ios26', label: 'iOS 26 Vision', description: 'Extreme liquid glass with fluid animated depth.' },
  { key: 'midnight-bloom', label: 'Midnight Bloom', description: 'Deep indigo garden with emerald, gold, and rose glow.' },
];

/** Mirrors appVisualThemeFromKey (accepts common aliases). */
export function visualThemeFromKey(value: unknown): VisualTheme {
  const key = String(value ?? '').trim().toLowerCase();
  if (key === 'liquid-glass' || key === 'liquidglass' || key === 'glass') return 'liquid-glass';
  if (key === 'aurora-neon' || key === 'auroraneon' || key === 'aurora' || key === 'neon') return 'aurora-neon';
  if (key === 'modern-minimal' || key === 'modernminimal' || key === 'minimal') return 'modern-minimal';
  if (key === 'ios26' || key === 'vision') return 'ios26';
  if (key === 'midnight-bloom' || key === 'midnightbloom' || key === 'midnight' || key === 'bloom') return 'midnight-bloom';
  return 'default';
}

/** Mirrors appVisualThemeKey. */
export function visualThemeKey(theme: VisualTheme): string {
  switch (theme) {
    case 'liquid-glass':
      return 'liquid-glass';
    case 'aurora-neon':
      return 'aurora-neon';
    case 'modern-minimal':
      return 'modern-minimal';
    case 'ios26':
      return 'ios26';
    case 'midnight-bloom':
      return 'midnight-bloom';
    default:
      return 'default';
  }
}

const flags = (theme: VisualTheme) => ({
  isClassic: theme === 'default',
  isLiquidGlass: theme === 'liquid-glass',
  isAurora: theme === 'aurora-neon',
  isMinimal: theme === 'modern-minimal',
  isIos26: theme === 'ios26',
  isMidnightBloom: theme === 'midnight-bloom',
});

function classic(dark: boolean): AppPalette {
  return {
    visualTheme: 'default',
    isDark: dark,
    background: dark ? '#000000' : '#F5F5F5',
    surface: dark ? rgb(26, 26, 26, 0.6) : white(0.72),
    surfaceDim: dark ? rgb(15, 15, 15, 0.4) : rgb(245, 245, 245, 0.533),
    surfaceBright: dark ? '#1A1A1A' : '#FFFFFF',
    primary: '#3B82F6',
    secondary: dark ? '#A0A0A0' : '#666666',
    onSurface: dark ? '#FFFFFF' : '#1A1A1A',
    onSurfaceVariant: dark ? '#888888' : '#666666',
    outline: dark ? white(0.08) : black(0.08),
    error: '#EF4444',
    highlight: white(dark ? 0.1 : 0.42),
    glow: '#3B82F6',
    shadow: black(dark ? 0.36 : 0.08),
    panelRadius: 28,
    cardRadius: 18,
    controlRadius: 18,
    sidebarRadius: 24,
    glassBlur: 0,
    motionScale: 1,
    ...flags('default'),
  };
}

function liquidGlass(dark: boolean): AppPalette {
  return {
    visualTheme: 'liquid-glass',
    isDark: dark,
    background: dark ? '#020304' : '#EDF3FB',
    surface: dark ? white(0.105) : white(0.62),
    surfaceDim: dark ? white(0.065) : white(0.42),
    surfaceBright: dark ? white(0.16) : white(0.78),
    primary: '#4F9CFF',
    secondary: dark ? '#C7D2FE' : '#475569',
    onSurface: dark ? '#FFFFFF' : '#111827',
    onSurfaceVariant: dark ? '#B6C2D2' : '#526070',
    outline: dark ? white(0.15) : white(0.72),
    error: '#FF5C7A',
    highlight: white(dark ? 0.28 : 0.82),
    glow: '#7DD3FC',
    shadow: black(dark ? 0.46 : 0.14),
    panelRadius: 34,
    cardRadius: 26,
    controlRadius: 22,
    sidebarRadius: 34,
    glassBlur: 22,
    motionScale: 1,
    ...flags('liquid-glass'),
  };
}

function auroraNeon(dark: boolean): AppPalette {
  return {
    visualTheme: 'aurora-neon',
    isDark: dark,
    background: dark ? '#030712' : '#EEF7FF',
    surface: dark ? rgb(9, 11, 31, 0.8) : white(0.78),
    surfaceDim: dark ? rgb(17, 26, 51, 0.6) : rgb(223, 248, 255, 0.533),
    surfaceBright: dark ? '#111936' : '#FFFFFF',
    primary: dark ? '#22D3EE' : '#2563EB',
    secondary: dark ? '#A78BFA' : '#7C3AED',
    onSurface: dark ? '#F8FBFF' : '#0F172A',
    onSurfaceVariant: dark ? '#A8B3CF' : '#475569',
    outline: dark ? withAlpha('#22D3EE', 0.18) : withAlpha('#2563EB', 0.13),
    error: '#FF477E',
    highlight: withAlpha('#67E8F9', 0.26),
    glow: dark ? '#8B5CF6' : '#06B6D4',
    shadow: withAlpha('#020617', dark ? 0.68 : 0.16),
    panelRadius: 28,
    cardRadius: 22,
    controlRadius: 18,
    sidebarRadius: 30,
    glassBlur: 14,
    motionScale: 1,
    ...flags('aurora-neon'),
  };
}

function modernMinimal(dark: boolean): AppPalette {
  return {
    visualTheme: 'modern-minimal',
    isDark: dark,
    background: dark ? '#0F1115' : '#F7F7F5',
    surface: dark ? '#171A20' : '#FFFFFF',
    surfaceDim: dark ? '#111318' : '#EEEEEC',
    surfaceBright: dark ? '#20242C' : '#FFFFFF',
    primary: '#2563EB',
    secondary: dark ? '#A1A1AA' : '#52525B',
    onSurface: dark ? '#F4F4F5' : '#18181B',
    onSurfaceVariant: dark ? '#A1A1AA' : '#71717A',
    outline: dark ? '#27272A' : '#E4E4E7',
    error: '#DC2626',
    highlight: white(dark ? 0.08 : 0.9),
    glow: '#2563EB',
    shadow: black(dark ? 0.32 : 0.08),
    panelRadius: 18,
    cardRadius: 14,
    controlRadius: 14,
    sidebarRadius: 24,
    glassBlur: 0,
    motionScale: 0.65,
    ...flags('modern-minimal'),
  };
}

function ios26(dark: boolean): AppPalette {
  return {
    visualTheme: 'ios26',
    isDark: dark,
    background: dark ? '#000000' : '#F2F2F7',
    surface: dark ? white(0.05) : white(0.55),
    surfaceDim: dark ? white(0.02) : white(0.35),
    surfaceBright: dark ? white(0.12) : white(0.85),
    primary: '#007AFF',
    secondary: '#8E8E93',
    onSurface: dark ? '#FFFFFF' : '#000000',
    onSurfaceVariant: dark ? withAlpha('#EBEBF5', 0.6) : withAlpha('#3C3C43', 0.6),
    outline: dark ? white(0.15) : black(0.08),
    error: '#FF3B30',
    highlight: white(dark ? 0.25 : 0.9),
    glow: '#5AC8FA',
    shadow: black(dark ? 0.8 : 0.15),
    panelRadius: 40,
    cardRadius: 32,
    controlRadius: 28,
    sidebarRadius: 40,
    glassBlur: 45,
    motionScale: 1.25,
    ...flags('ios26'),
  };
}

function midnightBloom(dark: boolean): AppPalette {
  return {
    visualTheme: 'midnight-bloom',
    isDark: dark,
    background: dark ? '#06060F' : '#F0F4F2',
    surface: dark ? rgb(12, 12, 31, 0.8) : white(0.72),
    surfaceDim: dark ? rgb(16, 16, 40, 0.6) : rgb(219, 232, 224, 0.533),
    surfaceBright: dark ? '#151530' : '#FFFFFF',
    primary: dark ? '#10B981' : '#059669',
    secondary: dark ? '#F59E0B' : '#D97706',
    onSurface: dark ? '#E8ECF0' : '#111827',
    onSurfaceVariant: dark ? '#94A3B8' : '#475569',
    outline: dark ? withAlpha('#10B981', 0.16) : withAlpha('#059669', 0.14),
    error: '#FB7185',
    highlight: dark ? withAlpha('#EC4899', 0.1) : withAlpha('#F472B6', 0.16),
    glow: dark ? '#A855F7' : '#F472B6',
    shadow: withAlpha('#020617', dark ? 0.72 : 0.18),
    panelRadius: 30,
    cardRadius: 22,
    controlRadius: 20,
    sidebarRadius: 32,
    glassBlur: 18,
    motionScale: 1.1,
    ...flags('midnight-bloom'),
  };
}

export function paletteFor(visualTheme: VisualTheme, isDark: boolean): AppPalette {
  const dark = isDark;
  switch (visualTheme) {
    case 'liquid-glass':
      return liquidGlass(dark);
    case 'aurora-neon':
      return auroraNeon(dark);
    case 'modern-minimal':
      return modernMinimal(dark);
    case 'ios26':
      return ios26(dark);
    case 'midnight-bloom':
      return midnightBloom(dark);
    default:
      return classic(dark);
  }
}

// Re-export color helpers for downstream UI components.
export { black, opaque, rgb, white, withAlpha };
