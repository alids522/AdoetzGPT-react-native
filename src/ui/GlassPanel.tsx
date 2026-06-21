// GlassPanel — port of lib/ui/app_theme.dart GlassPanel.
// BlurView (expo-blur) when glassBlur > 0, gradient overlay for liquid-glass /
// aurora, exact border + shadow. NOTE: Flutter BackdropFilter sigma and
// expo-blur `intensity` use different scales — `blurIntensity` below is a
// starting calibration to confirm via screenshot-diff on device (Phase 2 gate).
import * as React from 'react';
import { Platform, Pressable, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from './theme';
import { withAlpha } from './colors';

export interface GlassPanelProps {
  children: React.ReactNode;
  padding?: number;
  radius?: number;
  borderColor?: string;
  backgroundColor?: string;
  onPress?: () => void;
  style?: ViewProps['style'];
}

// Flutter sigma -> expo-blur intensity approximation (empirical; tune per theme).
function blurIntensity(glassBlur: number): number {
  return Math.max(0, Math.min(100, Math.round(glassBlur * 3)));
}

export default function GlassPanel({
  children,
  padding = 18,
  radius,
  borderColor,
  backgroundColor,
  onPress,
  style,
}: GlassPanelProps) {
  const { palette: p } = useAppTheme();
  const radiusValue = radius ?? p.panelRadius;
  const bg = backgroundColor ?? p.surface;

  const useGradient = p.isLiquidGlass || p.isAurora;
  const gradientColors: [string, string, string] | undefined = useGradient
    ? [p.highlight, bg, withAlpha(p.glow, p.isAurora ? 0.08 : 0.04)]
    : undefined;

  // Shadow mapping (iOS). Android uses elevation as an approximation.
  const isMinimal = p.isMinimal;
  const shadow: ViewStyle = p.isClassic
    ? {
        shadowColor: '#000000',
        shadowOpacity: p.isDark ? 0.36 : 0.08,
        shadowRadius: 30,
        shadowOffset: { width: 0, height: 14 },
        elevation: 6,
      }
    : {
        shadowColor: p.shadow,
        shadowOpacity: 1,
        shadowRadius: isMinimal ? 18 : 34,
        shadowOffset: { width: 0, height: isMinimal ? 8 : 16 },
        elevation: isMinimal ? 3 : 7,
      };

  const inner = (
    <View
      style={[
        styles.panel,
        {
          borderRadius: radiusValue,
          borderColor: borderColor ?? p.outline,
          backgroundColor: useGradient ? 'transparent' : bg,
        },
        shadow,
        style as ViewStyle,
      ]}
    >
      {p.glassBlur > 0 && (
        <BlurView
          intensity={blurIntensity(p.glassBlur)}
          tint={p.isDark ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, { borderRadius: radiusValue }]}
        />
      )}
      {useGradient && gradientColors && (
        <LinearGradient
          colors={gradientColors}
          locations={[0, 0.42, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radiusValue }]}
        />
      )}
      {p.isLiquidGlass && (
        <View
          style={[
            styles.hairline,
            {
              left: 8,
              right: 8,
              top: 0,
              backgroundColor: withAlpha('#FFFFFF', p.isDark ? 0.28 : 0.9),
            },
          ]}
        />
      )}
      <View style={{ padding }}>{children}</View>
    </View>
  );

  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} style={{ borderRadius: radiusValue }}>
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  hairline: {
    position: 'absolute',
    height: 1,
    borderRadius: 999,
  },
});
