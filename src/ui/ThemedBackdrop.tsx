// ThemedBackdrop — port of lib/ui/app_theme.dart _ThemedBackdropState.
// Uses the EXACT per-theme gradient colors/stops from the Flutter source via SVG
// (react-native-svg supports both linear and radial). Rendered at a static mid
// phase; the 18s animated drift is added in Phase 8 (react-native-reanimated).
// classic / modern-minimal stay a solid background (matches Dart).
import * as React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Svg, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useAppTheme } from './theme';
import { withAlpha } from './colors';
import type { AppPalette } from './palettes';

// phase 0.5 of Dart's 18s loop -> alignmentA/B in Flutter Alignment space (-1..1).
const PHASE = 0.5;
const alignmentA = { x: -0.85 + 0.28 * PHASE, y: -0.92 + 0.16 * PHASE };
const alignmentB = { x: 0.95 - 0.36 * PHASE, y: 0.72 - 0.24 * PHASE };
const toFrac = (a: number) => (a + 1) / 2; // -1..1 -> 0..1

interface StopDef {
  offset: number;
  color: string;
}

function stopsFor(p: AppPalette): { kind: 'linear' | 'radial'; stops: StopDef[] } | null {
  if (p.isMidnightBloom) {
    return {
      kind: 'linear',
      stops: [
        { offset: 0, color: p.background },
        { offset: 0.22, color: withAlpha('#0F172A', 0.7) },
        { offset: 0.48, color: withAlpha(p.glow, 0.22) },
        { offset: 0.74, color: withAlpha('#EC4899', 0.14) },
        { offset: 1, color: p.background },
      ],
    };
  }
  if (p.isIos26) {
    return {
      kind: 'linear',
      stops: [
        { offset: 0, color: p.background },
        { offset: 0.25, color: withAlpha(p.glow, p.isDark ? 0.25 : 0.35) },
        { offset: 0.5, color: withAlpha(p.primary, p.isDark ? 0.35 : 0.45) },
        { offset: 0.75, color: withAlpha('#A78BFA', p.isDark ? 0.25 : 0.35) },
        { offset: 1, color: p.background },
      ],
    };
  }
  if (p.isAurora) {
    return {
      kind: 'linear',
      stops: [
        { offset: 0, color: p.background },
        { offset: 0.28, color: '#111827' },
        { offset: 0.52, color: withAlpha('#172554', 0.86) },
        { offset: 0.72, color: withAlpha('#312E81', 0.78) },
        { offset: 1, color: p.background },
      ],
    };
  }
  if (p.isLiquidGlass) {
    return {
      kind: 'radial',
      stops: [
        { offset: 0, color: withAlpha('#FFFFFF', p.isDark ? 0.1 : 0.62) },
        { offset: 0.5, color: withAlpha(p.glow, p.isDark ? 0.1 : 0.2) },
        { offset: 1, color: p.background },
      ],
    };
  }
  return null;
}

export default function ThemedBackdrop() {
  const { palette: p } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const def = stopsFor(p);

  return (
    <View style={[styles.root, { backgroundColor: p.background }]}>
      {def && (
        <Svg style={StyleSheet.absoluteFill} width={width} height={height}>
          <Defs>
            {def.kind === 'linear' ? (
              <LinearGradient
                id="backdropGrad"
                x1={toFrac(alignmentA.x)}
                y1={toFrac(alignmentA.y)}
                x2={toFrac(alignmentB.x)}
                y2={toFrac(alignmentB.y)}
                gradientUnits="userSpaceOnUse"
              >
                {def.stops.map((s) => (
                  <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
                ))}
              </LinearGradient>
            ) : (
              <RadialGradient
                id="backdropGrad"
                cx={toFrac(alignmentA.x)}
                cy={toFrac(alignmentA.y)}
                r={1.25}
                gradientUnits="objectBoundingBox"
              >
                {def.stops.map((s) => (
                  <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
                ))}
              </RadialGradient>
            )}
          </Defs>
          <Rect x="0" y="0" width={width} height={height} fill="url(#backdropGrad)" />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
  },
});
