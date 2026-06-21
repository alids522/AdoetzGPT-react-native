// Theme hook — reads theme/visualTheme from the main app store (so the persisted
// theme drives the UI). Mirrors `AppPalette.of(context)`.
import { useAppStore } from '../state/store';
import { paletteFor, visualThemeFromKey, type AppPalette, type VisualTheme } from './palettes';

export interface AppTheme {
  palette: AppPalette;
  isDark: boolean;
  visualTheme: VisualTheme;
}

export function useAppTheme(): AppTheme {
  const theme = useAppStore((s) => s.theme);
  const rawVisual = useAppStore((s) => s.visualTheme);
  const isDark = theme === 'dark';
  const visualTheme = visualThemeFromKey(rawVisual);
  return { palette: paletteFor(visualTheme, isDark), isDark, visualTheme };
}
