// Barrel for UI theme components + hooks.
export { default as ThemedBackdrop } from './ThemedBackdrop';
export { default as GlassPanel } from './GlassPanel';
export { default as RoundIconButton } from './RoundIconButton';
export { default as SegmentedPills } from './SegmentedPills';
export { default as SectionHeader } from './SectionHeader';
export { default as SparkleMark } from './SparkleMark';
export { useAppTheme } from './theme';
export type { AppTheme } from './theme';
export {
  paletteFor,
  visualThemeFromKey,
  visualThemeKey,
  VISUAL_THEME_OPTIONS,
  VISUAL_THEME_ORDER,
  withAlpha,
  type AppPalette,
  type VisualTheme,
  type VisualThemeOption,
} from './palettes';
export * from './colors';
